// TraceParser — parses ##JQ trace lines emitted by the Arena helper class
// into a GameAction[] stream the ActionExecutor can render.
//
// Protocol (tab-separated):
//   ##JQ\tspawn\t<name>\t<class>\t<hp>\t<atk>\t<mana>\t<def>\t<arrows>\t<col>\t<row>
//   ##JQ\tmove\t<name>\t<col>\t<row>
//   ##JQ\tattack\t<attacker>\t<target>\t<dmg>\t<attackerClass>
//   ##JQ\tspell\t<caster>\t<target>\t<dmg>
//   ##JQ\tshoot\t<archer>\t<target>\t<dmg>
//   ##JQ\theal\t<healer>\t<target>\t<amount>
//   ##JQ\tdefend\t<name>
//   ##JQ\tsay\t<text>
//   ##JQ\tphase\t<label>
//   ##JQ\twarn\t<message>

import type { SpawnData } from './ActionExecutor'

export interface TraceAction {
  type:
    | 'spawn' | 'move' | 'attack' | 'spell' | 'shoot' | 'heal' | 'defend'
    | 'shieldExpired' | 'enemyAttack'
    | 'log' | 'phase' | 'ready' | 'pong' | 'warn'
  name: string
  data?: SpawnData
  target?: string
  col?: number
  row?: number
  text?: string
  color?: string
  value?: number
  /** For enemyAttack: '1' if the target was shielded (damage halved). */
  shielded?: boolean
  delay: number
}

export interface TraceResult {
  actions: TraceAction[]
  charMap: Record<string, SpawnData>
  cleanStdout: string
  warnings: string[]
  eventCounts: Record<string, number>
}

// Spawn positions — mirror ActionExecutor's grid so it feels familiar
const SPAWNS_LEFT = [
  { c: 3, r: 3 }, { c: 3, r: 5 }, { c: 2, r: 4 }, { c: 4, r: 2 },
]
const SPAWNS_RIGHT = [
  { c: 8, r: 4 }, { c: 8, r: 6 }, { c: 9, r: 3 }, { c: 7, r: 7 },
]

const MAX_ACTIONS = 500

/** Convert one parsed ##JQ event into a TraceAction. Used both by the legacy
 *  whole-stdout parser AND by the streaming SessionClient consumer.
 *
 *  spawnIdxRef.current is mutated when a spawn lacks server-supplied col/row
 *  so we can fall back to the alternating-side allocator. */
export function eventToAction(
  type: string,
  parts: string[],
  spawnIdxRef: { current: number },
  delay: number,
): TraceAction | null {
  switch (type) {
    case 'spawn': {
      const [name, cls, hpS, atkS, manaS, defS, arrowsS, colS, rowS] = parts
      const hp = parseInt(hpS) || 100
      const atk = parseInt(atkS) || 15
      let col: number, row: number
      if (colS != null && rowS != null && !isNaN(parseInt(colS))) {
        col = parseInt(colS); row = parseInt(rowS)
      } else {
        const sp = spawnIdxRef.current % 2 === 0
          ? SPAWNS_LEFT[Math.floor(spawnIdxRef.current / 2) % SPAWNS_LEFT.length]
          : SPAWNS_RIGHT[Math.floor(spawnIdxRef.current / 2) % SPAWNS_RIGHT.length]
        col = sp.c; row = sp.r
      }
      spawnIdxRef.current++
      const data: SpawnData = {
        className: cls || 'Warrior',
        col, row,
        hp, maxHp: hp, atk,
        mana: parseInt(manaS) || 0,
        def: parseInt(defS) || 0,
        arrows: parseInt(arrowsS) || 0,
        nameStr: name,
        methods: [],
      }
      return { type: 'spawn', name, data, delay }
    }
    case 'move':
      return { type: 'move', name: parts[0],
        col: parseInt(parts[1]), row: parseInt(parts[2]), delay }
    case 'attack':
      return { type: 'attack', name: parts[0], target: parts[1],
        value: parseInt(parts[2]) || 0, delay }
    case 'spell':
      return { type: 'spell', name: parts[0], target: parts[1],
        value: parseInt(parts[2]) || 0, delay }
    case 'shoot':
      return { type: 'shoot', name: parts[0], target: parts[1],
        value: parseInt(parts[2]) || 0, delay }
    case 'heal':
      return { type: 'heal', name: parts[0], target: parts[1],
        value: parseInt(parts[2]) || 0, delay }
    case 'defend':
      return { type: 'defend', name: parts[0], delay }
    case 'shieldExpired':
      return { type: 'shieldExpired', name: parts[0], delay }
    case 'enemyAttack':
      return { type: 'enemyAttack', name: parts[0], target: parts[1],
        value: parseInt(parts[2]) || 0, shielded: parts[3] === '1', delay }
    case 'say':
      return { type: 'log', name: '',
        text: '> ' + parts.join('\t'), color: '#B0BEC5', delay }
    case 'phase':
      return { type: 'phase', name: '',
        text: '── ' + parts.join('\t') + ' ──', color: '#ffb84d', delay }
    case 'ready':
      return { type: 'ready', name: '', delay }
    case 'pong':
      return { type: 'pong', name: '', delay }
    case 'warn':
      return { type: 'warn', name: '', text: parts.join('\t'), color: '#FF9800', delay }
  }
  return null
}

// Per-event delay budgets (ms). Used by both the legacy whole-stdout parser
// and the streaming consumer when it needs to space animations apart.
const ACTION_DELAY: Record<string, number> = {
  spawn: 500, move: 700, attack: 900, spell: 1100, shoot: 1000,
  heal: 900, defend: 600, shieldExpired: 0, enemyAttack: 900,
  say: 300, phase: 400, ready: 0, pong: 0, warn: 0,
}

export function parseTrace(stdout: string): TraceResult {
  const actions: TraceAction[] = []
  const charMap: Record<string, SpawnData> = {}
  const cleanLines: string[] = []
  const warnings: string[] = []
  const eventCounts: Record<string, number> = {}

  const spawnIdxRef = { current: 0 }
  let delay = 0
  let truncated = false

  const lines = stdout.split('\n')

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')
    if (!line.startsWith('##JQ\t') && !line.startsWith('##JQ ')) {
      if (line.length) cleanLines.push(line)
      continue
    }

    if (actions.length >= MAX_ACTIONS) { truncated = true; continue }

    const sep = line.includes('\t') ? '\t' : ' '
    const parts = line.split(sep)
    const type = parts[1]
    const rest = parts.slice(2)
    eventCounts[type] = (eventCounts[type] || 0) + 1

    if (type === 'warn') {
      warnings.push(rest.join(sep))
      continue
    }

    const action = eventToAction(type, rest, spawnIdxRef, delay)
    if (!action) { cleanLines.push(line); continue }

    if (action.type === 'spawn' && action.data) charMap[action.name] = action.data
    actions.push(action)
    delay += ACTION_DELAY[type] ?? 0
  }

  if (truncated) {
    warnings.push(`Trace truncated at ${MAX_ACTIONS} events (code likely loops too much).`)
  }

  return {
    actions,
    charMap,
    cleanStdout: cleanLines.join('\n'),
    warnings,
    eventCounts,
  }
}
