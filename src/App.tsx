import { useEffect, useState } from 'react'
import pubsub from 'pubsub-js'
import BasicMap from './components/map/BasicMap'
import TopNavBar from './components/navBar/TopNavBar'
import PilotList from './components/statistics/PilotList'
import ControllerList from './components/statistics/ControllerList'
import BoardOptions from './components/board/BoardOptions'
import startPolling from './apis/pollingData'

export default function App() {
    const [view, setView] = useState<'map' | 'crew' | 'atc' | 'board'>('map')

    useEffect(() => {
        const token = pubsub.subscribe('menu-select', (_, key: 'map' | 'crew' | 'atc' | 'board') => {
            setView(key)
        })
        return () => {
            pubsub.unsubscribe(token)
        }
    }, [])

    useEffect(() => {
        startPolling()
    }, [])

  return (
    <>
      <TopNavBar />
      <BasicMap />
      {view === 'crew' && <PilotList />}
      {view === 'atc' && <ControllerList />}
      {view === 'board' && <BoardOptions />}
    </>
  )
}