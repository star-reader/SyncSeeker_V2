import { useEffect, useState } from 'react'
import { CloseSmall, CheckSmall, Airplane, SettingTwo } from '@icon-park/react'
import pubsub from 'pubsub-js'

export default function BoardOptions() {
  const [icao, setIcao] = useState('')
  const [showAtis, setShowAtis] = useState(true)

  useEffect(() => {
    const savedIcao = localStorage.getItem('board.airport') || ''
    const savedAtis = localStorage.getItem('board.showAtis')
    setIcao(savedIcao)
    setShowAtis(savedAtis ? savedAtis === 'true' : true)
  }, [])

  useEffect(() => {
    localStorage.setItem('board.airport', icao.toUpperCase())
  }, [icao])

  useEffect(() => {
    localStorage.setItem('board.showAtis', String(showAtis))
  }, [showAtis])

  const close = () => {
    pubsub.publish('menu-select', 'map')
  }

  return (
    <div style={{
      position: 'fixed',
      left: 12,
      right: 12,
      top: 64,
      bottom: 12,
      zIndex: 100,
      display: 'grid',
      gridTemplateRows: '56px 1fr',
      gap: 12,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderRadius: 12,
        border: '1px solid var(--sky-border-color)',
        background: 'color-mix(in srgb, var(--sky-bg-color-base) 82%, transparent)',
        backdropFilter: 'saturate(120%) blur(10px)',
        padding: '0 12px',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>机场大屏选项</div>
        <div style={{ flex: 1 }} />
        <button onClick={close} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
          border: '1px solid var(--sky-border-color)',
          background: 'color-mix(in srgb, var(--sky-fill-color) 75%, transparent)'
        }}>
          <CloseSmall size={16} />
          <span>返回地图</span>
        </button>
      </div>

      <div style={{
        borderRadius: 12,
        border: '1px solid var(--sky-border-color)',
        background: 'color-mix(in srgb, var(--sky-bg-color-base) 82%, transparent)',
        backdropFilter: 'saturate(120%) blur(10px)',
        padding: 16,
        overflow: 'auto',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Airplane size={18} />
            <span>机场 ICAO</span>
          </div>
          <input
            value={icao}
            onChange={e => setIcao(e.target.value)}
            placeholder="例如 ZBAA"
            style={{
              width: '100%', height: 36, borderRadius: 10,
              border: '1px solid var(--sky-border-color)',
              background: 'color-mix(in srgb, var(--sky-fill-color) 65%, transparent)',
              outline: 'none', padding: '0 12px',
              color: 'var(--sky-text-color-primary)'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SettingTwo size={18} />
            <span>显示 ATIS</span>
          </div>
          <button onClick={() => setShowAtis(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            borderRadius: 10, height: 36, padding: '0 12px', cursor: 'pointer',
            border: '1px solid var(--sky-border-color)',
            background: showAtis ? 'color-mix(in srgb, var(--sky-color-success) 22%, transparent)' : 'color-mix(in srgb, var(--sky-fill-color) 75%, transparent)',
            color: 'var(--sky-text-color-primary)'
          }}>
            <CheckSmall size={16} />
            <span>{showAtis ? '开启' : '关闭'}</span>
          </button>
        </div>

        <div style={{
          marginTop: 8,
          borderRadius: 12,
          border: '1px solid var(--sky-border-color)',
          background: 'color-mix(in srgb, var(--sky-fill-color) 65%, transparent)',
          padding: 12,
          display: 'grid', gap: 8
        }}>
          <div style={{ opacity: 0.8 }}>
            当前设置已保存到本地。
          </div>
          <div style={{ opacity: 0.6 }}>
            后续将基于此生成机场大屏展示。
          </div>
        </div>
      </div>
    </div>
  )
}