import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx }
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d) }
function noise(d: number, v = 0.06, freq = 2000) { const c = getCtx(), sz = c.sampleRate * d; const buf = c.createBuffer(1, sz, c.sampleRate); const data = buf.getChannelData(0); for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); s.connect(f); f.connect(g); g.connect(c.destination); s.start() }

export const ArmourySounds = {
  metalClang() { tone(800, 0.08, 'square', 0.06); noise(0.1, 0.05, 4000); setTimeout(() => tone(600, 0.12, 'sine', 0.04), 40) },
  sheathe() { noise(0.15, 0.04, 3000); tone(400, 0.1, 'sine', 0.03) },
  success() { [440, 554, 659, 880].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025) }, i * 100)) },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
}

// ── CSS ───────────────────────────────────────────

const CSS = `
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
@keyframes ember-rise { 0%{transform:translateY(0) scale(1);opacity:.7} 100%{transform:translateY(-40px) scale(.3);opacity:0} }
@keyframes forge-glow { 0%,100%{opacity:.06;r:30} 50%{opacity:.14;r:36} }
@keyframes bar-grow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
@keyframes shimmer { 0%,100%{opacity:.1} 50%{opacity:.35} }
@keyframes hammer-spark { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0} }
@keyframes rack-sway { 0%,100%{transform:translateY(0)} 50%{transform:translateY(1px)} }
@keyframes cell-pop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
`

// ── Parse output ──────────────────────────────────

interface RackItem { label: string; value: number; kind: 'int' | 'string' | 'cell' }

function parseOutput(output: string, idx: number): RackItem[] {
  if (!output.trim()) return []
  const lines = output.trim().split('\n')
  const items: RackItem[] = []
  if (idx <= 3) {
    for (const l of lines) {
      const numMatch = l.match(/^(\d+)$/); if (numMatch) { items.push({ label: numMatch[1], value: parseInt(numMatch[1]), kind: 'int' }); continue }
      const labelMatch = l.match(/(Max|Min|Total|Average|Item).*?:?\s*(.+)$/i)
      if (labelMatch) { const v = parseInt(labelMatch[2]); items.push({ label: l.trim(), value: isNaN(v) ? 0 : v, kind: 'string' }) }
    }
  }
  if (idx === 1) return lines.map(l => ({ label: l.trim(), value: 0, kind: 'string' as const }))
  if (idx >= 4) {
    for (const l of lines) {
      const nums = l.trim().split(/\s+/).filter(Boolean)
      if (nums.length > 1 && nums.every(n => /^\d+$/.test(n))) for (const n of nums) items.push({ label: n, value: parseInt(n), kind: 'cell' })
      else if (l.trim()) items.push({ label: l.trim(), value: 0, kind: 'string' })
    }
  }
  return items
}

// ── Component ─────────────────────────────────────

export default function ArmouryVisuals({ output, compiled, success, challengeIdx, code }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number; code: string
}) {
  const items = compiled ? parseOutput(output, challengeIdx) : []
  const maxVal = Math.max(1, ...items.filter(i => i.kind === 'int' || i.kind === 'cell').map(i => i.value))
  const rackItems = items.filter(i => i.kind === 'int')
  const cells = items.filter(i => i.kind === 'cell')
  const stringItems = items.filter(i => i.kind === 'string')
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    setSparkles(Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i, x: 10 + Math.random() * 80, y: 50 + Math.random() * 40 })))
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '6px 12px', minHeight: 120, flexShrink: 0,
      background: 'linear-gradient(180deg, #100d06 0%, #1a1508 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Ember particles (always) */}
      {[...Array(7)].map((_, i) => (
        <div key={`ember-${i}`} style={{
          position: 'absolute', width: 3, height: 3, borderRadius: '50%',
          background: i % 2 === 0 ? '#ff980080' : '#f4a62a60',
          left: `${8 + i * 13}%`, bottom: '10%',
          animation: `ember-rise ${2.5 + i * 0.4}s ease-out infinite ${i * 0.6}s`,
        }} />
      ))}

      <svg width="100%" height="105" viewBox="0 0 360 105" preserveAspectRatio="xMidYMid meet">
        {/* ── Forge glow (background) ── */}
        <circle cx="180" cy="100" r="30" fill="#f4a62a" style={{ animation: 'forge-glow 3s ease-in-out infinite' }} />

        {/* ── Rack beam ── */}
        <g style={{ animation: compiled ? 'rack-sway 0.3s ease-in-out' : undefined }}>
          <rect x="25" y="14" width="310" height="5" rx="2.5" fill="#5a4a30" />
          <rect x="25" y="14" width="310" height="2.5" rx="1.2" fill="#7a6a4a" />
          {/* Bracket bolts */}
          {[40, 175, 310].map(bx => <circle key={bx} cx={bx} cy="16" r="2" fill="#8a7a5a" />)}
        </g>

        {cells.length > 0 ? (
          /* 2D grid with pop-in animation */
          cells.slice(0, 48).map((item, idx) => {
            const cols = Math.min(12, Math.ceil(Math.sqrt(cells.length * 1.5)))
            const row = Math.floor(idx / cols), col = idx % cols
            const intensity = Math.min(1, item.value / maxVal)
            const c = `hsl(${35 - intensity * 10}, 80%, ${40 + intensity * 20}%)`
            return (
              <g key={idx} style={{ animation: `cell-pop 0.3s ease-out ${idx * 0.03}s both` }}>
                <rect x={35 + col * 24} y={26 + row * 16} width="20" height="13" rx="2"
                  fill={`${c}40`} stroke={c} strokeWidth="1" />
                <text x={35 + col * 24 + 10} y={26 + row * 16 + 10} textAnchor="middle" fill={c}
                  fontSize="7" fontFamily="JetBrains Mono" fontWeight="700">{item.value}</text>
              </g>
            )
          })
        ) : rackItems.length > 0 ? (
          /* Weapon bars with grow animation + shimmer */
          rackItems.slice(0, 10).map((item, i) => {
            const spacing = Math.min(30, 280 / rackItems.length)
            const x = 40 + i * spacing
            const h = Math.max(8, (item.value / maxVal) * 42)
            const c = `hsl(${30 + (item.value / maxVal) * 20}, 80%, 55%)`
            return (
              <g key={i}>
                <rect x={x - 1} y="20" width="2" height="8" fill="#5a4a30" />
                {/* Bar with grow animation */}
                <rect x={x - 10} y={68 - h} width="20" height={h} rx="2"
                  fill={`${c}55`} stroke={c} strokeWidth="1.5"
                  style={{ animation: `bar-grow 0.5s ease-out ${i * 0.1}s both`, transformOrigin: `${x}px 68px` }} />
                {/* Shimmer overlay */}
                <rect x={x - 8} y={68 - h + 2} width="16" height={h - 4} rx="1" fill="#ffffff"
                  style={{ animation: `shimmer 2s ease-in-out infinite ${i * 0.3}s` }} />
                {/* Label */}
                <text x={x} y="80" textAnchor="middle" fill={c} fontSize="8" fontFamily="JetBrains Mono" fontWeight="700">{item.label}</text>
              </g>
            )
          })
        ) : stringItems.length > 0 ? (
          stringItems.slice(0, 4).map((item, i) => (
            <text key={i} x="180" y={32 + i * 16} textAnchor="middle" fill="#f4a62a" fontSize="10" fontFamily="JetBrains Mono">
              {item.label.length > 42 ? item.label.slice(0, 41) + '..' : item.label}
            </text>
          ))
        ) : (
          <text x="180" y="55" textAnchor="middle" fill="#2a1a08" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            🗡️ Run your code to fill the weapon rack...
          </text>
        )}

        {/* Hammer sparks on compile */}
        {compiled && success && [...Array(6)].map((_, i) => (
          <circle key={`hs-${i}`} cx="180" cy="95" r="2" fill="#ffc04d"
            style={{
              animation: `hammer-spark 0.6s ease-out ${i * 0.05}s forwards`,
              ['--sx' as any]: `${-20 + i * 8}px`, ['--sy' as any]: `${-10 - Math.random() * 20}px`,
            }} />
        ))}
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
