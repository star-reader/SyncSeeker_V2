/**
 * Geo Types
 * 
 * 统一的地理坐标类型定义
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */
export type LngLat = [lng: number, lat: number]
export type LatLng = [lat: number, lng: number]
export type LngLatAlt = [lng: number, lat: number, alt: number]
export type BoundingBox = [swLng: number, swLat: number, neLng: number, neLat: number]
export type Knots = number
export type Feet = number
export type Heading = number
export type Squawk = string
