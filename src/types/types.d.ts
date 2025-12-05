import type { LngLat, Heading, Feet, Knots, Squawk } from './geo.d.ts'

export interface Log {
  time: Date;
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface IndexedDBAirlines {
  icao: string;
  name: string;
}

export interface IndexedDBAirports {
  icao: string;
  name: string;
  coordinates: LngLat;
}

export interface IndexedDBFIRs {
  type: 'fir' | 'uir' | 'app'
  icao: string;
  name: string;
  geojson: GeoJSON.FeatureCollection;
}

export interface NavDataVersion {
  bundle_id: number;
  airac_code: string;
  version_id: string;
  update_date: string;
}

export interface TargetPilotData {
    callsign: string;
    departure: string;
    arrival: string;
    cid: string;
    realname: string;
    aircraft: string;
    lnglat: LngLat;
    /** 历史航迹数组，每个元素为 [lng, lat] */
    tracks: LngLat[];
    heading: Heading;
    altitude: Feet;
    speed: Knots;
    /** 与时间对应的高度数据，如 [32100, 32108, 32200] */
    altitudeArray: Feet[];
    /** 与高度对应的速度数据，如 [345, 346, 344] */
    speedArray: Knots[];
    squawk: Squawk;
    route: string;
    onlineTime?: number;
    date?: string;
}

export interface APIResponsePilotData {
    altitude: Feet;
    bank: number;
    callsign: string;
    cid: string;
    flight_plan: {
        flight_rules: 'I' | 'V' | 'Y' | 'Z';
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
    } | null;
    groundspeed: Knots;
    heading: Heading;
    latitude: number;
    logon_time: string;
    longitude: number;
    name: string;
    pitch: number;
    rating: number;
    send_time: number;
    server: string;
    statics: Array<{
        HDG: Heading;
        Altitude: Feet;
        Speed: Knots;
        BankAngle: number;
        Pitch: number;
    }>;
    tracks: Array<{
        Lat: number;
        Lon: number;
    }>;
    transponder: number;
}

declare global {
    type Log = import('./types').Log;
    type IndexedDBAirlines = import('./types').IndexedDBAirlines;
    type IndexedDBAirports = import('./types').IndexedDBAirports;
    type IndexedDBFIRs = import('./types').IndexedDBFIRs;
    type NavDataVersion = import('./types').NavDataVersion;
    type TargetPilotData = import('./types').TargetPilotData;
    type APIResponsePilotData = import('./types').APIResponsePilotData;
}
