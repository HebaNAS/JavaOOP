import { useState, useEffect } from 'react'

// ── Lab sounds ────────────────────────────────────

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

export const LabSounds = {
  brew() { for (let i = 0; i < 5; i++) setTimeout(() => tone(300 + Math.random() * 400, 0.12, 'sine', 0.06), i * 80) },
  success() { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.08); tone(n * 1.5, 0.2, 'triangle', 0.03) }, i * 100)) },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
  pour() { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(600, c.currentTime); o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4); g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4) },
}

// ── Parse variables from code ─────────────────────

interface LabVar { type: string; name: string; value: string }
const TYPE_COLORS: Record<string, string> = { int: '#4da6ff', double: '#4dbd74', float: '#4dbd74', String: '#f4a62a', boolean: '#c77dff', char: '#ff8a65' }

function extractVars(code: string): LabVar[] {
  const vars: LabVar[] = []
  for (const line of code.split('\n')) {
    const m = line.match(/^\s*(int|double|float|String|boolean|char)\s+(\w+)\s*=\s*(.+?)\s*;/)
    if (m) vars.push({ type: m[1], name: m[2], value: m[3].replace(/^"|"$/g, '') })
  }
  return vars
}

// ── Animations CSS ────────────────────────────────

const CSS = `
@keyframes bubble-rise { 0%{transform:translateY(0);opacity:.6} 100%{transform:translateY(-25px);opacity:0} }
@keyframes steam-rise { 0%{transform:translateY(0) scale(1);opacity:.3} 100%{transform:translateY(-35px) scale(2);opacity:0} }
@keyframes flask-fill { from{opacity:0;transform:translateY(8px) scale(.85)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes cauldron-bubble { 0%,100%{ry:3;cy:48} 50%{ry:5;cy:44} }
@keyframes glow-pulse { 0%,100%{opacity:.15} 50%{opacity:.35} }
@keyframes liquid-wobble { 0%,100%{d:path("M0,0 Q10,-3 20,0 Q30,3 40,0")} 50%{d:path("M0,0 Q10,3 20,0 Q30,-3 40,0")} }
@keyframes drip { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(15px);opacity:0} }
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
@keyframes float-particle { 0%{transform:translate(0,0);opacity:.4} 50%{transform:translate(8px,-12px);opacity:.7} 100%{transform:translate(-4px,-24px);opacity:0} }
`

// ── Component ─────────────────────────────────────

export default function AlchemistVisuals({ code, compiled, success }: {
  code: string; compiled: boolean; success: boolean
}) {
  const vars = extractVars(code)
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    setSparkles(Array.from({ length: 14 }, (_, i) => ({ id: Date.now() + i, x: 10 + Math.random() * 80, y: 60 + Math.random() * 30 })))
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '6px 12px', minHeight: 120, flexShrink: 0,
      background: 'linear-gradient(180deg, #0d1117 0%, #131a28 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Ambient floating particles (always visible) */}
      {[...Array(6)].map((_, i) => (
        <div key={`ap-${i}`} style={{
          position: 'absolute', width: 3, height: 3, borderRadius: '50%',
          background: '#9b7dff', left: `${15 + i * 14}%`, top: `${60 + (i % 3) * 15}%`,
          animation: `float-particle ${2.5 + i * 0.4}s ease-in-out infinite ${i * 0.5}s`,
        }} />
      ))}

      <svg width="100%" height="105" viewBox="0 0 360 105" preserveAspectRatio="xMidYMid meet">
        {/* ── Cauldron (center, always bubbling) ── */}
        <g transform="translate(180, 40)">
          {/* Cauldron body */}
          <ellipse cx="0" cy="20" rx="28" ry="10" fill="#2a2030" stroke="#4a3a55" strokeWidth="1.5" />
          <path d="M-28 20 Q-30 0 -22 -8 L22 -8 Q30 0 28 20" fill="#2a2030" stroke="#4a3a55" strokeWidth="1.5" />
          {/* Liquid surface */}
          <ellipse cx="0" cy="-2" rx="22" ry="6" fill="#9b7dff30" stroke="#9b7dff50" strokeWidth="1">
            <animate attributeName="ry" values="6;7;5;6" dur="2s" repeatCount="indefinite" />
          </ellipse>
          {/* Bubbles */}
          {[0, 1, 2, 3, 4].map(i => (
            <circle key={i} cx={-10 + i * 5} cy={-2} r={2 + (i % 2)}
              fill="#9b7dff" opacity="0"
              style={{ animation: `bubble-rise ${1.2 + i * 0.3}s ease-out infinite ${i * 0.4}s` }} />
          ))}
          {/* Steam wisps */}
          {[0, 1, 2].map(i => (
            <circle key={`s${i}`} cx={-8 + i * 8} cy={-10} r={4 + i * 2}
              fill="#9b7dff15" style={{ animation: `steam-rise ${2 + i * 0.5}s ease-out infinite ${i * 0.7}s` }} />
          ))}
          {/* Glow */}
          <ellipse cx="0" cy="-2" rx="26" ry="12" fill="#9b7dff" opacity="0.08">
            <animate attributeName="opacity" values="0.06;0.15;0.06" dur="3s" repeatCount="indefinite" />
          </ellipse>
          {/* Legs */}
          <line x1="-20" y1="25" x2="-24" y2="38" stroke="#4a3a55" strokeWidth="2" />
          <line x1="20" y1="25" x2="24" y2="38" stroke="#4a3a55" strokeWidth="2" />
          <line x1="0" y1="28" x2="0" y2="40" stroke="#4a3a55" strokeWidth="2" />
        </g>

        {/* ── Flasks for each variable ── */}
        {vars.length > 0 ? vars.slice(0, 4).map((v, i) => {
          const col = TYPE_COLORS[v.type] || '#8c9bb5'
          const leftSide = i < 2
          const xBase = leftSide ? 30 + i * 60 : 240 + (i - 2) * 60
          return (
            <g key={v.name} style={{ animation: compiled ? `flask-fill 0.5s ease-out ${i * 0.2}s both` : undefined, opacity: compiled ? 1 : 0.25 }}>
              {/* Flask */}
              <path d={`M${xBase - 8} 15 L${xBase - 8} 40 L${xBase - 16} 72 Q${xBase - 18} 80 ${xBase - 8} 82 L${xBase + 8} 82 Q${xBase + 18} 80 ${xBase + 16} 72 L${xBase + 8} 40 L${xBase + 8} 15`}
                fill="none" stroke="#4a5a72" strokeWidth="1.5" />
              {/* Cork */}
              <rect x={xBase - 10} y="10" width="20" height="7" rx="3" fill="#8b6f47" />
              {/* Liquid */}
              <rect x={xBase - 14} y={compiled ? 42 : 85} width="28" height="38" rx="2"
                fill={`${col}50`} clipPath={`url(#fc-${i})`}
                style={{ transition: 'y 0.8s cubic-bezier(.4,0,.2,1)' }} />
              <defs><clipPath id={`fc-${i}`}><path d={`M${xBase - 8} 15 L${xBase - 8} 40 L${xBase - 16} 72 Q${xBase - 18} 80 ${xBase - 8} 82 L${xBase + 8} 82 Q${xBase + 18} 80 ${xBase + 16} 72 L${xBase + 8} 40 L${xBase + 8} 15`} /></clipPath></defs>
              {/* Glow pulse */}
              {compiled && <circle cx={xBase} cy="60" r="20" fill={col} style={{ animation: 'glow-pulse 2s ease-in-out infinite' }} />}
              {/* Drip */}
              {compiled && <circle cx={xBase} cy="82" r="2" fill={col} opacity="0.6"
                style={{ animation: `drip 1.5s ease-in infinite ${1 + i * 0.3}s` }} />}
              {/* Bubbles inside */}
              {compiled && [0, 1].map(bi => (
                <circle key={bi} cx={xBase - 4 + bi * 8} cy={65} r={2} fill={col} opacity="0.4"
                  style={{ animation: `bubble-rise ${1 + bi * 0.4}s ease-out infinite ${bi * 0.5}s` }} />
              ))}
              {/* Labels */}
              <text x={xBase} y="96" textAnchor="middle" fill={col} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">{v.name}</text>
              <text x={xBase} y="104" textAnchor="middle" fill="#8c9bb5" fontSize="7" fontFamily="JetBrains Mono">{v.type} = {v.value.length > 8 ? v.value.slice(0, 7) + '..' : v.value}</text>
            </g>
          )
        }) : (
          <text x="180" y="88" textAnchor="middle" fill="#3a2a50" fontSize="11" fontFamily="JetBrains Mono" fontStyle="italic">
            🧪 Declare variables to fill the flasks...
          </text>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 6, height: 6, borderRadius: '50%', background: '#e8b84d',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 10px #e8b84d',
        }} />
      ))}
    </div>
  )
}
