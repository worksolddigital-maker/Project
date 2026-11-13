import { lazy } from 'react'

/** Rotas reais da aplicação (React Router) com code-splitting por página. */
const loaders = {
  '/': () => import('./pages/Home'),
  '/cartoes': () => import('./pages/Cards'),
  '/shopping': () => import('./pages/Shopping'),
  '/emprestimos': () => import('./pages/Loans'),
  '/investimentos': () => import('./pages/Investments'),
  '/sobre': () => import('./pages/About'),
} as const

export type RoutePath = keyof typeof loaders

export const NAV_ITEMS: { to: RoutePath; label: string }[] = [
  { to: '/', label: 'Início' },
  { to: '/cartoes', label: 'Cartões' },
  { to: '/shopping', label: 'Shopping' },
  { to: '/emprestimos', label: 'Empréstimos' },
  { to: '/investimentos', label: 'Investimentos' },
  { to: '/sobre', label: 'Sobre o Inter' },
]

export const Pages = {
  Home: lazy(loaders['/']),
  Cards: lazy(loaders['/cartoes']),
  Shopping: lazy(loaders['/shopping']),
  Loans: lazy(loaders['/emprestimos']),
  Investments: lazy(loaders['/investimentos']),
  About: lazy(loaders['/sobre']),
}

const preloaded = new Set<string>()
/** Pré-carrega o chunk de uma rota (hover no menu / ociosidade). */
export function preloadRoute(path: string) {
  if (preloaded.has(path)) return
  const loader = loaders[path as RoutePath]
  if (!loader) return
  preloaded.add(path)
  loader().catch(() => preloaded.delete(path))
}

export function preloadAllRoutes() {
  Object.keys(loaders).forEach(preloadRoute)
}
