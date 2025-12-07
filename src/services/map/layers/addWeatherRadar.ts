import type { Map as MapboxMap, RasterTileSource } from 'mapbox-gl'
import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../../configs/constants'
import { externalApis } from '../../../configs/apiConfig'

export type WeatherRadarOpacity = 'light' | 'medium' | 'high' | 'full'

const opacityMap: Record<WeatherRadarOpacity, number> = {
    light: 0.2,
    medium: 0.4,
    high: 0.7,
    full: 1
}

// 获取本地存储的设置
const getStoredSettings = () => {
    const enabled = localStorage.getItem('weather-radar-enabled') === 'true'
    const opacity = (localStorage.getItem('weather-radar-opacity') as WeatherRadarOpacity) || 'medium'
    return { enabled, opacity }
}

// 保存设置到本地存储
const saveSettings = (enabled: boolean, opacity: WeatherRadarOpacity) => {
    localStorage.setItem('weather-radar-enabled', String(enabled))
    localStorage.setItem('weather-radar-opacity', opacity)
}

export default function addWeatherRadar(map: MapboxMap) {
    let isEnabled = false
    let currentOpacity: WeatherRadarOpacity = 'medium'
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    const addRadarLayer = async () => {
        try {
            // 如果已存在，先移除
            if (map.getLayer(MAP_IDS.WEATHER_RADAR_LAYER)) {
                map.removeLayer(MAP_IDS.WEATHER_RADAR_LAYER)
            }
            if (map.getSource(MAP_IDS.WEATHER_RADAR_SOURCE)) {
                map.removeSource(MAP_IDS.WEATHER_RADAR_SOURCE)
            }

            const response = await fetch(externalApis.weatherRadar)
            const data = await response.json()
            
            // 获取最新的雷达数据
            const nowcast: { path: string }[] = data.radar.nowcast
            if (!nowcast || nowcast.length === 0) return
            
            // 获取最新帧
            const latestPath = nowcast[nowcast.length - 1].path
            const tileUrl = `${data.host}${latestPath}/256/{z}/{x}/{y}/2/1_1.png`

            map.addSource(MAP_IDS.WEATHER_RADAR_SOURCE, {
                type: 'raster',
                tiles: [tileUrl],
                tileSize: 256,
                maxzoom: 10 // 2025年开始这个api免费用户只能用10级以下的了
            })

            map.addLayer({
                id: MAP_IDS.WEATHER_RADAR_LAYER,
                type: 'raster',
                source: MAP_IDS.WEATHER_RADAR_SOURCE,
                paint: {
                    'raster-opacity': opacityMap[currentOpacity]
                }
            })

            isEnabled = true
            saveSettings(true, currentOpacity)
            
            // 启动定时刷新（每30分钟）
            startRefreshInterval()
        } catch (error) {
            console.error('Failed to load weather radar:', error)
        }
    }

    const refreshRadarData = async () => {
        if (!isEnabled) return
        try {
            const response = await fetch(externalApis.weatherRadar)
            const data = await response.json()
            
            const nowcast: { path: string }[] = data.radar.nowcast
            if (!nowcast || nowcast.length === 0) return
            
            const latestPath = nowcast[nowcast.length - 1].path
            const tileUrl = `${data.host}${latestPath}/256/{z}/{x}/{y}/2/1_1.png`

            // 更新 source 的 tiles
            const source = map.getSource(MAP_IDS.WEATHER_RADAR_SOURCE) as RasterTileSource
            if (source) {
                // Mapbox 不直接支持更新 tiles，需要移除并重新添加
                const currentOpacityValue = opacityMap[currentOpacity]
                
                if (map.getLayer(MAP_IDS.WEATHER_RADAR_LAYER)) {
                    map.removeLayer(MAP_IDS.WEATHER_RADAR_LAYER)
                }
                if (map.getSource(MAP_IDS.WEATHER_RADAR_SOURCE)) {
                    map.removeSource(MAP_IDS.WEATHER_RADAR_SOURCE)
                }

                map.addSource(MAP_IDS.WEATHER_RADAR_SOURCE, {
                    type: 'raster',
                    tiles: [tileUrl],
                    tileSize: 256,
                    maxzoom: 10
                })

                map.addLayer({
                    id: MAP_IDS.WEATHER_RADAR_LAYER,
                    type: 'raster',
                    source: MAP_IDS.WEATHER_RADAR_SOURCE,
                    paint: {
                        'raster-opacity': currentOpacityValue
                    }
                })
            }
        } catch (error) {
            console.error('Failed to refresh weather radar:', error)
        }
    }

    const startRefreshInterval = () => {
        // 清除已有的定时器
        if (refreshInterval) {
            clearInterval(refreshInterval)
        }
        // 每30分钟刷新一次
        refreshInterval = setInterval(refreshRadarData, 30 * 60 * 1000)
    }

    const stopRefreshInterval = () => {
        if (refreshInterval) {
            clearInterval(refreshInterval)
            refreshInterval = null
        }
    }

    const removeRadarLayer = () => {
        if (map.getLayer(MAP_IDS.WEATHER_RADAR_LAYER)) {
            map.removeLayer(MAP_IDS.WEATHER_RADAR_LAYER)
        }
        if (map.getSource(MAP_IDS.WEATHER_RADAR_SOURCE)) {
            map.removeSource(MAP_IDS.WEATHER_RADAR_SOURCE)
        }
        isEnabled = false
        saveSettings(false, currentOpacity)
        stopRefreshInterval()
    }

    const updateOpacity = (opacity: WeatherRadarOpacity) => {
        currentOpacity = opacity
        if (isEnabled && map.getLayer(MAP_IDS.WEATHER_RADAR_LAYER)) {
            map.setPaintProperty(MAP_IDS.WEATHER_RADAR_LAYER, 'raster-opacity', opacityMap[opacity])
        }
        saveSettings(isEnabled, opacity)
    }

    // 监听开关事件
    const toggleToken = pubsub.subscribe(EVENTS.TOGGLE_WEATHER_RADAR, (_, enabled: boolean) => {
        if (enabled) {
            addRadarLayer()
        } else {
            removeRadarLayer()
        }
    })

    // 监听透明度更新事件
    const opacityToken = pubsub.subscribe(EVENTS.UPDATE_WEATHER_RADAR_OPACITY, (_, opacity: WeatherRadarOpacity) => {
        updateOpacity(opacity)
    })

    // 初始化时检查存储的设置
    const { enabled, opacity } = getStoredSettings()
    currentOpacity = opacity
    if (enabled) {
        addRadarLayer()
    }

    // 返回清理函数
    return () => {
        pubsub.unsubscribe(toggleToken)
        pubsub.unsubscribe(opacityToken)
    }
}