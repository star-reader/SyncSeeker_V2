/**
 * Fetch release information from API
 * 
 * @author Jerry Jin
 * @date 2025-12-19
 */

export interface RoadMapItem {
    version: string
    status: 'released' | 'beta' | 'planned' | 'future'
    title: string
    description: string
}

export interface ChangelogItem {
    version: string
    date: string
    changes: string[]
}

export interface ThirdPartyLib {
    name: string
    url: string
    desc: string
}

export interface ReleaseInfo {
    road_map: RoadMapItem[]
    changelogs: ChangelogItem[]
    third_party: ThirdPartyLib[]
}

/**
 * 获取发布信息（路线图、更新日志、第三方库）
 */
export async function fetchReleaseInfo(): Promise<ReleaseInfo> {
    const baseUrl = import.meta.env.VITE_PUBLIC_NAVDATA_URL || ''
    const timestamp = Date.now()
    const url = `${baseUrl}/release_latest.json?t=${timestamp}`

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch release info: ${response.status}`)
        }
        
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching release info:', error)
        // 返回空数据作为降级
        return {
            road_map: [],
            changelogs: [],
            third_party: []
        }
    }
}
