export const useGetCurrentTheme = () => {
    return localStorage.getItem('theme') || 'light'
}

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

export const useGetUserColor = () => {
    const theme = useGetCurrentTheme()
    const schema = getPilotSchema()
    const label = theme === 'dark' ? schema.label.night : schema.label.day
    const icon = theme === 'dark' ? schema.icon.night : schema.icon.day
    return { label, icon }
}

export const colorsFromSchema = (schema: PilotSchema, theme: string) => {
    const label = theme === 'dark' ? schema.label.night : schema.label.day
    const icon = theme === 'dark' ? schema.icon.night : schema.icon.day
    return { label, icon }
}