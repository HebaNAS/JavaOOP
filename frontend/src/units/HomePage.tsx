import { useEffect } from 'react'
import { useUnitStore, ALL_ACHIEVEMENTS } from '../state/unitStore'
import { useChapterStore } from '../state/chapterStore'
import { UNITS } from './index'

const C = {
  pageBg: '#0d1117', surface: '#161d2b', border: '#30405c',
  text: '#f0f4fa', textBody: '#d0dae8', textMuted: '#8899b4',
  success: '#5cd98e', warn: '#ffc04d',
}

// ── LO8 Pro Tips (IDE, Debugging, Version Control) ──

const PRO_TIPS = [
  { icon: '💻', text: 'Use an IDE like IntelliJ IDEA or VS Code with Java extensions for autocompletion and error highlighting.' },
  { icon: '🐞', text: 'When code behaves unexpectedly, use System.out.println() to print variable values — this is called "print debugging".' },
  { icon: '🔀', text: 'Version control (Git) tracks every change you make. Learn: git add, git commit, git push.' },
  { icon: '🔍', text: 'IDEs can set "breakpoints" — pausing your program mid-execution so you can inspect variables.' },
  { icon: '📂', text: 'Organise your Java files in packages. Each .java file should have one public class matching the filename.' },
  { icon: '🧪', text: 'Write test cases for your methods before writing the implementation — this is called Test-Driven Development.' },
  { icon: '⌨️', text: 'Learn IDE shortcuts: Ctrl+Space (autocomplete), Ctrl+/ (comment), F5 (debug run) save hours of work.' },
  { icon: '🌿', text: 'Use Git branches to experiment with changes without affecting your main code. Merge when ready.' },
  { icon: '📋', text: 'Read compiler error messages carefully — the line number and caret (^) show exactly where the problem is.' },
  { icon: '🔄', text: 'Commit often with meaningful messages: "Add Warrior attack method" is better than "update stuff".' },
]

interface Props { onNavigate: (path: string) => void }

export default function HomePage({ onNavigate }: Props) {
  const unitProgress = useUnitStore((s) => s.completed)
  const arenaCompleted = useChapterStore((s) => s.completedChapters)
  const totalXP = useUnitStore((s) => s.xp) + useChapterStore((s) => s.xp)
  const achievements = useUnitStore((s) => s.achievements)
  const streak = useUnitStore((s) => s.streakDays)
  const recordActivity = useUnitStore((s) => s.recordActivity)

  // Record daily activity on mount
  useEffect(() => { recordActivity() }, [recordActivity])

  // Pick a random pro tip
  const tipIdx = Math.floor(Date.now() / 86400000) % PRO_TIPS.length // changes daily
  const tip = PRO_TIPS[tipIdx]

  const totalChallenges = Object.values(unitProgress).reduce((sum, arr) => sum + arr.length, 0) + arenaCompleted.length

  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg, color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '36px 20px 24px' }}>
        <div style={{
          fontFamily: 'Orbitron', fontWeight: 900, fontSize: 38,
          background: 'linear-gradient(135deg, #ff6b35, #ffc045)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          SOFTWARE DEVELOPMENT 1
        </div>
        <div style={{ fontSize: 17, color: C.textMuted, marginBottom: 16 }}>
          F27SA — Java OOP Quest
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {totalXP > 0 && (
            <div style={{
              padding: '5px 16px', borderRadius: 8,
              background: 'rgba(255,193,7,0.10)', border: '1px solid rgba(255,193,7,0.25)',
              fontFamily: 'JetBrains Mono', fontSize: 14, color: C.warn,
            }}>
              ⚡ {totalXP} XP
            </div>
          )}
          {totalChallenges > 0 && (
            <div style={{
              padding: '5px 16px', borderRadius: 8,
              background: 'rgba(92,217,142,0.10)', border: '1px solid rgba(92,217,142,0.25)',
              fontFamily: 'JetBrains Mono', fontSize: 14, color: C.success,
            }}>
              ✓ {totalChallenges} challenges
            </div>
          )}
          {streak > 1 && (
            <div style={{
              padding: '5px 16px', borderRadius: 8,
              background: 'rgba(255,107,53,0.10)', border: '1px solid rgba(255,107,53,0.25)',
              fontFamily: 'JetBrains Mono', fontSize: 14, color: '#ff6b35',
            }}>
              🔥 {streak}-day streak
            </div>
          )}
        </div>
      </div>

      {/* Achievements row */}
      {achievements.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
          padding: '0 36px 16px', maxWidth: 1100,
        }}>
          {ALL_ACHIEVEMENTS.filter(a => achievements.includes(a.id)).map(a => (
            <div key={a.id} title={`${a.title}: ${a.description}`} style={{
              padding: '4px 12px', borderRadius: 6,
              background: C.surface, border: `1px solid ${C.border}`,
              fontFamily: 'JetBrains Mono', fontSize: 12, color: C.textBody,
              cursor: 'default',
            }}>
              {a.icon} {a.title}
            </div>
          ))}
        </div>
      )}

      {/* LO8 Pro Tip */}
      <div style={{
        maxWidth: 1100, width: '100%', padding: '0 36px 16px',
      }}>
        <div style={{
          padding: '10px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(77,166,255,0.06)', border: '1px solid rgba(77,166,255,0.18)',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{tip.icon}</span>
          <div>
            <span style={{ fontSize: 11, color: '#4da6ff', fontFamily: 'JetBrains Mono', fontWeight: 700, letterSpacing: 1 }}>PRO TIP — </span>
            <span style={{ fontSize: 13, color: C.textBody }}>{tip.text}</span>
          </div>
        </div>
      </div>

      {/* Unit grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16, padding: '0 36px 36px', maxWidth: 1100, width: '100%',
      }}>
        {UNITS.map((u) => {
          const isArena = u.path === '/arena'
          const progress = isArena
            ? arenaCompleted.length
            : (unitProgress[u.id]?.length ?? 0)
          const total = u.total
          const pct = total > 0 ? Math.round((progress / total) * 100) : 0
          const ok = u.available

          return (
            <div
              key={u.id}
              onClick={() => ok && onNavigate(u.path)}
              style={{
                padding: '18px 22px', borderRadius: 12, cursor: ok ? 'pointer' : 'default',
                background: ok ? C.surface : '#10151e',
                border: `1.5px solid ${ok ? u.theme.primary + '45' : '#1a2030'}`,
                opacity: ok ? 1 : 0.45,
                transition: 'all .2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { if (ok) e.currentTarget.style.borderColor = u.theme.primary + '90' }}
              onMouseLeave={(e) => { if (ok) e.currentTarget.style.borderColor = u.theme.primary + '45' }}
            >
              {progress > 0 && (
                <div style={{
                  position: 'absolute', left: 0, bottom: 0, height: 3,
                  width: `${pct}%`, background: u.theme.primary, borderRadius: '0 2px 0 12px',
                  transition: 'width .5s',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 34 }}>{u.theme.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 14,
                    color: ok ? u.theme.primary : '#3e4f68',
                  }}>
                    Unit {u.number}
                  </div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 19,
                    color: ok ? C.text : '#3e4f68',
                  }}>
                    {u.title}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 15, color: ok ? C.textBody : '#2e3d50', lineHeight: 1.45, marginBottom: 8 }}>
                {u.subtitle}
              </div>
              <div style={{
                fontSize: 13, fontFamily: 'JetBrains Mono',
                color: ok ? C.textMuted : '#2e3d50',
              }}>
                {ok
                  ? progress > 0
                    ? `${progress}/${total} challenges · ${pct}%`
                    : `${total} challenges`
                  : 'Coming soon'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 36px 36px', display: 'flex', gap: 16 }}>
        <button onClick={() => onNavigate('/instructor')} style={{
          padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
          color: C.textMuted, fontFamily: 'JetBrains Mono', fontSize: 15,
        }}>
          Instructor Panel
        </button>
      </div>

      <div style={{ padding: '0 0 20px', fontSize: 14, color: C.textMuted }}>
        © {new Date().getFullYear()} Heba El-Shimy. All rights reserved.
      </div>
    </div>
  )
}
