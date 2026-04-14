// TraceParser — parses ##JQ trace lines emitted by the Arena helper class
// into a GameAction[] stream the ActionExecutor can render.
//
// Protocol (tab-separated):
//   ##JQ\tspawn\t<name>\t<class>\t<hp>\t<atk>\t<mana>\t<def>\t<arrows>
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
  type: 'spawn' | 'move' | 'attack' | 'spell' | 'shoot' | 'heal' | 'defend' | 'log' | 'phase'
  name: string
  data?: SpawnData
  target?: string
  col?: number
  row?: number
  text?: string
  color?: string
  value?: number
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

export function parseTrace(stdout: string): TraceResult {
  const actions: TraceAction[] = []
  const charMap: Record<string, SpawnData> = {}
  const cleanLines: string[] = []
  const warnings: string[] = []
  const eventCounts: Record<string, number> = {}

  let spawnIdx = 0
  // How many spawn events we've emitted (used for initial staggered delay)
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

    // Allow either tab or single-space separator (defensive)
    const sep = line.includes('\t') ? '\t' : ' '
    const parts = line.split(sep)
    const type = parts[1]
    const rest = parts.slice(2)
    eventCounts[type] = (eventCounts[type] || 0) + 1

    switch (type) {
      case 'spawn': {
        const [name, cls, hpS, atkS, manaS, defS, arrowsS] = rest
        const hp = parseInt(hpS) || 100
        const atk = parseInt(atkS) || 15
        // Alternate left/right spawn points so two parties face off
        const sp = spawnIdx % 2 === 0
          ? SPAWNS_LEFT[Math.floor(spawnIdx / 2) % SPAWNS_LEFT.length]
          : SPAWNS_RIGHT[Math.floor(spawnIdx / 2) % SPAWNS_RIGHT.length]
        spawnIdx++
        const data: SpawnData = {
          className: cls || 'Warrior',
          col: sp.c, row: sp.r,
          hp, maxHp: hp, atk,
          mana: parseInt(manaS) || 0,
          def: parseInt(defS) || 0,
          arrows: parseInt(arrowsS) || 0,
          nameStr: name,
          methods: [],
        }
        charMap[name] = data
        actions.push({ type: 'spawn', name, data, delay })
        delay += 500
        break
      }
      case 'move': {
        const [name, colS, rowS] = rest
        actions.push({
          type: 'move', name,
          col: parseInt(colS), row: parseInt(rowS),
          delay,
        })
        delay += 700
        break
      }
      case 'attack': {
        const [attacker, target, dmgS] = rest
        actions.push({
          type: 'attack', name: attacker, target,
          value: parseInt(dmgS) || 0,
          delay,
        })
        delay += 900
        break
      }
      case 'spell': {
        const [caster, target, dmgS] = rest
        actions.push({
          type: 'spell', name: caster, target,
          value: parseInt(dmgS) || 0,
          delay,
        })
        delay += 1100
        break
      }
      case 'shoot': {
        const [archer, target, dmgS] = rest
        actions.push({
          type: 'shoot', name: archer, target,
          value: parseInt(dmgS) || 0,
          delay,
        })
        delay += 1000
        break
      }
      case 'heal': {
        const [healer, target, amtS] = rest
        actions.push({
          type: 'heal', name: healer, target,
          value: parseInt(amtS) || 0,
          delay,
        })
        delay += 900
        break
      }
      case 'defend': {
        const [name] = rest
        actions.push({ type: 'defend', name, delay })
        delay += 600
        break
      }
      case 'say': {
        actions.push({
          type: 'log', name: '',
          text: '> ' + rest.join(sep),
          color: '#B0BEC5', delay,
        })
        delay += 300
        break
      }
      case 'phase': {
        actions.push({
          type: 'phase', name: '',
          text: '── ' + rest.join(sep) + ' ──',
          color: '#ffb84d', delay,
        })
        delay += 400
        break
      }
      case 'warn': {
        warnings.push(rest.join(sep))
        break
      }
      default:
        // Unknown trace type — keep it visible but don't animate
        cleanLines.push(line)
    }
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
