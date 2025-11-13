import { useMemo, useState } from 'react'
import Icon, { ALL_ICON_KEYS } from '@icon-park/react/es/all'
import { Airplane } from '@icon-park/react'
import styles from './PilotList.module.scss'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import type { OnlinePilot } from '../../types/fsd'
import onlineTime from '../../utils/onlineTime'
import getPilotStatusOf, { getPilotStatusOfTag } from '../../utils/getPilotStatusOf'

const EMPTY_FLIGHTS: OnlinePilot[] = []

function IconByName({ name, size = 16 }: { name: string, size?: number }) {
  const type = name as any
  return ALL_ICON_KEYS.includes(type) ? <Icon type={type} size={size} /> : <Airplane size={size} />
}

export default function PilotList() {
  const flights = useOnlineDataStore(s => s.onlineData?.flights ?? EMPTY_FLIGHTS)
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => flights, [flights])

  const selected = useMemo(() => list.find(f => f.session_id === openId || f.cid === openId) || null, [list, openId])

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.heading}>机组列表</div>
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
        <div className={styles.overlay} data-open={selected ? 'true' : 'false'} onClick={() => setOpenId(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{selected?.callsign || ''}</div>
              <button className={styles.closeBtn} onClick={() => setOpenId(null)}>×</button>
            </div>
            {selected && (
              <div className={styles.modalBody}>
                <div className={styles.item}>
                  <div className={styles.label}>机组</div>
                  <div className={styles.value}>{selected.name} · {selected.cid}</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>状态</div>
                  <div className={styles.tags}>
                    <span className={`${styles.status} ${styles[`status--${getPilotStatusOfTag(selected)}`]}`}>{getPilotStatusOf(selected)}</span>
                  </div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>航班</div>
                  <div className={styles.value}>{selected.flight_plan?.departure || '-'} → {selected.flight_plan?.arrival || '-'}</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>机型</div>
                  <div className={styles.value}>{selected.flight_plan?.aircraft || 'N/A'}</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>高度</div>
                  <div className={styles.value}>{Math.round(selected.altitude)} ft</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>地速</div>
                  <div className={styles.value}>{Math.round(selected.groundspeed)} kt</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>航路</div>
                  <div className={styles.value}>{selected.flight_plan?.route || '-'}</div>
                </div>
                <div className={styles.item}>
                  <div className={styles.label}>备注</div>
                  <div className={styles.value}>{selected.flight_plan?.remarks || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}