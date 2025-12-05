import IconByName from '../../common/IconByName'
import type { FlightPlanCardProps } from './types'
import styles from '../PilotInfoPanel.module.scss'

export default function FlightPlanCard({
    flightPlan,
    onCopyRoute,
    copyingRoute
}: FlightPlanCardProps) {
    const fp = flightPlan
    const flightRules = fp?.flight_rules || 'I'
    const deptime = fp?.deptime || '-'
    const enroute = fp?.enroute_time || '-'
    const cruiseAlt = fp?.altitude || '-'
    const cruiseTas = fp?.cruise_tas || '-'
    const routeText = fp?.route || ''
    const remarks = fp?.remarks || ''

    return (
        <div className={styles.panelCard}>
            <div className={styles.panelTitle}>
                <IconByName name="Pin" /> 飞行计划
            </div>
            <div className={styles.gridTwo}>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>规则</div>
                    <div className={styles.kvValueLine}>
                        {flightRules === 'I' ? 'IFR' : 'VFR'}
                    </div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>备降</div>
                    <div className={styles.kvValueLine}>
                        {fp?.alternate || '-'}
                    </div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>预计起飞</div>
                    <div className={styles.kvValueLine}>{deptime}</div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>预计航时</div>
                    <div className={styles.kvValueLine}>{enroute}</div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>巡航高度</div>
                    <div className={styles.kvValueLine}>{cruiseAlt}</div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>巡航速度</div>
                    <div className={styles.kvValueLine}>{cruiseTas}</div>
                </div>
            </div>

            {routeText && (
                <div className={styles.codeBlock}>
                    <div className={styles.codeHeader}>
                        <div className={styles.codeTitle}>ROUTE</div>
                        <button className={styles.copyBtn} onClick={onCopyRoute}>
                            <IconByName name="Copy" />
                            {copyingRoute ? (
                                <span className={styles.copiedText}>已复制</span>
                            ) : (
                                <span className={styles.copyText}>复制航路</span>
                            )}
                        </button>
                    </div>
                    <pre className={styles.codeContent}>{routeText}</pre>
                </div>
            )}

            {remarks && (
                <div className={styles.codeBlock} style={{ marginTop: '8px' }}>
                    <div className={styles.codeHeader}>
                        <div className={styles.codeTitle}>REMARKS</div>
                    </div>
                    <pre className={styles.codeContent} style={{ maxHeight: '80px' }}>
                        {remarks}
                    </pre>
                </div>
            )}
        </div>
    )
}
