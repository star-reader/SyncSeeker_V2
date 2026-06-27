import IconByName from '../../common/IconByName'
import type { PilotHeaderProps } from './types'
import styles from '../PilotInfoPanel.module.scss'
import { getAirlineIcaoFromCallsign, getAirlineLogoUrl } from '../../../utils/airlineLogo'

export default function PilotHeader({
    pilot,
    airline,
    status,
    statusTag,
    aircraft,
    onClose,
    onShare,
    isSharing,
    onToggleTracking,
    isTracking,
    isNativeTrackingSupported = true
}: PilotHeaderProps) {
    const airlineLogoUrl = getAirlineLogoUrl(pilot?.callsign)
    const airlineIcao = getAirlineIcaoFromCallsign(pilot?.callsign)

    return (
        <div className={styles.header}>
            <div className={styles.title}>
                {airlineLogoUrl && (
                    <div className={styles.airlineLogoHeader} title={airline?.name || airlineIcao || 'Airline'}>
                        {/* <span className={styles.airlineLogoFallback}>{airlineIcao}</span> */}
                        <img
                            src={airlineLogoUrl}
                            alt={airline?.name || airlineIcao || 'Airline logo'}
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none'
                            }}
                        />
                    </div>
                )}
                <div className={styles.callsign}>{pilot?.callsign || '-'}</div>
                <div className={styles.submeta}>
                    <div className={styles.subchip}>
                        <IconByName name="IdCard" /> {pilot?.cid || '-'}
                    </div>
                    <div className={styles.subchip}>
                        <IconByName name="User" /> {pilot?.name || ''}
                    </div>
                    {airline && (
                        <div className={styles.subchip} title={airline.name}>
                            <IconByName name="ApplicationOne" /> {airline.name}
                        </div>
                    )}
                    <div className={styles.subchip} title="Aircraft Type">
                        <IconByName name="Airplane" /> {aircraft}
                    </div>
                </div>
            </div>
            <div className={styles.headerActions}>
                <div className={`${styles.status} ${styles[`status--${statusTag}`]}`}>
                    {status || ''}
                </div>
                {onToggleTracking && (
                    <button 
                        className={`${styles.trackBtn} ${isTracking ? styles.tracking : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleTracking(); }}
                        title={isNativeTrackingSupported ? (isTracking ? "取消追踪" : "追踪航班（实时活动 / 灵动岛）") : (isTracking ? "取消追踪" : "追踪航班（当前设备不支持实时活动）")}
                    >
                        <IconByName name={isTracking ? "Local" : "LocalTwo"} />
                    </button>
                )}
                {onShare && (
                    <button 
                        className={`${styles.shareBtn} ${isSharing ? styles.shared : ''}`} 
                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                        title="分享航班链接"
                    >
                        <IconByName name={isSharing ? "CheckOne" : "Share"} />
                    </button>
                )}
                <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <IconByName name="Close" />
                </button>
            </div>
        </div>
    )
}
