/**
 * pollingData API Service
 * 
 * 负责轮询获取在线连飞数据 (FSD Data)。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import axios from "axios"
import { apiEndpointsGo } from "../configs/apiConfig"
import { useOnlineDataStore } from "../stores/useOnlineDataStore"
import type { OnlineData } from "../types/fsd"

/**
 * 异步获取在线列表数据
 * @returns Promise<OnlineData | null>
 */
const fetchOnlineData = async (): Promise<OnlineData | null> => {
    try {
        const res = await axios.get(apiEndpointsGo.getOnlineList)
        return res.data
    } catch (_) {
        return null
    }
}

/**
 * 启动轮询服务
 * 
 * 机制：
 * - 默认间隔 5000ms。
 * - 采用指数退避策略处理错误（失败次数越多，重试间隔越长，最长 30s）。
 * - 获取成功后调用 Store 的 setOnlineData 更新全局状态。
 * 
 * @returns 停止轮询的函数
 */
export default () => {
    const setOnlineData = (data: OnlineData) => {
        useOnlineDataStore.getState().setOnlineData(data)
    }
    let inFlight = false
    let errorCount = 0
    let stopped = false
    let delay = 5000
    const run = async () => {
        if (stopped || inFlight) return
        inFlight = true
        try {
            const data = await fetchOnlineData()
            if (data) {
                setOnlineData(data)
                errorCount = 0
                delay = 5000
            } else {
                errorCount += 1
                delay = Math.min(30000, 5000 * Math.pow(2, errorCount))
            }
        } finally {
            inFlight = false
            if (!stopped) setTimeout(run, delay)
        }
    }
    run()
    return () => {
        stopped = true
    }
}