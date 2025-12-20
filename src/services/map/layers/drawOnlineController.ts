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

// 管制员类型
type ControllerType = 'CTR' | 'APP' | 'TWR' | 'GND' | 'DEL' | 'FSS' | 'ATIS' | 'OBS' | 'OTHER'

// 颜色配置
const CONTROLLER_COLORS: Record<ControllerType, { fill: string; line: string }> = {
    CTR: { fill: 'rgba(191, 219, 254, 0.24)', line: 'rgba(59, 130, 246, 0.8)' },   // 蓝色
    APP: { fill: 'rgba(252, 231, 243, 0.24)', line: 'rgba(236, 72, 153, 0.8)' },   // 粉色
    FSS: { fill: 'rgba(221, 214, 254, 0.24)', line: 'rgba(139, 92, 246, 0.8)' },   // 紫色
    TWR: { fill: 'rgba(167, 243, 208, 0.1)', line: 'rgba(16, 185, 129, 0.7)' },   // 绿色
    GND: { fill: 'rgba(254, 243, 199, 0.1)', line: 'rgba(245, 158, 11, 0.7)' },   // 黄色
    DEL: { fill: 'rgba(254, 215, 170, 0.1)', line: 'rgba(249, 115, 22, 0.7)' },   // 橙色
    ATIS: { fill: 'transparent', line: 'transparent' },
    OBS: { fill: 'transparent', line: 'transparent' },
    OTHER: { fill: 'rgba(229, 231, 235, 0.24)', line: 'rgba(156, 163, 175, 0.7)' } // 灰色
}

// 圆圈半径配置（米）- 用于没有FIR数据的管制员
const CIRCLE_RADIUS_METERS: Record<ControllerType, number> = {
    FSS: 1092800,   // ~590 NM
    CTR: 441120,    // ~238 NM
    APP: 221520,    // ~120 NM
    TWR: 10820,     // ~5.8 NM
    GND: 3700,      // ~2 NM
    DEL: 2408,      // ~1.3 NM
    ATIS: 0,
    OBS: 0,
    OTHER: 5000
}

// 缓存FIR数据
let firCache: IndexedDBFIRs[] | null = null

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
            if (fir.geojson?.features) {
                features.push(...fir.geojson.features)
            } else if ((fir as any).coordinates) {
                const coords = (fir as any).coordinates as number[][]
                const polygonCoords = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]]
                features.push({
                    type: 'Feature',
                    properties: { icao: fir.icao, name: fir.name, type: fir.type },
                    geometry: { type: 'Polygon', coordinates: [polygonCoords] }
                })
            }
        })
        return features.length > 0 ? features : null
    }
    
    // 分扇格式: ZBAA_01_CTR -> 直接查找 ZBAA_01_CTR
    if (sector) {
        const fullName = `${prefix}_${sector}_${type}`
        const match = firCache.find(fir => fir.name && fir.name.toUpperCase() === fullName)
        if (match) {
            if (match.geojson?.features) {
                return match.geojson.features
            } else if ((match as any).coordinates) {
                const coords = (match as any).coordinates as number[][]
                const polygonCoords = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]]
                return [{
                    type: 'Feature',
                    properties: { icao: match.icao, name: match.name, type: match.type },
                    geometry: { type: 'Polygon', coordinates: [polygonCoords] }
                }]
            }
        }
    }
    
    // 非分扇格式: ZBAA_CTR -> 查找所有 ZBAA_*_CTR 分扇并合并
    // 或者直接匹配 ZBAA_CTR
    const directMatch = firCache.find(fir => 
        (fir.name && fir.name.toUpperCase() === `${prefix}_${type}`) ||
        (fir.icao && fir.icao.toUpperCase() === prefix)
    )
    
    if (directMatch) {
        if (directMatch.geojson?.features) {
            features.push(...directMatch.geojson.features)
        } else if ((directMatch as any).coordinates) {
            const coords = (directMatch as any).coordinates as number[][]
            const polygonCoords = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]]
            features.push({
                type: 'Feature',
                properties: { icao: directMatch.icao, name: directMatch.name, type: directMatch.type },
                geometry: { type: 'Polygon', coordinates: [polygonCoords] }
            })
        }
    }
    
    // 查找分扇
    const sectorPattern = new RegExp(`^${prefix}_\\d+_${type}$`, 'i')
    const sectorMatches = firCache.filter(fir => fir.name && sectorPattern.test(fir.name))
    
    sectorMatches.forEach((fir) => {
        // 支持 geojson.features 格式
        if (fir.geojson?.features) {
            features.push(...fir.geojson.features)
        } 
        // 支持直接的 coordinates 数组格式
        else if ((fir as any).coordinates && Array.isArray((fir as any).coordinates)) {
            const coords = (fir as any).coordinates as number[][]
            
            // 确保坐标格式正确（闭合的多边形）
            const polygonCoords = coords[0] === coords[coords.length - 1] 
                ? coords 
                : [...coords, coords[0]]
            
            const feature: GeoJSON.Feature = {
                type: 'Feature',
                properties: {
                    icao: fir.icao,
                    name: fir.name,
                    type: fir.type
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [polygonCoords]
                }
            }
            features.push(feature)
        }
    })
    
    // 如果没找到分扇，尝试按ICAO匹配FIR数据
    if (features.length === 0 && (type === 'CTR' || type === 'APP')) {
        const firType = type === 'CTR' ? 'fir' : 'app'
        const icaoMatch = firCache.find(fir => 
            fir.icao && fir.icao.toUpperCase() === prefix && fir.type === firType
        )
        if (icaoMatch) {
            if (icaoMatch.geojson?.features) {
                features.push(...icaoMatch.geojson.features)
            } else if ((icaoMatch as any).coordinates) {
                const coords = (icaoMatch as any).coordinates as number[][]
                const polygonCoords = coords[0] === coords[coords.length - 1] ? coords : [...coords, coords[0]]
                features.push({
                    type: 'Feature',
                    properties: { icao: icaoMatch.icao, name: icaoMatch.name, type: icaoMatch.type },
                    geometry: { type: 'Polygon', coordinates: [polygonCoords] }
                })
            }
        }
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
    const token = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, async (_, data: OnlineData) => {
        await updateControllers(map, data.controllers)
    })
    
    return () => {
        pubsub.unsubscribe(token)
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
    
    // 更新地图sources
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