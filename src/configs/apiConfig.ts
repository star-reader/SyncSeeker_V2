export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// interface APIEndpoint  {
//     url: string,
//     params: {
//         [key: string]: string | number | boolean | undefined
//     }
// }

export const apiEndpoints: Record<string, string> = {
    getOnlineList: `${API_BASE_URL}/online-list`,
    getPilotById: `${API_BASE_URL}/pilot/detail/{id}`,
    getPilotTrack: `${API_BASE_URL}/pilot/request-track/{id}`,
    getControllerById: `${API_BASE_URL}/controller/detail/{id}`,
    getFlightByCallsign: `${API_BASE_URL}/flight/by-callsign/{callsign}`,
    getAirportTraffic: `${API_BASE_URL}/airport/traffic/{icao}`,
}