import { useEffect, useMemo, useState } from 'react'
import styles from './PilotList.module.scss'
import pubsub from 'pubsub-js'
import type { OnlineController } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import ControllerDetailOverlay from './ControllerDetailOverlay'
import IconByName from '../common/IconByName'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'

const EMPTY_CONTROLLERS: OnlineController[] = []

export default () => {
  const [controllers, setControllers] = useState<OnlineController[]>(EMPTY_CONTROLLERS)
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => controllers, [controllers])

  const selected = useMemo(() => list.find(c => c.session_id === openId || c.cid === openId) || null, [list, openId])


  const handleReturnBtnClick = () => {
    pubsub.publish(EVENTS.RETURN_TO_MAP, 'controller')
  }

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
      setControllers(useOnlineDataStore.getState().getControllers())
    })
    setControllers(useOnlineDataStore.getState().getControllers())
    return () => {
      pubsub.unsubscribe(token)
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div className={styles.title}>管制员列表</div>
          <div className={styles.returnBtn} onClick={handleReturnBtnClick}>
            <IconByName name="ArrowLeft" />
            返回地图
          </div>
        </div>
        {!list.length && (
          <div className={styles.empty}>暂无在线管制</div>
        )}
        <div className={styles.list}>
          {list.length ? list.map(c => (
            <div key={c.session_id} className={styles.card} onClick={() => setOpenId(c.session_id)}>
              <div className={styles.title}>
                <span className={styles.callsign}>{c.callsign}</span>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.status}>在线</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.chip}><IconByName name="BroadcastOne" /> {c.frequency}</span>
                <span className={styles.chip}><IconByName name="RadarThree" /> 设施 {c.facility}</span>
                <span className={styles.chip}><IconByName name="ListTop" /> 评级 {c.rating}</span>
                <span className={styles.chip}><IconByName name="Time" /> {onlineTime(c.logon_time)}</span>
              </div>
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>

        <ControllerDetailOverlay open={!!selected} controller={selected} onClose={() => setOpenId(null)} />
      </div>
    </div>
  )
}