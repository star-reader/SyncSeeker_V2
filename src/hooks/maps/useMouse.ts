export default (map: mapboxgl.Map) => {
    if (!map) return

    const layers = [
        'pilot-list-data'
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