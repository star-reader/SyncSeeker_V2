/**
 * AirportInfoPanel Component
 * 
 * 机场流量信息面板。
 * 点击地图上的机场图标时弹出，显示该机场的进港、出港航班及管制信息。
 * 
 * @author Jerry Jin
 * @date 2025-12-04
 */
import { useEffect, useMemo, useState, useRef } from 'react'
import pubsub from 'pubsub-js'
import styles from './AirportInfoPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import IconByName from '../common/IconByName'
import syncSeekerDB from '../../services/localDB/indexedDB'
import { getDepartures, getArrivals, getControllers, getAtis } from '../../services/airport/getAirportTraffic'
import type { OnlinePilot, OnlineController } from '../../types/fsd'

type TabType = 'departures' | 'arrivals' | 'atc'
type SnapPosition = 'closed' | 'half' | 'full'

export default function AirportInfoPanel() {
  const [open, setOpen] = useState(false)
  const [icao, setIcao] = useState<string | null>(null)
  const [airportName, setAirportName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('departures')
  const onlineData = useOnlineDataStore(s => s.onlineData)
  
  const [snapPosition, setSnapPosition] = useState<SnapPosition>('half')
  const [dragging, setDragging] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const [startY, setStartY] = useState(0)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.AIRPORT_CLICK, (_, data: { icao: string }) => {
      setIcao(data.icao)
      setOpen(true)
      setSnapPosition('half')
      setActiveTab('departures')
      setTranslateY(0)
    })
    return () => { pubsub.unsubscribe(token) }
  }, [])

  useEffect(() => {
    if (!icao) {
      setAirportName('')
      return
    }
    syncSeekerDB.init().then(() => {
      syncSeekerDB.getAirportByIcao(icao).then(airport => {
        setAirportName(airport?.name || '')
      }).catch(() => setAirportName(''))
    }).catch(() => {})
  }, [icao])

  const departures: OnlinePilot[] = useMemo(() => {
    return getDepartures(icao || '', onlineData)
  }, [icao, onlineData])

  const arrivals: OnlinePilot[] = useMemo(() => {
    return getArrivals(icao || '', onlineData)
  }, [icao, onlineData])

  const controllers: OnlineController[] = useMemo(() => {
    return getControllers(icao || '', onlineData)
  }, [icao, onlineData])

  const atis: OnlineController[] = useMemo(() => {
    return getAtis(icao || '', onlineData)
  }, [icao, onlineData])

  const handleClose = () => {
    setOpen(false)
    setIcao(null)
    pubsub.publish(EVENTS.AIRPORT_INFO_CLOSE)
  }

  const handlePilotClick = (pilot: OnlinePilot) => {
    pubsub.publish(EVENTS.PILOT_ICON_CLICK, { id: pilot.session_id, callsign: pilot.callsign })
    handleClose()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (snapPosition === 'full' && detailsRef.current && detailsRef.current.contains(e.target as Node)) {
      const el = detailsRef.current
      if (el.scrollTop > 0) {
        return
      }
    }
    setDragging(true)
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const deltaY = e.touches[0].clientY - startY
    setTranslateY(deltaY)
  }

  const handleTouchEnd = () => {
    setDragging(false)
    const threshold = 50

    if (translateY < -threshold) {
      if (snapPosition === 'half') {
        setSnapPosition('full')
      }
    } else if (translateY > threshold) {
      if (snapPosition === 'full') {
        setSnapPosition('half')
      } else if (snapPosition === 'half') {
        handleClose()
      }
    }

    setTranslateY(0)
  }

  const handleBarClick = () => {
    if (snapPosition === 'half') {
      setSnapPosition('full')
    } else {
      setSnapPosition('half')
    }
  }

  const renderPilotItem = (pilot: OnlinePilot) => (
    <div key={pilot.session_id} className={styles.flightItem} onClick={() => handlePilotClick(pilot)}>
      <div className={styles.flightCallsign}>{pilot.callsign}</div>
      <div className={styles.flightMeta}>
        <span>{pilot.flight_plan?.aircraft || 'N/A'}</span>
        <span>{pilot.flight_plan?.departure || '-'} → {pilot.flight_plan?.arrival || '-'}</span>
      </div>
      <div className={styles.flightStats}>
        <span><IconByName name="Speed" size={12} /> {Math.round(pilot.groundspeed)} kt</span>
        <span><IconByName name="SortAmountDown" size={12} /> {Math.round(pilot.altitude)} ft</span>
      </div>
    </div>
  )

  const renderControllerItem = (controller: OnlineController) => (
    <div key={controller.session_id} className={styles.atcItem}>
      <div className={styles.atcCallsign}>{controller.callsign}</div>
      <div className={styles.atcFreq}>{controller.frequency}</div>
      <div className={styles.atcName}>{controller.name}</div>
    </div>
  )

  const tabContent = () => {
    switch (activeTab) {
      case 'departures':
        return departures.length > 0 ? (
          <div className={styles.flightList}>{departures.map(renderPilotItem)}</div>
        ) : (
          <div className={styles.emptyState}><IconByName name="Sleep" size={24} /> 暂无出港航班</div>
        )
      case 'arrivals':
        return arrivals.length > 0 ? (
          <div className={styles.flightList}>{arrivals.map(renderPilotItem)}</div>
        ) : (
          <div className={styles.emptyState}><IconByName name="Sleep" size={24} /> 暂无进港航班</div>
        )
      case 'atc':
        const allAtc = [...controllers, ...atis]
        return allAtc.length > 0 ? (
          <div className={styles.atcList}>{allAtc.map(renderControllerItem)}</div>
        ) : (
          <div className={styles.emptyState}><IconByName name="Sleep" size={24} /> 暂无在线管制</div>
        )
    }
  }

  return (
    <div
      className={styles.container}
      data-open={open ? 'true' : 'false'}
      data-snap={snapPosition}
      data-dragging={dragging ? 'true' : 'false'}
      style={{ '--drag-offset': `${translateY}px` } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.handleBar} onClick={handleBarClick} />
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.icaoCode}>{icao || '-'}</div>
          {airportName && <div className={styles.airportName}>{airportName}</div>}
        </div>
        <div className={styles.headerActions}>
          <div className={styles.stats}>
            <span className={styles.statBadge}><IconByName name="SendOne" size={14} /> {departures.length}</span>
            <span className={styles.statBadge}><IconByName name="DownTwo" size={14} /> {arrivals.length}</span>
            <span className={styles.statBadge}><IconByName name="RadarThree" size={14} /> {controllers.length + atis.length}</span>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><IconByName name="Close" /></button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'departures' ? styles.active : ''}`}
          onClick={() => setActiveTab('departures')}
        >
          <IconByName name="SendOne" size={14} /> 出港 ({departures.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'arrivals' ? styles.active : ''}`}
          onClick={() => setActiveTab('arrivals')}
        >
          <IconByName name="DownTwo" size={14} /> 进港 ({arrivals.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'atc' ? styles.active : ''}`}
          onClick={() => setActiveTab('atc')}
        >
          <IconByName name="RadarThree" size={14} /> 管制 ({controllers.length + atis.length})
        </button>
      </div>

      <div className={styles.body} ref={detailsRef}>
        {tabContent()}
      </div>
    </div>
  )
}
