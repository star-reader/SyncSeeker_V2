import useGenerateColor from "./thresholdColorGenerator"
import preprocessTrackData from "../../utils/preprocessTrackData"

interface LineCollection {
    'type': 'Feature',
    'properties': {
        'altitude'?: number,
        'color': string
    },
    'geometry': {
        'coordinates': any[],
        'type': 'Polygon' | 'LineString'
    }
}

interface geoLine {
    'type': 'FeatureCollection',
    'features': LineCollection[]
}


export default (target: TargetPilotData) => {
    let geoJSON_line: geoLine = {
        'type':'FeatureCollection',
        'features':[]
    }

    if (!target.tracks || target.tracks.length === 0) return geoJSON_line
    // Fix 180 degree crossing for 2D tracks as well
    const tracks = preprocessTrackData(target.tracks)

    if (!tracks || tracks.length < 2) return geoJSON_line

    for (let i = 0; i < tracks.length - 1; i++){
        const item = tracks[i]
        const nextItem = tracks[i+1]

        // Strict safety check to prevent Mapbox errors
        if (!item || item.length < 2 || !nextItem || nextItem.length < 2) continue
        if (isNaN(item[0]) || isNaN(item[1]) || isNaN(nextItem[0]) || isNaN(nextItem[1])) continue

        geoJSON_line.features.push({
            'type':'Feature',
            'properties':{
                'color': useGenerateColor(target.altitudeArray ? (target.altitudeArray[i] || 0) : 0)
            },
            'geometry':{
                'coordinates': [item, nextItem],
                'type':'LineString'
            }
        })
    }
    return geoJSON_line
}