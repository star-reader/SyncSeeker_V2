/**
 * drawAirportRadiation Service
 * 
 * 在地图上绘制机场航班辐射线。
 * 点击机场后，用大圆航线绘制该机场的出港/进港航班连线：
 * - 出港航班（机场→飞机当前位置）：绿色
 * - 进港航班（飞机当前位置→机场）：橙色
 * 
 * @author Jerry Jin
 * @date 2025-12-04
 */
import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../../configs/constants'
import { getDepartures, getArrivals } from '../../../services/airport/getAirportTraffic'
import { useOnlineDataStore } from '../../../stores/useOnlineDataStore'
import syncSeekerDB from '../../../services/localDB/indexedDB'
import getGreatCircleRoute from '../../../utils/getGreatCircleRoute'
import preprocessTrackData from '../../../utils/preprocessTrackData'

const DEPARTURE_COLOR = '#22c55e' // 绿色
const ARRIVAL_COLOR = '#f97316'   // 橙色

let currentIcao: string | null = null

const initLayer = (map: mapboxgl.Map) => {
  if (!map.getSource(MAP_IDS.AIRPORT_RADIATION_SOURCE)) {
    map.addSource(MAP_IDS.AIRPORT_RADIATION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })

    map.addLayer({
      id: MAP_IDS.AIRPORT_RADIATION_LAYER,
      type: 'line',
      source: MAP_IDS.AIRPORT_RADIATION_SOURCE,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.5,
        'line-opacity': 0.9,
        'line-emissive-strength': 1,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    })
  }
}

const clearRadiation = (map: mapboxgl.Map) => {
  const source = map.getSource(MAP_IDS.AIRPORT_RADIATION_SOURCE) as mapboxgl.GeoJSONSource
  if (source) {
    source.setData({ type: 'FeatureCollection', features: [] })
  }
  currentIcao = null
}

const updateRadiation = async (map: mapboxgl.Map, icao: string) => {
  const onlineData = useOnlineDataStore.getState().onlineData
  if (!onlineData) return

  // 获取机场坐标
  let airportCoords: [number, number] | null = null
  try {
    await syncSeekerDB.init()
    const airport = await syncSeekerDB.getAirportByIcao(icao)
    if (airport?.coordinates) {
      airportCoords = airport.coordinates
    }
  } catch (e) {
    console.error('Failed to get airport coordinates:', e)
    return
  }

  if (!airportCoords) return

  const departures = getDepartures(icao, onlineData)
  const arrivals = getArrivals(icao, onlineData)

  const features: GeoJSON.Feature[] = []

  // 出港航班：机场 → 飞机当前位置
  for (const pilot of departures) {
    if (pilot.longitude && pilot.latitude) {
      const pilotCoords: [number, number] = [pilot.longitude, pilot.latitude]
      const routeCoords = preprocessTrackData(getGreatCircleRoute(airportCoords, pilotCoords, 50))
      
      features.push({
        type: 'Feature',
        properties: {
          color: DEPARTURE_COLOR,
          type: 'departure',
          callsign: pilot.callsign
        },
        geometry: {
          type: 'LineString',
          coordinates: routeCoords
        }
      })
    }
  }

  // 进港航班：飞机当前位置 → 机场
  for (const pilot of arrivals) {
    if (pilot.longitude && pilot.latitude) {
      const pilotCoords: [number, number] = [pilot.longitude, pilot.latitude]
      const routeCoords = getGreatCircleRoute(pilotCoords, airportCoords, 50)
      
      features.push({
        type: 'Feature',
        properties: {
          color: ARRIVAL_COLOR,
          type: 'arrival',
          callsign: pilot.callsign
        },
        geometry: {
          type: 'LineString',
          coordinates: routeCoords
        }
      })
    }
  }

  const source = map.getSource(MAP_IDS.AIRPORT_RADIATION_SOURCE) as mapboxgl.GeoJSONSource
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    })
  }
}

export default (map: mapboxgl.Map) => {
  initLayer(map)

  // 监听机场点击事件
  const token1 = pubsub.subscribe(EVENTS.AIRPORT_CLICK, (_, data: { icao: string }) => {
    currentIcao = data.icao
    updateRadiation(map, data.icao)
  })

  // 监听在线数据更新，刷新辐射线
  const token2 = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
    if (currentIcao) {
      updateRadiation(map, currentIcao)
    }
  })

  // 监听机场信息面板关闭，清除辐射线
  const token3 = pubsub.subscribe(EVENTS.AIRPORT_INFO_CLOSE, () => {
    clearRadiation(map)
  })

  return () => {
    pubsub.unsubscribe(token1)
    pubsub.unsubscribe(token2)
    pubsub.unsubscribe(token3)
  }
}