/**
 * getPilotStatusOf Utils
 * 
 * 计算飞行员当前的飞行阶段状态。
 * 结合地速、高度及垂直速度进行判断。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import type { OnlinePilot } from "../types/fsd";

const lastSamples = new Map<string, { t: number, alt: number, gs: number }>()


/**
 * 解析计划高度
 * @param a 原始高度字符串
 * @returns 高度数值（英尺）
 */
function parsePlannedAltitude(a?: string): number | null {
    if (!a) return null
    const s = a.toUpperCase()
    const m = s.match(/\d+/)
    if (!m) return null
    const n = parseInt(m[0], 10)
    if (s.includes('FL') || m[0].length <= 3) return n * 100
    return n
}

/**
 * 计算垂直速度 (ft/min)
 * @param p 飞行员数据
 */
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

/**
 * 获取飞行状态描述
 * @param p 飞行员数据
 * @returns 中文状态描述 (如：停机位, 滑行中, 起飞, 爬升, 巡航中, 下降)
 */
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
    // 默认返回飞行中
    return '进行中'
}

export default getStatus

/**
 * 获取飞行状态对应的 UI 标签 ID
 * @param p 飞行员数据
 * @returns 状态标签 ID (ground, departing, cruising, arriving)
 */
export const getPilotStatusOfTag = (p: OnlinePilot) => {
    const status = getStatus(p)
    if (status === '停机位' || status === '滑行中') return 'ground'
    if (status === '起飞' || status === '爬升') return 'departing'
    if (status === '巡航中') return 'cruising'
    return 'arriving'
}