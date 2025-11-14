import { useMemo, useState, useEffect } from 'react'
import styles from './PilotList.module.scss'
import pubsub from 'pubsub-js'
import type { OnlineData, OnlinePilot } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'
import PilotDetailOverlay from './PilotDetailOverlay'
import IconByName from '../common/IconByName'

const EMPTY_FLIGHTS: OnlinePilot[] = []

export default () => {
  const [flights, setFlights] = useState<OnlinePilot[]>(EMPTY_FLIGHTS)
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => flights, [flights])

  const selected = useMemo(() => list.find(f => f.session_id === openId || f.cid === openId) || null, [list, openId])

  const handleReturnBtnClick = () => {
    pubsub.publish('return-to-map', 'pilot')
  }

  useEffect(() => {
    pubsub.subscribe('online-data-update', (_, data: OnlineData) => {
      setFlights(data.flights?.sort((a, b) => b.logon_time > a.logon_time ? 1 : -1) || EMPTY_FLIGHTS)
    })
    return () => {
      pubsub.unsubscribe('online-data-update')
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div className={styles.title}>机组列表</div>
          <div className={styles.returnBtn} onClick={handleReturnBtnClick}>
            <IconByName name="ArrowLeft" />
            返回地图
          </div>
        </div>
        {!list.length && (
          <div className={styles.empty}>暂无在线机组</div>
        )}
        <div className={styles.list}>
          {list.length ? list.map(p => (
            <div key={p.session_id} className={styles.card} onClick={() => setOpenId(p.session_id)}>
              <div className={styles.title}>
                <span className={styles.callsign}>{p.callsign}</span>
                <span className={styles.name}>{p.name}</span>
                <span className={`${styles.status} ${styles[`status--${getPilotStatusOfTag(p)}`]}`}>{getPilotStatusOf(p)}</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.chip}><IconByName name="Airplane" /> {p.flight_plan?.aircraft || 'N/A'}</span>
                <span className={styles.chip}><IconByName name="LocalTwo" /> {p.flight_plan?.departure || '-'} → {p.flight_plan?.arrival || '-'}</span>
                <span className={styles.chip}><IconByName name="Speed" /> {Math.round(p.groundspeed)}kt</span>
                <span className={styles.chip}><IconByName name="SortAmountDown" /> {Math.round(p.altitude)} ft</span>
                <span className={styles.chip}><IconByName name="Time" /> {onlineTime(p.logon_time)}</span>
              </div>
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>

        {/* 详情框 */}
        <PilotDetailOverlay open={!!selected} pilot={selected} onClose={() => setOpenId(null)} />
      </div>
    </div>
  )
}