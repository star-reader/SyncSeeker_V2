// 基础用户接口
interface BaseUser {
    cid: string;
    name: string;
    callsign: string;
    server: string;
    session_id: string;
    logon_time: string;
}

// 飞行计划接口
export interface FlightPlan {
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
}

// 管制员接口
export interface OnlineController extends BaseUser {
    frequency: string;
    facility: number;
    rating: number;
    visual_range: number;
    text_atis: string[];
}

// 飞行员接口
export interface OnlinePilot extends BaseUser {
    latitude: number;
    longitude: number;
    altitude: number;
    groundspeed: number;
    transponder: number;
    heading: number;
    bank: number;
    pitch: number;
    flight_plan?: FlightPlan;
}

// 在线数据接口
export interface OnlineData {
    controllers: OnlineController[];
    flights: OnlinePilot[];
    atis: OnlineController[]
}

export interface SingleFlightData {
    aircraft: string;
    altitude: number;
    altitudeArray: number[];
    arrival: string;
    callsign: string;
    cid: string;
    departure: string;
    heading: number;
    lnglat: [number, number];
    realname: string;
    route: string;
    speed: number;
    speedArray: number[];
    squawk: number;
    teacks: number[][]
}

export interface ATCRawData {
    cid: string;
    name: string; 
    callsign: string;
    frequency: string;
    latitude: number;
    longitude: number;
    facility: number;
    rating: number;
    server: string;
    visual_range: number;
    text_atis: string[];
    session_id: string;
    logon_time: string;
}