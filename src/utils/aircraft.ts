import matchSet from '../configs/airplane/matchSet.json'
import { getICAOByAircraftName } from '../configs/airplane/aircraftTypes'

function normalizeAircraftCode(input?: string): string | null {
  if (!input) return null
  let s = input.toUpperCase().trim()
  s = s.replace(/\s+/g, '')
  if (s.includes('CON')) return 'CONC'
  const parts = s.split('/')
  if (parts.length > 1) {
    const candidates = parts.filter(p => p.length >= 3)
    s = candidates[0] || parts[parts.length - 1]
  }
  s = s.replace(/-/g, '')
  const byName = getICAOByAircraftName(s)
  if (byName) s = byName
  return s
}

const assetMap = new Map<string, string>(matchSet.map(i => [i.callsign.toUpperCase(), i.src]))

export function getAircraftAssetByType(input?: string): string {
  const code = normalizeAircraftCode(input)
  if (!code) return 'default'
  const asset = assetMap.get(code)
  return asset || 'default'
}