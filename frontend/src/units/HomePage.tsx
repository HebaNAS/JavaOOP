import { useUnitStore } from '../state/unitStore'
import { useChapterStore } from '../state/chapterStore'
import { UNITS } from './index'

const C = {
  pageBg:   '#0d1117',
  surface:  '#161d2b',
  border:   '#30405c',
  text:     '#f0f4fa',
  textBody: '#d0dae8',
  textMuted:'#8899b4',
  success:  '#5cd98e',
  warn:     '#ffc04d',
}

interface Props { onNavigate: (path: string) => void }

export default function HomePage({ onNavigate }: Props) {
  const unitProgress = useUnitStore((s) => s.completed)
  const arenaCompleted = useChapterStore((s) => s.completedChapters)
  const totalXP = useUnitStore((s) => s.xp) + useChapterStore((s) => s.xp)

  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg, color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '40px 20px 28px' }}>
        <div style={{
          fontFamily: 'Orbitron', fontWeight: 900, fontSize: 38,
          background: 'linear-gradient(135deg, #ff6b35, #ffc045)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          SOFTWARE DEVELOPMENT 1
        </div>
        <div style={{ fontSize: 17, color: C.textMuted, marginBottom: 18 }}>
          F27SA — Java OOP Quest
        </div>
        {totalXP > 0 && (
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 8,
            background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.30)',
            fontFamily: 'JetBrains Mono', fontSize: 16, color: C.warn,
          }}>
            Total XP: {totalXP}
          </div>
        )}
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
