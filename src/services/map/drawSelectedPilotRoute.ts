/**
 * drawSelectedPilotRoute Service
 * 
 * 负责在地图上绘制选中飞行员的大圆航线。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import syncSeekerDB from '../localDB/indexedDB'
import { useGetCurrentTheme, useGetUserColor, colorsFromSchema, type PilotSchema } from '../../hooks/theme/useTheme'
import addDynamicLayer from './addDynamicLayer'
import getGreatCircleRoute from '../../utils/getGreatCircleRoute'
import fix180Crossing from '../../utils/fix180Crossing'

let currentSelectedPilotId: string | null = null

/**
 * 绘制选中飞行员的航线
 */
const updateRouteLayer = async (map: mapboxgl.Map, pilotId: string | null) => {
    currentSelectedPilotId = pilotId

    // 如果没有ID，清空图层
    if (!pilotId) {
        const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
        const source = map.getSource(MAP_IDS.SELECTED_PILOT_ROUTE_SOURCE) as mapboxgl.GeoJSONSource
        if (source) source.setData(geojson)
        return
    }

    const pilot = useOnlineDataStore.getState().getPilotById(pilotId)
    if (!pilot || !pilot.flight_plan?.arrival) return

    try {
        await syncSeekerDB.init()
        const airport = await syncSeekerDB.getAirportByIcao(pilot.flight_plan.arrival)
        
        if (!airport) return

        const start: [number, number] = [pilot.longitude, pilot.latitude]
        const end: [number, number] = airport.coordinates

        // 生成大圆路径点
        const routeCoords = getGreatCircleRoute(start, end)

        // 修复跨越 180 度的问题
        const fixedRouteCoords = fix180Crossing(routeCoords)

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: fixedRouteCoords
                }
            }]
        }

        const userColors = useGetUserColor()
        const color = userColors.label

        const source: mapboxgl.SourceSpecification = {
            type: 'geojson',
            data: geojson
        }

        const layer: mapboxgl.LayerSpecification = {
            id: MAP_IDS.SELECTED_PILOT_ROUTE_LAYER,
            type: 'line',
            source: MAP_IDS.SELECTED_PILOT_ROUTE_SOURCE,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': color,
                'line-width': 2,
                'line-dasharray': [2, 4] // 虚线效果
            }
        }

        addDynamicLayer(map, MAP_IDS.SELECTED_PILOT_ROUTE_SOURCE, source, layer, geojson)

    } catch (e) {
        console.error('Failed to draw pilot route:', e)
    }
}

const applyThemeUpdate = (map: mapboxgl.Map, schema?: PilotSchema) => {
    if (map.getLayer(MAP_IDS.SELECTED_PILOT_ROUTE_LAYER)) {
        const theme = useGetCurrentTheme()
        const { label } = schema ? colorsFromSchema(schema, theme) : useGetUserColor()
        map.setPaintProperty(MAP_IDS.SELECTED_PILOT_ROUTE_LAYER, 'line-color', label)
    }
}

export default (map: mapboxgl.Map) => {
    // 监听点击事件
    pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, id: string) => {
        updateRouteLayer(map, id)
    })

    // 监听关闭事件
    pubsub.subscribe(EVENTS.PILOT_INFO_CLOSE, () => {
        updateRouteLayer(map, null)
    })
    
    // 监听主题/配色变化
    pubsub.subscribe(EVENTS.PILOT_SCHEMA_CHANGE, (_, schema: PilotSchema) => {
        applyThemeUpdate(map, schema)
    })

    pubsub.subscribe(EVENTS.THEME_CHANGE, () => {
        applyThemeUpdate(map)
    })
}
