/**
 * geoUtils.ts
 * 
 * 地理计算工具函数库
 * 包含航位推测、距离计算等
 */

import type { LngLat, Heading, Knots } from '../types/geo.d.ts'

/** 地球半径 (米) */
const R = 6371e3;

/**
 * 将角度转换为弧度
 */
const toRad = (d: number): number => d * Math.PI / 180;

/**
 * 将弧度转换为角度
 */
const toDeg = (r: number): number => r * 180 / Math.PI;

/**
 * 航位推测 (Dead Reckoning)
 * 根据起点、速度、航向和时间差，计算新的位置
 * 
 * @param lat 起始纬度
 * @param lon 起始经度
 * @param speed 速度 (节 knots)
 * @param heading 航向 (度 0-360)
 * @param timeDelta 时间差 (毫秒)
 * @returns [newLon, newLat]
 */
export const calculateNextPosition = (
    lat: number, 
    lon: number, 
    speed: Knots, 
    heading: Heading, 
    timeDelta: number
): LngLat => {
    // 1 knot = 0.514444 m/s
    const distance = (speed * 0.514444) * (timeDelta / 1000);
    const angularDistance = distance / R;
    const headingRad = toRad(heading);
    const latRad = toRad(lat);
    const lonRad = toRad(lon);

    const nextLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(headingRad)
    );

    let nextLonRad = lonRad + Math.atan2(
        Math.sin(headingRad) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(nextLatRad)
    );
    
    // Normalize longitude to -180 to +180
    nextLonRad = (nextLonRad + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    return [toDeg(nextLonRad), toDeg(nextLatRad)];
}

/**
 * 计算两点之间的距离 (Haversine formula)
 * 
 * @param lat1 起点纬度
 * @param lon1 起点经度
 * @param lat2 终点纬度
 * @param lon2 终点经度
 * @returns 距离 (米)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

