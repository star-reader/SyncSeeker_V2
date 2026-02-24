export type DebugLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface DebugLogEntry {
  id: string
  timestamp: string
  level: DebugLogLevel
  source: string
  message: string
  details?: string
}

const STORAGE_KEY = 'syncseeker.debug.logs.v1'
const MAX_LOGS = 1200

let installed = false

const originalConsole = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

const safeToString = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val as object)) return '[Circular]'
          seen.add(val as object)
        }
        if (typeof val === 'bigint') return `${val.toString()}n`
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack
          }
        }
        return val
      },
      2
    )
  } catch {
    return String(value)
  }
}

const readLogs = (): DebugLogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DebugLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLogs = (logs: DebugLogEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)))
}

export const pushDebugLog = (log: Omit<DebugLogEntry, 'id' | 'timestamp'>) => {
  const entry: DebugLogEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    ...log,
    details: log.details ? String(log.details).slice(0, 8000) : undefined
  }

  const logs = readLogs()
  logs.push(entry)
  writeLogs(logs)
}

export const getDebugLogs = (): DebugLogEntry[] => {
  return readLogs()
}

export const clearDebugLogs = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const exportDebugLogsText = () => {
  const logs = readLogs()
  const lines = logs.map(log => {
    const base = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    return log.details ? `${base}\n${log.details}` : base
  })
  return lines.join('\n\n')
}

export const installDebugLogCapture = () => {
  if (installed) return
  installed = true

  pushDebugLog({
    level: 'info',
    source: 'system.bootstrap',
    message: 'Debug log capture installed',
    details: safeToString({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      isSecureContext: window.isSecureContext
    })
  })

  console.debug = (...args: unknown[]) => {
    originalConsole.debug(...args)
    pushDebugLog({
      level: 'debug',
      source: 'console.debug',
      message: safeToString(args[0] ?? ''),
      details: args.length > 1 ? safeToString(args.slice(1)) : undefined
    })
  }

  console.info = (...args: unknown[]) => {
    originalConsole.info(...args)
    pushDebugLog({
      level: 'info',
      source: 'console.info',
      message: safeToString(args[0] ?? ''),
      details: args.length > 1 ? safeToString(args.slice(1)) : undefined
    })
  }

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args)
    pushDebugLog({
      level: 'warn',
      source: 'console.warn',
      message: safeToString(args[0] ?? ''),
      details: args.length > 1 ? safeToString(args.slice(1)) : undefined
    })
  }

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args)
    pushDebugLog({
      level: 'error',
      source: 'console.error',
      message: safeToString(args[0] ?? ''),
      details: args.length > 1 ? safeToString(args.slice(1)) : undefined
    })
  }

  window.addEventListener('error', (event) => {
    pushDebugLog({
      level: 'error',
      source: 'window.error',
      message: event.message || 'Unhandled error',
      details: safeToString({ filename: event.filename, lineno: event.lineno, colno: event.colno })
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    pushDebugLog({
      level: 'error',
      source: 'window.unhandledrejection',
      message: 'Unhandled promise rejection',
      details: safeToString(event.reason)
    })
  })
}
