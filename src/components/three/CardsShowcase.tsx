import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import type { InterCard } from '@/data/cards'
import { CardMesh } from './CardMesh'
import { StudioLights } from './StudioLights'
import { angleDelta } from '@/lib/math'

const TAU = Math.PI * 2
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

interface Props {
  cards: InterCard[]
  selected: number
  flipped: boolean
  onSelect: (index: number) => void
  onToggleFlip: () => void
  reduced: boolean
}

interface Pose {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  s: number
}


/**
 * Vitrine 3D dos cartões.
 * - Cartão selecionado vem para frente; os demais formam um arco ao fundo.
 * - Clique no selecionado: gira 180° e mostra o verso; novo clique retorna.
 * - Clique em outro cartão: seleciona (e desfaz o giro).
 */
export function CardsShowcaseScene({ cards, selected, flipped, onSelect, onToggleFlip, reduced }: Props) {
  const size = useThree((s) => s.size)
  const narrow = size.width < 640
  const groups = useRef<(THREE.Group | null)[]>([])
  const n = cards.length
  const step = TAU / n
  const ring = useRef(cards.map((_, i) => wrap((i - selected) * step)))
  const poses = useRef<Pose[]>(cards.map(() => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, s: 0.8 })))
  const hovered = useRef<number | null>(null)
  const flipAngles = useRef<number[]>(cards.map(() => 0))

  // ângulo-alvo: 0 (frente) ou π (verso) — exposto para testes automatizados
  useEffect(() => {
    const w = window as Window & { __cardsShowcase?: { angles: () => number[]; selected: number; flipped: boolean } }
    w.__cardsShowcase = { angles: () => flipAngles.current.slice(), selected, flipped }
    return () => {
      delete w.__cardsShowcase
    }
  }, [selected, flipped])

  const layout = useMemo(
    () => (narrow ? { R: 1.2, sel: 1.32, side: 0.7, back: 0.5 } : { R: 1.95, sel: 1.18, side: 0.8, back: 0.62 }),
    [narrow],
  )

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 15)
    const t = state.clock.elapsedTime
    const k = reduced ? 30 : 5
    cards.forEach((_, i) => {
      const g = groups.current[i]
      if (!g) return
      const isSel = i === selected
      const hover = hovered.current === i
      // carrossel em anel: cada cartão ocupa um ângulo; a seleção gira o anel pelo caminho mais curto
      const target = wrap((i - selected) * step)
      ring.current[i] += angleDelta(ring.current[i], target) * (1 - Math.exp(-k * dt))
      const th = ring.current[i]
      const front = (Math.cos(th) + 1) / 2 // 1 na frente, 0 atrás
      const p = poses.current[i]
      const flip = isSel && flipped ? Math.PI : 0
      const ty = (reduced ? 0 : Math.sin(t * 0.9 + i * 1.3) * 0.05) + (hover && !isSel ? 0.08 : 0)
      const trx = isSel ? -state.pointer.y * 0.12 : 0.05
      const tryBase = -th * 0.55 + (isSel ? state.pointer.x * 0.25 : 0)
      p.y = THREE.MathUtils.damp(p.y, ty, k, dt)
      p.rx = THREE.MathUtils.damp(p.rx, trx, k, dt)
      p.ry = THREE.MathUtils.damp(p.ry, tryBase + flip, k * 0.9, dt)
      const scale = THREE.MathUtils.lerp(layout.back, front > 0.5 ? THREE.MathUtils.lerp(layout.side, layout.sel, (front - 0.5) * 2) : layout.side, Math.min(1, front * 2))
      g.position.set(Math.sin(th) * layout.R, p.y, (Math.cos(th) - 1) * layout.R * 0.9 + front * front * 0.35)
      g.rotation.set(p.rx, p.ry, reduced ? 0 : Math.sin(t * 0.6 + i) * 0.02)
      g.scale.setScalar(scale * (hover && !isSel ? 1.04 : 1))
      flipAngles.current[i] = p.ry - (-th * 0.55)
    })
  })

  const onClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (i === selected) onToggleFlip()
    else onSelect(i)
  }
  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hovered.current = i
    document.body.style.cursor = 'pointer'
  }
  const onOut = (i: number) => () => {
    if (hovered.current === i) hovered.current = null
    document.body.style.cursor = ''
  }
  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  return (
    <>
      <StudioLights warm={0.6} />
      {cards.map((c, i) => (
        <CardMesh
          key={c.id}
          ref={(el) => {
            groups.current[i] = el
          }}
          finish={c.finish}
          label={c.shortName}
          texWidth={narrow ? 1024 : 1536}
          onClick={onClick(i)}
          onPointerOver={onOver(i)}
          onPointerOut={onOut(i)}
        />
      ))}
      <ContactShadows position={[0, -0.95, 0]} opacity={0.35} scale={9} blur={2.6} far={2.4} resolution={256} color="#5a2400" />
    </>
  )
}
