import { UNIT_2 } from './unit2/challenges'
import { UNIT_3 } from './unit3/challenges'
import { UNIT_4 } from './unit4/challenges'
import { UNIT_5 } from './unit5/challenges'
import { UNIT_6 } from './unit6/challenges'
import { UNIT_10 } from './unit10/challenges'

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
  {
    ...pick(UNIT_4),
    path: '/unit/4',
    total: UNIT_4.challenges.length,
    available: true,
  },
  {
    ...pick(UNIT_5),
    path: '/unit/5',
    total: UNIT_5.challenges.length,
    available: true,
  },
  {
    ...pick(UNIT_6),
    path: '/unit/6',
    total: UNIT_6.challenges.length,
    available: true,
  },
  {
    id: 'arena',
    number: 7,
    title: 'The Battle Arena',
    subtitle: 'Objects, Classes & Inheritance (Units 7–9)',
    theme: { primary: '#ff6b35', bg: '#1f170e', icon: '⚔️' },
    path: '/arena',
    total: 19,
    available: true,
  },
  {
    ...pick(UNIT_10),
    path: '/unit/10',
    total: UNIT_10.challenges.length,
    available: true,
  },
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
  if (path === '/unit/4') return UNIT_4
  if (path === '/unit/5') return UNIT_5
  if (path === '/unit/6') return UNIT_6
  if (path === '/unit/10') return UNIT_10
  return undefined
}
