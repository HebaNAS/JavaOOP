import { useChapterStore, getLevel } from '../state/chapterStore'

export default function XPBar() {
  const xp = useChapterStore((s) => s.xp)
  const lv = getLevel(xp)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px',
    }}>
      {/* Level badge */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#FFC107', fontFamily: 'Orbitron',
        background: 'linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,152,0,0.1))',
        border: '1px solid rgba(255,193,7,0.3)', borderRadius: 6,
        padding: '3px 10px', whiteSpace: 'nowrap',
      }}>
        Lv.{lv.level}
      </div>
      {/* Bar */}
      <div style={{ flex: 1, minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: '#8aaacc', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
            {lv.title}
          </span>
          <span style={{ fontSize: 10, color: '#4a6a8a', fontFamily: 'JetBrains Mono' }}>
            {xp} XP
          </span>
        </div>
        <div style={{
          height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${lv.progress * 100}%`,
            background: 'linear-gradient(90deg, #FFC107, #FF9800)',
            borderRadius: 3, transition: 'width 0.5s ease',
            boxShadow: '0 0 8px rgba(255,193,7,0.3)',
          }} />
        </div>
        <div style={{ fontSize: 9, color: '#3a5a7a', fontFamily: 'JetBrains Mono', marginTop: 1, textAlign: 'right' }}>
          → {lv.nextTitle}
        </div>
      </div>
    </div>
  )
}
