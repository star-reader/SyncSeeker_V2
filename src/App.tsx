import { useEffect } from 'react'
import BasicMap from './components/map/BasicMap'
import TopNavBar from './components/navBar/TopNavBar'
import PilotList from './components/statistics/PilotList'
import pollingData from './apis/pollingData'

export default function App() {

    useEffect(() => {
        const stop = pollingData()
        return stop
    }, [])

    return (
        <>
            <TopNavBar />
            <BasicMap />
            <PilotList />
        </>
    )
}