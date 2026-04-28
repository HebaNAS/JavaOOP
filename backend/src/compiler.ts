import { execFile } from 'node:child_process'
import { writeFile, mkdir, rm, readFile, copyFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

// Helper Java sources shipped alongside this module.
const HELPERS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'helpers')

// Pre-compile Arena.class ONCE at server startup. Every /api/compile
// request then copies the precompiled class into its temp dir, so per-
// request javac only needs to compile the student's file. This roughly
// halves compile time on small cloud containers.
let ARENA_CLASS_PATH: string | null = null
let arenaPrepPromise: Promise<string> | null = null

export async function prepareArena(): Promise<string> {
  if (ARENA_CLASS_PATH) return ARENA_CLASS_PATH
  if (arenaPrepPromise) return arenaPrepPromise
  arenaPrepPromise = (async () => {
    const cacheDir = join(tmpdir(), 'jq-arena-cache')
    await mkdir(cacheDir, { recursive: true })
    const src = join(cacheDir, 'Arena.java')
    const cls = join(cacheDir, 'Arena.class')
    await copyFile(join(HELPERS_DIR, 'Arena.java'), src)
    // Skip if already compiled and up-to-date (survives warm restarts).
    try {
      const [ss, sc] = await Promise.all([stat(src), stat(cls)])
      if (sc.mtimeMs >= ss.mtimeMs) {
        ARENA_CLASS_PATH = cls
        return cls
      }
    } catch { /* class missing — compile */ }
    await new Promise<void>((resolve, reject) => {
      execFile('javac', ['Arena.java'], { cwd: cacheDir, timeout: 60_000 }, (err, _out, stderr) => {
        if (err) reject(new Error('Failed to precompile Arena.java: ' + (stderr || err.message)))
        else resolve()
      })
    })
    ARENA_CLASS_PATH = cls
    return cls
  })()
  return arenaPrepPromise
}

// ── Types ──────────────────────────────────────────

export interface CompileResult {
  success: boolean
  output: string
  errors: string
  executionTime: number
}

// ── Constants ──────────────────────────────────────

const RUN_TIMEOUT_MS = 5_000       // student code execution
const COMPILE_TIMEOUT_MS = 30_000  // javac itself is slow on small containers
const MAX_OUTPUT = 50_000

// ── Java availability check ────────────────────────

export function checkJava(): Promise<{ ok: boolean; version: string }> {
  return new Promise((resolve) => {
    execFile('javac', ['-version'], { timeout: 5_000 }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, version: '' })
      resolve({ ok: true, version: (stderr || stdout).trim() })
    })
  })
}

// ── Shell helper ───────────────────────────────────

function exec(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout?: number; stdin?: string },
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = execFile(
      cmd,
      args,
      { cwd: opts.cwd, timeout: opts.timeout ?? RUN_TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          stdout: (stdout ?? '').slice(0, MAX_OUTPUT),
          stderr: (stderr ?? '').slice(0, MAX_OUTPUT),
          exitCode: err ? 1 : 0,
          timedOut: !!(err && (err as any).killed),
        })
      },
    )
    if (opts.stdin && child.stdin) {
      child.stdin.write(opts.stdin)
      child.stdin.end()
    }
  })
}

// ── Code preparation (auto-wrapping) ───────────────

interface Prepared {
  java: string
  file: string
  cls: string
  offset: number // lines added before student statements in main()
}

/** Collect lines from `start` until braces balance. */
function braceBlock(lines: string[], start: number): { text: string; end: number } {
  let depth = 0, opened = false
  const buf: string[] = []
  let i = start
  while (i < lines.length) {
    buf.push(lines[i])
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; opened = true }
      if (ch === '}') depth--
    }
    i++
    if (opened && depth <= 0) break
  }
  return { text: buf.join('\n'), end: i }
}

/** Heuristic: is this line the start of a standalone method definition? */
function isMethodStart(line: string): boolean {
  const t = line.trim()
  const hasSignature =
    /^(public\s+|private\s+|protected\s+)*(static\s+)?(void|int|double|float|boolean|String|char|long|short|byte|[A-Z]\w*)(\[\])?\s+[a-zA-Z]\w*\s*\(/.test(t)
  if (!hasSignature) return false
  if (t.endsWith(';')) return false
  if (t.includes(' new ')) return false
  if (t.includes(' = ')) return false
  if (/^\w+\.\w+/.test(t)) return false
  return true
}

/** Heuristic: is this line the start of a class/interface/enum? */
function isClassStart(line: string): boolean {
  return /^(public\s+)?(abstract\s+)?(class|interface|enum)\s+\w+/.test(line.trim())
}

// ── Automatic instrumentation ──────────────────────
//
// Students write pure OOP (no mention of Arena). The backend silently
// injects Arena.<action>(this, ...) calls at the end of methods whose
// names match a known registry, and Arena.summon(this) at the end of
// every constructor body. This lets the game animate from real student
// code without requiring the student to learn a helper API.
//
// Design notes:
// - Injection is at the LAST closing brace of the method/ctor body,
//   so the student's logic runs first (including any super calls), then
//   the animation fires once.
// - Arena methods are idempotent within a short time window, so a
//   super.attack() chain that causes two injections only emits once.
// - This is regex-based and intentionally only matches beginner-level
//   Java shapes. Pathological code (single-line multi-method, macro-like
//   preprocessing) is out of scope.

interface ParamInfo { type: string; name: string }

function parseParams(s: string): ParamInfo[] {
  const clean = s.trim()
  if (!clean) return []
  return clean.split(',').map((p) => {
    const parts = p.trim().split(/\s+/)
    return { type: parts.slice(0, -1).join(' '), name: parts[parts.length - 1] }
  }).filter((p) => p.name)
}

interface Injection {
  // Spliced right after the method's opening `{`. Empty when no snapshot is
  // needed (constructors).
  prefix: string
  // Spliced before the method's closing `}`. Reads __jq_pre established by
  // the prefix so Arena can compute the delta the body actually produced.
  suffix: string
  // Fallback used when the prefix can't be inserted (e.g. weird brace
  // placement). Same call shape as the pre-snapshot/delta code.
  legacy: string
}

function methodInjection(name: string, params: ParamInfo[]): Injection | null {
  const p0 = params[0]?.name
  const p1 = params[1]?.name
  switch (name) {
    case 'attack':
      if (!p0) return null
      return {
        prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
        suffix: `Arena.attack(this, ${p0}, __jq_pre);`,
        legacy: `Arena.attack(this, ${p0});`,
      }
    case 'castSpell':
      if (!p0) return null
      return {
        prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
        suffix: `Arena.cast(this, ${p0}, __jq_pre);`,
        legacy: `Arena.cast(this, ${p0});`,
      }
    case 'shoot':
      if (!p0) return null
      return {
        prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
        suffix: `Arena.shoot(this, ${p0}, __jq_pre);`,
        legacy: `Arena.shoot(this, ${p0});`,
      }
    case 'specialAbility':
    case 'specialMove':
      if (p0) return {
        prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
        suffix: `Arena.cast(this, ${p0}, __jq_pre);`,
        legacy: `Arena.cast(this, ${p0});`,
      }
      return {
        prefix: `boolean __jq_pre = Arena.snapshotShield(this);`,
        suffix: `Arena.defend(this, __jq_pre);`,
        legacy: `Arena.defend(this);`,
      }
    case 'defend':
      return {
        prefix: `boolean __jq_pre = Arena.snapshotShield(this);`,
        suffix: `Arena.defend(this, __jq_pre);`,
        legacy: `Arena.defend(this);`,
      }
    case 'heal': {
      // heal() / heal(amount) / heal(target) / heal(target, amount)
      if (params.length === 0) return {
        prefix: `int __jq_pre = Arena.snapshotHealth(this);`,
        suffix: `Arena.heal(this, this, __jq_pre);`,
        legacy: `Arena.heal(this, 10);`,
      }
      if (params.length === 1) {
        // Heuristic: int-ish name OR int type → amount-only self-heal.
        // Otherwise the param is the target object.
        const isSelfInt = params[0].type === 'int'
          || /^(amount|amt|hp|n|points|value)$/i.test(p0!)
        if (isSelfInt) return {
          prefix: `int __jq_pre = Arena.snapshotHealth(this);`,
          suffix: `Arena.heal(this, this, __jq_pre);`,
          legacy: `Arena.heal(this, ${p0});`,
        }
        return {
          prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
          suffix: `Arena.heal(this, ${p0}, __jq_pre);`,
          legacy: `Arena.heal(this, ${p0}, 20);`,
        }
      }
      return {
        prefix: `int __jq_pre = Arena.snapshotHealth(${p0});`,
        suffix: `Arena.heal(this, ${p0}, __jq_pre);`,
        legacy: `Arena.heal(this, ${p0}, ${p1});`,
      }
    }
    case 'moveUp': case 'moveDown': case 'moveLeft': case 'moveRight':
    case 'move':
      // Use reflective snapshots so classes WITHOUT x/y fields still compile
      // — e.g. Chapter 17's Vehicle/Car/Boat. When the field exists the
      // values match `this.x`/`this.y` exactly; when it doesn't they're 0,
      // so Arena.move sees pre==post and emits nothing.
      return {
        prefix: `int __jqx = Arena.snapshotInt(this, "x"); int __jqy = Arena.snapshotInt(this, "y");`,
        suffix: `Arena.move(this, Arena.snapshotInt(this, "x"), Arena.snapshotInt(this, "y"), __jqx, __jqy);`,
        legacy: `Arena.move(this, Arena.snapshotInt(this, "x"), Arena.snapshotInt(this, "y"));`,
      }
  }
  return null
}

/** Walk a class body, inject Arena.* prefix/suffix calls around method/ctor bodies. */
function instrumentClassBody(block: string): string {
  const firstBraceIdx = block.indexOf('{')
  if (firstBraceIdx < 0) return block
  const header = block.slice(0, firstBraceIdx + 1)
  const body = block.slice(firstBraceIdx + 1)

  const classNameMatch = header.match(/(?:class|interface|enum)\s+(\w+)/)
  if (!classNameMatch) return block
  const className = classNameMatch[1]

  // Don't instrument interfaces (no bodies) or abstract methods
  if (/\binterface\s+\w+/.test(header)) return block

  const lines = body.split('\n')
  const out: string[] = []
  let depth = 1 // opening brace already consumed into `header`

  // Pending method/ctor body. `prefix` is spliced after the opening `{`,
  // `suffix` before the closing `}`. If the prefix can't be inserted (e.g.
  // the `{` is on a later line we never see — pathological), we fall back
  // to `legacy` which has the older, snapshot-less call signature.
  let pending: {
    prefix: string
    suffix: string
    legacy: string
    targetDepth: number
    prefixInjected: boolean
    onSigLine: boolean   // first iteration after the signature is matched
  } | null = null

  const methodSig =
    /^\s*(?:@\w+\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(\w[\w<>\[\],\s]*?\s+)(\w+)\s*\(([^)]*)\)/
  const ctorSig = new RegExp(
    `^\\s*(?:public\\s+|private\\s+|protected\\s+)?${className}\\s*\\(([^)]*)\\)`,
  )

  for (const line of lines) {
    let outLine = line

    // Count braces from the ORIGINAL line — depth tracking must be stable
    // even after we splice prefix/suffix code (which never adds braces).
    const opens = (line.match(/\{/g) || []).length
    const closes = (line.match(/\}/g) || []).length
    const depthAfter = depth + opens - closes

    // Detect a NEW method/ctor start at class-body depth.
    if (!pending && depth === 1) {
      const ctor = line.match(ctorSig)
      const meth = !ctor && line.match(methodSig)
      if (ctor) {
        // Constructors don't need a snapshot — `Arena.summon(this)` reads
        // current field values directly. Mark prefix as already injected.
        pending = {
          prefix: '',
          suffix: 'Arena.summon(this);',
          legacy: 'Arena.summon(this);',
          targetDepth: depth,
          prefixInjected: true,
          onSigLine: true,
        }
      } else if (meth) {
        const name = meth[2]
        const isAbstract = /\babstract\b/.test(meth[0])
          || (!line.includes('{') && line.trim().endsWith(';'))
        if (!isAbstract) {
          const params = parseParams(meth[3])
          const inj = methodInjection(name, params)
          if (inj) {
            pending = {
              prefix: inj.prefix,
              suffix: inj.suffix,
              legacy: inj.legacy,
              targetDepth: depth,
              prefixInjected: !inj.prefix,   // empty prefix → nothing to inject
              onSigLine: true,
            }
          }
        }
      }
    }

    // Splice prefix right after the method's opening `{`. On the signature
    // line that `{` lives after the parameter list's `)`; on later lines
    // (defensive students who put `{` on its own line) it's the first `{`.
    if (pending && !pending.prefixInjected && opens > 0) {
      let braceIdx: number
      if (pending.onSigLine) {
        const parenIdx = outLine.indexOf(')')
        braceIdx = outLine.indexOf('{', parenIdx >= 0 ? parenIdx : 0)
      } else {
        braceIdx = outLine.indexOf('{')
      }
      if (braceIdx >= 0) {
        outLine =
          outLine.slice(0, braceIdx + 1)
          + `\n        ${pending.prefix}`
          + outLine.slice(braceIdx + 1)
        pending.prefixInjected = true
      }
    }
    if (pending) pending.onSigLine = false

    // Splice suffix before the closing `}` that ends the method body.
    if (pending && closes > 0 && depthAfter <= pending.targetDepth) {
      const lastClose = outLine.lastIndexOf('}')
      if (lastClose >= 0) {
        const inj = pending.prefixInjected ? pending.suffix : pending.legacy
        outLine =
          outLine.slice(0, lastClose)
          + `\n        ${inj}\n    `
          + outLine.slice(lastClose)
      }
      pending = null
    }

    out.push(outLine)
    depth = depthAfter
  }

  return header + out.join('\n')
}

/**
 * Analyse student code and prepare a compilable Java file.
 *
 * Cases:
 *  1. Full program (has public class + main) → compile as-is.
 *  2. Mix of classes + loose statements → classes go top-level,
 *     statements go inside a generated Main.main().
 *  3. Pure statements (Units 2-5) → everything in Main.main().
 *  4. Methods + statements (Unit 6) → methods become static in Main,
 *     statements in main().
 *
 * `interactive` appends Arena.repl() at the end of main(), which blocks
 * reading stdin so the JVM stays alive for keypress dispatch. One-shot
 * compile (POST /api/compile) leaves it off so the process exits.
 */
function prepare(code: string, opts: { interactive?: boolean } = {}): Prepared {
  const interactive = !!opts.interactive
  const clean = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  // Case 1: already a full program — instrument classes inside it too
  if (/public\s+class\s+\w+/.test(clean) && /public\s+static\s+void\s+main/.test(clean)) {
    const cls = clean.match(/public\s+class\s+(\w+)/)![1]
    let instrumented = code.replace(
      /((?:public\s+|abstract\s+)?(?:class|interface|enum)\s+\w+[^{]*\{[\s\S]*?^\})/gm,
      (block) => instrumentClassBody(block),
    )
    if (interactive) instrumented = injectReplIntoMain(instrumented)
    return { java: instrumented, file: cls + '.java', cls, offset: 0 }
  }

  // Parse into segments
  const lines = code.split('\n')
  const imports: string[] = []
  const classes: string[] = []
  const methods: string[] = []
  const stmts: string[] = []
  let i = 0

  while (i < lines.length) {
    const t = lines[i].trim()

    // Blank / single-line comments → keep as statements to preserve spacing
    if (!t || t.startsWith('//')) {
      stmts.push(lines[i])
      i++
      continue
    }

    // Import
    if (t.startsWith('import ')) {
      imports.push(lines[i])
      i++
      continue
    }

    // Package — skip (we compile in a flat temp dir)
    if (t.startsWith('package ')) {
      i++
      continue
    }

    // Class / interface / enum
    if (isClassStart(t)) {
      const b = braceBlock(lines, i)
      let block = b.text
      // Strip 'public' to avoid multiple-public-class error in the wrapper file
      if (/^\s*public\s+(abstract\s+)?(class|interface|enum)/.test(block)) {
        block = block.replace(/^(\s*)public\s+/, '$1')
      }
      // Auto-inject Arena trace calls so students never see the helper
      block = instrumentClassBody(block)
      classes.push(block)
      i = b.end
      continue
    }

    // Standalone method definition (outside any class)
    if (isMethodStart(lines[i])) {
      const b = braceBlock(lines, i)
      let m = b.text
      // Ensure static so it's callable from static main()
      if (!/\bstatic\b/.test(m.split('\n')[0])) {
        const first = m.split('\n')[0]
        const rest = m.split('\n').slice(1).join('\n')
        const patched = first.replace(
          /^(\s*)(public\s+|private\s+|protected\s+)?/,
          '$1public static ',
        )
        m = patched + (rest ? '\n' + rest : '')
      }
      methods.push(m)
      i = b.end
      continue
    }

    // Everything else is a statement
    stmts.push(lines[i])
    i++
  }

  // ── Assemble the compilable file ──
  const out: string[] = []

  // Standard imports (covers Scanner, ArrayList, HashMap, etc.)
  out.push('import java.util.*;')
  out.push('import java.io.*;')
  for (const imp of imports) {
    if (!imp.includes('java.util.*') && !imp.includes('java.io.*')) out.push(imp)
  }
  out.push('')

  // Student class/interface/enum definitions (top-level, outside Main)
  for (const c of classes) {
    out.push(c)
    out.push('')
  }

  // Main class
  out.push('public class Main {')

  // Method definitions (as static methods inside Main)
  for (const m of methods) {
    for (const l of m.split('\n')) out.push('    ' + l)
    out.push('')
  }

  // main()
  out.push('    public static void main(String[] args) {')
  const offset = out.length // 1-based line number where student statements begin

  for (const s of stmts) out.push('        ' + s)

  if (interactive) out.push('        Arena.repl();')

  out.push('    }')
  out.push('}')

  return { java: out.join('\n'), file: 'Main.java', cls: 'Main', offset }
}

/** Inject Arena.repl() before the closing `}` of main() in a full program.
 *  Walks the source counting braces; injects when main()'s body brace returns
 *  to depth 0 relative to its opening. */
function injectReplIntoMain(source: string): string {
  const re = /public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/
  const m = re.exec(source)
  if (!m) return source
  const start = m.index + m[0].length
  let depth = 1
  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return source.slice(0, i) + '\n        Arena.repl();\n    ' + source.slice(i)
      }
    }
  }
  return source
}

// ── Error message cleanup ──────────────────────────

function fixErrors(raw: string, offset: number, fileName: string): string {
  const esc = fileName.replace(/\./g, '\\.')
  // Replace "FileName.java:LINE" with "Line N" (adjusted for wrapper offset)
  return raw.replace(new RegExp(`${esc}:(\\d+)`, 'g'), (_, n) => {
    const line = offset > 0 ? Math.max(1, parseInt(n) - offset) : parseInt(n)
    return `Line ${line}`
  })
}

// ── Public API ─────────────────────────────────────

/**
 * Compile student code for an interactive REPL session. Writes the prepared
 * source + Arena.class into a temp dir, runs javac, and returns either the
 * directory + entry-class for the session manager to spawn, or compile errors.
 */
export interface SessionCompileResult {
  success: boolean
  errors: string
  /** Absolute temp dir containing Main.class + Arena.class. Only present on success. */
  dir?: string
  /** Class name to launch with `java -cp <dir> <cls>`. */
  cls?: string
  /** Wrapper offset for translating javac line numbers back to student lines. */
  offset?: number
  fileName?: string
}

export async function compileForSession(code: string): Promise<SessionCompileResult> {
  const dir = join(tmpdir(), 'jq-sess-' + crypto.randomUUID())
  await mkdir(dir, { recursive: true })

  const p = prepare(code, { interactive: true })
  await writeFile(join(dir, p.file), p.java)
  const arenaCls = await prepareArena()
  await copyFile(arenaCls, join(dir, 'Arena.class'))

  const comp = await exec('javac', ['-cp', dir, p.file], {
    cwd: dir, timeout: COMPILE_TIMEOUT_MS,
  })
  if (comp.exitCode !== 0) {
    rm(dir, { recursive: true, force: true }).catch(() => {})
    const msg = comp.timedOut
      ? `Compiler timed out after ${COMPILE_TIMEOUT_MS / 1000}s.`
      : (comp.stderr || 'Compilation failed with no output.')
    return { success: false, errors: fixErrors(msg, p.offset, p.file) }
  }
  return { success: true, errors: '', dir, cls: p.cls, offset: p.offset, fileName: p.file }
}

export async function compileAndRun(code: string, stdin?: string): Promise<CompileResult> {
  const dir = join(tmpdir(), 'jq-' + crypto.randomUUID())
  await mkdir(dir, { recursive: true })
  const t0 = Date.now()

  try {
    const p = prepare(code)
    await writeFile(join(dir, p.file), p.java)
    // Drop the precompiled Arena.class into the temp dir so student code
    // linking against `Arena.*` resolves without recompiling it each time.
    const arenaCls = await prepareArena()
    await copyFile(arenaCls, join(dir, 'Arena.class'))

    // Step 1: Compile the student's file only. Small free-tier containers
    // can take 10+ seconds for a cold javac — it gets a generous timeout;
    // the student's program is held to the tight RUN_TIMEOUT_MS.
    const comp = await exec('javac', ['-cp', dir, p.file], {
      cwd: dir, timeout: COMPILE_TIMEOUT_MS,
    })
    if (comp.exitCode !== 0) {
      const msg = comp.timedOut
        ? `Compiler timed out after ${COMPILE_TIMEOUT_MS / 1000}s. This usually means the server is under heavy load — try again in a moment.`
        : (comp.stderr || 'Compilation failed with no output. Check the server logs.')
      return {
        success: false,
        output: '',
        errors: fixErrors(msg, p.offset, p.file),
        executionTime: Date.now() - t0,
      }
    }

    // Step 2: Execute with java (student's program — kept short)
    const run = await exec('java', ['-cp', dir, p.cls], {
      cwd: dir,
      timeout: RUN_TIMEOUT_MS,
      stdin,
    })

    if (run.timedOut) {
      return {
        success: false,
        output: run.stdout,
        errors: 'Time limit exceeded (5s). Check for infinite loops.',
        executionTime: Date.now() - t0,
      }
    }

    return {
      success: run.exitCode === 0,
      output: run.stdout,
      errors: run.stderr ? fixErrors(run.stderr, p.offset, p.file) : '',
      executionTime: Date.now() - t0,
    }
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
