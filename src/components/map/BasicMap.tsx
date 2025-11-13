import { useEffect, useRef } from "react"
import mapboxgl from 'mapbox-gl'
import pubsub from 'pubsub-js'
import style from './BasicMap.module.scss'
import { useGetCurrentTheme } from "../../hooks/theme/useTheme"

export default function BasicMap() {
    const mapRef = useRef<mapboxgl.Map | null>(null)
    let map: mapboxgl.Map

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
        mapRef.current = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/standard',
            center: [120.128029, 30.267153],
            zoom: 6,
            config: {
                basemap: {
                    lightPreset: useGetCurrentTheme() === 'dark' ? 'night' : 'day',
                    showPointOfInterestLabels: false,
                }
            }
        })
        map = mapRef.current
        initMapCoord()
        addMapControls()
        bindMapEventListener()
        return () => {
            mapRef.current?.remove()
            mapRef.current = null
        }
    }, [])

    useEffect(() => {
        pubsub.subscribe('theme-change', (_, theme: string) => {
            if (theme === 'dark') {
                map.setConfigProperty('basemap', 'lightPreset', 'night');
            } else {
                map.setConfigProperty('basemap', 'lightPreset', 'day');
            }
        })
    }, [])

    const initMapCoord = () => {
        const zoom: string | null = localStorage.getItem('map-zoom')
        const center: string | null = localStorage.getItem('map-center')
        if (zoom) {
            map.setZoom(parseFloat(zoom))
        } else {
            localStorage.setItem('map-zoom', map.getZoom().toString())
        }
        if (center) {
            let lng: number = parseFloat(center.split('LngLat(')[1].split(',')[0].trim())
            let lat: number = parseFloat(center.split(',')[1].split(')')[0].trim())
            map.setCenter([lng, lat])
        } else {
            localStorage.setItem('map-center', map.getCenter().toString())
        }
    }

    const addMapControls = () => {
        if (!map) return
        const scale = new mapboxgl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        })
        map.addControl(scale, 'bottom-right')
        // map.addControl(new mapboxgl.AttributionControl({
        //     compact: true,
        //     customAttribution: 'SKYline SyncSeeker Beta | 仅限模拟飞行使用 | 禁止用于实际飞行'
        // }))
    }

    const bindMapEventListener = () => {
        if (!map) return
        map.on('zoomend', () => {
            localStorage.setItem('map-zoom', map.getZoom().toString())
            localStorage.setItem('map-center', map.getCenter().toString())
        })
        map.on('dragend', () => {
            localStorage.setItem('map-center', map.getCenter().toString())
        })
        map.once('style.load', async () => {
            // 现在还没
        })

        map.on('click', (e) => {
            const layers = map.queryRenderedFeatures(e.point)
            for (let i of layers) {
                if (!i.layer || !i.layer.id) continue
                // 预留其他
            }
        })
    }

    return (
        <div id="map-container" className={style['map-container']}></div>
    )
}