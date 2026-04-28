// SessionClient — WebSocket bridge to the backend's long-running JVM session.
//
// One singleton per tab. start(code) compiles + spawns a JVM, then the JVM
// streams trace events as the student's compiled code runs. Keypress in the
// browser → invoke()/enemyAttack() → command flushed to JVM stdin → student's
// method body executes → ##JQ trace lines come back.
//
// On the wire (server-bound):
//   {type:'start',  code}
//   {type:'invoke', caller, method, arg?}
//   {type:'enemyAttack', attacker, target}
//   {type:'ping'}
//   {type:'end'}
// (client-bound):
//   {type:'session', id}
//   {type:'trace',   event, parts}    -- one ##JQ line, parsed
//   {type:'stdout',  text}            -- non-trace stdout (System.out.println)
//   {type:'stderr',  text}            -- JVM stderr (e.g. exceptions)
//   {type:'compile-error', errors}
//   {type:'error',   text}
//   {type:'ended',   reason}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const HEARTBEAT_MS = 25_000

function wsUrl(): string {
  if (API_BASE) {
    // Convert http(s):// → ws(s)://
    return API_BASE.replace(/^http/, 'ws') + '/api/session'
  }
  // Same host as page (vite proxy in dev)
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/api/session`
}

export type SessionEvent =
  | { type: 'session'; id: string }
  | { type: 'trace'; event: string; parts: string[] }
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'compile-error'; errors: string }
  | { type: 'error'; text: string }
  | { type: 'ended'; reason: string }

type Listener = (ev: SessionEvent) => void

class SessionClient {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private heartbeat: number | null = null
  private alive = false

  on(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** Open the WS, send {start}. Resolves when the connection is ready to
   *  send commands (NOT when main() finishes — trace events stream via on()). */
  start(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.end()
      const ws = new WebSocket(wsUrl())
      this.ws = ws

      ws.onopen = () => {
        this.alive = true
        ws.send(JSON.stringify({ type: 'start', code }))
        this.heartbeat = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
        }, HEARTBEAT_MS)
        resolve()
      }

      ws.onerror = () => {
        if (!this.alive) reject(new Error('Cannot reach session server'))
      }

      ws.onmessage = (m) => {
        let ev: SessionEvent
        try { ev = JSON.parse(m.data) } catch { return }
        this.listeners.forEach((fn) => {
          try { fn(ev) } catch (e) { console.error('SessionClient listener', e) }
        })
      }

      ws.onclose = () => {
        this.alive = false
        if (this.heartbeat != null) { clearInterval(this.heartbeat); this.heartbeat = null }
        if (this.ws === ws) this.ws = null
      }
    })
  }

  invoke(caller: string, method: string, arg?: string) {
    this.send({ type: 'invoke', caller, method, ...(arg != null ? { arg } : {}) })
  }

  enemyAttack(attacker: string, target: string) {
    this.send({ type: 'enemyAttack', attacker, target })
  }

  end() {
    if (this.heartbeat != null) { clearInterval(this.heartbeat); this.heartbeat = null }
    if (this.ws) {
      try { this.send({ type: 'end' }) } catch {}
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this.alive = false
  }

  /** True between a successful start() and the next end()/server close. */
  isAlive(): boolean {
    return this.alive && this.ws != null && this.ws.readyState === WebSocket.OPEN
  }

  private send(obj: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
    }
  }
}

export const session = new SessionClient()
