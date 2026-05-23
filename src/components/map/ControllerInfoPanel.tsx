import { useEffect, useMemo, useState, useCallback } from 'react'
import pubsub from 'pubsub-js'
import styles from './ControllerInfoPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { useOnlineDataStore } from '../../stores/useOnlineDataStore'
import type { OnlineController } from '../../types/fsd'
import getAtcRating from '../../configs/atc/atcRating'
import IconByName from '../common/IconByName'

type ControllerType = 'CTR' | 'APP' | 'TWR' | 'GND' | 'DEL' | 'FSS' | 'ATIS' | 'OBS' | 'OTHER'

const parseCallsign = (callsign: string): { 
  type: ControllerType; 
  prefix: string; 
  sector: string | null; 
} => {
  if (!callsign || typeof callsign !== 'string') {
    return { type: 'OTHER', prefix: '', sector: null }
  }
  
  const upper = callsign.toUpperCase()
  
  let type: ControllerType = 'OTHER'
  if (upper.endsWith('_CTR')) type = 'CTR'
  else if (upper.endsWith('_APP')) type = 'APP'
  else if (upper.endsWith('_TWR')) type = 'TWR'
  else if (upper.endsWith('_GND')) type = 'GND'
  else if (upper.endsWith('_DEL')) type = 'DEL'
  else if (upper.endsWith('_FSS')) type = 'FSS'
  else if (upper.endsWith('_ATIS')) type = 'ATIS'
  else if (upper.includes('_OBS') || upper.includes('_SUP') || upper.includes('_ADM')) type = 'OBS'
  
  const sectorMatch = upper.match(/^([A-Z]{4})_(\d+)_(CTR|APP|TWR|GND|DEL)$/)
  if (sectorMatch) {
    return { type, prefix: sectorMatch[1], sector: sectorMatch[2] }
  }
  
  const simpleMatch = upper.match(/^([A-Z]{2,4})_(CTR|APP|TWR|GND|DEL|FSS|ATIS)$/)
  if (simpleMatch) {
    return { type, prefix: simpleMatch[1], sector: null }
  }
  
  const parts = upper.split('_')
  return { type, prefix: parts[0] || '', sector: null }
}

const getFacilityName = (type: ControllerType): string => {
  const facilities: { [key in ControllerType]: string } = {
    'CTR': 'Center',
    'APP': 'Approach',
    'TWR': 'Tower',
    'GND': 'Ground',
    'DEL': 'Delivery',
    'FSS': 'Flight Service',
    'ATIS': 'ATIS',
    'OBS': 'Observer',
    'OTHER': 'Unknown'
  }
  return facilities[type] || 'Unknown'
}

const getFacilityColor = (type: ControllerType): string => {
  const colors: { [key in ControllerType]: string } = {
    'CTR': '#2ecc71',
    'APP': '#1abc9c',
    'TWR': '#e74c3c',
    'GND': '#e67e22',
    'DEL': '#9b59b6',
    'FSS': '#3498db',
    'ATIS': '#95a5a6',
    'OBS': '#7f8c8d',
    'OTHER': '#95a5a6'
  }
  return colors[type] || '#95a5a6'
}

export default function ControllerInfoPanel() {
  const [open, setOpen] = useState(false)
  const [callsign, setCallsign] = useState<string | null>(null)
  const onlineData = useOnlineDataStore(s => s.onlineData)
  
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const [startY, setStartY] = useState(0)

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.CONTROLLER_ICON_CLICK, (_, data: { callsign: string }) => {
      setCallsign(data.callsign)
      setOpen(true)
      setExpanded(false)
      setTranslateY(0)
    })
    return () => { pubsub.unsubscribe(token) }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true)
    setStartY(e.touches[0].clientY)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return
    setTranslateY(e.touches[0].clientY - startY)
  }, [dragging, startY])

  const handleTouchEnd = useCallback(() => {
    setDragging(false)
    const threshold = 60
    
    if (!expanded && translateY < -threshold) {
      setExpanded(true)
    } else if (expanded && translateY > threshold) {
      setExpanded(false)
    } else if (!expanded && translateY > threshold) {
      setOpen(false)
      setCallsign(null)
      pubsub.publish(EVENTS.CONTROLLER_INFO_CLOSE)
    }
    setTranslateY(0)
  }, [expanded, translateY])

  const selectedControllers: OnlineController[] = useMemo(() => {
    if (!callsign || !onlineData) return []

    const selected = onlineData.controllers.find(c => c.callsign === callsign)
    if (!selected) return []

    const parsed = parseCallsign(selected.callsign)
    const isSectorController = (parsed.type === 'CTR' || parsed.type === 'APP') && !!parsed.sector

    const candidates = isSectorController
      ? onlineData.controllers.filter(controller => {
          const current = parseCallsign(controller.callsign)
          return current.prefix === parsed.prefix && current.type === parsed.type
        })
      : [selected]

    return [...candidates].sort((a, b) => {
      if (a.callsign === callsign) return -1
      if (b.callsign === callsign) return 1
      return a.callsign.localeCompare(b.callsign)
    })
  }, [callsign, onlineData])

  const controller: OnlineController | null = useMemo(() => {
    return selectedControllers[0] || null
  }, [selectedControllers])

  const onlineTime = useCallback((controller: OnlineController) => {
    const logonTime = new Date(controller.logon_time)
    const now = new Date()
    const diff = now.getTime() - logonTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }, [])

  const facilityName = useMemo(() => {
    if (!controller) return ''
    const { type } = parseCallsign(controller.callsign)
    return getFacilityName(type)
  }, [controller])

  const facilityColor = useMemo(() => {
    if (!controller) return '#95a5a6'
    const { type } = parseCallsign(controller.callsign)
    return getFacilityColor(type)
  }, [controller])

  const rating = useMemo(() => {
    if (!controller) return ''
    return getAtcRating(controller.rating)
  }, [controller])

  const titleText = useMemo(() => {
    if (!controller) return ''
    const parsed = parseCallsign(controller.callsign)
    if (selectedControllers.length > 1) {
      return `${parsed.prefix}_${parsed.type}`
    }
    return controller.callsign
  }, [controller, selectedControllers])

  const handleClose = () => {
    setOpen(false)
    setCallsign(null)
    setExpanded(false)
    pubsub.publish(EVENTS.CONTROLLER_INFO_CLOSE)
  }

  if (!controller) return null

  return (
    <div
      className={styles.container}
      data-open={open}
      data-expanded={expanded}
      style={{
        transform: dragging ? `translateY(${Math.max(0, translateY)}px)` : undefined
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.handleBar} />
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.callsign}>{titleText}</div>
          <div className={styles.submeta}>
            <span className={styles.subchip}>
              <IconByName name="Person" />
              {selectedControllers.length > 1 ? `${selectedControllers.length} 名管制员在线` : controller.name}
            </span>
            <span className={styles.subchip}>
              <IconByName name="Badge" />
              {selectedControllers.length > 1 ? facilityName : rating}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div 
            className={styles.status}
            style={{ 
              color: facilityColor,
              background: `${facilityColor}20`
            }}
          >
            {facilityName}
          </div>
          <button onClick={handleClose} className={styles.closeBtn}>
            <IconByName name="Close" />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {selectedControllers.map((item, index) => {
          const itemRating = getAtcRating(item.rating)
          const showAtis = item.text_atis && item.text_atis.length > 0

          return (
            <div key={item.callsign} className={styles.controllerBlock}>
              {selectedControllers.length > 1 && (
                <div className={styles.blockTitle}>
                  <span>{item.callsign}</span>
                  <span className={styles.blockMeta}>{item.name}</span>
                </div>
              )}

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <IconByName name="Radio" />
                  <span>频率</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.frequencyDisplay}>
                    {item.frequency}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <IconByName name="Info" />
                  <span>管制员信息</span>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>姓名</span>
                    <span className={styles.infoValue}>{item.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>等级</span>
                    <span className={styles.infoValue}>{itemRating}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>CID</span>
                    <span className={styles.infoValue}>{item.cid}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>服务器</span>
                    <span className={styles.infoValue}>{item.server}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>在线时间</span>
                    <span className={styles.infoValue}>{onlineTime(item)}</span>
                  </div>
                </div>
              </div>

              {showAtis && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <IconByName name="List" />
                    <span>ATIS</span>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.atisContent}>
                      {item.text_atis.map((line, lineIndex) => (
                        <div key={`${item.callsign}-${lineIndex}`} className={styles.atisLine}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {index < selectedControllers.length - 1 && <div className={styles.blockDivider} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
