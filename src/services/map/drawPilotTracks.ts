import pubsub from 'pubsub-js'
import axios from 'axios'
import { EVENTS, MAP_IDS } from '../../configs/constants'
import { apiEndpointsGo } from '../../configs/apiConfig'
import drawTracks from '../flightPath/drawTracks'
import draw3DTracks from '../flightPath/draw3DTracks'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'

let intervalId: ReturnType<typeof setInterval> | null = null
let currentCallsign: string | null = null
let is3DEnabled = false
let currentPilotData: TargetPilotData | null = null

const normalizePilotData = (data: any): TargetPilotData => {
    // 1. API返回的tracks数组，格式是[{Lat: number, Lon: number}, ...]，转成[[lng, lat], ...]
    let tracks: number[][] = []
    if (Array.isArray(data.tracks)) {
        tracks = data.tracks.map((t: any) => {
            if (typeof t === 'object' && t !== null) {
                const lng = t.Lon !== undefined ? t.Lon : (t.longitude !== undefined ? t.longitude : (t.lng !== undefined ? t.lng : undefined))
                const lat = t.Lat !== undefined ? t.Lat : (t.latitude !== undefined ? t.latitude : (t.lat !== undefined ? t.lat : undefined))
                
                // Validate coordinates
                if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                    if (lng === 0 && lat === 0) return null // Treat 0,0 as invalid for now
                    return [lng, lat]
                }
            }
            return null
        }).filter((t: any): t is number[] => t !== null)
    }

    // 2. altitudeArray
    let altitudeArray: number[] = []
    
    if (Array.isArray(data.statics)) {
        altitudeArray = data.statics.map((s: any) => {
            if (typeof s === 'object' && s !== null && s.Altitude !== undefined) {
                return Number(s.Altitude)
            }
            return 0
        })
    } else if (Array.isArray(data.altitudeArray)) {
        altitudeArray = data.altitudeArray.map((a: any) => Number(a) || 0)
    }
    
    if (altitudeArray.length < tracks.length) {
        const lastAlt = altitudeArray.length > 0 ? altitudeArray[altitudeArray.length - 1] : (Number(data.altitude) || 0)
        const missingCount = tracks.length - altitudeArray.length
        const filler = new Array(missingCount).fill(lastAlt)
        altitudeArray = [...altitudeArray, ...filler]
    }
    if (altitudeArray.length > tracks.length) {
        altitudeArray = altitudeArray.slice(0, tracks.length)
    }

    return {
        ...data,
        tracks,
        altitudeArray
    }
}

export default (map: mapboxgl.Map) => {
    const fetchAndDraw = async () => {
        if (!currentCallsign) return
        try {
            const url = apiEndpointsGo.pilotTrack.replace('{callsign}', currentCallsign)
            const res = await axios.get(url)
            if (!currentCallsign) return
            let data: TargetPilotData = res.data
            data = normalizePilotData(data)
            currentPilotData = data
            if (!data.tracks || data.tracks.length === 0) {
                removeLayers(map)
                return
            }
            // 2D
            update2DLayer(map, data)
            // 3D
            if (is3DEnabled) {
                update3DLayer(map, data)
            } else {
                remove3DLayer(map)
            }
        } catch (e) {
            console.error('Failed to fetch pilot track', e)
        }
    }

    pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, id: string) => {
        // 删除之前的查询
        if (intervalId) clearInterval(intervalId)
        removeLayers(map)
        
        const pilot = useOnlineDataStore.getState().getPilotById(id)
        if (!pilot) return

        currentCallsign = pilot.callsign
        fetchAndDraw()
        intervalId = setInterval(fetchAndDraw, 10000)
    })

    pubsub.subscribe(EVENTS.PILOT_INFO_CLOSE, () => {
        if (intervalId) clearInterval(intervalId)
        intervalId = null
        currentCallsign = null
        currentPilotData = null
        removeLayers(map)
    })

    pubsub.subscribe(EVENTS.TOGGLE_3D_TRACK, (_, enabled: boolean) => {
        is3DEnabled = enabled
        if (currentPilotData) {
            if (is3DEnabled) {
                update3DLayer(map, currentPilotData)
            } else {
                remove3DLayer(map)
            }
        }
    })
}

const update2DLayer = (map: mapboxgl.Map, data: TargetPilotData) => {
    const geojson = drawTracks(data)
    
    if (map.getSource(MAP_IDS.PILOT_TRACK_2D_SOURCE)) {
        (map.getSource(MAP_IDS.PILOT_TRACK_2D_SOURCE) as mapboxgl.GeoJSONSource).setData(geojson as any)
    } else {
        map.addSource(MAP_IDS.PILOT_TRACK_2D_SOURCE, {
            type: 'geojson',
            data: geojson as any
        })
        map.addLayer({
            id: MAP_IDS.PILOT_TRACK_2D_LAYER,
            type: 'line',
            source: MAP_IDS.PILOT_TRACK_2D_SOURCE,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-width': 3,
                'line-color': ['get', 'color']
            }
        })
    }
}

const update3DLayer = (map: mapboxgl.Map, data: TargetPilotData) => {
    remove3DLayer(map)
    const customLayer = draw3DTracks(data)
    map.addLayer(customLayer)
}

const remove3DLayer = (map: mapboxgl.Map) => {
    if (map.getLayer(MAP_IDS.PILOT_TRACK_3D_LAYER)) {
        map.removeLayer(MAP_IDS.PILOT_TRACK_3D_LAYER)
    }
}

const removeLayers = (map: mapboxgl.Map) => {
    if (map.getLayer(MAP_IDS.PILOT_TRACK_2D_LAYER)) map.removeLayer(MAP_IDS.PILOT_TRACK_2D_LAYER)
    if (map.getSource(MAP_IDS.PILOT_TRACK_2D_SOURCE)) map.removeSource(MAP_IDS.PILOT_TRACK_2D_SOURCE)
    remove3DLayer(map)
}
