/**
 * registerMapCursorHandlers
 * 
 * 管理地图上的鼠标交互行为（悬停手型）。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { MAP_IDS } from '../../configs/constants'

/**
 * 注册鼠标悬停/移出事件，改变光标样式
 * @param map Mapbox 实例
 */
export default function registerMapCursorHandlers(map: mapboxgl.Map): void {
    if (!map) return

    const layers = [
        MAP_IDS.PILOT_LIST_LAYER,
        MAP_IDS.ACTIVE_AIRPORTS_LAYER,
    ]

    for (const layer of layers) {
        map.on('mouseover', layer, () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = ''
        })
    }
}
