import { useState, useEffect, useRef } from 'react'

// ── Lab sounds (Web Audio) ────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1) {
  const c = getCtx()
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur)
}

export const LabSounds = {
  brew() {
    // Bubbling sound
    for (let i = 0; i < 5; i++) {
      setTimeout(() => tone(300 + Math.random() * 400, 0.12, 'sine', 0.06), i * 80)
    }
  },
  success() {
    // Magic chime ascending
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => setTimeout(() => {
      tone(n, 0.3, 'sine', 0.08)
      tone(n * 1.5, 0.2, 'triangle', 0.03)
    }, i * 100))
  },
  fail() {
    tone(220, 0.25, 'square', 0.05)
    setTimeout(() => tone(165, 0.3, 'square', 0.04), 120)
  },
  pour() {
    // Liquid pouring
    const c = getCtx()
    const o = c.createOscillator(); const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(600, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4)
    g.gain.setValueAtTime(0.05, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4)
  },
}

// ── Flask colors by Java type ─────────────────────

const TYPE_COLORS: Record<string, { fill: string; glow: string; label: string }> = {
  int:     { fill: '#4da6ff', glow: '#4da6ff40', label: 'Integer' },
  double:  { fill: '#4dbd74', glow: '#4dbd7440', label: 'Decimal' },
  float:   { fill: '#4dbd74', glow: '#4dbd7440', label: 'Decimal' },
  String:  { fill: '#e8b84d', glow: '#e8b84d40', label: 'Text' },
  boolean: { fill: '#c77dff', glow: '#c77dff40', label: 'True/False' },
  char:    { fill: '#ff8a65', glow: '#ff8a6540', label: 'Character' },
}
const DEFAULT_TYPE = { fill: '#8c9bb5', glow: '#8c9bb540', label: 'Value' }

// ── Parse output to extract variables for display ──

interface LabVar {
  type: string
  name: string
  value: string
}

function extractVarsFromCode(code: string): LabVar[] {
  const vars: LabVar[] = []
  const lines = code.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*(int|double|float|String|boolean|char)\s+(\w+)\s*=\s*(.+?)\s*;/)
    if (m) {
      let val = m[3].replace(/^"|"$/g, '')
      vars.push({ type: m[1], name: m[2], value: val })
    }
  }
  return vars
}

// ── Animated Flask SVG ────────────────────────────

function Flask({ v, delay, animate }: { v: LabVar; delay: number; animate: boolean }) {
  const tc = TYPE_COLORS[v.type] || DEFAULT_TYPE
  const [fill, setFill] = useState(0)

  useEffect(() => {
    if (!animate) { setFill(0); return }
    const t = setTimeout(() => {
      setFill(1)
      LabSounds.pour()
    }, delay)
    return () => clearTimeout(t)
  }, [animate, delay])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      animation: animate && fill ? 'flask-appear .5s ease-out' : undefined,
      opacity: animate ? (fill ? 1 : 0.3) : 0.2,
      transition: 'opacity .4s',
    }}>
      <svg width="80" height="100" viewBox="0 0 80 100">
        {/* Flask shape */}
        <defs>
          <clipPath id={`flask-${v.name}`}>
            <path d="M25 10 L25 40 L10 80 Q8 90 20 95 L60 95 Q72 90 70 80 L55 40 L55 10 Z" />
          </clipPath>
          <filter id={`glow-${v.name}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Flask outline */}
        <path d="M25 10 L25 40 L10 80 Q8 90 20 95 L60 95 Q72 90 70 80 L55 40 L55 10 Z"
          fill="none" stroke="#4a5a72" strokeWidth="2" />
        {/* Cork */}
        <rect x="22" y="4" width="36" height="10" rx="3" fill="#8b6f47" />
        {/* Liquid fill */}
        <rect
          x="0" y={fill ? 35 : 100} width="80" height="70"
          fill={tc.fill} opacity="0.7"
          clipPath={`url(#flask-${v.name})`}
          filter={`url(#glow-${v.name})`}
          style={{ transition: 'y 0.8s cubic-bezier(.4,0,.2,1)' }}
        />
        {/* Bubbles when filling */}
        {fill === 1 && [0, 1, 2].map(i => (
          <circle key={i}
            cx={30 + i * 10} cy={70 - i * 8} r={2 + i}
            fill={tc.fill} opacity="0.5"
            style={{ animation: `bubble ${1 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` }}
          />
        ))}
      </svg>
      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700,
          color: tc.fill, letterSpacing: 0.5,
        }}>
          {v.name}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 13, color: '#8c9bb5',
        }}>
          {v.type}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 14, color: '#e8edf5',
          marginTop: 2, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          = {v.value}
        </div>
      </div>
    </div>
  )
}

// ── Main visuals component ────────────────────────

export default function AlchemistVisuals({ code, compiled, success }: {
  code: string
  compiled: boolean   // true after a Run
  success: boolean
}) {
  const vars = extractVarsFromCode(code)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])

  // Spawn success particles
  useEffect(() => {
    if (!compiled || !success) return
    const pts = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 80 + Math.random() * 20,
    }))
    setParticles(pts)
    const t = setTimeout(() => setParticles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '10px 16px', minHeight: 100, flexShrink: 0,
      background: 'linear-gradient(180deg, #0d1117 0%, #131a28 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes bubble {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-8px); opacity: 0.8; }
        }
        @keyframes flask-appear {
          from { transform: scale(0.8) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes sparkle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0); opacity: 0; }
        }
      `}</style>

      {/* Flasks */}
      {vars.length > 0 ? (
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {vars.map((v, i) => (
            <Flask key={v.name} v={v} delay={i * 300} animate={compiled} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '14px 0', color: '#667890',
          fontFamily: 'JetBrains Mono', fontSize: 14, fontStyle: 'italic',
        }}>
          🧪 Declare variables to see them appear as potions...
        </div>
      )}

      {/* Success sparkles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 6, height: 6, borderRadius: '50%',
          background: '#e8b84d',
          animation: 'sparkle 1.5s ease-out forwards',
          boxShadow: '0 0 8px #e8b84d',
        }} />
      ))}
    </div>
  )
}
