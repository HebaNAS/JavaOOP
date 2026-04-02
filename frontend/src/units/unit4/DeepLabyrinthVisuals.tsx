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

export const DeepSounds = {
  footstep() { tone(60, 0.08, 'square', 0.04) },
  success() {
    [587, 740, 880, 1175].forEach((n, i) => setTimeout(() => {
      tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025)
    }, i * 100))
  },
  fail() { tone(196, 0.25, 'square', 0.05); setTimeout(() => tone(147, 0.3, 'square', 0.04), 120) },
  skip() { tone(500, 0.1, 'sine', 0.04); tone(700, 0.08, 'sine', 0.03) },
  breakOut() {
    tone(300, 0.15, 'sawtooth', 0.06)
    setTimeout(() => tone(150, 0.2, 'sawtooth', 0.04), 80)
  },
}

// ── Cold Torch ────────────────────────────────────

function ColdTorch({ x }: { x: number }) {
  return (
    <g transform={`translate(${x}, 8)`}>
      <rect x="-3" y="20" width="6" height="28" rx="2" fill="#3a4a5a" />
      <rect x="-7" y="16" width="14" height="7" rx="2" fill="#4a5a6a" />
      <ellipse cx="0" cy="11" rx="5" ry="9" fill="#26a69a" opacity="0.85">
        <animate attributeName="ry" values="9;11;8;10;9" dur="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;0.6;0.85" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0" cy="9" rx="3" ry="5" fill="#80cbc4" opacity="0.7">
        <animate attributeName="ry" values="5;7;4;6;5" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
      <circle cx="0" cy="11" r="16" fill="#26a69a18" />
    </g>
  )
}

// ── Grid cell ─────────────────────────────────────

function GridCell({ x, y, lit, color }: { x: number; y: number; lit: boolean; color: string }) {
  return (
    <rect x={x} y={y} width="14" height="14" rx="2"
      fill={lit ? `${color}40` : '#0d1718'}
      stroke={lit ? color : '#1a2a30'} strokeWidth="1"
      style={{ transition: 'all 0.3s' }}
    />
  )
}

// ── Parse output ──────────────────────────────────

interface Scene {
  type: 'corridor' | 'grid' | 'staircase' | 'idle'
  rooms?: { num: number; state: 'safe' | 'skip' | 'trap' | 'coin' | 'found' | 'search' }[]
  gridRows?: string[]
  message?: string
}

function parseOutput(output: string, idx: number): Scene {
  if (!output.trim()) return { type: 'idle' }
  const lines = output.trim().split('\n')

  // Challenges 0-1: corridor with conditions
  if (idx <= 1) {
    const rooms: Scene['rooms'] = []
    for (const l of lines) {
      const m = l.match(/(?:Step|Treasure|alcove)\s*(\d+)/)
      if (m) {
        const n = parseInt(m[1])
        const state = l.includes('TRAP') ? 'trap' : l.includes('coin') || l.includes('Treasure') ? 'coin' : 'safe'
        rooms.push({ num: n, state })
      }
    }
    return { type: 'corridor', rooms, message: lines[lines.length - 1] }
  }

  // Challenge 2: continue (skip)
  if (idx === 2) {
    const rooms: Scene['rooms'] = []
    // Show all rooms 1-8, mark which are safe vs skipped
    const safeNums = new Set(lines.filter(l => l.includes('safe')).map(l => {
      const m = l.match(/Room\s*(\d+)/)
      return m ? parseInt(m[1]) : 0
    }))
    const maxRoom = Math.max(8, ...safeNums)
    for (let i = 1; i <= maxRoom; i++) {
      rooms.push({ num: i, state: safeNums.has(i) ? 'safe' : 'skip' })
    }
    return { type: 'corridor', rooms, message: lines[lines.length - 1] }
  }

  // Challenge 3: break
  if (idx === 3) {
    const rooms: Scene['rooms'] = []
    for (const l of lines) {
      const m = l.match(/room\s*(\d+)/)
      if (m) {
        const n = parseInt(m[1])
        rooms.push({ num: n, state: l.includes('Found') ? 'found' : 'search' })
      }
    }
    return { type: 'corridor', rooms, message: lines[lines.length - 1] }
  }

  // Challenge 4: grid
  if (idx === 4) {
    const gridLines = lines.filter(l => l.includes('*'))
    return { type: 'grid', gridRows: gridLines }
  }

  // Challenge 5: staircase
  if (idx === 5) {
    const stairLines = lines.filter(l => /^\*+$/.test(l.trim()))
    return { type: 'staircase', gridRows: stairLines }
  }

  return { type: 'idle' }
}

// ── Room marker colors ────────────────────────────
const ROOM_COLORS: Record<string, string> = {
  safe: '#26a69a', skip: '#5a3a60', trap: '#ff8c5a', coin: '#ffc04d',
  found: '#5cd98e', search: '#4a6080',
}

// ── Main component ────────────────────────────────

export default function DeepLabyrinthVisuals({ output, compiled, success, challengeIdx }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number
}) {
  const scene = compiled ? parseOutput(output, challengeIdx) : { type: 'idle' as const }
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

  return (
    <div style={{
      padding: '8px 12px', minHeight: 100, flexShrink: 0,
      background: 'linear-gradient(180deg, #080d12 0%, #0d1718 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-50px) scale(0);opacity:0} }
      `}</style>

      <svg width="100%" height="85" viewBox="0 0 300 85" preserveAspectRatio="xMidYMid meet">
        <ColdTorch x={12} />
        <ColdTorch x={288} />

        {scene.type === 'corridor' && scene.rooms && scene.rooms.length > 0 && (
          <>
            {scene.rooms.slice(0, 10).map((rm, i) => {
              const x = 30 + i * 25
              const col = ROOM_COLORS[rm.state] || '#4a6080'
              return (
                <g key={i}>
                  <rect x={x - 8} y="30" width="18" height="28" rx="3"
                    fill={`${col}25`} stroke={col} strokeWidth="1.5" />
                  {rm.state === 'skip' && (
                    <line x1={x - 6} y1="32" x2={x + 8} y2="56" stroke="#ff8c5a" strokeWidth="2" opacity="0.6" />
                  )}
                  {rm.state === 'found' && (
                    <text x={x + 1} y="48" textAnchor="middle" fill="#5cd98e" fontSize="14">★</text>
                  )}
                  <text x={x + 1} y="72" textAnchor="middle" fill={col} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">
                    {rm.num}
                  </text>
                </g>
              )
            })}
            {scene.rooms.length > 10 && (
              <text x={285} y="50" textAnchor="end" fill="#4a6080" fontSize="9" fontFamily="JetBrains Mono">
                +{scene.rooms.length - 10}
              </text>
            )}
          </>
        )}

        {scene.type === 'grid' && scene.gridRows && (
          <>
            {scene.gridRows.slice(0, 5).map((row, ri) => {
              const stars = row.trim().split(/\s+/)
              return stars.slice(0, 12).map((_, ci) => (
                <GridCell key={`${ri}-${ci}`}
                  x={35 + ci * 18} y={10 + ri * 16}
                  lit={true} color="#26a69a"
                />
              ))
            })}
          </>
        )}

        {scene.type === 'staircase' && scene.gridRows && (
          <>
            {scene.gridRows.slice(0, 6).map((row, ri) => {
              const count = row.trim().length
              return Array.from({ length: Math.min(count, 10) }, (_, ci) => (
                <GridCell key={`${ri}-${ci}`}
                  x={35 + ci * 18} y={10 + ri * 14}
                  lit={true} color="#80cbc4"
                />
              ))
            })}
          </>
        )}

        {scene.type === 'idle' && (
          <text x="150" y="50" textAnchor="middle" fill="#2a3a45" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            🌀 Run your code to delve deeper...
          </text>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#26a69a',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 8px #26a69a',
        }} />
      ))}
    </div>
  )
}
