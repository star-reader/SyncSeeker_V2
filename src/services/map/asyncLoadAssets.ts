/**
 * asyncLoadAssets Service
 * 
 * 异步加载地图所需的图标资源。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import loadingSet from '../../configs/airplane/AirplaneLoad.json'

/**
 * 加载所有飞机图标资源
 * @param map Mapbox 实例
 */
export default async (map: mapboxgl.Map) => {
    const length = loadingSet.length
    return new Promise((res, _) => {
        let count = 0
        for (let i of loadingSet) {
            map.loadImage(`/airplanes/${i}-svg.png`, (error, img) => {
                if (error) console.log(error, i)
                if (!img) return
                map.addImage(i, img, {
                    'pixelRatio': 1,
                    'sdf': true
                })
                count++
                if (count === length) {
                    res(length)
                }
            })
        }
    })
}