export type LiquidGlassLevel = 'off' | 'weak' | 'medium' | 'strong'

export type LiquidGlassScope =
  | 'navbar'
  | 'navbarButton'
  | 'dropdown'
  | 'pilotPanel'
  | 'controllerPanel'
  | 'mapControl'
  | 'contentCard'

export type LiquidGlassOptions = {
  scale: number
  blur: number
  saturation: number
  aberration: number
  mode: 'standard' | 'polar' | 'prominent' | 'shader'
}

const LEVEL_BASE_OPTIONS: Record<LiquidGlassLevel, LiquidGlassOptions> = {
  off: { scale: 0, blur: 0, saturation: 100, aberration: 0, mode: 'standard' },
  weak: { scale: 16, blur: 1.4, saturation: 130, aberration: 24, mode: 'standard' },
  medium: { scale: 22, blur: 2, saturation: 170, aberration: 50, mode: 'standard' },
  strong: { scale: 30, blur: 2.6, saturation: 210, aberration: 75, mode: 'prominent' }
}

const SCOPE_TUNING: Record<LiquidGlassScope, Partial<LiquidGlassOptions>> = {
  navbar: { scale: 24, blur: 2.2, saturation: 175 },
  navbarButton: { scale: 18, blur: 1.8, saturation: 165 },
  dropdown: { scale: 24, blur: 2.4, saturation: 185, mode: 'prominent' },
  pilotPanel: { scale: 20, blur: 2, saturation: 155, aberration: 36 },
  controllerPanel: { scale: 20, blur: 2, saturation: 155, aberration: 36 },
  mapControl: { scale: 18, blur: 1.8, saturation: 165, aberration: 32 },
  contentCard: { scale: 15, blur: 1.6, saturation: 150, aberration: 24 }
}

export const getLiquidGlassOptions = (
  level: LiquidGlassLevel,
  scope: LiquidGlassScope
): LiquidGlassOptions => {
  const base = LEVEL_BASE_OPTIONS[level]
  const tuning = SCOPE_TUNING[scope]
  return {
    ...base,
    ...tuning
  }
}

export const isLiquidGlassEnabled = (level: LiquidGlassLevel): boolean => level !== 'off'
