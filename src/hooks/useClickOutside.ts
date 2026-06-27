import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface UseClickOutsideOptions {
  enabled?: boolean
  ignoreSelectors?: string[]
}

export default function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: (event: PointerEvent) => void,
  options: UseClickOutsideOptions = {}
) {
  const callbackRef = useRef(onOutsideClick)
  const { enabled = true, ignoreSelectors = [] } = options

  useEffect(() => {
    callbackRef.current = onOutsideClick
  }, [onOutsideClick])

  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      const element = ref.current
      if (!element || !(target instanceof Node)) return
      if (element.contains(target)) return

      if (target instanceof Element && ignoreSelectors.some(selector => target.closest(selector))) {
        return
      }

      callbackRef.current(event)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [enabled, ignoreSelectors, ref])
}
