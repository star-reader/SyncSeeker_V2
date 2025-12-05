import IconByName from '../../common/IconByName'
import type { RouteCardProps } from './types'
import styles from '../PilotInfoPanel.module.scss'

export default function RouteCard({
    dep,
    arr,
    depAirport,
    arrAirport,
    progress,
    onExpand
}: RouteCardProps) {
    return (
        <div className={styles.routeCard} onClick={onExpand}>
            <div className={styles.routeRow}>
                <div className={styles.routeCol}>
                    <div className={styles.routeLabel}>DEPARTURE</div>
                    <div className={styles.airportBig}>{dep}</div>
                    {depAirport && (
                        <div className={styles.airportName} title={depAirport.name}>
                            {depAirport.name}
                        </div>
                    )}
                </div>
                <div className={styles.routeArrow}>
                    <IconByName name="FlightAirflow" />
                </div>
                <div className={styles.routeCol}>
                    <div className={styles.routeLabel}>ARRIVAL</div>
                    <div className={styles.airportBig}>{arr}</div>
                    {arrAirport && (
                        <div className={styles.airportName} title={arrAirport.name}>
                            {arrAirport.name}
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.trackBar}>
                <div 
                    className={styles.trackProgress} 
                    style={{ width: `${progress}%` }}
                />
                <div 
                    className={styles.trackPlane} 
                    style={{ left: `${progress}%` }}
                >
                    <IconByName name="Plane" />
                </div>
            </div>
        </div>
    )
}
