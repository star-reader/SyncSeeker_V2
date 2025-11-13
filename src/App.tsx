import { useEffect, useState } from 'react'
import pubsub from 'pubsub-js'
import BasicMap from './components/map/BasicMap'
import TopNavBar from './components/navBar/TopNavBar'
// import PilotList from './components/statistics/PilotList'
import ControllerList from './components/statistics/ControllerList'
import pollingData from './apis/pollingData'
import PilotList from './components/statistics/PilotList'

export default function App() {
    const [openedMenu, setOpenedMenu] = useState('')



    useEffect(() => {
        const stop = pollingData()
        return stop
    }, [])

    useEffect(() => {
        pubsub.subscribe('menu-select', (_, data) => {
            setOpenedMenu(data)
        })
        pubsub.subscribe('return-to-map', () => {
            setOpenedMenu('')
        })
    })

    return (
        <>
            <TopNavBar />
            <BasicMap />
            <>
                {openedMenu === 'pilot' && <PilotList />}
                {openedMenu === 'controller' && <ControllerList />}
            </>
        </>
    )
}