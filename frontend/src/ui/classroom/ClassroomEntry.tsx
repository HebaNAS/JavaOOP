import { useState } from 'react'
import { useClassroomStore } from '../../state/classroomStore'

export default function ClassroomEntry({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const joinSession = useClassroomStore((s) => s.joinSession)

  const handleJoin = async () => {
    const trimmed = code.trim()
    if (!trimmed) { setError('Enter a session code'); return }
    setLoading(true)
    setError('')
    const ok = await joinSession(trimmed)
    setLoading(false)
    if (!ok) setError('Session not found. Check the code and try again.')
  }

  return (
    <div className="classroom-entry">
      <div className="classroom-entry-card">
        <div className="classroom-entry-icon">🏫</div>
        <div className="classroom-entry-title">CLASSROOM MODE</div>
        <div className="classroom-entry-sub">Enter the session code from your instructor</div>

        <input
          className="classroom-input"
          type="text"
          placeholder="e.g. OOP-2026"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          maxLength={20}
          autoFocus
        />

        {error && <div className="classroom-error">{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
          <button className="classroom-btn secondary" onClick={onBack}>Back</button>
          <button className="classroom-btn primary" onClick={handleJoin} disabled={loading}>
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
