import { useUnitStore } from '../state/unitStore'
import { useChapterStore } from '../state/chapterStore'
import { UNITS } from './index'

interface Props {
  onNavigate: (path: string) => void
}

export default function HomePage({ onNavigate }: Props) {
  const unitProgress = useUnitStore((s) => s.completed)
  const arenaCompleted = useChapterStore((s) => s.completedChapters)
  const totalXP = useUnitStore((s) => s.xp) + useChapterStore((s) => s.xp)

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0e17', color: '#c0d0e0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '48px 20px 32px' }}>
        <div style={{
          fontFamily: 'Orbitron', fontWeight: 900, fontSize: 36,
          background: 'linear-gradient(135deg, #ff6b35, #ffc045)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          SOFTWARE DEVELOPMENT 1
        </div>
        <div style={{ fontSize: 15, color: '#5a7a9a', marginBottom: 20 }}>
          F27SA \u2014 Java OOP Quest
        </div>
        {totalXP > 0 && (
          <div style={{
            display: 'inline-block', padding: '6px 20px', borderRadius: 8,
            background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)',
            fontFamily: 'JetBrains Mono', fontSize: 13, color: '#FFC107',
          }}>
            Total XP: {totalXP}
          </div>
        )}
      </div>

      {/* Unit grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16, padding: '0 40px 40px', maxWidth: 1000, width: '100%',
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
                padding: '20px 24px', borderRadius: 12, cursor: available ? 'pointer' : 'default',
                background: available ? `${u.theme.bg}` : '#0c1018',
                border: `1px solid ${available ? u.theme.primary + '30' : '#151c28'}`,
                opacity: available ? 1 : 0.45,
                transition: 'all .2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { if (available) e.currentTarget.style.borderColor = u.theme.primary + '80' }}
              onMouseLeave={(e) => { if (available) e.currentTarget.style.borderColor = u.theme.primary + '30' }}
            >
              {/* Progress bar background */}
              {progress > 0 && (
                <div style={{
                  position: 'absolute', left: 0, bottom: 0, height: 3,
                  width: `${pct}%`, background: u.theme.primary, borderRadius: '0 2px 0 12px',
                  transition: 'width .5s',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{u.theme.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 13,
                    color: available ? u.theme.primary : '#3a4a5a',
                  }}>
                    Unit {u.number}
                  </div>
                  <div style={{
                    fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16,
                    color: available ? '#e0e8f0' : '#3a4a5a',
                  }}>
                    {u.title}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: available ? '#6a8aaa' : '#2a3a4a', lineHeight: 1.5, marginBottom: 10 }}>
                {u.subtitle}
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'JetBrains Mono',
                color: available ? '#4a6a8a' : '#2a3a4a',
              }}>
                {available
                  ? progress > 0
                    ? `${progress}/${total} challenges \u2022 ${pct}%`
                    : `${total} challenges`
                  : 'Coming soon'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer links */}
      <div style={{ padding: '20px 40px 40px', display: 'flex', gap: 16 }}>
        <button onClick={() => onNavigate('/instructor')} style={{
          padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)', border: '1px solid #1a2744',
          color: '#5a7a9a', fontFamily: 'JetBrains Mono', fontSize: 13,
        }}>
          Instructor Panel
        </button>
      </div>

      <div style={{ padding: '0 0 24px', fontSize: 12, color: '#2a3a5a' }}>
        \u00A9 {new Date().getFullYear()} Heba El-Shimy. All rights reserved.
      </div>
    </div>
  )
}
