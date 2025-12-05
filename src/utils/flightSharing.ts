/**
 * Flight Sharing Utilities
 * 
 * 航班分享和追踪功能工具函数
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */

/**
 * 生成航班分享链接
 * @param callsign 航班呼号
 * @returns 完整的分享 URL
 */
export const generateShareUrl = (callsign: string): string => {
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
    const params = new URLSearchParams(window.location.search)
    return params.get('track')
}

/**
 * 清除 URL 中的追踪参数（不刷新页面）
 */
export const clearTrackParam = (): void => {
    const url = new URL(window.location.href)
    url.searchParams.delete('track')
    window.history.replaceState({}, '', url.toString())
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
