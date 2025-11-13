import { useMemo, useState } from 'react'
import Icon, { ALL_ICON_KEYS } from '@icon-park/react/es/all'
import { CloseSmall, Search as SearchIcon, RadarThree } from '@icon-park/react'
import { useOnlineDataStore } from '../stores/useOnlineDataStore'
import styles from './ControllerList.module.scss'

const facilityMap: Record<number, string> = {
  1: 'DEL',
  2: 'GND',
  3: 'TWR',
  4: 'APP',
  5: 'CTR',
}

const ratingMap: Record<number, string> = {
  1: 'OBS',
  2: 'S1',
  3: 'S2',
  4: 'S3',
  5: 'C1',
  6: 'C2',
  7: 'C3',
  8: 'I1',
  9: 'I2',
  10: 'I3',
  11: 'SUP',
  12: 'ADM',
}

const formatDuration = (logon: string) => {
  const t = Date.parse(logon)
  if (Number.isNaN(t)) return ''
  const ms = Date.now() - t
  const m = Math.floor(ms / 60000)
  if (m < 60) return `在线 ${m} 分钟`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `在线 ${h} 小时 ${rm} 分钟`
}

export default () => {
  const controllers = useOnlineDataStore(s => s.onlineData?.controllers) || []
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return controllers
    return controllers.filter(c => {
      const name = c.name?.toLowerCase() || ''
      const callsign = c.callsign?.toLowerCase() || ''
      const cid = c.cid?.toLowerCase() || ''
      const freq = c.frequency?.toLowerCase() || ''
      return name.includes(k) || callsign.includes(k) || cid.includes(k) || freq.includes(k)
    })
  }, [controllers, keyword])

  const renderIcon = (t: string, size = 16) => {
    const type = t as any
    return ALL_ICON_KEYS.includes(type) ? <Icon type={type} size={size} /> : <Icon type={'RadarThree' as any} size={size} />
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>在线管制列表</div>
        <div className={styles.count}>共 {filtered.length} 条</div>
        <div style={{ flex: 1 }} />
        <div className={styles.searchBox}>
          <SearchIcon size={16} className={styles.searchIcon} />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索 Callsign/姓名/CID/频率"
            className={styles.searchInput}
          />
          {keyword && (
            <button onClick={() => setKeyword('')} className={styles.clearBtn}>
              <CloseSmall size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map(c => (
          <div key={c.session_id} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.callsign}>{c.callsign || '-'}</div>
              <div className={styles.tag}>
                <RadarThree size={16} />
                <span>{facilityMap[c.facility] || 'ATC'}/{ratingMap[c.rating] || c.rating}</span>
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.row}>
                {renderIcon('List', 16)}
                <span>{c.frequency || '-'}</span>
              </span>
              <div className={styles.rowRight}>
                {renderIcon('Compass', 16)}
                <span>{Math.round(c.visual_range || 0)} nm</span>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.row}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.cid}>CID {c.cid}</span>
              </div>
              <div className={styles.rowRight}>
                <span className={styles.online}>{formatDuration(c.logon_time)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}