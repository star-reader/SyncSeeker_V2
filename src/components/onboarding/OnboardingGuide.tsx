/**
 * OnboardingGuide Component
 * 
 * 首次启动引导组件
 * 
 * @author Jerry Jin
 * @date 2025-12-06
 */
import { useState, useEffect } from 'react'
import { Button, CircularProgress } from '@mui/material'
import styles from './OnboardingGuide.module.scss'
import { fetchAndStoreNavData } from '../../apis/fetchStorageData'

// 引入图片
import pc_1 from '../../assets/onboarding/pc/1.png'
import pc_2 from '../../assets/onboarding/pc/2.png'
import pc_3 from '../../assets/onboarding/pc/3.png'
import pc_4 from '../../assets/onboarding/pc/4.png'
import pc_5 from '../../assets/onboarding/pc/5.png'
import pc_6 from '../../assets/onboarding/pc/6.png'

import mobile_1 from '../../assets/onboarding/mobile/1.png'
import mobile_2 from '../../assets/onboarding/mobile/2.png'
import mobile_3 from '../../assets/onboarding/mobile/3.png'
import mobile_4 from '../../assets/onboarding/mobile/4.png'
import mobile_5 from '../../assets/onboarding/mobile/5.png'
import mobile_6 from '../../assets/onboarding/mobile/6.png'

interface Step {
  id: number
  title: string
  description: string
  imageMobile: string
  imageDesktop: string
}

const ONBOARDING_STEPS: Step[] = [
  {
    id: 1,
    title: '欢迎使用 SyncSeeker',
    description: 'SKYline新一代连飞地图，实时追踪全球连飞航班，查看在线管制员',
    imageMobile: mobile_1,
    imageDesktop: pc_1
  },
  {
    id: 2,
    title: '查看在线飞行员',
    description: '点击地图上的飞机图标查看航班详情，追踪飞行路径，分享航班信息',
    imageMobile: mobile_2,
    imageDesktop: pc_2
  },
  {
    id: 3,
    title: '查看在线管制',
    description: '实时显示全球在线管制员和管制区域，查看管制频率和覆盖范围',
    imageMobile: mobile_3,
    imageDesktop: pc_3
  },
  {
    id: 4,
    title: '机场流量统计',
    description: '查看各机场起降航班统计，了解热门机场和航线信息',
    imageMobile: mobile_4,
    imageDesktop: pc_4
  },
  {
    id: 4,
    title: '机场大屏页面',
    description: '分机场浏览起落机组大屏数据，了解机场流量信息',
    imageMobile: mobile_5,
    imageDesktop: pc_5
  },
  {
    id: 5,
    title: '下载导航数据',
    description: '首次使用需要下载导航数据库，通常时间不会超过1分钟',
    imageMobile: mobile_6,
    imageDesktop: pc_6
  }
]

export default function OnboardingGuide() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [imagesLoaded, setImagesLoaded] = useState(false)

  useEffect(() => {
    // 检测是否为移动端
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    checkOnboardingStatus()
    
    // 预加载所有图片
    const preloadImages = async () => {
      const imagePromises = ONBOARDING_STEPS.flatMap(step => [
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = reject
          img.src = step.imageMobile
        }),
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = reject
          img.src = step.imageDesktop
        })
      ])
      
      try {
        await Promise.all(imagePromises)
        setImagesLoaded(true)
      } catch (e) {
        console.error('Failed to preload images:', e)
        // 即使加载失败也显示内容
        setImagesLoaded(true)
      }
    }
    
    preloadImages()
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // 检查是否已完成引导
      const hasCompletedOnboarding = localStorage.getItem('onboarding-completed')
      if (hasCompletedOnboarding === 'true') {
        setIsVisible(false)
        return
      }

      // 如果没有完成引导标记，显示引导
      setIsVisible(true)
    } catch (e) {
      console.error('Check onboarding status failed:', e)
      setIsVisible(true)
    }
  }

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setDirection('forward')
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection('backward')
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadError(false)
    
    try {
      await fetchAndStoreNavData()
      setDownloadComplete(true)
      
      // 下载完成后等待1秒再关闭
      setTimeout(() => {
        localStorage.setItem('onboarding-completed', 'true')
        setIsVisible(false)
      }, 1000)
    } catch (e) {
      console.error('Download nav data failed:', e)
      setDownloadError(true)
      setIsDownloading(false)
    }
  }

  if (!isVisible) {
    return null
  }

  const currentStepData = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const currentImage = isMobile ? currentStepData.imageMobile : currentStepData.imageDesktop

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* 步骤指示器 */}
          <div className={styles.indicators}>
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`${styles.indicator} ${index === currentStep ? styles.active : ''}`}
              />
            ))}
          </div>

          {/* 图片和文字内容 - 添加动画 */}
          <div key={currentStep} className={`${styles.stepContent} ${direction === 'forward' ? styles.slideInRight : styles.slideInLeft}`}>
            <div className={styles.imageWrapper}>
              {!imagesLoaded && (
                <div className={styles.imagePlaceholder}>
                  <CircularProgress size={40} />
                </div>
              )}
              <img 
                src={currentImage} 
                alt={currentStepData.title}
                className={`${styles.image} ${imagesLoaded ? styles.imageLoaded : ''}`}
              />
            </div>

            <div className={styles.textContent}>
              <h2 className={styles.title}>{currentStepData.title}</h2>
              <p className={styles.description}>{currentStepData.description}</p>
            </div>
          </div>

          {/* 按钮组 */}
          <div className={styles.actions}>
            {!isLastStep ? (
              <>
                {currentStep > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handlePrev}
                    className={styles.prevButton}
                  >
                    上一步
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleNext}
                  className={styles.nextButton}
                >
                  下一步
                </Button>
              </>
            ) : (
              <div className={styles.downloadSection}>
                {downloadComplete ? (
                  <Button
                    variant="contained"
                    className={styles.downloadButton}
                    disabled
                  >
                    下载完成
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={styles.downloadButton}
                    startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {isDownloading ? '下载中...' : '开始下载'}
                  </Button>
                )}
                {downloadError && (
                  <p className={styles.errorText}>下载失败，请重试</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
