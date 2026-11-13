import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, ContactShadows } from '@react-three/drei'
import { CardMesh } from './CardMesh'
import { StudioLights } from './StudioLights'
import { drawLogo } from '@/components/brand/logoGeometry'
import { useFontsReady } from '@/lib/useFontsReady'
import type { CardFinish } from '@/data/cards'

/* Cenas 3D leves para os heróis das páginas internas.
   Animação contínua por tempo + parallax do ponteiro (não dependem do scroll). */

function useParallax(strength = 0.25) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * strength, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * strength * 0.6, 3, dt)
  })
  return ref
}

/** Textura com o logotipo (para aplicar em objetos 3D). */
function useLogoTexture(color = '#ffffff') {
  const fonts = useFontsReady()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 320
    const ctx = c.getContext('2d')!
    drawLogo(ctx, 512, 250, 200, color, 'center')
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
    // fontes carregadas → redesenha
  }, [color, fonts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/* ── Inter Shop: sacola com cashback ─────────────────────────── */
export function ShopScene({ reduced = false }: { reduced?: boolean }) {
  const root = useParallax(0.3)
  const bag = useRef<THREE.Group>(null)
  const items = useRef<THREE.Group>(null)
  const logo = useLogoTexture('#ffffff')
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    if (bag.current) {
      bag.current.position.y = Math.sin(t * 0.9) * 0.06
      bag.current.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.12
    }
    if (items.current) items.current.rotation.y = t * 0.25
  })
  return (
    <>
      <StudioLights warm={0.8} />
      <group ref={root}>
        <group ref={bag} position={[0, -0.1, 0]}>
          <RoundedBox args={[1.5, 1.7, 0.62]} radius={0.07} smoothness={4}>
            <meshPhysicalMaterial color="#FF7A00" roughness={0.38} clearcoat={0.8} clearcoatRoughness={0.25} />
          </RoundedBox>
          {/* aba superior */}
          <RoundedBox args={[1.52, 0.12, 0.64]} radius={0.04} position={[0, 0.82, 0]}>
            <meshStandardMaterial color="#E85F00" roughness={0.5} />
          </RoundedBox>
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[0, 0.88, x * 0.55]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.36, 0.035, 16, 48, Math.PI]} />
              <meshPhysicalMaterial color="#FFE2C4" roughness={0.3} metalness={0.2} clearcoat={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0.312]}>
            <planeGeometry args={[1.05, 0.33]} />
            <meshBasicMaterial map={logo} transparent toneMapped={false} />
          </mesh>
        </group>
        <group ref={items}>
          {/* moedas de cashback e presente orbitando */}
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2
            return (
              <group key={i} position={[Math.cos(a) * 1.55, 0.35 * Math.sin(i * 1.7), Math.sin(a) * 1.0]}>
                {i === 2 ? (
                  <group rotation={[0.3, 0.6, 0.1]} scale={0.32}>
                    <RoundedBox args={[1, 1, 1]} radius={0.06}>
                      <meshPhysicalMaterial color="#FFF3E6" roughness={0.3} clearcoat={1} />
                    </RoundedBox>
                    <mesh>
                      <boxGeometry args={[1.02, 1.02, 0.2]} />
                      <meshStandardMaterial color="#FF7A00" roughness={0.4} />
                    </mesh>
                    <mesh>
                      <boxGeometry args={[0.2, 1.02, 1.02]} />
                      <meshStandardMaterial color="#FF7A00" roughness={0.4} />
                    </mesh>
                  </group>
                ) : (
                  <mesh rotation={[Math.PI / 2.4, 0.4 * i, 0]}>
                    <cylinderGeometry args={[0.22, 0.22, 0.05, 40]} />
                    <meshPhysicalMaterial color="#FFB347" metalness={1} roughness={0.22} clearcoat={0.6} />
                  </mesh>
                )}
              </group>
            )
          })}
        </group>
        <CardMesh finish="black" scale={0.55} position={[1.05, -0.65, 0.6]} rotation={[-0.3, -0.5, 0.25]} texWidth={768} showBack={false} />
      </group>
      <ContactShadows position={[0, -1.15, 0]} opacity={0.32} scale={7} blur={2.5} far={2.5} resolution={256} color="#6b2a00" />
    </>
  )
}

/* ── Empréstimos: pilhas de moedas ───────────────────────────── */
export function CoinsScene({ reduced = false }: { reduced?: boolean }) {
  const root = useParallax(0.3)
  const floating = useRef<THREE.Group>(null)
  const stacks = [
    { x: -0.9, n: 4 },
    { x: 0, n: 7 },
    { x: 0.9, n: 10 },
  ]
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    if (floating.current) {
      floating.current.children.forEach((c, i) => {
        c.position.y = 0.9 + i * 0.35 + Math.sin(t * 1.1 + i) * 0.08
        c.rotation.z = 0.2 + Math.sin(t * (0.8 + i * 0.2)) * 0.5
      })
    }
  })
  return (
    <>
      <StudioLights warm={0.7} />
      <group ref={root} position={[0, -0.55, 0]} rotation={[0.25, 0, 0]}>
        {stacks.map((s) =>
          Array.from({ length: s.n }).map((_, i) => (
            <mesh key={`${s.x}-${i}`} position={[s.x + Math.sin(i * 2.1) * 0.025, i * 0.105, Math.cos(i * 1.7) * 0.02]}>
              <cylinderGeometry args={[0.38, 0.38, 0.09, 48]} />
              <meshPhysicalMaterial
                color={i % 2 ? '#FFB347' : '#FF9A2E'}
                metalness={0.82}
                roughness={0.28}
                clearcoat={0.5}
              />
            </mesh>
          )),
        )}
        <group ref={floating} position={[0.95, 0, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i} rotation={[Math.PI / 2 - 0.55, 0, 0.2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.06, 48]} />
              <meshPhysicalMaterial color="#FFC266" metalness={0.75} roughness={0.25} clearcoat={0.6} />
            </mesh>
          ))}
        </group>
        <CardMesh finish="orange" scale={0.62} position={[-0.55, 1.15, -0.4]} rotation={[0.2, 0.4, -0.18]} texWidth={1024} showBack={false} />
      </group>
      <ContactShadows position={[0, -0.62, 0]} opacity={0.35} scale={7} blur={2.4} far={2.2} resolution={256} color="#6b2a00" />
    </>
  )
}

/* ── Investimentos: barras de vidro em crescimento ───────────── */
export function GrowthScene({ reduced = false }: { reduced?: boolean }) {
  const root = useParallax(0.35)
  const cores = useRef<(THREE.Mesh | null)[]>([])
  const heights = [0.6, 0.95, 1.3, 1.75, 2.25]
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        heights.map((h, i) => new THREE.Vector3(-1.6 + i * 0.8, -1 + h + 0.25, 0.32)),
        false,
        'catmullrom',
        0.3,
      ),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.025, 12, false), [curve])
  useEffect(() => () => tube.dispose(), [tube])
  useFrame((state) => {
    const t = reduced ? 1 : state.clock.elapsedTime
    cores.current.forEach((m, i) => {
      if (!m) return
      const k = reduced ? 1 : 0.88 + Math.sin(t * 0.9 + i * 0.6) * 0.12
      m.scale.y = k
      m.position.y = -1 + (heights[i] * k) / 2
    })
  })
  return (
    <>
      <StudioLights warm={1.2} />
      <group ref={root} rotation={[0.12, -0.35, 0]}>
        {heights.map((h, i) => (
          <group key={i} position={[-1.6 + i * 0.8, 0, 0]}>
            <RoundedBox args={[0.56, h + 0.12, 0.56]} radius={0.06} position={[0, -1 + (h + 0.12) / 2, 0]}>
              <meshPhysicalMaterial
                color="#ffffff"
                transparent
                opacity={0.22}
                roughness={0.05}
                metalness={0.1}
                clearcoat={1}
                iridescence={0.6}
                iridescenceIOR={1.4}
                depthWrite={false}
              />
            </RoundedBox>
            <mesh
              ref={(el) => {
                cores.current[i] = el
              }}
              position={[0, -1 + h / 2, 0]}
            >
              <boxGeometry args={[0.34, h, 0.34]} />
              <meshStandardMaterial color="#FF7A00" emissive="#FF5A00" emissiveIntensity={0.5 + i * 0.12} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <mesh geometry={tube}>
          <meshBasicMaterial color="#FFD3A1" toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

/* ── Sobre: leque de cartões ─────────────────────────────────── */
export function CardFanScene({ reduced = false }: { reduced?: boolean }) {
  const root = useParallax(0.3)
  const fan = useRef<THREE.Group>(null)
  const finishes: CardFinish[] = ['white', 'graphite', 'black', 'orange']
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    if (fan.current) {
      fan.current.rotation.z = Math.sin(t * 0.35) * 0.08
      fan.current.position.y = Math.sin(t * 0.8) * 0.05
      fan.current.children.forEach((c, i) => {
        c.rotation.z = (i - 1.5) * (0.22 + Math.sin(t * 0.5) * 0.04)
      })
    }
  })
  return (
    <>
      <StudioLights />
      <group ref={root}>
        <group ref={fan} rotation={[-0.15, 0.25, 0]}>
          {finishes.map((f, i) => (
            <group key={f} position={[0, 0, i * 0.06]}>
              <CardMesh finish={f} position={[0.35, 0.55, 0]} texWidth={1024} showBack={false} />
            </group>
          ))}
        </group>
      </group>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.3} scale={7} blur={2.6} far={3} resolution={256} color="#6b2a00" />
    </>
  )
}
