import type { OnlinePilot } from "../types/fsd";

const lastSamples = new Map<string, { t: number, alt: number, gs: number }>()

function parsePlannedAltitude(a?: string): number | null {
    if (!a) return null
    const s = a.toUpperCase()
    const m = s.match(/\d+/)
    if (!m) return null
    const n = parseInt(m[0], 10)
    if (s.includes('FL') || m[0].length <= 3) return n * 100
    return n
}

function getVerticalSpeedFtMin(p: OnlinePilot): number | null {
    const key = p.session_id || p.cid
    const now = Date.now()
    const prev = lastSamples.get(key)
    lastSamples.set(key, { t: now, alt: p.altitude, gs: p.groundspeed })
    if (!prev) return null
    const dt = Math.max(1, (now - prev.t) / 1000)
    const diff = p.altitude - prev.alt
    return diff / dt * 60
}

function getStatus(p: OnlinePilot): string {
    const vs = getVerticalSpeedFtMin(p)
    const planned = parsePlannedAltitude(p.flight_plan?.altitude)
    const taxiMax = 30
    const takeoffMin = 70
    const altGround = 50
    const altTakeoffMax = 1500
    const altApproach = 3000
    const climbVs = 300
    const descentVs = -300
    const levelVs = 200

    if (p.groundspeed <= 1 && p.altitude <= altGround) return '停机位'
    if (p.groundspeed > 1 && p.groundspeed < taxiMax && p.altitude <= altTakeoffMax) return '滑行中'
    if (p.groundspeed >= takeoffMin && p.altitude <= altTakeoffMax) return '起飞'

    if (vs !== null) {
        if (vs > climbVs && p.altitude > altTakeoffMax && (!planned || p.altitude < planned - 500)) return '爬升'
        if (Math.abs(vs) <= levelVs && ((planned && Math.abs(p.altitude - planned) <= 1000) || p.altitude > 20000)) return '巡航中'
        if (vs < descentVs && p.altitude > altApproach) return '下降'
        if (vs < descentVs && p.altitude <= altApproach) return '下降'
    }

    if (p.altitude > 20000) return '巡航中'
    if (p.altitude > altTakeoffMax) return '爬升'
    return '下降'
}

export default getStatus

export const getPilotStatusOfTag = (p: OnlinePilot) => {
    const status = getStatus(p)
    if (status === '停机位' || status === '滑行中') return 'ground'
    if (status === '起飞' || status === '爬升') return 'departing'
    if (status === '巡航中') return 'cruising'
    return 'arriving'
}