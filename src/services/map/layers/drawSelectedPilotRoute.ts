/**
 * drawSelectedPilotRoute Service
 * 
 * 负责在地图上绘制选中飞行员的大圆航线。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../../configs/constants'
import { useOnlineDataStore } from '../../../stores/useOnlineDataStore'
import syncSeekerDB from '../../localDB/indexedDB'
import { useGetCurrentTheme, useGetUserColor, colorsFromSchema, type PilotSchema } from '../../../hooks/theme/useTheme'
import addDynamicLayer from './addDynamicLayer'
import getGreatCircleRoute from '../../../utils/getGreatCircleRoute'
import preprocessTrackData from '../../../utils/preprocessTrackData'


let currentSelectedPilotId: string | null = null;
export const getSelectedPilotId = () => currentSelectedPilotId;
let currentSelectedCallsign: string | null = null
let cachedArrivalIcao: string | null = null;
let cachedAirportCoords: [number, number] | null = null;

/**
 * 绘制选中飞行员的航线
 */
const updateRouteLayer = async (map: mapboxgl.Map, pilotId: string | null, callsign: string | null, currentPos?: [number, number]) => {
    if (pilotId !== currentSelectedPilotId) {
        cachedArrivalIcao = null
        cachedAirportCoords = null
    }
    currentSelectedPilotId = pilotId
    currentSelectedCallsign = callsign

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
        let end: [number, number]

        if (pilot.flight_plan.arrival === cachedArrivalIcao && cachedAirportCoords) {
            end = cachedAirportCoords
        } else {
            await syncSeekerDB.init()
            const airport = await syncSeekerDB.getAirportByIcao(pilot.flight_plan.arrival)
            
            if (!airport) return
            end = airport.coordinates
            cachedArrivalIcao = pilot.flight_plan.arrival
            cachedAirportCoords = end
        }

        const start: [number, number] = currentPos || [pilot.longitude, pilot.latitude]
        // 生成大圆路径点
        const routeCoords = getGreatCircleRoute(start, end)
        // 修复跨越 180 度的问题
        const fixedRouteCoords = preprocessTrackData(routeCoords)

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
    pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, data: {id: string, callsign: string}) => {
        updateRouteLayer(map, data.id, data.callsign)
    })

    // 监听关闭事件
    pubsub.subscribe(EVENTS.PILOT_INFO_CLOSE, () => {
        updateRouteLayer(map, null, null)
    })
    
    // 监听主题/配色变化
    pubsub.subscribe(EVENTS.PILOT_SCHEMA_CHANGE, (_, schema: PilotSchema) => {
        applyThemeUpdate(map, schema)
    })

    pubsub.subscribe(EVENTS.THEME_CHANGE, () => {
        applyThemeUpdate(map)
    })

    // 监听飞行员位置更新，实时重绘航线
    pubsub.subscribe(EVENTS.PILOT_POSITION_UPDATE, (_, data: { callsign: string, position: [number, number] }) => {
        if (currentSelectedCallsign && data.callsign === currentSelectedCallsign) {
            updateRouteLayer(map, currentSelectedPilotId, currentSelectedCallsign, data.position)
        }else{
            console.log('data dismatched, received callsign is ', data.callsign, 'and current selected callsign is ', currentSelectedCallsign)
        }
    })


}
