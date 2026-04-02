import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Achievements ──────────────────────────────────

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-brew', title: 'First Brew', description: 'Complete your first challenge', icon: '🧪' },
  { id: 'unit-clear', title: 'Unit Cleared', description: 'Complete all challenges in any unit', icon: '⭐' },
  { id: 'bug-squasher', title: 'Bug Squasher', description: 'Fix your first bugfix challenge', icon: '🐛' },
  { id: 'oracle', title: 'The Oracle', description: 'Predict output correctly on first try', icon: '🔮' },
  { id: 'streak-3', title: 'On a Roll', description: '3-day coding streak', icon: '🔥' },
  { id: 'streak-7', title: 'Dedicated', description: '7-day coding streak', icon: '💎' },
  { id: 'xp-500', title: 'Rising Star', description: 'Earn 500 XP across all units', icon: '⚡' },
  { id: 'xp-2000', title: 'Veteran', description: 'Earn 2000 XP across all units', icon: '🏅' },
  { id: 'all-units', title: 'Grand Master', description: 'Complete a challenge in every unit', icon: '🏆' },
  { id: 'shadow-survivor', title: 'Shadow Survivor', description: 'Complete the Shadow Realm', icon: '👻' },
]

// ── Store ─────────────────────────────────────────

interface UnitStore {
  completed: Record<string, number[]>
  solutions: Record<string, Record<number, string>>
  drafts: Record<string, Record<number, string>>
  xp: number
  achievements: string[]           // earned achievement ids
  lastActiveDate: string           // 'YYYY-MM-DD'
  streakDays: number
  streakLastDate: string

  complete: (unitId: string, idx: number, code: string, earned: number) => void
  saveDraft: (unitId: string, idx: number, code: string) => void
  getDraft: (unitId: string, idx: number) => string | undefined
  getSolution: (unitId: string, idx: number) => string | undefined
  isDone: (unitId: string, idx: number) => boolean
  unitProgress: (unitId: string) => number[]
  recordActivity: () => void
  earnAchievement: (id: string) => void
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useUnitStore = create<UnitStore>()(
  persist(
    (set, get) => ({
      completed: {},
      solutions: {},
      drafts: {},
      xp: 0,
      achievements: [],
      lastActiveDate: '',
      streakDays: 0,
      streakLastDate: '',

      complete: (unitId, idx, code, earned) =>
        set((s) => {
          const list = s.completed[unitId] ?? []
          const alreadyDone = list.includes(idx)
          const newCompleted = alreadyDone ? list : [...list, idx]
          const newXp = alreadyDone ? s.xp : s.xp + earned

          // Auto-earn achievements
          const achs = [...s.achievements]
          if (!achs.includes('first-brew') && !alreadyDone) achs.push('first-brew')
          if (!achs.includes('xp-500') && newXp >= 500) achs.push('xp-500')
          if (!achs.includes('xp-2000') && newXp >= 2000) achs.push('xp-2000')

          const allCompleted = { ...s.completed, [unitId]: newCompleted }

          // Check unit-clear
          const unitTotals: Record<string, number> = { 'unit-2': 8, 'unit-3': 10, 'unit-4': 8, 'unit-5': 8, 'unit-6': 10, 'unit-10': 10 }
          if (!achs.includes('unit-clear')) {
            for (const [uid, total] of Object.entries(unitTotals)) {
              if ((allCompleted[uid]?.length ?? 0) >= total) { achs.push('unit-clear'); break }
            }
          }

          // Check all-units (at least 1 challenge in each unit)
          if (!achs.includes('all-units')) {
            const allUnitIds = Object.keys(unitTotals)
            if (allUnitIds.every(uid => (allCompleted[uid]?.length ?? 0) > 0)) achs.push('all-units')
          }

          // Shadow survivor
          if (!achs.includes('shadow-survivor') && unitId === 'unit-10' && newCompleted.length >= 8) achs.push('shadow-survivor')

          return {
            completed: allCompleted,
            solutions: { ...s.solutions, [unitId]: { ...(s.solutions[unitId] ?? {}), [idx]: code } },
            xp: newXp,
            achievements: achs,
          }
        }),

      saveDraft: (unitId, idx, code) =>
        set((s) => ({
          drafts: { ...s.drafts, [unitId]: { ...(s.drafts[unitId] ?? {}), [idx]: code } },
        })),

      getDraft: (unitId, idx) => get().drafts[unitId]?.[idx],
      getSolution: (unitId, idx) => get().solutions[unitId]?.[idx],
      isDone: (unitId, idx) => get().completed[unitId]?.includes(idx) ?? false,
      unitProgress: (unitId) => get().completed[unitId] ?? [],

      recordActivity: () =>
        set((s) => {
          const today = todayStr()
          if (s.lastActiveDate === today) return {} // already recorded today

          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().slice(0, 10)

          const isConsecutive = s.streakLastDate === yesterdayStr
          const newStreak = isConsecutive ? s.streakDays + 1 : 1

          const achs = [...s.achievements]
          if (!achs.includes('streak-3') && newStreak >= 3) achs.push('streak-3')
          if (!achs.includes('streak-7') && newStreak >= 7) achs.push('streak-7')

          return {
            lastActiveDate: today,
            streakDays: newStreak,
            streakLastDate: today,
            achievements: achs,
          }
        }),

      earnAchievement: (id) =>
        set((s) => ({
          achievements: s.achievements.includes(id) ? s.achievements : [...s.achievements, id],
        })),
    }),
    { name: 'jq-unit-progress' },
  ),
)
