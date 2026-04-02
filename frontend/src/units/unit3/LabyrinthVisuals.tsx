import { useState, useEffect } from 'react'

// ── Labyrinth sounds (Web Audio) ──────────────────

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
function noise(d: number, v = 0.08, freq = 2000) {
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

export const LabyrinthSounds = {
  doorOpen() {
    // Creaky door
    const c = getCtx(), o = c.createOscillator(), g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(80, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.5)
    g.gain.setValueAtTime(0.06, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
    noise(0.3, 0.04, 400)
  },
  footstep() {
    tone(80, 0.08, 'square', 0.05)
    noise(0.06, 0.06, 600)
  },
  gemCollect() {
    tone(880, 0.15, 'sine', 0.07)
    setTimeout(() => tone(1100, 0.12, 'sine', 0.05), 60)
  },
  success() {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => {
      tone(n, 0.3, 'sine', 0.08)
      tone(n * 1.5, 0.2, 'triangle', 0.03)
    }, i * 100))
  },
  fail() {
    tone(220, 0.25, 'square', 0.05)
    setTimeout(() => tone(165, 0.3, 'square', 0.04), 120)
  },
}

// ── Torch flame component ─────────────────────────

function Torch({ x, flip }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x}, 10)${flip ? ' scale(-1,1)' : ''}`}>
      {/* Bracket */}
      <rect x="-3" y="20" width="6" height="30" rx="2" fill="#5a4a30" />
      <rect x="-8" y="16" width="16" height="8" rx="2" fill="#7a6a4a" />
      {/* Flame — animated */}
      <ellipse cx="0" cy="12" rx="6" ry="10" fill="#ff9800" opacity="0.9">
        <animate attributeName="ry" values="10;12;9;11;10" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.7;0.9" dur="0.4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0" cy="10" rx="3" ry="6" fill="#ffc04d" opacity="0.8">
        <animate attributeName="ry" values="6;8;5;7;6" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      {/* Glow */}
      <circle cx="0" cy="12" r="18" fill="#ff980020" />
    </g>
  )
}

// ── Door component ────────────────────────────────

function Door({ x, label, open, color }: { x: number; label: string; open: boolean; color: string }) {
  return (
    <g transform={`translate(${x}, 25)`}>
      {/* Arch */}
      <path d="M-18 55 L-18 10 Q-18 -5 0 -5 Q18 -5 18 10 L18 55" fill="none" stroke="#5a6a80" strokeWidth="3" />
      {/* Door panel */}
      <rect x="-15" y="5" width="30" height="48" rx="2"
        fill={open ? `${color}30` : '#1a2030'}
        stroke={open ? color : '#3a4a60'} strokeWidth="2"
        style={{ transition: 'all 0.5s ease' }}
      />
      {/* Handle */}
      <circle cx="10" cy="30" r="2.5" fill={open ? color : '#5a6a80'} />
      {/* Label */}
      <text x="0" y="68" textAnchor="middle" fill={open ? color : '#667890'}
        fontSize="10" fontFamily="JetBrains Mono" fontWeight="700"
      >{label}</text>
      {/* Open glow */}
      {open && (
        <rect x="-13" y="7" width="26" height="44" rx="1"
          fill={color} opacity="0.15">
          <animate attributeName="opacity" values="0.15;0.25;0.15" dur="1.5s" repeatCount="indefinite" />
        </rect>
      )}
    </g>
  )
}

// ── Parse output to detect doors/branches/loops ───

interface SceneState {
  doors: { label: string; open: boolean; color: string }[]
  loopCount: number
  pathMessage: string
}

function parseOutput(output: string, challengeIdx: number): SceneState {
  const lines = output.trim().split('\n').filter(Boolean)
  const state: SceneState = { doors: [], loopCount: 0, pathMessage: '' }

  // Challenges 0-3: door-based (if/else)
  if (challengeIdx <= 3) {
    if (lines.length > 0) state.pathMessage = lines[0]
    // Show which "path" was taken
    if (output.includes('Gold')) state.doors = [
      { label: 'Gold', open: true, color: '#ffc04d' },
      { label: 'Silver', open: false, color: '#a0b0c8' },
      { label: 'Bronze', open: false, color: '#c08050' },
    ]
    else if (output.includes('Silver')) state.doors = [
      { label: 'Gold', open: false, color: '#ffc04d' },
      { label: 'Silver', open: true, color: '#a0b0c8' },
      { label: 'Bronze', open: false, color: '#c08050' },
    ]
    else if (output.includes('Bronze')) state.doors = [
      { label: 'Gold', open: false, color: '#ffc04d' },
      { label: 'Silver', open: false, color: '#a0b0c8' },
      { label: 'Bronze', open: true, color: '#c08050' },
    ]
    else if (output.includes('open') || output.includes('safe') || output.includes('vault') || output.includes('bright')) state.doors = [
      { label: '✓', open: true, color: '#5cd98e' },
    ]
    else if (lines.length > 0) state.doors = [
      { label: '✗', open: false, color: '#ff8c5a' },
    ]
  }
  // Challenges 4-5: compass/rune (switch)
  else if (challengeIdx <= 5) {
    state.pathMessage = lines[0] || ''
    const dirs = ['north', 'south', 'east', 'west']
    const colors = ['#4dd0e1', '#5cd98e', '#ff8c5a', '#c77dff']
    const openDir = dirs.findIndex(d => output.toLowerCase().includes(d))
    state.doors = dirs.map((d, i) => ({
      label: d.charAt(0).toUpperCase() + d.slice(1),
      open: i === openDir,
      color: colors[i],
    }))
    if (openDir === -1 && lines.length > 0) {
      // Unknown rune or direction
      state.doors = [{ label: '???', open: false, color: '#8899b4' }]
    }
  }
  // Challenges 6-7: loops
  else {
    const collected = lines.filter(l => l.includes('collected') || l.includes('Echo'))
    state.loopCount = collected.length
    state.pathMessage = lines[lines.length - 1] || ''
  }

  return state
}

// ── Main visuals component ────────────────────────

export default function LabyrinthVisuals({ output, compiled, success, challengeIdx }: {
  output: string
  compiled: boolean
  success: boolean
  challengeIdx: number
}) {
  const scene = compiled ? parseOutput(output, challengeIdx) : { doors: [], loopCount: 0, pathMessage: '' }
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    const pts = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i, x: 15 + Math.random() * 70, y: 60 + Math.random() * 30,
    }))
    setSparkles(pts)
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '8px 12px', minHeight: 100, flexShrink: 0,
      background: 'linear-gradient(180deg, #0a0f18 0%, #0d1420 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes sparkle { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-50px) scale(0); opacity:0; } }
      `}</style>

      <svg width="100%" height="85" viewBox="0 0 300 85" preserveAspectRatio="xMidYMid meet">
        {/* Torches */}
        <Torch x={15} />
        <Torch x={285} flip />

        {/* Doors or loop counter */}
        {scene.doors.length > 0 ? (
          <>
            {scene.doors.map((d, i) => {
              const spacing = 260 / (scene.doors.length + 1)
              return <Door key={d.label} x={20 + spacing * (i + 1)} label={d.label} open={d.open} color={d.color} />
            })}
          </>
        ) : scene.loopCount > 0 ? (
          <>
            {/* Loop visualization: stepping stones */}
            {Array.from({ length: Math.min(scene.loopCount, 8) }, (_, i) => {
              const x = 40 + i * 30
              return (
                <g key={i}>
                  <circle cx={x} cy="50" r="10" fill="#4dd0e120" stroke="#4dd0e1" strokeWidth="1.5" />
                  <text x={x} y="54" textAnchor="middle" fill="#4dd0e1" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                    {i + 1}
                  </text>
                </g>
              )
            })}
            {scene.loopCount > 8 && (
              <text x={290} y="54" textAnchor="end" fill="#667890" fontSize="10" fontFamily="JetBrains Mono">
                +{scene.loopCount - 8} more
              </text>
            )}
          </>
        ) : (
          <text x="150" y="50" textAnchor="middle" fill="#3a4a60" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            🛡️ Run your code to explore the labyrinth...
          </text>
        )}
      </svg>

      {/* Sparkles */}
      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#4dd0e1',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 8px #4dd0e1',
        }} />
      ))}
    </div>
  )
}
