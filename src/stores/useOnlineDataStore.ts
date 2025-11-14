import { create } from 'zustand'
import pubsub from 'pubsub-js'
import type { OnlineData, OnlinePilot, OnlineController } from '../types/fsd';

interface OnlineDataStore {
  onlineData: OnlineData | null
  getOnlineData: () => OnlineData | null
  getPilotById: (id: string) => OnlinePilot | undefined
  getControllerById: (id: string) => OnlineController | undefined,
  getAtisList: () => OnlineController[],
  setOnlineData: (data: OnlineData) => void,
}

export const useOnlineDataStore = create<OnlineDataStore>((set, get) => ({
  onlineData: null,
  getOnlineData: () => {
    const data = get().onlineData
    if (!data) {
      return null
    }
    return data
  },
  getPilotById: (id: string) => {
    return get().onlineData?.flights?.find(item => item.session_id === id || item.cid === id)
  },
  getControllerById: (id: string) => {
    return get().onlineData?.controllers?.find(item => item.session_id === id || item.cid === id)
  },
  getAtisList: () => {
    return get().onlineData?.atis || []
  },
  setOnlineData: (data: OnlineData) => {
    if (data && data.flights) {
      set({
        onlineData: {
          flights: data.flights?.sort((a, b) => b.logon_time > a.logon_time ? 1 : -1),
          controllers: data.controllers?.sort((a, b) => b.logon_time > a.logon_time ? 1 : -1),
          atis: data.atis?.sort((a, b) => b.logon_time > a.logon_time ? 1 : -1),
        }
      })
      // bugfix / Jerry 用pubsub-js发布事件，方便其他组件用
      // 这样就可以不单纯依赖于 useOnlineDataStore(s => s.onlineData?.flights ?? EMPTY_FLIGHTS) 这样的结构
      pubsub.publish('online-data-update', data)
    }
  }
}))