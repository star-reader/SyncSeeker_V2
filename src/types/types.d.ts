interface Log {
  time: Date;
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface IndexedDBAirlines {
  icao: string;
  name: string;
}

interface IndexedDBAirports {
  icao: string;
  name: string;
  coordinates: [number, number];
}

interface IndexedDBFIRs {
  type: 'fir' | 'uir' | 'app'
  icao: string;
  name: string;
  geojson: GeoJSON.FeatureCollection;
}

interface NavDataVersion {
  bundle_id: number;
  airac_code: string;
  version_id: string;
  update_date: string;
}

interface TargetPilotData {
    "callsign": string,
    "departure": string,
    "arrival": string,
    "cid": string,
    "realname": string,
    "aircraft": string,
    "lnglat":number[],  //e.g. [121.826,43.909]
    "tracks": Array<number[]>, //历史航迹数组，包含lnglat[]格式
    "heading": number,
    "altitude": number,
    "speed": string,
    "altitudeArray": number[], // 与时间、速度对应的高度数据，如[32100, 32108, 32200]
    "speedArray": number[] // 与高度对应的速度数据，如[345, 346, 344]
    "squawk": string,
    "route": string,
    "onlineTime"?: number,
    "date"?: string
}

interface APIResponsePilotData {
    altitude: number;
    bank: number;
    callsign: string;
    cid: string;
    flight_plan: {
        flight_rules: string;
        aircraft: string;
        departure: string;
        arrival: string;
        alternate: string;
        cruise_tas: string;
        altitude: string;
        deptime: string;
        enroute_time: string;
        fuel_time: string;
        remarks: string;
        route: string;
    };
    groundspeed: number;
    heading: number;
    latitude: number;
    logon_time: string;
    longitude: number;
    name: string;
    pitch: number;
    rating: number;
    send_time: number;
    server: string;
    statics: Array<{
        HDG: number;
        Altitude: number;
        Speed: number;
        BankAngle: number;
        Pitch: number;
    }>;
    tracks: Array<{
        Lat: number;
        Lon: number;
    }>;
    transponder: number;
}