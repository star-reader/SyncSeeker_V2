/**
 * Toast Component
 * 
 * 全局提示组件，用于显示操作反馈
 * 
 * @author Jerry Jin
 * @date 2025-12-05
 */
import { useEffect, useState } from 'react'
import pubsub from 'pubsub-js'
import styles from './Toast.module.scss'
import IconByName from './IconByName'

interface ToastMessage {
    id: number
    type: 'success' | 'info' | 'warning' | 'error'
    message: string
    icon?: string
}

export const TOAST_SHOW = 'toast-show'

// 显示 Toast 的工具函数
export const showToast = (message: string, type: ToastMessage['type'] = 'info', icon?: string) => {
    pubsub.publish(TOAST_SHOW, { message, type, icon })
}

let toastId = 0

export default function Toast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    useEffect(() => {
        const token = pubsub.subscribe(TOAST_SHOW, (_, data: { message: string, type: ToastMessage['type'], icon?: string }) => {
            const id = ++toastId
            const newToast: ToastMessage = {
                id,
                type: data.type,
                message: data.message,
                icon: data.icon
            }
            
            setToasts(prev => [...prev, newToast])
            
            // 3秒后自动移除
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id))
            }, 3000)
        })

        return () => { pubsub.unsubscribe(token) }
    }, [])

    if (toasts.length === 0) return null

    const getIcon = (toast: ToastMessage) => {
        if (toast.icon) return toast.icon
        switch (toast.type) {
            case 'success': return 'CheckOne'
            case 'warning': return 'Attention'
            case 'error': return 'CloseOne'
            default: return 'Info'
        }
    }

    return (
        <div className={styles.container}>
            {toasts.map(toast => (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                    <IconByName name={getIcon(toast)} />
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    )
}
