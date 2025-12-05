import IconByName from '../../common/IconByName'
import FlightChart from '../FlightChart'
import type { RealtimeStatsProps } from './types'
import styles from '../PilotInfoPanel.module.scss'

export default function RealtimeStats({
    pilot,
    show3D,
    onToggle3D,
    trackData
}: RealtimeStatsProps) {
    return (
        <div className={styles.panelCard}>
            <div className={styles.panelTitle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconByName name="SpeedOne" /> 实时数据
                </div>
                <button
                    className={styles.toggle3dBtn}
                    data-active={show3D}
                    onClick={onToggle3D}
                    title="Toggle 3D Track"
                >
                    <IconByName name="MapDraw" /> 3D航迹
                </button>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <div className={styles.statLabel}>高度 (ft)</div>
                    <div className={styles.statValue}>
                        {pilot ? Math.round(pilot.altitude) : 0}
                    </div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statLabel}>地速 (kt)</div>
                    <div className={styles.statValue}>
                        {pilot ? Math.round(pilot.groundspeed) : 0}
                    </div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statLabel}>航向 (°)</div>
                    <div className={styles.statValue}>
                        {pilot ? Math.round(pilot.heading) : 0}
                    </div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statLabel}>应答机</div>
                    <div className={styles.statValue}>
                        {pilot?.transponder || 0}
                    </div>
                </div>
            </div>
            
            <FlightChart 
                altitudeArray={trackData.altitudeArray} 
                speedArray={trackData.speedArray} 
            />
        </div>
    )
}
