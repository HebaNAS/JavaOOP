// sessionServer — long-running JVM sessions over WebSocket.
//
// Each connection owns one JVM process. The student's compiled code runs
// main() (which sets up objects + populates Arena.REGISTRY), then enters
// Arena.repl() which blocks reading stdin. Browser keypresses arrive as
// {invoke,...} / {enemyAttack,...} messages → written to the JVM's stdin
// → student's compiled methods execute → ##JQ trace lines stream back out.
//
// On chapter switch, second Run, tab close, or 60s of inactivity, the JVM
// is killed and the temp dir cleaned up.

import { ChildProcess, spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { Server as HttpServer } from 'node:http'
import crypto from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { compileForSession } from './compiler.js'

const MAX_SESSIONS = 2
const IDLE_MS = 60_000
const HEARTBEAT_SWEEP_MS = 10_000

interface Session {
  id: string
  jvm: ChildProcess
  ws: WebSocket
  tmpDir: string
  lastActivity: number
  ended: boolean
}

const SESSIONS = new Map<string, Session>()

// JVM startup args — minimise heap and JIT so a free-tier dyno can host two.
const JVM_ARGS = [
  '-Xmx128m',
  '-Xss512k',
  '-XX:+UseSerialGC',
  '-XX:TieredStopAtLevel=1',
  '-Xshare:auto',
]

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function endSession(id: string, reason: string) {
  const s = SESSIONS.get(id)
  if (!s || s.ended) return
  s.ended = true
  SESSIONS.delete(id)
  try { s.jvm.kill('SIGKILL') } catch {}
  rm(s.tmpDir, { recursive: true, force: true }).catch(() => {})
  send(s.ws, { type: 'ended', reason })
  try { s.ws.close() } catch {}
}

function bumpActivity(s: Session) {
  s.lastActivity = Date.now()
}

/** Parse one ##JQ stdout line into an event for the browser. Returns null
 *  for non-trace lines so the caller can ship them as plain stdout. */
function parseTrace(line: string): { type: string; parts: string[] } | null {
  if (!line.startsWith('##JQ\t') && !line.startsWith('##JQ ')) return null
  const sep = line.includes('\t') ? '\t' : ' '
  const parts = line.split(sep)
  return { type: parts[1], parts: parts.slice(2) }
}

async function startSession(ws: WebSocket, code: string) {
  if (SESSIONS.size >= MAX_SESSIONS) {
    send(ws, { type: 'error', text: `server busy (${MAX_SESSIONS} concurrent sessions max)` })
    try { ws.close() } catch {}
    return
  }

  const compiled = await compileForSession(code)
  if (!compiled.success) {
    send(ws, { type: 'compile-error', errors: compiled.errors })
    try { ws.close() } catch {}
    return
  }

  const id = crypto.randomUUID()
  const jvm = spawn('java', [...JVM_ARGS, '-cp', compiled.dir!, compiled.cls!], {
    cwd: compiled.dir,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const session: Session = {
    id, jvm, ws,
    tmpDir: compiled.dir!,
    lastActivity: Date.now(),
    ended: false,
  }
  SESSIONS.set(id, session)

  // Buffer stdout line-by-line — Java emits one ##JQ per line.
  let stdoutBuf = ''
  jvm.stdout!.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString('utf8')
    let nl: number
    while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
      const line = stdoutBuf.slice(0, nl).replace(/\r$/, '')
      stdoutBuf = stdoutBuf.slice(nl + 1)
      if (!line) continue
      const trace = parseTrace(line)
      if (trace) send(ws, { type: 'trace', event: trace.type, parts: trace.parts })
      else send(ws, { type: 'stdout', text: line })
    }
  })

  let stderrBuf = ''
  jvm.stderr!.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString('utf8')
    let nl: number
    while ((nl = stderrBuf.indexOf('\n')) >= 0) {
      const line = stderrBuf.slice(0, nl).replace(/\r$/, '')
      stderrBuf = stderrBuf.slice(nl + 1)
      if (line) send(ws, { type: 'stderr', text: line })
    }
  })

  jvm.on('exit', (exitCode, signal) => {
    if (session.ended) return
    const reason = signal === 'SIGKILL' ? 'killed' : exitCode === 0 ? 'exited' : 'crashed'
    endSession(id, reason)
  })

  jvm.on('error', (err) => {
    send(ws, { type: 'stderr', text: 'JVM spawn error: ' + err.message })
    endSession(id, 'spawn-failed')
  })

  send(ws, { type: 'session', id })
}

function writeCommand(s: Session, parts: string[]) {
  if (s.ended || !s.jvm.stdin || s.jvm.stdin.destroyed) return
  s.jvm.stdin.write(parts.join('\t') + '\n')
  bumpActivity(s)
}

export function attachSessionServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/api/session' })

  wss.on('connection', (ws: WebSocket) => {
    let sessionId: string | null = null

    ws.on('message', async (raw) => {
      let msg: any
      try { msg = JSON.parse(raw.toString()) } catch {
        send(ws, { type: 'error', text: 'invalid JSON' })
        return
      }

      switch (msg?.type) {
        case 'start': {
          if (sessionId) {
            endSession(sessionId, 'restart')
            sessionId = null
          }
          if (typeof msg.code !== 'string' || msg.code.length > 50_000) {
            send(ws, { type: 'error', text: 'code missing or too long' })
            return
          }
          await startSession(ws, msg.code)
          // Find which session this WS owns (last one whose ws === ws)
          for (const [id, s] of SESSIONS) if (s.ws === ws) { sessionId = id; break }
          break
        }
        case 'invoke': {
          const s = sessionId && SESSIONS.get(sessionId)
          if (!s) { send(ws, { type: 'error', text: 'no active session' }); return }
          if (typeof msg.caller !== 'string' || typeof msg.method !== 'string') return
          const parts = ['invoke', msg.caller, msg.method]
          if (typeof msg.arg === 'string') parts.push(msg.arg)
          writeCommand(s, parts)
          break
        }
        case 'enemyAttack': {
          const s = sessionId && SESSIONS.get(sessionId)
          if (!s) return
          if (typeof msg.attacker !== 'string' || typeof msg.target !== 'string') return
          writeCommand(s, ['enemyAttack', msg.attacker, msg.target])
          break
        }
        case 'ping': {
          const s = sessionId && SESSIONS.get(sessionId)
          if (s) { writeCommand(s, ['ping']); }
          break
        }
        case 'end': {
          if (sessionId) { endSession(sessionId, 'client'); sessionId = null }
          break
        }
        default:
          send(ws, { type: 'error', text: 'unknown message type ' + msg?.type })
      }
    })

    ws.on('close', () => {
      if (sessionId) { endSession(sessionId, 'closed'); sessionId = null }
    })

    ws.on('error', () => {
      if (sessionId) { endSession(sessionId, 'ws-error'); sessionId = null }
    })
  })

  // Idle sweeper — kills JVMs whose owner stopped pinging. The browser sends
  // a ping every 25s so anything older than IDLE_MS is genuinely abandoned.
  setInterval(() => {
    const cutoff = Date.now() - IDLE_MS
    for (const [id, s] of SESSIONS) {
      if (s.lastActivity < cutoff) endSession(id, 'idle')
    }
  }, HEARTBEAT_SWEEP_MS).unref()

  // Process-exit safety: kill any lingering JVMs.
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      for (const id of SESSIONS.keys()) endSession(id, 'shutdown')
      process.exit(0)
    })
  }

  return wss
}
