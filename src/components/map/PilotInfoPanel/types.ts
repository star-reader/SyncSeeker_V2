import type { OnlinePilot, FlightPlan } from '../../../types/fsd'
import type { IndexedDBAirlines, IndexedDBAirports } from '../../../types/types'

export interface PilotHeaderProps {
    pilot: OnlinePilot | null
    airline: IndexedDBAirlines | null
    status: string
    statusTag: string
    aircraft: string
    onClose: () => void
    onShare?: () => void
    isSharing?: boolean
    onToggleTracking?: () => void
    isTracking?: boolean
}

export interface RouteCardProps {
    dep: string
    arr: string
    depAirport: IndexedDBAirports | null
    arrAirport: IndexedDBAirports | null
    progress: number
    onExpand: () => void
}

export interface RealtimeStatsProps {
    pilot: OnlinePilot | null
    show3D: boolean
    onToggle3D: () => void
    trackData: {
        altitudeArray: number[]
        speedArray: number[]
    }
}

export interface FlightPlanCardProps {
    flightPlan: FlightPlan | null | undefined
    onCopyRoute: () => void
    copyingRoute: boolean
}

export interface ConnectionInfoProps {
    pilot: OnlinePilot | null
}
