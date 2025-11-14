import { useEffect, useState } from 'react'
import pubsub from 'pubsub-js'
import BasicMap from './components/map/BasicMap'
import TopNavBar from './components/navBar/TopNavBar'
// import PilotList from './components/statistics/PilotList'
import ControllerList from './components/statistics/ControllerList'
import pollingData from './apis/pollingData'
import PilotList from './components/statistics/PilotList'
import SettingsPanel from './components/settings/SettingsPanel'
import { EVENTS } from './configs/constants'

export default function App() {
    const [openedMenu, setOpenedMenu] = useState('')



    useEffect(() => {
        const stop = pollingData()
        return stop
    }, [])

    useEffect(() => {
        const token1 = pubsub.subscribe(EVENTS.MENU_SELECT, (_, data) => {
            setOpenedMenu(data)
        })
        const token2 = pubsub.subscribe(EVENTS.RETURN_TO_MAP, () => {
            setOpenedMenu('')
        })
        return () => {
            pubsub.unsubscribe(token1)
            pubsub.unsubscribe(token2)
        }
    })

    return (
        <>
            <TopNavBar />
            <BasicMap />
        <>
            {openedMenu === 'pilot' && <PilotList />}
            {openedMenu === 'controller' && <ControllerList />}
            {openedMenu === 'settings' && <SettingsPanel />}
        </>
        </>
    )
}