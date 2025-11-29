/**
 * 计算两点间的大圆路径插值点
 * @param start [lon, lat] 起点
 * @param end [lon, lat] 终点
 * @param numPoints 插值点数量
 * @returns 坐标数组
 */

export default (start: [number, number], end: [number, number], numPoints = 100): [number, number][] => {
    const toRad = (d: number) => d * Math.PI / 180;
    const toDeg = (r: number) => r * 180 / Math.PI;

    const lon1 = toRad(start[0]);
    const lat1 = toRad(start[1]);
    const lon2 = toRad(end[0]);
    const lat2 = toRad(end[1]);

    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));

    const coordinates: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);
        const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
        const lambda = Math.atan2(y, x);
        coordinates.push([toDeg(lambda), toDeg(phi)]);
    }

    return coordinates;
}