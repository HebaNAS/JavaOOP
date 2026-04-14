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
 */
function prepare(code: string): Prepared {
  const clean = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  // Case 1: already a full program
  if (/public\s+class\s+\w+/.test(clean) && /public\s+static\s+void\s+main/.test(clean)) {
    const cls = clean.match(/public\s+class\s+(\w+)/)![1]
    return { java: code, file: cls + '.java', cls, offset: 0 }
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

  out.push('    }')
  out.push('}')

  return { java: out.join('\n'), file: 'Main.java', cls: 'Main', offset }
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
