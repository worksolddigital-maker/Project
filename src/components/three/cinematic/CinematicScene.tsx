import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { CardMesh } from '../CardMesh'
import { PhoneMesh } from '../PhoneMesh'
import { Bokeh } from '../Bokeh'
import { StudioLights } from '../StudioLights'
import { sample } from '@/lib/keyframes'
import { lerp, range, smoothstep, windowed } from '@/lib/math'
import { buildTimeline, computeLayout, OVERLAY_WIN, TAU, type HeroAnchor } from './timeline'

export interface ProgressState {
  /** progresso alvo (ScrollTrigger) */
  target: number
  /** progresso suavizado exibido */
  current: number
}

interface Props {
  progress: ProgressState
  onFrame: (p: number) => void
  reduced: boolean
  anchor: HeroAnchor | null
}

function apply(obj: THREE.Object3D, v: number[]) {
  obj.position.set(v[0], v[1], v[2])
  obj.rotation.set(v[3], v[4], v[5])
  obj.scale.setScalar(v[6])
}

/**
 * Cena 3D da Home. Um único useFrame lê o progresso do scroll,
 * calcula câmera + objetos a partir da timeline e notifica a camada DOM
 * (legendas, overlay do logotipo, HUD) com o MESMO valor — sem dessincronia.
 */
export function CinematicScene({ progress, onFrame, reduced, anchor }: Props) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera)
  const L = useMemo(() => computeLayout(size.width, size.height, anchor), [size.width, size.height, anchor])
  const T = useMemo(() => buildTimeline(L), [L])
  const mobile = size.width < 768

  const main = useRef<THREE.Group>(null)
  const black = useRef<THREE.Group>(null)
  const white = useRef<THREE.Group>(null)
  const phone = useRef<THREE.Group>(null)
  const bokeh = useRef({ current: 0 }).current
  const idle = useRef({ angle: T.heroRy, latched: false, k: 0 })
  const pointer = useRef({ x: 0, y: 0 })
  const buf = useMemo(() => ({ a: [] as number[], b: [] as number[], c: [] as number[] }), [])

  // Snapshot do estado da cena — usado pelos testes de reversibilidade
  useEffect(() => {
    const w = window as Window & { __cinematicSnapshot?: () => unknown }
    const r = (n: number) => Math.round(n * 1e4) / 1e4
    w.__cinematicSnapshot = () => {
      const m = main.current
      return {
        p: r(progress.current),
        camera: camera.position.toArray().map(r),
        main: m ? [...m.position.toArray(), m.rotation.x, m.rotation.y, m.rotation.z, m.scale.x].map(r) : null,
        black: black.current?.visible ? black.current.position.toArray().map(r) : null,
        phone: phone.current?.visible ? phone.current.position.toArray().map(r) : null,
      }
    }
    return () => {
      delete w.__cinematicSnapshot
    }
  }, [camera, progress])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 10)
    // suavização do progresso (mesma regra nos dois sentidos → reversível)
    progress.current = THREE.MathUtils.damp(progress.current, progress.target, reduced ? 20 : 6.5, dt)
    if (Math.abs(progress.current - progress.target) < 1e-5) progress.current = progress.target
    const p = progress.current
    const t = state.clock.elapsedTime

    // câmera
    const c = sample(T.camera, p, buf.c)
    camera.position.set(c[0], c[1], c[2])
    camera.lookAt(0, 0, 0)

    // parallax sutil com o ponteiro
    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, reduced ? 0 : state.pointer.x, 3, dt)
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, reduced ? 0 : state.pointer.y, 3, dt)
    const zoomCalm = 1 - windowed(p, 0.62, 0.68, 0.8, 0.86)

    // cartão principal — no herói gira em torno do próprio eixo e se funde à timeline
    if (main.current) {
      const v = sample(T.main, p, buf.a)
      const b = smoothstep(range(p, 0, 0.05))
      const id = idle.current
      if (b <= 0.0001) {
        if (!reduced) id.angle += dt * 0.42
        id.latched = false
      } else if (!id.latched) {
        id.k = Math.round((id.angle - T.heroRy) / TAU)
        id.latched = true
      }
      const floatAmp = reduced ? 0 : lerp(0.05, 0.014, b) * zoomCalm
      const idleRx = 0.1 + (reduced ? 0 : Math.sin(t * 0.55) * 0.06)
      const idleRz = reduced ? 0 : Math.sin(t * 0.4) * 0.05
      v[1] += Math.sin(t * 0.9) * floatAmp
      v[3] = lerp(idleRx, v[3], b) - pointer.current.y * 0.08 * zoomCalm
      v[4] = lerp(id.angle, v[4] + TAU * id.k, b) + pointer.current.x * 0.12 * zoomCalm
      v[5] = lerp(idleRz, v[5], b)
      apply(main.current, v)
    }

    // trio (preto à esquerda, branco à direita)
    const trioOn = p > 0.4 && p < 0.656
    if (black.current) {
      black.current.visible = trioOn
      if (trioOn) {
        const v = sample(T.black, p, buf.b)
        v[1] += reduced ? 0 : Math.sin(t * 0.8 + 1) * 0.02
        apply(black.current, v)
      }
    }
    if (white.current) {
      white.current.visible = trioOn
      if (trioOn) {
        const v = sample(T.white, p, buf.b)
        v[1] += reduced ? 0 : Math.sin(t * 0.8 + 2) * 0.02
        apply(white.current, v)
      }
    }

    // smartphone com o Super App
    if (phone.current) {
      const on = p > 0.77
      phone.current.visible = on
      if (on) {
        const v = sample(T.phone, p, buf.b)
        v[1] += reduced ? 0 : Math.sin(t * 0.7) * 0.02
        v[4] += pointer.current.x * 0.08
        apply(phone.current, v)
      }
    }

    // partículas bokeh: aparecem quando o fundo escurece
    bokeh.current = smoothstep(range(p, 0.03, 0.1)) * (1 - 0.95 * windowed(p, ...OVERLAY_WIN))

    onFrame(p)
  })

  return (
    <>
      <StudioLights />
      <Bokeh count={mobile ? 110 : 220} intensity={bokeh} />
      <CardMesh ref={main} finish="orange" texWidth={mobile ? 1280 : 2048} />
      <CardMesh ref={black} finish="black" texWidth={mobile ? 768 : 1024} showBack={false} visible={false} />
      <CardMesh ref={white} finish="white" texWidth={mobile ? 768 : 1024} showBack={false} visible={false} />
      <PhoneMesh ref={phone} texWidth={mobile ? 600 : 900} visible={false} />
    </>
  )
}
