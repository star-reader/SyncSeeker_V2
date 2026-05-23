/**
 * BasicMap Component
 * 
 * 基础地图组件，基于 Mapbox GL JS。
 * 负责地图的初始化、生命周期管理、事件绑定以及图层渲染服务的挂载。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useEffect, useRef, useState } from "react"
import mapboxgl from 'mapbox-gl'
import pubsub from 'pubsub-js'
import style from './BasicMap.module.scss'
import { useGetCurrentTheme } from "../../hooks/theme/useTheme"
import { useOnlineDataStore } from "../../stores/useOnlineDataStore"
import drawOnlinePilot from "../../services/map/layers/drawOnlinePilot"
import registerMapCursorHandlers from "../../services/map/registerMapCursorHandlers"
import { EVENTS, MAP_IDS } from "../../configs/constants"
import updateMapWithUserSetting from "../../services/settings/updateMapWithUserSetting"
import asyncLoadControllerAssets from "../../services/map/assets/asyncLoadControllerAssets"
import drawSelectedPilotRoute from "../../services/map/layers/drawSelectedPilotRoute"
import drawPilotTracks from "../../services/map/layers/drawPilotTracks"
import drawActiveAirports from "../../services/map/layers/drawActiveAirports"
import drawAirportRadiation from "../../services/map/layers/drawAirportRadiation"
import drawOnlineController from "../../services/map/layers/drawOnlineController"
import addWeatherRadar from "../../services/map/layers/addWeatherRadar"
import asyncLoadGeneralAssets from "../../services/map/assets/asyncLoadGeneralAssets"

const DEFAULT_MAP_VIEW = {
    center: [120.128029, 30.267153] as [number, number],
    zoom: 6,
    bearing: 0,
    pitch: 0
}

class ResetViewControl implements mapboxgl.IControl {
    private map: mapboxgl.Map | null = null
    private container!: HTMLDivElement

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map
        this.container = document.createElement('div')
        this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group'

        const button = document.createElement('button')
        button.className = 'mapboxgl-ctrl-icon syncseeker-reset-view-ctrl'
        button.type = 'button'
        button.setAttribute('aria-label', '回中')
        button.title = '回中'
        button.addEventListener('click', () => {
            this.map?.easeTo({
                center: DEFAULT_MAP_VIEW.center,
                zoom: DEFAULT_MAP_VIEW.zoom,
                bearing: DEFAULT_MAP_VIEW.bearing,
                pitch: DEFAULT_MAP_VIEW.pitch,
                duration: 450
            })
        })

        this.container.appendChild(button)
        return this.container
    }

    onRemove(): void {
        this.container.remove()
        this.map = null
    }
}

export default function BasicMap() {
    const mapRef = useRef<mapboxgl.Map | null>(null)
    const trackedCallsignRef = useRef<string | null>(null)
    // 惰性初始化 state，直接读取 localStorage，确保初始渲染状态正确
    const [mapStyle, setMapStyle] = useState<'dynamic' | 'satellite'>(() => {
        return (localStorage.getItem('map-style') as 'dynamic' | 'satellite') || 'dynamic'
    })
    const isInitialMount = useRef(true)

    const hidePoliticalLayers = (map: mapboxgl.Map) => {
        const layers = map.getStyle().layers ?? []
        const exactHiddenLayerIds = new Set([
            'country-label'
        ])
        const politicalIdPatterns = [
            'boundary',
            'capital',
            'admin-0',
            'country'
        ]
        for (const layer of layers) {
            const layerId = layer.id.toLowerCase()
            const isPoliticalLayer = exactHiddenLayerIds.has(layerId) || politicalIdPatterns.some(pattern => layerId.includes(pattern))
            if (!isPoliticalLayer) continue
            if (!map.getLayer(layer.id)) continue
            try {
                map.setLayoutProperty(layer.id, 'visibility', 'none')
            } catch {}
        }
    }

    // bugfix/jerry v0.2.3 改用更新raster layer来切换卫星图，避免加载卫星图后机组图标显示错误还有地图闪烁问题
    // 删掉了这个useEffect 更新return，防止出现每次更新都被新地图替换从而丢失layers的问题
    const updateMapVisuals = (map: mapboxgl.Map, currentStyle: 'dynamic' | 'satellite') => {
        try {
            if (currentStyle === 'satellite') {
                // 1. 设置底图配置
                map.setConfigProperty('basemap', 'showRoadsAndTransit', false)
                map.setConfigProperty('basemap', 'showPlaceLabels', false)
                map.setConfigProperty('basemap', 'showRoadLabels', false)
                map.setConfigProperty('basemap', 'showAdminBoundaries', false)
                map.setConfigProperty('basemap', 'showLandmarkIcons', false)
                map.setConfigProperty('basemap', 'showLandmarkIconLabels', false)
                
                // 2. 添加/显示卫星图层
                const layers = map.getStyle().layers
                if (layers) {
                    if (!map.getSource('mapbox-satellite')) {
                        map.addSource('mapbox-satellite', {
                            type: 'raster',
                            url: 'mapbox://mapbox.satellite',
                            tileSize: 256
                        })
                    }
                    
                    if (!map.getLayer('satellite-raster')) {
                        const firstSymbolId = layers.find(l => l.type === 'symbol')?.id
                        map.addLayer({
                            id: 'satellite-raster',
                            type: 'raster',
                            source: 'mapbox-satellite',
                            paint: {
                                'raster-fade-duration': 0
                            }
                        }, firstSymbolId || undefined)
                    } else {
                        map.setLayoutProperty('satellite-raster', 'visibility', 'visible')
                    }
                }
            } else {
                // 1. 恢复底图配置
                map.setConfigProperty('basemap', 'showRoadsAndTransit', true)
                map.setConfigProperty('basemap', 'showPlaceLabels', false)
                map.setConfigProperty('basemap', 'showRoadLabels', true)
                map.setConfigProperty('basemap', 'showAdminBoundaries', false)
                map.setConfigProperty('basemap', 'showLandmarkIcons', false)
                map.setConfigProperty('basemap', 'showLandmarkIconLabels', false)
                
                // 2. 隐藏卫星图层
                if (map.getLayer('satellite-raster')) {
                    map.setLayoutProperty('satellite-raster', 'visibility', 'none')
                }
                
                // 3. 应用日夜主题
                const theme = useGetCurrentTheme()
                map.setConfigProperty('basemap', 'lightPreset', theme === 'dark' ? 'night' : 'day')
            }
            hidePoliticalLayers(map)
        } catch (e) {}
    }

    // 初始化地图(仅一次)
    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
        // 始终使用 standard 样式作为基础，通过 overlay 实现卫星图
        mapRef.current = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/standard',
            center: DEFAULT_MAP_VIEW.center,
            zoom: DEFAULT_MAP_VIEW.zoom,
            bearing: DEFAULT_MAP_VIEW.bearing,
            pitch: DEFAULT_MAP_VIEW.pitch,
            dragRotate: true,
            config: {
                basemap: {
                    lightPreset: mapStyle === 'satellite' ? 'day' : (useGetCurrentTheme() === 'dark' ? 'night' : 'day'),
                    showPointOfInterestLabels: false,
                    showPlaceLabels: false,
                    showAdminBoundaries: false,
                    showLandmarkIcons: false,
                    showLandmarkIconLabels: false,
                }
            }
        })
        
        initMapCoord()
        mapRef.current.dragRotate.enable()
        mapRef.current.touchZoomRotate.enable()
        mapRef.current.touchZoomRotate.enableRotation()
        addMapControls()
        bindMapEventListener()
        
        return () => {
            mapRef.current?.remove()
            mapRef.current = null
        }
    }, []) // 只在组件挂载时初始化一次

    // 处理样式切换
    useEffect(() => {
        // 跳过首次渲染，因为在 on('load') 中已经处理了
        if (isInitialMount.current) {
            isInitialMount.current = false
            return
        }

        if (!mapRef.current) return
        const map = mapRef.current
        updateMapVisuals(map, mapStyle)
    }, [mapStyle])

    // pubsub监听事件
    useEffect(() => {
        const themeToken = pubsub.subscribe(EVENTS.THEME_CHANGE, (_, theme: string) => {
            // 卫星模式不受日夜模式影响
            if (mapStyle === 'satellite') return
            
            if (theme === 'dark') {
                mapRef.current?.setConfigProperty('basemap', 'lightPreset', 'night');
            } else {
                mapRef.current?.setConfigProperty('basemap', 'lightPreset', 'day');
            }
        })
        
        const mapStyleToken = pubsub.subscribe(EVENTS.MAP_STYLE_CHANGE, (_, style: 'dynamic' | 'satellite') => {
            setMapStyle(style)
            localStorage.setItem('map-style', style)
        })
        
        return () => {
            pubsub.unsubscribe(themeToken)
            pubsub.unsubscribe(mapStyleToken)
        }
    }, [mapStyle])

    // 航班追踪功能
    useEffect(() => {
        // 开启/关闭追踪
        const trackToken = pubsub.subscribe(
            EVENTS.TOGGLE_FLIGHT_TRACKING, 
            (_, data: { callsign: string, enabled: boolean }) => {
                if (data.enabled) {
                    trackedCallsignRef.current = data.callsign
                    // 立即居中一次
                    const pilot = useOnlineDataStore.getState().getFlights().find(
                        p => p.callsign === data.callsign
                    )
                    if (pilot && mapRef.current) {
                        mapRef.current.easeTo({
                            center: [pilot.longitude, pilot.latitude],
                            duration: 500
                        })
                    }
                } else {
                    trackedCallsignRef.current = null
                }
            }
        )

        // 停止追踪
        const stopTrackToken = pubsub.subscribe(EVENTS.STOP_FLIGHT_TRACKING, () => {
            trackedCallsignRef.current = null
        })

        // 数据更新时，如果正在追踪，自动居中
        const dataUpdateToken = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
            if (!trackedCallsignRef.current || !mapRef.current) return
            const pilot = useOnlineDataStore.getState().getFlights().find(
                p => p.callsign === trackedCallsignRef.current
            )
            if (pilot) {
                mapRef.current.easeTo({
                    center: [pilot.longitude, pilot.latitude],
                    duration: 300
                })
            }
        })

        return () => {
            pubsub.unsubscribe(trackToken)
            pubsub.unsubscribe(stopTrackToken)
            pubsub.unsubscribe(dataUpdateToken)
        }
    }, [])

    const initMapCoord = () => {
        const zoomStr = localStorage.getItem('map-zoom')
        const centerStr = localStorage.getItem('map-center')
        if (zoomStr) {
            try {
                const z = JSON.parse(zoomStr)
                if (typeof z === 'number' && !Number.isNaN(z)) mapRef.current?.setZoom(z)
            } catch {}
        } else {
            const z = mapRef.current?.getZoom()
            if (typeof z === 'number') localStorage.setItem('map-zoom', JSON.stringify(z))
        }
        if (centerStr) {
            try {
                const arr = JSON.parse(centerStr)
                if (Array.isArray(arr) && arr.length === 2) mapRef.current?.setCenter([arr[0], arr[1]])
            } catch {}
        } else {
            const c = mapRef.current?.getCenter().toArray() || DEFAULT_MAP_VIEW.center
            localStorage.setItem('map-center', JSON.stringify(c))
        }
    }

    const addMapControls = () => {
        if (!mapRef.current) return
        const navigation = new mapboxgl.NavigationControl({
            visualizePitch: true,
            showCompass: true,
            showZoom: true
        })
        const scale = new mapboxgl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        })
        const resetView = new ResetViewControl()
        mapRef.current.addControl(scale, 'bottom-right')
        mapRef.current.addControl(navigation, 'bottom-right')
        mapRef.current.addControl(resetView, 'bottom-right')
    }

    const bindMapEventListener = () => {
        if (!mapRef.current) return
        const map = mapRef.current
        map.on('zoomend', () => {
            localStorage.setItem('map-zoom', JSON.stringify(map.getZoom()))
            localStorage.setItem('map-center', JSON.stringify(map.getCenter().toArray()))
        })
        map.on('dragend', () => {
            localStorage.setItem('map-center', JSON.stringify(map.getCenter().toArray()))
        })
        map.once('style.load', async () => {
            hidePoliticalLayers(map)
            // asyncLoadAssets改在drawOnlinePilot中进行
            // await asyncLoadAssets(map)
            await asyncLoadControllerAssets(map)   
            await asyncLoadGeneralAssets(map) 
            drawOnlinePilot(map)
            drawOnlineController(map)
            drawSelectedPilotRoute(map)
            drawPilotTracks(map)
            drawActiveAirports(map)
            drawAirportRadiation(map)
            addWeatherRadar(map)
            registerMapCursorHandlers(map)
            updateMapWithUserSetting(map)
            
            // 初始加载完成后，应用当前的地图样式设置
            updateMapVisuals(map, mapStyle)
        })

        map.on('click', (e) => {
            const layers = map.queryRenderedFeatures(e.point)
            for (let i of layers) {
                if (!i.layer || !i.layer.id) continue
                // 飞行员图标点击
                if (i.layer.id === MAP_IDS.PILOT_LIST_LAYER && i.properties){
                    const props: any = i.properties
                    const id = props.session_id || props.cid
                    if (id) pubsub.publish(EVENTS.PILOT_ICON_CLICK, {
                        id, callsign: props.callsign
                    })
                    return // 处理后退出
                }
                // 管制员标记点击（marker, circle, polygon都可以触发）
                if ((i.layer.id === MAP_IDS.CONTROLLER_MARKER_LAYER || 
                     i.layer.id === MAP_IDS.CONTROLLER_CIRCLE_FILL_LAYER ||
                     i.layer.id === MAP_IDS.CONTROLLER_POLYGON_FILL_LAYER) && i.properties) {
                    const callsign = i.properties.callsign
                    if (callsign) {
                        pubsub.publish(EVENTS.CONTROLLER_ICON_CLICK, { callsign })
                        return // 处理后退出
                    }
                }
                // 机场点或标签点击
                if ((i.layer.id === MAP_IDS.ACTIVE_AIRPORTS_LAYER || i.layer.id === `${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`) && i.properties) {
                    const icao = i.properties.icao
                    if (icao) {
                        pubsub.publish(EVENTS.AIRPORT_CLICK, { icao, hoverOnly: false })
                        return // 处理后退出
                    }
                }
            }
        })
    }

    return (
        <div id="map-container" className={style['map-container']}></div>
    )
}
