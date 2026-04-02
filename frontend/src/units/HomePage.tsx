import { useUnitStore } from '../state/unitStore'
import { useChapterStore } from '../state/chapterStore'
import { UNITS } from './index'

const C = {
  bg: '#161d30',
  surface: '#1e2842',
  border: '#2e3d5a',
  text: '#e8edf5',
  textMid: '#a0b0c8',
  textMuted: '#6d809c',
  success: '#4dbd74',
}

interface Props { onNavigate: (path: string) => void }

export default function HomePage({ onNavigate }: Props) {
  const unitProgress = useUnitStore((s) => s.completed)
  const arenaCompleted = useChapterStore((s) => s.completedChapters)
  const totalXP = useUnitStore((s) => s.xp) + useChapterStore((s) => s.xp)

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '56px 24px 40px' }}>
        <div style={{
          fontFamily: 'Orbitron', fontWeight: 900, fontSize: 52,
          background: 'linear-gradient(135deg, #ff6b35, #ffc045)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 12,
        }}>
          SOFTWARE DEVELOPMENT 1
        </div>
        <div style={{ fontSize: 24, color: C.textMuted, marginBottom: 24 }}>
          F27SA — Java OOP Quest
        </div>
        {totalXP > 0 && (
          <div style={{
            display: 'inline-block', padding: '8px 24px', borderRadius: 10,
            background: 'rgba(255,193,7,0.10)', border: '1px solid rgba(255,193,7,0.25)',
            fontFamily: 'JetBrains Mono', fontSize: 22, color: '#e8b84d',
          }}>
            Total XP: {totalXP}
          </div>
        )}
      </div>

      {/* Unit grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20, padding: '0 48px 48px', maxWidth: 1200, width: '100%',
      }}>
        {UNITS.map((u) => {
          const isArena = u.path === '/arena'
          const progress = isArena
            ? arenaCompleted.length
            : (unitProgress[u.id]?.length ?? 0)
          const total = u.total
          const pct = total > 0 ? Math.round((progress / total) * 100) : 0
          const available = u.available

          return (
            <div
              key={u.id}
              onClick={() => available && onNavigate(u.path)}
              style={{
                padding: '24px 28px', borderRadius: 14, cursor: available ? 'pointer' : 'default',
                background: available ? C.surface : '#131a28',
                border: `1px solid ${available ? u.theme.primary + '35' : '#1a2236'}`,
                opacity: available ? 1 : 0.5,
                transition: 'all .2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { if (available) e.currentTarget.style.borderColor = u.theme.primary + '80' }}
              onMouseLeave={(e) => { if (available) e.currentTarget.style.borderColor = u.theme.primary + '35' }}
            >
              {progress > 0 && (
                <div style={{
                  position: 'absolute', left: 0, bottom: 0, height: 4,
                  width: `${pct}%`, background: u.theme.primary, borderRadius: '0 3px 0 14px',
                  transition: 'width .5s',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 44 }}>{u.theme.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 20,
                    color: available ? u.theme.primary : '#3e4f68',
                  }}>
                    Unit {u.number}
                  </div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 26,
                    color: available ? C.text : '#3e4f68',
                  }}>
                    {u.title}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 22, color: available ? C.textMid : '#2e3d50', lineHeight: 1.5, marginBottom: 12 }}>
                {u.subtitle}
              </div>
              <div style={{
                fontSize: 18, fontFamily: 'JetBrains Mono',
                color: available ? C.textMuted : '#2e3d50',
              }}>
                {available
                  ? progress > 0
                    ? `${progress}/${total} challenges · ${pct}%`
                    : `${total} challenges`
                  : 'Coming soon'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer links */}
      <div style={{ padding: '24px 48px 48px', display: 'flex', gap: 20 }}>
        <button onClick={() => onNavigate('/instructor')} style={{
          padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          color: C.textMuted, fontFamily: 'JetBrains Mono', fontSize: 22,
        }}>
          Instructor Panel
        </button>
      </div>

      <div style={{ padding: '0 0 28px', fontSize: 20, color: C.textMuted }}>
        © {new Date().getFullYear()} Heba El-Shimy. All rights reserved.
      </div>
    </div>
  )
}
