import { useSyncExternalStore } from 'react'

/**
 * Estado do leitor, persistido em localStorage.
 * Tudo o que começa com "prog:" pertence ao ciclo atual de 90 dias e é
 * arquivado/limpo quando o leitor inicia um novo ciclo.
 */
export interface LogEntry { key: string; label: string; at: string }
export interface Habit { id: string; name: string }
export interface CycleArchive { cycle: number; startedAt: string | null; endedAt: string; daysDone: number; goalsDone: number }

export interface State {
  v: 1
  name: string
  visited: Record<string, true>
  checks: Record<string, string>
  fields: Record<string, string>
  ratings: Record<string, number>
  log: LogEntry[]
  habits: Habit[]
  startDate: string | null
  cycle: number
  archive: CycleArchive[]
  lastPage: string
}

const KEY = 'recomeco:v1'

export const DEFAULT_HABITS: Habit[] = [
  { id: 'sono', name: 'Dormir e acordar no horário planejado' },
  { id: 'movimento', name: 'Mover o corpo por pelo menos 20 minutos' },
  { id: 'agua', name: 'Beber água ao longo do dia' },
  { id: 'comida', name: 'Fazer refeições com comida de verdade' },
  { id: 'foco', name: 'Um bloco de foco sem distrações' },
  { id: 'pausa', name: 'Cinco minutos de pausa consciente' },
]

const initial = (): State => ({
  v: 1, name: '', visited: {}, checks: {}, fields: {}, ratings: {}, log: [],
  habits: DEFAULT_HABITS, startDate: null, cycle: 1, archive: [], lastPage: 'capa',
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.v === 1) return { ...initial(), ...parsed }
    }
  } catch { /* armazenamento indisponível: segue em memória */ }
  return initial()
}

let state: State = load()
const listeners = new Set<() => void>()
let saveTimer: number | undefined

function persist() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* cota cheia ou modo privado */ }
  }, 120)
}
function set(next: State) {
  state = next
  persist()
  listeners.forEach((l) => l())
}
// grava imediatamente ao sair da página
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  })
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getState = () => state
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const actions = {
  visit(id: string) {
    if (state.visited[id] && state.lastPage === id) return
    set({ ...state, visited: { ...state.visited, [id]: true }, lastPage: id })
  },
  /** Marca/desmarca um item. Se `label` vier, o item entra no histórico de metas concluídas. */
  toggle(key: string, label?: string) {
    const checks = { ...state.checks }
    let log = state.log
    if (checks[key]) {
      delete checks[key]
      log = log.filter((e) => e.key !== key)
    } else {
      const at = new Date().toISOString()
      checks[key] = at
      if (label) log = [...log, { key, label, at }]
    }
    set({ ...state, checks, log })
  },
  setField(key: string, value: string) {
    set({ ...state, fields: { ...state.fields, [key]: value } })
  },
  setRating(key: string, value: number) {
    set({ ...state, ratings: { ...state.ratings, [key]: value } })
  },
  setName(name: string) { set({ ...state, name }) },
  start(date = todayISO()) { set({ ...state, startDate: date }) },
  addHabit(name: string) {
    const id = 'h' + Date.now().toString(36)
    set({ ...state, habits: [...state.habits, { id, name }] })
  },
  removeHabit(id: string) { set({ ...state, habits: state.habits.filter((h) => h.id !== id) }) },
  /** Arquiva o ciclo atual e limpa os dados do programa para um novo ciclo de 90 dias. */
  newCycle() {
    const strip = <T,>(o: Record<string, T>) =>
      Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('prog:'))) as Record<string, T>
    const s = stats(state)
    set({
      ...state,
      archive: [...state.archive, { cycle: state.cycle, startedAt: state.startDate, endedAt: new Date().toISOString(), daysDone: s.daysDone, goalsDone: s.goalsDone }],
      cycle: state.cycle + 1,
      checks: strip(state.checks), fields: strip(state.fields), ratings: strip(state.ratings),
      log: state.log.filter((e) => !e.key.startsWith('prog:')),
      startDate: todayISO(),
    })
  },
  resetAll() { set(initial()) },
}

/* ---------- valores derivados ---------- */

export const TOTAL_DAYS = 90
export const PHASES = [
  { id: 'f1', n: 1, name: 'Consciência e organização', from: 1, to: 7, goals: 5, page: 'fase-1' },
  { id: 'f2', n: 2, name: 'Construção de hábitos', from: 8, to: 30, goals: 6, page: 'fase-2' },
  { id: 'f3', n: 3, name: 'Consistência e evolução', from: 31, to: 60, goals: 6, page: 'fase-3' },
  { id: 'f4', n: 4, name: 'Consolidação', from: 61, to: 90, goals: 6, page: 'fase-4' },
] as const

/** Dia atual do programa (1..90), ou 0 se ainda não começou. */
export function currentDay(s: State): number {
  if (!s.startDate) return 0
  const [y, m, d] = s.startDate.split('-').map(Number)
  const start = new Date(y, m - 1, d).getTime()
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const n = Math.round((now.getTime() - start) / 86400000) + 1
  return Math.max(1, Math.min(TOTAL_DAYS, n))
}
export const phaseOfDay = (day: number) => PHASES.find((p) => day >= p.from && day <= p.to) ?? PHASES[0]

export function dayRatio(s: State, day: number): number {
  if (!s.habits.length) return 0
  const done = s.habits.filter((h) => s.checks[`prog:hab:${day}:${h.id}`]).length
  return done / s.habits.length
}
export const isDayDone = (s: State, day: number) => !!s.checks[`prog:day:${day}`]

export function stats(s: State) {
  let daysDone = 0, ticks = 0
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    if (isDayDone(s, d)) daysDone++
    for (const h of s.habits) if (s.checks[`prog:hab:${d}:${h.id}`]) ticks++
  }
  const phaseGoals = PHASES.map((p) => {
    let done = 0
    for (let i = 0; i < p.goals; i++) if (s.checks[`prog:${p.id}:meta:${i}`]) done++
    return { ...p, done, closed: !!s.checks[`prog:${p.id}:concluida`] }
  })
  const goalsDone = phaseGoals.reduce((a, p) => a + p.done, 0)
  const goalsTotal = PHASES.reduce((a, p) => a + p.goals, 0)
  // sequência atual: dias consecutivos concluídos terminando hoje ou ontem
  const today = currentDay(s)
  let streak = 0
  for (let d = isDayDone(s, today) ? today : today - 1; d >= 1 && isDayDone(s, d); d--) streak++
  // consistência por semana (13 semanas): fração de hábitos marcados
  const weeks: number[] = []
  for (let w = 0; w < 13; w++) {
    let sum = 0, n = 0
    for (let d = w * 7 + 1; d <= Math.min(TOTAL_DAYS, w * 7 + 7); d++) { sum += dayRatio(s, d); n++ }
    weeks.push(n ? sum / n : 0)
  }
  return { daysDone, ticks, phaseGoals, goalsDone, goalsTotal, streak, weeks, today }
}

export const AREAS = [
  { id: 'sono', label: 'Sono e descanso' },
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'movimento', label: 'Movimento e exercício' },
  { id: 'foco', label: 'Foco e produtividade' },
  { id: 'emocional', label: 'Equilíbrio emocional' },
  { id: 'relacoes', label: 'Relações e apoio' },
  { id: 'organizacao', label: 'Organização da rotina' },
  { id: 'habitos', label: 'Controle sobre hábitos prejudiciais' },
] as const
