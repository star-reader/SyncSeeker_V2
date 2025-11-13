import { useMemo, useState } from 'react'
import { CloseSmall, Search as SearchIcon } from '@icon-park/react'
import Icon from '@icon-park/react/es/all'
import { useOnlineDataStore } from '../stores/useOnlineDataStore'
import PilotDetailDrawer from './PilotDetailDrawer'
import styles from './PilotList.module.scss'

const formatDuration = (logon: string) => {
  const t = Date.parse(logon)
  if (Number.isNaN(t)) return ''
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export default () => {
  const flights = useOnlineDataStore(s => s.onlineData?.flights) || []
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return flights
    return flights.filter(f => {
      const name = f.name?.toLowerCase() || ''
      const callsign = f.callsign?.toLowerCase() || ''
      const cid = f.cid?.toLowerCase() || ''
      const dep = f.flight_plan?.departure?.toLowerCase() || ''
      const arr = f.flight_plan?.arrival?.toLowerCase() || ''
      return name.includes(k) || callsign.includes(k) || cid.includes(k) || dep.includes(k) || arr.includes(k)
    })
  }, [flights, keyword])

  const cols = '120px 160px 1fr 120px 120px 120px'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>在线机组列表</div>
        <div className={styles.count}>共 {filtered.length} 条</div>
        <div style={{ flex: 1 }} />
        <div className={styles.searchBox}>
          <SearchIcon size={16} className={styles.searchIcon} />
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索 Callsign/姓名/CID/Dep/Arr" className={styles.searchInput} />
          {keyword && (
            <button onClick={() => setKeyword('')} className={styles.clearBtn}>
              <CloseSmall size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.thead} style={{ gridTemplateColumns: cols }}>
          <div className={styles.th}>CID</div>
          <div className={styles.th}>Callsign</div>
          <div className={styles.th}>姓名</div>
          <div className={styles.th}>起飞</div>
          <div className={styles.th}>降落</div>
          <div className={styles.th}>在线时长</div>
        </div>

        <div className={styles.rows}>
          {filtered.map(f => (
            <div key={f.session_id}>
              <div onClick={() => setSelected(f)} className={styles.row} style={{ gridTemplateColumns: cols }}>
                <div className={styles.cid}>{f.cid || '-'}</div>
                <div className={styles.callsign}>{f.callsign || '-'}</div>
                <div className={styles.name}>{f.name || '-'}</div>
                <div className={styles.cellInline}>
                  <Icon type={'Airplane' as any} size={16} />
                  <span>{f.flight_plan?.departure || '-'}</span>
                </div>
                <div>{f.flight_plan?.arrival || '-'}</div>
                <div className={styles.timeCell}>
                  <span>{formatDuration(f.logon_time)}</span>
                  <span className={styles.actionHint}>
                    <Icon type={'RightSmall' as any} size={16} />
                    <span>详情</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PilotDetailDrawer pilot={selected} onClose={() => setSelected(null)} />
    </div>
  )
}