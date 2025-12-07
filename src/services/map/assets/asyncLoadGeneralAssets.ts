/**
 * 
 * 异步加载mapbox所需要的通用资源
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */

import marker_atc from '../../../assets/marker_atc.png'

export default (map: mapboxgl.Map) => {

    const assetsData = [
        {'name': 'marker.atc', 'img': marker_atc, isSef: false}
    ]

    const length = assetsData.length
    return new Promise((res, _) => {
        let count = 0
        for (let i of assetsData) {
            map.loadImage(i.img, (error, img) => {
                if (error) console.log(error, i)
                if (!img) return
                map.addImage(i.name, img, {
                    'pixelRatio': 1,
                    'sdf': i.isSef
                })
                count++
                if (count === length) {
                    res(length)
                }
            })
        }
    })
}