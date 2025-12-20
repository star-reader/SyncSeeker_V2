/**
 * useOnlineDataStore
 * 
 * 基于 Zustand 的全局状态管理，用于存储和分发 FSD 实时连飞数据。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { create } from 'zustand'
import pubsub from 'pubsub-js'
import { EVENTS } from '../configs/constants'
import type { OnlineData, OnlinePilot, OnlineController } from '../types/fsd';

interface OnlineDataStore {
  onlineData: OnlineData | null
  getOnlineData: () => OnlineData | null
  getPilotById: (id: string) => OnlinePilot | undefined
  getControllerById: (id: string) => OnlineController | undefined,
  getAtisList: () => OnlineController[],
  setOnlineData: (data: OnlineData) => void,
  getFlights: () => OnlinePilot[],
  getControllers: () => OnlineController[],
  getAtis: () => OnlineController[],
  getControllersWithAtis: () => OnlineController[],
  
}

/**
 * 全局在线数据 Store
 * 提供数据的获取（Getters）和更新（Setter）方法
 * 更新数据时会触发 EVENTS.ONLINE_DATA_UPDATE 事件
 */
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
  getFlights: () => {
    return get().onlineData?.flights || []
  },
  getControllers: () => {
    return get().onlineData?.controllers || []
  },
  getAtis: () => {
    return get().onlineData?.atis || []
  },
  getControllersWithAtis: () => {
    return [...(get().onlineData?.controllers || []), ...(get().onlineData?.atis || [])]
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
      pubsub.publish(EVENTS.ONLINE_DATA_UPDATE, data)
    }
  }
}))