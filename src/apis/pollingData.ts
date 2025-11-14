import axios from "axios"
import { apiEndpointsGo } from "../configs/apiConfig"
import { useOnlineDataStore } from "../stores/useOnlineDataStore"
import type { OnlineData } from "../types/fsd"

const fetchOnlineData = async (): Promise<OnlineData | null> => {
    try {
        const res = await axios.get(apiEndpointsGo.getOnlineList)
        return res.data
    } catch (_) {
        return null
    }
}

const pollingDataInterval = (callback: (data: OnlineData) => void, thisArg: any) => {
    fetchOnlineData().then(data => {
        if (data) {
            callback.call(thisArg, data)
        }
    })
}


// @description 调用接口轮询获取在线数据，然后通过store塞进去，这是个定时轮训任务，都会执行的
export default () => {
    const setOnlineData = (data: OnlineData) => {
        useOnlineDataStore.getState().setOnlineData(data)
    }
    pollingDataInterval(setOnlineData, null)
    const timer = setInterval(() => {
        pollingDataInterval(setOnlineData, null)
    }, 5000)
    return () => clearInterval(timer)
}