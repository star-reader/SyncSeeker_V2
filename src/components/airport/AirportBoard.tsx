/**
 * AirportBoard Component
 * 
 * 机场大屏组件，模拟机场航班信息显示屏。
 * 显示指定机场的离港/入港航班信息，支持切换机场。
 * 
 * @author Jerry Jin
 * @date 2025-12-04
 */
import { useEffect, useState, useMemo } from 'react'
import pubsub from 'pubsub-js'
import styles from './AirportBoard.module.scss'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import { getDepartures, getArrivals } from '../../services/airport/getAirportTraffic'
import syncSeekerDB from '../../services/localDB/indexedDB'
import IconByName from '../common/IconByName'
import type { OnlinePilot } from '../../types/fsd'

type TabType = 'departures' | 'arrivals'

const NAVDATA_URL = import.meta.env.VITE_PUBLIC_NAVDATA_URL

// 获取航司Logo URL
const getAirlineLogoUrl = (callsign: string): string | null => {
  const match = callsign.match(/^[A-Z]{3}/)
  if (!match) return null
  return `${NAVDATA_URL}/airlines/${match[0]}.png`
}

// 格式化时间显示
const formatTime = (logonTime: string): string => {
  try {
    const date = new Date(logonTime)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

// 获取航班状态
// 这是是单独简化版本的逻辑，没有上一轮session的数据，就是简单判断而已
const getFlightStatus = (pilot: OnlinePilot): { text: string; type: string } => {
  const alt = pilot.altitude
  const speed = pilot.groundspeed
  
  if (speed < 30 && alt < 100) {
    return { text: '地面', type: 'ground' }
  } else if (speed < 80 && alt < 500) {
    return { text: '滑行', type: 'taxi' }
  } else if (alt < 10000 && speed > 100) {
    return { text: '起降', type: 'approach' }
  } else {
    return { text: '巡航', type: 'enroute' }
  }
}

export default function AirportBoard() {
  const [selectedIcao, setSelectedIcao] = useState<string>('ZBAA')
  const [airportName, setAirportName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('departures')
  const [currentTime, setCurrentTime] = useState(new Date())
  const onlineData = useOnlineDataStore(s => s.onlineData)

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 获取机场名称
  useEffect(() => {
    if (!selectedIcao) {
      setAirportName('')
      return
    }
    syncSeekerDB.init().then(() => {
      syncSeekerDB.getAirportByIcao(selectedIcao).then(airport => {
        setAirportName(airport?.name || '')
      }).catch(() => setAirportName(''))
    }).catch(() => {})
  }, [selectedIcao])

  // 获取所有有航班活动的机场
  const activeAirports = useMemo(() => {
    if (!onlineData?.flights) return []
    const airports = new Map<string, number>()
    
    onlineData.flights.forEach(pilot => {
      if (pilot.flight_plan?.departure) {
        const dep = pilot.flight_plan.departure
        airports.set(dep, (airports.get(dep) || 0) + 1)
      }
      if (pilot.flight_plan?.arrival) {
        const arr = pilot.flight_plan.arrival
        airports.set(arr, (airports.get(arr) || 0) + 1)
      }
    })
    
    return Array.from(airports.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([icao, count]) => ({ icao, count }))
  }, [onlineData])

  const departures = useMemo(() => {
    return getDepartures(selectedIcao, onlineData)
  }, [selectedIcao, onlineData])

  const arrivals = useMemo(() => {
    return getArrivals(selectedIcao, onlineData)
  }, [selectedIcao, onlineData])

  const filteredFlights = useMemo(() => {
    const flights = activeTab === 'departures' ? departures : arrivals
    return flights
  }, [activeTab, departures, arrivals])

  const handleClose = () => {
    pubsub.publish(EVENTS.RETURN_TO_MAP)
  }

  const handleAirportChange = (icao: string) => {
    setSelectedIcao(icao)
  }

  const handleFlightClick = (pilot: OnlinePilot) => {
    pubsub.publish(EVENTS.PILOT_ICON_CLICK, { id: pilot.session_id, callsign: pilot.callsign })
    pubsub.publish(EVENTS.RETURN_TO_MAP)
  }

  const renderFlightRow = (pilot: OnlinePilot, index: number) => {
    const status = getFlightStatus(pilot)
    const logoUrl = getAirlineLogoUrl(pilot.callsign)
    const destination = activeTab === 'departures' ? pilot.flight_plan?.arrival : pilot.flight_plan?.departure
    
    return (
      <div 
        key={pilot.session_id} 
        className={styles.flightRow}
        style={{ animationDelay: `${index * 0.03}s` }}
        onClick={() => handleFlightClick(pilot)}
      >
        <div className={styles.logoCell}>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="" 
              className={styles.airlineLogo}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              <IconByName name="Airplane" size={20} />
            </div>
          )}
        </div>
        <div className={styles.callsignCell}>{pilot.callsign}</div>
        <div className={styles.destinationCell}>{destination || '----'}</div>
        <div className={styles.aircraftCell}>{pilot.flight_plan?.aircraft || '----'}</div>
        <div className={styles.timeCell}>{formatTime(pilot.logon_time)}</div>
        <div className={styles.altitudeCell}>{Math.round(pilot.altitude).toLocaleString()}</div>
        <div className={styles.speedCell}>{Math.round(pilot.groundspeed)}</div>
        <div className={`${styles.statusCell} ${styles[`status--${status.type}`]}`}>
          {status.text}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 左侧机场选择器 */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <IconByName name="Local" size={18} />
          <span>选择机场</span>
        </div>
        <div className={styles.airportList}>
          {activeAirports.map(({ icao, count }) => (
            <button
              key={icao}
              className={`${styles.airportItem} ${selectedIcao === icao ? styles.active : ''}`}
              onClick={() => handleAirportChange(icao)}
            >
              <span className={styles.airportIcao}>{icao}</span>
              <span className={styles.airportCount}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className={styles.main}>
        {/* 顶部信息栏 */}
        <div className={styles.header}>
          <div className={styles.airportInfo}>
            <div className={styles.icaoCode}>{selectedIcao}</div>
            {airportName && <div className={styles.airportName}>{airportName}</div>}
          </div>
          <div className={styles.clock}>
            <div className={styles.timeDisplay}>
              {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className={styles.dateDisplay}>
              {currentTime.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} title="返回地图">
            <span>
                <IconByName name="Return" size={20} />
            </span>
            <span data-return-text>返回地图</span>
          </button>
        </div>

        {/* 标签切换 */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'departures' ? styles.active : ''}`}
            onClick={() => setActiveTab('departures')}
          >
            <IconByName name="SendOne" size={18} />
            <span>离港 DEPARTURES</span>
            <span className={styles.count}>{departures.length}</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'arrivals' ? styles.active : ''}`}
            onClick={() => setActiveTab('arrivals')}
          >
            <IconByName name="DownTwo" size={18} />
            <span>到港 ARRIVALS</span>
            <span className={styles.count}>{arrivals.length}</span>
          </button>
        </div>

        {/* 表头 */}
        <div className={styles.tableHeader}>
          <div className={styles.logoCell}></div>
          <div className={styles.callsignCell}>航班</div>
          <div className={styles.destinationCell}>
            {activeTab === 'departures' ? '目的地' : '始发地'}
          </div>
          <div className={styles.aircraftCell}>机型</div>
          <div className={styles.timeCell}>时间</div>
          <div className={styles.altitudeCell}>高度</div>
          <div className={styles.speedCell}>速度</div>
          <div className={styles.statusCell}>状态</div>
        </div>

        {/* 航班列表 */}
        <div className={styles.flightList}>
          {filteredFlights.length > 0 ? (
            filteredFlights.map((pilot, index) => renderFlightRow(pilot, index))
          ) : (
            <div className={styles.emptyState}>
              <IconByName name="Sleep" size={48} />
              <span>暂无{activeTab === 'departures' ? '离港' : '到港'}航班</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
