/**
 * InstallGuidePanel Component
 * 
 * 应用安装引导组件
 * 
 * @author Jerry Jin
 * @date 2025-12-07
 */
import { useEffect, useRef } from 'react'
import pubsub from 'pubsub-js'
import { EVENTS } from '../../configs/constants'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallGuidePanel() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const shouldAutoPromptRef = useRef(false)

  useEffect(() => {
    // 监听PWA安装提示事件 - 必须调用 preventDefault() 来阻止浏览器默认行为
    const handleBeforeInstallPrompt = (e: Event) => {
      // 阻止浏览器默认的安装提示
      e.preventDefault()
      // 保存事件对象供后续使用
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      console.log('beforeinstallprompt event captured')
      
      // 如果之前已设置了需要自动提示，现在就触发
      if (shouldAutoPromptRef.current) {
        shouldAutoPromptRef.current = false
        // 延迟一下确保事件完全处理完成
        setTimeout(() => {
          pubsub.publish(EVENTS.INSTALL_APP_CLICK)
        }, 100)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 监听自动提示请求（从App.tsx发来）
    const autoPromptToken = pubsub.subscribe('INSTALL_APP_AUTO_PROMPT', () => {
      if (deferredPromptRef.current) {
        // 如果已经有了 prompt 事件，立即触发
        pubsub.publish(EVENTS.INSTALL_APP_CLICK)
      } else {
        // 如果还没有 prompt 事件，标记一下等事件到来时再触发
        shouldAutoPromptRef.current = true
        console.log('Waiting for beforeinstallprompt event...')
      }
    })

    // 监听安装应用点击事件
    const token = pubsub.subscribe(EVENTS.INSTALL_APP_CLICK, async () => {
      if (!deferredPromptRef.current) {
        console.log('PWA installation not available. Possible reasons:')
        console.log('1. Browser does not support PWA installation')
        console.log('2. App is already installed')
        console.log('3. PWA installation criteria not met')
        console.log('4. beforeinstallprompt event has not fired yet')
        return
      }

      try {
        // 调用 prompt() 显示安装提示
        await deferredPromptRef.current.prompt()
        
        // 等待用户响应
        const choiceResult = await deferredPromptRef.current.userChoice
        
        console.log(`Install prompt result: ${choiceResult.outcome}`)
        
        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem('pwa-installed', 'true')
        }
        
        // 清除已使用的事件对象
        deferredPromptRef.current = null
      } catch (error) {
        console.error('Error showing install prompt:', error)
      }
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      pubsub.unsubscribe(token)
      pubsub.unsubscribe(autoPromptToken)
    }
  }, [])

  // 这个组件不渲染任何UI，只负责监听事件和调用浏览器API
  return null
}
