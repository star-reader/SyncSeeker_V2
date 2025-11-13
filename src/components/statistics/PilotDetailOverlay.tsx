import Icon, { ALL_ICON_KEYS } from '@icon-park/react/es/all'
import { Airplane } from '@icon-park/react'
import styles from './PilotList.module.scss'
import type { OnlinePilot } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'

function IconByName({ name, size = 16 }: { name: string, size?: number }) {
  const type = name as any
  return ALL_ICON_KEYS.includes(type) ? <Icon type={type} size={size} /> : <Airplane size={size} />
}

interface PilotDetailOverlayProps {
  open: boolean
  pilot: OnlinePilot | null
  onClose: () => void
}

export default ({ open, pilot, onClose }: PilotDetailOverlayProps) => {
  return (
    <div className={styles.overlay} data-open={open ? 'true' : 'false'} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{pilot?.callsign || ''}</div>
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
              <div className={styles.sectionTitle}>实时数据</div>
              <div className={styles.metrics}>
                <div className={styles.metric}><IconByName name="SortAmountDown" /> {Math.round(pilot.altitude)} ft</div>
                <div className={styles.metric}><IconByName name="Speed" /> {Math.round(pilot.groundspeed)} kt</div>
                <div className={styles.metric}><IconByName name="Compass" /> 航向 {Math.round(pilot.heading)}°</div>
                <div className={styles.metric}><IconByName name="BroadcastOne" /> 应答机 {pilot.transponder || 0}</div>
                <div className={styles.metric}><IconByName name="Degree" /> 倾斜 {Math.round(pilot.bank)}°</div>
                <div className={styles.metric}><IconByName name="Degree" /> 俯仰 {Math.round(pilot.pitch)}°</div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>飞行计划</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>规则</div><div className={styles.kvValue}>{pilot.flight_plan?.flight_rules || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>机型</div><div className={styles.kvValue}>{pilot.flight_plan?.aircraft || 'N/A'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>巡航速度</div><div className={styles.kvValue}>{pilot.flight_plan?.cruise_tas || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>巡航高度</div><div className={styles.kvValue}>{pilot.flight_plan?.altitude || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>起飞时间</div><div className={styles.kvValue}>{pilot.flight_plan?.deptime || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>航程时间</div><div className={styles.kvValue}>{pilot.flight_plan?.enroute_time || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>燃油时间</div><div className={styles.kvValue}>{pilot.flight_plan?.fuel_time || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>备降机场</div><div className={styles.kvValue}>{pilot.flight_plan?.alternate || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>航路</div><div className={styles.kvValue}>{pilot.flight_plan?.route || '-'}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>备注</div><div className={styles.kvValue}>{pilot.flight_plan?.remarks || '-'}</div></div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>位置信息</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>纬度</div><div className={styles.kvValue}>{pilot.latitude.toFixed(4)}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>经度</div><div className={styles.kvValue}>{pilot.longitude.toFixed(4)}</div></div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>会话</div>
              <div className={styles.kvList}>
                <div className={styles.kvItem}><div className={styles.kvKey}>CID</div><div className={styles.kvValue}>{pilot.cid}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>Session ID</div><div className={styles.kvValue}>{pilot.session_id}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>服务器</div><div className={styles.kvValue}>{pilot.server}</div></div>
                <div className={styles.kvItem}><div className={styles.kvKey}>上线时长</div><div className={styles.kvValue}>{onlineTime(pilot.logon_time)}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}