import { ParseResult } from './JavaParser'
import { CharacterState, useGameStore, startEnemyAI } from '../state/gameStore'
import { MAP } from '../scene/Terrain'
import { setupKeyboardBindings } from '../interaction/KeyboardController'
import { Sounds } from '../assets/sounds'
import type { TraceAction } from './TraceParser'

const TILE_H: Record<number, number> = { 0: 0.3, 1: 0.3, 2: 0.2, 3: 0.5, 4: 0.05, 5: 0.25 }

export interface SpawnData {
  className: string
  col: number
  row: number
  hp: number
  maxHp: number
  atk: number
  mana: number
  def: number
  arrows: number
  nameStr: string
  methods: string[]
}

interface GameAction {
  type: string
  name: string
  data?: SpawnData
  target?: string
  col?: number
  row?: number
  field?: string
  value?: any
  method?: string
  args?: string
  text?: string
  color?: string
  delay: number
}

const SPAWNS_LEFT = [
  { c: 3, r: 3 }, { c: 3, r: 5 }, { c: 2, r: 4 }, { c: 4, r: 2 },
]
const SPAWNS_RIGHT = [
  { c: 8, r: 4 }, { c: 8, r: 6 }, { c: 9, r: 3 }, { c: 7, r: 7 },
]

export interface BuildResult {
  actions: GameAction[]
  charMap: Record<string, SpawnData>
}

export function buildActions(parsed: ParseResult): BuildResult {
  const actions: GameAction[] = []
  const cm: Record<string, SpawnData> = {}
  let si = 0

  function resolveClass(className: string) {
    const allM: string[] = []
    const allA: ParseResult['classes'][0]['attrs'] = []
    const chain: ParseResult['classes'][0][] = []
    let cur = parsed.classes.find((c) => c.name === className)
    while (cur) {
      chain.unshift(cur)
      const pn = cur.parent
      cur = pn ? parsed.classes.find((c) => c.name === pn) : undefined
    }
    chain.forEach((c) => {
      c.methods.forEach((m) => allM.push(m.name))
      allA.push(...c.attrs)
    })
    return { methods: allM, attrs: allA, cls: chain[chain.length - 1], chain }
  }

  parsed.objects.forEach((obj) => {
    const res = resolveClass(obj.className)
    const cls = res.cls
    let ctor: ParseResult['classes'][0]['ctor'] = null
    res.chain.forEach((c) => { if (c?.ctor) ctor = c.ctor })
    if (cls?.ctor) ctor = cls.ctor

    let hp = 100, atk = 15, nameStr = obj.name, mana = 50, def2 = 5, arrows = 10

    if (ctor?.fieldMap) {
      const fm = ctor.fieldMap
      Object.keys(fm).forEach((field) => {
        const idx = fm[field]
        if (idx < obj.args.length) {
          const val = obj.args[idx]
          if (/^(name|characterName|n)$/.test(field)) nameStr = val
          else if (/^(health|hp|hitPoints)$/.test(field)) { const v = parseInt(val); if (!isNaN(v)) hp = v }
          else if (/^(attackPower|attack|atk|damage|power)$/.test(field)) { const v = parseInt(val); if (!isNaN(v)) atk = v }
          else if (/^(mana|mp|magicPower)$/.test(field)) { const v = parseInt(val); if (!isNaN(v)) mana = v }
          else if (/^(defense|def|armor)$/.test(field)) { const v = parseInt(val); if (!isNaN(v)) def2 = v }
          else if (/^(arrows|arrowCount)$/.test(field)) { const v = parseInt(val); if (!isNaN(v)) arrows = v }
        }
      })
    } else {
      if (obj.args.length >= 1 && isNaN(Number(obj.args[0]))) nameStr = obj.args[0]
      if (obj.args.length >= 2 && !isNaN(Number(obj.args[1]))) hp = parseInt(obj.args[1])
      if (obj.args.length >= 3 && !isNaN(Number(obj.args[2]))) atk = parseInt(obj.args[2])
    }

    res.attrs.forEach((a) => {
      if (a.value && obj.args.length < 2) {
        if (/^(health|hp)$/.test(a.name) && !isNaN(parseInt(a.value))) hp = parseInt(a.value)
        if (/^(attackPower|attack)$/.test(a.name) && !isNaN(parseInt(a.value))) atk = parseInt(a.value)
      }
    })

    const sp = si % 2 === 0
      ? SPAWNS_LEFT[Math.floor(si / 2) % SPAWNS_LEFT.length]
      : SPAWNS_RIGHT[Math.floor(si / 2) % SPAWNS_RIGHT.length]
    si++

    cm[obj.name] = {
      className: obj.className, col: sp.c, row: sp.r,
      hp, maxHp: hp, atk, mana, def: def2, arrows,
      methods: res.methods, nameStr,
    }
    actions.push({ type: 'spawn', name: obj.name, data: cm[obj.name], delay: si * 500 })
  })

  const colMem: Record<string, string[]> = {}
  parsed.collections.forEach((c) => { colMem[c.name] = [] })
  let delay = parsed.objects.length * 500 + 300

  parsed.calls.forEach((call) => {
    if (call.obj === '__sysout__') {
      actions.push({ type: 'log', name: '', text: '> ' + call.args.replace(/^"|"$/g, ''), color: '#B0BEC5', delay })
      delay += 300; return
    }
    if (call.method === 'add' && colMem[call.obj] !== undefined) {
      colMem[call.obj].push(call.args)
      actions.push({ type: 'log', name: '', text: call.obj + '.add(' + call.args + ')', color: '#42A5F5', delay })
      delay += 200; return
    }
    if (call.isLoop && call.obj === '__fe__') {
      const mem = colMem[call.coll!] || []
      mem.forEach((mn, i) => {
        actions.push({ type: 'action', name: mn, method: call.method, args: call.args, delay: delay + i * 700 })
      })
      delay += mem.length * 700 + 200; return
    }
    if (call.method === 'move' || call.method === 'moveTo') {
      const co = call.args.split(',').map((s) => parseInt(s.trim()))
      if (co.length === 2 && !isNaN(co[0]) && !isNaN(co[1])) {
        actions.push({ type: 'move', name: call.obj, col: co[0], row: co[1], delay })
        delay += 800
      }
      return
    }
    if (call.method === 'attack') { actions.push({ type: 'attack', name: call.obj, target: call.args, delay }); delay += 900; return }
    if (call.method === 'castSpell') { actions.push({ type: 'spell', name: call.obj, target: call.args, delay }); delay += 1100; return }
    if (call.method === 'heal') { actions.push({ type: 'heal', name: call.obj, target: call.args, delay }); delay += 900; return }
    if (call.method === 'defend') { actions.push({ type: 'defend', name: call.obj, delay }); delay += 600; return }
    if (call.method === 'shoot') { actions.push({ type: 'shoot', name: call.obj, target: call.args, delay }); delay += 1000; return }
    if (/^set[A-Z]/.test(call.method)) {
      const field = call.method.charAt(3).toLowerCase() + call.method.slice(4)
      actions.push({ type: 'setter', name: call.obj, field, value: call.args, delay })
      delay += 400; return
    }
    if (call.method === 'specialAbility' || call.method === 'specialMove') {
      actions.push({ type: 'special', name: call.obj, target: call.args, delay })
      delay += 1000; return
    }
    actions.push({ type: 'action', name: call.obj, method: call.method, args: call.args, delay })
    delay += 500
  })

  return { actions, charMap: cm }
}

function charWorldPos(ch: CharacterState): [number, number, number] {
  const tileType = MAP[ch.row]?.[ch.col] ?? 0
  const h = TILE_H[tileType] ?? 0.3
  return [ch.col, h + 0.5, ch.row]
}

export function executeActions(actions: GameAction[], addLog: (text: string, color?: string) => void, cm: Record<string, SpawnData> = {}) {
  const store = useGameStore.getState

  actions.forEach((action) => {
    setTimeout(() => {
      const { characters, spawnCharacter, moveCharacter, updateCharacter, damageCharacter, healCharacter, addEffect, selectCharacter } = store()

      if (action.type === 'spawn' && action.data) {
        const d = action.data
        const tileType = MAP[d.row]?.[d.col] ?? 0
        const tileH = TILE_H[tileType] ?? 0.3
        // Detect if this is an "enemy" — placed on right side spawns
        const isEnemy = d.col >= 7
        spawnCharacter({
          id: action.name, name: d.nameStr, className: d.className as CharacterState['className'],
          col: d.col, row: d.row, targetCol: d.col, targetRow: d.row,
          hp: d.hp, maxHp: d.maxHp, atk: d.atk, mana: d.mana, def: d.def, arrows: d.arrows,
          isDefending: false, animState: 'idle', facingAngle: d.col > 6 ? Math.PI : 0,
          isEnemy,
        })
        Sounds.spawn()
        addLog(`⚔️ ${d.nameStr} (${d.className}) summoned! HP:${d.hp} ATK:${d.atk}${d.def > 0 ? ' DEF:'+d.def : ''}`, '#4CAF50')
      }

      else if (action.type === 'move' && action.col !== undefined && action.row !== undefined) {
        moveCharacter(action.name, action.col, action.row)
        selectCharacter(action.name)
        addLog(`🚶 ${action.name}.move(${action.col}, ${action.row})`, '#42A5F5')
      }

      else if (action.type === 'attack' && action.target) {
        const chars = store().characters
        const atk = chars.find((c) => c.id === action.name)
        const tgt = chars.find((c) => c.id === action.target)
        if (atk && tgt) {
          const dmg = atk.atk
          const isMage = atk.className === 'Mage'
          updateCharacter(atk.id, { animState: 'attack' })
          const fromPos = charWorldPos(atk)
          const toPos = charWorldPos(tgt)

          if (isMage) {
            addEffect({ id: `fb-${Date.now()}`, type: 'fireball', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.8 })
            Sounds.fireball()
          } else {
            addEffect({ id: `sl-${Date.now()}`, type: 'slash', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.4 })
            Sounds.slash()
          }

          setTimeout(() => {
            damageCharacter(tgt.id, dmg)
            Sounds.damage()
            addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: isMage ? '#AB47BC' : '#F44336', startTime: performance.now() / 1000, duration: 1.2 })
            addLog(`⚔️ ${atk.name} attacks ${tgt.name} for ${dmg} damage! (attackPower=${atk.atk})`, isMage ? '#AB47BC' : '#F44336')
          }, isMage ? 600 : 300)

          setTimeout(() => { updateCharacter(atk.id, { animState: 'idle' }) }, 800)
          setTimeout(() => { updateCharacter(tgt.id, { animState: tgt.hp - dmg <= 0 ? 'dead' : 'idle' }) }, 900)
        }
      }

      else if (action.type === 'spell' && action.target) {
        const chars = store().characters
        const atk = chars.find((c) => c.id === action.name)
        const tgt = chars.find((c) => c.id === action.target)
        if (atk && tgt) {
          updateCharacter(atk.id, { animState: 'cast' })
          const fromPos = charWorldPos(atk)
          const toPos = charWorldPos(tgt)
          addEffect({ id: `fb-${Date.now()}`, type: 'fireball', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 1.0 })
          Sounds.fireball()

          setTimeout(() => {
            const dmg = atk.atk
            damageCharacter(tgt.id, dmg)
            addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: '#AB47BC', startTime: performance.now() / 1000, duration: 1.2 })
            addLog(`🔮 ${atk.name} casts spell on ${tgt.name} for ${dmg}! (attackPower=${atk.atk})`, '#AB47BC')
            updateCharacter(atk.id, { animState: 'idle' })
          }, 700)
          setTimeout(() => { updateCharacter(tgt.id, { animState: tgt.hp - atk.atk <= 0 ? 'dead' : 'idle' }) }, 1000)
        }
      }

      else if (action.type === 'shoot' && action.target) {
        const chars = store().characters
        const atk = chars.find((c) => c.id === action.name)
        const tgt = chars.find((c) => c.id === action.target)
        if (atk && tgt) {
          const fromPos = charWorldPos(atk)
          const toPos = charWorldPos(tgt)
          addEffect({ id: `ar-${Date.now()}`, type: 'arrow', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.7 })
          Sounds.arrow()

          setTimeout(() => {
            const dmg = atk.atk
            damageCharacter(tgt.id, dmg)
            Sounds.damage()
            addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: '#FFEB3B', startTime: performance.now() / 1000, duration: 1.2 })
            addLog(`🏹 ${atk.name} shoots ${tgt.name} for ${dmg}! (attackPower=${atk.atk})`, '#FF9800')
          }, 500)
          setTimeout(() => { updateCharacter(tgt.id, { animState: tgt.hp - atk.atk <= 0 ? 'dead' : 'idle' }) }, 800)
        }
      }

      else if (action.type === 'heal') {
        const chars = store().characters
        const hlr = chars.find((c) => c.id === action.name)
        let tgt = chars.find((c) => c.id === action.target)
        if (!tgt) tgt = hlr
        if (hlr && tgt) {
          const amt = hlr.atk
          healCharacter(tgt.id, amt)
          const toPos = charWorldPos(tgt)
          Sounds.heal()
          addEffect({ id: `hl-${Date.now()}`, type: 'heal', from: toPos, to: toPos, startTime: performance.now() / 1000, duration: 1.0 })
          addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: amt, color: '#4CAF50', startTime: performance.now() / 1000, duration: 1.2 })
          addLog(`✨ ${hlr.name} heals ${tgt.name} for ${amt} HP!`, '#4CAF50')
        }
      }

      else if (action.type === 'defend') {
        const ch = store().characters.find((c) => c.id === action.name)
        if (ch) {
          updateCharacter(ch.id, { animState: 'defend', isDefending: true })
          Sounds.shield()
          const pos = charWorldPos(ch)
          addEffect({ id: `sh-${Date.now()}`, type: 'shield', from: pos, to: pos, startTime: performance.now() / 1000, duration: 1.2 })
          addLog(`🛡️ ${action.name} raises shield! (incoming damage halved for 3s)`, '#42A5F5')
          setTimeout(() => { updateCharacter(ch.id, { animState: 'idle', isDefending: false }) }, 3000)
        }
      }

      else if (action.type === 'setter') {
        const ch = store().characters.find((c) => c.id === action.name)
        if (ch && action.field) {
          const val = parseInt(action.value) || 0
          const patch: Partial<CharacterState> = {}
          if (/^(health|hp)$/.test(action.field)) { patch.hp = val; patch.maxHp = Math.max(ch.maxHp, val) }
          else if (/^(attackPower|attack|atk)$/.test(action.field)) { patch.atk = val }
          updateCharacter(ch.id, patch)
          addLog(`⚙️ ${action.name}.set${action.field.charAt(0).toUpperCase() + action.field.slice(1)}(${action.value})`, '#FF9800')
        }
      }

      else if (action.type === 'special') {
        const ch = store().characters.find((c) => c.id === action.name)
        if (ch) {
          const pos = charWorldPos(ch)
          if (ch.className === 'Mage' && action.target) {
            const tgt = store().characters.find((c) => c.id === action.target)
            if (tgt) {
              const toPos = charWorldPos(tgt)
              addEffect({ id: `fb-${Date.now()}`, type: 'fireball', from: pos, to: toPos, startTime: performance.now() / 1000, duration: 1.0 })
              setTimeout(() => {
                damageCharacter(tgt.id, ch.atk)
                addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: ch.atk, color: '#AB47BC', startTime: performance.now() / 1000, duration: 1.2 })
              }, 600)
            }
          } else if (ch.className === 'Archer' && action.target) {
            const tgt = store().characters.find((c) => c.id === action.target)
            if (tgt) {
              const toPos = charWorldPos(tgt)
              addEffect({ id: `ar-${Date.now()}`, type: 'arrow', from: pos, to: toPos, startTime: performance.now() / 1000, duration: 0.7 })
            }
          } else {
            addEffect({ id: `sh-${Date.now()}`, type: 'shield', from: pos, to: pos, startTime: performance.now() / 1000, duration: 1.0 })
          }
          addLog(`⭐ ${ch.name} uses specialAbility()!`, '#FFC107')
        }
      }

      else if (action.type === 'action') {
        const chars = store().characters
        const ch = chars.find((c) => c.id === action.name)
        if (ch && action.method === 'attack' && action.args) {
          const tgt = chars.find((c) => c.id === action.args)
          if (tgt) {
            const dmg = ch.atk
            const fromPos = charWorldPos(ch)
            const toPos = charWorldPos(tgt)
            const isMage = ch.className === 'Mage'
            const isArcher = ch.className === 'Archer'

            updateCharacter(ch.id, { animState: 'attack' })
            if (isMage) {
              addEffect({ id: `fb-${Date.now()}`, type: 'fireball', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.8 })
            } else if (isArcher) {
              addEffect({ id: `ar-${Date.now()}`, type: 'arrow', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.7 })
            } else {
              addEffect({ id: `sl-${Date.now()}`, type: 'slash', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.4 })
            }

            const effectDelay = isMage ? 600 : isArcher ? 500 : 300
            setTimeout(() => {
              damageCharacter(tgt.id, dmg)
              addEffect({ id: `dmg-${Date.now()}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: isMage ? '#AB47BC' : isArcher ? '#FFEB3B' : '#F44336', startTime: performance.now() / 1000, duration: 1.2 })
              addLog(`⚔️ ${ch.name} attacks ${tgt.name} for ${dmg}!`, isMage ? '#AB47BC' : '#F44336')
            }, effectDelay)
            setTimeout(() => { updateCharacter(ch.id, { animState: 'idle' }) }, 800)
            setTimeout(() => { updateCharacter(tgt.id, { animState: tgt.hp - dmg <= 0 ? 'dead' : 'idle' }) }, 900)
          }
        } else if (ch) {
          addLog(`▶ ${action.name}.${action.method}(${action.args || ''})`, '#78909C')
        }
      }

      else if (action.type === 'log') {
        addLog(action.text || '', action.color)
      }
    }, action.delay || 0)
  })

  // ─── KEYBOARD BINDINGS ───
  // After all actions are queued, set up keyboard controls based on methods defined in code
  // Methods like moveUp, moveDown, moveLeft, moveRight, attack, defend, castSpell, shoot, heal
  // get bound to WASD / arrow keys / space / Q / E / R
  const charMethodsList: { charId: string; methods: string[] }[] = []
  Object.entries(cm).forEach(([charId, data]) => {
    if (data.methods.length > 0) {
      charMethodsList.push({ charId, methods: data.methods })
    }
  })

  if (charMethodsList.length > 0) {
    // Wait for spawn actions to complete before binding
    const maxDelay = actions.reduce((max, a) => Math.max(max, a.delay || 0), 0)
    setTimeout(() => {
      setupKeyboardBindings(charMethodsList)
      const moveMethods = ['moveUp', 'moveDown', 'moveLeft', 'moveRight']
      const combatMethods = ['attack', 'defend', 'castSpell', 'shoot', 'heal']
      const boundMove = charMethodsList.some(({ methods }) => methods.some((m) => moveMethods.includes(m)))
      const boundCombat = charMethodsList.some(({ methods }) => methods.some((m) => combatMethods.includes(m)))
      if (boundMove) addLog('🎮 WASD/Arrow keys bound to movement methods!', '#FFC107')
      if (boundCombat) addLog('🎮 SPACE=attack, Q=defend(halves damage!), E=spell/shoot, R=heal', '#FFC107')

      // Start enemy AI if there are enemy characters
      const chars = useGameStore.getState().characters
      const hasEnemies = chars.some((c) => c.isEnemy && c.hp > 0)
      const hasPlayers = chars.some((c) => !c.isEnemy && c.hp > 0)
      if (hasEnemies && hasPlayers) {
        startEnemyAI()
        addLog('👹 Enemy AI activated! They attack every 3 seconds. Use Q (defend) to block!', '#F44336')
      }
    }, maxDelay + 200)
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TRACE-BASED EXECUTOR
// Drives the 3D scene from ##JQ events emitted by the student's actual
// Java execution (via the Arena helper). Damage values, HP changes, and
// animation counts come from real runtime — no more regex heuristics.
// ═══════════════════════════════════════════════════════════════════════

/** Apply ONE TraceAction immediately. Used by both the legacy whole-trace
 *  consumer (executeTraceActions) and the streaming SessionClient consumer
 *  in App.tsx. The shield auto-clear is owned by the JVM (shieldExpired
 *  trace), so this function never schedules its own reset timer. */
export function executeTraceActionStream(
  action: TraceAction,
  addLog: (text: string, color?: string) => void,
) {
  const store = useGameStore.getState
  const s = store()
  const { spawnCharacter, moveCharacter, updateCharacter, damageCharacter, healCharacter, addEffect, selectCharacter } = s

  if (action.type === 'spawn' && action.data) {
    const d = action.data
    // The right-side spawn cells are reserved for enemies; this lets the
    // frontend tag them so the AI loop knows who to attack.
    const isEnemy = d.col >= 7
    spawnCharacter({
      id: action.name, name: d.nameStr, className: d.className as CharacterState['className'],
      col: d.col, row: d.row, targetCol: d.col, targetRow: d.row,
      hp: d.hp, maxHp: d.maxHp, atk: d.atk, mana: d.mana, def: d.def, arrows: d.arrows,
      isDefending: false, animState: 'idle', facingAngle: d.col > 6 ? Math.PI : 0,
      isEnemy,
    })
    Sounds.spawn()
    addLog(`⚔️ ${d.nameStr} (${d.className}) summoned! HP:${d.hp} ATK:${d.atk}`, '#4CAF50')
    return
  }

  if (action.type === 'move' && action.col !== undefined && action.row !== undefined) {
    moveCharacter(action.name, action.col, action.row)
    selectCharacter(action.name)
    addLog(`🚶 ${action.name} → (${action.col}, ${action.row})`, '#42A5F5')
    return
  }

  if (action.type === 'attack' && action.target) {
    const chars = store().characters
    const atk = chars.find((c) => c.id === action.name)
    const tgt = chars.find((c) => c.id === action.target)
    if (!atk || !tgt) {
      addLog(`⚠️ attack: ${!atk ? action.name : action.target} not summoned`, '#FF9800')
      return
    }
    const dmg = action.value ?? 0
    const isMage = atk.className === 'Mage'
    const isArcher = atk.className === 'Archer'
    updateCharacter(atk.id, { animState: 'attack' })
    const fromPos = charWorldPos(atk)
    const toPos = charWorldPos(tgt)

    const fxId = Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    if (isMage) {
      addEffect({ id: `fb-${fxId}`, type: 'fireball', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.8 })
      Sounds.fireball()
    } else if (isArcher) {
      addEffect({ id: `ar-${fxId}`, type: 'arrow', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.7 })
      Sounds.arrow()
    } else {
      addEffect({ id: `sl-${fxId}`, type: 'slash', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.4 })
      Sounds.slash()
    }

    const impactDelay = isMage ? 600 : isArcher ? 500 : 300
    setTimeout(() => {
      damageCharacter(tgt.id, dmg)
      if (dmg > 0) Sounds.damage()
      addEffect({ id: `dmg-${fxId}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: isMage ? '#AB47BC' : isArcher ? '#FFEB3B' : '#F44336', startTime: performance.now() / 1000, duration: 1.2 })
      const verb = dmg === 0 ? 'swings at' : 'hits'
      const tail = dmg === 0 ? ' — no damage! Check your method body.' : ` for ${dmg}`
      addLog(`⚔️ ${atk.name} ${verb} ${tgt.name}${tail}`, dmg === 0 ? '#FF9800' : isMage ? '#AB47BC' : '#F44336')
    }, impactDelay)
    setTimeout(() => updateCharacter(atk.id, { animState: 'idle' }), 800)
    setTimeout(() => updateCharacter(tgt.id, { animState: tgt.hp - dmg <= 0 ? 'dead' : 'idle' }), 900)
    return
  }

  if (action.type === 'spell' && action.target) {
    const chars = store().characters
    const atk = chars.find((c) => c.id === action.name)
    const tgt = chars.find((c) => c.id === action.target)
    if (!atk || !tgt) return
    const dmg = action.value ?? 0
    updateCharacter(atk.id, { animState: 'cast' })
    const fromPos = charWorldPos(atk)
    const toPos = charWorldPos(tgt)
    const fxId = Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    addEffect({ id: `fb-${fxId}`, type: 'fireball', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 1.0 })
    Sounds.fireball()
    setTimeout(() => {
      damageCharacter(tgt.id, dmg)
      addEffect({ id: `dmg-${fxId}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: '#AB47BC', startTime: performance.now() / 1000, duration: 1.2 })
      const tail = dmg === 0 ? ' — fizzled! Did castSpell update target.health?' : ` for ${dmg}`
      addLog(`🔮 ${atk.name} casts on ${tgt.name}${tail}`, dmg === 0 ? '#FF9800' : '#AB47BC')
      updateCharacter(atk.id, { animState: 'idle' })
    }, 700)
    setTimeout(() => updateCharacter(tgt.id, { animState: tgt.hp - dmg <= 0 ? 'dead' : 'idle' }), 1000)
    return
  }

  if (action.type === 'shoot' && action.target) {
    const chars = store().characters
    const atk = chars.find((c) => c.id === action.name)
    const tgt = chars.find((c) => c.id === action.target)
    if (!atk || !tgt) return
    const dmg = action.value ?? 0
    const fromPos = charWorldPos(atk)
    const toPos = charWorldPos(tgt)
    const fxId = Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    addEffect({ id: `ar-${fxId}`, type: 'arrow', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.7 })
    Sounds.arrow()
    setTimeout(() => {
      damageCharacter(tgt.id, dmg)
      if (dmg > 0) Sounds.damage()
      addEffect({ id: `dmg-${fxId}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: '#FFEB3B', startTime: performance.now() / 1000, duration: 1.2 })
      const tail = dmg === 0 ? ' — missed! Did shoot reduce target.health?' : ` for ${dmg}`
      addLog(`🏹 ${atk.name} shoots ${tgt.name}${tail}`, dmg === 0 ? '#FF9800' : '#FF9800')
    }, 500)
    setTimeout(() => updateCharacter(tgt.id, { animState: tgt.hp - dmg <= 0 ? 'dead' : 'idle' }), 800)
    return
  }

  if (action.type === 'heal') {
    const chars = store().characters
    const hlr = chars.find((c) => c.id === action.name)
    let tgt = chars.find((c) => c.id === action.target)
    if (!tgt) tgt = hlr
    if (!tgt) return
    const amt = action.value ?? 0
    healCharacter(tgt.id, amt)
    const toPos = charWorldPos(tgt)
    if (amt > 0) Sounds.heal()
    const fxId = Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    addEffect({ id: `hl-${fxId}`, type: 'heal', from: toPos, to: toPos, startTime: performance.now() / 1000, duration: 1.0 })
    addEffect({ id: `dmg-${fxId}`, type: 'damage', from: toPos, to: toPos, value: amt, color: '#4CAF50', startTime: performance.now() / 1000, duration: 1.2 })
    const tail = amt === 0 ? ' — no effect! Did heal increase target.health?' : ` for ${amt}`
    addLog(`✨ ${hlr?.name || 'healer'} heals ${tgt.name}${tail}`, amt === 0 ? '#FF9800' : '#4CAF50')
    return
  }

  if (action.type === 'defend') {
    const ch = store().characters.find((c) => c.id === action.name)
    if (!ch) return
    updateCharacter(ch.id, { animState: 'defend', isDefending: true })
    Sounds.shield()
    const pos = charWorldPos(ch)
    addEffect({ id: `sh-${Date.now()}`, type: 'shield', from: pos, to: pos, startTime: performance.now() / 1000, duration: 3.0 })
    addLog(`🛡️ ${action.name} defends! (incoming damage halved for 3s)`, '#42A5F5')
    return
  }

  if (action.type === 'shieldExpired') {
    const ch = store().characters.find((c) => c.id === action.name)
    if (!ch) return
    updateCharacter(ch.id, { isDefending: false, animState: ch.animState === 'defend' ? 'idle' : ch.animState })
    return
  }

  if (action.type === 'enemyAttack' && action.target) {
    const chars = store().characters
    const atk = chars.find((c) => c.id === action.name)
    const tgt = chars.find((c) => c.id === action.target)
    if (!atk || !tgt) return
    const dmg = action.value ?? 0
    const fromPos = charWorldPos(atk)
    const toPos = charWorldPos(tgt)
    const fxId = Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    Sounds.enemyAttack()
    updateCharacter(atk.id, { animState: 'attack' })
    addEffect({ id: `esl-${fxId}`, type: 'slash', from: fromPos, to: toPos, startTime: performance.now() / 1000, duration: 0.4 })
    setTimeout(() => {
      damageCharacter(tgt.id, dmg)
      addEffect({ id: `edmg-${fxId}`, type: 'damage', from: toPos, to: toPos, value: dmg, color: '#F44336', startTime: performance.now() / 1000, duration: 1.2 })
      const blocked = action.shielded ? ' (BLOCKED! 50% reduced)' : ''
      addLog(`👹 ${atk.name} attacks ${tgt.name} for ${dmg}!${blocked}`, '#F44336')
    }, 300)
    setTimeout(() => updateCharacter(atk.id, { animState: 'idle' }), 700)
    return
  }

  if (action.type === 'log' || action.type === 'phase') {
    addLog(action.text || '', action.color)
    return
  }

  if (action.type === 'warn') {
    addLog(`🪧 Arena: ${action.text}`, action.color || '#FF9800')
    return
  }
}

export function executeTraceActions(
  actions: TraceAction[],
  addLog: (text: string, color?: string) => void,
  charMap: Record<string, SpawnData>,
  /** Per-character method list (from the parsed source) for keyboard binding.
   *  Map keys are character names matching charMap. */
  charMethods: Record<string, string[]> = {},
) {
  actions.forEach((action) => {
    setTimeout(() => executeTraceActionStream(action, addLog), action.delay || 0)
  })

  // After spawns land, wire up keyboard + enemy AI.
  const hasSpawns = Object.keys(charMap).length > 0
  if (hasSpawns) {
    const maxDelay = actions.reduce((m, a) => Math.max(m, a.delay || 0), 0)
    setTimeout(() => {
      // Build the list of {charId, methods} for the keyboard controller.
      const list = Object.keys(charMap).map((id) => ({
        charId: id,
        methods: charMethods[id] ?? [],
      })).filter((e) => e.methods.length > 0)

      if (list.length > 0) {
        setupKeyboardBindings(list)
        const moveMethods = ['moveUp', 'moveDown', 'moveLeft', 'moveRight']
        const combatMethods = ['attack', 'defend', 'castSpell', 'shoot', 'heal']
        const boundMove = list.some(({ methods }) => methods.some((m) => moveMethods.includes(m)))
        const boundCombat = list.some(({ methods }) => methods.some((m) => combatMethods.includes(m)))
        if (boundMove) addLog('🎮 WASD/Arrow keys bound to movement methods!', '#FFC107')
        if (boundCombat) addLog('🎮 SPACE=attack · Q=defend · E=spell/shoot · R=heal', '#FFC107')
      }

      const chars = useGameStore.getState().characters
      const hasEnemies = chars.some((c) => c.isEnemy && c.hp > 0)
      const hasPlayers = chars.some((c) => !c.isEnemy && c.hp > 0)
      if (hasEnemies && hasPlayers) {
        startEnemyAI()
        addLog('👹 Enemy AI activated! Use Q (defend) to halve damage.', '#F44336')
      }
    }, maxDelay + 400)
  }
}
