/**
 * IconByName Component
 * 
 * 动态图标组件。
 * 基于 @icon-park/react，根据传入的图标名称动态渲染对应的 SVG 图标。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import Icon, { ALL_ICON_KEYS } from '@icon-park/react/es/all'
import { Airplane } from '@icon-park/react'

/**
 * 根据名称渲染图标
 * @param name 图标名称 (IconPark 键名)
 * @param size 图标尺寸 (默认 16)
 */
export default ({ name, size = 16 }: { name: string, size?: number }) => {
  // 首字母大写转换
  const type = name.charAt(0).toUpperCase() + name.slice(1) as any
  return ALL_ICON_KEYS.includes(type) ? <Icon type={type} size={size} /> : <Airplane size={size} />
}