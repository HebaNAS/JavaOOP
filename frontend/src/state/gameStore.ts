import { create } from 'zustand'
import { Sounds } from '../assets/sounds'

export interface CharacterState {
  id: string
  name: string
  className: 'Warrior' | 'Mage' | 'Archer' | 'Healer' | 'GameCharacter'
  col: number
  row: number
  targetCol: number
  targetRow: number
  hp: number
  maxHp: number
  atk: number
  mana: number
  def: number
  arrows: number
  isDefending: boolean
  animState: 'idle' | 'walk' | 'attack' | 'hurt' | 'cast' | 'defend' | 'dead'
  facingAngle: number
  isEnemy?: boolean   // enemy AI flag
}

export interface EffectInstance {
  id: string
  type: 'slash' | 'fireball' | 'arrow' | 'heal' | 'shield' | 'damage' | 'confetti'
  from: [number, number, number]
  to: [number, number, number]
  value?: number
  color?: string
  startTime: number
  duration: number
}

export interface LogEntry {
  id: string
  text: string
  color: string
}

interface GameStore {
  characters: CharacterState[]
  effects: EffectInstance[]
  selectedId: string | null
  logs: LogEntry[]
  showConfetti: boolean
  enemyTimers: number[]

  spawnCharacter: (ch: CharacterState) => void
  moveCharacter: (id: string, col: number, row: number) => void
  updateCharacter: (id: string, patch: Partial<CharacterState>) => void
  damageCharacter: (id: string, amount: number) => void
  healCharacter: (id: string, amount: number) => void
  selectCharacter: (id: string | null) => void
  addEffect: (effect: EffectInstance) => void
  removeEffect: (id: string) => void
  addLog: (text: string, color?: string) => void
  triggerConfetti: () => void
  clearScene: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  characters: [],
  effects: [],
  selectedId: null,
  logs: [],
  showConfetti: false,
  enemyTimers: [],

  spawnCharacter: (ch) => set((s) => ({ characters: [...s.characters, ch] })),

  moveCharacter: (id, col, row) => set((s) => ({
    characters: s.characters.map((c) =>
      c.id === id ? { ...c, targetCol: col, targetRow: row, animState: 'walk' as const } : c
    ),
  })),

  updateCharacter: (id, patch) => set((s) => ({
    characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  })),

  damageCharacter: (id, amount) => set((s) => ({
    characters: s.characters.map((c) => {
      if (c.id !== id) return c
      // Defend halves damage
      const finalDmg = c.isDefending ? Math.floor(amount / 2) : amount
      return {
        ...c,
        hp: Math.max(0, c.hp - finalDmg),
        animState: (c.hp - finalDmg <= 0 ? 'dead' : 'hurt') as CharacterState['animState'],
      }
    }),
  })),

  healCharacter: (id, amount) => set((s) => ({
    characters: s.characters.map((c) =>
      c.id === id ? { ...c, hp: Math.min(c.maxHp, c.hp + amount) } : c
    ),
  })),

  selectCharacter: (id) => set({ selectedId: id }),

  addEffect: (effect) => set((s) => ({ effects: [...s.effects, effect] })),
  removeEffect: (id) => set((s) => ({ effects: s.effects.filter((e) => e.id !== id) })),

  addLog: (text, color = '#5a7a9a') => set((s) => ({
    logs: [...s.logs.slice(-80), { id: `${Date.now()}-${Math.random()}`, text, color }],
  })),

  triggerConfetti: () => {
    set({ showConfetti: true })
    setTimeout(() => set({ showConfetti: false }), 3000)
  },

  clearScene: () => {
    // Clear enemy timers
    get().enemyTimers.forEach((t) => clearInterval(t))
    set({ characters: [], effects: [], enemyTimers: [], showConfetti: false })
  },
}))

// ─── ENEMY AI ───
// Call this after spawning characters to start enemy AI
export function startEnemyAI() {
  const store = useGameStore.getState

  const timer = window.setInterval(() => {
    const { characters, addLog, addEffect, damageCharacter } = store()
    const enemies = characters.filter((c) => c.isEnemy && c.hp > 0)
    const players = characters.filter((c) => !c.isEnemy && c.hp > 0)

    if (enemies.length === 0 || players.length === 0) return

    enemies.forEach((enemy) => {
      // Pick random player target
      const target = players[Math.floor(Math.random() * players.length)]
      if (!target) return

      const dx = target.targetCol - enemy.targetCol
      const dz = target.targetRow - enemy.targetRow
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= 3) {
        // Attack
        const dmg = enemy.atk
        Sounds.enemyAttack()

        useGameStore.getState().updateCharacter(enemy.id, { animState: 'attack' })
        addEffect({
          id: `esl-${Date.now()}-${enemy.id}`, type: 'slash',
          from: [enemy.targetCol, 0.5, enemy.targetRow],
          to: [target.targetCol, 0.5, target.targetRow],
          startTime: 0, duration: 0.4,
        })

        setTimeout(() => {
          damageCharacter(target.id, dmg)
          const was = useGameStore.getState().characters.find((c) => c.id === target.id)
          const blocked = was?.isDefending ? ' (BLOCKED! 50% reduced)' : ''
          addEffect({
            id: `edmg-${Date.now()}`, type: 'damage',
            from: [target.targetCol, 0.8, target.targetRow],
            to: [target.targetCol, 0.8, target.targetRow],
            value: was?.isDefending ? Math.floor(dmg / 2) : dmg,
            color: '#F44336', startTime: 0, duration: 1.2,
          })
          addLog(`👹 ${enemy.name} attacks ${target.name}!${blocked}`, '#F44336')
        }, 300)
        setTimeout(() => useGameStore.getState().updateCharacter(enemy.id, { animState: 'idle' }), 700)
      } else {
        // Move closer
        const moveCol = enemy.targetCol + Math.sign(dx)
        const moveRow = enemy.targetRow + Math.sign(dz)
        useGameStore.getState().moveCharacter(enemy.id, moveCol, moveRow)
      }
    })
  }, 3000) // Enemy acts every 3 seconds

  useGameStore.setState((s) => ({ enemyTimers: [...s.enemyTimers, timer] }))
}
