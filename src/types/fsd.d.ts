import type { LngLat, Heading, Feet, Knots, Squawk } from './geo.d.ts'

interface BaseUser {
    cid: string;
    name: string;
    callsign: string;
    server: string;
    session_id: string;
    logon_time: string;
}

export type FlightRules = 'I' | 'V' | 'Y' | 'Z';

export interface FlightPlan {
    flight_rules: FlightRules;
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
}

export type ATCFacility = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface OnlineController extends BaseUser {
    frequency: string;
    facility: ATCFacility;
    rating: number;
    visual_range: number;
    text_atis: string[];
    latitude?: number;
    longitude?: number;
}

export interface OnlinePilot extends BaseUser {
    latitude: number;
    longitude: number;
    altitude: Feet;
    groundspeed: Knots;
    transponder: number;
    heading: Heading;
    bank: number;
    pitch: number;
    flight_plan?: FlightPlan | null;
}

export interface OnlineData {
    controllers: OnlineController[];
    flights: OnlinePilot[];
    atis: OnlineController[];
}

export interface SingleFlightData {
    aircraft: string;
    altitude: Feet;
    altitudeArray: Feet[];
    arrival: string;
    callsign: string;
    cid: string;
    departure: string;
    heading: Heading;
    lnglat: LngLat;
    realname: string;
    route: string;
    speed: Knots;
    speedArray: Knots[];
    squawk: Squawk;
    /** 历史航迹数组 */
    tracks: LngLat[];
}

export interface ATCRawData {
    cid: string;
    name: string; 
    callsign: string;
    frequency: string;
    latitude: number;
    longitude: number;
    facility: ATCFacility;
    rating: number;
    server: string;
    visual_range: number;
    text_atis: string[];
    session_id: string;
    logon_time: string;
}