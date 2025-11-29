/**
 * Fetch Storage Data
 * 
 * 从远端获取基础导航数据并存入 IndexedDB。
 * 包含机场、航司、FIR/UIR/APP 边界数据。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import axios from 'axios'
import pubsub from 'pubsub-js'
import syncSeekerDB from '../services/localDB/indexedDB'
import { EVENTS } from '../configs/constants'

/**
 * 获取并存储导航数据
 * 请求 version.json 检查版本，若有更新则请求 airports.json, airlines.json, firs.json, app.json 并存入 IndexedDB
 * @returns {Promise<boolean>} 是否进行了更新
 */
export const fetchAndStoreNavData = async (): Promise<boolean> => {
    const baseUrl = import.meta.env.VITE_PUBLIC_NAVDATA_URL
    if (!baseUrl) {
        console.warn('VITE_PUBLIC_NAVDATA_URL not configured')
        return false
    }

    try {
        // 确保数据库已初始化
        await syncSeekerDB.init()

        // 1. 获取远程版本信息
        const versionRes = await axios.get<NavDataVersion>(`${baseUrl}/version.json`)
        const remoteVersion = versionRes.data

        // 2. 获取本地版本信息
        const localVersion = await syncSeekerDB.getNavDataVersion()

        // 3. 比较版本，如果一致则跳过下载
        if (localVersion && 
            localVersion.bundle_id === remoteVersion.bundle_id && 
            localVersion.version_id === remoteVersion.version_id) {
            console.log('Nav data is up to date:', localVersion.version_id)
            return false
        }

        console.log('Updating nav data...', remoteVersion)

        // 4. 并行请求数据文件
        const [airportsRes, airlinesRes, firsRes, appRes] = await Promise.all([
            axios.get<IndexedDBAirports[]>(`${baseUrl}/airports.json?remote_version=${remoteVersion.bundle_id}`),
            axios.get<IndexedDBAirlines[]>(`${baseUrl}/airlines.json?remote_version=${remoteVersion.bundle_id}`),
            axios.get<IndexedDBFIRs[]>(`${baseUrl}/firs.json?remote_version=${remoteVersion.bundle_id}`),
            axios.get<IndexedDBFIRs[]>(`${baseUrl}/app.json?remote_version=${remoteVersion.bundle_id}`)
        ])

        // 存储机场数据
        if (airportsRes.data) {
            await syncSeekerDB.setAirportsData(airportsRes.data, remoteVersion.version_id)
        }

        // 存储航司数据
        if (airlinesRes.data) {
            await syncSeekerDB.setAirlinesData(airlinesRes.data, remoteVersion.version_id)
        }

        // 存储 FIR 数据 (合并 firs.json 和 app.json)
        if (firsRes.data || appRes.data) {
            const firs = firsRes.data || []
            const apps = appRes.data || []
            const allFirs = [...firs, ...apps]
            await syncSeekerDB.setFirData(allFirs, remoteVersion.version_id)
        }

        // 5. 存储版本信息
        await syncSeekerDB.setNavDataVersion(remoteVersion)

        // 发布更新事件
        pubsub.publish(EVENTS.NAVDATA_UPDATE, remoteVersion)
        
        return true

    } catch (error) {
        console.error('Failed to fetch and store nav data:', error)
        throw error
    }
}


