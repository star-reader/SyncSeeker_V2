import axios from "axios"
import { apiEndpointsGo } from "../configs/apiConfig"
import { useOnlineDataStore } from "../components/stores/useOnlineDataStore"
import type { OnlineData } from "../types/fsd"

const fetchOnlineData = (): Promise<OnlineData | null> => {
    return axios.get(apiEndpointsGo.getOnlineList).then(res => {
        return res.data
    }).catch(_ => {
        return null
    })
}

const pollingDataInterval = (callback: (data: OnlineData) => void, thisArg: any) => {
    fetchOnlineData().then(data => {
        if (data) {
            callback.call(thisArg, data)
        }
    })
}


// @description 调用接口轮询获取在线数据，然后通过store塞进去，这是个定时轮训任务，都会执行的
let started = false
let timer: number | null = null

export default () => {
    const setOnlineData = useOnlineDataStore.getState().setOnlineData
    if (started) return
    started = true
    pollingDataInterval(setOnlineData, null)
    timer = window.setInterval(() => {
        pollingDataInterval(setOnlineData, null)
    }, 5000)
}