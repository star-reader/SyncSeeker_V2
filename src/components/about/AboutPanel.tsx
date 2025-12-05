/**
 * AboutPanel Component
 * 
 * 关于系统面板组件
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */
import { useState, useEffect } from 'react'
import pubsub from 'pubsub-js'
import { Close, RoadSign, ThumbsUp, Lightning, 
    Info, Shield, Github, SendEmail} from '@icon-park/react'
import styles from './AboutPanel.module.scss'
import { EVENTS } from '../../configs/constants'
import aboutStasticInfo from '../../configs/aboutStasticInfo'
import logo from '../../assets/logo/nav-full-logo.png'

type TabKey = 'roadmap' | 'credits' | 'changelog' | 'about' | 'privacy'

interface TabItem {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const tabs: TabItem[] = [
  { key: 'about', label: '关于', icon: <Info size={16} /> },
  { key: 'roadmap', label: '路线图', icon: <RoadSign size={16} /> },
  { key: 'changelog', label: '更新日志', icon: <Lightning size={16} /> },
  { key: 'credits', label: '致谢', icon: <ThumbsUp size={16} /> },
  { key: 'privacy', label: '隐私', icon: <Shield size={16} /> },
]

export default function AboutPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('about')

  useEffect(() => {
    const token = pubsub.subscribe(EVENTS.MENU_SELECT, (_, key: string) => {
      if (key === 'about') {
        setOpen(true)
        setActiveTab('about')
      }
    })
    return () => { pubsub.unsubscribe(token) }
  }, [])

  const handleClose = () => {
    setOpen(false)
    pubsub.publish(EVENTS.RETURN_TO_MAP, 'about')
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.tabs}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={styles.tab}
                data-active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <Close size={18} />
          </button>
        </div>
        <div className={styles.content}>
          {activeTab === 'about' && <AboutContent />}
          {activeTab === 'roadmap' && <RoadmapContent />}
          {activeTab === 'changelog' && <ChangelogContent />}
          {activeTab === 'credits' && <CreditsContent />}
          {activeTab === 'privacy' && <PrivacyContent />}
        </div>
      </div>
    </div>
  )
}

function AboutContent() {
  return (
    <div className={styles.aboutSection}>
      <div className={styles.logoArea}>
        <img src={logo} alt="SyncSeeker" className={styles.logo} />
        <div className={styles.appInfo}>
          <h1>SyncSeeker</h1>
          <p className={styles.version}>Version {aboutStasticInfo.version_basic.current_version}</p>
          <p className={styles.tagline}>实时连飞航班追踪平台</p>
        </div>
      </div>
      <div className={styles.description}>
        <p>
          SyncSeeker 是一个专为模拟飞行爱好者打造的实时航班追踪平台，支持FSD格式的实时飞行数据展示，让您随时掌握平台连飞动态。
        </p>
      </div>
      <div className={styles.links}>
        <Github size={18} />
        <a href="https://github.com/star-reader/SyncSeeker_V2" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span className={styles.divider}>·</span>
        <SendEmail size={18} />
        <a href={`mailto:${aboutStasticInfo.version_basic.email_url}`}>联系开发者</a>
      </div>
      <p className={styles.copyright}>© 2025-{new Date().getFullYear()} SKYline Technical Team. All rights reserved.</p>
    </div>
  )
}

function RoadmapContent() {
  return (
    <div className={styles.roadmapSection}>
      <p className={styles.roadmapIntro}>
        以下是我们计划中的功能更新，实际发布时间可能会有所调整。
      </p>
      <div className={styles.roadmapList}>
        {aboutStasticInfo.road_map.map((item, idx) => (
          <div key={idx} className={styles.roadmapItem} data-status={item.status}>
            <div className={styles.roadmapVersion}>{item.version}</div>
            <div className={styles.roadmapContent}>
              <div className={styles.roadmapTitle}>{item.title}</div>
              <div className={styles.roadmapDesc}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangelogContent() {
  return (
    <div className={styles.changelogSection}>
      {aboutStasticInfo.changelogs.map((log, idx) => (
        <div key={idx} className={styles.changelogItem}>
          <div className={styles.changelogHeader}>
            <span className={styles.changelogVersion}>{log.version}</span>
            <span className={styles.changelogDate}>{log.date}</span>
          </div>
          <ul className={styles.changelogList}>
            {log.changes.map((change, cIdx) => (
              <li key={cIdx}>{change}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function CreditsContent() {
  return (
    <div className={styles.creditsSection}>
      <div className={styles.creditsGroup}>
        <h3>开源库</h3>
        <div className={styles.creditsList}>
          {aboutStasticInfo.third_party.map((lib, idx) => (
            <a key={idx} href={lib.url} target="_blank" rel="noopener noreferrer" className={styles.creditItem}>
              <span className={styles.creditName}>{lib.name}</span>
              <span className={styles.creditDesc}>{lib.desc}</span>
            </a>
          ))}
        </div>
      </div>
      <p className={styles.creditsNote}>
        感谢所有开源社区的贡献者，没有你们就没有这个项目。
      </p>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div className={styles.privacySection}>
      <h3>数据收集</h3>
      <p>
        SyncSeeker 不会收集任何个人身份信息。我们仅在本地存储您的偏好设置（如主题、颜色配置等），
        这些数据不会上传到任何服务器。
      </p>

      <h3>第三方服务</h3>
      <p>
        本应用使用的第三方服务可能会通过Cookie、LocalStorage储存其对应的服务信息以提升用户体验。
        数据可能会随网络请求携带上传，但全部数据收集均为匿名，且不包含任何个人身份信息。可能手机信息的服务有：
      </p>
      <ul>
        <li><strong>Mapbox</strong> - 地图服务，受Mapbox服务条款约束</li>
        <li><strong>RainViewer</strong> - 气象雷达数据</li>
      </ul>

      <h3>Cookies</h3>
      <p>
        本应用使用 localStorage 存储用户偏好设置，不使用Cookies进行用户追踪。
      </p>

      <h3>联系我们</h3>
      <p>
        如有任何隐私相关问题，请通过&nbsp;
            <a href={`mailto:${aboutStasticInfo.version_basic.email_url}`}>
                {aboutStasticInfo.version_basic.email_url}
            </a> 联系开发者。
      </p>
    </div>
  )
}
