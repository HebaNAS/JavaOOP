import { useState, useCallback, useRef, useEffect } from 'react'
import CodeEditor from '../ui/CodeEditor'
import { compileCode, CompileResult } from '../api/compiler'
import { useUnitStore } from '../state/unitStore'
import { UnitDef, ChallengeValidation } from './types'
import AlchemistVisuals, { LabSounds } from './unit2/AlchemistVisuals'
import LabyrinthVisuals, { LabyrinthSounds } from './unit3/LabyrinthVisuals'
import DeepLabyrinthVisuals, { DeepSounds } from './unit4/DeepLabyrinthVisuals'
import ArmouryVisuals, { ArmourySounds } from './unit5/ArmouryVisuals'
import SpellWorkshopVisuals, { WorkshopSounds } from './unit6/SpellWorkshopVisuals'

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

  // custom gets its own compile call (may need stdin)
  if (v.type === 'custom') {
    const r = await compileCode(code, v.stdin)
    const ck = v.check(r, code)
    return { ...ck, output: r.output, errors: r.errors, time: r.executionTime }
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

  return fail('Unknown validation type')
}

// ── High-contrast color palette ────────────────────
// Targets WCAG AAA (7:1+) for body text, AA (4.5:1+) for muted
const C = {
  pageBg:       '#0d1117',
  surface:      '#161d2b',
  surfaceAlt:   '#1c2538',
  border:       '#30405c',
  text:         '#f0f4fa',   // ~15:1 on pageBg
  textBody:     '#d0dae8',   // ~10:1 on pageBg
  textMuted:    '#8899b4',   // ~5:1  on pageBg
  success:      '#5cd98e',
  successBg:    'rgba(92,217,142,0.12)',
  successBdr:   '#348a56',
  error:        '#ff8c5a',
  errorBg:      'rgba(255,140,90,0.10)',
  warn:         '#ffc04d',
}

// ── Scrollbar CSS (injected once) ──────────────────
const SCROLLBAR_CSS = `
.jq-scroll::-webkit-scrollbar { width: 10px; }
.jq-scroll::-webkit-scrollbar-track { background: #0d1117; border-radius: 5px; }
.jq-scroll::-webkit-scrollbar-thumb { background: #3d5070; border-radius: 5px; border: 2px solid #0d1117; }
.jq-scroll::-webkit-scrollbar-thumb:hover { background: #5570a0; }
.jq-scroll { scrollbar-width: auto; scrollbar-color: #3d5070 #0d1117; }
`

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
      setOutput(''); setErrors(''); setValMsg(''); setValPass(false)
      setHintIdx(-1); setCompiled(false)
    },
    [unit, getDraft, getSolution],
  )

  const run = useCallback(async () => {
    setRunning(true); setCompiled(false)
    setOutput(''); setErrors(''); setValMsg('')
    const snd = unit.id === 'unit-6' ? WorkshopSounds : unit.id === 'unit-5' ? ArmourySounds : unit.id === 'unit-4' ? DeepSounds : unit.id === 'unit-3' ? LabyrinthSounds : LabSounds
    if (unit.id === 'unit-6') WorkshopSounds.scrollUnroll()
    else if (unit.id === 'unit-5') ArmourySounds.sheathe()
    else if (unit.id === 'unit-4') DeepSounds.footstep()
    else if (unit.id === 'unit-3') LabyrinthSounds.footstep()
    else LabSounds.brew()
    try {
      const res = await runValidation(code, ch.validate)
      setOutput(res.output); setErrors(res.errors)
      setValMsg(res.msg); setValPass(res.pass); setCompiled(true)
      if (res.pass) {
        snd.success()
        if (unit.id === 'unit-3') LabyrinthSounds.doorOpen()
        if (unit.id === 'unit-4') DeepSounds.breakOut()
        if (unit.id === 'unit-5') ArmourySounds.metalClang()
        if (unit.id === 'unit-6') WorkshopSounds.spellCast()
        if (!isDone(unit.id, idx)) complete(unit.id, idx, code, ch.xp)
      } else {
        snd.fail()
      }
    } finally { setRunning(false) }
  }, [code, ch, unit.id, idx, complete, isDone])

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [output, errors])

  const accent = unit.theme.primary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.pageBg, color: C.text }}>
      <style>{SCROLLBAR_CSS}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px',
        background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <button onClick={onHome} style={{
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textBody,
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: 15,
        }}>
          ← Home
        </button>
        <span style={{ fontSize: 26 }}>{unit.theme.icon}</span>
        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 18, color: accent }}>
          Unit {unit.number}: {unit.title}
        </span>
        <span style={{ color: C.textMuted, fontSize: 14 }}>{unit.subtitle}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {unit.challenges.map((_, i) => {
            const d = isDone(unit.id, i)
            const active = i === idx
            return (
              <div key={i} onClick={() => goTo(i)} style={{
                width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 700,
                cursor: 'pointer', transition: 'all .15s',
                background: active ? `${accent}30` : d ? C.successBg : 'rgba(255,255,255,0.04)',
                border: active ? `2px solid ${accent}` : d ? `2px solid ${C.successBdr}` : `1px solid ${C.border}`,
                color: active ? accent : d ? C.success : C.textMuted,
              }}>
                {d ? '✓' : i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main: EDITOR left, DESCRIPTION+OUTPUT right ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ LEFT: Code editor ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` }}>
          {/* Editor header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 14px', background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', gap: 5 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e85d5a' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffc04d' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#5cd98e' }} />
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: C.textMuted }}>Main.java</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setHintIdx((p) => (p < ch.hints.length - 1 ? p + 1 : -1))} style={{
                padding: '4px 14px', fontSize: 15, borderRadius: 6, cursor: 'pointer',
                background: `${accent}15`, color: accent,
                border: `1px solid ${accent}50`, fontFamily: 'JetBrains Mono', fontWeight: 600,
              }}>
                💡 {hintIdx >= 0 ? `${hintIdx + 1}/${ch.hints.length}` : 'Hint'}
              </button>
              <button onClick={run} disabled={running} style={{
                padding: '4px 18px', fontSize: 15, borderRadius: 6, cursor: 'pointer',
                background: running ? C.surfaceAlt : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                opacity: running ? 0.5 : 1,
              }}>
                {running ? '⏳' : '▶'} Run
              </button>
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CodeEditor value={code} onChange={handleCode} onRun={run} fontSize={16} />
          </div>

          {/* Validation bar */}
          <div style={{
            padding: '8px 14px', borderTop: `1px solid ${C.border}`, flexShrink: 0,
            background: valPass ? C.successBg : valMsg ? C.errorBg : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: 40,
          }}>
            <div style={{
              fontSize: 15, fontFamily: 'JetBrains Mono',
              color: valPass ? C.success : valMsg ? C.error : C.textMuted,
            }}>
              {valMsg
                ? `${valPass ? '✅ ' : '⚠️ '}${valMsg}`
                : 'Press ▶ Run or Ctrl+Enter'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {done && (
                <span style={{
                  fontSize: 14, color: C.success, fontFamily: 'JetBrains Mono',
                  background: C.successBg, padding: '3px 10px', borderRadius: 5,
                  border: `1px solid ${C.successBdr}`,
                }}>
                  +{ch.xp} XP ✓
                </span>
              )}
              {valPass && idx < unit.challenges.length - 1 && (
                <button onClick={() => goTo(idx + 1)} style={{
                  padding: '4px 16px', fontSize: 15, borderRadius: 6, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                }}>
                  NEXT →
                </button>
              )}
              {valPass && idx === unit.challenges.length - 1 && (
                <span style={{ fontSize: 15, color: C.warn, fontFamily: 'Orbitron', fontWeight: 700 }}>
                  🏆 UNIT COMPLETE!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: description + visuals + output ═══ */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Challenge description — scrollable, shares space with output */}
          <div className="jq-scroll" style={{
            flex: '1 1 0', minHeight: 70, overflowY: 'auto',
            padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 19, color: accent, marginBottom: 4 }}>
              {ch.title}
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono' }}>
              {ch.concept}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.65, color: C.textBody, whiteSpace: 'pre-line' }}>
              {ch.description}
            </div>
          </div>

          {/* Hints — collapsible */}
          {hintIdx >= 0 && (
            <div style={{
              padding: '10px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
              background: `${accent}0c`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'JetBrains Mono', marginBottom: 4, letterSpacing: 1 }}>
                HINT {hintIdx + 1}/{ch.hints.length}
              </div>
              <div style={{ fontSize: 15, color: C.textBody, lineHeight: 1.55 }}>{ch.hints[hintIdx]}</div>
            </div>
          )}

          {/* Unit-specific visuals */}
          {unit.id === 'unit-2' && (
            <AlchemistVisuals code={code} compiled={compiled} success={valPass} />
          )}
          {unit.id === 'unit-3' && (
            <LabyrinthVisuals output={output} compiled={compiled} success={valPass} challengeIdx={idx} />
          )}
          {unit.id === 'unit-4' && (
            <DeepLabyrinthVisuals output={output} compiled={compiled} success={valPass} challengeIdx={idx} />
          )}
          {unit.id === 'unit-5' && (
            <ArmouryVisuals output={output} compiled={compiled} success={valPass} challengeIdx={idx} code={code} />
          )}
          {unit.id === 'unit-6' && (
            <SpellWorkshopVisuals code={code} compiled={compiled} success={valPass} />
          )}

          {/* Output — scrollable, shares space with description */}
          <div style={{ flex: '1 1 0', minHeight: 60, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '5px 18px', fontSize: 12, fontWeight: 700, color: C.textMuted,
              fontFamily: 'JetBrains Mono', borderBottom: `1px solid ${C.border}`,
              display: 'flex', gap: 12, background: C.surface, flexShrink: 0,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              <span>Output</span>
              {output && (
                <span style={{ color: C.success, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {output.split('\n').filter(Boolean).length} line(s)
                </span>
              )}
            </div>
            <div ref={outRef} className="jq-scroll" style={{
              flex: 1, padding: '10px 18px', overflowY: 'auto', fontFamily: 'JetBrains Mono', fontSize: 15,
              background: '#080c14',
            }}>
              {errors && (
                <div style={{ color: C.error, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{errors}</div>
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
                <div style={{ color: accent }}>⏳ Compiling...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
