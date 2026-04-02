import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) {
  const c = getCtx(), o = c.createOscillator(), g = c.createGain()
  o.type = t; o.frequency.value = f
  g.gain.setValueAtTime(v, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d)
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d)
}
function noise(d: number, v = 0.05, freq = 3000) {
  const c = getCtx(), sz = c.sampleRate * d
  const buf = c.createBuffer(1, sz, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1
  const s = c.createBufferSource(); s.buffer = buf
  const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(v, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d)
  s.connect(fl); fl.connect(g); g.connect(c.destination); s.start()
}

export const WorkshopSounds = {
  scrollUnroll() {
    noise(0.2, 0.04, 5000)
    tone(300, 0.08, 'sine', 0.03)
  },
  spellCast() {
    tone(660, 0.15, 'sine', 0.06)
    setTimeout(() => tone(880, 0.12, 'sine', 0.05), 70)
    setTimeout(() => tone(1100, 0.1, 'sine', 0.04), 140)
  },
  success() {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => {
      tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025)
    }, i * 100))
  },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
}

// ── Parse code for method definitions ─────────────

interface SpellScroll {
  name: string
  params: string
  returnType: string
}

function parseMethodsFromCode(code: string): SpellScroll[] {
  const scrolls: SpellScroll[] = []
  const rx = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(void|int|double|boolean|String|char|float|long)\s+(\w+)\s*\(([^)]*)\)/g
  let m
  while ((m = rx.exec(code)) !== null) {
    if (m[2] === 'main' || m[2] === 'println' || m[2] === 'print') continue
    scrolls.push({ returnType: m[1], name: m[2], params: m[3].trim() })
  }
  return scrolls
}

// ── Scroll SVG ────────────────────────────────────

function Scroll({ x, scroll, active, delay }: { x: number; scroll: SpellScroll; active: boolean; delay: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const col = active ? '#e84393' : '#6a4a60'

  return (
    <g style={{ opacity: show ? 1 : 0, transition: 'opacity 0.4s' }}>
      {/* Scroll body */}
      <rect x={x} y="12" width="70" height="50" rx="4"
        fill={active ? '#e8439315' : '#1a0c1600'}
        stroke={col} strokeWidth="1.5"
      />
      {/* Top roll */}
      <rect x={x - 2} y="9" width="74" height="7" rx="3.5" fill={active ? '#e84393' : '#4a3a44'} opacity="0.6" />
      {/* Bottom roll */}
      <rect x={x - 2} y="59" width="74" height="7" rx="3.5" fill={active ? '#e84393' : '#4a3a44'} opacity="0.6" />
      {/* Method name */}
      <text x={x + 35} y="30" textAnchor="middle" fill={active ? '#f0f4fa' : '#8a7a90'}
        fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
        {scroll.name}()
      </text>
      {/* Params */}
      {scroll.params && (
        <text x={x + 35} y="42" textAnchor="middle" fill={active ? '#d0a0c0' : '#5a4a60'}
          fontSize="7" fontFamily="JetBrains Mono">
          {scroll.params.length > 18 ? scroll.params.slice(0, 17) + '..' : scroll.params}
        </text>
      )}
      {/* Return type badge */}
      <text x={x + 35} y="54" textAnchor="middle" fill={active ? '#e84393' : '#5a4a60'}
        fontSize="7" fontFamily="JetBrains Mono" fontWeight="600">
        → {scroll.returnType}
      </text>
      {/* Glow when active */}
      {active && (
        <rect x={x + 2} y="14" width="66" height="46" rx="3" fill="#e84393" opacity="0.06">
          <animate attributeName="opacity" values="0.06;0.12;0.06" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
    </g>
  )
}

// ── Main component ────────────────────────────────

export default function SpellWorkshopVisuals({ code, compiled, success }: {
  code: string; compiled: boolean; success: boolean
}) {
  const scrolls = parseMethodsFromCode(code)
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    const pts = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i, x: 10 + Math.random() * 80, y: 40 + Math.random() * 50,
    }))
    setSparkles(pts)
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '8px 12px', minHeight: 100, flexShrink: 0,
      background: 'linear-gradient(180deg, #120a10 0%, #1a0c16 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
      `}</style>

      <svg width="100%" height="85" viewBox="0 0 300 85" preserveAspectRatio="xMidYMid meet">
        {scrolls.length > 0 ? (
          scrolls.slice(0, 3).map((s, i) => {
            const spacing = Math.min(90, 260 / scrolls.length)
            return <Scroll key={s.name} x={20 + i * spacing} scroll={s} active={compiled} delay={i * 200} />
          })
        ) : (
          <text x="150" y="45" textAnchor="middle" fill="#3a2030" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            📜 Define a method to see your spell scroll appear...
          </text>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#e84393',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 8px #e84393',
        }} />
      ))}
    </div>
  )
}
