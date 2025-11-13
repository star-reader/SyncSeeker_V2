import { useEffect, useState } from 'react'
import BasicMap from './components/map/BasicMap'

export default function App() {
    const [dark, setDark] = useState(false)

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
        <>
            <BasicMap />
        </>
    )
}