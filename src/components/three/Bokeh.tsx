import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

let sprite: THREE.Texture | null = null
function getSprite() {
  if (sprite) return sprite
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  sprite = new THREE.CanvasTexture(c)
  sprite.colorSpace = THREE.SRGBColorSpace
  return sprite
}

const LAYERS = [
  { share: 0.72, size: 0.045, opacity: 0.9, z: [-6, 1] as const },
  { share: 0.22, size: 0.28, opacity: 0.32, z: [-8, -2] as const },
  { share: 0.06, size: 1.1, opacity: 0.14, z: [-9, -4] as const },
]
const PALETTE = ['#FF8A1F', '#FFB067', '#FF6A00', '#FFD3A1', '#FF9A3C']

interface Props {
  count?: number
  /** objeto mutável lido a cada frame (0..1) — sincronizado com o scroll */
  intensity?: { current: number }
  spread?: [number, number]
}

/** Partículas bokeh alaranjadas (fundo cinematográfico do vídeo de referência). */
export function Bokeh({ count = 220, intensity, spread = [16, 10] }: Props) {
  const group = useRef<THREE.Group>(null)
  const layers = useMemo(() => {
    let seed = 42
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    return LAYERS.map((l) => {
      const n = Math.max(4, Math.round(count * l.share))
      const pos = new Float32Array(n * 3)
      const col = new Float32Array(n * 3)
      const c = new THREE.Color()
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (rand() - 0.5) * spread[0]
        pos[i * 3 + 1] = (rand() - 0.5) * spread[1]
        pos[i * 3 + 2] = l.z[0] + rand() * (l.z[1] - l.z[0])
        c.set(PALETTE[Math.floor(rand() * PALETTE.length)])
        col[i * 3] = c.r
        col[i * 3 + 1] = c.g
        col[i * 3 + 2] = c.b
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const mat = new THREE.PointsMaterial({
        size: l.size,
        map: getSprite(),
        vertexColors: true,
        transparent: true,
        opacity: l.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
      return { geo, mat, base: l.opacity }
    })
  }, [count, spread])

  useEffect(
    () => () =>
      layers.forEach((l) => {
        l.geo.dispose()
        l.mat.dispose()
      }),
    [layers],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const k = intensity ? intensity.current : 1
    if (group.current) {
      group.current.visible = k > 0.01
      group.current.rotation.z = Math.sin(t * 0.05) * 0.08
      group.current.position.y = Math.sin(t * 0.12) * 0.15
    }
    for (let i = 0; i < layers.length; i++) {
      layers[i].mat.opacity = layers[i].base * k * (0.85 + Math.sin(t * 0.6 + i) * 0.15)
    }
  })

  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <points key={i} geometry={l.geo} material={l.mat} />
      ))}
    </group>
  )
}
