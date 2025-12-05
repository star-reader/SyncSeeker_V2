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
import { Button, CircularProgress, Switch, FormControl, Select, MenuItem, type SelectChangeEvent } from '@mui/material'
import { MuiColorInput } from 'mui-color-input'
import styles from './SettingsPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import { getPilotSchema } from '../../hooks/theme/useTheme'
import { useThemeStore } from '../../stores/useThemeStore'
import syncSeekerDB from '../../services/localDB/indexedDB'
import { fetchAndStoreNavData } from '../../apis/fetchStorageData'
import { CheckOne, CloseOne, DownloadOne, Refresh } from '@icon-park/react'
import type { WeatherRadarOpacity } from '../../services/map/layers/addWeatherRadar'

export default function SettingsPanel() {
  const [open, setOpen] = useState(true)
  const [labelDay, setLabelDay] = useState('#008080')
  const [labelNight, setLabelNight] = useState('#87CEEB')
  const [iconDay, setIconDay] = useState('#EF8B33')
  const [iconNight, setIconNight] = useState('#FFD27F')
  
  // Weather Radar
  const [weatherRadarEnabled, setWeatherRadarEnabled] = useState(false)
  const [weatherRadarOpacity, setWeatherRadarOpacity] = useState<WeatherRadarOpacity>('medium')
  
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
    
    // 读取气象雷达设置
    const radarEnabled = localStorage.getItem('weather-radar-enabled') === 'true'
    const radarOpacity = (localStorage.getItem('weather-radar-opacity') as WeatherRadarOpacity) || 'medium'
    setWeatherRadarEnabled(radarEnabled)
    setWeatherRadarOpacity(radarOpacity)
    
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

  // 气象雷达开关
  const handleToggleWeatherRadar = (enabled: boolean) => {
    setWeatherRadarEnabled(enabled)
    pubsub.publish(EVENTS.TOGGLE_WEATHER_RADAR, enabled)
  }

  // 气象雷达透明度
  const handleWeatherRadarOpacityChange = (event: SelectChangeEvent) => {
    const opacity = event.target.value as WeatherRadarOpacity
    setWeatherRadarOpacity(opacity)
    pubsub.publish(EVENTS.UPDATE_WEATHER_RADAR_OPACITY, opacity)
  }

  const schemaMemo = useMemo(() => ({ label: { day: labelDay, night: labelNight }, icon: { day: iconDay, night: iconNight } }), [labelDay, labelNight, iconDay, iconNight])

  const handleSave = () => {
    // 统一通过 Store 更新：同步到内存与 localStorage，并发布事件
    useThemeStore.getState().setPilotSchema(schemaMemo)
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
          {/* 机组样式设置 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>机组样式</span>
              <span className={styles.sectionSubtitle}>日间 / 夜间</span>
            </div>
            <div className={styles.colorGrid}>
              <div className={styles.colorRow}>
                <span className={styles.colorLabel}>文字颜色</span>
                <div className={styles.colorPair}>
                  <MuiColorInput 
                    value={labelDay} 
                    onChange={(v) => { 
                      setLabelDay(v); 
                      useThemeStore.getState().setPilotSchema({ label: { day: v, night: labelNight }, icon: { day: iconDay, night: iconNight } }) 
                    }} 
                    format="hex"
                    size="small"
                    className={styles.colorInput}
                  />
                  <MuiColorInput 
                    value={labelNight} 
                    onChange={(v) => { 
                      setLabelNight(v); 
                      useThemeStore.getState().setPilotSchema({ label: { day: labelDay, night: v }, icon: { day: iconDay, night: iconNight } }) 
                    }} 
                    format="hex"
                    size="small"
                    className={styles.colorInput}
                  />
                </div>
              </div>
              <div className={styles.colorRow}>
                <span className={styles.colorLabel}>图标颜色</span>
                <div className={styles.colorPair}>
                  <MuiColorInput 
                    value={iconDay} 
                    onChange={(v) => { 
                      setIconDay(v); 
                      useThemeStore.getState().setPilotSchema({ label: { day: labelDay, night: labelNight }, icon: { day: v, night: iconNight } }) 
                    }} 
                    format="hex"
                    size="small"
                    className={styles.colorInput}
                  />
                  <MuiColorInput 
                    value={iconNight} 
                    onChange={(v) => { 
                      setIconNight(v); 
                      useThemeStore.getState().setPilotSchema({ label: { day: labelDay, night: labelNight }, icon: { day: iconDay, night: v } }) 
                    }} 
                    format="hex"
                    size="small"
                    className={styles.colorInput}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 地图图层设置 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>地图图层</span>
            </div>
            <div className={styles.optionRow}>
              <div className={styles.optionInfo}>
                <span className={styles.optionName}>气象雷达</span>
                <span className={styles.optionDesc}>实时降水图层</span>
              </div>
              <div className={styles.optionControls}>
                {weatherRadarEnabled && (
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={weatherRadarOpacity}
                      onChange={handleWeatherRadarOpacityChange}
                      sx={{ height: 32, fontSize: 13 }}
                    >
                      <MenuItem value="light">20%</MenuItem>
                      <MenuItem value="medium">40%</MenuItem>
                      <MenuItem value="high">70%</MenuItem>
                      <MenuItem value="full">100%</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <Switch 
                  checked={weatherRadarEnabled} 
                  onChange={(e) => handleToggleWeatherRadar(e.target.checked)}
                  size="small"
                />
              </div>
            </div>
          </section>

          {/* 数据管理 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>数据管理</span>
            </div>
            <div className={styles.dataRow}>
              <div className={styles.dataInfo}>
                <div className={styles.dataIcon}>
                  {loading ? <CircularProgress size={16} /> : (
                    hasData ? <CheckOne theme="filled" size="18" fill="#67C23A"/> : <CloseOne theme="filled" size="18" fill="#F56C6C"/>
                  )}
                </div>
                <div className={styles.dataText}>
                  {loading ? '更新中...' : (
                    hasData ? `v${version?.version_id} · ${version?.update_date || ''}` : '未下载'
                  )}
                </div>
              </div>
              <Button 
                variant="text" 
                size="small"
                startIcon={hasData ? <Refresh size={14}/> : <DownloadOne size={14}/>}
                onClick={handleFetchData}
                disabled={loading}
                sx={{ minWidth: 'auto', fontSize: 13 }}
              >
                {hasData ? '更新' : '下载'}
              </Button>
            </div>
          </section>
        </div>
        <div className={styles.actions}>
          <Button variant="outlined" size="small" onClick={handleCancel}>取消</Button>
          <Button variant="contained" size="small" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  )
}
