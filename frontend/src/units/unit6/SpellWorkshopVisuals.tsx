import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx }
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d) }
function noise(d: number, v = 0.05, freq = 3000) { const c = getCtx(), sz = c.sampleRate * d; const buf = c.createBuffer(1, sz, c.sampleRate); const data = buf.getChannelData(0); for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = buf; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); s.connect(fl); fl.connect(g); g.connect(c.destination); s.start() }

export const WorkshopSounds = {
  scrollUnroll() { noise(0.2, 0.04, 5000); tone(300, 0.08, 'sine', 0.03) },
  spellCast() { tone(660, 0.15, 'sine', 0.06); setTimeout(() => tone(880, 0.12, 'sine', 0.05), 70); setTimeout(() => tone(1100, 0.1, 'sine', 0.04), 140) },
  success() { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025) }, i * 100)) },
  fail() { tone(220, 0.25, 'square', 0.05); setTimeout(() => tone(165, 0.3, 'square', 0.04), 120) },
}

// ── CSS ───────────────────────────────────────────

const CSS = `
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
@keyframes orbit { 0%{transform:rotate(0deg) translateX(14px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(14px) rotate(-360deg)} }
@keyframes rune-float { 0%{transform:translateY(0);opacity:.2} 50%{transform:translateY(-8px);opacity:.5} 100%{transform:translateY(-16px);opacity:0} }
@keyframes scroll-unroll { 0%{transform:scaleY(0);opacity:0} 100%{transform:scaleY(1);opacity:1} }
@keyframes quill-bob { 0%,100%{transform:translate(0,0) rotate(-30deg)} 50%{transform:translate(2px,-3px) rotate(-25deg)} }
@keyframes ink-drip { 0%{r:0;opacity:0} 50%{r:1.5;opacity:.5} 100%{r:0;opacity:0} }
@keyframes magic-circle { 0%{stroke-dashoffset:150} 100%{stroke-dashoffset:0} }
@keyframes glow-breathe { 0%,100%{opacity:.05} 50%{opacity:.18} }
@keyframes text-reveal { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
`

// ── Parse methods from code ───────────────────────

interface SpellScroll { name: string; params: string; returnType: string }

function parseMethods(code: string): SpellScroll[] {
  const scrolls: SpellScroll[] = []
  const rx = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(void|int|double|boolean|String|char|float|long)\s+(\w+)\s*\(([^)]*)\)/g
  let m
  while ((m = rx.exec(code)) !== null) {
    if (m[2] === 'main' || m[2] === 'println' || m[2] === 'print') continue
    scrolls.push({ returnType: m[1], name: m[2], params: m[3].trim() })
  }
  return scrolls
}

// ── Component ─────────────────────────────────────

export default function SpellWorkshopVisuals({ code, compiled, success }: {
  code: string; compiled: boolean; success: boolean
}) {
  const scrolls = parseMethods(code)
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (!compiled || !success) return
    setSparkles(Array.from({ length: 14 }, (_, i) => ({ id: Date.now() + i, x: 10 + Math.random() * 80, y: 40 + Math.random() * 50 })))
    const t = setTimeout(() => setSparkles([]), 2000)
    return () => clearTimeout(t)
  }, [compiled, success])

  return (
    <div style={{
      padding: '6px 12px', minHeight: 120, flexShrink: 0,
      background: 'linear-gradient(180deg, #100a14 0%, #1a0c16 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Floating rune particles (always) */}
      {[...Array(6)].map((_, i) => (
        <div key={`rune-${i}`} style={{
          position: 'absolute', left: `${12 + i * 15}%`, bottom: '20%',
          color: '#e8439340', fontSize: 10, fontFamily: 'serif',
          animation: `rune-float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.8}s`,
        }}>
          {['✦', '◆', '✧', '⬥', '✦', '◇'][i]}
        </div>
      ))}

      <svg width="100%" height="105" viewBox="0 0 360 105" preserveAspectRatio="xMidYMid meet">
        {scrolls.length > 0 ? scrolls.slice(0, 3).map((s, i) => {
          const spacing = Math.min(110, 300 / scrolls.length)
          const cx = 55 + i * spacing
          const active = compiled
          const col = active ? '#e84393' : '#5a3a50'
          return (
            <g key={s.name} style={{ animation: `scroll-unroll 0.5s ease-out ${i * 0.2}s both`, transformOrigin: `${cx}px 10px` }}>
              {/* Magic circle underneath */}
              <circle cx={cx} cy="52" r="38" fill="none" stroke={col} strokeWidth="0.8" strokeDasharray="150" opacity="0.3"
                style={active ? { animation: `magic-circle 1.5s ease-out ${i * 0.2}s both` } : {}} />
              <circle cx={cx} cy="52" r="32" fill="none" stroke={col} strokeWidth="0.5" strokeDasharray="100" opacity="0.2"
                style={active ? { animation: `magic-circle 2s ease-out ${0.3 + i * 0.2}s both` } : {}} />

              {/* Scroll body */}
              <rect x={cx - 35} y="14" width="70" height="56" rx="4"
                fill={active ? '#e8439310' : '#1a0c1600'} stroke={col} strokeWidth="1.5" />
              {/* Top & bottom rolls */}
              <rect x={cx - 37} y="11" width="74" height="7" rx="3.5" fill={active ? '#e84393' : '#4a3a44'} opacity="0.5" />
              <rect x={cx - 37} y="67" width="74" height="7" rx="3.5" fill={active ? '#e84393' : '#4a3a44'} opacity="0.5" />

              {/* Method name */}
              <text x={cx} y="32" textAnchor="middle" fill={active ? '#f0f4fa' : '#7a6a80'}
                fontSize="10" fontFamily="JetBrains Mono" fontWeight="700"
                style={active ? { animation: `text-reveal 0.4s ease-out ${0.3 + i * 0.2}s both` } : {}}>
                {s.name}()
              </text>
              {/* Params */}
              {s.params && <text x={cx} y="45" textAnchor="middle" fill={active ? '#c090b0' : '#4a3a50'}
                fontSize="7.5" fontFamily="JetBrains Mono"
                style={active ? { animation: `text-reveal 0.4s ease-out ${0.4 + i * 0.2}s both` } : {}}>
                {s.params.length > 20 ? s.params.slice(0, 19) + '..' : s.params}
              </text>}
              {/* Return type */}
              <text x={cx} y="58" textAnchor="middle" fill={active ? '#e84393' : '#4a3a50'}
                fontSize="8" fontFamily="JetBrains Mono" fontWeight="600"
                style={active ? { animation: `text-reveal 0.4s ease-out ${0.5 + i * 0.2}s both` } : {}}>
                → {s.returnType}
              </text>

              {/* Glow */}
              {active && <rect x={cx - 33} y="16" width="66" height="52" rx="3" fill="#e84393"
                style={{ animation: 'glow-breathe 2.5s ease-in-out infinite' }} />}

              {/* Orbiting particles when active */}
              {active && [0, 1, 2].map(oi => (
                <circle key={oi} cx={cx} cy="45" r="2" fill="#e84393"
                  style={{ animation: `orbit ${2 + oi * 0.5}s linear infinite ${oi * 0.6}s`, opacity: 0.6 }} />
              ))}
            </g>
          )
        }) : (
          <>
            {/* Quill (idle, always bobbing) */}
            <g transform="translate(160, 30)" style={{ animation: 'quill-bob 2s ease-in-out infinite' }}>
              <line x1="0" y1="0" x2="18" y2="30" stroke="#8a7a5a" strokeWidth="1.5" />
              <polygon points="18,30 22,28 20,34" fill="#8a7a5a" />
              <ellipse cx="0" cy="-2" rx="4" ry="8" fill="#d0a060" opacity="0.6" />
              {/* Ink drip */}
              <circle cx="20" cy="34" fill="#e84393" style={{ animation: 'ink-drip 2s ease-in-out infinite 1s' }} />
            </g>
            <text x="180" y="78" textAnchor="middle" fill="#2a1520" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
              📜 Define a method to see your spell scroll...
            </text>
          </>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#e84393',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 10px #e84393',
        }} />
      ))}
    </div>
  )
}
