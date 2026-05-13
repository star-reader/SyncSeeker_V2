import { useEffect, useState, useRef } from 'react'
import pubsub from 'pubsub-js'
import { isTauri as _isTauri } from '@tauri-apps/api/core'
import BasicMap from './components/map/BasicMap'
import TopNavBar from './components/navBar/TopNavBar'
// import PilotList from './components/statistics/PilotList'
import ControllerList from './components/statistics/ControllerList'
import pollingData from './apis/pollingData'
import PilotList from './components/statistics/PilotList'
import SettingsPanel from './components/settings/SettingsPanel'
import PilotInfoPanel from './components/map/PilotInfoPanel'
import ControllerInfoPanel from './components/map/ControllerInfoPanel'
import AirportInfoPanel from './components/map/AirportInfoPanel'
import AirportBoard from './components/airport/AirportBoard'
import AboutPanel from './components/about/AboutPanel'
import Toast from './components/common/Toast'
import OnboardingGuide from './components/onboarding/OnboardingGuide'
import NavDataUpdateGuide from './components/onboarding/NavDataUpdateGuide'
import InstallGuidePanel from './components/install/InstallGuidePanel'
import { EVENTS } from './configs/constants'
import { useOnlineDataStore } from './stores/useOnlineDataStore'
import { getTrackParamFromUrl, clearTrackParam } from './utils/flightSharing'
import { initializeFonts } from './utils/fontLoader'
import { useReleaseInfoStore } from './stores/useReleaseInfoStore'
import getPilotStatusOf from './utils/getPilotStatusOf'
import { buildWidgetFlightItem, syncIOSWidgetSnapshot } from './services/native/iosNative'
import { isIOSDevice } from './services/native/iosNative'
import { installDebugLogCapture } from './services/debug/debugLogStore'
import { API_BASE_URL } from './configs/apiConfig'
import { checkNavDataUpdate } from './apis/fetchStorageData'

const WIDGET_SYNC_FLIGHT_LIMIT = 12

export default function App() {
    const [openedMenu, setOpenedMenu] = useState('')
    const [trackedCallsign, setTrackedCallsign] = useState<string | null>(null)
    const trackAttempted = useRef(false)
    const trackCancelled = useRef(false)
    const lastWidgetPayloadRef = useRef('')

    useEffect(() => {
        installDebugLogCapture()

        const root = document.getElementById('root')
        if (root) {
            const runtime = _isTauri() && isIOSDevice() ? 'tauri-ios' : 'web'
            root.setAttribute('data-runtime', runtime)
        }

        // 初始化字体加载
        initializeFonts()
        
        // 初始化发布信息
        useReleaseInfoStore.getState().initialize()

        // 应用启动时检查导航数据版本（读取 version.json），有更新时先弹确认引导
        const checkNavDataUpdatesOnStartup = async () => {
            try {
                const hasCompletedOnboarding = localStorage.getItem('onboarding-completed') === 'true'
                if (!hasCompletedOnboarding) {
                    return
                }
                const { hasUpdate } = await checkNavDataUpdate()
                if (hasUpdate) {
                    pubsub.publish(EVENTS.NAVDATA_STARTUP_UPDATED)
                }
            } catch (error) {
                console.error('Failed to check nav data updates on startup:', error)
            }
        }
        checkNavDataUpdatesOnStartup()
        
        const stop = pollingData()
        
        // 检查PWA安装状态，首次访问时提示安装
        const checkPWAInstallation = () => {
            // 检查是否是Tauri应用
            const isTauri = _isTauri()
            
            // 检查是否已安装为PWA
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            const isIOSStandalone = (window.navigator as any).standalone === true
            const isPWAInstalled = isStandalone || isIOSStandalone
            
            const hasSeenInstallGuide = localStorage.getItem('pwa-install-guide-seen')
            
            // 只在浏览器环境（非Tauri且未安装PWA）且首次访问时显示安装提示
            if (!isTauri && !isPWAInstalled && !hasSeenInstallGuide) {
                setTimeout(() => {
                    pubsub.publish(EVENTS.INSTALL_APP_CLICK)
                    localStorage.setItem('pwa-install-guide-seen', 'true')
                }, 3000)
            }
        }
        
        checkPWAInstallation()
        
        return stop
    }, [])

    // 检测 URL 中的追踪参数并自动追踪航班
    useEffect(() => {
        const trackCallsign = getTrackParamFromUrl()
        if (!trackCallsign || trackAttempted.current) return

        const handleDataUpdate = () => {
            // 如果用户已经取消了追踪，不再尝试
            if (trackCancelled.current) return
            
            const flights = useOnlineDataStore.getState().getFlights()
            const targetPilot = flights.find(
                p => p.callsign.toUpperCase() === trackCallsign.toUpperCase()
            )
            
            if (targetPilot) {
                trackAttempted.current = true
                clearTrackParam()
                pubsub.publish(EVENTS.PILOT_ICON_CLICK, { 
                    id: targetPilot.session_id, 
                    callsign: targetPilot.callsign,
                    autoTrack: true
                })
            }
        }

        const closeToken = pubsub.subscribe(EVENTS.PILOT_INFO_CLOSE, () => {
            trackCancelled.current = true
            clearTrackParam()
        })

        handleDataUpdate()

        const token = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, handleDataUpdate)
        
        // 设置超时，防止无限等待
        const timeout = setTimeout(() => {
            if (!trackAttempted.current) {
                trackAttempted.current = true
                clearTrackParam()
                console.warn(`Flight ${trackCallsign} not found online`)
            }
        }, 30000)

        return () => {
            pubsub.unsubscribe(token)
            pubsub.unsubscribe(closeToken)
            clearTimeout(timeout)
        }
    }, [])

    useEffect(() => {
        const token = pubsub.subscribe(EVENTS.TRACKED_FLIGHT_CHANGE, (_, data: { callsign: string | null, enabled: boolean }) => {
            setTrackedCallsign(data?.enabled ? (data.callsign || null) : null)
        })
        return () => {
            pubsub.unsubscribe(token)
        }
    }, [])

    useEffect(() => {
        let disposed = false
        let timer: ReturnType<typeof setTimeout> | null = null
        let syncing = false
        let pending = false

        const syncWidget = async () => {
            if (disposed || syncing) {
                pending = true
                return
            }

            syncing = true
            const flights = useOnlineDataStore.getState().getFlights()

            const trackedFlight = trackedCallsign
                ? flights.find(f => f.callsign.toUpperCase() === trackedCallsign.toUpperCase())
                : null

            const topFlights = flights.slice(0, WIDGET_SYNC_FLIGHT_LIMIT).map(p => buildWidgetFlightItem(p, getPilotStatusOf(p)))

            const payload = {
                totalFlights: flights.length,
                trackedFlight: trackedFlight ? buildWidgetFlightItem(trackedFlight, getPilotStatusOf(trackedFlight)) : null,
                topFlights,
                updatedAt: new Date().toISOString(),
                apiBaseUrl: API_BASE_URL || undefined,
                trackedCallsign: trackedCallsign || null
            }

            const payloadKey = JSON.stringify(payload)
            if (payloadKey === lastWidgetPayloadRef.current) {
                syncing = false
                return
            }

            try {
                await syncIOSWidgetSnapshot(payload)
                lastWidgetPayloadRef.current = payloadKey
            } finally {
                syncing = false
                if (pending && !disposed) {
                    pending = false
                    scheduleSync(1200)
                }
            }
        }

        const scheduleSync = (delay = 500) => {
            if (disposed) return
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                timer = null
                syncWidget()
            }, delay)
        }

        const tokenOnline = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
            scheduleSync(500)
        })
        const tokenTracked = pubsub.subscribe(EVENTS.TRACKED_FLIGHT_CHANGE, () => {
            scheduleSync(200)
        })

        scheduleSync(0)

        return () => {
            disposed = true
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            pubsub.unsubscribe(tokenOnline)
            pubsub.unsubscribe(tokenTracked)
        }
    }, [trackedCallsign])

    useEffect(() => {
        const token1 = pubsub.subscribe(EVENTS.MENU_SELECT, (_, data) => {
            setOpenedMenu(data)
        })
        const token2 = pubsub.subscribe(EVENTS.RETURN_TO_MAP, () => {
            setOpenedMenu('')
        })
        return () => {
            pubsub.unsubscribe(token1)
            pubsub.unsubscribe(token2)
        }
    }, [])

    return (
        <>
            <OnboardingGuide />
            <NavDataUpdateGuide />
            <TopNavBar />
            <BasicMap />
            <>
                {openedMenu === 'pilot' && <PilotList />}
                {openedMenu === 'controller' && <ControllerList />}
                {openedMenu === 'settings' && <SettingsPanel />}
                {openedMenu === 'board' && <AirportBoard />}
                <PilotInfoPanel />
                <ControllerInfoPanel />
                <AirportInfoPanel />
            </>
            <AboutPanel />
            <InstallGuidePanel />
            <Toast />
        </>
    )
}
