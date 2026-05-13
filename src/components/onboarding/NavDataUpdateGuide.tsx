import { useEffect, useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import pubsub from 'pubsub-js'
import styles from './OnboardingGuide.module.scss'
import { EVENTS } from '../../configs/constants'
import { fetchAndStoreNavData } from '../../apis/fetchStorageData'
import { showToast } from '../common/Toast'

import pc_6 from '../../assets/onboarding/pc/6.png'
import mobile_6 from '../../assets/onboarding/mobile/6.png'

export default function NavDataUpdateGuide() {
  const [visible, setVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateDone, setUpdateDone] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const token = pubsub.subscribe(EVENTS.NAVDATA_STARTUP_UPDATED, () => {
      setUpdateDone(false)
      setIsUpdating(false)
      setVisible(true)
    })

    return () => {
      window.removeEventListener('resize', checkMobile)
      pubsub.unsubscribe(token)
    }
  }, [])

  if (!visible) {
    return null
  }

  const handleUpdateNow = async () => {
    setIsUpdating(true)
    try {
      const updated = await fetchAndStoreNavData()
      if (!updated) {
        showToast('当前导航数据已是最新版本', 'info')
      }
      setUpdateDone(true)
    } catch (e) {
      console.error('Startup nav data update failed:', e)
      showToast('导航数据更新失败，请稍后重试', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.indicators}>
            <div className={`${styles.indicator} ${styles.active}`} />
          </div>

          <div className={styles.stepContent}>
            <div className={styles.imageWrapper}>
              <img
                src={isMobile ? mobile_6 : pc_6}
                alt="导航数据更新"
                className={`${styles.image} ${styles.imageLoaded}`}
              />
            </div>

            <div className={styles.textContent}>
              <h2 className={styles.title}>{updateDone ? '数据已更新' : '检测到数据更新'}</h2>
              <p className={styles.description}>
                {updateDone
                  ? '地图数据和导航数据已更新完成。'
                  : '地图数据与导航数据有更新，是否立即更新？'}
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.downloadSection}>
              {updateDone ? (
                <Button
                  variant="contained"
                  onClick={() => setVisible(false)}
                  className={styles.downloadButton}
                >
                  我知道了
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    onClick={() => setVisible(false)}
                    className={`${styles.downloadButton} ${styles.cancelButton}`}
                    disabled={isUpdating}
                  >
                    取消
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleUpdateNow}
                    className={styles.downloadButton}
                    disabled={isUpdating}
                    startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {isUpdating ? '更新中...' : '更新'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
