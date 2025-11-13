import { useEffect, useState } from 'react'
import { Search as SearchIcon, SettingTwo, Moon, SunOne } from '@icon-park/react'
import navfulllogo from '../../assets/logo/nav-full-logo.png'
import styles from './TopNavBar.module.scss'

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
    const el = document.getElementById('root')
    if (el) el.setAttribute('theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className={styles.navbar}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <img src={navfulllogo} alt="logo_Syncseeker" style={{ height: 48 }} />
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
          <button className={styles.iconButton} onClick={() => setDark(v => !v)} aria-label="toggle-theme">
            {dark ? <SunOne size={18} /> : <Moon size={18} />}
          </button>
          <button className={styles.iconButton} aria-label="settings">
            <SettingTwo size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}