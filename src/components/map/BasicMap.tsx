/**
 * BasicMap Component
 * 
 * 基础地图组件，基于 Mapbox GL JS。
 * 负责地图的初始化、生命周期管理、事件绑定以及图层渲染服务的挂载。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useEffect, useRef } from "react"
import mapboxgl from 'mapbox-gl'
import pubsub from 'pubsub-js'
import style from './BasicMap.module.scss'
import { useGetCurrentTheme } from "../../hooks/theme/useTheme"
import drawOnlinePilot from "../../services/map/layers/drawOnlinePilot"
import useMouse from "../../hooks/maps/useMouse"
import { EVENTS, MAP_IDS } from "../../configs/constants"
import updateMapWithUserSetting from "../../services/settings/updateMapWithUserSetting"
import asyncLoadControllerAssets from "../../services/map/assets/asyncLoadControllerAssets"
import drawSelectedPilotRoute from "../../services/map/layers/drawSelectedPilotRoute"
import drawPilotTracks from "../../services/map/layers/drawPilotTracks"
import drawActiveAirports from "../../services/map/layers/drawActiveAirports"
import drawAirportRadiation from "../../services/map/layers/drawAirportRadiation"

export default function BasicMap() {
    const mapRef = useRef<mapboxgl.Map | null>(null)

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
        mapRef.current = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/standard',
            center: [120.128029, 30.267153],
            zoom: 6,
            config: {
                basemap: {
                    lightPreset: useGetCurrentTheme() === 'dark' ? 'night' : 'day',
                    showPointOfInterestLabels: false,
                }
            }
        })
        initMapCoord()
        addMapControls()
        bindMapEventListener()
        return () => {
            mapRef.current?.remove()
            mapRef.current = null
        }
    }, [])

    // pubsub监听事件
    useEffect(() => {
        const themeToken = pubsub.subscribe(EVENTS.THEME_CHANGE, (_, theme: string) => {
            if (theme === 'dark') {
                mapRef.current?.setConfigProperty('basemap', 'lightPreset', 'night');
            } else {
                mapRef.current?.setConfigProperty('basemap', 'lightPreset', 'day');
            }
        })
        return () => {
            pubsub.unsubscribe(themeToken)
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
            const c = mapRef.current?.getCenter().toArray() || [120.128029, 30.267153]
            localStorage.setItem('map-center', JSON.stringify(c))
        }
    }

    const addMapControls = () => {
        if (!mapRef.current) return
        const scale = new mapboxgl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        })
        mapRef.current.addControl(scale, 'bottom-right')
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
            // asyncLoadAssets改在drawOnlinePilot中进行
            // await asyncLoadAssets(map)
            await asyncLoadControllerAssets(map)    
            drawOnlinePilot(map)
            drawSelectedPilotRoute(map)
            drawPilotTracks(map)
            drawActiveAirports(map)
            drawAirportRadiation(map)
            useMouse(map)
            updateMapWithUserSetting(map)
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

        // // 悬浮在地图也展示机场流量
        // map.on('mousemove', (e) => {
        //     const layers = map.queryRenderedFeatures(e.point)
        //     for (let i of layers) {
        //         if (!i.layer || !i.layer.id) continue
        //         if ((i.layer.id === MAP_IDS.ACTIVE_AIRPORTS_LAYER || i.layer.id === `${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`) && i.properties) {
        //             const icao = i.properties.icao
        //             if (icao) {
        //                 pubsub.publish(EVENTS.AIRPORT_CLICK, { icao, hoverOnly: true })
        //             }
        //         }
        //     }
        // })

        // // 移除触发AIRPORT_INFO_CLOSE
        // map.on('mouseleave', (e) => {
        //     const layers = map.queryRenderedFeatures(e.point)
        //     for (let i of layers){
        //         if (!i.layer || !i.layer.id) continue
        //         if (i.layer.id === MAP_IDS.ACTIVE_AIRPORTS_LAYER || i.layer.id === `${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`) {
        //             pubsub.publish(EVENTS.AIRPORT_INFO_CLOSE)
        //         }
        //     }
        // })
    }

    return (
        <div id="map-container" className={style['map-container']}></div>
    )
}