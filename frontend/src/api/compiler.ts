export interface CompileResult {
  success: boolean
  output: string
  errors: string
  executionTime: number
}

export async function compileCode(code: string, stdin?: string): Promise<CompileResult> {
  try {
    const res = await fetch('/api/compile', {
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
