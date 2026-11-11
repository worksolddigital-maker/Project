import { useSyncExternalStore } from 'react'

/**
 * Roteador mínimo por hash: #pagina ou #pagina--ancora (só letras, dígitos e hífens,
 * formato que funciona em hospedagem estática e dentro de visualizadores embutidos).
 * Endereços antigos no formato #/pagina/ancora continuam aceitos.
 */
export interface Route { page: string; anchor?: string }

function parse(): Route {
  const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  const [page = '', anchor] = raw.includes('--') ? raw.split('--') : raw.split('/')
  return { page: page || 'capa', anchor: anchor || undefined }
}
let cached = parse()
let cachedHash = window.location.hash
const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}
const snapshot = () => {
  if (window.location.hash !== cachedHash) { cachedHash = window.location.hash; cached = parse() }
  return cached
}
export const useRoute = () => useSyncExternalStore(subscribe, snapshot)
export const href = (page: string, anchor?: string) => `#${page}${anchor ? '--' + anchor : ''}`
export function navigate(page: string, anchor?: string) { window.location.hash = href(page, anchor) }
