import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx }
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d) }
function noise(d: number, v = 0.08, freq = 2000) { const c = getCtx(), sz = c.sampleRate * d; const buf = c.createBuffer(1, sz, c.sampleRate); const data = buf.getChannelData(0); for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); s.connect(f); f.connect(g); g.connect(c.destination); s.start() }

export const LabyrinthSounds = {
  doorOpen() { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, c.currentTime); o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.5); g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5); noise(0.3, 0.04, 400) },
  footstep() { tone(80, 0.08, 'square', 0.05); noise(0.06, 0.06, 600) },
  gemCollect() { tone(880, 0.15, 'sine', 0.07); setTimeout(() => tone(1100, 0.12, 'sine', 0.05), 60) },
  success() { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.08); tone(n * 1.5, 0.2, 'triangle', 0.03) }, i * 100)) },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
}

// ── Animations CSS ────────────────────────────────

const CSS = `
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-50px) scale(0);opacity:0} }
@keyframes torch-flicker { 0%,100%{opacity:.85;transform:scaleY(1)} 25%{opacity:.6;transform:scaleY(1.15)} 50%{opacity:.9;transform:scaleY(.9)} 75%{opacity:.7;transform:scaleY(1.1)} }
@keyframes smoke-rise { 0%{transform:translateY(0) scale(1);opacity:.25} 100%{transform:translateY(-30px) scale(2.5);opacity:0} }
@keyframes dust-float { 0%{transform:translate(0,0);opacity:.3} 33%{transform:translate(6px,-4px);opacity:.5} 66%{transform:translate(-3px,-8px);opacity:.3} 100%{transform:translate(2px,-14px);opacity:0} }
@keyframes door-open { 0%{transform:scaleX(1)} 100%{transform:scaleX(.15)} }
@keyframes footprint-appear { 0%{opacity:0;transform:scale(.5)} 100%{opacity:.5;transform:scale(1)} }
@keyframes glow-breathe { 0%,100%{opacity:.1;r:18} 50%{opacity:.25;r:22} }
@keyframes stone-pulse { 0%,100%{stroke-opacity:.4} 50%{stroke-opacity:1} }
`

// ── Parse output ──────────────────────────────────

interface SceneState { doors: { label: string; open: boolean; color: string }[]; loopCount: number }

function parseOutput(output: string, idx: number): SceneState {
  const state: SceneState = { doors: [], loopCount: 0 }
  if (!output.trim()) return state
  const lines = output.trim().split('\n').filter(Boolean)

  if (idx <= 3) {
    if (output.includes('Gold')) state.doors = [{ label: 'Gold', open: true, color: '#ffc04d' }, { label: 'Silver', open: false, color: '#a0b0c8' }, { label: 'Bronze', open: false, color: '#c08050' }]
    else if (output.includes('Silver')) state.doors = [{ label: 'Gold', open: false, color: '#ffc04d' }, { label: 'Silver', open: true, color: '#a0b0c8' }, { label: 'Bronze', open: false, color: '#c08050' }]
    else if (output.includes('Bronze')) state.doors = [{ label: 'Gold', open: false, color: '#ffc04d' }, { label: 'Silver', open: false, color: '#a0b0c8' }, { label: 'Bronze', open: true, color: '#c08050' }]
    else if (output.includes('open') || output.includes('safe') || output.includes('vault') || output.includes('bright'))
      state.doors = [{ label: '✓', open: true, color: '#5cd98e' }]
    else if (lines.length > 0) state.doors = [{ label: '✗', open: false, color: '#ff8c5a' }]
  } else if (idx <= 5) {
    const dirs = ['north', 'south', 'east', 'west']
    const cols = ['#4dd0e1', '#5cd98e', '#ff8c5a', '#c77dff']
    const openDir = dirs.findIndex(d => output.toLowerCase().includes(d))
    state.doors = dirs.map((d, i) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), open: i === openDir, color: cols[i] }))
    if (openDir === -1) state.doors = [{ label: '???', open: false, color: '#8899b4' }]
  } else {
    state.loopCount = lines.filter(l => l.includes('collected') || l.includes('Echo')).length
  }
  return state
}

// ── Component ─────────────────────────────────────

export default function LabyrinthVisuals({ output, compiled, success, challengeIdx }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number
}) {
  const scene = compiled ? parseOutput(output, challengeIdx) : { doors: [], loopCount: 0 }
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
      background: 'linear-gradient(180deg, #0a0f18 0%, #0d1420 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Ambient dust motes */}
      {[...Array(8)].map((_, i) => (
        <div key={`dust-${i}`} style={{
          position: 'absolute', width: 2, height: 2, borderRadius: '50%',
          background: '#ffc04d40', left: `${10 + i * 11}%`, top: `${30 + (i % 4) * 15}%`,
          animation: `dust-float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.7}s`,
        }} />
      ))}

      <svg width="100%" height="105" viewBox="0 0 340 105" preserveAspectRatio="xMidYMid meet">
        {/* ── Torches with smoke ── */}
        {[18, 322].map((tx, ti) => (
          <g key={ti} transform={`translate(${tx}, 5)`}>
            <rect x="-3" y="28" width="6" height="26" rx="2" fill="#5a4a30" />
            <rect x="-7" y="24" width="14" height="7" rx="2" fill="#7a6a4a" />
            {/* Flame layers */}
            <ellipse cx="0" cy="18" rx="6" ry="10" fill="#ff9800" style={{ animation: `torch-flicker 0.6s ease-in-out infinite ${ti * 0.2}s`, transformOrigin: '0 24px' }} />
            <ellipse cx="0" cy="16" rx="3" ry="6" fill="#ffc04d" style={{ animation: `torch-flicker 0.45s ease-in-out infinite ${ti * 0.15}s`, transformOrigin: '0 22px' }} />
            <ellipse cx="0" cy="14" rx="1.5" ry="3" fill="#fff8e1" opacity="0.6" />
            {/* Glow */}
            <circle cx="0" cy="18" r="18" fill="#ff9800">
              <animate attributeName="opacity" values="0.08;0.16;0.08" dur="1.5s" repeatCount="indefinite" begin={`${ti * 0.3}s`} />
            </circle>
            {/* Smoke */}
            {[0, 1, 2].map(si => (
              <circle key={si} cx={-3 + si * 3} cy="6" r={3 + si} fill="#66666618"
                style={{ animation: `smoke-rise ${2.5 + si * 0.5}s ease-out infinite ${si * 0.8}s` }} />
            ))}
          </g>
        ))}

        {/* ── Stone floor ── */}
        <line x1="30" y1="90" x2="310" y2="90" stroke="#2a3a50" strokeWidth="1" strokeDasharray="8 4" />

        {/* ── Doors ── */}
        {scene.doors.length > 0 ? scene.doors.map((d, i) => {
          const spacing = 260 / (scene.doors.length + 1)
          const dx = 40 + spacing * (i + 1)
          return (
            <g key={d.label} transform={`translate(${dx}, 20)`}>
              {/* Arch */}
              <path d="M-20 65 L-20 8 Q-20 -8 0 -8 Q20 -8 20 8 L20 65" fill="none" stroke="#5a6a80" strokeWidth="2.5" />
              {/* Door panel — animates open */}
              <rect x="-17" y="2" width="34" height="60" rx="2"
                fill={d.open ? `${d.color}20` : '#1a2030'}
                stroke={d.open ? d.color : '#3a4a60'} strokeWidth="2"
                style={d.open ? { animation: 'door-open 0.6s ease-in-out forwards', transformOrigin: `${dx - 17}px 32px` } : {}}
              />
              {/* Light spill when open */}
              {d.open && <rect x="-15" y="4" width="30" height="56" rx="1" fill={d.color} opacity="0.12">
                <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
              </rect>}
              {/* Handle */}
              <circle cx="12" cy="32" r="2.5" fill={d.open ? d.color : '#5a6a80'} />
              {/* Label */}
              <text x="0" y="78" textAnchor="middle" fill={d.open ? d.color : '#667890'}
                fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">{d.label}</text>
              {/* Glow halo */}
              {d.open && <circle cx="0" cy="30" r="20" fill={d.color}>
                <animate attributeName="opacity" values="0.05;0.12;0.05" dur="2s" repeatCount="indefinite" />
              </circle>}
            </g>
          )
        }) : scene.loopCount > 0 ? (
          /* Loop stepping stones with footprints */
          <>
            {Array.from({ length: Math.min(scene.loopCount, 10) }, (_, i) => {
              const x = 40 + i * 28
              return (
                <g key={i}>
                  <circle cx={x} cy="55" r="12" fill="#4dd0e115" stroke="#4dd0e1" strokeWidth="1.5"
                    style={{ animation: `stone-pulse 1.5s ease-in-out infinite ${i * 0.15}s` }} />
                  <text x={x} y="59" textAnchor="middle" fill="#4dd0e1" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">{i + 1}</text>
                  {/* Footprint */}
                  <ellipse cx={x} cy="74" rx="3" ry="1.5" fill="#4dd0e130"
                    style={{ animation: `footprint-appear 0.3s ease-out ${0.5 + i * 0.15}s both` }} />
                </g>
              )
            })}
            {scene.loopCount > 10 && <text x={325} y="58" textAnchor="end" fill="#4a6080" fontSize="9" fontFamily="JetBrains Mono">+{scene.loopCount - 10}</text>}
          </>
        ) : (
          <text x="170" y="55" textAnchor="middle" fill="#2a3a50" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            🛡️ Run your code to explore the labyrinth...
          </text>
        )}
      </svg>

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
