import { create } from 'zustand'
import { session } from '../api/session'

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
  /** The character the keyboard controls (your hero). */
  selectedId: string | null
  /** The character keypress combat methods will hit. Click another character
   *  to set this; falls back to nearest-other when null. */
  targetId: string | null
  logs: LogEntry[]
  showConfetti: boolean
  enemyTimers: number[]

  spawnCharacter: (ch: CharacterState) => void
  moveCharacter: (id: string, col: number, row: number) => void
  updateCharacter: (id: string, patch: Partial<CharacterState>) => void
  damageCharacter: (id: string, amount: number) => void
  healCharacter: (id: string, amount: number) => void
  selectCharacter: (id: string | null) => void
  setTarget: (id: string | null) => void
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
  targetId: null,
  logs: [],
  showConfetti: false,
  enemyTimers: [],

  spawnCharacter: (ch) => set((s) => {
    // Defensive: if a character with this id already exists (e.g. a stale
    // listener dispatched the same spawn event twice), REPLACE it instead
    // of appending — otherwise the scene fills with overlapping ghosts and
    // damageCharacter only hits the first match, leaving stale HP bars.
    const existingIdx = s.characters.findIndex((c) => c.id === ch.id)
    if (existingIdx >= 0) {
      const next = s.characters.slice()
      next[existingIdx] = ch
      return { characters: next }
    }
    return { characters: [...s.characters, ch] }
  }),

  moveCharacter: (id, col, row) => set((s) => ({
    characters: s.characters.map((c) =>
      c.id === id ? { ...c, targetCol: col, targetRow: row, animState: 'walk' as const } : c
    ),
  })),

  updateCharacter: (id, patch) => set((s) => ({
    characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  })),

  damageCharacter: (id, amount) => set((s) => {
    const characters = s.characters.map((c) => {
      if (c.id !== id) return c
      // Defend halves damage. Note: with WYSIWYG, the JVM has already done
      // its own halving in enemyAttack — but the local frontend mirror also
      // applies it here for actions that didn't go through the JVM (legacy).
      const finalDmg = c.isDefending ? Math.floor(amount / 2) : amount
      return {
        ...c,
        hp: Math.max(0, c.hp - finalDmg),
        animState: (c.hp - finalDmg <= 0 ? 'dead' : 'hurt') as CharacterState['animState'],
      }
    })
    // If the character we just hit is now dead and was the target, clear it.
    const targetId = s.targetId && characters.find((c) => c.id === s.targetId)?.hp === 0
      ? null
      : s.targetId
    return { characters, targetId }
  }),

  healCharacter: (id, amount) => set((s) => ({
    characters: s.characters.map((c) =>
      c.id === id ? { ...c, hp: Math.min(c.maxHp, c.hp + amount) } : c
    ),
  })),

  selectCharacter: (id) => set({ selectedId: id }),

  setTarget: (id) => set({ targetId: id }),

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
    // Clear enemy timers AND BOTH selection slots — leaving selectedId
    // pointing to a now-vanished character meant the next chapter's first
    // click immediately set a target instead of picking a hero.
    get().enemyTimers.forEach((t) => clearInterval(t))
    set({
      characters: [], effects: [], enemyTimers: [],
      showConfetti: false,
      selectedId: null, targetId: null,
    })
  },
}))

// ─── ENEMY AI ───
// Picks a player target every 3 seconds and asks the JVM session to apply
// the damage. The JVM is the source of truth: it reads enemy.attackPower,
// honours the target's `shielded` flag, mutates target.health, and emits
// an enemyAttack trace that the frontend renders. The frontend never
// applies damage locally — it only animates the response.
export function startEnemyAI() {
  const store = useGameStore.getState

  // Defensive: clear any timers still alive from a previous Run. clearScene
  // already handles this, but if startEnemyAI ever gets called twice in a
  // row (e.g. a stale session listener fires `ready` again) without an
  // intervening clearScene, we MUST not stack tickers — multiple tickers
  // would mean the enemy attacks the hero N times every 3 seconds.
  const existing = useGameStore.getState().enemyTimers
  if (existing.length > 0) {
    existing.forEach((t) => clearInterval(t))
    useGameStore.setState({ enemyTimers: [] })
  }

  const timer = window.setInterval(() => {
    const { characters } = store()
    const enemies = characters.filter((c) => c.isEnemy && c.hp > 0)
    const players = characters.filter((c) => !c.isEnemy && c.hp > 0)
    if (enemies.length === 0 || players.length === 0) return

    enemies.forEach((enemy) => {
      const target = players[Math.floor(Math.random() * players.length)]
      if (!target) return

      const dx = target.targetCol - enemy.targetCol
      const dz = target.targetRow - enemy.targetRow
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= 3) {
        // In range — let the JVM compute and apply the damage. The trace
        // will come back as an `enemyAttack` action and ActionExecutor
        // will play the slash + damage popup + log line.
        session.enemyAttack(enemy.id, target.id)
      } else {
        // Out of range — close the gap. Movement is purely cosmetic on
        // the frontend (enemies aren't student-controlled), so we don't
        // bounce this through the JVM.
        const moveCol = enemy.targetCol + Math.sign(dx)
        const moveRow = enemy.targetRow + Math.sign(dz)
        useGameStore.getState().moveCharacter(enemy.id, moveCol, moveRow)
      }
    })
  }, 3000)

  useGameStore.setState((s) => ({ enemyTimers: [...s.enemyTimers, timer] }))
}
