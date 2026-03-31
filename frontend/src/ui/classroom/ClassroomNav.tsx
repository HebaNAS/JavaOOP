import { useState } from 'react'
import { useClassroomStore } from '../../state/classroomStore'

export default function ClassroomNav() {
  const { playerName, teamName, leaveTeam, setClassroomView } = useClassroomStore()
  const [showMenu, setShowMenu] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleLeave = async () => {
    await leaveTeam()
    setShowMenu(false)
    setConfirming(false)
  }

  return (
    <div className="classroom-nav">
      <div className="player-badge">
        <span className="badge-icon">👤</span>
        <span>{playerName}</span>
      </div>
      <div className="team-badge">
        <span className="badge-icon">👥</span>
        <span>{teamName}</span>
      </div>
      <button
        className="nav-icon-btn"
        onClick={() => setClassroomView('leaderboard')}
        title="Leaderboard"
      >
        🏆
      </button>
      <div style={{ position: 'relative' }}>
        <button
          className="nav-icon-btn"
          onClick={() => { setShowMenu(!showMenu); setConfirming(false) }}
          title="Settings"
        >
          ⚙️
        </button>
        {showMenu && (
          <div className="classroom-dropdown">
            {!confirming ? (
              <button className="dropdown-item" onClick={() => setConfirming(true)}>
                Leave Team
              </button>
            ) : (
              <div style={{ padding: '8px 12px', fontSize: 13 }}>
                <div style={{ color: '#FF9800', marginBottom: 8 }}>Leave "{teamName}"?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="dropdown-item" style={{ color: '#7a9aba' }} onClick={() => setConfirming(false)}>Cancel</button>
                  <button className="dropdown-item" style={{ color: '#F44336' }} onClick={handleLeave}>Leave</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
