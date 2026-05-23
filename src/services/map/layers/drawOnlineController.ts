/**
 * drawOnlineController Service
 * 
 * 显示在线管制员
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */
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


// 缓存FIR数据
let firCache: IndexedDBFIRs[] | null = null
const DEBUG_ONLINE_CONTROLLER = true

function logController(...args: unknown[]) {
    if (DEBUG_ONLINE_CONTROLLER) {
        console.log('[drawOnlineController]', ...args)
    }
}

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

/**
 * 根据当前主题获取管制员颜色配置
 */
function getControllerColors() {
    const theme = useGetCurrentTheme()
    return theme === 'dark' ? CONTROLLER_COLORS_NIGHT : CONTROLLER_COLORS_DAY
}

/**
 * 解析管制员callsign获取类型和ICAO前缀
 * 例如: ZBAA_01_CTR -> { type: 'CTR', prefix: 'ZBAA', sector: '01', fullMatch: 'ZBAA_01_CTR' }
 *       ZBAA_CTR -> { type: 'CTR', prefix: 'ZBAA', sector: null, fullMatch: 'ZBAA_CTR' }
 *       PRC_FSS -> { type: 'FSS', prefix: 'PRC', sector: null, fullMatch: 'PRC_FSS' }
 */
function parseCallsign(callsign: string): { 
    type: ControllerType; 
    prefix: string; 
    sector: string | null; 
    fullMatch: string 
} {
    // 空值检查
    if (!callsign || typeof callsign !== 'string') {
        return {
            type: 'OTHER',
            prefix: '',
            sector: null,
            fullMatch: ''
        }
    }
    
    const upper = callsign.toUpperCase()
    
    // 检测类型后缀
    let type: ControllerType = 'OTHER'
    if (upper.endsWith('_CTR')) type = 'CTR'
    else if (upper.endsWith('_APP')) type = 'APP'
    else if (upper.endsWith('_TWR')) type = 'TWR'
    else if (upper.endsWith('_GND')) type = 'GND'
    else if (upper.endsWith('_DEL')) type = 'DEL'
    else if (upper.endsWith('_FSS')) type = 'FSS'
    else if (upper.endsWith('_ATIS')) type = 'ATIS'
    else if (upper.includes('_OBS') || upper.includes('_SUP') || upper.includes('_ADM')) type = 'OBS'
    
    // 解析分扇格式: ZBAA_01_CTR 或 ZBAA_CTR
    const sectorMatch = upper.match(/^([A-Z]{4})_(\d+)_(CTR|APP|TWR|GND|DEL)$/)
    if (sectorMatch) {
        return {
            type: type,
            prefix: sectorMatch[1],
            sector: sectorMatch[2],
            fullMatch: upper
        }
    }
    
    // 非分扇格式: ZBAA_CTR
    const simpleMatch = upper.match(/^([A-Z]{2,4})_(CTR|APP|TWR|GND|DEL|FSS|ATIS)$/)
    if (simpleMatch) {
        return {
            type: type,
            prefix: simpleMatch[1],
            sector: null,
            fullMatch: upper
        }
    }
    
    // 其他格式
    const parts = upper.split('_')
    return {
        type: type,
        prefix: parts[0] || '',
        sector: null,
        fullMatch: upper
    }
}

/**
 * 从FIR数据中查找匹配的边界
 */
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
            logController('loaded FIR cache', {
                count: firCache?.length || 0,
                sample: firCache?.slice(0, 5).map(item => ({
                    type: item.type,
                    icao: item.icao,
                    name: item.name,
                    geojsonType: (item as any).geojson?.type,
                    featureCount: (item as any).geojson?.features?.length
                }))
            })
        } catch (e) {
            console.error('Failed to load FIR data:', e)
            return null
        }
    }
    
    if (!firCache || firCache.length === 0) {
        return null
    }

    const features: GeoJSON.Feature[] = []
    
    // 特殊处理 PRC_FSS - 合并中国所有CTR
    if (callsign.toUpperCase() === 'PRC_FSS') {
        const chinaFirs = firCache.filter(fir => 
            fir.type === 'fir' && fir.icao && fir.icao.startsWith('Z')
        )
        chinaFirs.forEach(fir => {
            features.push(...extractFirFeatures(fir))
        })
        logController('matched PRC_FSS', { callsign, featureCount: features.length })
        return features.length > 0 ? features : null
    }
    
    // 分扇格式: ZBAA_01_CTR -> 直接查找 ZBAA_01_CTR
    if (sector) {
        const fullName = `${prefix}_${sector}_${type}`
        const match = pickFirWithFeatures(
            firCache.filter(fir => matchesExactControllerArea(fir, fullName))
        )
        if (match) {
            const matchFeatures = extractFirFeatures(match)
            if (matchFeatures.length > 0) {
                logController('matched sector boundary', {
                    callsign,
                    fullName,
                    match: { type: match.type, icao: match.icao, name: match.name },
                    featureCount: matchFeatures.length,
                    sample: matchFeatures[0]
                })
                return matchFeatures
            }
        }
    }
    
    // 非分扇格式: ZBAA_CTR -> 查找所有 ZBAA_*_CTR 分扇并合并
    // 或者直接匹配 ZBAA_CTR
    const exactMatches = firCache.filter(fir => matchesExactControllerArea(fir, `${prefix}_${type}`))
    const prefixMatches = firCache.filter(fir => matchesAirportPrefix(fir, prefix))
    const directMatch = pickFirWithFeatures(exactMatches) || pickFirWithFeatures(prefixMatches)
    
    if (directMatch) {
        features.push(...extractFirFeatures(directMatch))
        logController('matched direct boundary', {
            callsign,
            prefix,
            controllerType: type,
            match: { type: directMatch.type, icao: directMatch.icao, name: directMatch.name },
            featureCount: features.length,
            exactCandidates: exactMatches.map(fir => ({
                type: fir.type,
                icao: fir.icao,
                name: fir.name,
                extractedFeatureCount: getFeatureCountForFir(fir),
                geojsonType: (fir as any).geojson?.type
            })),
            prefixCandidates: prefixMatches.slice(0, 10).map(fir => ({
                type: fir.type,
                icao: fir.icao,
                name: fir.name,
                extractedFeatureCount: getFeatureCountForFir(fir),
                geojsonType: (fir as any).geojson?.type
            }))
        })
    }
    
    // 查找分扇
    const sectorPattern = new RegExp(`^${prefix}_\\d+_${type}$`, 'i')
    const sectorMatches = firCache.filter(fir =>
        getFirIdentifiers(fir).some(value => sectorPattern.test(value))
    )
    
    sectorMatches.forEach((fir) => {
        features.push(...extractFirFeatures(fir))
    })
    if (sectorMatches.length > 0) {
        logController('matched split sectors', {
            callsign,
            prefix,
            controllerType: type,
            sectorMatchCount: sectorMatches.length,
            featureCount: features.length
        })
    }
    
    // 如果没找到分扇，尝试按ICAO匹配FIR数据
    if (features.length === 0 && (type === 'CTR' || type === 'APP')) {
        const firType = type === 'CTR' ? 'fir' : 'app'
        const icaoMatch = pickFirWithFeatures(
            firCache.filter(fir => fir.type === firType && matchesAirportPrefix(fir, prefix))
        )
        if (icaoMatch) {
            features.push(...extractFirFeatures(icaoMatch))
            logController('matched fallback airport prefix', {
                callsign,
                prefix,
                firType,
                match: { type: icaoMatch.type, icao: icaoMatch.icao, name: icaoMatch.name },
                featureCount: features.length
            })
        }
    }

    if (features.length === 0) {
        logController('no boundary matched', {
            callsign,
            prefix,
            sector,
            controllerType: type,
            candidates: firCache
                .filter(fir => getFirIdentifiers(fir).some(value => value.includes(prefix)))
                .slice(0, 10)
                .map(fir => ({
                    type: fir.type,
                    icao: fir.icao,
                    name: fir.name,
                    extractedFeatureCount: getFeatureCountForFir(fir),
                    geojsonType: (fir as any).geojson?.type,
                    rawGeojson: (fir as any).geojson
                }))
        })
    }
    
    return features.length > 0 ? features : null
}

/**
 * 生成圆形polygon（用于没有FIR数据的管制员）
 * @param lng 经度
 * @param lat 纬度
 * @param radiusMeters 半径（米）
 */
function createCirclePolygon(
    lng: number, 
    lat: number, 
    radiusMeters: number
): GeoJSON.Feature {
    // 转换为公里
    const radiusKm = radiusMeters / 1000
    const circle = turf.circle([lng, lat], radiusKm, { steps: 64, units: 'kilometers' })
    return circle
}

/**
 * 主绘制函数
 */
export default function drawOnlineController(map: MapboxMap) {
    const navdataToken = pubsub.subscribe(EVENTS.NAVDATA_UPDATE, () => {
        firCache = null
    })

    // 初始化sources
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
    
    // 添加polygon填充层
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
    
    // 添加polygon边界线层
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
    
    // 添加圆圈填充层
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
    
    // 添加圆圈边界线层
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
    
    // 添加marker点层（管制员位置标记）
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
    
    // 订阅数据更新
    const dataToken = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, async (_, data: OnlineData) => {
        await updateControllers(map, data.controllers)
    })
    
    // 订阅主题变化
    const themeToken = pubsub.subscribe(EVENTS.THEME_CHANGE, async () => {
        // 主题切换时，重新绘制所有管制员以应用新颜色
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

/**
 * 更新管制员显示
 */
async function updateControllers(map: mapboxgl.Map, controllers: OnlineController[]) {
    const polygonFeatures: GeoJSON.Feature[] = []
    const circleFeatures: GeoJSON.Feature[] = []
    const markerFeatures: GeoJSON.Feature[] = []
    
    // 用于去重已处理的polygon区域
    const processedPolygons = new Set<string>()
    
    for (const controller of controllers) {
        const { type, prefix, sector } = parseCallsign(controller.callsign)
        
        const CONTROLLER_COLORS = getControllerColors()
        const colors = CONTROLLER_COLORS[type] || CONTROLLER_COLORS.OTHER
        
        // 跳过不需要绘制的类型
        if (type === 'ATIS' || type === 'OBS') {
            continue
        }
        
        // 尝试获取polygon边界（CTR/APP/FSS）
        if (type === 'CTR' || type === 'APP' || type === 'FSS') {
            // 生成唯一key避免重复绘制相同区域
            const polygonKey = sector ? `${prefix}_${sector}_${type}` : `${prefix}_${type}`
            
            if (!processedPolygons.has(polygonKey)) {
                processedPolygons.add(polygonKey)
                
                const boundaries = await findFirBoundary(controller.callsign, type, prefix, sector)
                
                if (boundaries && boundaries.length > 0) {
                    // 找到FIR数据，绘制polygon
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
                    logController('polygon features prepared', {
                        callsign: controller.callsign,
                        featureCount: boundaries.length,
                        sample: boundaries[0]
                    })
                    continue
                }
            } else {
                // 已处理过这个区域，跳过
                continue
            }
        }
        
        // 没有找到FIR数据或其他类型（TWR/GND/DEL等），绘制圆圈
        // 需要有经纬度坐标
        if (controller.latitude && controller.longitude) {
            const radiusMeters = CIRCLE_RADIUS_METERS[type] || CIRCLE_RADIUS_METERS.OTHER
            
            // 如果半径为0（如ATIS/OBS），跳过圆圈绘制
            if (radiusMeters === 0) {
                // 仍然添加marker
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
            
            // 创建圆形polygon
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
            
            // 添加中心点marker
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

    logController('update summary', {
        controllerCount: controllers.length,
        polygonFeatureCount: polygonFeatures.length,
        circleFeatureCount: circleFeatures.length,
        markerFeatureCount: markerFeatures.length
    })
    
    // 更新地图sources
    const polygonSource = map.getSource(MAP_IDS.CONTROLLER_POLYGON_SOURCE) as GeoJSONSource
    const circleSource = map.getSource(MAP_IDS.CONTROLLER_CIRCLE_SOURCE) as GeoJSONSource
    const markerSource = map.getSource(MAP_IDS.CONTROLLER_MARKER_SOURCE) as GeoJSONSource
    
    if (polygonSource) {
        polygonSource.setData({
            type: 'FeatureCollection',
            features: polygonFeatures
        })
        logController('polygon source updated', {
            featureCount: polygonFeatures.length,
            sample: polygonFeatures[0]
        })
    }
    
    if (circleSource) {
        circleSource.setData({
            type: 'FeatureCollection',
            features: circleFeatures
        })
        logController('circle source updated', {
            featureCount: circleFeatures.length,
            sample: circleFeatures[0]
        })
    }
    
    if (markerSource) {
        markerSource.setData({
            type: 'FeatureCollection',
            features: markerFeatures
        })
        logController('marker source updated', {
            featureCount: markerFeatures.length,
            sample: markerFeatures[0]
        })
    }
}
