import { useState, useCallback, useRef, useEffect } from 'react'
import GameScene from './scene/GameScene'
import CodeEditor from './ui/CodeEditor'
import XPBar from './ui/XPBar'
import SyntaxReference from './ui/SyntaxReference'
import { useGameStore } from './state/gameStore'
import { useChapterStore, getLevel } from './state/chapterStore'
import { useClassroomStore } from './state/classroomStore'
import { CHAPTERS } from './chapters/chapters'
import { clearKeyboardBindings } from './interaction/KeyboardController'
import { parseJava } from './parser/JavaParser'
import { buildActions, executeActions } from './parser/ActionExecutor'
import { Sounds } from './assets/sounds'
import ClassroomEntry from './ui/classroom/ClassroomEntry'
import TeamSelect from './ui/classroom/TeamSelect'
import ClassroomNav from './ui/classroom/ClassroomNav'
import SubmitButton from './ui/classroom/SubmitButton'
import Leaderboard from './ui/classroom/Leaderboard'
import InstructorPage from './ui/classroom/InstructorPage'

function chapterXP(index: number): number {
  if (index < 5) return 100
  if (index < 10) return 200
  return 300
}

export default function App() {
  // ─── Instructor page via hash ───
  const [isInstructor, setIsInstructor] = useState(window.location.hash === '#instructor')
  useEffect(() => {
    const handler = () => setIsInstructor(window.location.hash === '#instructor')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  if (isInstructor) return <InstructorPage />

  return <GameApp />
}

function GameApp() {
  const [showSplash, setShowSplash] = useState(true)
  const [code, setCode] = useState(CHAPTERS[0].starter)
  const [valMsg, setValMsg] = useState('')
  const [valPass, setValPass] = useState(false)
  const [hintTier, setHintTier] = useState(-1)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  const { currentChapter, completedChapters, isUnlocked, completeChapter, goToChapter,
          getSolution, getDraft, saveDraft, useHint, resetHintsForChapter, resetAllProgress, xp } = useChapterStore()
  const { addLog, clearScene, logs, triggerConfetti } = useGameStore()
  const { mode, classroomView, setMode, setClassroomView } = useClassroomStore()
  const logRef = useRef<HTMLDivElement>(null)

  const chapter = CHAPTERS[currentChapter]
  const isDone = completedChapters.includes(currentChapter)
  const savedSolution = getSolution(currentChapter)
  const isClassroom = mode === 'classroom'

  // Auto-scroll console
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Auto-save draft as student types (debounced)
  const draftTimer = useRef<number>(0)
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      saveDraft(currentChapter, newCode)
    }, 1000)
  }, [currentChapter, saveDraft])

  // Load draft or solution on mount
  useEffect(() => {
    const saved = getSolution(currentChapter)
    const draft = getDraft(currentChapter)
    setCode(draft || saved || CHAPTERS[currentChapter].starter)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runCode = useCallback(() => {
    const parsed = parseJava(code)
    const val = chapter.validate(parsed)
    setValMsg(val.msg)
    setValPass(val.pass)

    if (val.pass) {
      const prevXP = xp
      completeChapter(currentChapter, code)
      const newXP = useChapterStore.getState().xp
      const earned = newXP - prevXP
      if (earned > 0) {
        addLog(`🌟 +${earned} XP earned!${useChapterStore.getState().hintsUsedThisChapter === 0 ? ' (No hints bonus!)' : ''}`, '#FFC107')
        Sounds.victory()
        triggerConfetti()
        // Check level up
        const oldLv = getLevel(prevXP)
        const newLv = getLevel(newXP)
        if (newLv.level > oldLv.level) {
          setTimeout(() => {
            Sounds.levelUp()
            addLog(`🎖️ LEVEL UP! ${oldLv.title} → ${newLv.title} (Lv.${newLv.level})`, '#FFC107')
          }, 600)
        }
      }
      addLog(`✅ ${val.msg}`, '#4CAF50')
    } else {
      Sounds.error()
      addLog(`⚠️ ${val.msg}`, '#FF9800')
    }

    clearKeyboardBindings()
    clearScene()

    parsed.classes.forEach((c) => {
      const extra = c.isAbstract ? ' (abstract)' : ''
      addLog(`📋 Class "${c.name}"${extra} — ${c.attrs.length} attrs, ${c.methods.length} methods`, '#42A5F5')
      if (c.parent) addLog(`   └─ extends ${c.parent}`, '#AB47BC')
    })
    parsed.interfaces.forEach((i) => {
      addLog(`📄 Interface "${i.name}" — ${i.methods.length} methods`, '#FF9800')
    })

    const { actions, charMap } = buildActions(parsed)
    executeActions(actions, addLog, charMap)
  }, [code, chapter, currentChapter, xp, addLog, clearScene, completeChapter, triggerConfetti])

  const handleGoTo = useCallback((i: number) => {
    if (!isUnlocked(i)) return
    Sounds.click()
    goToChapter(i)
    resetHintsForChapter()
    const saved = useChapterStore.getState().getSolution(i)
    const draft = useChapterStore.getState().getDraft(i)
    setCode(draft || saved || CHAPTERS[i].starter)
    setValMsg('')
    setValPass(false)
    setHintTier(-1)
    setShowSolution(false)
    clearKeyboardBindings()
    clearScene()
    addLog(`── Chapter ${i + 1}: ${CHAPTERS[i].concept} ──`, '#ff6b35')
  }, [isUnlocked, goToChapter, resetHintsForChapter, clearScene, addLog])

  const handleReset = () => {
    resetAllProgress()
    clearKeyboardBindings()
    clearScene()
    setCode(CHAPTERS[0].starter)
    setValMsg('')
    setValPass(false)
    setHintTier(-1)
    setShowResetModal(false)
    setShowSolution(false)
    addLog('🔄 All progress reset. Starting fresh!', '#FF9800')
  }

  const handleHint = () => {
    setHintTier((p) => {
      if (p < 2) {
        useHint()
        return p + 1
      }
      return -1
    })
  }

  // ═══ SPLASH ═══
  if (showSplash && !isClassroom) {
    return (
      <div className="splash">
        <div style={{ position: 'absolute', inset: 0 }}><GameScene isSplash /></div>
        <div className="splash-overlay" />
        <div className="splash-content">
          <div className="splash-title">OOP QUEST</div>
          <div className="splash-sub">Java Battle Arena — 3D</div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 40 }}>
            {[
              { n: 'Warrior', i: '⚔️', c: '#F44336' },
              { n: 'Mage', i: '🔮', c: '#AB47BC' },
              { n: 'Archer', i: '🏹', c: '#4CAF50' },
              { n: 'Healer', i: '✨', c: '#FFC107' },
            ].map((ch) => (
              <div key={ch.n} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 84, height: 84, borderRadius: 14, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 40, marginBottom: 8,
                  border: `2px solid ${ch.c}40`, background: `${ch.c}18`,
                }}>{ch.i}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: ch.c, fontWeight: 600 }}>{ch.n}</div>
              </div>
            ))}
          </div>
          <button className="btn-start" onClick={() => {
            setShowSplash(false)
            const saved = useChapterStore.getState().getSolution(currentChapter)
            const draft = useChapterStore.getState().getDraft(currentChapter)
            if (draft || saved) setCode(draft || saved || CHAPTERS[currentChapter].starter)
            addLog(`── Chapter ${currentChapter + 1}: ${CHAPTERS[currentChapter].concept} ──`, '#ff6b35')
          }}>
            {completedChapters.length > 0 ? 'Continue Quest' : 'Begin Quest'}
          </button>
          {completedChapters.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 14, color: '#7a9aba' }}>
              {completedChapters.length}/{CHAPTERS.length} chapters · {xp} XP · {getLevel(xp).title}
            </div>
          )}

          <button className="btn-classroom" onClick={() => {
            setMode('classroom')
            setClassroomView('join-session')
          }}>
            🏫 Classroom Mode
          </button>

          <div className="splash-footer">
            Write Java code to summon warriors, cast spells, and battle in 3D.<br />
            15 Chapters · XP &amp; Levels · Enemy AI · Keyboard Combat
          </div>
          <div className="copyright">© {new Date().getFullYear()} Heba El-Shimy. All rights reserved.</div>
        </div>
      </div>
    )
  }

  // ═══ CLASSROOM: Entry / Team Select / Leaderboard ═══
  if (isClassroom && classroomView === 'join-session') {
    return <ClassroomEntry onBack={() => { setMode('free'); setClassroomView('join-session') }} />
  }
  if (isClassroom && classroomView === 'team-select') {
    return <TeamSelect />
  }
  if (isClassroom && classroomView === 'leaderboard') {
    return <Leaderboard onBack={() => setClassroomView('game')} />
  }

  // If classroom mode but showing splash equivalent, skip splash
  if (isClassroom && showSplash) {
    setShowSplash(false)
    const saved = useChapterStore.getState().getSolution(currentChapter)
    const draft = useChapterStore.getState().getDraft(currentChapter)
    if (draft || saved) setCode(draft || saved || CHAPTERS[currentChapter].starter)
    addLog(`── Chapter ${currentChapter + 1}: ${CHAPTERS[currentChapter].concept} ──`, '#ff6b35')
  }

  // ═══ RESET MODAL ═══
  const resetModal = showResetModal && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#0e1420', borderRadius: 12, padding: '32px 40px',
        border: '1px solid #1a2744', maxWidth: 440, textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{
          fontSize: 20, fontWeight: 700, color: '#FF9800', fontFamily: 'Orbitron', marginBottom: 12,
        }}>Reset All Progress?</div>
        <div style={{ fontSize: 15, color: '#7a9aba', lineHeight: 1.7, marginBottom: 24 }}>
          This will erase <strong style={{ color: '#F44336' }}>all {completedChapters.length} completed chapters</strong>, {xp} XP, and saved solutions.
          <br /><br />This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => setShowResetModal(false)} style={{
            padding: '10px 28px', fontSize: 15, borderRadius: 7, cursor: 'pointer',
            background: '#1a2744', color: '#7a9aba', border: '1px solid #2a3a5c',
            fontFamily: 'JetBrains Mono', fontWeight: 600,
          }}>Cancel</button>
          <button onClick={handleReset} style={{
            padding: '10px 28px', fontSize: 15, borderRadius: 7, cursor: 'pointer',
            background: 'linear-gradient(135deg, #F44336, #C62828)', color: '#fff',
            border: 'none', fontFamily: 'Orbitron', fontWeight: 700,
            boxShadow: '0 2px 12px rgba(244,67,54,0.3)',
          }}>Reset Everything</button>
        </div>
      </div>
    </div>
  )

  // ═══ MAIN UI ═══
  return (
    <div className="app">
      {resetModal}

      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="topbar-title">OOP QUEST</span>
          <span style={{ color: '#1a2744', fontSize: 20 }}>│</span>
          <span className="topbar-quest">{chapter.concept}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isClassroom && <ClassroomNav />}
          <XPBar />
          <div className="quest-dots">
            {CHAPTERS.map((_, i) => {
              const unlocked = isUnlocked(i)
              const done = completedChapters.includes(i)
              return (
                <div key={i}
                  className={`quest-dot${i === currentChapter ? ' active' : ''}${done ? ' done' : ''}${!unlocked ? ' locked' : ''}`}
                  onClick={() => handleGoTo(i)}
                  title={unlocked ? CHAPTERS[i].title : `Complete Chapter ${i} to unlock`}
                >{!unlocked ? '🔒' : done ? '✓' : i + 1}</div>
              )
            })}
          </div>
          <button onClick={() => setShowResetModal(true)} title="Reset all progress" style={{
            padding: '5px 12px', fontSize: 14, borderRadius: 6, cursor: 'pointer',
            background: 'transparent', color: '#5a3a3a', border: '1px solid #3a2020',
            fontFamily: 'JetBrains Mono', fontWeight: 600, transition: 'all .2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F44336'; e.currentTarget.style.borderColor = '#5a2020' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#5a3a3a'; e.currentTarget.style.borderColor = '#3a2020' }}
          >🔄</button>
        </div>
      </div>

      <div className="main">
        <div className="arena-col">
          <div className="quest-bar">
            <div className="quest-title">{chapter.title}</div>
            <div className="quest-desc">{chapter.description}</div>
          </div>
          <div className="canvas-wrap">
            <GameScene />
            <div className="instructions-overlay">
              {[
                ['moveUp()', 'W'], ['moveLeft()', 'A'], ['moveDown()', 'S'], ['moveRight()', 'D'],
                ['attack()', 'SPACE'], ['defend()', 'Q'], ['castSpell()', 'E'], ['heal()', 'R'],
              ].map(([method, key]) => (
                <div key={method} className="instruction-badge">
                  <span className="method">{method}</span><span className="key">{key}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="console-wrap">
            <div className="console-label">Console Output</div>
            <div className="console-box" ref={logRef}>
              {logs.map((l) => (
                <div key={l.id} className="console-line" style={{ color: l.color }}>
                  <span className="prompt">&gt;</span>{l.text}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ color: '#2a4a6a', fontStyle: 'italic', fontSize: 14 }}>Write Java code and hit Run...</div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-col">
          <div className="editor-head">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="editor-dots">
                <span style={{ background: '#F44336' }} />
                <span style={{ background: '#FF9800' }} />
                <span style={{ background: '#4CAF50' }} />
              </div>
              <span className="editor-filename">Main.java</span>
            </div>
            <div className="editor-actions">
              <SyntaxReference />
              {isDone && savedSolution && (
                <button className="btn-hint" onClick={() => setShowSolution(!showSolution)}
                  style={showSolution ? { borderColor: '#2a5a2a', color: '#66BB6A' } : {}}>
                  {showSolution ? '📝 Edit' : '👁️ Solution'}
                </button>
              )}
              <button className="btn-hint" onClick={handleHint}>
                💡 {hintTier >= 0 ? `${hintTier + 1}/3` : 'Hint'}
              </button>
              <button className="btn-run" onClick={runCode}>▶ Run</button>
            </div>
          </div>

          {showSolution && (
            <div style={{
              padding: '8px 16px', background: '#0a1a0a', borderBottom: '1px solid #1a3a1a',
              fontSize: 13, fontFamily: 'JetBrains Mono', color: '#66BB6A',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span>✅ Your saved solution</span>
              <button onClick={() => setShowSolution(false)} style={{
                marginLeft: 'auto', padding: '2px 10px', fontSize: 12,
                background: 'rgba(102,187,106,0.1)', color: '#66BB6A',
                border: '1px solid #2a5a2a', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'JetBrains Mono',
              }}>Back to editor</button>
            </div>
          )}

          {hintTier >= 0 && (
            <div className="hint-panel">
              <div className="hint-tier">
                {hintTier === 0 ? 'CONCEPTUAL' : hintTier === 1 ? 'STRUCTURAL' : 'SPECIFIC'} HINT {hintTier + 1}/3
                {hintTier < 2 ? ' (tap 💡 for more)' : ''}
              </div>
              {chapter.hints[hintTier]}
              {hintTier < 2 && <button onClick={() => { useHint(); setHintTier(hintTier + 1) }}>Need more help →</button>}
            </div>
          )}

          <div className="editor-body">
            {showSolution && savedSolution
              ? <CodeEditor value={savedSolution} onChange={() => {}} onRun={runCode} />
              : <CodeEditor value={code} onChange={handleCodeChange} onRun={runCode} />}
          </div>

          <div className="result-bar" style={{
            background: valPass ? 'rgba(76,175,80,0.06)' : valMsg ? 'rgba(244,67,54,0.06)' : 'transparent',
          }}>
            {valMsg ? (
              <div className={`result-msg ${valPass ? 'pass' : 'fail'}`}>
                <span>{valPass ? '✅' : '⚠️'}</span><span>{valMsg}</span>
              </div>
            ) : (
              <div className="result-msg idle">Press ▶ Run or Ctrl+Enter to execute</div>
            )}
            {isDone && isClassroom && (
              <SubmitButton chapterIndex={currentChapter} xp={chapterXP(currentChapter)} />
            )}
            {isDone && currentChapter < CHAPTERS.length - 1 && (
              <button className="btn-next" onClick={() => handleGoTo(currentChapter + 1)}>NEXT CHAPTER →</button>
            )}
            {isDone && currentChapter === CHAPTERS.length - 1 && (
              <div style={{
                marginTop: 8, padding: '12px 18px', borderRadius: 8, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(255,107,53,.1), rgba(255,192,69,.1))',
                border: '1px solid #3a2a10',
              }}>
                <div style={{ fontSize: 40 }}>🏆</div>
                <div style={{ fontSize: 18, color: '#ffc045', fontFamily: 'Orbitron', fontWeight: 700, marginTop: 6 }}>QUEST COMPLETE!</div>
                <div style={{ fontSize: 14, color: '#7a9aba', marginTop: 4 }}>All 15 chapters conquered — Java OOP Master!</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="copyright">© {new Date().getFullYear()} Heba El-Shimy. All rights reserved.</div>
    </div>
  )
}
