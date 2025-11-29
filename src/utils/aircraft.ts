/**
 * aircraft Utils
 * 
 * 飞机机型代码标准化与图标资源匹配工具。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import matchSet from '../configs/airplane/matchSet.json'
import { getICAOByAircraftName } from '../configs/airplane/aircraftTypes'

/**
 * 将输入的机型代码标准化为 ICAO 代码
 * 处理特殊情况（如协和式飞机 CONC）和多段代码
 * 
 * @param input 原始机型代码
 * @returns 标准化后的 ICAO 代码
 */
function normalizeAircraftCode(input?: string): string | null {
  if (!input) return null
  let s = input.toUpperCase().trim()
  s = s.replace(/\s+/g, '')
  if (s.includes('CON')) return 'CONC'
  const parts = s.split('/')
  if (parts.length > 1) {
    const candidates = parts.filter(p => p.length >= 3)
    s = candidates[0] || parts[parts.length - 1]
  }
  s = s.replace(/-/g, '')
  const byName = getICAOByAircraftName(s)
  if (byName) s = byName
  return s
}

const assetMap = new Map<string, string>(matchSet.map(i => [i.callsign.toUpperCase(), i.src]))

/**
 * 根据标准化后的代码查找对应的图标文件名
 * 
 * @param input 原始机型代码
 * @returns 图标文件名，未找到则返回 'default'
 */
export function getAircraftAssetByType(input?: string): string {
  const code = normalizeAircraftCode(input)
  if (!code) return 'default'
  const asset = assetMap.get(code)
  return asset || 'default'
}