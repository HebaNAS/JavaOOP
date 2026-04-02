import { useState, useCallback, useRef, useEffect } from 'react'
import CodeEditor from '../ui/CodeEditor'
import { compileCode, CompileResult } from '../api/compiler'
import { useUnitStore } from '../state/unitStore'
import { UnitDef, ChallengeValidation } from './types'
import AlchemistVisuals, { LabSounds } from './unit2/AlchemistVisuals'

// ── Validation runner ──────────────────────────────

async function runValidation(
  code: string,
  v: ChallengeValidation,
): Promise<{ pass: boolean; msg: string; output: string; errors: string; time: number }> {
  const fail = (msg: string, r?: CompileResult) => ({
    pass: false, msg, output: r?.output ?? '', errors: r?.errors ?? '', time: r?.executionTime ?? 0,
  })

  if (v.type === 'testCases') {
    let lastOutput = ''
    for (const tc of v.cases) {
      const r = await compileCode(code, tc.stdin)
      lastOutput = r.output
      if (!r.success) return fail(r.errors.split('\n')[0], r)
      if (r.output.trim() !== tc.expected.trim())
        return fail(`Test [${tc.label}]: expected "${tc.expected.trim()}" but got "${r.output.trim()}"`, r)
    }
    return { pass: true, msg: `All ${v.cases.length} tests passed!`, output: lastOutput, errors: '', time: 0 }
  }

  const r = await compileCode(code, undefined)

  if (v.type === 'compiles')
    return r.success
      ? { pass: true, msg: 'Code compiles!', ...r, time: r.executionTime }
      : fail(r.errors.split('\n')[0], r)

  if (!r.success) return fail(r.errors.split('\n')[0], r)

  if (v.type === 'output') {
    const ok = r.output.trim() === v.expected.trim()
    return {
      pass: ok,
      msg: ok ? 'Correct output!' : `Expected "${v.expected.trim()}" but got "${r.output.trim()}"`,
      output: r.output, errors: '', time: r.executionTime,
    }
  }

  if (v.type === 'outputMatch') {
    const ok = v.pattern.test(r.output)
    return {
      pass: ok,
      msg: ok ? 'Output matches!' : `Output doesn't match expected format`,
      output: r.output, errors: '', time: r.executionTime,
    }
  }

  if (v.type === 'custom') {
    const ck = v.check(r, code)
    return { ...ck, output: r.output, errors: r.errors, time: r.executionTime }
  }

  return fail('Unknown validation type')
}

// ── Accessible color palette ───────────────────────
// WCAG AA compliant — avoids pure red/green as sole indicators
const C = {
  bg: '#161d30',
  surface: '#1e2842',
  surfaceLight: '#243050',
  border: '#2e3d5a',
  borderLight: '#3a4d6e',
  text: '#e8edf5',
  textMid: '#a0b0c8',
  textMuted: '#6d809c',
  success: '#4dbd74',
  successBg: 'rgba(77,189,116,0.10)',
  successBorder: '#2d7a4a',
  error: '#e8845a',
  errorBg: 'rgba(232,132,90,0.08)',
  warn: '#e8b84d',
}

// ── Component ──────────────────────────────────────

export default function UnitPage({ unit, onHome }: { unit: UnitDef; onHome: () => void }) {
  const [idx, setIdx] = useState(0)
  const [code, setCode] = useState(unit.challenges[0].starter)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState('')
  const [valMsg, setValMsg] = useState('')
  const [valPass, setValPass] = useState(false)
  const [running, setRunning] = useState(false)
  const [hintIdx, setHintIdx] = useState(-1)
  const [compiled, setCompiled] = useState(false)
  const outRef = useRef<HTMLDivElement>(null)

  const { complete, saveDraft, getDraft, getSolution, isDone } = useUnitStore()
  const ch = unit.challenges[idx]
  const done = isDone(unit.id, idx)

  // Auto-save draft
  const timer = useRef<number>(0)
  const handleCode = useCallback(
    (v: string) => {
      setCode(v)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => saveDraft(unit.id, idx, v), 800)
    },
    [unit.id, idx, saveDraft],
  )

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= unit.challenges.length) return
      setIdx(i)
      const draft = getDraft(unit.id, i)
      const sol = getSolution(unit.id, i)
      setCode(draft || sol || unit.challenges[i].starter)
      setOutput('')
      setErrors('')
      setValMsg('')
      setValPass(false)
      setHintIdx(-1)
      setCompiled(false)
    },
    [unit, getDraft, getSolution],
  )

  const run = useCallback(async () => {
    setRunning(true)
    setCompiled(false)
    setOutput('')
    setErrors('')
    setValMsg('')
    LabSounds.brew()
    try {
      const res = await runValidation(code, ch.validate)
      setOutput(res.output)
      setErrors(res.errors)
      setValMsg(res.msg)
      setValPass(res.pass)
      setCompiled(true)
      if (res.pass) {
        LabSounds.success()
        if (!isDone(unit.id, idx)) complete(unit.id, idx, code, ch.xp)
      } else {
        LabSounds.fail()
      }
    } finally {
      setRunning(false)
    }
  }, [code, ch, unit.id, idx, complete, isDone])

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [output, errors])

  const accent = unit.theme.primary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, color: C.text }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px',
        background: C.surface, borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onHome} style={{
          background: 'none', border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.textMid,
          padding: '6px 16px', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: 20,
        }}>
          ← Home
        </button>
        <span style={{ fontSize: 36 }}>{unit.theme.icon}</span>
        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 26, color: accent }}>
          Unit {unit.number}: {unit.title}
        </span>
        <span style={{ color: C.textMuted, fontSize: 22 }}>{unit.subtitle}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {unit.challenges.map((_, i) => {
            const d = isDone(unit.id, i)
            const active = i === idx
            return (
              <div key={i} onClick={() => goTo(i)} style={{
                width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, fontFamily: 'JetBrains Mono', fontWeight: 700,
                cursor: 'pointer', transition: 'all .15s',
                background: active ? `${accent}30` : d ? C.successBg : 'rgba(255,255,255,0.04)',
                border: active ? `2px solid ${accent}` : d ? `2px solid ${C.successBorder}` : `1px solid ${C.border}`,
                color: active ? accent : d ? C.success : C.textMuted,
              }}>
                {d ? '✓' : i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main split: EDITOR left, DESCRIPTION+OUTPUT right ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: Code editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` }}>
          {/* Editor header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#e85d5a' }} />
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#e8b84d' }} />
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#4dbd74' }} />
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 20, color: C.textMuted }}>Main.java</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setHintIdx((p) => (p < ch.hints.length - 1 ? p + 1 : -1))} style={{
                padding: '7px 18px', fontSize: 22, borderRadius: 8, cursor: 'pointer',
                background: `${accent}12`, color: accent,
                border: `1px solid ${accent}40`, fontFamily: 'JetBrains Mono', fontWeight: 600,
              }}>
                💡 {hintIdx >= 0 ? `${hintIdx + 1}/${ch.hints.length}` : 'Hint'}
              </button>
              <button onClick={run} disabled={running} style={{
                padding: '7px 22px', fontSize: 22, borderRadius: 8, cursor: 'pointer',
                background: running ? C.surfaceLight : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                opacity: running ? 0.5 : 1,
              }}>
                {running ? '⏳' : '▶'} Run
              </button>
            </div>
          </div>

          {/* Code editor area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CodeEditor value={code} onChange={handleCode} onRun={run} fontSize={20} />
          </div>

          {/* Validation result bar */}
          <div style={{
            padding: '12px 20px', borderTop: `1px solid ${C.border}`,
            background: valPass ? C.successBg : valMsg ? C.errorBg : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: 54,
          }}>
            <div style={{
              fontSize: 22, fontFamily: 'JetBrains Mono',
              color: valPass ? C.success : valMsg ? C.error : C.textMuted,
            }}>
              {valMsg
                ? `${valPass ? '✅ ' : '⚠️ '}${valMsg}`
                : 'Press ▶ Run or Ctrl+Enter'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {done && (
                <span style={{
                  fontSize: 20, color: C.success, fontFamily: 'JetBrains Mono',
                  background: C.successBg, padding: '4px 14px', borderRadius: 6,
                  border: `1px solid ${C.successBorder}`,
                }}>
                  +{ch.xp} XP ✓
                </span>
              )}
              {valPass && idx < unit.challenges.length - 1 && (
                <button onClick={() => goTo(idx + 1)} style={{
                  padding: '7px 20px', fontSize: 22, borderRadius: 8, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                }}>
                  NEXT →
                </button>
              )}
              {valPass && idx === unit.challenges.length - 1 && (
                <span style={{
                  fontSize: 22, color: C.warn, fontFamily: 'Orbitron', fontWeight: 700,
                }}>
                  🏆 UNIT COMPLETE!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: description + hints + output */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
          {/* Challenge info */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 27, color: accent, marginBottom: 6 }}>
              {ch.title}
            </div>
            <div style={{ fontSize: 20, color: C.textMuted, marginBottom: 14 }}>{ch.concept}</div>
            <div style={{ fontSize: 24, lineHeight: 1.7, color: C.textMid, whiteSpace: 'pre-line' }}>
              {ch.description}
            </div>
          </div>

          {/* Hints */}
          {hintIdx >= 0 && (
            <div style={{
              padding: '14px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
              background: `${accent}08`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: accent, fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                HINT {hintIdx + 1}/{ch.hints.length}
              </div>
              <div style={{ fontSize: 22, color: C.textMid, lineHeight: 1.6 }}>{ch.hints[hintIdx]}</div>
            </div>
          )}

          {/* Alchemist visuals (animated flasks) */}
          {unit.id === 'unit-2' && (
            <AlchemistVisuals code={code} compiled={compiled} success={valPass} />
          )}

          {/* Output panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '8px 24px', fontSize: 18, fontWeight: 700, color: C.textMuted,
              fontFamily: 'JetBrains Mono', borderBottom: `1px solid ${C.border}`,
              display: 'flex', gap: 16, background: C.surface,
            }}>
              <span>OUTPUT</span>
              {output && (
                <span style={{ color: C.success, fontWeight: 400 }}>
                  {output.split('\n').filter(Boolean).length} line(s)
                </span>
              )}
            </div>
            <div ref={outRef} style={{
              flex: 1, padding: '14px 24px', overflow: 'auto', fontFamily: 'JetBrains Mono', fontSize: 22,
              background: '#111827',
            }}>
              {errors && (
                <div style={{ color: C.error, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{errors}</div>
              )}
              {output && (
                <div style={{ color: C.text, whiteSpace: 'pre-wrap' }}>{output}</div>
              )}
              {!output && !errors && !running && (
                <div style={{ color: C.textMuted, fontStyle: 'italic' }}>
                  Press ▶ Run to compile and execute your code...
                </div>
              )}
              {running && (
                <div style={{ color: accent, fontSize: 22 }}>⏳ Compiling...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
