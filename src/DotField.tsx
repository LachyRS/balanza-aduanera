import { type ReactNode, useEffect, useRef } from 'react'

// Maypop Studio's empty-preview dot field: a canvas of dots that warp toward
// the pointer and ripple on click, with a chromatic split near the corners.
// Dots draw in `--foreground` over the page background.

const SPACING = 12
const DOT_R = 1
const BASE_EFFECT_RADIUS = SPACING * 20
const MAX_EFFECT_RADIUS = SPACING * 36
const MAX_DISPLACEMENT = 10
const BASE_OPACITY = 0.1
const PEAK_OPACITY = 0.3
const LERP_SPEED = 0.35
// Extra opacity easing in toward the bottom edge.
const BOTTOM_BRIGHTEN = 0.3
const RIPPLE_MIN_AMP = 0.005
const RIPPLE_MAX_PUSH = 12
const MAX_RIPPLES = 8
const SETTLE_PX = 0.05
const MIN_FRAME_MS = 1000 / 60
const OFFSCREEN = -9999

const ABERRATION_RED = 'oklch(0.65 0.2 25)'
const ABERRATION_BLUE = 'oklch(0.65 0.2 260)'
const ABERRATION_GREEN = 'oklch(0.75 0.15 145)'

type Dot = {
  baseX: number
  baseY: number
  effectRadius: number
  bottomMul: number
  abX: number
  abY: number
  split: boolean
  toCornerX: number
  toCornerY: number
  toCornerLen: number
  warpFactor: number
  blend: number
}

type Ripple = {
  x: number
  y: number
  startTime: number
  speed: number
  amplitude: number
  ringWidth: number
}

function layoutDots(w: number, h: number): Dot[] {
  const cols = Math.ceil(w / SPACING) + 1
  const rows = Math.ceil(h / SPACING) + 1
  const offsetX = (w % SPACING) / 2
  const offsetY = (h % SPACING) / 2
  const cx = w / 2
  const cy = h / 2
  const dots: Dot[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = offsetX + col * SPACING
      const baseY = offsetY + row * SPACING
      const normX = cx > 0 ? Math.abs(baseX - cx) / cx : 0
      const normY = cy > 0 ? Math.abs(baseY - cy) / cy : 0
      const cornerDist = Math.hypot(normX, normY) / Math.SQRT2
      const toCornerX = (baseX < cx ? 0 : w) - baseX
      const toCornerY = (baseY < cy ? 0 : h) - baseY
      const toCornerLen = Math.hypot(toCornerX, toCornerY) || 1
      const cd3 = cornerDist ** 3
      const aberration = cornerDist ** 4 * 8
      const vy = h > 0 ? baseY / h : 0
      dots.push({
        baseX,
        baseY,
        effectRadius:
          BASE_EFFECT_RADIUS + (MAX_EFFECT_RADIUS - BASE_EFFECT_RADIUS) * cornerDist ** 2,
        bottomMul: 1 + vy * vy * BOTTOM_BRIGHTEN,
        abX: (toCornerX / toCornerLen) * aberration,
        abY: (toCornerY / toCornerLen) * aberration,
        split: aberration > 0.3,
        toCornerX,
        toCornerY,
        toCornerLen,
        warpFactor: 1 + cd3 * 3,
        blend: cd3 * 0.6,
      })
    }
  }
  return dots
}

export function DotField({ className, children }: { className?: string; children?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!container || !canvas || !ctx) return

    const target = { x: OFFSCREEN, y: OFFSCREEN }
    const smooth = { x: OFFSCREEN, y: OFFSCREEN }
    const ripples: Ripple[] = []
    let dots: Dot[] = []
    let w = 0
    let h = 0
    let raf = 0
    let lastT = 0
    let hidden = document.hidden
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const readColor = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || 'white'
    let color = readColor()

    const settled = () =>
      Math.abs(smooth.x - target.x) < SETTLE_PX && Math.abs(smooth.y - target.y) < SETTLE_PX

    function kick() {
      if (hidden || raf) return
      lastT = 0
      raf = requestAnimationFrame(draw)
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas!.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      dots = layoutDots(w, h)
      kick()
    }

    function draw(now: number) {
      if (now - lastT < MIN_FRAME_MS - 0.5) {
        raf = requestAnimationFrame(draw)
        return
      }
      const dt = lastT ? Math.min(Math.max((now - lastT) / 1000, 0.001), 0.05) : 1 / 60
      lastT = now
      const alpha = 1 - (1 - LERP_SPEED) ** (dt * 60)
      smooth.x += (target.x - smooth.x) * alpha
      smooth.y += (target.y - smooth.y) * alpha
      if (settled()) {
        smooth.x = target.x
        smooth.y = target.y
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const elapsed = (now - ripples[i].startTime) / 1000
        if (ripples[i].amplitude * Math.exp(-elapsed) < RIPPLE_MIN_AMP) ripples.splice(i, 1)
      }

      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = color
      const dotAt = (x: number, y: number) => {
        ctx!.beginPath()
        ctx!.arc(x, y, DOT_R, 0, Math.PI * 2)
        ctx!.fill()
      }

      for (const dot of dots) {
        const dx = dot.baseX - smooth.x
        const dy = dot.baseY - smooth.y
        const dist = Math.hypot(dx, dy)
        let opacity = BASE_OPACITY
        let x = dot.baseX
        let y = dot.baseY

        if (dist < dot.effectRadius) {
          const falloff = (1 - dist / dot.effectRadius) ** 2
          opacity = BASE_OPACITY + (PEAK_OPACITY - BASE_OPACITY) * falloff
          if (dist > 0.1) {
            const push = MAX_DISPLACEMENT * falloff * dot.warpFactor
            x += ((dx / dist) * (1 - dot.blend) + (dot.toCornerX / dot.toCornerLen) * dot.blend) * push
            y += ((dy / dist) * (1 - dot.blend) + (dot.toCornerY / dot.toCornerLen) * dot.blend) * push
          }
        }

        let rippleContrib = 0
        for (const rip of ripples) {
          const elapsed = (now - rip.startTime) / 1000
          const radius = (1 - Math.exp(-elapsed * 0.8)) * rip.speed * 5
          const rdx = dot.baseX - rip.x
          const rdy = dot.baseY - rip.y
          const rDist = Math.hypot(rdx, rdy)
          const amp = (rip.amplitude * Math.exp(-elapsed)) / (1 + rDist * 0.008)
          if (amp <= 0.002) continue
          const rw = rip.ringWidth
          const behind = rDist - radius
          const envelope = Math.exp((-behind * behind) / (rw * rw * (behind > 0 ? 6 : 0.5)))
          const strength = Math.sin((behind / (rw * 3.5)) * Math.PI * 1.5) * amp * envelope
          rippleContrib += strength
          if (rDist > 0.1) {
            x += (rdx / rDist) * RIPPLE_MAX_PUSH * strength
            y += (rdy / rDist) * RIPPLE_MAX_PUSH * strength
          }
        }
        opacity = Math.max(0.02, opacity + rippleContrib) * dot.bottomMul

        if (dot.split && dist < dot.effectRadius) {
          ctx!.globalAlpha = opacity * 0.7
          ctx!.fillStyle = ABERRATION_RED
          dotAt(x + dot.abX, y + dot.abY)
          ctx!.fillStyle = ABERRATION_BLUE
          dotAt(x - dot.abX, y - dot.abY)
          ctx!.globalAlpha = opacity
          ctx!.fillStyle = ABERRATION_GREEN
          dotAt(x, y)
          ctx!.fillStyle = color
        } else {
          ctx!.globalAlpha = opacity
          dotAt(x, y)
        }
      }
      ctx!.globalAlpha = 1

      // Sleep once the picture stops moving; input kicks it awake.
      const moving = !settled() || ripples.length > 0
      if (!hidden && !reduceMotion.matches && moving) {
        raf = requestAnimationFrame(draw)
      } else {
        raf = 0
        lastT = 0
      }
    }

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      target.x = event.clientX - rect.left
      target.y = event.clientY - rect.top
      if (!reduceMotion.matches) kick()
    }
    const onLeave = () => {
      target.x = OFFSCREEN
      target.y = OFFSCREEN
      if (!reduceMotion.matches) kick()
    }
    const onDown = (event: PointerEvent) => {
      if (reduceMotion.matches || ripples.length >= MAX_RIPPLES) return
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const nx = rect.width ? Math.abs(x - rect.width / 2) / (rect.width / 2) : 0
      const ny = rect.height ? Math.abs(y - rect.height / 2) / (rect.height / 2) : 0
      const cd = Math.hypot(nx, ny) / Math.SQRT2
      // Corner: large, slow, wide waves. Centre: small, fast, tight ones.
      ripples.push({
        x,
        y,
        startTime: performance.now(),
        speed: 25 + (1 - cd) * 45,
        amplitude: 0.15 + cd * 0.25,
        ringWidth: 30 + cd * 60,
      })
      kick()
    }
    const onVisibility = () => {
      hidden = document.hidden
      if (hidden && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      } else kick()
    }
    const onScheme = () => {
      color = readColor()
      kick()
    }
    const onReduceMotion = () => {
      target.x = smooth.x = OFFSCREEN
      target.y = smooth.y = OFFSCREEN
      ripples.length = 0
      kick()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    container.addEventListener('pointermove', onMove)
    container.addEventListener('pointerleave', onLeave)
    container.addEventListener('pointerdown', onDown)
    document.addEventListener('visibilitychange', onVisibility)
    darkScheme.addEventListener('change', onScheme)
    reduceMotion.addEventListener('change', onReduceMotion)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVisibility)
      darkScheme.removeEventListener('change', onScheme)
      reduceMotion.removeEventListener('change', onReduceMotion)
    }
  }, [])

  return (
    <div ref={containerRef} className={`dot-field ${className ?? ''}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {children}
    </div>
  )
}
