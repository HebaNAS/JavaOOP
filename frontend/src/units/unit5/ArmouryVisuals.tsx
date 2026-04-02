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
function noise(d: number, v = 0.06, freq = 2000) {
  const c = getCtx(), sz = c.sampleRate * d
  const buf = c.createBuffer(1, sz, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1
  const s = c.createBufferSource(); s.buffer = buf
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(v, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d)
  s.connect(f); f.connect(g); g.connect(c.destination); s.start()
}

export const ArmourySounds = {
  metalClang() {
    tone(800, 0.08, 'square', 0.06)
    noise(0.1, 0.05, 4000)
    setTimeout(() => tone(600, 0.12, 'sine', 0.04), 40)
  },
  sheathe() {
    noise(0.15, 0.04, 3000)
    tone(400, 0.1, 'sine', 0.03)
  },
  success() {
    [440, 554, 659, 880].forEach((n, i) => setTimeout(() => {
      tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025)
    }, i * 100))
  },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
}

// ── Parse output for rack display ─────────────────

interface RackItem {
  label: string
  value: number
  kind: 'int' | 'string' | 'cell'
}

function parseOutput(output: string, code: string, idx: number): RackItem[] {
  if (!output.trim()) return []
  const lines = output.trim().split('\n')
  const items: RackItem[] = []

  // Challenges 0, 2, 3: simple arrays — output is numbers or labelled lines
  if (idx <= 3) {
    for (const l of lines) {
      const numMatch = l.match(/^(\d+)$/)
      if (numMatch) {
        items.push({ label: numMatch[1], value: parseInt(numMatch[1]), kind: 'int' })
        continue
      }
      const labelMatch = l.match(/(Max|Min|Total|Average|Item).*?:?\s*(\d+|[\w]+)$/i)
      if (labelMatch) {
        const v = parseInt(labelMatch[2])
        items.push({ label: l.trim(), value: isNaN(v) ? 0 : v, kind: 'string' })
      }
    }
  }

  // Challenge 1: inventory — specific item printout
  if (idx === 1) {
    return lines.map(l => ({ label: l.trim(), value: 0, kind: 'string' as const }))
  }

  // Challenges 4-5: 2D grid — parse numbers
  if (idx >= 4) {
    for (const l of lines) {
      const nums = l.trim().split(/\s+/).filter(Boolean)
      if (nums.length > 1 && nums.every(n => /^\d+$/.test(n))) {
        for (const n of nums) items.push({ label: n, value: parseInt(n), kind: 'cell' })
      } else if (l.trim()) {
        items.push({ label: l.trim(), value: 0, kind: 'string' })
      }
    }
  }

  return items
}

// ── Weapon slot SVG ───────────────────────────────

function Slot({ x, item, maxVal, delay }: { x: number; item: RackItem; maxVal: number; delay: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const height = item.kind === 'int' ? Math.max(8, (item.value / Math.max(maxVal, 1)) * 40) : 20
  const col = item.kind === 'int'
    ? `hsl(${30 + (item.value / Math.max(maxVal, 1)) * 20}, 80%, 55%)`
    : '#f4a62a'

  return (
    <g style={{ opacity: show ? 1 : 0, transition: 'opacity 0.3s', transform: show ? 'none' : 'translateY(5px)' }}>
      {/* Rack hook */}
      <rect x={x - 1} y="18" width="2" height="8" fill="#5a4a30" />
      {/* Item bar */}
      <rect x={x - 10} y={58 - height} width="20" height={height} rx="2"
        fill={`${col}60`} stroke={col} strokeWidth="1.5"
      />
      {/* Label */}
      <text x={x} y="72" textAnchor="middle" fill={col} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">
        {item.label.length > 8 ? item.label.slice(0, 7) + '..' : item.label}
      </text>
    </g>
  )
}

// ── Grid cell for 2D arrays ───────────────────────

function Cell({ x, y, value, maxVal }: { x: number; y: number; value: number; maxVal: number }) {
  const intensity = Math.min(1, value / Math.max(maxVal, 1))
  const col = `hsl(${35 - intensity * 10}, 80%, ${40 + intensity * 20}%)`
  return (
    <g>
      <rect x={x} y={y} width="22" height="14" rx="2"
        fill={`${col}30`} stroke={col} strokeWidth="1" />
      <text x={x + 11} y={y + 11} textAnchor="middle" fill={col} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">
        {value}
      </text>
    </g>
  )
}

// ── Main component ────────────────────────────────

export default function ArmouryVisuals({ output, compiled, success, challengeIdx, code }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number; code: string
}) {
  const items = compiled ? parseOutput(output, code, challengeIdx) : []
  const maxVal = Math.max(1, ...items.filter(i => i.kind === 'int' || i.kind === 'cell').map(i => i.value))
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    const pts = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i, x: 15 + Math.random() * 70, y: 50 + Math.random() * 40,
    }))
    setSparkles(pts)
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  const hasCells = items.some(i => i.kind === 'cell')
  const rackItems = items.filter(i => i.kind === 'int')
  const stringItems = items.filter(i => i.kind === 'string')

  return (
    <div style={{
      padding: '8px 12px', minHeight: 100, flexShrink: 0,
      background: 'linear-gradient(180deg, #100d06 0%, #1a1508 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-50px) scale(0);opacity:0} }
      `}</style>

      <svg width="100%" height="85" viewBox="0 0 300 85" preserveAspectRatio="xMidYMid meet">
        {/* Rack beam */}
        <rect x="20" y="14" width="260" height="4" rx="2" fill="#5a4a30" />
        <rect x="20" y="14" width="260" height="2" rx="1" fill="#7a6a4a" />

        {hasCells ? (
          /* 2D grid display */
          items.filter(i => i.kind === 'cell').map((item, idx) => {
            const cols = Math.min(12, Math.ceil(Math.sqrt(items.filter(i => i.kind === 'cell').length * 1.5)))
            const row = Math.floor(idx / cols)
            const col = idx % cols
            return <Cell key={idx} x={30 + col * 24} y={24 + row * 16} value={item.value} maxVal={maxVal} />
          })
        ) : rackItems.length > 0 ? (
          /* 1D rack display */
          rackItems.slice(0, 10).map((item, i) => {
            const spacing = Math.min(28, 240 / rackItems.length)
            return <Slot key={i} x={40 + i * spacing} item={item} maxVal={maxVal} delay={i * 80} />
          })
        ) : stringItems.length > 0 ? (
          /* Text results */
          stringItems.slice(0, 4).map((item, i) => (
            <text key={i} x="150" y={30 + i * 15} textAnchor="middle" fill="#f4a62a" fontSize="10" fontFamily="JetBrains Mono">
              {item.label.length > 40 ? item.label.slice(0, 39) + '...' : item.label}
            </text>
          ))
        ) : (
          <text x="150" y="50" textAnchor="middle" fill="#3a2a10" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            🗡️ Run your code to fill the weapon rack...
          </text>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#f4a62a',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 8px #f4a62a',
        }} />
      ))}
    </div>
  )
}
