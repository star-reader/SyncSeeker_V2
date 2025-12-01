import useGenerateColor from "./thresholdColorGenerator"
import fix180Crossing from "../../utils/fix180Crossing"

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

const isValidNext = (index: number, arr: any[]) => {
    return index >= arr.length -1 ? false : true
}

export default (target: TargetPilotData) => {
    let geoJSON_line: geoLine = {
        'type':'FeatureCollection',
        'features':[]
    }

    if (!target.tracks || target.tracks.length === 0) return geoJSON_line

    // Fix 180 degree crossing for 2D tracks as well
    const tracks = fix180Crossing(target.tracks)

    for (let i = 0; i < tracks.length ; i++){
        let item = tracks[i]
        geoJSON_line.features.push({
            'type':'Feature',
            'properties':{
                'color': useGenerateColor(target.altitudeArray ? (target.altitudeArray[i] || 0) : 0)
            },
            'geometry':{
                'coordinates': isValidNext(i, tracks) ? [item, tracks[i+1]] : [item, item],
                'type':'LineString'
            }
        })
    }
    return geoJSON_line
}