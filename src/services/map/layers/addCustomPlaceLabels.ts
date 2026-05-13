import mapboxgl from 'mapbox-gl'

const PROVINCE_LABEL_LAYER_ID = 'custom-province-label'
const CITY_LABEL_LAYER_ID = 'custom-city-label'
const PLACE_SOURCE_ID = 'composite'
const PLACE_SOURCE_LAYER = 'place_label'

const getLabelText = () => [
  'coalesce',
  ['get', 'name_zh-Hans'],
  ['get', 'name_zh'],
  ['get', 'name'],
  ['get', 'name_en']
]

const ensureProvinceLayer = (map: mapboxgl.Map) => {
  if (map.getLayer(PROVINCE_LABEL_LAYER_ID)) return
  map.addLayer({
    id: PROVINCE_LABEL_LAYER_ID,
    type: 'symbol',
    source: PLACE_SOURCE_ID,
    'source-layer': PLACE_SOURCE_LAYER,
    minzoom: 3,
    maxzoom: 11,
    filter: [
      'in',
      ['get', 'class'],
      ['literal', ['state', 'province', 'region', 'state_label']]
    ],
    layout: {
      'text-field': getLabelText(),
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 6, 13, 9, 16],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-letter-spacing': 0.02,
      'text-max-width': 9,
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#1f2937',
      'text-halo-color': 'rgba(255,255,255,0.92)',
      'text-halo-width': 1.3,
      'text-halo-blur': 0.6
    }
  })
}

const ensureCityLayer = (map: mapboxgl.Map) => {
  if (map.getLayer(CITY_LABEL_LAYER_ID)) return
  map.addLayer({
    id: CITY_LABEL_LAYER_ID,
    type: 'symbol',
    source: PLACE_SOURCE_ID,
    'source-layer': PLACE_SOURCE_LAYER,
    minzoom: 4,
    filter: [
      'in',
      ['get', 'class'],
      ['literal', ['settlement', 'settlement_major', 'city', 'town']]
    ],
    layout: {
      'text-field': getLabelText(),
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 6, 12, 8, 14],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-max-width': 9,
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': 'rgba(255,255,255,0.94)',
      'text-halo-width': 1.2,
      'text-halo-blur': 0.5
    }
  })
}

export default function addCustomPlaceLabels(map: mapboxgl.Map) {
  if (!map.getSource(PLACE_SOURCE_ID)) return
  try {
    ensureProvinceLayer(map)
    ensureCityLayer(map)
  } catch {}
}

