import { useState, useEffect, useCallback } from 'react'
import Leaderboard from './Leaderboard'
import { useClassroomStore } from '../../state/classroomStore'

interface Session {
  code: string
  name: string
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function InstructorPage() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('oop-quest-instructor-sessions') || '[]')
    } catch { return [] }
  })
  const [name, setName] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewingLeaderboard, setViewingLeaderboard] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'archive'; code: string } | null>(null)

  const saveSessions = useCallback((s: Session[]) => {
    setSessions(s)
    localStorage.setItem('oop-quest-instructor-sessions', JSON.stringify(s))
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter a session name'); return }
    setLoading(true)
    setError('')
    try {
      const data = await api<{ id: string; code: string; name: string }>(
        '/api/classroom/sessions',
        { method: 'POST', body: JSON.stringify({ name: name.trim(), code: customCode.trim() || undefined }) }
      )
      saveSessions([...sessions, { code: data.code, name: data.name }])
      setName('')
      setCustomCode('')
    } catch (e: any) {
      setError(e.message || 'Failed to create session')
    }
    setLoading(false)
  }

  const handleReset = async (code: string) => {
    try {
      await api(`/api/classroom/sessions/${encodeURIComponent(code)}/reset`, { method: 'POST' })
      setConfirmAction(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleArchive = async (code: string) => {
    try {
      await api(`/api/classroom/sessions/${encodeURIComponent(code)}`, { method: 'DELETE' })
      saveSessions(sessions.filter((s) => s.code !== code))
      setConfirmAction(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // If viewing a leaderboard, temporarily set the store
  useEffect(() => {
    if (viewingLeaderboard) {
      useClassroomStore.setState({
        sessionCode: viewingLeaderboard,
        sessionName: sessions.find((s) => s.code === viewingLeaderboard)?.name || '',
      })
    }
  }, [viewingLeaderboard, sessions])

  if (viewingLeaderboard) {
    return <Leaderboard onBack={() => setViewingLeaderboard(null)} />
  }

  return (
    <div className="instructor-page">
      <div className="instructor-container">
        <div className="classroom-entry-icon">🎓</div>
        <div className="classroom-entry-title">INSTRUCTOR PANEL</div>
        <div className="classroom-entry-sub" style={{ marginBottom: 30 }}>Create and manage classroom sessions</div>

        {/* Create Session */}
        <div className="instructor-section">
          <label className="classroom-label">Session Name</label>
          <input
            className="classroom-input"
            type="text"
            placeholder="e.g. CS101 Week 5 Lab"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            maxLength={50}
          />

          <label className="classroom-label" style={{ marginTop: 12 }}>Custom Code (optional)</label>
          <input
            className="classroom-input"
            type="text"
            placeholder="Auto-generated if empty"
            value={customCode}
            onChange={(e) => { setCustomCode(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            maxLength={20}
          />

          {error && <div className="classroom-error">{error}</div>}

          <button
            className="classroom-btn primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </div>

        {/* Sessions List */}
        {sessions.length > 0 && (
          <div className="instructor-section" style={{ marginTop: 30 }}>
            <div className="classroom-label" style={{ marginBottom: 12 }}>Your Sessions</div>
            {sessions.map((s) => (
              <div key={s.code} className="instructor-session-card">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#d0dce8', marginBottom: 4 }}>{s.name}</div>
                  <div
                    className="session-code-display"
                    onClick={() => navigator.clipboard?.writeText(s.code)}
                    title="Click to copy"
                  >
                    {s.code}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="classroom-btn secondary" style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => setViewingLeaderboard(s.code)}>
                    🏆 Board
                  </button>
                  {confirmAction?.code === s.code ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#FF9800' }}>{confirmAction.type === 'reset' ? 'Reset scores?' : 'Archive?'}</span>
                      <button className="classroom-btn secondary" style={{ padding: '4px 10px', fontSize: 11, color: '#2ecc71' }}
                        onClick={() => confirmAction.type === 'reset' ? handleReset(s.code) : handleArchive(s.code)}>
                        Yes
                      </button>
                      <button className="classroom-btn secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => setConfirmAction(null)}>
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="classroom-btn secondary" style={{ padding: '5px 12px', fontSize: 12 }}
                        onClick={() => setConfirmAction({ type: 'reset', code: s.code })}>
                        🔄 Reset
                      </button>
                      <button className="classroom-btn secondary" style={{ padding: '5px 12px', fontSize: 12, color: '#F44336', borderColor: '#3a2020' }}
                        onClick={() => setConfirmAction({ type: 'archive', code: s.code })}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="copyright" style={{ marginTop: 40 }}>
          © {new Date().getFullYear()} Heba El-Shimy. All rights reserved.
        </div>
      </div>
    </div>
  )
}
