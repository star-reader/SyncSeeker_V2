import { useEffect } from "react"
import mapboxgl from 'mapbox-gl'
import style from './BasicMap.module.scss'

export default () => {

    let map: mapboxgl.Map

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
        map = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [120.128029, 30.267153],
            zoom: 13
        })
    }, [])

    return (
        <div id="map-container" className={style['map-container']}></div>
    )
}