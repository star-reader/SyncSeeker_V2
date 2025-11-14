import { useEffect, useMemo, useState } from 'react'
import pubsub from 'pubsub-js'
import styles from './PilotInfoPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import IconByName from '../common/IconByName'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'
import onlineTime from '../../utils/onlineTime'
import type { OnlinePilot } from '../../types/fsd'

export default function PilotInfoPanel() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | null>(null)
  const onlineData = useOnlineDataStore(s => s.onlineData)

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

  const status = pilot ? getPilotStatusOf(pilot) : ''
  const statusTag = pilot ? getPilotStatusOfTag(pilot) : 'ground'
  const dep = pilot?.flight_plan?.departure || '-'
  const arr = pilot?.flight_plan?.arrival || '-'
  const routeText = pilot?.flight_plan?.route || ''
  const cruiseAlt = pilot?.flight_plan?.altitude || '-'
  const cruiseTas = pilot?.flight_plan?.cruise_tas || '-'

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
            <div className={styles.subchip}><IconByName name="IdCard" /> CID {pilot?.cid || '-'}</div>
            <div className={styles.subchip}><IconByName name="User" /> {pilot?.name || ''}</div>
          </div>
        </div>
        <div className={`${styles.status} ${styles[`status--${statusTag}`]}`}>{status || ''}</div>
        <button className={styles.closeBtn} onClick={handleClose}><IconByName name="Close" /></button>
      </div>
      <div className={styles.banner}>{pilot?.flight_plan?.aircraft || 'Aircraft'}</div>
      <div className={styles.body}>
        <>
          <div className={styles.routeCard}>
            <div className={styles.routeRow}>
              <div className={styles.airportBig}>{dep}</div>
              <div className={styles.routeArrow}><IconByName name="FlightAirflow" /> →</div>
              <div className={styles.airportBig}>{arr}</div>
            </div>
            <div className={styles.trackBar}></div>
          </div>
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}><IconByName name="Pin" /> 计划与航线</div>
            <div className={styles.gridTwo}>
              <div className={styles.kvLine}><div className={styles.kvLabel}>机型</div><div className={styles.kvValueLine}>{pilot?.flight_plan?.aircraft || 'N/A'}</div></div>
              <div className={styles.kvLine}><div className={styles.kvLabel}>备降</div><div className={styles.kvValueLine}>{pilot?.flight_plan?.alternate || '-'}</div></div>
              <div className={styles.kvLine}><div className={styles.kvLabel}>巡航高度</div><div className={styles.kvValueLine}>{cruiseAlt}</div></div>
              <div className={styles.kvLine}><div className={styles.kvLabel}>巡航速度</div><div className={styles.kvValueLine}>{cruiseTas}</div></div>
            </div>
            {routeText && (
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <div className={styles.codeTitle}>航线</div>
                  <button className={styles.copyBtn} onClick={handleCopyRoute}><IconByName name="Copy" /> 复制</button>
                </div>
                <pre className={styles.codeContent}>{routeText}</pre>
              </div>
            )}
          </div>
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}><IconByName name="SpeedOne" /> 实时数据</div>
            <div className={styles.statsRow}>
              <div className={styles.statItem}><div className={styles.statLabel}><IconByName name="SortAmountDown" /> 高度</div><div className={styles.statValue}>{pilot ? Math.round(pilot.altitude) : 0} ft</div></div>
              <div className={styles.statItem}><div className={styles.statLabel}><IconByName name="Speed" /> 地速</div><div className={styles.statValue}>{pilot ? Math.round(pilot.groundspeed) : 0} kt</div></div>
              <div className={styles.statItem}><div className={styles.statLabel}><IconByName name="Compass" /> 航向</div><div className={styles.statValue}>{pilot ? Math.round(pilot.heading) : 0}°</div></div>
              <div className={styles.statItem}><div className={styles.statLabel}><IconByName name="BroadcastOne" /> 应答机</div><div className={styles.statValue}>{pilot?.transponder || 0}</div></div>
            </div>
          </div>
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}><IconByName name="Protect" /> 会话</div>
            <div className={styles.gridTwo}>
              <div className={styles.kvLine}><div className={styles.kvLabel}>CID</div><div className={styles.kvValueLine}>{pilot?.cid || '-'}</div></div>
              <div className={styles.kvLine}><div className={styles.kvLabel}>服务器</div><div className={styles.kvValueLine}>{pilot?.server || '-'}</div></div>
              <div className={styles.kvLine}><div className={styles.kvLabel}>上线时长</div><div className={styles.kvValueLine}>{pilot ? onlineTime(pilot.logon_time) : '-'}</div></div>
            </div>
          </div>
          
        </>
      </div>
    </div>
  )
}