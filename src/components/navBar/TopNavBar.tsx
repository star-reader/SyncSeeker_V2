/**
 * TopNavBar Component
 * 
 * 顶部导航栏组件。
 * 包含 Logo、主题切换、设置按钮以及功能菜单（机组列表、管制列表等）。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SettingTwo, Moon, SunOne, Info, 
  ListTop, RadarThree, Airplane, More, DownloadOne } from '@icon-park/react'
import pubsub from 'pubsub-js'
import { isTauri as _isTauri } from '@tauri-apps/api/core'
import navfulllogo from '../../assets/logo/nav-full-logo.png'
// import LiquidGlassWrapper from '../common/LiquidGlassWarpper'
import styles from './TopNavBar.module.scss'
import { useSetCurrentTheme } from '../../hooks/theme/useTheme'
import { useThemeStore } from '../../stores/useThemeStore'
import { EVENTS } from '../../configs/constants'
import useClickOutside from '../../hooks/useClickOutside'

const COMMAND_TRIGGER_SELECTOR = '[data-command-trigger="true"]'
const COMMAND_IGNORE_SELECTORS = [COMMAND_TRIGGER_SELECTOR]

type CommandItem = {
  key: string
  title: string
  description: string
  icon: ReactNode
  action: () => void
}

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
    
    const checkShowInstall = () => {
      const isTauri = _isTauri()
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isPWA = isStandalone || isIOSStandalone
      setShowInstallButton(!isTauri && !isPWA)
    }
    
    checkShowInstall()
  }, [theme])

  const handleThemeChange = (newTheme: string) => {
    useSetCurrentTheme(newTheme)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleSelect = useCallback((key: string) => {
    setMenuOpen(false)
    pubsub.publish(EVENTS.MENU_SELECT, key)
  }, [])

  useClickOutside(menuRef, () => setMenuOpen(false), {
    enabled: menuOpen,
    ignoreSelectors: COMMAND_IGNORE_SELECTORS
  })

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        key: 'pilot',
        title: '在线机组',
        description: '查看航班、机型、航路与在线时长',
        icon: <ListTop size={18} />,
        action: () => handleSelect('pilot')
      },
      {
        key: 'controller',
        title: '在线管制',
        description: '查看席位、频率与覆盖范围',
        icon: <RadarThree size={18} />,
        action: () => handleSelect('controller')
      },
      {
        key: 'board',
        title: '机场大屏',
        description: '按机场查看进离港动态',
        icon: <Airplane size={18} />,
        action: () => handleSelect('board')
      }
    ]

    if (showInstallButton) {
      items.push({
        key: 'install',
        title: '安装应用',
        description: '添加到桌面，获得更沉浸的使用体验',
        icon: <DownloadOne size={18} />,
        action: () => {
          setMenuOpen(false)
          pubsub.publish(EVENTS.INSTALL_APP_CLICK)
        }
      })
    }

    items.push({
      key: 'about',
      title: '关于系统',
      description: '版本、作者与项目说明',
      icon: <Info size={18} />,
      action: () => handleSelect('about')
    })

    return items
  }, [handleSelect, showInstallButton])

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
                <button
                  ref={moreBtnRef}
                  className={`${styles.iconButton} ${menuOpen ? styles.iconButtonActive : ''}`}
                  aria-label="more"
                  aria-haspopup="dialog"
                  aria-expanded={menuOpen}
                  data-command-trigger="true"
                  onClick={() => setMenuOpen(v => !v)}
                >
                  <More size={18} />
                </button>
                <div className={styles.commandScrim} data-open={menuOpen ? 'true' : 'false'} />
                <div ref={menuRef} className={styles.commandPanel} data-open={menuOpen ? 'true' : 'false'} role="dialog" aria-label="快捷操作">
                  <div className={styles.commandHandle} aria-hidden="true" />
                  <div className={styles.commandHeader}>
                    <div>
                      <div className={styles.commandTitle}>快捷操作</div>
                      <div className={styles.commandSubtitle}>选择一个视图或系统操作</div>
                    </div>
                  </div>
                  <div className={styles.commandList}>
                    {commands.map(item => (
                      <button key={item.key} className={styles.commandItem} onClick={item.action}>
                        <span className={styles.commandIcon}>{item.icon}</span>
                        <span className={styles.commandText}>
                          <span className={styles.commandItemTitle}>{item.title}</span>
                          <span className={styles.commandDesc}>{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>
    // </LiquidGlassWrapper>
  )
}
