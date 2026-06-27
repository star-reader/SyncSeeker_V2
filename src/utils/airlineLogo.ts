const DEFAULT_AIRLINE_PIC_BASE_URL = 'https://api.skylineflyleague.cn/efb/public-navdata/airlines'

export const getAirlineIcaoFromCallsign = (callsign?: string | null): string | null => {
  const match = callsign?.trim().toUpperCase().match(/^[A-Z]{3}/)
  return match?.[0] || null
}

export const getAirlineLogoUrl = (callsign?: string | null): string | null => {
  const airlineIcao = getAirlineIcaoFromCallsign(callsign)
  const baseUrl = import.meta.env.VITE_AIRLINE_PIC_BASE_URL || DEFAULT_AIRLINE_PIC_BASE_URL
  if (!airlineIcao || !baseUrl) return null
  return `${String(baseUrl).replace(/\/$/, '')}/${airlineIcao}.png`
}
