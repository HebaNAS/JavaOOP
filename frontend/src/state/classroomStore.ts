import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LeaderboardMember {
  playerName: string
  xp: number
  stars: number
}

export interface LeaderboardTeam {
  id: string
  name: string
  totalXP: number
  stars: number
  memberCount: number
  members: LeaderboardMember[]
}

interface ClassroomStore {
  mode: 'free' | 'classroom'
  classroomView: 'join-session' | 'team-select' | 'game' | 'leaderboard'

  sessionCode: string | null
  sessionId: string | null
  sessionName: string | null

  memberId: string | null
  playerName: string | null

  teamId: string | null
  teamName: string | null

  submittedChapters: number[]

  leaderboard: LeaderboardTeam[] | null
  leaderboardError: boolean

  setMode: (mode: 'free' | 'classroom') => void
  setClassroomView: (view: ClassroomStore['classroomView']) => void

  joinSession: (code: string) => Promise<boolean>
  createTeam: (teamName: string, playerName: string) => Promise<boolean>
  joinTeam: (teamId: string, teamName: string, playerName: string) => Promise<boolean>
  leaveTeam: () => Promise<void>
  submitScore: (chapterIndex: number, xp: number) => Promise<boolean>
  fetchLeaderboard: () => Promise<void>
  exitClassroom: () => void
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

export const useClassroomStore = create<ClassroomStore>()(
  persist(
    (set, get) => ({
      mode: 'free',
      classroomView: 'join-session',

      sessionCode: null,
      sessionId: null,
      sessionName: null,

      memberId: null,
      playerName: null,

      teamId: null,
      teamName: null,

      submittedChapters: [],

      leaderboard: null,
      leaderboardError: false,

      setMode: (mode) => set({ mode }),
      setClassroomView: (view) => set({ classroomView: view }),

      joinSession: async (code: string) => {
        try {
          const session = await api<{ id: string; code: string; name: string }>(
            `/api/classroom/sessions/${encodeURIComponent(code.toUpperCase())}`
          )
          set({
            sessionCode: session.code,
            sessionId: session.id,
            sessionName: session.name,
            classroomView: 'team-select',
          })
          return true
        } catch {
          return false
        }
      },

      createTeam: async (teamName: string, playerName: string) => {
        const { sessionCode } = get()
        if (!sessionCode) return false
        try {
          const data = await api<{
            team: { id: string; name: string }
            member: { id: string; playerName: string }
          }>(`/api/classroom/sessions/${encodeURIComponent(sessionCode)}/teams`, {
            method: 'POST',
            body: JSON.stringify({ teamName, playerName }),
          })
          set({
            teamId: data.team.id,
            teamName: data.team.name,
            memberId: data.member.id,
            playerName: data.member.playerName,
            submittedChapters: [],
            classroomView: 'game',
          })
          return true
        } catch {
          return false
        }
      },

      joinTeam: async (teamId: string, teamName: string, playerName: string) => {
        try {
          const data = await api<{ member: { id: string; playerName: string } }>(
            `/api/classroom/teams/${encodeURIComponent(teamId)}/join`,
            { method: 'POST', body: JSON.stringify({ playerName }) }
          )
          set({
            teamId,
            teamName,
            memberId: data.member.id,
            playerName: data.member.playerName,
            submittedChapters: [],
            classroomView: 'game',
          })
          return true
        } catch {
          return false
        }
      },

      leaveTeam: async () => {
        const { teamId, memberId } = get()
        if (teamId && memberId) {
          try {
            await api(`/api/classroom/teams/${encodeURIComponent(teamId)}/leave`, {
              method: 'POST',
              body: JSON.stringify({ memberId }),
            })
          } catch {
            // proceed even if API fails
          }
        }
        set({
          teamId: null,
          teamName: null,
          memberId: null,
          submittedChapters: [],
          classroomView: 'team-select',
        })
      },

      submitScore: async (chapterIndex: number, xp: number) => {
        const { memberId, teamId } = get()
        if (!memberId || !teamId) return false
        try {
          await api('/api/classroom/submissions', {
            method: 'POST',
            body: JSON.stringify({ memberId, teamId, chapterIndex, xp }),
          })
          set((s) => ({
            submittedChapters: [...s.submittedChapters, chapterIndex],
          }))
          return true
        } catch {
          return false
        }
      },

      fetchLeaderboard: async () => {
        const { sessionCode } = get()
        if (!sessionCode) return
        try {
          const data = await api<{ teams: LeaderboardTeam[] }>(
            `/api/classroom/sessions/${encodeURIComponent(sessionCode)}/leaderboard`
          )
          set({ leaderboard: data.teams, leaderboardError: false })
        } catch {
          set({ leaderboardError: true })
        }
      },

      exitClassroom: () => {
        set({
          mode: 'free',
          classroomView: 'join-session',
          sessionCode: null,
          sessionId: null,
          sessionName: null,
          memberId: null,
          playerName: null,
          teamId: null,
          teamName: null,
          submittedChapters: [],
          leaderboard: null,
          leaderboardError: false,
        })
      },
    }),
    { name: 'oop-quest-classroom' }
  )
)
