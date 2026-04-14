import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  axis: 'x' | 'y'
  /** Initial size in px; used only if localStorage has no stored value. */
  initial: number
  /** Clamp bounds. */
  min: number
  max: number
  /** localStorage key so the preference survives reloads. */
  storageKey: string
  /**
   * How dragging translates into a new size.
   *   'x' + 'right'  = size grows as mouse moves LEFT  (editor col on the right)
   *   'x' + 'left'   = size grows as mouse moves RIGHT
   *   'y' + 'below'  = size grows as mouse moves UP    (console below)
   *   'y' + 'above'  = size grows as mouse moves DOWN
   */
  direction: 'right' | 'left' | 'below' | 'above'
  /** Called on every change so the parent can set a CSS var. */
  onResize: (size: number) => void
}

/**
 * A thin draggable divider. Uses pointer events + pointer capture so drags
 * keep tracking even if the cursor leaves the handle element.
 */
export default function ResizeHandle({ axis, initial, min, max, storageKey, direction, onResize }: Props) {
  const [dragging, setDragging] = useState(false)
  const sizeRef = useRef(initial)

  // Load persisted size once on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    const parsed = stored ? parseFloat(stored) : NaN
    const start = !isNaN(parsed) ? clamp(parsed, min, max) : initial
    sizeRef.current = start
    onResize(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    setDragging(true)
    document.body.classList.add('resizing')
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'

    const startPos = axis === 'x' ? e.clientX : e.clientY
    const startSize = sizeRef.current

    const onMove = (ev: PointerEvent) => {
      const cur = axis === 'x' ? ev.clientX : ev.clientY
      const delta = cur - startPos
      let next = startSize
      if (direction === 'right' || direction === 'below') next = startSize - delta
      else next = startSize + delta
      next = clamp(next, min, max)
      sizeRef.current = next
      onResize(next)
    }
    const onUp = () => {
      setDragging(false)
      document.body.classList.remove('resizing')
      document.body.style.cursor = ''
      localStorage.setItem(storageKey, String(sizeRef.current))
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [axis, direction, min, max, onResize, storageKey])

  const cls = `resize-handle-${axis === 'x' ? 'v' : 'h'}${dragging ? ' dragging' : ''}`
  return (
    <div
      className={cls}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      title="Drag to resize · Double-click to reset"
      onDoubleClick={() => {
        sizeRef.current = initial
        onResize(initial)
        localStorage.setItem(storageKey, String(initial))
      }}
    />
  )
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
