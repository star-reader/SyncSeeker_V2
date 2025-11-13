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
 * ------------------
 *
 * Props:
 * - children (ReactNode)          – Content to be wrapped
 * - className (string, optional)  – Additional CSS classes
 * - style (CSSProperties, optional) – Inline styles merged with container
 * - options (LiquidWebOptions, optional) – Override any distortion settings
 * - onClick (() => void, optional) – Fired when the wrapper is clicked
 * - onMouseEnter (() => void, optional) – Fired on mouse enter
 * - onMouseLeave (() => void, optional) – Fired on mouse leave
 * - borderRadius (string, optional) – CSS border-radius for the container
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