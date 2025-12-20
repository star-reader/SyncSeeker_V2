/**
 * ControllerDetailOverlay Component
 * 
 * 管制员详情弹窗组件。
 * 展示管制员详细信息，包括频率、ATIS、评级等。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import styles from './PilotList.module.scss'
import type { OnlineController } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import IconByName from '../common/IconByName'
import atcRating from '../../configs/atc/atcRating'

interface ControllerDetailOverlayProps {
  open: boolean
  controller: OnlineController | null
  onClose: () => void
}

export default ({ open, controller, onClose }: ControllerDetailOverlayProps) => {
  const atisText = (controller?.text_atis || []).join('\n')
  const [copyTextLabel, setCopyTextLabel] = useState('复制')

  const copyText = (text: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopyTextLabel('已复制')
    setTimeout(() => setCopyTextLabel('复制'), 1000)
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
          <div className={styles.modalTitle}>管制详情</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {controller && (
          <div className={styles.modalBody}>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.hero}>
                  {controller.callsign}
                  <span className={styles.status}>在线</span>
                </div>
                <div className={styles.sub}>CID {controller.cid} · {controller.name}</div>
                <div className={styles.routeBadges}>
                  <span className={styles.badge}><IconByName name="BroadcastOne" /> {controller.frequency}</span>
                  {/* <span className={styles.badge}><IconByName name="RadarThree" /> 设施 {controller.facility}</span> */}
                  <span className={styles.badge}><IconByName name="ListTop" /> {atcRating(controller.rating)}</span>
                </div>
              </div>
              <div className={styles.routeBadges}>
                <span className={styles.badge}><IconByName name="Time" /> {onlineTime(controller.logon_time)}</span>
                <span className={styles.badge}><IconByName name="Server" /> {controller.server}</span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>监视数据</div>
              <div className={styles.metrics}>
                <div className={styles.metric}><IconByName name="BroadcastOne" /> 频率 {controller.frequency}</div>
                <div className={styles.metric}><IconByName name="RadarThree" /> 可视范围 {controller.visual_range} nm</div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>ATIS</div>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeTitle}>TEXT ATIS</span>
                  <button className={styles.copyBtn} onClick={() => copyText(atisText)}>
                    <IconByName name="Copy" /> {copyTextLabel}
                  </button>
                </div>
                <pre className={styles.codeContent}>{atisText || '-'}</pre>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>会话</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>CID</div><div className={styles.kvValue}>{controller.cid}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>服务器</div><div className={styles.kvValue}>{controller.server}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>上线时长</div><div className={styles.kvValue}>{onlineTime(controller.logon_time)}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    mountNode
  )
}