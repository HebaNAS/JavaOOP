import { UNIT_2 } from './unit2/challenges'
import { UNIT_3 } from './unit3/challenges'

/** Registry of all units shown on the home page. */
export const UNITS = [
  {
    ...pick(UNIT_2),
    path: '/unit/2',
    total: UNIT_2.challenges.length,
    available: true,
  },
  {
    ...pick(UNIT_3),
    path: '/unit/3',
    total: UNIT_3.challenges.length,
    available: true,
  },
  placeholder(4, 'The Deep Labyrinth', 'Complex Control Flow', '#009688', '#0f1f1f', '🌀', '/unit/4', 6),
  placeholder(5, 'The Armoury', 'Arrays', '#FF9800', '#1f1a0e', '🗡️', '/unit/5', 6),
  placeholder(6, 'The Spell Workshop', 'Methods', '#E91E63', '#1f0e18', '📜', '/unit/6', 8),
  {
    id: 'arena',
    number: 7,
    title: 'The Battle Arena',
    subtitle: 'Objects, Classes & Inheritance (Units 7–9)',
    theme: { primary: '#ff6b35', bg: '#1f170e', icon: '⚔️' },
    path: '/arena',
    total: 15,
    available: true,
  },
  placeholder(10, 'The Shadow Realm', 'Exceptions & Strings', '#9C27B0', '#180e1f', '👻', '/unit/10', 8),
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
  if (path === '/unit/3') return UNIT_3
  return undefined
}
