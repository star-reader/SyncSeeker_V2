import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../../configs/constants'
import type { OnlineData } from '../../../types/fsd'
import type { IndexedDBAirports } from '../../../types/types'
import syncSeekerDB from '../../../services/localDB/indexedDB'
import { useGetUserColor } from '../../../hooks/theme/useTheme'

const airportCache = new Map<string, [number, number]>()
const pendingQueries = new Set<string>()
const notFoundCache = new Set<string>()

function isFiniteCoordinate(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function normalizeAirportCoordinates(airport: IndexedDBAirports | null): [number, number] | null {
    if (!airport) {
        return null
    }

    const directCoordinates = (airport as any).coordinates
    if (
        Array.isArray(directCoordinates) &&
        directCoordinates.length >= 2 &&
        isFiniteCoordinate(directCoordinates[0]) &&
        isFiniteCoordinate(directCoordinates[1])
    ) {
        return [directCoordinates[0], directCoordinates[1]]
    }

    const objectCoordinates = directCoordinates as
        | { lng?: number; lat?: number; longitude?: number; latitude?: number }
        | undefined

    const lng = objectCoordinates?.lng ?? objectCoordinates?.longitude ?? (airport as any).longitude
    const lat = objectCoordinates?.lat ?? objectCoordinates?.latitude ?? (airport as any).latitude

    if (isFiniteCoordinate(lng) && isFiniteCoordinate(lat)) {
        return [lng, lat]
    }

    return null
}

const initLayer = (map: mapboxgl.Map) => {
    if (!map.getSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE)) {
        map.addSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
        
        const userColors = useGetUserColor()
        
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
                'text-halo-width': 0,
                'text-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    2, 0,
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

    const source = map.getSource(MAP_IDS.ACTIVE_AIRPORTS_SOURCE) as mapboxgl.GeoJSONSource
    if (source) {
        source.setData({
            type: 'FeatureCollection',
            features: features
        })
    }

    if (missingICAOs.length > 0) {
        missingICAOs.forEach(icao => pendingQueries.add(icao))
        
        try {
            await syncSeekerDB.init()
        } catch (e) {
            missingICAOs.forEach(icao => pendingQueries.delete(icao))
            return
        }

        Promise.all(missingICAOs.map(async (icao) => {
            try {
                const airport = await syncSeekerDB.getAirportByIcao(icao)
                const coordinates = normalizeAirportCoordinates(airport)
                if (coordinates) {
                    airportCache.set(icao, coordinates)
                } else {
                    notFoundCache.add(icao)
                }
            } catch (e) {
                console.error(`Failed to fetch airport ${icao}`, e)
            } finally {
                pendingQueries.delete(icao)
            }
        }))
    }
}

export default (map: mapboxgl.Map) => {
    initLayer(map)

    const token0 = pubsub.subscribe(EVENTS.NAVDATA_UPDATE, () => {
        airportCache.clear()
        pendingQueries.clear()
        notFoundCache.clear()
    })
    
    const token1 = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, (_, data: OnlineData) => {
        updateActiveAirports(map, data)
    })

    const token2 = pubsub.subscribe(EVENTS.THEME_CHANGE, () => {
        if (map.getLayer(MAP_IDS.ACTIVE_AIRPORTS_LAYER)) {
            const userColors = useGetUserColor()
            map.setPaintProperty(MAP_IDS.ACTIVE_AIRPORTS_LAYER, 'circle-color', userColors.label)
            map.setPaintProperty(MAP_IDS.ACTIVE_AIRPORTS_LAYER, 'circle-stroke-color', map.getStyle()?.fog ? '#000000' : '#ffffff')
            map.setPaintProperty(`${MAP_IDS.ACTIVE_AIRPORTS_LAYER}-label`, 'text-color', userColors.label)
        }
    })

    return () => {
        pubsub.unsubscribe(token0)
        pubsub.unsubscribe(token1)
        pubsub.unsubscribe(token2)
    }
}
