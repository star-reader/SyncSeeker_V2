/**
 * Flight Sharing Utilities
 * 
 * 航班分享和追踪功能工具函数
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */

/**
 * 检查是否在 Tauri 应用环境中
 */
const isTauriApp = (): boolean => {
    return '__TAURI__' in window
}

/**
 * 生成航班分享链接
 * @param callsign 航班呼号
 * @returns 完整的分享 URL
 */
export const generateShareUrl = (callsign: string): string => {
    // 在 Tauri 环境中，使用生产环境的 web URL
    if (isTauriApp()) {
        const webUrl = 'https://beta.map.skylineflyleague.cn'
        const url = new URL(webUrl)
        url.searchParams.set('track', callsign)
        return url.toString()
    }
    
    // 在浏览器环境中，使用当前 origin
    const baseUrl = window.location.origin + window.location.pathname
    const url = new URL(baseUrl)
    url.searchParams.set('track', callsign)
    return url.toString()
}

/**
 * 从 URL 中解析追踪参数
 * @returns 需要追踪的航班呼号，如果没有则返回 null
 */
export const getTrackParamFromUrl = (): string | null => {
    try {
        // 在 Tauri 环境中，URL 可能是 tauri://localhost/?track=xxx
        // 需要特殊处理
        const search = window.location.search
        if (!search) return null
        
        const params = new URLSearchParams(search)
        return params.get('track')
    } catch (error) {
        console.error('Error parsing track param:', error)
        return null
    }
}

/**
 * 清除 URL 中的追踪参数（不刷新页面）
 */
export const clearTrackParam = (): void => {
    try {
        // 在 Tauri 环境中可能无法修改 URL，所以加个 try-catch
        const url = new URL(window.location.href)
        url.searchParams.delete('track')
        window.history.replaceState({}, '', url.toString())
    } catch (error) {
        console.warn('Unable to clear track param:', error)
    }
}

/**
 * 检查是否通过分享链接访问（用于判断是否需要下载导航数据）
 * @returns 是否通过分享链接访问
 */
export const isAccessedViaShareLink = (): boolean => {
    return getTrackParamFromUrl() !== null
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator?.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            return false
        }
    }
    return false
}
