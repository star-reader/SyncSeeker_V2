import type { OnlinePilot } from "../types/fsd";

export default (p: OnlinePilot) => {
    if (p.groundspeed <= 0) return '地面'
    if (p.groundspeed < 30) return '滑行中'
    if (p.altitude > 20000) return '巡航中'
    if (p.altitude > 5000) return '起飞'
    return '到达'
}

export const getPilotStatusOfTag = (p: OnlinePilot) => {
    if (p.groundspeed < 30) return 'ground'
    if (p.altitude > 20000) return 'cruising'
    if (p.altitude > 5000) return 'departing'
    return 'arriving'
}