/**
 * Airport Traffic Service
 * 
 * 提取机场相关的航班和管制员信息。
 * 
 * @author Jerry Jin
 * @date 2025-12-04
 */
import type { OnlineData, OnlinePilot, OnlineController } from '../../types/fsd'

export interface AirportTraffic {
  departures: OnlinePilot[]
  arrivals: OnlinePilot[]
  controllers: OnlineController[]
  atis: OnlineController[]
}

/**
 * 获取指定机场的所有出港航班
 */
export function getDepartures(icao: string, onlineData: OnlineData | null): OnlinePilot[] {
  if (!icao || !onlineData?.flights) return []
  return onlineData.flights.filter(p => p.flight_plan?.departure === icao)
}

/**
 * 获取指定机场的所有进港航班
 */
export function getArrivals(icao: string, onlineData: OnlineData | null): OnlinePilot[] {
  if (!icao || !onlineData?.flights) return []
  return onlineData.flights.filter(p => p.flight_plan?.arrival === icao)
}

/**
 * 获取指定机场的所有管制员（不含ATIS）
 */
export function getControllers(icao: string, onlineData: OnlineData | null): OnlineController[] {
  if (!icao || !onlineData?.controllers) return []
  return onlineData.controllers.filter(c => c.callsign.startsWith(icao))
}

/**
 * 获取指定机场的ATIS
 */
export function getAtis(icao: string, onlineData: OnlineData | null): OnlineController[] {
  if (!icao || !onlineData?.atis) return []
  return onlineData.atis.filter(a => a.callsign.startsWith(icao))
}

/**
 * 获取指定机场的完整流量信息
 */
export function getAirportTraffic(icao: string, onlineData: OnlineData | null): AirportTraffic {
  return {
    departures: getDepartures(icao, onlineData),
    arrivals: getArrivals(icao, onlineData),
    controllers: getControllers(icao, onlineData),
    atis: getAtis(icao, onlineData)
  }
}
