export const CONTROLLER_COLORS_DAY: Record<ControllerType, { fill: string; line: string }> = {
    CTR: { fill: 'rgba(191, 219, 254, 0.25)', line: 'rgba(59, 130, 246, 0.8)' },   // 蓝色
    APP: { fill: 'rgba(252, 231, 243, 0.25)', line: 'rgba(236, 72, 153, 0.8)' },   // 粉色
    FSS: { fill: 'rgba(221, 214, 254, 0.25)', line: 'rgba(139, 92, 246, 0.8)' },   // 紫色
    TWR: { fill: 'rgba(167, 243, 208, 0.1)', line: 'rgba(16, 185, 129, 0.7)' },   // 绿色
    GND: { fill: 'rgba(254, 243, 199, 0.1)', line: 'rgba(245, 158, 11, 0.7)' },   // 黄色
    DEL: { fill: 'rgba(254, 215, 170, 0.1)', line: 'rgba(249, 115, 22, 0.7)' },   // 橙色
    ATIS: { fill: 'transparent', line: 'transparent' },
    OBS: { fill: 'transparent', line: 'transparent' },
    OTHER: { fill: 'rgba(229, 231, 235, 0.24)', line: 'rgba(156, 163, 175, 0.7)' } // 灰色
}

export const CONTROLLER_COLORS_NIGHT: Record<ControllerType, { fill: string; line: string }> = {
    CTR: { fill: 'rgba(37, 99, 235, 0.12)', line: 'rgba(96, 165, 250, 0.9)' },  
    APP: { fill: 'rgba(219, 39, 119, 0.12)', line: 'rgba(244, 114, 182, 0.85)' }, 
    FSS: { fill: 'rgba(109, 40, 217, 0.12)', line: 'rgba(168, 85, 247, 0.85)' }, 
    TWR: { fill: 'rgba(5, 150, 105, 0.04)', line: 'rgba(52, 211, 153, 0.8)' }, 
    GND: { fill: 'rgba(217, 119, 6, 0.04)', line: 'rgba(251, 191, 36, 0.75)' },
    DEL: { fill: 'rgba(234, 88, 12, 0.04)', line: 'rgba(251, 146, 60, 0.75)' }, 
    ATIS: { fill: 'transparent', line: 'transparent' },
    OBS: { fill: 'transparent', line: 'transparent' },
    OTHER: { fill: 'rgba(75, 85, 99, 0.12)', line: 'rgba(156, 163, 175, 0.6)' } 
}