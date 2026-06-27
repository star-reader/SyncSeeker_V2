/**
 * ControllerList Component
 * 
 * 管制员列表展示组件。
 * 显示当前在线的管制员信息（频率、评级、设施类型等）。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './PilotList.module.scss'
import pubsub from 'pubsub-js'
import type { OnlineController } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import IconByName from '../common/IconByName'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import atcRating from '../../configs/atc/atcRating'
import useClickOutside from '../../hooks/useClickOutside'
import FloatingPanel from '../common/FloatingPanel/FloatingPanel'

const EMPTY_CONTROLLERS: OnlineController[] = []
const CLOSE_ANIMATION_MS = 180

const getControllerType = (callsign: string) => {
  const upper = callsign.toUpperCase()
  if (upper.endsWith('_CTR')) return 'CTR'
  if (upper.endsWith('_APP')) return 'APP'
  if (upper.endsWith('_TWR')) return 'TWR'
  if (upper.endsWith('_GND')) return 'GND'
  if (upper.endsWith('_DEL')) return 'DEL'
  if (upper.endsWith('_FSS')) return 'FSS'
  if (upper.endsWith('_ATIS')) return 'ATIS'
  return 'ATC'
}

export default () => {
  const [controllers, setControllers] = useState<OnlineController[]>(EMPTY_CONTROLLERS)
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const list = useMemo(() => controllers, [controllers])

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
      setControllers(useOnlineDataStore.getState().getControllersWithAtis())
    })
    setControllers(useOnlineDataStore.getState().getControllersWithAtis())
    return () => {
      pubsub.unsubscribe(token)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const closeSheet = useCallback(() => {
    if (closeTimerRef.current) return
    setOpen(false)
    closeTimerRef.current = window.setTimeout(() => {
      pubsub.publish(EVENTS.RETURN_TO_MAP, 'controller')
      closeTimerRef.current = null
    }, CLOSE_ANIMATION_MS)
  }, [])

  const handleControllerClick = useCallback((controller: OnlineController) => {
    if (closeTimerRef.current) return
    setOpen(false)
    pubsub.publish(EVENTS.CONTROLLER_ICON_CLICK, { callsign: controller.callsign })
    closeTimerRef.current = window.setTimeout(() => {
      pubsub.publish(EVENTS.RETURN_TO_MAP, 'controller')
      closeTimerRef.current = null
    }, CLOSE_ANIMATION_MS)
  }, [])

  useClickOutside(sheetRef, closeSheet, { enabled: open })

  return (
    <div className={styles.container} data-open={open ? 'true' : 'false'}>
      <FloatingPanel
        ref={sheetRef}
        className={styles.sheet}
        handleClassName={styles.handle}
        open={open}
        expanded={expanded}
        dragIgnoreRef={listRef}
        onExpandedChange={setExpanded}
        onDismiss={closeSheet}
      >
        <div className={styles.heading}>
          <div>
            <div className={styles.title}>在线管制</div>
            <div className={styles.subtitle}>{list.length} 位在线 · 选择后回到地图查看详情</div>
          </div>
          <button className={styles.closeBtn} onClick={closeSheet} aria-label="关闭管制列表">
            <IconByName name="Close" />
          </button>
        </div>
        <div ref={listRef} className={styles.list} data-floating-panel-scroll="true">
          {!list.length ? (
            <div className={styles.empty}>
              <IconByName name="Sleep" size={28} />
              <div>暂无在线管制</div>
            </div>
          ) : list.map(controller => {
            const type = getControllerType(controller.callsign)

            return (
              <button
                key={controller.session_id}
                className={styles.card}
                onClick={() => handleControllerClick(controller)}
              >
                <span className={`${styles.logoBox} ${styles.controllerLogoBox}`}>
                  <span className={styles.controllerType}>{type}</span>
                </span>
                <span className={styles.mainInfo}>
                  <span className={styles.primaryLine}>
                    <span className={styles.callsign}>{controller.callsign}</span>
                    <span className={`${styles.status} ${styles['status--cruising']}`}>在线</span>
                  </span>
                  <span className={styles.name}>{controller.name || 'Unknown Controller'}</span>
                  <span className={styles.routeLine}>
                    <IconByName name="BroadcastOne" />
                    <span>{controller.frequency}</span>
                  </span>
                  <span className={styles.metrics}>
                    <span className={styles.metric}><IconByName name="ListTop" /> {atcRating(controller.rating)}</span>
                    <span className={styles.metric}><IconByName name="RadarThree" /> {controller.visual_range || 0}nm</span>
                    <span className={styles.metric}><IconByName name="Time" /> {onlineTime(controller.logon_time)}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </FloatingPanel>
    </div>
  )
}
