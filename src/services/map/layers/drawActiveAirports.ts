/**
 * drawActiveAirports Service
 * 
 * 在地图上标记有活动的机场（有起飞或降落航班的机场）。
 * 
 * @author Jerry Jin
 * @date 2025-12-01
 */
import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../../configs/constants'
import type { OnlineData } from '../../../types/fsd'
import syncSeekerDB from '../../../services/localDB/indexedDB'
import { useGetUserColor } from '../../../hooks/theme/useTheme'

// 缓存机场坐标以减少数据库查询
const airportCache = new Map<string, [number, number]>()
// 记录正在查询的机场以避免重复查询
const pendingQueries = new Set<string>()
// 记录未找到的机场以避免重复无效查询
const notFoundCache = new Set<string>()

const initLayer = (map: mapboxgl.Map) => {
    if (!map.getSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE)) {
        map.addSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
        
        const userColors = useGetUserColor()
        
        // 1. 机场点图层
        map.addLayer({
            id: MAP_IDS.ACTIVE_AIRPORTS_LAYER,
            type: 'circle',
            source: MAP_IDS.ACTIVE_AIRPORTS_SOURCE,
            paint: {
                'circle-radius': 5,
                'circle-color': userColors.label,
                'circle-stroke-width': 1,
                'circle-stroke-color': map.getStyle()?.fog ? '#000000' : '#ffffff',
                'circle-opacity': 0.6,
                'circle-emissive-strength': 1
            }
        })

        // 2. 机场代码标签图层
        map.addLayer({
            id: `${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`,
            type: 'symbol',
            source: MAP_IDS.ACTIVE_AIRPORTS_SOURCE,
            layout: {
                'text-field': ['get', 'icao'],
                'text-size': 12,
                'text-offset': [0, 0.8],
                'text-anchor': 'top',
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': userColors.label,
                // 'text-halo-color': '#ffffff',
                'text-halo-width': 0,
                'text-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    4, 0,
                    5, 1
                ]
            }
        })
    }
}

const updateActiveAirports = async (map: mapboxgl.Map, data: OnlineData) => {
    if (!data.flights) return

    const activeICAOs = new Set<string>()
    data.flights.forEach(pilot => {
        if (pilot.flight_plan) {
            if (pilot.flight_plan.departure) activeICAOs.add(pilot.flight_plan.departure)
            if (pilot.flight_plan.arrival) activeICAOs.add(pilot.flight_plan.arrival)
        }
    })

    const features: GeoJSON.Feature[] = []
    const missingICAOs: string[] = []

    for (const icao of activeICAOs) {
        // 如果已经确认找不到，跳过
        if (notFoundCache.has(icao)) continue

        if (airportCache.has(icao)) {
            features.push({
                type: 'Feature',
                properties: { icao },
                geometry: {
                    type: 'Point',
                    coordinates: airportCache.get(icao)!
                }
            })
        } else {
            if (!pendingQueries.has(icao)) {
                missingICAOs.push(icao)
            }
        }
    }

    // 更新现有数据
    const source = map.getSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE) as mapboxgl.GeoJSONSource
    if (source) {
        source.setData({
            type: 'FeatureCollection',
            features: features
        })
    }

    // 异步查询缺失的机场
    if (missingICAOs.length > 0) {
        missingICAOs.forEach(icao => pendingQueries.add(icao))
        
        // 确保 DB 已初始化
        try {
            await syncSeekerDB.init()
        } catch (e) {
            // DB 可能尚未准备好，稍后重试
            missingICAOs.forEach(icao => pendingQueries.delete(icao))
            return
        }

        Promise.all(missingICAOs.map(async (icao) => {
            try {
                const airport = await syncSeekerDB.getAirportByIcao(icao)
                if (airport) {
                    airportCache.set(icao, airport.coordinates)
                } else {
                    notFoundCache.add(icao)
                }
            } catch (e) {
                console.error(`Failed to fetch airport ${icao}`, e)
            } finally {
                pendingQueries.delete(icao)
            }
        })).then(() => {
            // 这里我们不立即触发重绘，而是等待下一次数据更新
            // 因为 OnlineData 更新频率较高（几秒一次），没必要为了几个新机场立即刷新
        })
    }
}

export default (map: mapboxgl.Map) => {
    initLayer(map)
    
    const token1 = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, (_, data: OnlineData) => {
        updateActiveAirports(map, data)
    })

    // 监听主题变化以更新颜色
    const token2 = pubsub.subscribe(EVENTS.THEME_CHANGE, () => {
        if (map.getLayer(MAP_IDS.ACTIVE_AIRPORTS_LAYER)) {
            const userColors = useGetUserColor()
            map.setPaintProperty(MAP_IDS.ACTIVE_AIRPORTS_LAYER, 'circle-color', userColors.label)
            map.setPaintProperty(`${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`, 'text-color', userColors.label)
        }
    })

    // 监听机场点击事件
    map.on('click', MAP_IDS.ACTIVE_AIRPORTS_LAYER, (e) => {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0]
            const icao = feature.properties?.icao
            if (icao) {
                pubsub.publish(EVENTS.AIRPORT_CLICK, { icao })
            }
        }
    })

    return () => {
        pubsub.unsubscribe(token1)
        pubsub.unsubscribe(token2)
    }
}
