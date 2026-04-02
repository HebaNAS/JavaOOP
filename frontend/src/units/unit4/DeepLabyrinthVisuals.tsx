import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx }
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d) }

export const DeepSounds = {
  footstep() { tone(60, 0.08, 'square', 0.04) },
  success() { [587, 740, 880, 1175].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025) }, i * 100)) },
  fail() { tone(196, 0.25, 'square', 0.05); setTimeout(() => tone(147, 0.3, 'square', 0.04), 120) },
  skip() { tone(500, 0.1, 'sine', 0.04); tone(700, 0.08, 'sine', 0.03) },
  breakOut() { tone(300, 0.15, 'sawtooth', 0.06); setTimeout(() => tone(150, 0.2, 'sawtooth', 0.04), 80) },
}

// ── CSS ───────────────────────────────────────────

const CSS = `
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-50px) scale(0);opacity:0} }
@keyframes cold-flicker { 0%,100%{opacity:.8;transform:scaleY(1)} 30%{opacity:.55;transform:scaleY(1.2)} 60%{opacity:.85;transform:scaleY(.85)} }
@keyframes drip-fall { 0%{transform:translateY(0);opacity:.7} 80%{transform:translateY(22px);opacity:.4} 100%{transform:translateY(24px);opacity:0} }
@keyframes rune-pulse { 0%,100%{opacity:.15;fill:#26a69a} 50%{opacity:.5;fill:#80cbc4} }
@keyframes mist-drift { 0%{transform:translateX(0);opacity:.08} 50%{transform:translateX(20px);opacity:.15} 100%{transform:translateX(40px);opacity:.03} }
@keyframes skip-flash { 0%{stroke:#ff8c5a;stroke-opacity:1} 100%{stroke:#ff8c5a;stroke-opacity:.2} }
@keyframes found-pop { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.3);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes grid-light { 0%{fill-opacity:0} 100%{fill-opacity:.35} }
@keyframes ice-grow { 0%{transform:scaleY(0);opacity:0} 100%{transform:scaleY(1);opacity:.6} }
`

// ── Parse output ──────────────────────────────────

interface Scene { type: 'corridor' | 'grid' | 'staircase' | 'idle'; rooms?: { num: number; state: string }[]; gridRows?: string[] }
const ROOM_COLORS: Record<string, string> = { safe: '#26a69a', skip: '#6a3a70', trap: '#ff8c5a', coin: '#ffc04d', found: '#5cd98e', search: '#4a6080' }

function parseOutput(output: string, idx: number): Scene {
  if (!output.trim()) return { type: 'idle' }
  const lines = output.trim().split('\n')
  if (idx <= 1) {
    const rooms: Scene['rooms'] = []
    for (const l of lines) { const m = l.match(/(?:Step|Treasure|alcove)\s*(\d+)/); if (m) rooms.push({ num: parseInt(m[1]), state: l.includes('TRAP') ? 'trap' : l.includes('coin') || l.includes('Treasure') ? 'coin' : 'safe' }) }
    return { type: 'corridor', rooms }
  }
  if (idx === 2) {
    const safeNums = new Set(lines.filter(l => l.includes('safe')).map(l => { const m = l.match(/Room\s*(\d+)/); return m ? parseInt(m[1]) : 0 }))
    const rooms: Scene['rooms'] = []; for (let i = 1; i <= Math.max(8, ...safeNums); i++) rooms.push({ num: i, state: safeNums.has(i) ? 'safe' : 'skip' })
    return { type: 'corridor', rooms }
  }
  if (idx === 3) {
    const rooms: Scene['rooms'] = []; for (const l of lines) { const m = l.match(/room\s*(\d+)/); if (m) rooms.push({ num: parseInt(m[1]), state: l.includes('Found') ? 'found' : 'search' }) }
    return { type: 'corridor', rooms }
  }
  if (idx === 4) return { type: 'grid', gridRows: lines.filter(l => l.includes('*')) }
  if (idx === 5) return { type: 'staircase', gridRows: lines.filter(l => /^\*+$/.test(l.trim())) }
  return { type: 'idle' }
}

// ── Component ─────────────────────────────────────

export default function DeepLabyrinthVisuals({ output, compiled, success, challengeIdx }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number
}) {
  const scene = compiled ? parseOutput(output, challengeIdx) : { type: 'idle' as const }
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    setSparkles(Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i, x: 15 + Math.random() * 70, y: 50 + Math.random() * 40 })))
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '6px 12px', minHeight: 120, flexShrink: 0,
      background: 'linear-gradient(180deg, #060a10 0%, #0d1718 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Mist layers */}
      {[...Array(3)].map((_, i) => (
        <div key={`mist-${i}`} style={{
          position: 'absolute', bottom: `${5 + i * 12}%`, left: `${-10 + i * 20}%`,
          width: '40%', height: 12, borderRadius: '50%', background: '#26a69a08',
          animation: `mist-drift ${6 + i * 2}s ease-in-out infinite ${i * 2}s`,
        }} />
      ))}

      {/* Water drips */}
      {[...Array(4)].map((_, i) => (
        <div key={`drip-${i}`} style={{
          position: 'absolute', top: 0, left: `${20 + i * 20}%`,
          width: 2, height: 4, borderRadius: '50%', background: '#26a69a50',
          animation: `drip-fall ${2 + i * 0.5}s ease-in infinite ${i * 0.8}s`,
        }} />
      ))}

      <svg width="100%" height="105" viewBox="0 0 340 105" preserveAspectRatio="xMidYMid meet">
        {/* ── Cold torches with ice crystals ── */}
        {[15, 325].map((tx, ti) => (
          <g key={ti} transform={`translate(${tx}, 5)`}>
            <rect x="-3" y="28" width="6" height="24" rx="2" fill="#3a4a5a" />
            <rect x="-7" y="24" width="14" height="7" rx="2" fill="#4a5a6a" />
            <ellipse cx="0" cy="18" rx="5" ry="9" fill="#26a69a"
              style={{ animation: `cold-flicker 0.7s ease-in-out infinite ${ti * 0.25}s`, transformOrigin: '0 24px' }} />
            <ellipse cx="0" cy="16" rx="2.5" ry="5" fill="#80cbc4"
              style={{ animation: `cold-flicker 0.5s ease-in-out infinite ${ti * 0.15}s`, transformOrigin: '0 22px' }} />
            <circle cx="0" cy="18" r="16" fill="#26a69a">
              <animate attributeName="opacity" values="0.06;0.14;0.06" dur="2s" repeatCount="indefinite" begin={`${ti * 0.4}s`} />
            </circle>
            {/* Ice crystals at base */}
            {[-4, 0, 4].map((ix, ii) => (
              <polygon key={ii} points={`${ix},52 ${ix - 2},58 ${ix + 2},58`} fill="#80cbc450"
                style={{ animation: `ice-grow 2s ease-out infinite ${ii * 0.5}s`, transformOrigin: `${ix}px 58px` }} />
            ))}
          </g>
        ))}

        {/* ── Wall runes (ambient) ── */}
        {[60, 130, 210, 280].map((rx, ri) => (
          <text key={ri} x={rx} y="18" textAnchor="middle" fontSize="10" fontFamily="serif"
            style={{ animation: `rune-pulse ${3 + ri * 0.3}s ease-in-out infinite ${ri * 0.7}s` }}>
            {['ᚱ', 'ᛗ', 'ᚦ', 'ᛉ'][ri]}
          </text>
        ))}

        {/* ── Stone floor ── */}
        <line x1="30" y1="92" x2="310" y2="92" stroke="#1a2a35" strokeWidth="1.5" strokeDasharray="6 5" />

        {/* ── Corridor rooms ── */}
        {scene.type === 'corridor' && scene.rooms && scene.rooms.slice(0, 10).map((rm, i) => {
          const x = 35 + i * 28
          const col = ROOM_COLORS[rm.state] || '#4a6080'
          return (
            <g key={i}>
              <rect x={x - 10} y="32" width="22" height="32" rx="3"
                fill={`${col}20`} stroke={col} strokeWidth="1.5"
                style={rm.state === 'safe' || rm.state === 'coin' ? { animation: `grid-light 0.4s ease-out ${i * 0.1}s both` } : {}} />
              {rm.state === 'skip' && <line x1={x - 8} y1="34" x2={x + 10} y2="62" stroke="#ff8c5a" strokeWidth="2.5"
                style={{ animation: `skip-flash 0.8s ease-out ${0.3 + i * 0.1}s both` }} />}
              {rm.state === 'found' && <text x={x + 1} y="52" textAnchor="middle" fill="#5cd98e" fontSize="16"
                style={{ animation: `found-pop 0.4s ease-out ${0.3 + i * 0.1}s both` }}>★</text>}
              {rm.state === 'trap' && <text x={x + 1} y="52" textAnchor="middle" fill="#ff8c5a" fontSize="12">⚡</text>}
              {rm.state === 'coin' && <text x={x + 1} y="52" textAnchor="middle" fill="#ffc04d" fontSize="12">●</text>}
              <text x={x + 1} y="78" textAnchor="middle" fill={col} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">{rm.num}</text>
            </g>
          )
        })}

        {/* ── Grid cells ── */}
        {(scene.type === 'grid' || scene.type === 'staircase') && scene.gridRows && scene.gridRows.slice(0, 6).map((row, ri) => {
          const count = scene.type === 'staircase' ? row.trim().length : row.trim().split(/\s+/).length
          return Array.from({ length: Math.min(count, 12) }, (_, ci) => (
            <rect key={`${ri}-${ci}`} x={40 + ci * 20} y={12 + ri * 15} width="16" height="12" rx="2"
              fill="#26a69a" stroke="#80cbc4" strokeWidth="1"
              style={{ animation: `grid-light 0.3s ease-out ${(ri * 12 + ci) * 0.04}s both` }} />
          ))
        })}

        {scene.type === 'idle' && (
          <text x="170" y="55" textAnchor="middle" fill="#1a2a35" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
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
