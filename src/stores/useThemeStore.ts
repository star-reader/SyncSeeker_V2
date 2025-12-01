/**
 * useThemeStore
 * 
 * 管理全局主题和配色方案的状态存储。
 * 替代原有的直接 localStorage 读取方式，提供内存缓存以提升性能。
 * 
 * @author Jerry Jin (Refactored by Trae)
 * @date 2025-12-01
 */
import { create } from 'zustand'
import pubsub from 'pubsub-js'
import { EVENTS } from '../configs/constants'

export type PilotSchema = {
    label: { day: string, night: string }
    icon: { day: string, night: string }
}

const defaultSchema: PilotSchema = {
    label: { day: '#008080', night: '#87CEEB' },
    icon: { day: '#EF8B33', night: '#FFD27F' }
}

interface ThemeStore {
    // State
    theme: string
    pilotSchema: PilotSchema
    
    // Getters
    getTheme: () => string
    getPilotSchema: () => PilotSchema
    getUserColor: () => { label: string, icon: string }
    
    // Actions
    setTheme: (theme: string) => void
    setPilotSchema: (schema: PilotSchema) => void
}

// 初始状态读取逻辑
const getInitialTheme = () => localStorage.getItem('theme') || 'light'
const getInitialSchema = (): PilotSchema => {
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

export const useThemeStore = create<ThemeStore>((set, get) => ({
    theme: getInitialTheme(),
    pilotSchema: getInitialSchema(),

    getTheme: () => get().theme,
    
    getPilotSchema: () => get().pilotSchema,
    
    getUserColor: () => {
        const { theme, pilotSchema } = get()
        const label = theme === 'dark' ? pilotSchema.label.night : pilotSchema.label.day
        const icon = theme === 'dark' ? pilotSchema.icon.night : pilotSchema.icon.day
        return { label, icon }
    },

    setTheme: (theme: string) => {
        // 1. Update LocalStorage
        localStorage.setItem('theme', theme)
        
        // 2. Update DOM
        const el = document.getElementById('root')
        if (el) el.setAttribute('theme', theme)
        
        // 3. Update State
        set({ theme })
        
        // 4. Publish Event (Keep for compatibility)
        pubsub.publish(EVENTS.THEME_CHANGE, theme)
    },

    setPilotSchema: (schema: PilotSchema) => {
        localStorage.setItem('pilotSchema', JSON.stringify(schema))
        set({ pilotSchema: schema })
        // 如果需要，也可以发布 schema 变更事件
        pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, schema)
    }
}))
