/**
 * PilotInfoPanel Component
 * 
 * 地图右侧的飞行员详细信息面板。
 * 点击地图上的飞机图标时滑出，显示飞行计划、实时数据、航路等信息。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useEffect, useMemo, useState } from 'react'
import pubsub from 'pubsub-js'
import styles from './PilotInfoPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import IconByName from '../common/IconByName'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'
import onlineTime from '../../utils/onlineTime'
import type { OnlinePilot } from '../../types/fsd'
import syncSeekerDB from '../../services/localDB/indexedDB'

/**
 * 飞行员信息面板组件
 * 
 * 交互：
 * - 订阅 EVENTS.PILOT_ICON_CLICK 事件以打开面板并设置当前选中的飞行员 ID。
 * - 自动从 Store 中获取最新的飞行员数据。
 * - 支持复制航路、关闭面板等操作。
 */
export default function PilotInfoPanel() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | null>(null)
  const onlineData = useOnlineDataStore(s => s.onlineData)
  
  const [airline, setAirline] = useState<IndexedDBAirlines | null>(null)
  const [depAirport, setDepAirport] = useState<IndexedDBAirports | null>(null)
  const [arrAirport, setArrAirport] = useState<IndexedDBAirports | null>(null)

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.PILOT_ICON_CLICK, (_, data: string) => {
      setId(data)
      setOpen(true)
    })
    return () => { pubsub.unsubscribe(token) }
  }, [])

  const pilot: OnlinePilot | null = useMemo(() => {
    if (!id) return null
    return useOnlineDataStore.getState().getPilotById(id) || null
  }, [id, onlineData])

  useEffect(() => {
    if (!pilot) {
        setAirline(null)
        setDepAirport(null)
        setArrAirport(null)
        return
    }

    const fetchData = async () => {
        try {
            // Ensure DB is initialized
            await syncSeekerDB.init().catch(() => {})
            
            // Airline
            const callsign = pilot.callsign
            const airlineCodeMatch = callsign.match(/^[A-Z]{3}/)
            if (airlineCodeMatch) {
                const code = airlineCodeMatch[0]
                syncSeekerDB.getAirlineByIcao(code).then(setAirline).catch(() => setAirline(null))
            } else {
                setAirline(null)
            }

            // Airports
            if (pilot.flight_plan) {
                 const { departure, arrival } = pilot.flight_plan
                 if(departure) syncSeekerDB.getAirportByIcao(departure).then(setDepAirport).catch(() => setDepAirport(null))
                 else setDepAirport(null)
                 
                 if(arrival) syncSeekerDB.getAirportByIcao(arrival).then(setArrAirport).catch(() => setArrAirport(null))
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

  const status = pilot ? getPilotStatusOf(pilot) : ''
  const statusTag = pilot ? getPilotStatusOfTag(pilot) : 'ground'
  const fp = pilot?.flight_plan
  const dep = fp?.departure || 'N/A'
  const arr = fp?.arrival || 'N/A'
  const routeText = fp?.route || ''
  const aircraft = fp?.aircraft || 'N/A'
  const cruiseAlt = fp?.altitude || '-'
  const cruiseTas = fp?.cruise_tas || '-'
  const deptime = fp?.deptime || '-'
  const enroute = fp?.enroute_time || '-'
  const remarks = fp?.remarks || ''
  const flightRules = fp?.flight_rules || 'I'

  const handleClose = () => {
    setOpen(false)
    setId(null)
  }

  const handleCopyRoute = () => {
    if (!routeText) return
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(routeText)
    }
  }

  return (
    <div className={styles.container} data-open={open ? 'true' : 'false'}>
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.callsign}>{pilot?.callsign || '-'}</div>
          <div className={styles.submeta}>
            <div className={styles.subchip}><IconByName name="IdCard" /> {pilot?.cid || '-'}</div>
            <div className={styles.subchip}><IconByName name="User" /> {pilot?.name || ''}</div>
            {airline && <div className={styles.subchip} title={airline.name}><IconByName name="ApplicationOne" /> {airline.name}</div>}
            <div className={styles.subchip} title="Aircraft Type"><IconByName name="Airplane" /> {aircraft}</div>
          </div>
        </div>
        <div className={styles.headerActions}>
           <div className={`${styles.status} ${styles[`status--${statusTag}`]}`}>{status || ''}</div>
           <button className={styles.closeBtn} onClick={handleClose}><IconByName name="Close" /></button>
        </div>
      </div>
      
      <div className={styles.body}>
        <div className={styles.routeCard}>
          <div className={styles.routeRow}>
            <div className={styles.routeCol}>
              <div className={styles.routeLabel}>DEPARTURE</div>
              <div className={styles.airportBig}>{dep}</div>
              {depAirport && <div className={styles.airportName} title={depAirport.name}>{depAirport.name}</div>}
            </div>
            <div className={styles.routeArrow}><IconByName name="FlightAirflow" /></div>
            <div className={styles.routeCol}>
              <div className={styles.routeLabel}>ARRIVAL</div>
              <div className={styles.airportBig}>{arr}</div>
              {arrAirport && <div className={styles.airportName} title={arrAirport.name}>{arrAirport.name}</div>}
            </div>
          </div>
          <div className={styles.trackBar}>
            <div className={styles.trackProgress}></div>
            <div className={styles.trackPlane}><IconByName name="Plane" /></div>
          </div>
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelTitle}><IconByName name="SpeedOne" /> 实时数据</div>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>高度 (ft)</div>
              <div className={styles.statValue}>{pilot ? Math.round(pilot.altitude) : 0}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>地速 (kt)</div>
              <div className={styles.statValue}>{pilot ? Math.round(pilot.groundspeed) : 0}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>航向 (°)</div>
              <div className={styles.statValue}>{pilot ? Math.round(pilot.heading) : 0}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>应答机</div>
              <div className={styles.statValue}>{pilot?.transponder || 0}</div>
            </div>
          </div>
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelTitle}><IconByName name="Pin" /> 飞行计划</div>
          <div className={styles.gridTwo}>
            <div className={styles.kvLine}><div className={styles.kvLabel}>规则</div><div className={styles.kvValueLine}>{flightRules === 'I' ? 'IFR' : 'VFR'}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>备降</div><div className={styles.kvValueLine}>{fp?.alternate || '-'}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>预计起飞</div><div className={styles.kvValueLine}>{deptime}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>预计航时</div><div className={styles.kvValueLine}>{enroute}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>巡航高度</div><div className={styles.kvValueLine}>{cruiseAlt}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>巡航速度</div><div className={styles.kvValueLine}>{cruiseTas}</div></div>
          </div>
          
          {routeText && (
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <div className={styles.codeTitle}>ROUTE</div>
                <button className={styles.copyBtn} onClick={handleCopyRoute}><IconByName name="Copy" /> COPY</button>
              </div>
              <pre className={styles.codeContent}>{routeText}</pre>
            </div>
          )}
          
          {remarks && (
             <div className={styles.codeBlock} style={{ marginTop: '8px' }}>
                <div className={styles.codeHeader}><div className={styles.codeTitle}>REMARKS</div></div>
                <pre className={styles.codeContent} style={{ maxHeight: '80px' }}>{remarks}</pre>
             </div>
          )}
        </div>

        <div className={styles.panelCard}>
          <div className={styles.panelTitle}><IconByName name="Protect" /> 连接信息</div>
          <div className={styles.gridTwo}>
            <div className={styles.kvLine}><div className={styles.kvLabel}>服务器</div><div className={styles.kvValueLine} title={pilot?.server}>{pilot?.server || '-'}</div></div>
            <div className={styles.kvLine}><div className={styles.kvLabel}>在线时长</div><div className={styles.kvValueLine}>{pilot ? onlineTime(pilot.logon_time) : '-'}</div></div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
