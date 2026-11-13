import { useEffect, useState } from 'react'

let ready = false
let promise: Promise<void> | null = null

/** Garante que Sora/Inter estejam carregadas antes de desenhar texturas em canvas. */
export function loadBrandFonts(): Promise<void> {
  if (ready) return Promise.resolve()
  if (!promise) {
    const fonts = document.fonts
    promise = Promise.race([
      Promise.all([
        fonts.load('700 120px Sora'),
        fonts.load('600 64px Sora'),
        fonts.load('500 48px Inter'),
        fonts.load('600 48px Inter'),
      ]).then(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ])
      .catch(() => undefined)
      .then(() => {
        ready = true
      })
  }
  return promise
}

export function useFontsReady(): boolean {
  const [ok, setOk] = useState(ready)
  useEffect(() => {
    if (ready) return
    let alive = true
    loadBrandFonts().then(() => alive && setOk(true))
    return () => {
      alive = false
    }
  }, [])
  return ok
}
