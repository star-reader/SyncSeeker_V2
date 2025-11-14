import loadingSet from '../../configs/airplane/AirplaneLoad.json'

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