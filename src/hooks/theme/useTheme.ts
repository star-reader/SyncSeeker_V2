/**
 * useTheme Hook & Utilities
 * 
 * 管理应用的主题（Light/Dark）及配色方案。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
/**
 * 获取当前主题
 * @returns 'light' | 'dark'
 */
export const useGetCurrentTheme = () => {
    return localStorage.getItem('theme') || 'light'
}

/**
 * 设置并持久化当前主题
 * @param theme 主题名称
 */
export const useSetCurrentTheme = (theme: string) => {
    const el = document.getElementById('root')
    if (el) el.setAttribute('theme', theme)
    localStorage.setItem('theme', theme)
}

export type PilotSchema = {
    label: { day: string, night: string }
    icon: { day: string, night: string }
}

const defaultSchema: PilotSchema = {
    label: { day: '#008080', night: '#87CEEB' },
    icon: { day: '#EF8B33', night: '#FFD27F' }
}

/**
 * 获取 Pilot 配色方案
 * @returns PilotSchema 对象
 */
export const getPilotSchema = (): PilotSchema => {
    const raw = localStorage.getItem('pilotSchema')
    if (!raw) return defaultSchema
    try {
        const obj = JSON.parse(raw)
        if (obj && obj.label && obj.icon) return obj
        return defaultSchema
    } catch {
        return defaultSchema
    }
}

/**
 * 获取当前生效的用户颜色配置
 * 根据当前主题自动选择 Day/Night 模式的颜色
 */
export const useGetUserColor = () => {
    const theme = useGetCurrentTheme()
    const schema = getPilotSchema()
    const label = theme === 'dark' ? schema.label.night : schema.label.day
    const icon = theme === 'dark' ? schema.icon.night : schema.icon.day
    return { label, icon }
}

/**
 * 根据 Schema 和主题解析颜色
 * @param schema 配色方案
 * @param theme 主题
 */
export const colorsFromSchema = (schema: PilotSchema, theme: string) => {
    const label = theme === 'dark' ? schema.label.night : schema.label.day
    const icon = theme === 'dark' ? schema.icon.night : schema.icon.day
    return { label, icon }
}