export interface CompileResult {
  success: boolean
  output: string
  errors: string
  executionTime: number
}

// In dev, Vite proxies /api/* to the backend (see vite.config.ts).
// In production (Netlify), set VITE_API_BASE to the public URL of your
// backend (e.g. https://your-backend.fly.dev) at build time.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export async function compileCode(code: string, stdin?: string): Promise<CompileResult> {
  try {
    const res = await fetch(`${API_BASE}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, stdin }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }))
      return { success: false, output: '', errors: err.error || `Server error (${res.status})`, executionTime: 0 }
    }
    return res.json()
  } catch (e: any) {
    return { success: false, output: '', errors: 'Cannot reach compilation server. Is the backend running?', executionTime: 0 }
  }
}
