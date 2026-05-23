import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl'
import pubsub from 'pubsub-js'
import * as turf from '@turf/turf'
import type { OnlineController, OnlineData } from '../../../types/fsd'
import type { IndexedDBFIRs } from '../../../types/types'
import { MAP_IDS, EVENTS } from '../../../configs/constants'
import syncSeekerDB from '../../localDB/indexedDB'
import { CIRCLE_RADIUS_METERS } from '../../../configs/atc/controllerRadius'
import { CONTROLLER_COLORS_DAY, CONTROLLER_COLORS_NIGHT } from '../../../configs/atc/controllerColors'
import { useGetCurrentTheme } from '../../../hooks/theme/useTheme'
let firCache: IndexedDBFIRs[] | null = null

function isFiniteCoordinate(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function isPointPair(value: unknown): value is [number, number] {
    return Array.isArray(value) &&
        value.length >= 2 &&
        isFiniteCoordinate(value[0]) &&
        isFiniteCoordinate(value[1])
}

function cloneFeature(feature: GeoJSON.Feature): GeoJSON.Feature | null {
    if (!feature.geometry) {
        return null
    }

    return {
        ...feature,
        properties: feature.properties ? { ...feature.properties } : {}
    }
}

function buildPolygonFeature(
    coords: number[][],
    properties: Record<string, unknown>
): GeoJSON.Feature | null {
    const validCoords = coords.filter(isPointPair)
    if (validCoords.length < 3) {
        return null
    }

    const first = validCoords[0]
    const last = validCoords[validCoords.length - 1]
    const polygonCoords = first[0] === last[0] && first[1] === last[1]
        ? validCoords
        : [...validCoords, first]

    return {
        type: 'Feature',
        properties,
        geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords]
        }
    }
}

function extractFirFeatures(fir: IndexedDBFIRs): GeoJSON.Feature[] {
    const geojson = (fir as any).geojson

    if (geojson?.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        return geojson.features
            .map((feature: GeoJSON.Feature) => cloneFeature(feature))
            .filter((feature: GeoJSON.Feature | null): feature is GeoJSON.Feature => feature !== null)
    }

    if (geojson?.type === 'Feature') {
        const feature = cloneFeature(geojson as GeoJSON.Feature)
        return feature ? [feature] : []
    }

    const coordinates = (fir as any).coordinates
    if (Array.isArray(coordinates)) {
        const polygon = buildPolygonFeature(coordinates as number[][], {
            icao: fir.icao,
            name: fir.name,
            type: fir.type
        })
        return polygon ? [polygon] : []
    }

    return []
}

function getFirIdentifiers(fir: IndexedDBFIRs): string[] {
    return [fir.icao, fir.name]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map(value => value.toUpperCase())
}

function matchesExactControllerArea(fir: IndexedDBFIRs, expected: string) {
    return getFirIdentifiers(fir).some(value => value === expected)
}

function matchesAirportPrefix(fir: IndexedDBFIRs, prefix: string) {
    const upperPrefix = prefix.toUpperCase()
    return getFirIdentifiers(fir).some(value =>
        value === upperPrefix ||
        value.startsWith(`${upperPrefix}_`)
    )
}

function getFeatureCountForFir(fir: IndexedDBFIRs) {
    return extractFirFeatures(fir).length
}

function pickFirWithFeatures(candidates: IndexedDBFIRs[]) {
    return candidates.find(fir => getFeatureCountForFir(fir) > 0) || null
}

function getControllerColors() {
    const theme = useGetCurrentTheme()
    return theme === 'dark' ? CONTROLLER_COLORS_NIGHT : CONTROLLER_COLORS_DAY
}

function parseCallsign(callsign: string): { 
    type: ControllerType; 
    prefix: string; 
    sector: string | null; 
    fullMatch: string 
} {
    if (!callsign || typeof callsign !== 'string') {
        return {
            type: 'OTHER',
            prefix: '',
            sector: null,
            fullMatch: ''
        }
    }
    
    const upper = callsign.toUpperCase()
    
    let type: ControllerType = 'OTHER'
    if (upper.endsWith('_CTR')) type = 'CTR'
    else if (upper.endsWith('_APP')) type = 'APP'
    else if (upper.endsWith('_TWR')) type = 'TWR'
    else if (upper.endsWith('_GND')) type = 'GND'
    else if (upper.endsWith('_DEL')) type = 'DEL'
    else if (upper.endsWith('_FSS')) type = 'FSS'
    else if (upper.endsWith('_ATIS')) type = 'ATIS'
    else if (upper.includes('_OBS') || upper.includes('_SUP') || upper.includes('_ADM')) type = 'OBS'
    
    const sectorMatch = upper.match(/^([A-Z]{4})_(\d+)_(CTR|APP|TWR|GND|DEL)$/)
    if (sectorMatch) {
        return {
            type: type,
            prefix: sectorMatch[1],
            sector: sectorMatch[2],
            fullMatch: upper
        }
    }
    
    const simpleMatch = upper.match(/^([A-Z]{2,4})_(CTR|APP|TWR|GND|DEL|FSS|ATIS)$/)
    if (simpleMatch) {
        return {
            type: type,
            prefix: simpleMatch[1],
            sector: null,
            fullMatch: upper
        }
    }
    
    const parts = upper.split('_')
    return {
        type: type,
        prefix: parts[0] || '',
        sector: null,
        fullMatch: upper
    }
}

async function findFirBoundary(
    callsign: string, 
    type: ControllerType,
    prefix: string,
    sector: string | null
): Promise<GeoJSON.Feature[] | null> {
    if (!firCache) {
        try {
            await syncSeekerDB.init()
            firCache = await syncSeekerDB.getAllFirs()
        } catch (e) {
            console.error('Failed to load FIR data:', e)
            return null
        }
    }
    
    if (!firCache || firCache.length === 0) {
        return null
    }

    const features: GeoJSON.Feature[] = []
    
    if (callsign.toUpperCase() === 'PRC_FSS') {
        const chinaFirs = firCache.filter(fir => 
            fir.type === 'fir' && fir.icao && fir.icao.startsWith('Z')
        )
        chinaFirs.forEach(fir => {
            features.push(...extractFirFeatures(fir))
        })
        return features.length > 0 ? features : null
    }
    
    if (sector) {
        const fullName = `${prefix}_${sector}_${type}`
        const match = pickFirWithFeatures(
            firCache.filter(fir => matchesExactControllerArea(fir, fullName))
        )
        if (match) {
            const matchFeatures = extractFirFeatures(match)
            if (matchFeatures.length > 0) {
                return matchFeatures
            }
        }
    }
    
    const exactMatches = firCache.filter(fir => matchesExactControllerArea(fir, `${prefix}_${type}`))
    const prefixMatches = firCache.filter(fir => matchesAirportPrefix(fir, prefix))
    const directMatch = pickFirWithFeatures(exactMatches) || pickFirWithFeatures(prefixMatches)
    
    if (directMatch) {
        features.push(...extractFirFeatures(directMatch))
    }
    
    const sectorPattern = new RegExp(`^${prefix}_\\d+_${type}$`, 'i')
    const sectorMatches = firCache.filter(fir =>
        getFirIdentifiers(fir).some(value => sectorPattern.test(value))
    )
    
    sectorMatches.forEach((fir) => {
        features.push(...extractFirFeatures(fir))
    })
    if (features.length === 0 && (type === 'CTR' || type === 'APP')) {
        const firType = type === 'CTR' ? 'fir' : 'app'
        const icaoMatch = pickFirWithFeatures(
            firCache.filter(fir => fir.type === firType && matchesAirportPrefix(fir, prefix))
        )
        if (icaoMatch) {
            features.push(...extractFirFeatures(icaoMatch))
        }
    }
    
    return features.length > 0 ? features : null
}

function createCirclePolygon(
    lng: number, 
    lat: number, 
    radiusMeters: number
): GeoJSON.Feature {
    const radiusKm = radiusMeters / 1000
    const circle = turf.circle([lng, lat], radiusKm, { steps: 64, units: 'kilometers' })
    return circle
}

export default function drawOnlineController(map: MapboxMap) {
    const navdataToken = pubsub.subscribe(EVENTS.NAVDATA_UPDATE, () => {
        firCache = null
    })
    if (!map.getSource(MAP_IDS.CONTROLLER_POLYGON_SOURCE)) {
        map.addSource(MAP_IDS.CONTROLLER_POLYGON_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
    }
    
    if (!map.getSource(MAP_IDS.CONTROLLER_CIRCLE_SOURCE)) {
        map.addSource(MAP_IDS.CONTROLLER_CIRCLE_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
    }
    
    if (!map.getSource(MAP_IDS.CONTROLLER_MARKER_SOURCE)) {
        map.addSource(MAP_IDS.CONTROLLER_MARKER_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        })
    }
    
    if (!map.getLayer(MAP_IDS.CONTROLLER_POLYGON_FILL_LAYER)) {
        map.addLayer({
            id: MAP_IDS.CONTROLLER_POLYGON_FILL_LAYER,
            type: 'fill',
            source: MAP_IDS.CONTROLLER_POLYGON_SOURCE,
            paint: {
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': 1,
                'fill-emissive-strength': 1
            }
        })
    }
    
    if (!map.getLayer(MAP_IDS.CONTROLLER_POLYGON_LINE_LAYER)) {
        map.addLayer({
            id: MAP_IDS.CONTROLLER_POLYGON_LINE_LAYER,
            type: 'line',
            source: MAP_IDS.CONTROLLER_POLYGON_SOURCE,
            paint: {
                'line-color': ['get', 'lineColor'],
                'line-width': 1.5,
                'line-opacity': 1,
                'line-emissive-strength': 1,
            }
        })
    }
    
    if (!map.getLayer(MAP_IDS.CONTROLLER_CIRCLE_FILL_LAYER)) {
        map.addLayer({
            id: MAP_IDS.CONTROLLER_CIRCLE_FILL_LAYER,
            type: 'fill',
            source: MAP_IDS.CONTROLLER_CIRCLE_SOURCE,
            paint: {
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': 1,
                'fill-emissive-strength': 1
            }
        })
    }
    
    if (!map.getLayer(MAP_IDS.CONTROLLER_CIRCLE_LINE_LAYER)) {
        map.addLayer({
            id: MAP_IDS.CONTROLLER_CIRCLE_LINE_LAYER,
            type: 'line',
            source: MAP_IDS.CONTROLLER_CIRCLE_SOURCE,
            paint: {
                'line-color': ['get', 'lineColor'],
                'line-width': 1.5,
                'line-dasharray': [3, 2],
                'line-emissive-strength': 1
            }
        })
    }
    
    if (!map.getLayer(MAP_IDS.CONTROLLER_MARKER_LAYER)) {
        map.addLayer({
            id: MAP_IDS.CONTROLLER_MARKER_LAYER,
            type: 'symbol',
            source: MAP_IDS.CONTROLLER_MARKER_SOURCE,
            layout: {
                'icon-image': 'marker.atc',
                'icon-size': 0.75,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
            }
        })
    }
    
    const dataToken = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, async (_, data: OnlineData) => {
        await updateControllers(map, data.controllers)
    })
    
    const themeToken = pubsub.subscribe(EVENTS.THEME_CHANGE, async () => {
        const onlineData = (await import('../../../stores/useOnlineDataStore')).useOnlineDataStore.getState()
        const controllers = onlineData.getControllers()
        await updateControllers(map, controllers)
    })
    
    return () => {
        pubsub.unsubscribe(navdataToken)
        pubsub.unsubscribe(dataToken)
        pubsub.unsubscribe(themeToken)
    }
}

async function updateControllers(map: mapboxgl.Map, controllers: OnlineController[]) {
    const polygonFeatures: GeoJSON.Feature[] = []
    const circleFeatures: GeoJSON.Feature[] = []
    const markerFeatures: GeoJSON.Feature[] = []
    
    const processedPolygons = new Set<string>()
    
    for (const controller of controllers) {
        const { type, prefix, sector } = parseCallsign(controller.callsign)
        
        const CONTROLLER_COLORS = getControllerColors()
        const colors = CONTROLLER_COLORS[type] || CONTROLLER_COLORS.OTHER
        
        if (type === 'ATIS' || type === 'OBS') {
            continue
        }
        
        if (type === 'CTR' || type === 'APP' || type === 'FSS') {
            const polygonKey = sector ? `${prefix}_${sector}_${type}` : `${prefix}_${type}`
            
            if (!processedPolygons.has(polygonKey)) {
                processedPolygons.add(polygonKey)
                
                const boundaries = await findFirBoundary(controller.callsign, type, prefix, sector)
                
                if (boundaries && boundaries.length > 0) {
                    boundaries.forEach(feature => {
                        polygonFeatures.push({
                            ...feature,
                            properties: {
                                ...feature.properties,
                                callsign: controller.callsign,
                                type: type,
                                fillColor: colors.fill,
                                lineColor: colors.line
                            }
                        })
                    })
                    continue
                }
            } else {
                continue
            }
        }
        
        if (controller.latitude && controller.longitude) {
            const radiusMeters = CIRCLE_RADIUS_METERS[type] || CIRCLE_RADIUS_METERS.OTHER
            
            if (radiusMeters === 0) {
                markerFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [controller.longitude, controller.latitude]
                    },
                    properties: {
                        callsign: controller.callsign,
                        type: type
                    }
                })
                continue
            }
            
            const circle = createCirclePolygon(
                controller.longitude,
                controller.latitude,
                radiusMeters
            )
            
            circleFeatures.push({
                ...circle,
                properties: {
                    callsign: controller.callsign,
                    type: type,
                    fillColor: colors.fill,
                    lineColor: colors.line,
                    radiusMeters: radiusMeters
                }
            })
            
            markerFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [controller.longitude, controller.latitude]
                },
                properties: {
                    callsign: controller.callsign,
                    type: type
                }
            })
        }
    }

    const polygonSource = map.getSource(MAP_IDS.CONTROLLER_POLYGON_SOURCE) as GeoJSONSource
    const circleSource = map.getSource(MAP_IDS.CONTROLLER_CIRCLE_SOURCE) as GeoJSONSource
    const markerSource = map.getSource(MAP_IDS.CONTROLLER_MARKER_SOURCE) as GeoJSONSource
    
    if (polygonSource) {
        polygonSource.setData({
            type: 'FeatureCollection',
            features: polygonFeatures
        })
    }
    
    if (circleSource) {
        circleSource.setData({
            type: 'FeatureCollection',
            features: circleFeatures
        })
    }
    
    if (markerSource) {
        markerSource.setData({
            type: 'FeatureCollection',
            features: markerFeatures
        })
    }
}
