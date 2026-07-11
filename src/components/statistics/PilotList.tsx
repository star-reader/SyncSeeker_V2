/**
 * PilotList Component
 * 
 * 飞行员列表展示组件。
 * 显示当前在线的所有机组人员摘要信息，支持点击查看详情。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './PilotList.module.scss'
import pubsub from 'pubsub-js'
import type { OnlinePilot } from '../../types/fsd'
import IconByName from '../common/IconByName'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import { getAirlineIcaoFromCallsign, getAirlineLogoUrl } from '../../utils/airlineLogo'
import useClickOutside from '../../hooks/useClickOutside'
import FloatingPanel from '../common/FloatingPanel/FloatingPanel'

const EMPTY_FLIGHTS: OnlinePilot[] = []
const CLOSE_ANIMATION_MS = 180

export default () => {
  const [flights, setFlights] = useState<OnlinePilot[]>(EMPTY_FLIGHTS)
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const list = useMemo(() => flights, [flights])

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, () => {
      setFlights(useOnlineDataStore.getState().getFlights())
    })
    setFlights(useOnlineDataStore.getState().getFlights())
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
      pubsub.publish(EVENTS.RETURN_TO_MAP, 'pilot')
      closeTimerRef.current = null
    }, CLOSE_ANIMATION_MS)
  }, [])

  const handlePilotClick = useCallback((pilot: OnlinePilot) => {
    if (closeTimerRef.current) return
    setOpen(false)
    pubsub.publish(EVENTS.PILOT_ICON_CLICK, { id: pilot.session_id, callsign: pilot.callsign })
    closeTimerRef.current = window.setTimeout(() => {
      pubsub.publish(EVENTS.RETURN_TO_MAP, 'pilot')
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
            <div className={styles.title}>在线机组</div>
            <div className={styles.subtitle}>{list.length} 架在线</div>
          </div>
          <button className={styles.closeBtn} onClick={closeSheet} aria-label="关闭机组列表">
            <IconByName name="Close" />
          </button>
        </div>
        <div ref={listRef} className={styles.list} data-floating-panel-scroll="true">
          {!list.length ? (
            <div className={styles.empty}>
              <IconByName name="Sleep" size={28} />
              <div>暂无在线机组</div>
            </div>
          ) : list.map(p => {
              const airlineLogoUrl = getAirlineLogoUrl(p.callsign)
              const airlineIcao = getAirlineIcaoFromCallsign(p.callsign)
              const departure = p.flight_plan?.departure || '-'
              const arrival = p.flight_plan?.arrival || '-'

              return (
                <button key={p.session_id} className={styles.card} onClick={() => handlePilotClick(p)}>
                  <span className={styles.logoBox}>
                    {airlineLogoUrl && (
                      <img
                        src={airlineLogoUrl}
                        alt={airlineIcao ? `${airlineIcao} logo` : 'Airline logo'}
                        className={styles.airlineLogo}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                  </span>
                  <span className={styles.mainInfo}>
                    <span className={styles.primaryLine}>
                      <span className={styles.callsign}>{p.callsign}</span>
                    </span>
                    <span className={styles.name}>{p.name || 'Unknown Pilot'}</span>
                    <span className={styles.routeLine}>
                      <IconByName name="LocalTwo" />
                      <span>{departure} → {arrival}</span>
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
