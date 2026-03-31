import { useState, useEffect, useCallback } from 'react'
import { useClassroomStore } from '../../state/classroomStore'

interface TeamInfo {
  id: string
  name: string
  memberCount: number
  members: { id: string; playerName: string }[]
}

export default function TeamSelect() {
  const { sessionCode, sessionName, playerName: savedName, createTeam, joinTeam } = useClassroomStore()

  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [playerName, setPlayerName] = useState(savedName || '')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'choose' | 'create'>('choose')
  const exitClassroom = useClassroomStore((s) => s.exitClassroom)

  const fetchTeams = useCallback(async () => {
    if (!sessionCode) return
    try {
      const res = await fetch(`/api/classroom/sessions/${encodeURIComponent(sessionCode)}/teams`)
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams)
      }
    } catch { /* offline */ }
  }, [sessionCode])

  useEffect(() => {
    fetchTeams()
    const interval = setInterval(fetchTeams, 5000)
    return () => clearInterval(interval)
  }, [fetchTeams])

  const handleCreate = async () => {
    if (!playerName.trim()) { setError('Enter your name'); return }
    if (!teamName.trim()) { setError('Enter a team name'); return }
    setLoading(true)
    setError('')
    const ok = await createTeam(teamName.trim(), playerName.trim())
    setLoading(false)
    if (!ok) setError('Team name already taken. Try a different name.')
  }

  const handleJoin = async (team: TeamInfo) => {
    if (!playerName.trim()) { setError('Enter your name first'); return }
    setLoading(true)
    setError('')
    const ok = await joinTeam(team.id, team.name, playerName.trim())
    setLoading(false)
    if (!ok) setError('Failed to join team. Try again.')
  }

  return (
    <div className="classroom-entry">
      <div className="team-select-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="classroom-entry-title" style={{ fontSize: 24, marginBottom: 4 }}>
              {sessionName}
            </div>
            <div className="classroom-entry-sub" style={{ marginBottom: 0 }}>
              Session: {sessionCode}
            </div>
          </div>
          <button className="classroom-btn secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={exitClassroom}>
            Leave
          </button>
        </div>

        {/* Player Name */}
        <div style={{ marginBottom: 20 }}>
          <label className="classroom-label">Your Name</label>
          <input
            className="classroom-input"
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); setError('') }}
            maxLength={30}
          />
        </div>

        {error && <div className="classroom-error">{error}</div>}

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`classroom-tab ${mode === 'choose' ? 'active' : ''}`}
            onClick={() => setMode('choose')}
          >
            Join Team ({teams.length})
          </button>
          <button
            className={`classroom-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create Team
          </button>
        </div>

        {mode === 'create' ? (
          <div>
            <label className="classroom-label">Team Name</label>
            <input
              className="classroom-input"
              type="text"
              placeholder="e.g. Team Alpha"
              value={teamName}
              onChange={(e) => { setTeamName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              maxLength={30}
              autoFocus
            />
            <button
              className="classroom-btn primary"
              style={{ width: '100%', marginTop: 14 }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create & Join'}
            </button>
          </div>
        ) : (
          <div className="team-list">
            {teams.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4a6a8a', padding: 30, fontSize: 15 }}>
                No teams yet. Be the first to create one!
              </div>
            )}
            {teams.map((t) => (
              <div key={t.id} className="team-card" onClick={() => handleJoin(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="team-card-name">{t.name}</div>
                  <div className="team-card-count">{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}</div>
                </div>
                {t.members.length > 0 && (
                  <div className="team-card-members">
                    {t.members.map((m) => (
                      <span key={m.id} className="member-chip">{m.playerName}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
