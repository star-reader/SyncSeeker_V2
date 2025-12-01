/**
 * addDynamicLayer Service
 * 
 * Mapbox 图层动态添加与更新封装。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
export default (
    map: mapboxgl.Map, 
    id: string,
    source: mapboxgl.SourceSpecification, 
    layer: mapboxgl.LayerSpecification,
    json: any, beforeLayer?: string
) => {
    if (!map) return
    if (!map.getSource(id)) {
        map.addSource(id, source)
        map.addLayer(layer, beforeLayer)
    } else {
        let source: any = map.getSource(id)
        source.setData(json)
    }
}