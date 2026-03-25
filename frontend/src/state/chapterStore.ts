import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── XP & LEVELS ───
const LEVEL_TABLE = [
  { xp: 0,    title: 'Novice' },
  { xp: 100,  title: 'Apprentice' },
  { xp: 300,  title: 'Student' },
  { xp: 600,  title: 'Coder' },
  { xp: 1000, title: 'Developer' },
  { xp: 1500, title: 'Engineer' },
  { xp: 2100, title: 'Architect' },
  { xp: 2800, title: 'Master' },
  { xp: 3600, title: 'Grandmaster' },
  { xp: 4500, title: 'Legend' },
]

function chapterXP(index: number): number {
  if (index < 5) return 100
  if (index < 10) return 200
  return 300
}

export function getLevel(xp: number) {
  let level = 0
  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TABLE[i].xp) { level = i; break }
  }
  const current = LEVEL_TABLE[level]
  const next = LEVEL_TABLE[level + 1]
  const xpInLevel = xp - current.xp
  const xpForNext = next ? next.xp - current.xp : 1000
  return {
    level: level + 1,
    title: current.title,
    xpInLevel,
    xpForNext,
    progress: Math.min(1, xpInLevel / xpForNext),
    nextTitle: next?.title ?? 'MAX',
  }
}

interface ChapterStore {
  currentChapter: number
  completedChapters: number[]
  solutions: Record<number, string>
  drafts: Record<number, string>       // auto-saved code in progress
  xp: number
  hintsUsedThisChapter: number

  isUnlocked: (index: number) => boolean
  completeChapter: (index: number, code: string) => void
  goToChapter: (index: number) => void
  getSolution: (index: number) => string | null
  getDraft: (index: number) => string | null
  saveDraft: (index: number, code: string) => void
  useHint: () => void
  resetHintsForChapter: () => void
  resetAllProgress: () => void
}

export const useChapterStore = create<ChapterStore>()(
  persist(
    (set, get) => ({
      currentChapter: 0,
      completedChapters: [],
      solutions: {},
      drafts: {},
      xp: 0,
      hintsUsedThisChapter: 0,

      isUnlocked: (index: number) => {
        if (index === 0) return true
        return get().completedChapters.includes(index - 1)
      },

      completeChapter: (index: number, code: string) => {
        const s = get()
        const alreadyDone = s.completedChapters.includes(index)
        const baseXP = chapterXP(index)
        const hintBonus = s.hintsUsedThisChapter === 0 ? 50 : 0
        const earnedXP = alreadyDone ? 0 : baseXP + hintBonus

        set((s) => ({
          completedChapters: alreadyDone ? s.completedChapters : [...s.completedChapters, index],
          solutions: { ...s.solutions, [index]: code },
          xp: s.xp + earnedXP,
        }))

        return earnedXP
      },

      goToChapter: (index: number) => {
        if (get().isUnlocked(index)) {
          set({ currentChapter: index, hintsUsedThisChapter: 0 })
        }
      },

      getSolution: (index: number) => get().solutions[index] ?? null,

      getDraft: (index: number) => get().drafts[index] ?? null,

      saveDraft: (index: number, code: string) => {
        set((s) => ({ drafts: { ...s.drafts, [index]: code } }))
      },

      useHint: () => {
        set((s) => ({ hintsUsedThisChapter: s.hintsUsedThisChapter + 1 }))
      },

      resetHintsForChapter: () => set({ hintsUsedThisChapter: 0 }),

      resetAllProgress: () => {
        set({
          currentChapter: 0,
          completedChapters: [],
          solutions: {},
          drafts: {},
          xp: 0,
          hintsUsedThisChapter: 0,
        })
      },
    }),
    { name: 'oop-quest-progress' }
  )
)
