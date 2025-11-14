interface AircraftMapping {
  icao: string;
  name: string;
}

export const aircraftTypes: AircraftMapping[] = [
  { icao: 'A318', name: 'A318' },
  { icao: 'A319', name: 'A319' },
  { icao: 'A320', name: 'A320-200' },
  { icao: 'A321', name: 'A321-200' },
  { icao: 'A20N', name: 'A320-251N' },
  { icao: 'A21N', name: 'A321-251N' },
  { icao: 'A332', name: 'A330-200' },
  { icao: 'A333', name: 'A330-300' },
  { icao: 'A338', name: 'A330-800' },
  { icao: 'A339', name: 'A330-900' },
  { icao: 'A359', name: 'A350-914' },
  { icao: 'A35K', name: 'A350-1000' },
  { icao: 'A342', name: 'A340-200' },
  { icao: 'A343', name: 'A340-300' },
  { icao: 'A345', name: 'A340-500' },
  { icao: 'A346', name: 'A340-600' },
  { icao: 'A388', name: 'A380-800' },
  { icao: 'B733', name: 'B737-300' },
  { icao: 'B734', name: 'B737-400' },
  { icao: 'B735', name: 'B737-500' },
  { icao: 'B736', name: 'B737-600' },
  { icao: 'B737', name: 'B737-700' },
  { icao: 'B738', name: 'B737-800' },
  { icao: 'B38M', name: 'B737 MAX 8' },
  { icao: 'B739', name: 'B737-900' },
  { icao: 'B744', name: 'B747-400' },
  { icao: 'B74F', name: 'B747-400F' },
  { icao: 'B748', name: 'B747-8' },
  { icao: 'B752', name: 'B757-200' },
  { icao: 'B753', name: 'B757-300' },
  { icao: 'B772', name: 'B777-200ER' },
  { icao: 'B77F', name: 'B777-F' },
  { icao: 'B77L', name: 'B777-200LR' },
  { icao: 'B77W', name: 'B777-300ER' },
  { icao: 'B788', name: 'B787-8' },
  { icao: 'B789', name: 'B787-9' },
  { icao: 'B78X', name: 'B787-10' }
]

export function getAircraftNameByICAO(icao: string): string | undefined {
  const aircraft = aircraftTypes.find(a => a.icao === icao)
  return aircraft?.name
}

export function getICAOByAircraftName(name: string): string | undefined {
  const aircraft = aircraftTypes.find(a => a.name === name)
  return aircraft?.icao
}

export function getAllAircraftNames(): string[] {
  return aircraftTypes.map(a => a.name)
}

export function getAllICAOCodes(): string[] {
  return aircraftTypes.map(a => a.icao)
}

export function getAircraftMapping(): AircraftMapping[] {
    return aircraftTypes
}