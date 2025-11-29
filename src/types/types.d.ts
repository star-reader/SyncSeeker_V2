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
