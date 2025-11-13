import { useEffect, useRef, useState } from 'react'
import { Search as SearchIcon, SettingTwo, Moon, SunOne, 
  ListTop, RadarThree, Airplane, More } from '@icon-park/react'
import pubsub from 'pubsub-js'
import navfulllogo from '../../assets/logo/nav-full-logo.png'
// import LiquidGlassWrapper from '../common/LiquidGlassWarpper'
import styles from './TopNavBar.module.scss'
import { useSetCurrentTheme } from '../../hooks/theme/useTheme'

export default function TopNavBar() {
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefers
    setDark(isDark)
    const el = document.getElementById('root')
    if (el) el.setAttribute('theme', isDark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    const token = pubsub.subscribe('theme-change', (_, data: string) => {
      setDark(data === 'dark')
      useSetCurrentTheme(data)
    })
    return () => {
      pubsub.unsubscribe(token)
    }
  }, [])

  const handleThemeChange = (theme: string) => {
    setDark(theme === 'dark')
    pubsub.publish('theme-change', theme)
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

  const handleSelect = (key: 'map' | 'crew' | 'atc' | 'board') => {
    setMenuOpen(false)
    pubsub.publish('menu-select', key)
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
                <button className={styles.iconButton} onClick={() => handleThemeChange(dark ? 'light' : 'dark')} aria-label="toggle-theme">
                  {dark ? <SunOne size={18} /> : <Moon size={18} />}
                </button>
                <button className={styles.iconButton} aria-label="settings">
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
                  <button className={styles.menuItem} onClick={() => handleSelect('crew')}>
                    <span className={styles.menuIcon}>
                      <ListTop size={18} />
                    </span>
                    <span className={styles.menuLabel}>在线机组列表</span>
                  </button>
                  <button className={styles.menuItem} onClick={() => handleSelect('atc')}>
                    <span className={styles.menuIcon}>
                      <RadarThree size={18} />
                    </span>
                    <span className={styles.menuLabel}>在线管制列表</span>
                  </button>
                  <button className={styles.menuItem} onClick={() => handleSelect('board')}>
                    <span className={styles.menuIcon}>
                      <Airplane size={18} />
                    </span>
                    <span className={styles.menuLabel}>机场大屏选项</span>
                  </button>
                </div>
              </div>
            </div>
        </div>
    // </LiquidGlassWrapper>
  )
}