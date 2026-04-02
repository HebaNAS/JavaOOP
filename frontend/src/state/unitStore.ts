import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UnitStore {
  completed: Record<string, number[]>      // unitId → completed challenge indices
  solutions: Record<string, Record<number, string>>
  drafts: Record<string, Record<number, string>>
  xp: number

  complete: (unitId: string, idx: number, code: string, earned: number) => void
  saveDraft: (unitId: string, idx: number, code: string) => void
  getDraft: (unitId: string, idx: number) => string | undefined
  getSolution: (unitId: string, idx: number) => string | undefined
  isDone: (unitId: string, idx: number) => boolean
  unitProgress: (unitId: string) => number[]
}

export const useUnitStore = create<UnitStore>()(
  persist(
    (set, get) => ({
      completed: {},
      solutions: {},
      drafts: {},
      xp: 0,

      complete: (unitId, idx, code, earned) =>
        set((s) => {
          const list = s.completed[unitId] ?? []
          const alreadyDone = list.includes(idx)
          return {
            completed: { ...s.completed, [unitId]: alreadyDone ? list : [...list, idx] },
            solutions: {
              ...s.solutions,
              [unitId]: { ...(s.solutions[unitId] ?? {}), [idx]: code },
            },
            xp: alreadyDone ? s.xp : s.xp + earned,
          }
        }),

      saveDraft: (unitId, idx, code) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [unitId]: { ...(s.drafts[unitId] ?? {}), [idx]: code },
          },
        })),

      getDraft: (unitId, idx) => get().drafts[unitId]?.[idx],
      getSolution: (unitId, idx) => get().solutions[unitId]?.[idx],
      isDone: (unitId, idx) => get().completed[unitId]?.includes(idx) ?? false,
      unitProgress: (unitId) => get().completed[unitId] ?? [],
    }),
    { name: 'jq-unit-progress' },
  ),
)
