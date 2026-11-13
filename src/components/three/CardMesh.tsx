import { forwardRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import type { CardFinish } from '@/data/cards'
import { CARD_H, CARD_W, FINISHES } from './textures'
import { faceGeometry, slabGeometry } from './geometry'
import { useCanvasTexture } from './useCanvasTexture'

const RADIUS = 0.075
const DEPTH = 0.012
const BEVEL = 0.0035
export const FACE_Z = DEPTH / 2 + BEVEL + 0.0006

let shared: { body: THREE.BufferGeometry; face: THREE.BufferGeometry } | null = null
function geometries() {
  if (!shared) {
    shared = {
      body: slabGeometry(CARD_W, CARD_H, RADIUS, DEPTH, BEVEL, 12),
      face: faceGeometry(CARD_W, CARD_H, RADIUS, 12),
    }
  }
  return shared
}

const MATERIAL: Record<
  CardFinish,
  { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number; iridescence?: number; edge: string }
> = {
  orange: { roughness: 0.34, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.18, edge: '#c95400' },
  white: { roughness: 0.28, metalness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.35, edge: '#cdc6bd' },
  graphite: { roughness: 0.36, metalness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.2, edge: '#3a3a3e' },
  black: { roughness: 0.3, metalness: 0.6, clearcoat: 0.9, clearcoatRoughness: 0.1, edge: '#141414' },
}

export type CardMeshProps = Omit<ThreeElements['group'], 'ref'> & {
  finish: CardFinish
  label?: string
  /** largura da textura da frente em px (resolução) */
  texWidth?: number
  showBack?: boolean
}

/**
 * Cartão 3D: corpo extrudado com chanfro (bordas reais) + faces com
 * MeshPhysicalMaterial (clearcoat, metalness, iridescência no branco).
 */
export const CardMesh = forwardRef<THREE.Group, CardMeshProps>(function CardMesh(
  { finish, label = '', texWidth = 1536, showBack = true, ...rest },
  ref,
) {
  const { body, face } = geometries()
  const front = useCanvasTexture('front', finish, label, texWidth)
  const back = useCanvasTexture('back', finish, label, Math.round(texWidth * 0.66))

  const mats = useMemo(() => {
    const m = MATERIAL[finish]
    const base = new THREE.Color(FINISHES[finish].stops[1][1])
    const faceParams: THREE.MeshPhysicalMaterialParameters = {
      color: base,
      roughness: m.roughness,
      metalness: m.metalness,
      clearcoat: m.clearcoat,
      clearcoatRoughness: m.clearcoatRoughness,
      iridescence: m.iridescence ?? 0,
      iridescenceIOR: 1.3,
      envMapIntensity: 1.1,
    }
    return {
      front: new THREE.MeshPhysicalMaterial(faceParams),
      back: new THREE.MeshPhysicalMaterial(faceParams),
      edge: new THREE.MeshStandardMaterial({ color: m.edge, roughness: 0.38, metalness: 0.5 }),
    }
  }, [finish])

  useEffect(() => {
    return () => {
      mats.front.dispose()
      mats.back.dispose()
      mats.edge.dispose()
    }
  }, [mats])

  useEffect(() => {
    mats.front.map = front
    mats.front.color.set(front ? '#ffffff' : FINISHES[finish].stops[1][1])
    mats.front.needsUpdate = true
  }, [front, mats, finish])
  useEffect(() => {
    mats.back.map = back
    mats.back.color.set(back ? '#ffffff' : FINISHES[finish].stops[1][1])
    mats.back.needsUpdate = true
  }, [back, mats, finish])

  return (
    <group ref={ref} {...rest}>
      <mesh geometry={body} material={mats.edge} dispose={null} />
      <mesh geometry={face} material={mats.front} position-z={FACE_Z} dispose={null} />
      {showBack && (
        <mesh geometry={face} material={mats.back} position-z={-FACE_Z} rotation-y={Math.PI} dispose={null} />
      )}
    </group>
  )
})
