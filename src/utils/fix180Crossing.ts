/**
 * 修复经度跨越 180 度的问题
 * 将经度坐标转换为连续的值，避免从 179 跳变到 -179
 */
export default function fix180Crossing(line: number[][]): number[][] {
    if (!line || !line[0] || line.length === 0) {
        return []
    }

    // Clone to avoid mutating original data if needed, though here we might want to mutate or return new
    const newLine = line.map(p => [...p])

    const lstLonDiff: number[] = [];
    for (let i = 0; i < newLine.length - 1; i++) {
        let detLon = newLine[i + 1][0] - newLine[i][0];
        //如果超过180度 
        if (Math.abs(detLon) > 180) {
            if (detLon > 0) {
                detLon -= 360;
            }
            else {
                detLon += 360;
            }
        }
        lstLonDiff.push(detLon);
    }

    // 移除强制向右移动 360 度的逻辑，保持原始起始经度
    // if (newLine[0][0] < 0) 
    //     newLine[0][0] += 360; 

    for (let i = 0; i < newLine.length - 1; i++) {
        //从上一个点上加上经差，把航线内存数据，重新赋值 
        newLine[i + 1][0] = newLine[i][0] + lstLonDiff[i];
    }
    
    return newLine
}
