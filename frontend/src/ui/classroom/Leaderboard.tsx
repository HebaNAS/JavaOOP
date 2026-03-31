import { useState, useEffect } from 'react'
import { useClassroomStore, LeaderboardTeam } from '../../state/classroomStore'

const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

export default function Leaderboard({ onBack }: { onBack: () => void }) {
  const { leaderboard, leaderboardError, fetchLeaderboard, sessionName, sessionCode } = useClassroomStore()
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const maxXP = leaderboard?.[0]?.totalXP || 1

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <button className="classroom-btn secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onBack}>
            ← Back
          </button>
          <div>
            <div className="leaderboard-title">LEADERBOARD</div>
            <div style={{ fontSize: 13, color: '#5a7a9a', fontFamily: 'JetBrains Mono' }}>{sessionName} ({sessionCode})</div>
          </div>
          <div style={{ width: 60 }} />
        </div>

        {leaderboardError && !leaderboard && (
          <div className="leaderboard-error">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
            <div>Leaderboard unavailable</div>
            <div style={{ fontSize: 13, color: '#4a6a8a', marginTop: 6 }}>Keep playing — it will reconnect automatically</div>
          </div>
        )}

        {leaderboard && leaderboard.length === 0 && (
          <div className="leaderboard-error">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
            <div>No scores yet</div>
            <div style={{ fontSize: 13, color: '#4a6a8a', marginTop: 6 }}>Complete a chapter and submit your score!</div>
          </div>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <>
            {/* Podium */}
            <div className="podium">
              {leaderboard.slice(0, 3).map((team, i) => (
                <div key={team.id} className={`podium-slot podium-${i}`}>
                  <div className="podium-medal">{MEDALS[i]}</div>
                  <div className="podium-name">{team.name}</div>
                  <div className="podium-xp">{team.totalXP} XP</div>
                  <div
                    className="podium-bar"
                    style={{
                      height: `${Math.max(20, (team.totalXP / maxXP) * 120)}px`,
                      background: `linear-gradient(180deg, ${PODIUM_COLORS[i]}, ${PODIUM_COLORS[i]}60)`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                  <div className="podium-stats">
                    ⭐ {team.stars} · 👥 {team.memberCount}
                  </div>
                </div>
              ))}
            </div>

            {/* Full list */}
            <div className="leaderboard-list">
              {leaderboard.map((team, i) => (
                <div key={team.id}>
                  <div
                    className={`leaderboard-row ${expandedTeam === team.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                  >
                    <div className="lb-rank" style={i < 3 ? { color: PODIUM_COLORS[i] } : {}}>
                      {i < 3 ? MEDALS[i] : `#${i + 1}`}
                    </div>
                    <div className="lb-name">{team.name}</div>
                    <div className="lb-bar-wrap">
                      <div
                        className="lb-bar-fill"
                        style={{ width: `${Math.max(2, (team.totalXP / maxXP) * 100)}%` }}
                      />
                    </div>
                    <div className="lb-xp">{team.totalXP} XP</div>
                    <div className="lb-meta">⭐ {team.stars} · 👥 {team.memberCount}</div>
                    <div className="lb-expand">{expandedTeam === team.id ? '▲' : '▼'}</div>
                  </div>
                  {expandedTeam === team.id && (
                    <div className="lb-members">
                      {team.members.map((m, j) => (
                        <div key={j} className="lb-member-row">
                          <span className="lb-member-name">{m.playerName}</span>
                          <span className="lb-member-xp">{m.xp} XP</span>
                          <span className="lb-member-stars">⭐ {m.stars}</span>
                        </div>
                      ))}
                      {team.members.length === 0 && (
                        <div style={{ padding: '8px 16px', color: '#3a5a7a', fontSize: 13 }}>No submissions yet</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {leaderboardError && leaderboard && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#FF9800', padding: 8, fontFamily: 'JetBrains Mono' }}>
            Connection lost — showing cached data
          </div>
        )}
      </div>
    </div>
  )
}
