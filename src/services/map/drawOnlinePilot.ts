import pubsub from 'pubsub-js'
import type { OnlinePilot, OnlineData } from '../../types/fsd'
import addDynamicLayer from './addDynamicLayer'
import asyncLoadAssets from './asyncLoadAssets'
import { MAP_IDS, EVENTS } from '../../configs/constants'
import { useGetUserColor } from '../../hooks/theme/useTheme'
import { getAircraftAssetByType } from '../../utils/aircraft.ts'

const getPilotIcon = (_type: string | undefined) => getAircraftAssetByType(_type)

const drawPilotOnMap = (map: mapboxgl.Map, pilotList: OnlinePilot[]) => {
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        'type': 'FeatureCollection',
        'features': []
    }
    for (let item of pilotList) {
        const isEmergency = [7700, 7600, 7500].includes(item.transponder);

        geojson.features.push({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [item.longitude, item.latitude]
            },
            'properties': {
                'icon': getPilotIcon(item.flight_plan?.aircraft),
                'emergency': isEmergency ? 'true' : 'false',
                ...item
            }
        })
    }


    const source: mapboxgl.SourceSpecification = {
        'type': 'geojson',
        'data': geojson
    }

    const userColors = useGetUserColor()
    const layer: mapboxgl.LayerSpecification = {
        id: MAP_IDS.PILOT_LIST_LAYER,
        type:'symbol',
        source: MAP_IDS.PILOT_LIST_SOURCE,
        layout:{
            "icon-anchor":'center',
            "icon-image": ['get', 'icon'],
            "icon-rotate": ['get', 'heading'],
            "icon-pitch-alignment": "map",
            "icon-rotation-alignment": "map",
            'icon-ignore-placement':true,
            'icon-size': [
                'interpolate',
                ['exponential', 0.5],
                ['zoom'],
                2,
                0.07,
                4,
                0.1,
                6.5,
                0.12,
                7,
                0.135,
                8,
                0.138,
                10,
                0.14,
                12,
                0.142,
                13,
                0.144,
                14,
                0.145,
                15,
                0.152,
                15.5,
                0.166,
                16,
                0.18,
                16.5,
                0.28,
                17,
                0.3,
                17.4,
                0.33
            ],
            'icon-allow-overlap': true,
            "text-field":['get','callsign'],
            "text-variable-anchor": [
                "top",
                "bottom",
                "top-left",
                "top-right",
                "left",
                "right",
                "bottom-left",
                "bottom",
                "bottom-right"
            ],
            'text-size':[
                'interpolate',
                ['exponential', 0.5],
                ['zoom'],
                2,
                10,
                5,
                11,
                8,
                12
            ],
            'text-offset':[1.5, 1.5],
            'text-allow-overlap': true,
            'text-pitch-alignment':"viewport",
            'text-rotation-alignment':'viewport'
        },
            paint:{
                "icon-color":[
                    'case',
                    ['==',['get','emergency'],'true'],
                    'red',
                    userColors.icon
                ],
                'text-color': userColors.label,
                'text-halo-width':0,
                'text-halo-color':'white'
            }
        }

    addDynamicLayer(map, MAP_IDS.PILOT_LIST_SOURCE, source, layer, geojson)
}

export default async (map: mapboxgl.Map) => {
    let pilotList: OnlinePilot[] = []
    try {
        await asyncLoadAssets(map)
    } catch (_) {
        console.log('map: pilot list assets load failed')
    }
    pubsub.subscribe(EVENTS.ONLINE_DATA_UPDATE, (_, data: OnlineData) => {
        if (data.flights) {
            pilotList = data.flights
            drawPilotOnMap(map, pilotList)
        }
    })
}