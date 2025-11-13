import Icon, { ALL_ICON_KEYS } from '@icon-park/react/es/all'
import { Airplane } from '@icon-park/react'

export default ({ name, size = 16 }: { name: string, size?: number }) => {
  const type = name as any
  return ALL_ICON_KEYS.includes(type) ? <Icon type={type} size={size} /> : <Airplane size={size} />
}