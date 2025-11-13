import { useEffect, useMemo, useState } from 'react'
import type { OnlinePilot } from '../../types/fsd'
import Icon from '@icon-park/react/es/all'
import styles from './PilotDetailDrawer.module.scss'

interface Props {
  pilot: OnlinePilot | null
  onClose: () => void
}

const fmtTime = (logon: string) => {
  const t = Date.parse(logon)
  if (Number.isNaN(t)) return ''
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export default ({ pilot, onClose }: Props) => {
  const [mobile, setMobile] = useState(false)
  const open = !!pilot

  useEffect(() => {
    const update = () => setMobile(window.innerWidth <= 640)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const dep = pilot?.flight_plan?.departure || ''
  const arr = pilot?.flight_plan?.arrival || ''
  const route = pilot?.flight_plan?.route || ''
  const remarks = pilot?.flight_plan?.remarks || ''

  const stats = useMemo(() => ([
    { icon: 'DashboardTwo', label: `${Math.round(pilot?.groundspeed || 0)} kt` },
    { icon: 'UpOne', label: `${Math.round(pilot?.altitude || 0)} ft` },
    { icon: 'Compass', label: `${Math.round(pilot?.heading || 0)}°` },
    { icon: 'BrakePads', label: `${pilot?.transponder ?? 0}` },
  ]), [pilot])

  const panelAttrs = { 'data-open': open ? 'true' : 'false', 'data-mobile': mobile ? 'true' : 'false' } as const

  return (
    <>
      <div onClick={onClose} className={styles.overlay} data-open={open ? 'true' : 'false'} />
      <div className={styles.panel} {...panelAttrs}>
        <div className={styles.head}>
          <div className={styles.title}>{pilot?.callsign || ''}</div>
          <div className={styles.actions}>
            <button onClick={onClose} className={styles.closeBtn}>
              <Icon type={'CloseSmall' as any} size={16} />
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.chips}>
            {stats.map(s => (
              <div key={s.label} className={styles.chip}>
                <Icon type={s.icon as any} size={16} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.twoCols}>
            <div className={styles.card}>
              <div className={styles.label}>起飞</div>
              <div className={styles.value}>{dep || '-'}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.label}>降落</div>
              <div className={styles.value}>{arr || '-'}</div>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>航路</div>
            <div className={styles.text}>{route || '-'}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.label}>备注</div>
            <div className={styles.text}>{remarks || '-'}</div>
          </div>
          <div className={styles.footer}>
            <div className={styles.name}>{pilot?.name || ''}</div>
            <div className={styles.cid}>CID {pilot?.cid || ''}</div>
            <div className={styles.online}>在线 {fmtTime(pilot?.logon_time || '')}</div>
          </div>
        </div>
      </div>
    </>
  )
}