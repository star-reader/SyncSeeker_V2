/**
 * updateMapWithUserSetting Service
 * 
 * 响应用户设置的变更，实时更新地图图层样式。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */

import pubsub from 'pubsub-js'
import { EVENTS, MAP_IDS } from '../../configs/constants'
import { useGetCurrentTheme, useGetUserColor, colorsFromSchema, type PilotSchema } from '../../hooks/theme/useTheme'

// todo /jerry 完成更新事件和组件
// 用户在设置页面更新，对应key-value(json)，如"pilotSchema": {"day": "#bfa777", "night": "#8b7355"}会在localstorage储存
// 同时发布pubsub-js事件
// 这里就进行接受，对地图图层进行实时更新

/**
 * 监听设置变化并更新地图
 * 
 * @param map Mapbox 实例
 * @returns 清理函数（取消订阅）
 */
export default (map: mapboxgl.Map) => {
    const apply = (schema?: PilotSchema) => {
        const theme = useGetCurrentTheme()
        const { label, icon } = schema ? colorsFromSchema(schema, theme) : useGetUserColor()
        if (map.getLayer(MAP_IDS.PILOT_LIST_LAYER)) {
            map.setPaintProperty(MAP_IDS.PILOT_LIST_LAYER, 'text-color', label)
            map.setPaintProperty(
                MAP_IDS.PILOT_LIST_LAYER,
                'icon-color',
                ['case', ['==', ['get', 'emergency'], 'true'], 'red', icon]
            )
        }
    }
    apply()
    const t1 = pubsub.subscribe(EVENTS.PILOT_SCHEMA_CHANGE, (_, schema: PilotSchema) => apply(schema))
    const t2 = pubsub.subscribe(EVENTS.THEME_CHANGE, () => apply())
    return () => {
        pubsub.unsubscribe(t1)
        pubsub.unsubscribe(t2)
    }
}