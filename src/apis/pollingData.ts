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