import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import pubsub from 'pubsub-js'
import styles from '../PilotInfoPanel.module.scss'
import { EVENTS } from '../../../configs/constants'
import { useOnlineDataStore } from '../../../stores/useOnlineDataStore'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../../utils/getPilotStatusOf'
import { calculateDistance } from '../../../utils/geoUtils'
import type { OnlinePilot } from '../../../types/fsd'
import syncSeekerDB from '../../../services/localDB/indexedDB'
import type { IndexedDBAirlines, IndexedDBAirports } from '../../../types/types'
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
    const [progress, setProgress] = useState(50)
    const [expanded, setExpanded] = useState(false)
    const detailsRef = useRef<HTMLDivElement>(null)
    
    const [trackData, setTrackData] = useState<{ altitudeArray: number[], speedArray: number[] }>({
        altitudeArray: [],
        speedArray: []
    })
    
    const [dragging, setDragging] = useState(false)
    const [translateY, setTranslateY] = useState(0)
    const [startY, setStartY] = useState(0)

    useEffect(() => {
        const token = pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, data: { id: string, callsign: string }) => {
            setId(data.id)
            setOpen(true)
            setExpanded(false)
            setTranslateY(0)
            setShow3D(false)
            setTrackData({ altitudeArray: [], speedArray: [] })
            pubsub.publish(EVENTS.TOGGLE_3D_TRACK, false)
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
        pubsub.publish(EVENTS.PILOT_INFO_CLOSE)
    }, [])

    const handleCopyRoute = useCallback(() => {
        const routeText = fp?.route
        if (!routeText || !navigator?.clipboard?.writeText) return
        setCopyingRoute(true)
        navigator.clipboard.writeText(routeText)
        setTimeout(() => setCopyingRoute(false), 1400)
    }, [fp?.route])

    const handleExpand = useCallback(() => {
        if (!expanded) setExpanded(true)
    }, [expanded])

    return (
        <div 
            className={styles.container} 
            data-open={open ? 'true' : 'false'}
            data-expanded={expanded ? 'true' : 'false'}
            data-dragging={dragging ? 'true' : 'false'}
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
