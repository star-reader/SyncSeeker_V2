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
import { Button, Divider, Typography, CircularProgress } from '@mui/material'
import { MuiColorInput } from 'mui-color-input'
import styles from './SettingsPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { getPilotSchema } from '../../hooks/theme/useTheme'
import syncSeekerDB from '../../services/localDB/indexedDB'
import { fetchAndStoreNavData } from '../../apis/fetchStorageData'
import { CheckOne, CloseOne, DownloadOne, Refresh } from '@icon-park/react'

export default function SettingsPanel() {
  const [open, setOpen] = useState(true)
  const [labelDay, setLabelDay] = useState('#008080')
  const [labelNight, setLabelNight] = useState('#87CEEB')
  const [iconDay, setIconDay] = useState('#EF8B33')
  const [iconNight, setIconNight] = useState('#FFD27F')
  
  // Data Status
  const [hasData, setHasData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState<NavDataVersion | null>(null)

  useEffect(() => {
    const s = getPilotSchema()
    setLabelDay(s.label.day)
    setLabelNight(s.label.night)
    setIconDay(s.icon.day)
    setIconNight(s.icon.night)
    
    checkDataStatus()

    const token = pubsub.subscribe(EVENTS.NAVDATA_UPDATE, (_: any, data: NavDataVersion) => {
        checkDataStatus()
        // 如果是pubsub传来的更新，可以直接更新version
        if(data) setVersion(data)
    })

    return () => {
        pubsub.unsubscribe(token)
    }
  }, [])

  const checkDataStatus = async () => {
    try {
        await syncSeekerDB.init()
        const empty = await syncSeekerDB.isEmpty()
        setHasData(!empty)
        if (!empty) {
            const ver = await syncSeekerDB.getNavDataVersion()
            setVersion(ver)
        }
    } catch (e) {
        console.error(e)
        setHasData(false)
    }
  }

  const handleFetchData = async () => {
    setLoading(true)
    try {
        const updated = await fetchAndStoreNavData()
        if (!updated) {
            // 这里可以添加一个提示，告诉用户已经是最新版本
            // 由于没有引入Toast组件，暂时只在控制台输出
            console.log('Already up to date')
        }
    } catch (e) {
        console.error(e)
    } finally {
        setLoading(false)
    }
  }

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

          <Typography variant="subtitle2" style={{ marginTop: '16px' }}>本地数据管理</Typography>
          <Divider />
          <div className={styles.dataStatus}>
            <div className={styles.statusInfo}>
                <div className={styles.statusIcon}>
                    {loading ? <CircularProgress size={20} /> : (
                        hasData ? <CheckOne theme="filled" size="24" fill="#67C23A"/> : <CloseOne theme="filled" size="24" fill="#F56C6C"/>
                    )}
                </div>
                <div className={styles.statusText}>
                    {loading ? '正在更新数据...' : (
                        hasData ? `已下载最新数据 (AIRAC ${version?.airac_code || 'Unknown'} - ${version?.update_date || ''})` : '未检测到本地数据'
                    )}
                </div>
            </div>
            <Button 
                variant="outlined" 
                color={hasData ? "primary" : "error"}
                startIcon={hasData ? <Refresh /> : <DownloadOne />}
                onClick={handleFetchData}
                disabled={loading}
            >
                {hasData ? '更新数据' : '立即下载'}
            </Button>
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
