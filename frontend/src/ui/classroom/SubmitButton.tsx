import { useState } from 'react'
import { useClassroomStore } from '../../state/classroomStore'

export default function SubmitButton({ chapterIndex, xp }: { chapterIndex: number; xp: number }) {
  const { submittedChapters, submitScore, mode } = useClassroomStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  if (mode !== 'classroom') return null

  const alreadySubmitted = submittedChapters.includes(chapterIndex)

  if (alreadySubmitted || justSubmitted) {
    return (
      <div className="submit-btn submitted">
        ✅ Submitted to Team
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(false)
    const ok = await submitScore(chapterIndex, xp)
    setLoading(false)
    if (ok) {
      setJustSubmitted(true)
    } else {
      setError(true)
    }
  }

  return (
    <div>
      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting...' : '📤 Submit to Team'}
      </button>
      {error && (
        <div style={{ fontSize: 12, color: '#F44336', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
          Submission failed.{' '}
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={handleSubmit}>Retry</span>
        </div>
      )}
    </div>
  )
}
