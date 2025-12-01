/**
 * geoUtils.ts
 * 
 * 地理计算工具函数库
 * 包含航位推测、距离计算等
 */

const R = 6371e3; // 地球半径 (米)

/**
 * 将角度转换为弧度
 */
const toRad = (d: number) => d * Math.PI / 180;

/**
 * 将弧度转换为角度
 */
const toDeg = (r: number) => r * 180 / Math.PI;

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
    speed: number, 
    heading: number, 
    timeDelta: number
): [number, number] => {
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
