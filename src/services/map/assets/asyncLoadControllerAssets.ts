/**
 * asyncLoadControllersAssets Service
 * 
 * 异步加载controllers所需要的资源
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */

import {controllerIconSet} from '../../../configs/iconSet'


export default (map: mapboxgl.Map) => {
    const length = controllerIconSet.length
    return new Promise((res, _) => {
        let count = 0
        for (let i of controllerIconSet) {
            map.loadImage(`/controllers/${i}.png`, (error, img) => {
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