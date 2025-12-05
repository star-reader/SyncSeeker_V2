import IconByName from '../../common/IconByName'
import onlineTime from '../../../utils/onlineTime'
import type { ConnectionInfoProps } from './types'
import styles from '../PilotInfoPanel.module.scss'

export default function ConnectionInfo({ pilot }: ConnectionInfoProps) {
    return (
        <div className={styles.panelCard}>
            <div className={styles.panelTitle}>
                <IconByName name="Protect" /> 连接信息
            </div>
            <div className={styles.gridTwo}>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>服务器</div>
                    <div className={styles.kvValueLine} title={pilot?.server}>
                        {pilot?.server || '-'}
                    </div>
                </div>
                <div className={styles.kvLine}>
                    <div className={styles.kvLabel}>在线时长</div>
                    <div className={styles.kvValueLine}>
                        {pilot ? onlineTime(pilot.logon_time) : '-'}
                    </div>
                </div>
            </div>
        </div>
    )
}
