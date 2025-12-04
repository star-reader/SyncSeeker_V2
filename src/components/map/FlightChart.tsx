/**
 * FlightChart Component
 * 
 * 航班高度-速度-时间图表组件，类似 FlightRadar24 的样式。
 * 显示飞行过程中的高度和速度变化趋势。
 * 
 * @author Jerry Jin
 * @date 2025-12-04
 */
import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import styles from './FlightChart.module.scss'

interface FlightChartProps {
  altitudeArray: number[]
  speedArray: number[]
}

interface ChartDataPoint {
  time: string
  altitude: number
  speed: number
}

/**
 * 根据数据长度生成时间数组
 * 每个点间隔3秒，从当前时间倒推
 */
const generateTimeArray = (length: number): string[] => {
  const now = new Date()
  const result: string[] = []
  
  for (let i = length - 1; i >= 0; i--) {
    // 每个点间隔3秒
    const offsetSeconds = i * 3
    const pointTime = new Date(now.getTime() - offsetSeconds * 1000)
    
    const hours = pointTime.getHours().toString().padStart(2, '0')
    const minutes = pointTime.getMinutes().toString().padStart(2, '0')
    result.push(`${hours}:${minutes}`)
  }
  
  return result
}

/**
 * 简化数据点，避免图表过于密集
 * 如果数据点超过100个，进行采样
 */
const simplifyData = (data: ChartDataPoint[], maxPoints: number = 80): ChartDataPoint[] => {
  if (data.length <= maxPoints) return data
  
  const step = Math.ceil(data.length / maxPoints)
  const result: ChartDataPoint[] = []
  
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i])
  }
  
  // 确保最后一个点被包含
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1])
  }
  
  return result
}

export default function FlightChart({ altitudeArray, speedArray }: FlightChartProps) {
  const chartData = useMemo(() => {
    const length = Math.max(altitudeArray.length, speedArray.length)
    if (length === 0) return []
    
    const timeArray = generateTimeArray(length)
    
    const data: ChartDataPoint[] = timeArray.map((time, index) => ({
      time,
      altitude: altitudeArray[index] || 0,
      speed: speedArray[index] || 0
    }))
    
    return simplifyData(data)
  }, [altitudeArray, speedArray])

  if (chartData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <span>暂无航迹数据</span>
      </div>
    )
  }

  // 计算Y轴范围
  const maxAltitude = Math.max(...chartData.map(d => d.altitude), 1000)
  const maxSpeed = Math.max(...chartData.map(d => d.speed), 100)

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="altitudeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: 'var(--sky-text-color-secondary)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--sky-border-color)', strokeOpacity: 0.5 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          
          <YAxis
            yAxisId="altitude"
            orientation="left"
            tick={{ fontSize: 10, fill: 'var(--sky-text-color-secondary)' }}
            tickLine={false}
            axisLine={false}
            domain={[0, Math.ceil(maxAltitude / 10000) * 10000]}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          
          <YAxis
            yAxisId="speed"
            orientation="right"
            tick={{ fontSize: 10, fill: 'var(--sky-text-color-secondary)' }}
            tickLine={false}
            axisLine={false}
            domain={[0, Math.ceil(maxSpeed / 100) * 100]}
            hide
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--sky-bg-color-base)',
              border: '1px solid var(--sky-border-color)',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: 'var(--sky-text-color-primary)', marginBottom: '4px' }}
            formatter={(value: number, name: string) => {
              if (name === 'altitude') return [`${Math.round(value).toLocaleString()} ft`, '高度']
              if (name === 'speed') return [`${Math.round(value)} kt`, '速度']
              return [value, name]
            }}
          />
          
          <Legend
            verticalAlign="top"
            height={24}
            formatter={(value) => {
              if (value === 'altitude') return <span style={{ fontSize: '11px', color: 'var(--sky-text-color-secondary)' }}>高度 (ft)</span>
              if (value === 'speed') return <span style={{ fontSize: '11px', color: 'var(--sky-text-color-secondary)' }}>速度 (kt)</span>
              return value
            }}
          />
          
          <Area
            yAxisId="altitude"
            type="monotone"
            dataKey="altitude"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#altitudeGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          
          <Line
            yAxisId="speed"
            type="monotone"
            dataKey="speed"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: '#f97316' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
