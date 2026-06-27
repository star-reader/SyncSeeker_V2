import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import type { CSSProperties, ReactNode, RefObject, TouchEvent } from 'react'

interface FloatingPanelProps {
  open: boolean
  expanded: boolean
  children: ReactNode
  className?: string
  handleClassName?: string
  style?: CSSProperties
  liquidGlass?: boolean
  dragIgnoreRef?: RefObject<HTMLElement | null>
  onExpandedChange: (expanded: boolean) => void
  onDismiss?: () => void
}

const DRAG_THRESHOLD = 60
const SCROLL_AREA_SELECTOR = '[data-floating-panel-scroll="true"]'

const isInScrollArea = (target: EventTarget | null) => {
  return target instanceof Element && !!target.closest(SCROLL_AREA_SELECTOR)
}

const FloatingPanel = forwardRef<HTMLDivElement, FloatingPanelProps>(({
  open,
  expanded,
  children,
  className,
  handleClassName,
  style,
  liquidGlass,
  dragIgnoreRef,
  onExpandedChange,
  onDismiss
}, forwardedRef) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const [startY, setStartY] = useState(0)

  useImperativeHandle(forwardedRef, () => panelRef.current as HTMLDivElement)

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (isInScrollArea(event.target)) return
    if (expanded && dragIgnoreRef?.current?.contains(event.target as Node)) return
    setDragging(true)
    setStartY(event.touches[0].clientY)
  }, [dragIgnoreRef, expanded])

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!dragging) return
    setTranslateY(event.touches[0].clientY - startY)
  }, [dragging, startY])

  const handleTouchEnd = useCallback(() => {
    setDragging(false)

    if (!expanded && translateY < -DRAG_THRESHOLD) {
      onExpandedChange(true)
    } else if (expanded && translateY > DRAG_THRESHOLD) {
      onExpandedChange(false)
    } else if (!expanded && translateY > DRAG_THRESHOLD) {
      onDismiss?.()
    }

    setTranslateY(0)
  }, [expanded, onDismiss, onExpandedChange, translateY])

  return (
    <div
      ref={panelRef}
      className={className}
      data-open={open ? 'true' : 'false'}
      data-expanded={expanded ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      data-liquid-glass={liquidGlass ? 'true' : 'false'}
      style={{ ...style, '--drag-offset': `${translateY}px` } as CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={handleClassName} onClick={() => onExpandedChange(!expanded)} />
      {children}
    </div>
  )
})

FloatingPanel.displayName = 'FloatingPanel'

export default FloatingPanel
