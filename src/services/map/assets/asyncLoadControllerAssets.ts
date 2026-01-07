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
            // 检查图片是否已存在
            if (map.hasImage(i)) {
                count++
                if (count === length) {
                    res(length)
                }
                continue
            }
            
            map.loadImage(`/controllers/${i}.png`, (error, img) => {
                if (error) console.log(error, i)
                if (!img) return
                
                // 再次检查，避免并发加载时重复添加
                if (!map.hasImage(i)) {
                    map.addImage(i, img, {
                        'pixelRatio': 1,
                        'sdf': true
                    })
                }
                count++
                if (count === length) {
                    res(length)
                }
            })
        }
    })
}