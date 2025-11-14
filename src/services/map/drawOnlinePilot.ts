import pubsub from 'pubsub-js'
import matchSet from '../../configs/airplane/matchSet.json'
import type { OnlinePilot, OnlineData } from '../../types/fsd'
import addDynamicLayer from './addDynamicLayer'
import asyncLoadAssets from './asyncLoadAssets'

// v6的旧版代码cv来的
const getPilotIcon = (_type: string | undefined) => {
    if (!_type) return 'default'
    if (_type.indexOf('CON') != -1){
        return 'CONC'
    }
    let typeLength = _type.split('/')
    let type = typeLength[0]
    if (typeLength.length === 2){
        type = typeLength[0].length === 1 ? typeLength[1] : typeLength[0]
    }else if (typeLength.length === 3){
        type === typeLength[1]
    }
    for (let item of matchSet) {
        if (item.callsign === type) {
            return item.src
        }
    }
    return 'default'
}

const drawPilotOnMap = (map: mapboxgl.Map, pilotList: OnlinePilot[]) => {
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        'type': 'FeatureCollection',
        'features': []
    }
    for (let item of pilotList) {
        const isEmergency = [7700, 7600, 7500].includes(item.transponder);
        const color = isEmergency ? '#DC143C' : '#008080';

        geojson.features.push({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [item.longitude, item.latitude]
            },
            'properties': {
                'icon': getPilotIcon(item.flight_plan?.aircraft),
                'color': color,
                'emergency': isEmergency ? 'true' : 'false',
                ...item
            }
        })

        const source: mapboxgl.SourceSpecification = {
            'type': 'geojson',
            'data': geojson
        }

        const layer: mapboxgl.LayerSpecification = {
            id:'pilot-list-data',
            type:'symbol',
            source:'pilot-list-data',
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
                    '#EF8B33'
                ],
                'text-color': ['get','color'],
                'text-halo-width':0,
                'text-halo-color':'white'
            }
        }

        addDynamicLayer(map, 'pilot-list-data', source, layer, geojson)

    }
}

export default async (map: mapboxgl.Map) => {
    let pilotList: OnlinePilot[] = []
    try {
        await asyncLoadAssets(map)
    } catch (_) {
        console.log('map: pilot list assets load failed')
    }
    pubsub.subscribe('online-data-update', (_, data: OnlineData) => {
        if (data.flights) {
            pilotList = data.flights
            drawPilotOnMap(map, pilotList)
        }
    })
}