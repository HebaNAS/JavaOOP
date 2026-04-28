import { useGameStore } from '../state/gameStore'
import { isWalkable } from '../scene/Terrain'
import { session } from '../api/session'

// Maps key bindings defined by student Java code to game actions.
//
// When student code defines moveUp/moveDown/moveLeft/moveRight, attack,
// defend, castSpell, shoot, or heal, those methods get bound to keys.
// On keypress we send `invoke <name> <method> [<targetName>]` to the
// long-running JVM session — the student's compiled body runs there,
// and the resulting ##JQ trace events drive the on-screen response.
//
// Targets are picked client-side (nearest live other) but ALL state
// changes come back from the JVM trace stream.

export interface KeyBinding {
  key: string
  method: string
  charId: string
}

let activeBindings: KeyBinding[] = []
let keyListener: ((e: KeyboardEvent) => void) | null = null

const METHOD_KEY_MAP: Record<string, string[]> = {
  moveUp:    ['w', 'ArrowUp'],
  moveDown:  ['s', 'ArrowDown'],
  moveLeft:  ['a', 'ArrowLeft'],
  moveRight: ['d', 'ArrowRight'],
  attack:    [' '],
  defend:    ['q'],
  castSpell: ['e'],
  shoot:     ['e'],
  heal:      ['r'],
  jump:      [' '],
}

const MOVE_METHODS = new Set(['moveUp', 'moveDown', 'moveLeft', 'moveRight'])
const TARGETED_METHODS = new Set(['attack', 'castSpell', 'shoot'])
// heal: invoked without a target; the student's code decides who to heal
// (usually self via Healable.heal(int amount), or a parameter they pass).

export function setupKeyboardBindings(charMethods: { charId: string; methods: string[] }[]) {
  clearKeyboardBindings()

  activeBindings = []
  charMethods.forEach(({ charId, methods }) => {
    methods.forEach((method) => {
      const keys = METHOD_KEY_MAP[method]
      if (keys) keys.forEach((key) => activeBindings.push({ key, method, charId }))
    })
  })

  if (activeBindings.length === 0) return

  const cooldowns = new Map<string, number>()

  keyListener = (e: KeyboardEvent) => {
    // Don't capture if typing in code editor
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT') return
    const el = e.target as HTMLElement
    if (el?.closest?.('.cm-editor')) return

    const store = useGameStore.getState()
    const selectedId = store.selectedId
    if (!selectedId) return

    const binding = activeBindings.find((b) => b.key === e.key && b.charId === selectedId)
    if (!binding) return

    // Cooldown so a held key doesn't flood the JVM with commands.
    const now = Date.now()
    const cooldownKey = `${binding.charId}-${binding.method}`
    if (cooldowns.has(cooldownKey) && now - cooldowns.get(cooldownKey)! < 400) return
    cooldowns.set(cooldownKey, now)

    e.preventDefault()
    dispatchKeyAction(binding.method, selectedId)
  }

  window.addEventListener('keydown', keyListener)
}

export function clearKeyboardBindings() {
  if (keyListener) {
    window.removeEventListener('keydown', keyListener)
    keyListener = null
  }
  activeBindings = []
}

function dispatchKeyAction(method: string, charId: string) {
  const store = useGameStore.getState()
  const ch = store.characters.find((c) => c.id === charId)
  if (!ch || ch.hp <= 0) return

  // No live JVM session → tell the student to click Run. This is what
  // happens when the editor was modified after a successful Run; the
  // App tears the session down so stale keypresses can't fire old code.
  if (!session.isAlive()) {
    store.addLog('⏸️ No active session — click ▶ Run to apply your latest code.', '#FFC107')
    return
  }

  // Movement: pre-check walkability so students can't wander into water,
  // but don't apply the movement locally — the JVM is the source of truth
  // and emits a `move` trace once the student's body actually runs.
  if (MOVE_METHODS.has(method)) {
    const dx = method === 'moveLeft' ? -1 : method === 'moveRight' ? 1 : 0
    const dy = method === 'moveUp' ? -1 : method === 'moveDown' ? 1 : 0
    if (!isWalkable(ch.targetCol + dx, ch.targetRow + dy)) {
      store.addLog(`🚧 ${ch.name} is blocked — can't ${method}() through that.`, '#FF9800')
      return
    }
    session.invoke(ch.id, method)
    return
  }

  // Targeted methods need a victim. Honour a manually-clicked target if the
  // student set one (red ring on a character); otherwise fall back to the
  // nearest live "other" character so the original auto-aim still works
  // when no one's been clicked.
  if (TARGETED_METHODS.has(method)) {
    let target: { id: string } | null = null
    if (store.targetId) {
      const picked = store.characters.find((c) => c.id === store.targetId && c.hp > 0)
      if (picked) target = picked
    }
    if (!target) target = findNearestOther(ch, store.characters)
    if (!target) {
      store.addLog(`👻 No target in range for ${ch.name}.${method}(). Click an enemy to lock it.`, '#FF9800')
      return
    }
    session.invoke(ch.id, method, target.id)
    return
  }

  // defend, heal, jump, etc. — no target argument.
  session.invoke(ch.id, method)
}

function findNearestOther(
  ch: { id: string; targetCol: number; targetRow: number },
  characters: { id: string; targetCol: number; targetRow: number; hp: number }[],
) {
  let best = null
  let bestDist = Infinity
  for (const other of characters) {
    if (other.id === ch.id || other.hp <= 0) continue
    const dx = other.targetCol - ch.targetCol
    const dz = other.targetRow - ch.targetRow
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < bestDist) { bestDist = dist; best = other }
  }
  return bestDist <= 4 ? best : null
}
