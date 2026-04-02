import { useState, useCallback, useRef, useEffect } from 'react'
import CodeEditor from '../ui/CodeEditor'
import { compileCode, CompileResult } from '../api/compiler'
import { useUnitStore } from '../state/unitStore'
import { UnitDef, ChallengeValidation, Challenge } from './types'

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

  const stdin = undefined
  const r = await compileCode(code, stdin)

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

  // Navigate between challenges
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
    },
    [unit, getDraft, getSolution],
  )

  // Run & validate
  const run = useCallback(async () => {
    setRunning(true)
    setOutput('')
    setErrors('')
    setValMsg('')
    try {
      const res = await runValidation(code, ch.validate)
      setOutput(res.output)
      setErrors(res.errors)
      setValMsg(res.msg)
      setValPass(res.pass)
      if (res.pass && !isDone(unit.id, idx)) {
        complete(unit.id, idx, code, ch.xp)
      }
    } finally {
      setRunning(false)
    }
  }, [code, ch, unit.id, idx, complete, isDone])

  // Auto-scroll output
  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [output, errors])

  const { primary, bg, icon } = unit.theme

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0e17', color: '#c0d0e0' }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        background: bg, borderBottom: `1px solid ${primary}30`,
      }}>
        <button onClick={onHome} style={{
          background: 'none', border: '1px solid #2a3a5c', borderRadius: 6, color: '#7a9aba',
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: 13,
        }}>
          \u2190 Home
        </button>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16, color: primary }}>
          Unit {unit.number}: {unit.title}
        </span>
        <span style={{ color: '#5a7a9a', fontSize: 13 }}>{unit.subtitle}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {unit.challenges.map((_, i) => {
            const d = isDone(unit.id, i)
            return (
              <div key={i} onClick={() => goTo(i)} style={{
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700,
                cursor: 'pointer', transition: 'all .15s',
                background: i === idx ? `${primary}30` : d ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.03)',
                border: i === idx ? `2px solid ${primary}` : d ? '1px solid #2a5a2a' : '1px solid #1a2744',
                color: i === idx ? primary : d ? '#66BB6A' : '#4a6a8a',
              }}>
                {d ? '\u2713' : i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main split ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: description + output */}
        <div style={{ width: '38%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a2744' }}>
          {/* Challenge info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2744', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 15, color: primary, marginBottom: 4 }}>
              {ch.title}
            </div>
            <div style={{ fontSize: 12, color: '#5a7a9a', marginBottom: 10 }}>{ch.concept}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#a0b8d0', whiteSpace: 'pre-line' }}>
              {ch.description}
            </div>
          </div>

          {/* Hints */}
          {hintIdx >= 0 && (
            <div style={{
              padding: '10px 20px', borderBottom: '1px solid #1a2744', flexShrink: 0,
              background: 'rgba(124,77,255,0.05)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: primary, fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                HINT {hintIdx + 1}/{ch.hints.length}
              </div>
              <div style={{ fontSize: 13, color: '#a0b8d0', lineHeight: 1.6 }}>{ch.hints[hintIdx]}</div>
            </div>
          )}

          {/* Output panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '6px 20px', fontSize: 11, fontWeight: 700, color: '#4a6a8a',
              fontFamily: 'JetBrains Mono', borderBottom: '1px solid #111a28',
              display: 'flex', gap: 16,
            }}>
              <span>OUTPUT</span>
              {output && (
                <span style={{ color: '#2a5a2a', fontWeight: 400 }}>
                  {output.split('\n').filter(Boolean).length} line(s)
                </span>
              )}
            </div>
            <div ref={outRef} style={{
              flex: 1, padding: '10px 20px', overflow: 'auto', fontFamily: 'JetBrains Mono', fontSize: 13,
              background: '#060a12',
            }}>
              {errors && (
                <div style={{ color: '#F44336', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{errors}</div>
              )}
              {output && (
                <div style={{ color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>{output}</div>
              )}
              {!output && !errors && !running && (
                <div style={{ color: '#2a3a5c', fontStyle: 'italic' }}>
                  Press \u25B6 Run to compile and execute your code...
                </div>
              )}
              {running && (
                <div style={{ color: primary }}>Compiling...</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Editor header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 16px', background: '#0c1220', borderBottom: '1px solid #1a2744',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F44336' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF9800' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50' }} />
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#4a6a8a' }}>Main.java</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setHintIdx((p) => (p < ch.hints.length - 1 ? p + 1 : -1))} style={{
                padding: '5px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                background: 'rgba(124,77,255,0.08)', color: primary,
                border: `1px solid ${primary}40`, fontFamily: 'JetBrains Mono', fontWeight: 600,
              }}>
                \uD83D\uDCA1 {hintIdx >= 0 ? `${hintIdx + 1}/${ch.hints.length}` : 'Hint'}
              </button>
              <button onClick={run} disabled={running} style={{
                padding: '5px 18px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                background: running ? '#1a2744' : `linear-gradient(135deg, ${primary}, ${primary}cc)`,
                color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                opacity: running ? 0.5 : 1,
              }}>
                {running ? '\u23F3' : '\u25B6'} Run
              </button>
            </div>
          </div>

          {/* Code editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CodeEditor value={code} onChange={handleCode} onRun={run} />
          </div>

          {/* Validation result bar */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid #1a2744',
            background: valPass ? 'rgba(76,175,80,0.06)' : valMsg ? 'rgba(244,67,54,0.06)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minHeight: 44,
          }}>
            <div style={{
              fontSize: 13, fontFamily: 'JetBrains Mono',
              color: valPass ? '#66BB6A' : valMsg ? '#FF8A65' : '#3a5a7a',
            }}>
              {valMsg
                ? `${valPass ? '\u2705' : '\u26A0\uFE0F'} ${valMsg}`
                : 'Press \u25B6 Run or Ctrl+Enter'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {done && (
                <span style={{
                  fontSize: 12, color: '#66BB6A', fontFamily: 'JetBrains Mono',
                  background: 'rgba(76,175,80,0.1)', padding: '3px 10px', borderRadius: 4,
                  border: '1px solid #2a5a2a',
                }}>
                  +{ch.xp} XP \u2713
                </span>
              )}
              {valPass && idx < unit.challenges.length - 1 && (
                <button onClick={() => goTo(idx + 1)} style={{
                  padding: '5px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${primary}, ${primary}cc)`,
                  color: '#fff', border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
                }}>
                  NEXT \u2192
                </button>
              )}
              {valPass && idx === unit.challenges.length - 1 && (
                <span style={{
                  fontSize: 13, color: '#FFC107', fontFamily: 'Orbitron', fontWeight: 700,
                }}>
                  \uD83C\uDFC6 UNIT COMPLETE!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
