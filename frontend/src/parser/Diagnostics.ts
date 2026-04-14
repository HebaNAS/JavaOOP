// Diagnostics — compare student's source + compile result + emitted trace
// to surface friendly, learning-oriented tips when things ran but nothing
// visible happened. Every tip points to WHY and WHAT TO TRY next.

import type { ParseResult } from './JavaParser'
import type { TraceResult } from './TraceParser'

export interface Tip {
  severity: 'info' | 'hint' | 'warn'
  text: string
  color?: string
}

export interface DiagInput {
  code: string
  parsed: ParseResult
  trace: TraceResult
  compileSuccess: boolean
  stdoutNonTrace: string // cleanStdout from trace parse
}

// ── Helpers ──────────────────────────────────────────
const TIP_COLORS = {
  info: '#7ec8ff',
  hint: '#ffc857',
  warn: '#ff8c5a',
}

function has(code: string, re: RegExp): boolean {
  return re.test(code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))
}

// ── Friendly messages for common compile errors ─────
// Input is a single line like "Line 7: error: ';' expected"
export function humanizeCompileError(line: string): string | null {
  const raw = line.trim()
  if (!raw) return null

  const patterns: Array<[RegExp, string]> = [
    [/';' expected/i, "Missing semicolon — every Java statement ends with ;"],
    [/'\)' expected/i, "Unbalanced parentheses — check that every ( has a matching )"],
    [/'}' expected/i, "Missing closing brace — check that every { has a matching }"],
    [/cannot find symbol[\s\S]*variable (\w+)/i, "Unknown variable `$1` — did you declare it with a type, or misspell the name?"],
    [/cannot find symbol[\s\S]*method (\w+)/i, "Unknown method `$1` — is it spelled correctly? Defined in the right class?"],
    [/cannot find symbol[\s\S]*class (\w+)/i, "Unknown class `$1` — did you define it, or import it?"],
    [/incompatible types: (.+) cannot be converted to (.+)/i, "Type mismatch — you're assigning a $1 into a $2 slot. Check the declared type."],
    [/class, interface, or enum expected/i, "Something is outside any class. Wrap it in a class or move it into main()."],
    [/reached end of file while parsing/i, "The file ended before all braces closed — count your { and }."],
    [/illegal start of expression/i, "Java didn't expect what's there. Often a stray keyword, missing type, or misplaced statement."],
    [/variable (\w+) might not have been initialized/i, "`$1` was used before it got a value — assign it before reading."],
    [/non-static (.+) cannot be referenced from a static context/i, "You're using an instance member from a static method. Create an object first, then call methods on it."],
    [/(\w+) is abstract; cannot be instantiated/i, "`$1` is abstract — you can't `new` it directly. Create a subclass that implements its abstract methods."],
    [/missing return statement/i, "Non-void methods must return a value on every path. Add a `return` at the end."],
  ]

  for (const [re, msg] of patterns) {
    const m = raw.match(re)
    if (m) {
      const prefix = raw.match(/^Line \d+/) ? raw.split(':').slice(0, 1).join(':') + ': ' : ''
      return prefix + msg.replace(/\$1/g, m[1] || '').replace(/\$2/g, m[2] || '')
    }
  }
  return null
}

// ── Main diagnostic pass ────────────────────────────
export function diagnose(input: DiagInput): Tip[] {
  const tips: Tip[] = []
  const { code, parsed, trace, compileSuccess, stdoutNonTrace } = input
  const counts = trace.eventCounts

  // Pass any runtime warnings emitted by Arena helper
  for (const w of trace.warnings) {
    tips.push({ severity: 'warn', text: `🪧 Arena warning: ${w}`, color: TIP_COLORS.warn })
  }

  if (!compileSuccess) return tips // compile errors are handled separately

  // If student wrote objects but never summoned any, explain.
  const newExpr = /new\s+([A-Z]\w*)\s*\(/g
  const instantiatedTypes = new Set<string>()
  for (const m of code.matchAll(newExpr)) instantiatedTypes.add(m[1])
  const hasSummon = has(code, /\bArena\s*\.\s*summon\s*\(/)

  if (instantiatedTypes.size > 0 && !hasSummon && (counts.spawn ?? 0) === 0) {
    tips.push({
      severity: 'hint',
      color: TIP_COLORS.hint,
      text: `💡 You created ${[...instantiatedTypes].join(', ')} object${instantiatedTypes.size > 1 ? 's' : ''} but didn't put them on the arena. Add \`Arena.summon(yourObject);\` after \`new\` to see them appear.`,
    })
  }

  // Student called foo.attack(bar) but never Arena.attack — common
  // mid-progression pattern: they wrote the method, it mutated state, but
  // the 3D arena never got told.
  const sourceHasMethodCall = (name: string) => new RegExp(`\\w+\\s*\\.\\s*${name}\\s*\\(`).test(code)
  const sourceCallsArena = (name: string) => new RegExp(`Arena\\s*\\.\\s*${name}\\s*\\(`).test(code)

  const combatMap: Array<[string, string, string]> = [
    ['attack',   'attack',  '⚔️'],
    ['castSpell','cast',    '🔮'],
    ['shoot',    'shoot',   '🏹'],
    ['heal',     'heal',    '✨'],
    ['defend',   'defend',  '🛡️'],
  ]
  for (const [method, traceType, icon] of combatMap) {
    if (sourceHasMethodCall(method) && !sourceCallsArena(traceType) && (counts[traceType] ?? 0) === 0) {
      tips.push({
        severity: 'hint', color: TIP_COLORS.hint,
        text: `${icon} You call .${method}(...) on an object, but nothing happens in the arena. Your method changes data but the 3D world doesn't know. Try calling \`Arena.${traceType}(${method === 'defend' ? 'who' : 'who, target'});\` inside your method (or after it) so the animation plays.`,
      })
    }
  }

  // Method defined but never invoked
  for (const cls of parsed.classes) {
    for (const m of cls.methods) {
      if (['attack', 'castSpell', 'shoot', 'heal', 'defend'].includes(m.name)) {
        const everCalled = parsed.calls.some((c) => c.method === m.name)
        if (!everCalled) {
          tips.push({
            severity: 'info', color: TIP_COLORS.info,
            text: `ℹ️ You defined ${cls.name}.${m.name}() but never call it. Methods only run when invoked — try \`yourObj.${m.name}(...)\`.`,
          })
        }
      }
    }
  }

  // Attack method exists but doesn't modify target health (trivial body)
  const atkMethod = parsed.classes.flatMap((c) => c.methods).find((m) => m.name === 'attack')
  if (atkMethod) {
    const touchesHealth = has(code, /target\s*\.\s*(health|hp)/) || has(code, /Arena\s*\.\s*attack\s*\(/)
    if (!touchesHealth) {
      tips.push({
        severity: 'hint', color: TIP_COLORS.hint,
        text: "💡 Your attack() doesn't seem to reduce the target's health. Try: `target.health = target.health - this.attackPower;` or `Arena.attack(this, target);`",
      })
    }
  }

  // Compiled & ran but emitted nothing at all
  const totalTraceEvents = Object.values(counts).reduce((a, b) => a + b, 0)
  if (totalTraceEvents === 0) {
    tips.push({
      severity: 'hint', color: TIP_COLORS.hint,
      text: "💡 Your code ran but nothing happened on the arena. Call `Arena.summon(yourHero)` to place a character, then `Arena.attack(hero, enemy)` to fight!",
    })
  }

  // stdout exists but no trace — student is printing, not using Arena
  if (stdoutNonTrace.trim().length > 0 && totalTraceEvents === 0) {
    tips.push({
      severity: 'info', color: TIP_COLORS.info,
      text: "ℹ️ Your code printed to stdout but didn't drive any game action. `System.out.println` shows text; use `Arena.*` to make things happen in 3D.",
    })
  }

  // Attack on unknown target
  if (trace.warnings.some((w) => w.includes('attack called with null'))) {
    tips.push({
      severity: 'warn', color: TIP_COLORS.warn,
      text: "⚠️ You called Arena.attack(...) with a null object. Make sure both fighters were created with `new` before attacking.",
    })
  }

  return tips
}
