
/**
 * 预处理航迹数据
 * 1. 过滤无效坐标 (0,0, null, NaN)
 * 2. 修复跨越 180 度经线的问题 (Longitude Unwrapping)
 * 3. (可选) 对长距离点进行插值以适应地球曲率
 */
export default function preprocessTrackData(line: number[][]): number[][] {
    if (!line || line.length === 0) {
        return []
    }

    const validLine = line.filter(p => {
        if (!Array.isArray(p) || p.length < 2) return false
        const [lng, lat] = p
        if (lng === null || lat === null || isNaN(lng) || isNaN(lat)) return false
        if (Math.abs(lng) < 0.1 && Math.abs(lat) < 0.1) return false
        return true
    })
    
    if (validLine.length === 0) return []

    // Clone to avoid mutating original data
    const newLine = validLine.map(p => [...p])

    const lstLonDiff: number[] = [];
    for (let i = 0; i < newLine.length - 1; i++) {
        let detLon = newLine[i + 1][0] - newLine[i][0];
        if (Math.abs(detLon) > 180) {
            if (detLon < 0) {
                 detLon += 360;
            } 
            else {
                detLon -= 360;
            }
        }
        lstLonDiff.push(detLon);
    }

    for (let i = 0; i < newLine.length - 1; i++) {
        newLine[i + 1][0] = newLine[i][0] + lstLonDiff[i];
    }
    
    return newLine
}
