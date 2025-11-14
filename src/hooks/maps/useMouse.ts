import { MAP_IDS } from '../../configs/constants'

export default (map: mapboxgl.Map) => {
    if (!map) return

    const layers = [
        MAP_IDS.PILOT_LIST_LAYER
    ]

    for (let layer of layers) {
        map.on('mouseover',layer,() => {
            map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave',layer,() => {
            map.getCanvas().style.cursor = ''
        })
    }
}