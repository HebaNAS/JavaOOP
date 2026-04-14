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
  /**
   * 0-based chapter index for the Arena flow. Used to gate tips behind
   * the concepts that have been taught so far:
   *   ch 0 (Classes & Attributes) — declaring only, no objects/methods
   *   ch 1 (Constructors)          — parameters, `this`
   *   ch 2 (Objects)               — `new` keyword first introduced
   *   ch 3 (Methods)               — attack/defend first introduced
   *   ch 4+ (Encapsulation, inheritance, polymorphism, collections, ...)
   * Omit (or pass -1) to disable chapter gating (e.g. for unit exercises).
   */
  chapterIndex?: number
}

// Minimum chapter at which each tip-kind becomes pedagogically appropriate.
// Use the index of the chapter that FIRST INTRODUCES the concept.
const MIN_CHAPTER = {
  objectsRequired: 2,     // `new` is introduced in chapter 3
  methodsRequired: 3,     // calling methods on objects is chapter 4
  attackBehavior:  3,     // attack method body is chapter 4
  methodUnused:    3,     // "defined but never called" only matters after methods are taught
} as const

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

export interface HumanizedError {
  line?: number           // original source line number if known
  friendly: string        // plain-language explanation
  raw: string             // full raw block (for power users / folding)
}

const PATTERNS: Array<[RegExp, string]> = [
  [/';' expected/i, "Missing semicolon — every Java statement ends with ;"],
  [/'\)' expected/i, "Unbalanced parentheses — check that every ( has a matching )"],
  [/'\(' expected/i, "Missing open parenthesis — methods need `(` after the name"],
  [/'}' expected/i, "Missing closing brace — check that every { has a matching }"],
  [/'\{' expected/i, "Missing open brace after your declaration"],
  [/cannot find symbol\b.*variable (\w+)/is, "Unknown variable `$1` — did you declare it with a type, or misspell the name?"],
  [/cannot find symbol\b.*method (\w+)/is, "Unknown method `$1` — spelled correctly? Defined in the right class?"],
  [/cannot find symbol\b.*class (\w+)/is, "Unknown class `$1` — did you define it, or forget an import?"],
  [/cannot find symbol\b.*constructor (\w+)/is, "No constructor matches — check the argument types you passed to `new $1(...)`."],
  [/cannot find symbol\b/is, "Java doesn't know what that name refers to. Check spelling, or declare it with a type first."],
  [/incompatible types: (.+?) cannot be converted to (.+?)(?:\s|$)/is, "Type mismatch — you're assigning a `$1` where a `$2` is expected."],
  [/class, interface, or enum expected/i, "Something is outside any class. Wrap it in a class or move it into main()."],
  [/reached end of file while parsing/i, "File ended before all braces closed — count your { and }."],
  [/illegal start of expression/i, "Java didn't expect what's there. Often a stray keyword, missing type, or misplaced statement."],
  [/illegal start of type/i, "Expected a type here — did you misspell int/String/void?"],
  [/variable (\w+) might not have been initialized/i, "`$1` was used before it got a value — assign it before reading."],
  [/variable (\w+) is already defined/i, "`$1` is declared twice in the same scope. Rename one or remove the duplicate."],
  [/non-static (\S+) cannot be referenced from a static context/i, "You're using an instance member ($1) from a static method. Create an object first, then call methods on it."],
  [/(\w+) is abstract; cannot be instantiated/i, "`$1` is abstract — you can't `new` it directly. Create a subclass that implements its abstract methods."],
  [/missing return statement/i, "Non-void methods must return a value on every path. Add a `return` at the end."],
  [/unreported exception (\S+); must be caught or declared to be thrown/i, "The operation can throw `$1`. Wrap it in try/catch, or add `throws $1` to the method signature."],
  [/has private access/i, "You're trying to access a private field or method from outside its class. Use a public getter, or make it package-private."],
  [/method (\w+) in class (\w+) cannot be applied to given types/i, "Argument mismatch calling `$2.$1(...)` — the parameter types don't match the method's signature."],
  [/array required, but (\S+) found/i, "Expected an array but got `$1`. Use `[ ]` only on arrays/Lists."],
  [/bad operand types for binary operator/i, "The operator doesn't work on those types. You can't, e.g., `+` a String to a Warrior."],
  [/unclosed string literal/i, "Unclosed string — add the matching `\"` before the line ends."],
  [/not a statement/i, "This line looks like an expression, not a complete statement. Did you mean to assign it to something, or use a comparison?"],
]

function humanizeOne(body: string): string | null {
  const compact = body.replace(/\s+/g, ' ').trim()
  for (const [re, msg] of PATTERNS) {
    const m = compact.match(re)
    if (m) return msg.replace(/\$(\d)/g, (_, n) => m[Number(n)] || '')
  }
  return null
}

/**
 * Group a javac stderr blob into one HumanizedError per diagnostic.
 *
 * A typical block looks like:
 *   Line 20: error: cannot find symbol
 *           this.y -= 1;
 *               ^
 *     symbol:   variable y
 *     location: class Warrior
 *
 * We collapse all of that into a single friendly message.
 */
export function humanizeCompileBlock(stderr: string): HumanizedError[] {
  const lines = stderr.split('\n')
  const blocks: HumanizedError[] = []
  let cur: string[] = []
  let curLine: number | undefined

  const flush = () => {
    if (!cur.length) return
    const raw = cur.join('\n').trim()
    const friendly = humanizeOne(raw) || raw
    blocks.push({ line: curLine, friendly, raw })
    cur = []
    curLine = undefined
  }

  for (const ln of lines) {
    const headerMatch = ln.match(/^(?:Line (\d+)|.+?\.java:(\d+)):\s*error:/)
    if (headerMatch) {
      flush()
      const n = parseInt(headerMatch[1] || headerMatch[2])
      curLine = isNaN(n) ? undefined : n
      cur.push(ln)
    } else if (cur.length) {
      // Detail / caret / code / symbol / location lines attach to current block.
      cur.push(ln)
    } else if (/^\d+ errors?$/.test(ln.trim())) {
      // Skip javac summary line.
    }
  }
  flush()
  return blocks
}

/** Backwards-compatible single-line form (kept so existing imports work). */
export function humanizeCompileError(line: string): string | null {
  const hit = humanizeOne(line.trim())
  if (!hit) return null
  const prefix = line.match(/^Line \d+/)
  return prefix ? `${prefix[0]}: ${hit}` : hit
}

// ── Main diagnostic pass ────────────────────────────
export function diagnose(input: DiagInput): Tip[] {
  const tips: Tip[] = []
  const { code, parsed, trace, compileSuccess, stdoutNonTrace } = input
  const counts = trace.eventCounts
  const ch = input.chapterIndex ?? Infinity  // undefined = no gating (units)
  const gate = (min: number) => ch === Infinity || ch >= min

  // Runtime warnings from the Arena helper — always relevant
  for (const w of trace.warnings) {
    tips.push({ severity: 'warn', text: `🪧 Arena: ${w}`, color: TIP_COLORS.warn })
  }

  if (!compileSuccess) return tips // compile errors are handled separately

  const newExpr = /new\s+([A-Z]\w*)\s*\(/g
  const instantiatedTypes = new Set<string>()
  for (const m of code.matchAll(newExpr)) instantiatedTypes.add(m[1])

  // "method defined but never called" — only once methods are taught
  if (gate(MIN_CHAPTER.methodUnused)) {
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
  }

  // "attack doesn't reduce health" — only after attack() is taught
  if (gate(MIN_CHAPTER.attackBehavior)) {
    const atkMethod = parsed.classes.flatMap((c) => c.methods).find((m) => m.name === 'attack')
    if (atkMethod) {
      const decrementsHealth =
        /\b\w+\s*\.\s*(?:health|hp)\s*(?:-=|=\s*[\w.]+\s*\.\s*(?:health|hp)\s*-|--)/.test(code)
      if (!decrementsHealth) {
        tips.push({
          severity: 'hint', color: TIP_COLORS.hint,
          text: "💡 Your attack() doesn't seem to reduce the target's health. The classic pattern is `target.health -= this.attackPower;` (shorthand for subtract-and-assign).",
        })
      }
    }
  }

  // "nothing ran in the arena" — only suggest creating objects once
  // `new` has been introduced, and only suggest method calls once methods
  // have been introduced.
  const totalTraceEvents = Object.values(counts).reduce((a, b) => a + b, 0)
  if (totalTraceEvents === 0) {
    if (instantiatedTypes.size === 0 && gate(MIN_CHAPTER.objectsRequired)) {
      tips.push({
        severity: 'hint', color: TIP_COLORS.hint,
        text: "💡 You defined classes but never created any objects. Use `new` to make one: `Warrior hero = new Warrior(\"Aldric\", 100, 25);`",
      })
    } else if (
      instantiatedTypes.size > 0
      && parsed.calls.filter((c) => c.obj !== '__sysout__').length === 0
      && gate(MIN_CHAPTER.methodsRequired)
    ) {
      tips.push({
        severity: 'hint', color: TIP_COLORS.hint,
        text: "💡 Your object was created but you haven't called any methods on it yet. Try `hero.attack(enemy);` to see something happen.",
      })
    }
  }

  return tips
}
