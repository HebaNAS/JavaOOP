import { useState, useEffect } from 'react'

// ── Sounds ────────────────────────────────────────

let ctx: AudioContext | null = null
function getCtx(): AudioContext { if (!ctx) ctx = new AudioContext(); if (ctx.state === 'suspended') ctx.resume(); return ctx }
function tone(f: number, d: number, t: OscillatorType = 'sine', v = 0.1) { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d) }
function noise(d: number, v = 0.06, freq = 1500) { const c = getCtx(), sz = c.sampleRate * d; const buf = c.createBuffer(1, sz, c.sampleRate); const data = buf.getChannelData(0); for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = buf; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); s.connect(fl); fl.connect(g); g.connect(c.destination); s.start() }

export const ShadowSounds = {
  portalHum() { tone(55, 0.5, 'sawtooth', 0.04); tone(82, 0.4, 'sine', 0.03) },
  exceptionZap() { noise(0.15, 0.08, 3000); tone(900, 0.08, 'square', 0.06); setTimeout(() => tone(600, 0.1, 'square', 0.04), 50) },
  catchShield() { tone(440, 0.2, 'sine', 0.06); tone(660, 0.15, 'sine', 0.04); setTimeout(() => tone(880, 0.1, 'sine', 0.03), 100) },
  success() { [587, 740, 880, 1175].forEach((n, i) => setTimeout(() => { tone(n, 0.3, 'sine', 0.07); tone(n * 1.5, 0.2, 'triangle', 0.025) }, i * 100)) },
  fail() { tone(196, 0.3, 'sawtooth', 0.05); setTimeout(() => tone(130, 0.4, 'sawtooth', 0.04), 120) },
}

// ── CSS ───────────────────────────────────────────

const CSS = `
@keyframes sparkle { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
@keyframes shadow-float { 0%{transform:translate(0,0);opacity:.2} 50%{transform:translate(5px,-10px);opacity:.45} 100%{transform:translate(-3px,-20px);opacity:0} }
@keyframes portal-pulse { 0%,100%{rx:35;ry:22;opacity:.5} 50%{rx:38;ry:24;opacity:.75} }
@keyframes lightning { 0%{opacity:0} 10%{opacity:.9} 20%{opacity:0} 30%{opacity:.7} 40%{opacity:0} 100%{opacity:0} }
@keyframes rune-glow { 0%,100%{opacity:.2;fill:#b366ff} 50%{opacity:.7;fill:#d9a6ff} }
@keyframes ring-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes caught-flash { 0%{opacity:0;r:5} 50%{opacity:.6;r:25} 100%{opacity:0;r:40} }
@keyframes text-shimmer { 0%,100%{fill:#b366ff} 50%{fill:#d9a6ff} }
`

// ── Parse output ──────────────────────────────────

interface SceneState {
  hasException: boolean
  caught: boolean
  stringOps: boolean
  output: string
}

function parseOutput(output: string, idx: number): SceneState {
  const hasException = output.includes('Error') || output.includes('Caught') || output.includes('Trap') || output.includes('Not a number')
  const caught = hasException && !output.includes('Exception in thread')
  const stringOps = idx >= 4
  return { hasException, caught, stringOps, output }
}

// ── Component ─────────────────────────────────────

export default function ShadowRealmVisuals({ output, compiled, success, challengeIdx }: {
  output: string; compiled: boolean; success: boolean; challengeIdx: number
}) {
  const scene = compiled ? parseOutput(output, challengeIdx) : { hasException: false, caught: false, stringOps: false, output: '' }
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
      background: 'linear-gradient(180deg, #08060e 0%, #140e1e 100%)',
      borderBottom: '1px solid #30405c', position: 'relative', overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* Ambient shadow particles */}
      {[...Array(8)].map((_, i) => (
        <div key={`sp-${i}`} style={{
          position: 'absolute', width: 3, height: 3, borderRadius: '50%',
          background: '#b366ff50', left: `${8 + i * 12}%`, bottom: `${15 + (i % 4) * 15}%`,
          animation: `shadow-float ${3 + i * 0.4}s ease-in-out infinite ${i * 0.6}s`,
        }} />
      ))}

      <svg width="100%" height="105" viewBox="0 0 360 105" preserveAspectRatio="xMidYMid meet">
        {/* ── Portal (always visible, center) ── */}
        <g transform="translate(180, 52)">
          {/* Outer ring (spinning) */}
          <ellipse cx="0" cy="0" rx="42" ry="26" fill="none" stroke="#b366ff30" strokeWidth="1.5" strokeDasharray="8 6"
            style={{ animation: 'ring-spin 12s linear infinite' }} />
          {/* Portal body */}
          <ellipse cx="0" cy="0" rx="35" ry="22" fill="#b366ff10" stroke="#b366ff60" strokeWidth="2"
            style={{ animation: 'portal-pulse 3s ease-in-out infinite' }} />
          {/* Inner glow */}
          <ellipse cx="0" cy="0" rx="20" ry="12" fill="#b366ff15">
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
          </ellipse>
          {/* Core light */}
          <ellipse cx="0" cy="0" rx="8" ry="5" fill="#d9a6ff20" />

          {/* Lightning bolts (on exception) */}
          {compiled && scene.hasException && (
            <>
              <line x1="-20" y1="-15" x2="-5" y2="0" stroke="#ff8c5a" strokeWidth="2"
                style={{ animation: 'lightning 0.8s ease-out forwards' }} />
              <line x1="15" y1="-12" x2="5" y2="3" stroke="#ff8c5a" strokeWidth="2"
                style={{ animation: 'lightning 0.8s ease-out 0.1s forwards' }} />
            </>
          )}

          {/* Shield pulse (when caught) */}
          {compiled && scene.caught && (
            <circle cx="0" cy="0" r="5" fill="none" stroke="#5cd98e" strokeWidth="2"
              style={{ animation: 'caught-flash 0.8s ease-out forwards' }} />
          )}
        </g>

        {/* ── Cipher runes on walls (for string challenges) ── */}
        {scene.stringOps && compiled ? (
          ['A', 'B', 'C', 'D', 'E', 'F'].map((r, i) => (
            <text key={i} x={30 + i * 55} y={20} textAnchor="middle" fontSize="14"
              fontFamily="serif" style={{ animation: `rune-glow ${2 + i * 0.3}s ease-in-out infinite ${i * 0.4}s` }}>
              {r}
            </text>
          ))
        ) : (
          /* Ambient runes */
          ['✦', '◆', '✧', '⬥'].map((r, i) => (
            <text key={i} x={50 + i * 75} y={18} textAnchor="middle" fontSize="10" fontFamily="serif"
              style={{ animation: `rune-glow ${3 + i * 0.5}s ease-in-out infinite ${i * 0.7}s` }}>
              {r}
            </text>
          ))
        )}

        {/* ── Status indicators ── */}
        {compiled && scene.hasException && scene.caught && (
          <text x="180" y="95" textAnchor="middle" fill="#5cd98e" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700"
            style={{ animation: 'text-shimmer 2s ease-in-out infinite' }}>
            Exception caught — portal stabilised
          </text>
        )}
        {compiled && scene.hasException && !scene.caught && (
          <text x="180" y="95" textAnchor="middle" fill="#ff8c5a" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
            ⚡ Uncaught exception — portal destabilised!
          </text>
        )}
        {compiled && !scene.hasException && (
          <text x="180" y="95" textAnchor="middle" fill="#b366ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700"
            style={{ animation: 'text-shimmer 2s ease-in-out infinite' }}>
            Code executed cleanly
          </text>
        )}

        {!compiled && (
          <text x="180" y="95" textAnchor="middle" fill="#2a1a35" fontSize="12" fontFamily="JetBrains Mono" fontStyle="italic">
            👻 Run your code to enter the Shadow Realm...
          </text>
        )}
      </svg>

      {sparkles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: 5, height: 5, borderRadius: '50%', background: '#b366ff',
          animation: 'sparkle 1.5s ease-out forwards', boxShadow: '0 0 10px #b366ff',
        }} />
      ))}
    </div>
  )
}
