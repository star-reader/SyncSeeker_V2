/**
 * Font Loader Utility
 * 
 * 确保等宽字体在应用启动时加载完成
 * 如果系统没有字体，从公开CDN加载
 * 
 * @author Jerry Jin
 * @date 2025-12-06
 */

const MONOSPACE_FONTS = [
  'Monaco',
  'Menlo',
  'Consolas',
  'Courier New',
  'monospace'
]

const FALLBACK_FONT_URL = 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap'

/**
 * 检测字体是否可用
 */
function isFontAvailable(fontName: string): boolean {
  // 创建一个测试元素
  const testString = 'mmmmmmmmmmlli'
  const fontSize = '72px'
  const baselineFontFamily = 'monospace'
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return false
  
  // 测量baseline字体宽度
  context.font = `${fontSize} ${baselineFontFamily}`
  const baselineWidth = context.measureText(testString).width
  
  // 测量目标字体宽度
  context.font = `${fontSize} ${fontName}, ${baselineFontFamily}`
  const targetWidth = context.measureText(testString).width
  
  // 如果宽度不同，说明字体存在
  return baselineWidth !== targetWidth
}

/**
 * 加载Google Fonts作为fallback
 */
function loadFallbackFont(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    const existingLink = document.querySelector(`link[href="${FALLBACK_FONT_URL}"]`)
    if (existingLink) {
      resolve()
      return
    }
    
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FALLBACK_FONT_URL
    
    link.onload = () => {
      console.log('✓ Fallback monospace font (Roboto Mono) loaded from Google Fonts')
      resolve()
    }
    
    link.onerror = () => {
      console.warn('✗ Failed to load fallback font from Google Fonts')
      reject(new Error('Failed to load fallback font'))
    }
    
    document.head.appendChild(link)
  })
}

/**
 * 初始化字体加载
 */
export async function initializeFonts(): Promise<void> {
  console.log('Checking monospace fonts availability...')
  
  // 检查系统是否有我们需要的等宽字体
  const availableFonts = MONOSPACE_FONTS.filter(font => isFontAvailable(font))
  
  if (availableFonts.length > 0) {
    console.log(`✓ System monospace fonts available: ${availableFonts.join(', ')}`)
  } else {
    console.warn('✗ No preferred monospace fonts found on system')
  }
  
  // 如果没有Monaco或Menlo，加载fallback
  if (!isFontAvailable('Monaco') && !isFontAvailable('Menlo')) {
    console.log('Loading fallback monospace font...')
    try {
      await loadFallbackFont()
      
      // 等待字体真正加载完成
      if ('fonts' in document) {
        await document.fonts.ready
        console.log('✓ All fonts loaded and ready')
      }
    } catch (e) {
      console.error('Failed to load fallback font:', e)
    }
  }
}

/**
 * 获取推荐的等宽字体栈
 */
export function getMonospaceFontStack(): string {
  return "'Monaco', 'Menlo', 'Roboto Mono', 'Consolas', 'Courier New', monospace"
}
