/**
 * Release Info Store
 * 
 * 存储发布信息（路线图、更新日志、第三方库）
 * 
 * @author Jerry Jin
 * @date 2025-12-19
 */
import { create } from 'zustand'
import { fetchReleaseInfo } from '../apis/fetchReleaseInfo'
import type { RoadMapItem, ChangelogItem, ThirdPartyLib } from '../apis/fetchReleaseInfo'

interface ReleaseInfoState {
    roadMap: RoadMapItem[]
    changelogs: ChangelogItem[]
    thirdParty: ThirdPartyLib[]
    isLoaded: boolean
    isLoading: boolean
    error: string | null
    
    // 初始化：从API加载数据（只加载一次）
    initialize: () => Promise<void>
}

export const useReleaseInfoStore = create<ReleaseInfoState>((set, get) => ({
    roadMap: [],
    changelogs: [],
    thirdParty: [],
    isLoaded: false,
    isLoading: false,
    error: null,
    
    initialize: async () => {
        const { isLoaded, isLoading } = get()
        
        // 如果已经加载过或正在加载，直接返回
        if (isLoaded || isLoading) {
            return
        }
        
        set({ isLoading: true, error: null })
        
        try {
            const data = await fetchReleaseInfo()
            set({
                roadMap: data.road_map || [],
                changelogs: data.changelogs || [],
                thirdParty: data.third_party || [],
                isLoaded: true,
                isLoading: false,
                error: null
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            set({
                error: errorMessage,
                isLoading: false
            })
            console.error('Failed to initialize release info:', error)
        }
    }
}))
