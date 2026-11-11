import { useSyncExternalStore } from 'react'

/** Roteador mínimo por hash: #/pagina ou #/pagina/ancora. Funciona em hospedagem estática. */
export interface Route { page: string; anchor?: string }

function parse(): Route {
  const [page = '', anchor] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { page: decodeURIComponent(page) || 'capa', anchor: anchor ? decodeURIComponent(anchor) : undefined }
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
export const href = (page: string, anchor?: string) => `#/${page}${anchor ? '/' + anchor : ''}`
export function navigate(page: string, anchor?: string) { window.location.hash = href(page, anchor) }
