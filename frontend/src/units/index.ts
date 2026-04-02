import { UNIT_2 } from './unit2/challenges'

/** Registry of all units shown on the home page. */
export const UNITS = [
  {
    ...pick(UNIT_2),
    path: '/unit/2',
    total: UNIT_2.challenges.length,
    available: true,
  },
  placeholder(3, 'The Labyrinth', 'Control Flow Statements', '#00BCD4', '#0a1a20', '\u{1F6E1}\uFE0F', '/unit/3', 8),
  placeholder(4, 'The Deep Labyrinth', 'Complex Control Flow', '#009688', '#0a1a1a', '\u{1F300}', '/unit/4', 6),
  placeholder(5, 'The Armoury', 'Arrays', '#FF9800', '#1a1408', '\u{1F5E1}\uFE0F', '/unit/5', 6),
  placeholder(6, 'The Spell Workshop', 'Methods', '#E91E63', '#1a0a14', '\u{1F4DC}', '/unit/6', 8),
  {
    id: 'arena',
    number: 7,
    title: 'The Battle Arena',
    subtitle: 'Objects, Classes & Inheritance (Units 7\u20139)',
    theme: { primary: '#ff6b35', bg: '#1a1008', icon: '\u2694\uFE0F' },
    path: '/arena',
    total: 15,
    available: true,
  },
  placeholder(10, 'The Shadow Realm', 'Exceptions & Strings', '#9C27B0', '#140a1a', '\u{1F47B}', '/unit/10', 8),
]

function pick(u: { id: string; number: number; title: string; subtitle: string; theme: { primary: string; bg: string; icon: string } }) {
  return { id: u.id, number: u.number, title: u.title, subtitle: u.subtitle, theme: u.theme }
}

function placeholder(
  num: number, title: string, subtitle: string,
  primary: string, bg: string, icon: string, path: string, total: number,
) {
  return { id: `unit-${num}`, number: num, title, subtitle, theme: { primary, bg, icon }, path, total, available: false }
}

/** Lookup a unit definition by path. Returns undefined for placeholders. */
export function getUnitDef(path: string) {
  if (path === '/unit/2') return UNIT_2
  return undefined
}
