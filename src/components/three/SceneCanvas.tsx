import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { hasWebGL } from '@/lib/webgl'
import { useIsMobile } from '@/lib/useMedia'
import { cn } from '@/lib/cn'

interface Props {
  children: ReactNode
  className?: string
  fallback?: ReactNode
  camera?: { position: [number, number, number]; fov?: number }
  /** força renderização mesmo fora da viewport (ex.: cena fixa) */
  alwaysOn?: boolean
  eventSource?: React.RefObject<HTMLElement | null>
  testId?: string
}

/**
 * Wrapper do Canvas R3F com:
 * - pausa automática fora da viewport (IntersectionObserver → frameloop "never")
 * - DPR adaptativo (PerformanceMonitor) e limite menor no celular
 * - fallback visual quando não há WebGL ou o contexto é perdido
 */
export function SceneCanvas({ children, className, fallback, camera = { position: [0, 0, 6], fov: 35 }, alwaysOn, eventSource, testId }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [lost, setLost] = useState(false)
  const [supported] = useState(() => hasWebGL())
  const mobile = useIsMobile()
  const maxDpr = mobile ? 1.5 : 1.75
  const [dpr, setDpr] = useState(maxDpr)

  useEffect(() => setDpr(maxDpr), [maxDpr])

  useEffect(() => {
    if (alwaysOn || !host.current) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px' })
    io.observe(host.current)
    return () => io.disconnect()
  }, [alwaysOn])

  if (!supported || lost) {
    return (
      <div className={cn(className ?? 'relative h-full w-full')} data-testid={testId ? `${testId}-fallback` : undefined}>
        {fallback}
      </div>
    )
  }

  return (
    <div ref={host} className={cn(className ?? 'relative h-full w-full')} data-testid={testId}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={dpr}
        camera={{ position: camera.position, fov: camera.fov ?? 35, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
        eventSource={eventSource?.current ?? undefined}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.setClearColor(0x000000, 0)
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setLost(true)
          })
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
