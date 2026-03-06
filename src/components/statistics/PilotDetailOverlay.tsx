
/**
 * PilotDetailOverlay Component
 * 
 * 飞行员详情弹窗组件。
 * 在移动端或列表模式下，点击飞行员条目显示的详细信息模态框。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import styles from './PilotList.module.scss'
import type { OnlinePilot } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import IconByName from '../common/IconByName'


interface PilotDetailOverlayProps {
  open: boolean
  pilot: OnlinePilot | null
  onClose: () => void
}

export default ({ open, pilot, onClose }: PilotDetailOverlayProps) => {
  const routeText = pilot?.flight_plan?.route || ''
  const remarksText = pilot?.flight_plan?.remarks || ''

  const [routeCopyText, setRouteCopyText] = useState('复制')
  const [remarksCopyText, setRemarksCopyText] = useState('复制')

  const copyText = (text: string, from: 'route' | 'remarks') => {
    if (!text) return
    navigator.clipboard?.writeText(text).catch(() => { })
    if (from === 'route') {
      setRouteCopyText('已复制')
    } else {
      setRemarksCopyText('已复制')
    }
    setTimeout(() => {
      if (from === 'route') {
        setRouteCopyText('复制')
      } else {
        setRemarksCopyText('复制')
      }
    }, 1000)
  }

  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevDoc = document.documentElement.style.overflow
    if (open) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevDoc
    }
  }, [open])

  const mountNode = document.getElementById('root') || document.body

  return createPortal(
    <div className={styles.overlay} data-open={open ? 'true' : 'false'} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>机组详情</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {pilot && (
          <div className={styles.modalBody}>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.hero}>
                  {pilot.callsign}
                  <span className={`${styles.status} ${styles[`status--${getPilotStatusOfTag(pilot)}`]}`}>{getPilotStatusOf(pilot)}</span>
                </div>
                <div className={styles.sub}>CID {pilot.cid} · {pilot.name}</div>
                <div className={styles.routeBadges}>
                  <span className={styles.badge}><IconByName name="LocalTwo" /> {pilot.flight_plan?.departure || '-'} → {pilot.flight_plan?.arrival || '-'}</span>
                  <span className={styles.badge}><IconByName name="Airplane" /> {pilot.flight_plan?.aircraft || 'N/A'}</span>
                  {pilot.flight_plan?.alternate && (
                    <span className={styles.badge}><IconByName name="Switch" /> 备降 {pilot.flight_plan.alternate}</span>
                  )}
                </div>
              </div>
              <div className={styles.routeBadges}>
                <span className={styles.badge}><IconByName name="Time" /> {onlineTime(pilot.logon_time)}</span>
                <span className={styles.badge}><IconByName name="Server" /> {pilot.server}</span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>飞行数据</div>
              <div className={styles.metrics}>
                <div className={styles.metric}><IconByName name="SortAmountDown" /> 高度 {Math.round(pilot.altitude)} ft</div>
                <div className={styles.metric}><IconByName name="Speed" /> 地速 {Math.round(pilot.groundspeed)} kt</div>
                <div className={styles.metric}><IconByName name="Compass" /> 航向 {Math.round(pilot.heading)}°</div>
                <div className={styles.metric}><IconByName name="BroadcastOne" /> 应答机 {pilot.transponder || 0}</div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>飞行计划</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>规则</div><div className={styles.kvValue}>
                  {pilot.flight_plan?.flight_rules === 'I' ? 'IFR' : pilot.flight_plan?.flight_rules === 'V' ? 'VFR' : '-'}
                  </div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>机型</div><div className={styles.kvValue}>{pilot.flight_plan?.aircraft || 'N/A'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>巡航速度</div><div className={styles.kvValue}>{pilot.flight_plan?.cruise_tas || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>巡航高度</div><div className={styles.kvValue}>{pilot.flight_plan?.altitude || '-'}</div></div>
                {/* <div className={styles.kvItem}><div className={styles.kvKey}>起飞时间</div><div className={styles.kvValue}>{pilot.flight_plan?.deptime || '-'}</div></div> */}
                <div className={styles.kvItem}><div className={styles.kvKey}>航程时间</div><div className={styles.kvValue}>{pilot.flight_plan?.enroute_time || '-'}</div></div>
                {/* <div className={styles.kvItem}><div className={styles.kvKey}>燃油时间</div><div className={styles.kvValue}>{pilot.flight_plan?.fuel_time || '-'}</div></div> */}
                <div className={styles.kvItem}><div className={styles.kvKey}>备降机场</div><div className={styles.kvValue}>{pilot.flight_plan?.alternate || '-'}</div></div>
              </div>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeTitle}>ROUTE</span>
                  <button className={styles.copyBtn} onClick={() => copyText(routeText, 'route')}>
                    <IconByName name="Copy" /> {routeCopyText}
                  </button>
                </div>
                <pre className={styles.codeContent}>{routeText || '-'}</pre>
              </div>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeTitle}>REMARKS</span>
                  <button className={styles.copyBtn} onClick={() => copyText(remarksText, 'remarks')}>
                    <IconByName name="Copy" /> {remarksCopyText}
                  </button>
                </div>
                <pre className={styles.codeContent}>{remarksText || '-'}</pre>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>会话</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>CID</div><div className={styles.kvValue}>{pilot.cid}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>服务器</div><div className={styles.kvValue}>{pilot.server}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>上线时长</div><div className={styles.kvValue}>{onlineTime(pilot.logon_time)}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    mountNode
  )
}