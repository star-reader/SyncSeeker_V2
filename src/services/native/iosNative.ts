import { invoke, isTauri } from '@tauri-apps/api/core'
import type { OnlinePilot } from '../../types/fsd'
import { pushDebugLog } from '../debug/debugLogStore'

export interface LiveActivityFlightPayload {
  callsign: string
  departure: string
  arrival: string
  aircraft: string
  altitude: number
  groundspeed: number
  heading: number
  progress: number
  status: string
  updatedAt: string
}

export interface WidgetFlightItem {
  callsign: string
  departure: string
  arrival: string
  aircraft?: string
  altitude: number
  groundspeed: number
  status: string
}

export interface WidgetSnapshotPayload {
  totalFlights: number
  trackedFlight?: WidgetFlightItem | null
  topFlights: WidgetFlightItem[]
  updatedAt: string
  apiBaseUrl?: string
  trackedCallsign?: string | null
}

const IOS_NATIVE_COMMANDS = {
  start: 'ios_start_live_activity',
  update: 'ios_update_live_activity',
  stop: 'ios_stop_live_activity',
  widget: 'ios_sync_widget_snapshot'
} as const

const IOS_ACTIVITY_MIN_VERSION = 16
const IOS_LIQUID_GLASS_MIN_VERSION = 26

export const getIOSVersion = (): number | null => {
  const ua = navigator.userAgent || ''
  const match = ua.match(/OS (\d+)_/i)
  if (!match) return null
  const major = Number.parseInt(match[1], 10)
  return Number.isFinite(major) ? major : null
}

export const isIOSDevice = (): boolean => {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (isTauri() && /iOS|iPhone OS|CPU OS/i.test(ua)) return true
  return false
}

export const canUseIOSLiveActivity = (): boolean => {
  if (isTauri()) return true
  if (!isIOSDevice()) return false
  const version = getIOSVersion()
  if (!version) return false
  return version >= IOS_ACTIVITY_MIN_VERSION
}

export const shouldEnableLiquidGlass = (): boolean => {
  if (!isIOSDevice()) return false
  const version = getIOSVersion()
  if (!version) return false
  return version >= IOS_LIQUID_GLASS_MIN_VERSION
}

const canInvokeIOSNative = (): boolean => {
  return isTauri()
}

const debugLogIOSNative = (level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: unknown) => {
  pushDebugLog({
    level,
    source: 'ios.native',
    message,
    details: details ? JSON.stringify(details) : undefined
  })
}

const safeInvoke = async (command: string, payload: unknown): Promise<boolean> => {
  if (!canInvokeIOSNative()) {
    console.info(`[iosNative] skip ${command}: non-tauri runtime`)
    debugLogIOSNative('warn', `skip ${command}: non-tauri runtime`, {
      command,
      isTauri: isTauri(),
      userAgent: navigator.userAgent
    })
    return false
  }

  const jsonPayload = JSON.stringify(payload)
  debugLogIOSNative('info', `invoke ${command} start`, { command, payload })

  try {
    await invoke(command, { payload: jsonPayload })
    console.info(`[iosNative] ${command} success`, payload)
    debugLogIOSNative('info', `invoke ${command} success`, { command, payload })
    return true
  } catch (error) {
    console.error(`[iosNative] ${command} failed`, { payload: jsonPayload, error })
    debugLogIOSNative('error', `invoke ${command} failed`, { command, payload: jsonPayload, error })
    return false
  }
}

export const buildLiveActivityPayload = (
  pilot: OnlinePilot,
  progress: number,
  status: string
): LiveActivityFlightPayload => {
  const fp = pilot.flight_plan
  return {
    callsign: pilot.callsign,
    departure: fp?.departure || '----',
    arrival: fp?.arrival || '----',
    aircraft: fp?.aircraft || 'N/A',
    altitude: Math.round(pilot.altitude),
    groundspeed: Math.round(pilot.groundspeed),
    heading: Math.round(pilot.heading),
    progress: Math.round(progress),
    status,
    updatedAt: new Date().toISOString()
  }
}

export const buildWidgetFlightItem = (pilot: OnlinePilot, status: string): WidgetFlightItem => ({
  callsign: pilot.callsign,
  departure: pilot.flight_plan?.departure || '----',
  arrival: pilot.flight_plan?.arrival || '----',
  aircraft: pilot.flight_plan?.aircraft || 'N/A',
  altitude: Math.round(pilot.altitude),
  groundspeed: Math.round(pilot.groundspeed),
  status
})

export const startIOSLiveActivity = async (payload: LiveActivityFlightPayload): Promise<boolean> => {
  if (!canUseIOSLiveActivity()) return false
  return safeInvoke(IOS_NATIVE_COMMANDS.start, payload)
}

export const updateIOSLiveActivity = async (payload: LiveActivityFlightPayload): Promise<boolean> => {
  if (!canUseIOSLiveActivity()) return false
  return safeInvoke(IOS_NATIVE_COMMANDS.update, payload)
}

export const stopIOSLiveActivity = async (callsign: string): Promise<boolean> => {
  if (!canUseIOSLiveActivity()) return false
  return safeInvoke(IOS_NATIVE_COMMANDS.stop, { callsign, updatedAt: new Date().toISOString() })
}

export const syncIOSWidgetSnapshot = async (payload: WidgetSnapshotPayload): Promise<boolean> => {
  return safeInvoke(IOS_NATIVE_COMMANDS.widget, payload)
}
