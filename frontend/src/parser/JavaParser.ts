export interface ParsedClass {
  name: string
  parent: string | null
  attrs: { type: string; name: string; value: string | null; access: string }[]
  methods: { name: string; params: string; body: string; isAbstract: boolean; access: string }[]
  ctor: { params: string; body: string; fieldMap: Record<string, number>; paramNames: string[] } | null
  isAbstract: boolean
  getters: { method: string; field: string }[]
  setters: { method: string; field: string }[]
}

export interface ParsedObject {
  type: string
  name: string
  className: string
  args: string[]
}

export interface ParsedCall {
  obj: string
  method: string
  args: string
  isLoop?: boolean
  coll?: string
  iter?: string
}

export interface ParsedInterface {
  name: string
  methods: { name: string; params: string }[]
}

export interface ParseResult {
  classes: ParsedClass[]
  objects: ParsedObject[]
  calls: ParsedCall[]
  collections: { elemType: string; name: string }[]
  inheritance: Record<string, string>
  interfaces: ParsedInterface[]
  impls: Record<string, string[]>
  errors: string[]
}

export function parseJava(code: string): ParseResult {
  const R: ParseResult = {
    classes: [], objects: [], calls: [], collections: [],
    inheritance: {}, interfaces: [], impls: {}, errors: [],
  }

  try {
    const cl = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

    // Interfaces
    const ifRx = /interface\s+(\w+)\s*\{([\s\S]*?)\n\}/g
    let ifm
    while ((ifm = ifRx.exec(cl)) !== null) {
      const ifName = ifm[1], ifBody = ifm[2], ifMeths: { name: string; params: string }[] = []
      const imRx = /(?:public\s+)?(?:void|int|String|double|boolean)\s+(\w+)\s*\(([^)]*)\)\s*;/g
      let imm
      while ((imm = imRx.exec(ifBody)) !== null) {
        ifMeths.push({ name: imm[1], params: imm[2].trim() })
      }
      R.interfaces.push({ name: ifName, methods: ifMeths })
    }

    // Classes
    const clsRx = /(?:(abstract)\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{([\s\S]*?)\n\}/g
    let m
    while ((m = clsRx.exec(cl)) !== null) {
      const isAbstract = !!m[1], nm = m[2], par = m[3] || null, implStr = m[4] || '', body = m[5]
      const attrs: ParsedClass['attrs'] = []
      const meths: ParsedClass['methods'] = []

      if (implStr.trim()) {
        R.impls[nm] = implStr.split(',').map((s) => s.trim())
      }
      if (par) R.inheritance[nm] = par

      // Attributes
      const aRx = /(?:(private|protected|public)\s+)?(int|String|double|boolean|float)\s+(\w+)\s*(?:=\s*([^;]+))?\s*;/g
      let am
      while ((am = aRx.exec(body)) !== null) {
        attrs.push({ type: am[2], name: am[3], value: am[4]?.trim() ?? null, access: am[1] || 'default' })
      }

      // Methods
      const mRx = /(?:(public|private|protected)\s+)?(?:(abstract)\s+)?(?:void|int|String|double|boolean)\s+(\w+)\s*\(([^)]*)\)\s*(?:\{([^}]*)\}|;)/g
      let mm
      while ((mm = mRx.exec(body)) !== null) {
        meths.push({
          name: mm[3], params: mm[4].trim(), body: mm[5]?.trim() ?? '',
          isAbstract: !!mm[2], access: mm[1] || 'public',
        })
      }

      // Constructor with field mapping
      const ctRx = new RegExp(nm + '\\s*\\(([^)]*)\\)\\s*\\{([^}]*)\\}', 'g')
      const cm = ctRx.exec(body)
      let ctor: ParsedClass['ctor'] = null
      if (cm) {
        const fieldMap: Record<string, number> = {}
        const paramList = cm[1].trim().split(',').map((s) => s.trim()).filter(Boolean)
        const paramNames = paramList.map((p) => { const parts = p.split(/\s+/); return parts[parts.length - 1] })

        const asRx = /this\.(\w+)\s*=\s*(\w+)\s*;/g
        let asm
        while ((asm = asRx.exec(cm[2])) !== null) {
          const pIdx = paramNames.indexOf(asm[2])
          if (pIdx >= 0) fieldMap[asm[1]] = pIdx
        }
        ctor = { params: cm[1].trim(), body: cm[2].trim(), fieldMap, paramNames }
      }

      // Getters/setters
      const getters: ParsedClass['getters'] = []
      const setters: ParsedClass['setters'] = []
      meths.forEach((mt) => {
        if (/^get[A-Z]/.test(mt.name)) {
          getters.push({ method: mt.name, field: mt.name.charAt(3).toLowerCase() + mt.name.slice(4) })
        }
        if (/^set[A-Z]/.test(mt.name)) {
          setters.push({ method: mt.name, field: mt.name.charAt(3).toLowerCase() + mt.name.slice(4) })
        }
      })

      R.classes.push({ name: nm, parent: par, attrs, methods: meths, ctor, isAbstract, getters, setters })
    }

    // Object instantiation
    const oRx = /(\w+)\s+(\w+)\s*=\s*new\s+(\w+)\s*\(([^)]*)\)\s*;/g
    while ((m = oRx.exec(cl)) !== null) {
      const args = m[4].trim()
      const pa: string[] = []
      if (args) {
        let buf = '', inS = false
        for (let i = 0; i < args.length; i++) {
          const ch = args[i]
          if (ch === '"') { inS = !inS; continue }
          if (ch === ',' && !inS) { pa.push(buf.trim()); buf = ''; continue }
          buf += ch
        }
        if (buf.trim()) pa.push(buf.trim())
      }
      R.objects.push({ type: m[1], name: m[2], className: m[3], args: pa })
    }

    // Method calls (excluding System.out)
    const cRx = /(\w+)\.(\w+)\s*\(([^)]*)\)\s*;/g
    while ((m = cRx.exec(cl)) !== null) {
      if (m[1] === 'System') continue
      R.calls.push({ obj: m[1], method: m[2], args: m[3].trim() })
    }

    // System.out.println
    const spRx = /System\.out\.println\s*\(([^)]*)\)\s*;/g
    while ((m = spRx.exec(cl)) !== null) {
      R.calls.push({ obj: '__sysout__', method: 'println', args: m[1].trim() })
    }

    // Collections
    const lRx = /(?:ArrayList|List)\s*<\s*(\w+)\s*>\s+(\w+)\s*=\s*new\s+ArrayList/g
    while ((m = lRx.exec(cl)) !== null) {
      R.collections.push({ elemType: m[1], name: m[2] })
    }

    // For-each
    const feRx = /for\s*\(\s*(\w+)\s+(\w+)\s*:\s*(\w+)\s*\)\s*\{([^}]*)\}/g
    while ((m = feRx.exec(cl)) !== null) {
      const icRx = /(\w+)\.(\w+)\s*\(([^)]*)\)\s*;/g
      let ic
      while ((ic = icRx.exec(m[4])) !== null) {
        if (ic[1] === m[2]) {
          R.calls.push({ obj: '__fe__', coll: m[3], iter: m[2], method: ic[2], args: ic[3].trim(), isLoop: true })
        }
      }
    }
  } catch (e: any) {
    R.errors.push(e.message)
  }

  return R
}
