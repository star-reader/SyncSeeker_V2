import { create } from 'zustand'
import type { OnlineData, OnlinePilot, OnlineController } from '../../types/fsd';

interface OnlineDataStore {
  onlineData: OnlineData | null
  getOnlineData: () => OnlineData
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
      throw new Error('Online data is not set')
    }
    return data
  },
  getPilotById: (id: string) => {
    return get().onlineData?.flights.find(item => item.session_id === id || item.cid === id)
  },
  getControllerById: (id: string) => {
    return get().onlineData?.controllers.find(item => item.session_id === id || item.cid === id)
  },
  getAtisList: () => {
    return get().onlineData?.atis || []
  },
  setOnlineData: (data: OnlineData) => set({ onlineData: data }),
}))