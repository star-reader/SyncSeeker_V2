/**
 * drawOnlinePilot Service
 * 
 * 核心业务服务，负责在地图上绘制在线飞行员。
 * Refactored: 引入航位推测 (Dead Reckoning) 和动画循环，实现平滑移动和轨迹预测。
 * 
 * @author Jerry Jin
 * @date 2025-12-01
 */
import pubsub from 'pubsub-js'
import type { OnlinePilot, OnlineData } from '../../../types/fsd'
import addDynamicLayer from './addDynamicLayer.ts'
import asyncLoadAssets from '../assets/asyncLoadAssets'
import { MAP_IDS, EVENTS } from '../../../configs/constants'
import { useGetUserColor } from '../../../hooks/theme/useTheme'
import { getAircraftAssetByType } from '../../../utils/aircraft.ts'
import { calculateNextPosition } from '../../../utils/geoUtils.ts'
import { getSelectedPilotId } from './drawSelectedPilotRoute'

// 飞行员状态接口
interface PilotState {
    pilot: OnlinePilot
    lastUpdateTime: number // 收到真实数据的时间戳 (ms)
    currentPos: [number, number] // 当前显示的（推测）经纬度
    trail: [number, number][] // 预测轨迹点
}

// 模块级状态管理
const pilotStates = new Map<string, PilotState>()
let animationFrameId: number | null = null
const UPDATE_INTERVAL = 50 // 位置更新间隔（毫秒）

const getPilotIcon = (_type: string | undefined) => getAircraftAssetByType(_type)

const startAnimationLoop = (map: mapboxgl.Map) => {
    let lastUpdateTime = performance.now()

    const loop = () => {
        const now = performance.now()
        const deltaTime = now - lastUpdateTime
        
        // 只有达到更新间隔才执行位置更新
        if (deltaTime >= UPDATE_INTERVAL) {
            updatePositions(map, deltaTime)
            lastUpdateTime = now
        }
        
        animationFrameId = requestAnimationFrame(loop)
    }
    
    if (animationFrameId === null) {
        loop()
    }
}

const updatePositions = (map: mapboxgl.Map, deltaTime: number) => {
    const pilotFeatures: GeoJSON.Feature[] = []
    const trailFeatures: GeoJSON.Feature[] = []
    const selectedId = getSelectedPilotId()
    
    pilotStates.forEach((state, id) => {
        const { pilot, currentPos } = state
        const speed = pilot.groundspeed
        
        // 判断是否为当前选中的飞机
        const isSelected = selectedId && (id === selectedId || pilot.callsign === selectedId || pilot.cid.toString() === selectedId)
        
        // 只对选中的飞机进行位置推测，其他飞机直接使用原始位置
        if (isSelected && speed > 10) {
            const [newLon, newLat] = calculateNextPosition(
                currentPos[1], 
                currentPos[0], 
                speed, 
                pilot.heading, 
                deltaTime
            )
            
            state.currentPos = [newLon, newLat]

            // 仅为选中的飞行员记录轨迹
            if (state.trail.length === 0) {
                // 轨迹为空时，从当前位置开始（避免直接从第一个推测点开始导致线条突兀）
                state.trail.push([state.pilot.longitude, state.pilot.latitude])
            }
            state.trail.push([newLon, newLat])
        } else {
            // 未选中的飞机：重置到真实位置，清空轨迹
            state.currentPos = [pilot.longitude, pilot.latitude]
            if (state.trail.length > 0) state.trail = []
        }

        // 构建飞机图标 Feature
        const isEmergency = [7700, 7600, 7500].includes(pilot.transponder);
        pilotFeatures.push({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': state.currentPos
            },
            'properties': {
                'icon': getPilotIcon(pilot.flight_plan?.aircraft),
                'emergency': isEmergency ? 'true' : 'false',
                ...pilot,
                // 覆盖经纬度为当前推测值，以免弹窗显示旧数据
                latitude: state.currentPos[1],
                longitude: state.currentPos[0]
            }
        })

        // 构建预测轨迹 Feature
        // 只有当飞行员被选中时才显示预测轨迹
        if (isSelected && state.trail.length > 1) {
            trailFeatures.push({
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': state.trail // 直接使用 trail 数组，包含所有历史点
                },
                'properties': {
                    'cid': id
                }
            })
        }
    })

    // 更新地图数据源
    const pilotSource = map.getSource(MAP_IDS.PILOT_LIST_SOURCE) as mapboxgl.GeoJSONSource
    if (pilotSource) {
        pilotSource.setData({
            'type': 'FeatureCollection',
            'features': pilotFeatures
        })
    }

    const trailSource = map.getSource(MAP_IDS.PREDICTED_TRAIL_SOURCE) as mapboxgl.GeoJSONSource
    if (trailSource) {
        trailSource.setData({
            'type': 'FeatureCollection',
            'features': trailFeatures
        })
    }
}

/**
 * 初始化图层（静态配置部分）
 */
const initLayers = (map: mapboxgl.Map) => {
    const userColors = useGetUserColor()
    
    // 1. 预测轨迹层 (位于飞机图标层之下)
    if (!map.getSource(MAP_IDS.PREDICTED_TRAIL_SOURCE)) {
        map.addSource(MAP_IDS.PREDICTED_TRAIL_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
        map.addLayer({
            id: MAP_IDS.PREDICTED_TRAIL_LAYER,
            type: 'line',
            source: MAP_IDS.PREDICTED_TRAIL_SOURCE,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': userColors.trail,
                'line-width': 2,
                'line-emissive-strength': 1,
            }
        }) // 这里的顺序可能需要调整，确保在 Pilot Layer 之下
    }
    // 这里我们只初始化 Layer 一次
    const layerId = MAP_IDS.PILOT_LIST_LAYER
    if (!map.getLayer(layerId)) {
        const sourceId = MAP_IDS.PILOT_LIST_SOURCE
        const source: mapboxgl.SourceSpecification = {
            'type': 'geojson',
            'data': { type: 'FeatureCollection', features: [] }
        }
        
        const layer: mapboxgl.LayerSpecification = {
            id: layerId,
            type: 'symbol',
            source: sourceId,
            layout:{
                "icon-anchor":'center',
                "icon-image": ['get', 'icon'],
                "icon-rotate": ['get', 'heading'],
                "icon-pitch-alignment": "map",
                "icon-rotation-alignment": "map",
                'icon-ignore-placement':true,
                'icon-size': [
                    'interpolate',
                    ['exponential', 0.5],
                    ['zoom'],
                    2, 0.07, 4, 0.1, 6.5, 0.12, 7, 0.135, 8, 0.138, 10, 0.14, 
                    12, 0.142, 13, 0.144, 14, 0.145, 15, 0.152, 15.5, 0.166, 
                    16, 0.18, 16.5, 0.28, 17, 0.3, 17.4, 0.33
                ],
                'icon-allow-overlap': true,
                "text-field":['get','callsign'],
                "text-variable-anchor": ["top", "bottom", "top-left", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"],
                'text-size':[
                    'interpolate',
                    ['exponential', 0.5],
                    ['zoom'],
                    2, 10, 5, 11, 8, 12
                ],
                'text-offset':[1.5, 1.5],
                'text-allow-overlap': true,
                'text-pitch-alignment':"viewport",
                'text-rotation-alignment':'viewport'
            },
            paint:{
                "icon-color":[
                    'case',
                    ['==',['get','emergency'],'true'],
                    'red',
                    userColors.icon
                ],
                'text-color': userColors.label,
                'text-halo-width':0,
                'text-halo-color':'white'
            }
        }
        addDynamicLayer(map, sourceId, source, layer, { type: 'FeatureCollection', features: [] })
    }
}

const handleDataUpdate = (map: mapboxgl.Map, pilotList: OnlinePilot[]) => {
    const currentIds = new Set<string>()
    const now = Date.now() // 注意这里用 Date.now() 而不是 performance.now()，虽然不用于计算差值

    pilotList.forEach(pilot => {
        const id = pilot.session_id || pilot.cid
        currentIds.add(id)
        
        if (pilotStates.has(id)) {
            const state = pilotStates.get(id)!
            // 更新状态，重置轨迹
            state.pilot = pilot
            state.lastUpdateTime = now
            state.currentPos = [pilot.longitude, pilot.latitude]
            
            // 如果有活跃轨迹，将新收到的真实位置加入轨迹，实现平滑连接
            if (state.trail.length > 0) {
                state.trail.push([pilot.longitude, pilot.latitude])
            }
            // state.trail = [] // 不再清空预测轨迹，等待历史航迹更新时清除
        } else {
            // 新上线的飞机
            pilotStates.set(id, {
                pilot,
                lastUpdateTime: now,
                currentPos: [pilot.longitude, pilot.latitude],
                trail: [[pilot.longitude, pilot.latitude]] // 初始化包含起点
            })
        }
    })

    // 清理下线的飞机
    for (const id of pilotStates.keys()) {
        if (!currentIds.has(id)) {
            pilotStates.delete(id)
        }
    }
    
    // 确保图层已初始化
    initLayers(map)
}

/**
 * 初始化绘制服务
 * 加载资源并订阅数据更新
 */
export default async (map: mapboxgl.Map) => {
    try {
        await asyncLoadAssets(map)
    } catch (_) {
        console.log('map: pilot list assets load failed')
    }
    
    // 启动动画循环
    startAnimationLoop(map)

    pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, (_, data: OnlineData) => {
        if (data.flights) {
            handleDataUpdate(map, data.flights)
        }
    })

    pubsub.subscribe(EVENTS.HISTORY_TRACK_UPDATE, (_, data: { id: string }) => {
        // 当历史航迹更新时，清除该飞机的预测轨迹
        pilotStates.forEach((state) => {
            // data.id 可能是 callsign 或 cid
            if (state.pilot.callsign === data.id || state.pilot.cid.toString() === data.id) {
                state.trail = []
            }
        })
    })
}
