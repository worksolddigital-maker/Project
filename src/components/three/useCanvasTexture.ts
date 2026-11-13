import { useEffect, useState } from 'react'
import type * as THREE from 'three'
import type { CardFinish } from '@/data/cards'
import { acquireTexture, type TextureKind } from './textures'
import { useFontsReady } from '@/lib/useFontsReady'

/**
 * Obtém uma textura procedural do cache (contagem de referências).
 * Redesenha quando as fontes da marca terminam de carregar.
 */
export function useCanvasTexture(kind: TextureKind, finish: CardFinish, label: string, width: number) {
  const fonts = useFontsReady()
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const handle = acquireTexture(kind, finish, label, width, fonts ? 1 : 0)
    setTex(handle.texture)
    return () => handle.release()
  }, [kind, finish, label, width, fonts])
  return tex
}
