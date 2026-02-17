import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import pubsub from 'pubsub-js'
import styles from '../PilotInfoPanel.module.scss'
import { EVENTS } from '../../../configs/constants'
import { useOnlineDataStore } from '../../../stores/useOnlineDataStore'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../../utils/getPilotStatusOf'
import { calculateDistance } from '../../../utils/geoUtils'
import { generateShareUrl, copyToClipboard } from '../../../utils/flightSharing'
import { showToast } from '../../common/Toast'
import type { OnlinePilot } from '../../../types/fsd'
import syncSeekerDB from '../../../services/localDB/indexedDB'
import type { IndexedDBAirlines, IndexedDBAirports } from '../../../types/types'
import {
    buildLiveActivityPayload,
    canUseIOSLiveActivity,
    shouldEnableLiquidGlass,
    startIOSLiveActivity,
    stopIOSLiveActivity,
    updateIOSLiveActivity
} from '../../../services/native/iosNative'
import PilotHeader from './PilotHeader'
import RouteCard from './RouteCard'
import RealtimeStats from './RealtimeStats'
import FlightPlanCard from './FlightPlanCard'
import ConnectionInfo from './ConnectionInfo'

export default function PilotInfoPanel() {
    const [open, setOpen] = useState(false)
    const [id, setId] = useState<string | null>(null)
    const onlineData = useOnlineDataStore(s => s.onlineData)

    const [airline, setAirline] = useState<IndexedDBAirlines | null>(null)
    const [depAirport, setDepAirport] = useState<IndexedDBAirports | null>(null)
    const [arrAirport, setArrAirport] = useState<IndexedDBAirports | null>(null)
    const [show3D, setShow3D] = useState(false)
    const [copyingRoute, setCopyingRoute] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const [isTracking, setIsTracking] = useState(false)
    const [progress, setProgress] = useState(50)
    const [expanded, setExpanded] = useState(false)
    const detailsRef = useRef<HTMLDivElement>(null)
    const activeLiveActivityCallsignRef = useRef<string | null>(null)
    
    const [trackData, setTrackData] = useState<{ altitudeArray: number[], speedArray: number[] }>({
        altitudeArray: [],
        speedArray: []
    })
    
    const [dragging, setDragging] = useState(false)
    const [translateY, setTranslateY] = useState(0)
    const [startY, setStartY] = useState(0)
    const isNativeTrackingSupported = canUseIOSLiveActivity()
    const useLiquidGlass = shouldEnableLiquidGlass()

    useEffect(() => {
        const token = pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, data: { id: string, callsign: string, autoTrack?: boolean }) => {
            setId(data.id)
            setOpen(true)
            setExpanded(false)
            setIsSharing(false)
            setTranslateY(0)
            setShow3D(false)
            setTrackData({ altitudeArray: [], speedArray: [] })
            pubsub.publish(EVENTS.TOGGLE_3D_TRACK, false)
            // 如果是通过分享链接进入，自动开启追踪
            if (data.autoTrack) {
                setIsTracking(true)
                pubsub.publish(EVENTS.TOGGLE_FLIGHT_TRACKING, { callsign: data.callsign, enabled: true })
                pubsub.publish(EVENTS.TRACKED_FLIGHT_CHANGE, { callsign: data.callsign, enabled: true })
            } else {
                pubsub.publish(EVENTS.TRACKED_FLIGHT_CHANGE, { callsign: null, enabled: false })
                setIsTracking(false)
            }
        })
        return () => { pubsub.unsubscribe(token) }
    }, [])

    // Touch handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (expanded && detailsRef.current?.contains(e.target as Node)) return
        setDragging(true)
        setStartY(e.touches[0].clientY)
    }, [expanded])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!dragging) return
        setTranslateY(e.touches[0].clientY - startY)
    }, [dragging, startY])

    const handleTouchEnd = useCallback(() => {
        setDragging(false)
        const threshold = 60
        
        if (!expanded && translateY < -threshold) {
            setExpanded(true)
        } else if (expanded && translateY > threshold) {
            setExpanded(false)
        } else if (!expanded && translateY > threshold) {
            setOpen(false)
            setId(null)
            pubsub.publish(EVENTS.PILOT_INFO_CLOSE)
        }
        setTranslateY(0)
    }, [expanded, translateY])

    const handleToggle3D = useCallback(() => {
        setShow3D(prev => {
            pubsub.publish(EVENTS.TOGGLE_3D_TRACK, !prev)
            return !prev
        })
    }, [])

    const pilot: OnlinePilot | null = useMemo(() => {
        if (!id) return null
        return useOnlineDataStore.getState().getPilotById(id) || null
    }, [id, onlineData])

    useEffect(() => {
        const token = pubsub.subscribe(EVENTS.PILOT_TRACK_DATA_UPDATE, (_, data: { callsign: string, altitudeArray: number[], speedArray: number[] }) => {
            if (pilot && data.callsign === pilot.callsign) {
                setTrackData({
                    altitudeArray: data.altitudeArray || [],
                    speedArray: data.speedArray || []
                })
            }
        })
        return () => { pubsub.unsubscribe(token) }
    }, [pilot?.callsign])

    useEffect(() => {
        if (!pilot) {
            setAirline(null)
            setDepAirport(null)
            setArrAirport(null)
            return
        }

        const fetchData = async () => {
            try {
                await syncSeekerDB.init().catch(() => {})

                // Airline lookup
                const airlineCode = pilot.callsign.match(/^[A-Z]{3}/)?.[0]
                if (airlineCode) {
                    syncSeekerDB.getAirlineByIcao(airlineCode).then(setAirline).catch(() => setAirline(null))
                } else {
                    setAirline(null)
                }

                // Airport lookup
                if (pilot.flight_plan) {
                    const { departure, arrival } = pilot.flight_plan
                    if (departure) syncSeekerDB.getAirportByIcao(departure).then(setDepAirport).catch(() => setDepAirport(null))
                    else setDepAirport(null)
                    if (arrival) syncSeekerDB.getAirportByIcao(arrival).then(setArrAirport).catch(() => setArrAirport(null))
                    else setArrAirport(null)
                } else {
                    setDepAirport(null)
                    setArrAirport(null)
                }
            } catch (e) {
                console.error(e)
            }
        }
        fetchData()
    }, [pilot?.callsign, pilot?.flight_plan?.departure, pilot?.flight_plan?.arrival])

    useEffect(() => {
        if (pilot && depAirport && arrAirport) {
            const [depLon, depLat] = depAirport.coordinates
            const [arrLon, arrLat] = arrAirport.coordinates
            
            const totalDist = calculateDistance(depLat, depLon, arrLat, arrLon)
            const remainingDist = calculateDistance(pilot.latitude, pilot.longitude, arrLat, arrLon)
            
            if (totalDist > 1000) {
                const p = Math.max(0, Math.min(100, ((totalDist - remainingDist) / totalDist) * 100))
                setProgress(p)
            } else {
                setProgress(50)
            }
        } else {
            setProgress(50)
        }
    }, [pilot, depAirport, arrAirport])

    const status = pilot ? getPilotStatusOf(pilot) : ''
    const statusTag = pilot ? getPilotStatusOfTag(pilot) : 'ground'
    const fp = pilot?.flight_plan
    const dep = fp?.departure || 'N/A'
    const arr = fp?.arrival || 'N/A'
    const aircraft = fp?.aircraft || 'N/A'

    const handleClose = useCallback(() => {
        setOpen(false)
        setId(null)
        // 关闭面板时停止追踪
        if (isTracking) {
            if (pilot?.callsign) {
                stopIOSLiveActivity(pilot.callsign)
            }
            activeLiveActivityCallsignRef.current = null
            setIsTracking(false)
            pubsub.publish(EVENTS.STOP_FLIGHT_TRACKING)
            pubsub.publish(EVENTS.TRACKED_FLIGHT_CHANGE, { callsign: null, enabled: false })
        }
        pubsub.publish(EVENTS.PILOT_INFO_CLOSE)
    }, [isTracking, pilot?.callsign])

    const handleCopyRoute = useCallback(() => {
        const routeText = fp?.route
        if (!routeText || !navigator?.clipboard?.writeText) return
        setCopyingRoute(true)
        navigator.clipboard.writeText(routeText)
        setTimeout(() => setCopyingRoute(false), 1400)
    }, [fp?.route])

    const handleShare = useCallback(async () => {
        if (!pilot?.callsign) return
        const shareUrl = generateShareUrl(pilot.callsign)
        const success = await copyToClipboard(shareUrl)
        if (success) {
            setIsSharing(true)
            showToast(`分享链接已复制到剪贴板`, 'success', 'Share')
            setTimeout(() => setIsSharing(false), 2000)
        }
    }, [pilot?.callsign])

    const handleToggleTracking = useCallback(async () => {
        if (!pilot?.callsign) return

        const newTracking = !isTracking
        setIsTracking(newTracking)
        pubsub.publish(EVENTS.TOGGLE_FLIGHT_TRACKING, { 
            callsign: pilot.callsign, 
            enabled: newTracking 
        })
        pubsub.publish(EVENTS.TRACKED_FLIGHT_CHANGE, {
            callsign: newTracking ? pilot.callsign : null,
            enabled: newTracking
        })

        if (newTracking) {
            if (!isNativeTrackingSupported) {
                showToast('已开启追踪', 'info', 'Tips')
            }

            if (isNativeTrackingSupported) {
                const payload = buildLiveActivityPayload(pilot, progress, status)
                const started = await startIOSLiveActivity(payload)
                if (!started) {
                    console.error('[PilotInfoPanel] startIOSLiveActivity failed', payload)
                } else {
                    activeLiveActivityCallsignRef.current = pilot.callsign
                }
            }

            showToast(`正在追踪 ${pilot.callsign}`, 'info', 'LocalTwo')
        } else {
            if (isNativeTrackingSupported) {
                stopIOSLiveActivity(pilot.callsign)
            }
            activeLiveActivityCallsignRef.current = null
            showToast(`已取消追踪`, 'info', 'Local')
        }
    }, [pilot, isTracking, isNativeTrackingSupported, progress, status])

    useEffect(() => {
        if (!pilot || !isTracking || !isNativeTrackingSupported) return
        const payload = buildLiveActivityPayload(pilot, progress, status)
        if (activeLiveActivityCallsignRef.current !== pilot.callsign) {
            startIOSLiveActivity(payload)
            activeLiveActivityCallsignRef.current = pilot.callsign
            return
        }
        updateIOSLiveActivity(payload)
    }, [pilot, progress, status, isTracking, isNativeTrackingSupported])

    const handleExpand = useCallback(() => {
        if (!expanded) setExpanded(true)
    }, [expanded])

    return (
        <div 
            className={styles.container} 
            data-open={open ? 'true' : 'false'}
            data-expanded={expanded ? 'true' : 'false'}
            data-dragging={dragging ? 'true' : 'false'}
            data-liquid-glass={useLiquidGlass ? 'true' : 'false'}
            style={{ '--drag-offset': `${translateY}px` } as React.CSSProperties}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className={styles.handleBar} onClick={() => setExpanded(!expanded)} />
            
            <div onClick={handleExpand}>
                <PilotHeader
                    pilot={pilot}
                    airline={airline}
                    status={status}
                    statusTag={statusTag}
                    aircraft={aircraft}
                    onClose={handleClose}
                    onShare={handleShare}
                    isSharing={isSharing}
                    onToggleTracking={handleToggleTracking}
                    isTracking={isTracking}
                    isNativeTrackingSupported={isNativeTrackingSupported}
                />
            </div>

            <div className={styles.body}>
                <RouteCard
                    dep={dep}
                    arr={arr}
                    depAirport={depAirport}
                    arrAirport={arrAirport}
                    progress={progress}
                    onExpand={handleExpand}
                />

                <div className={styles.detailsContent} ref={detailsRef}>
                    <RealtimeStats
                        pilot={pilot}
                        show3D={show3D}
                        onToggle3D={handleToggle3D}
                        trackData={trackData}
                    />

                    <FlightPlanCard
                        flightPlan={fp}
                        onCopyRoute={handleCopyRoute}
                        copyingRoute={copyingRoute}
                    />

                    <ConnectionInfo pilot={pilot} />
                </div>
            </div>
        </div>
    )
}
