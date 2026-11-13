import { useSyncExternalStore } from 'react'

export type NavTheme = 'light' | 'dark'

let current: NavTheme = 'light'
const listeners = new Set<() => void>()

export const navTheme = {
  get: () => current,
  set(next: NavTheme) {
    if (next === current) return
    current = next
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const useNavTheme = () => useSyncExternalStore(navTheme.subscribe, navTheme.get, navTheme.get)
