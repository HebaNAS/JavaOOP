import { CompileResult } from '../api/compiler'

export interface Challenge {
  title: string
  concept: string
  description: string
  hints: string[]
  starter: string
  validate: ChallengeValidation
  xp: number
}

export type ChallengeValidation =
  | { type: 'output'; expected: string }
  | { type: 'outputMatch'; pattern: RegExp }
  | { type: 'compiles' }
  | { type: 'testCases'; cases: TestCase[] }
  | { type: 'custom'; check: (result: CompileResult, code: string) => { pass: boolean; msg: string } }

export interface TestCase {
  stdin?: string
  expected: string
  label: string
}

export interface UnitDef {
  id: string
  number: number
  title: string
  subtitle: string
  description: string
  challenges: Challenge[]
  theme: { primary: string; bg: string; icon: string }
}
