/**
 * useTheme Hook & Utilities
 * 
 * 管理应用的主题（Light/Dark）及配色方案。
 * Refactored: 现在代理到全局 Zustand Store (useThemeStore) 以提升性能。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useThemeStore } from '../../stores/useThemeStore'
import type { PilotSchema } from '../../stores/useThemeStore'

export type { PilotSchema }

/**
 * 获取当前主题
 * @returns 'light' | 'dark'
 */
export const useGetCurrentTheme = () => {
    return useThemeStore.getState().getTheme()
}

/**
 * 设置并持久化当前主题
 * @param theme 主题名称
 */
export const useSetCurrentTheme = (theme: string) => {
    useThemeStore.getState().setTheme(theme)
}

/**
 * 获取 Pilot 配色方案
 * @returns PilotSchema 对象
 */
export const getPilotSchema = (): PilotSchema => {
    return useThemeStore.getState().getPilotSchema()
}

/**
 * 获取当前生效的用户颜色配置
 * 根据当前主题自动选择 Day/Night 模式的颜色
 * 现在从内存 Store 读取，性能更优。
 */
export const useGetUserColor = () => {
    return useThemeStore.getState().getUserColor()
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
