/**
 * TopNavBar Component
 * 
 * 顶部导航栏组件。
 * 包含 Logo、主题切换、设置按钮以及功能菜单（机组列表、管制列表等）。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { useEffect, useRef, useState } from 'react'
import { SettingTwo, Moon, SunOne, Info, 
  ListTop, RadarThree, Airplane, More, DownloadOne } from '@icon-park/react'
import pubsub from 'pubsub-js'
import navfulllogo from '../../assets/logo/nav-full-logo.png'
// import LiquidGlassWrapper from '../common/LiquidGlassWarpper'
import styles from './TopNavBar.module.scss'
import { useSetCurrentTheme } from '../../hooks/theme/useTheme'
import { useThemeStore } from '../../stores/useThemeStore'
import { EVENTS } from '../../configs/constants'

/**
 * 导航栏
 * 
 * 功能：
 * - 响应式布局，适配不同屏幕尺寸。
 * - 主题切换 (Light/Dark)。
 * - 弹出式菜单 (Menu) 用于导航至不同功能模块。
 * - 全局事件发布 (EVENTS.MENU_SELECT, EVENTS.THEME_CHANGE)。
 */
export default function TopNavBar() {
  // 使用 Zustand Store 直接获取响应式状态
  const theme = useThemeStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  // const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const el = document.getElementById('root')
    if (el) el.setAttribute('theme', theme)
    
    // 检测是否需要显示"安装应用"按钮
    const checkShowInstall = () => {
      // 检查是否是Tauri应用
      const isTauri = '__TAURI__' in window
      
      // 检查是否已安装为PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isPWA = isStandalone || isIOSStandalone
      
      // 如果不是Tauri且不是PWA，则显示安装按钮
      setShowInstallButton(!isTauri && !isPWA)
    }
    
    checkShowInstall()
  }, [theme])

  const handleThemeChange = (newTheme: string) => {
    useSetCurrentTheme(newTheme)
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && moreBtnRef.current) {
        if (menuRef.current.contains(target) || moreBtnRef.current.contains(target)) return
      }
      setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleSelect = (key: string) => {
    setMenuOpen(false)
    pubsub.publish(EVENTS.MENU_SELECT, key)
  }

  return (
    // <LiquidGlassWrapper
    //   borderRadius="12px"
    //   className="navbar-container"
    //   style={{
    //     position: 'fixed',
    //     top: 0,
    //     left: 0,
    //     right: 0,
    //     padding: '12px 24px',
    //     zIndex: 1000
    //   }}
    // >
        <div className={`${styles.navbar} navbar-container`}>
            <div className={styles.inner}>
              <div className={styles.logo}>
                <img src={navfulllogo} alt="logo_Syncseeker"/>
              </div>

              {/* <div className={styles.searchBox}>
                <SearchIcon className={styles.searchIcon} size={18} />
                <input
                  className={styles.input}
                  placeholder="搜索"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div> */}

              <div className={styles.actions}>
                <button className={styles.iconButton} onClick={() => handleThemeChange(isDark ? 'light' : 'dark')} aria-label="toggle-theme">
                  {isDark ? <SunOne size={18} /> : <Moon size={18} />}
                </button>
                <button className={styles.iconButton} aria-label="settings" onClick={() => handleSelect('settings')}>
                  <SettingTwo size={18} />
                </button>
                <button ref={moreBtnRef} className={styles.iconButton} aria-label="more" onClick={() => setMenuOpen(v => !v)}>
                  <More size={18} />
                </button>
                <div ref={menuRef} className={styles.menu} data-open={menuOpen ? 'true' : 'false'}>
                  {/* 这个会用“返回地图”替换，所以取消显示“连飞地图”选项 */}
                  {/* <button className={styles.menuItem} onClick={() => handleSelect('map')}>
                    <span className={styles.menuIcon}>
                      <MapDraw size={18} />
                    </span>
                    <span className={styles.menuLabel}>连飞地图</span>
                  </button> */}
                  <button className={styles.menuItem} onClick={() => handleSelect('pilot')}>
                    <span className={styles.menuIcon}>
                      <ListTop size={18} />
                    </span>
                    <span className={styles.menuLabel}>在线机组</span>
                  </button>
                  <button className={styles.menuItem} onClick={() => handleSelect('controller')}>
                    <span className={styles.menuIcon}>
                      <RadarThree size={18} />
                    </span>
                    <span className={styles.menuLabel}>在线管制</span>
                  </button>
                  <button className={styles.menuItem} onClick={() => handleSelect('board')}>
                    <span className={styles.menuIcon}>
                      <Airplane size={18} />
                    </span>
                    <span className={styles.menuLabel}>机场大屏</span>
                  </button>
                  {showInstallButton && (
                    <button className={styles.menuItem} onClick={() => { setMenuOpen(false); pubsub.publish(EVENTS.INSTALL_APP_CLICK); }}>
                      <span className={styles.menuIcon}>
                        <DownloadOne size={18} />
                      </span>
                      <span className={styles.menuLabel}>安装应用</span>
                    </button>
                  )}
                  <button className={styles.menuItem} onClick={() => handleSelect('about')}>
                    <span className={styles.menuIcon}>
                      <Info size={18} />
                    </span>
                    <span className={styles.menuLabel}>关于系统</span>
                  </button>
                </div>
              </div>
            </div>
        </div>
    // </LiquidGlassWrapper>
  )
}
