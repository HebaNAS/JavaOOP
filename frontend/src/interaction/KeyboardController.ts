import { useGameStore } from '../state/gameStore'
import { isWalkable } from '../scene/Terrain'
import { Sounds } from '../assets/sounds'

// Maps key bindings defined by student Java code to game actions
// When student defines moveUp(), moveDown(), moveLeft(), moveRight() in their class,
// those methods get bound to WASD/arrow keys for the selected character

export interface KeyBinding {
  key: string        // keyboard key (w, a, s, d, space, etc.)
  method: string     // Java method name
  charId: string     // which character owns this binding
}

let activeBindings: KeyBinding[] = []
let keyListener: ((e: KeyboardEvent) => void) | null = null

const METHOD_KEY_MAP: Record<string, string[]> = {
  moveUp:    ['w', 'ArrowUp'],
  moveDown:  ['s', 'ArrowDown'],
  moveLeft:  ['a', 'ArrowLeft'],
  moveRight: ['d', 'ArrowRight'],
  attack:    [' '],        // space
  defend:    ['q'],
  castSpell: ['e'],
  shoot:     ['e'],
  heal:      ['r'],
  jump:      [' '],
}

export function setupKeyboardBindings(charMethods: { charId: string; methods: string[] }[]) {
  // Clear old listener
  clearKeyboardBindings()

  activeBindings = []
  charMethods.forEach(({ charId, methods }) => {
    methods.forEach((method) => {
      const keys = METHOD_KEY_MAP[method]
      if (keys) {
        keys.forEach((key) => {
          activeBindings.push({ key, method, charId })
        })
      }
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

    // Cooldown to prevent spam
    const now = Date.now()
    const cooldownKey = `${binding.charId}-${binding.method}`
    if (cooldowns.has(cooldownKey) && now - cooldowns.get(cooldownKey)! < 400) return
    cooldowns.set(cooldownKey, now)

    e.preventDefault()
    executeKeyAction(binding.method, selectedId)
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

function executeKeyAction(method: string, charId: string) {
  const store = useGameStore.getState()
  const ch = store.characters.find((c) => c.id === charId)
  if (!ch || ch.hp <= 0) return

  if (method === 'moveUp' && isWalkable(ch.targetCol, ch.targetRow - 1)) {
    store.moveCharacter(charId, ch.targetCol, ch.targetRow - 1)
    store.addLog(`⌨️ ${ch.name}.moveUp()`, '#42A5F5')
  }
  else if (method === 'moveDown' && isWalkable(ch.targetCol, ch.targetRow + 1)) {
    store.moveCharacter(charId, ch.targetCol, ch.targetRow + 1)
    store.addLog(`⌨️ ${ch.name}.moveDown()`, '#42A5F5')
  }
  else if (method === 'moveLeft' && isWalkable(ch.targetCol - 1, ch.targetRow)) {
    store.moveCharacter(charId, ch.targetCol - 1, ch.targetRow)
    store.addLog(`⌨️ ${ch.name}.moveLeft()`, '#42A5F5')
  }
  else if (method === 'moveRight' && isWalkable(ch.targetCol + 1, ch.targetRow)) {
    store.moveCharacter(charId, ch.targetCol + 1, ch.targetRow)
    store.addLog(`⌨️ ${ch.name}.moveRight()`, '#42A5F5')
  }
  else if (method === 'attack') {
    const target = findNearestOther(ch, store.characters)
    if (target) {
      Sounds.slash()
      store.updateCharacter(charId, { animState: 'attack' })
      const dmg = ch.atk
      setTimeout(() => {
        Sounds.damage()
        store.damageCharacter(target.id, dmg)
        store.addEffect({
          id: `sl-${Date.now()}`, type: 'slash',
          from: [ch.targetCol, 0.5, ch.targetRow],
          to: [target.targetCol, 0.5, target.targetRow],
          startTime: 0, duration: 0.4,
        })
        store.addEffect({
          id: `dmg-${Date.now()}`, type: 'damage',
          from: [target.targetCol, 0.8, target.targetRow],
          to: [target.targetCol, 0.8, target.targetRow],
          value: dmg, color: '#F44336', startTime: 0, duration: 1.2,
        })
        store.addLog(`⚔️ ${ch.name} attacks ${target.name} for ${dmg}! [SPACE]`, '#F44336')
      }, 200)
      setTimeout(() => store.updateCharacter(charId, { animState: 'idle' }), 600)
    }
  }
  else if (method === 'defend') {
    Sounds.shield()
    // defend() activates a shield — halves all incoming damage for 3 seconds
    // Hint: This works because isDefending reduces damage in the game engine.
    // In Java terms, defend() sets an internal state that modifies how damage is calculated.
    store.updateCharacter(charId, { animState: 'defend', isDefending: true })
    store.addEffect({
      id: `sh-${Date.now()}`, type: 'shield',
      from: [ch.targetCol, 0.5, ch.targetRow],
      to: [ch.targetCol, 0.5, ch.targetRow],
      startTime: 0, duration: 3.0,
    })
    store.addLog(`🛡️ ${ch.name} defends! Damage halved for 3s [Q]`, '#42A5F5')
    setTimeout(() => store.updateCharacter(charId, { animState: 'idle', isDefending: false }), 3000)
  }
  else if (method === 'castSpell') {
    const target = findNearestOther(ch, store.characters)
    if (target) {
      Sounds.fireball()
      store.updateCharacter(charId, { animState: 'cast' })
      store.addEffect({
        id: `fb-${Date.now()}`, type: 'fireball',
        from: [ch.targetCol, 0.7, ch.targetRow],
        to: [target.targetCol, 0.5, target.targetRow],
        startTime: 0, duration: 0.8,
      })
      setTimeout(() => {
        store.damageCharacter(target.id, ch.atk)
        store.addEffect({
          id: `dmg-${Date.now()}`, type: 'damage',
          from: [target.targetCol, 0.8, target.targetRow],
          to: [target.targetCol, 0.8, target.targetRow],
          value: ch.atk, color: '#AB47BC', startTime: 0, duration: 1.2,
        })
        store.addLog(`🔮 ${ch.name} casts spell on ${target.name} for ${ch.atk}! [E]`, '#AB47BC')
      }, 500)
      setTimeout(() => store.updateCharacter(charId, { animState: 'idle' }), 800)
    }
  }
  else if (method === 'shoot') {
    const target = findNearestOther(ch, store.characters)
    if (target && ch.arrows > 0) {
      Sounds.arrow()
      store.updateCharacter(charId, { arrows: ch.arrows - 1 })
      store.addEffect({
        id: `ar-${Date.now()}`, type: 'arrow',
        from: [ch.targetCol, 0.6, ch.targetRow],
        to: [target.targetCol, 0.5, target.targetRow],
        startTime: 0, duration: 0.6,
      })
      setTimeout(() => {
        store.damageCharacter(target.id, ch.atk)
        store.addEffect({
          id: `dmg-${Date.now()}`, type: 'damage',
          from: [target.targetCol, 0.8, target.targetRow],
          to: [target.targetCol, 0.8, target.targetRow],
          value: ch.atk, color: '#FFEB3B', startTime: 0, duration: 1.2,
        })
        store.addLog(`🏹 ${ch.name} shoots ${target.name} for ${ch.atk}! (${ch.arrows - 1} arrows left) [E]`, '#FF9800')
      }, 400)
    }
  }
  else if (method === 'heal') {
    Sounds.heal()
    store.healCharacter(charId, ch.atk)
    store.addEffect({
      id: `hl-${Date.now()}`, type: 'heal',
      from: [ch.targetCol, 0.5, ch.targetRow],
      to: [ch.targetCol, 0.5, ch.targetRow],
      startTime: 0, duration: 1.0,
    })
    store.addEffect({
      id: `dmg-${Date.now()}`, type: 'damage',
      from: [ch.targetCol, 0.8, ch.targetRow],
      to: [ch.targetCol, 0.8, ch.targetRow],
      value: ch.atk, color: '#4CAF50', startTime: 0, duration: 1.2,
    })
    store.addLog(`✨ ${ch.name} heals for ${ch.atk}! [R]`, '#4CAF50')
  }
}

function findNearestOther(ch: { id: string; targetCol: number; targetRow: number }, characters: { id: string; targetCol: number; targetRow: number; hp: number }[]) {
  let best = null
  let bestDist = Infinity
  for (const other of characters) {
    if (other.id === ch.id || other.hp <= 0) continue
    const dx = other.targetCol - ch.targetCol
    const dz = other.targetRow - ch.targetRow
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < bestDist) { bestDist = dist; best = other }
  }
  return bestDist <= 4 ? best : null // max range 4 tiles
}
