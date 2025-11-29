/**
 * LiquidGlassWrapper Component
 * 
 * 液态玻璃特效包装组件。
 * 使用 liquid-web 库为子元素添加具有物理流动感的毛玻璃背景效果。
 * 
 * @author Jerry Jin
 * @date 2025-11-29
 */
import type { ReactNode } from 'react';
import { LiquidWeb } from 'liquid-web/react';

interface LiquidWebOptions {
  scale?: number;
  blur?: number | string;
  saturation?: number | string;
  aberration?: number;
  mode?: 'standard' | 'polar' | 'prominent' | 'shader';
}

interface LiquidGlassWrapperProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  options?: LiquidWebOptions;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  borderRadius?: string;
}
/**
 * LiquidGlassWrapper
 *
 * 封装 LiquidWeb 的高阶组件。
 * 
 * Props:
 * - children (ReactNode)          – 内容
 * - className (string, optional)  – 容器类名
 * - style (CSSProperties, optional) – 内联样式
 * - options (LiquidWebOptions, optional) – 特效参数（scale, blur, etc.）
 * - onClick (() => void, optional) – 点击事件
 * - borderRadius (string, optional) – 圆角设置
 *
 * Usage:
 * <LiquidGlassWrapper
 *   options={{ scale: 30, mode: 'prominent' }}
 *   onClick={() => console.log('clicked')}
 *   borderRadius="1rem"
 * >
 *   <YourComponent />
 * </LiquidGlassWrapper>
 */
export default ({
  children,
  className = '',
  style = {},
  options = {},
  onClick,
  onMouseEnter,
  onMouseLeave,
  borderRadius,
}: LiquidGlassWrapperProps) => {

  // 根据主题调整配置
  const themeAdjustedOptions: LiquidWebOptions = {
    scale: 22,
    blur: 2,
    saturation: 170,
    aberration: 50,
    mode: 'standard',
    ...options,
  };

  return (
    <LiquidWeb
      options={themeAdjustedOptions}
      selector="div"
      onClick={onClick ? (instance: any) => {
        console.log('LiquidWeb clicked:', instance);
        onClick();
      } : undefined}
      onMouseEnter={onMouseEnter ? (instance: any) => {
        console.log('LiquidWeb mouse enter:', instance);
        onMouseEnter();
      } : undefined}
      onMouseLeave={onMouseLeave ? (instance: any) => {
        console.log('LiquidWeb mouse leave:', instance);
        onMouseLeave();
      } : undefined}
    >
      <div
        className={`liquid-glass-container ${className}`}
        style={{
          position: 'relative',
          borderRadius: borderRadius || 'inherit',
          pointerEvents: onClick ? 'auto' : 'none', // 只有在有onClick时才拦截事件
          ...style,
        }}
        onClick={onClick}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>
    </LiquidWeb>
  )
}