import { useEffect, useRef } from "react"
import mapboxgl from 'mapbox-gl'
import style from './BasicMap.module.scss'

export default function BasicMap() {
    const mapRef = useRef<mapboxgl.Map | null>(null)

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
        mapRef.current = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [120.128029, 30.267153],
            zoom: 13
        })
        return () => {
            mapRef.current?.remove()
            mapRef.current = null
        }
    }, [])

    return (
        <div id="map-container" className={style['map-container']}></div>
    )
}