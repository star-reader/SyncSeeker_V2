import { useEffect, useState } from 'react'
import { Search as SearchIcon, SettingTwo, Moon, SunOne, More } from '@icon-park/react'
import pubsub from 'pubsub-js'
import navfulllogo from '../../assets/logo/nav-full-logo.png'
// import LiquidGlassWrapper from '../common/LiquidGlassWarpper'
import styles from './TopNavBar.module.scss'
import { useSetCurrentTheme } from '../../hooks/theme/useTheme'

export default function TopNavBar() {
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')

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

              <div className={styles.searchBox}>
                <SearchIcon className={styles.searchIcon} size={18} />
                <input
                  className={styles.input}
                  placeholder="搜索"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>

              <div className={styles.actions}>
                <button className={styles.iconButton} onClick={() => handleThemeChange(dark ? 'light' : 'dark')} aria-label="toggle-theme">
                  {dark ? <SunOne size={18} /> : <Moon size={18} />}
                </button>
                <button className={styles.iconButton} aria-label="settings">
                  <SettingTwo size={18} />
                </button>
                <button className={styles.iconButton} aria-label="more">
                  <More size={18} />
                </button>
              </div>
            </div>
        </div>
    // </LiquidGlassWrapper>
  )
}