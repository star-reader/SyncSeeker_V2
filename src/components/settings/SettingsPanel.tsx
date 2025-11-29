/**
 * SettingsPanel Component
 * 
 * 设置面板组件
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useEffect, useMemo, useState } from 'react'
import pubsub from 'pubsub-js'
import { Button, Divider, Typography } from '@mui/material'
import { MuiColorInput } from 'mui-color-input'
import styles from './SettingsPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { getPilotSchema } from '../../hooks/theme/useTheme'

export default function SettingsPanel() {
  const [open, setOpen] = useState(true)
  const [labelDay, setLabelDay] = useState('#008080')
  const [labelNight, setLabelNight] = useState('#87CEEB')
  const [iconDay, setIconDay] = useState('#EF8B33')
  const [iconNight, setIconNight] = useState('#FFD27F')

  useEffect(() => {
    const s = getPilotSchema()
    setLabelDay(s.label.day)
    setLabelNight(s.label.night)
    setIconDay(s.icon.day)
    setIconNight(s.icon.night)
  }, [])

  const schemaMemo = useMemo(() => ({ label: { day: labelDay, night: labelNight }, icon: { day: iconDay, night: iconNight } }), [labelDay, labelNight, iconDay, iconNight])

  const handleSave = () => {
    localStorage.setItem('pilotSchema', JSON.stringify(schemaMemo))
    pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, schemaMemo)
    setOpen(false)
    pubsub.publish(EVENTS.RETURN_TO_MAP, 'settings')
  }

  const handleCancel = () => {
    setOpen(false)
    pubsub.publish(EVENTS.RETURN_TO_MAP, 'settings')
  }

  return (
    <div className={styles.overlay} data-open={open ? 'true' : 'false'}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>设置</div>
        </div>
        <div className={styles.body}>
          <Typography variant="subtitle2">机组样式（日/夜）</Typography>
          <Divider />
          <div className={`${styles.grid} setting-grid`}>
            <div className={styles.item}>
              <div className={styles.label}>文字（日）</div>
              <MuiColorInput value={labelDay} 
              onChange={(v) => { setLabelDay(v); pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, { label: { day: v, night: labelNight }, icon: { day: iconDay, night: iconNight } }) }} 
              format="hex" style={{zIndex: 10001}} />
            </div>
            <div className={styles.item}>
              <div className={styles.label}>文字（夜）</div>
              <MuiColorInput value={labelNight} 
              onChange={(v) => { setLabelNight(v); pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, { label: { day: labelDay, night: v }, icon: { day: iconDay, night: iconNight } }) }} 
              format="hex" style={{zIndex: 10001}} />
            </div>
            <div className={styles.item}>
              <div className={styles.label}>图标（日）</div>
              <MuiColorInput value={iconDay} 
              onChange={(v) => { setIconDay(v); pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, { label: { day: labelDay, night: labelNight }, icon: { day: v, night: iconNight } }) }} 
              format="hex" style={{zIndex: 10001}} />
            </div>
            <div className={styles.item}>
              <div className={styles.label}>图标（夜）</div>
              <MuiColorInput value={iconNight} 
              onChange={(v) => { setIconNight(v); pubsub.publish(EVENTS.PILOT_SCHEMA_CHANGE, { label: { day: labelDay, night: labelNight }, icon: { day: iconDay, night: v } }) }} 
              format="hex" style={{zIndex: 10001}} />
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="outlined" onClick={handleCancel}>取消</Button>
            <Button variant="contained" onClick={handleSave}>保存</Button>
          </div>
        </div>
      </div>
    </div>
  )
}