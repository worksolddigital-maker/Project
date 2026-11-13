import { forwardRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { faceGeometry, slabGeometry } from './geometry'
import { useCanvasTexture } from './useCanvasTexture'

export const PHONE_W = 0.74
export const PHONE_H = 1.52
const R = 0.115
const DEPTH = 0.07
const BEVEL = 0.016
const FRONT_Z = DEPTH / 2 + BEVEL

let shared: { body: THREE.BufferGeometry; bezel: THREE.BufferGeometry; screen: THREE.BufferGeometry; back: THREE.BufferGeometry } | null = null
function geometries() {
  if (!shared) {
    shared = {
      body: slabGeometry(PHONE_W, PHONE_H, R, DEPTH, BEVEL, 16),
      bezel: faceGeometry(PHONE_W - 0.012, PHONE_H - 0.012, R - 0.006, 16),
      screen: faceGeometry(PHONE_W - 0.05, PHONE_H - 0.05, R - 0.03, 16),
      back: faceGeometry(PHONE_W - 0.01, PHONE_H - 0.01, R - 0.005, 16),
    }
  }
  return shared
}

/** Smartphone 3D com tela ilustrativa do Super App (sem login, sem dados reais). */
export const PhoneMesh = forwardRef<THREE.Group, Omit<ThreeElements['group'], 'ref'> & { texWidth?: number }>(
  function PhoneMesh({ texWidth = 720, ...rest }, ref) {
    const g = geometries()
    const screenTex = useCanvasTexture('app', 'orange', 'app', texWidth)
    const mats = useMemo(
      () => ({
        frame: new THREE.MeshPhysicalMaterial({ color: '#d9d6d2', metalness: 1, roughness: 0.22, clearcoat: 0.6 }),
        bezel: new THREE.MeshBasicMaterial({ color: '#050505' }),
        screen: new THREE.MeshBasicMaterial({ color: '#f7f4f0', toneMapped: false }),
        back: new THREE.MeshPhysicalMaterial({ color: '#efe9e2', roughness: 0.32, metalness: 0.1, clearcoat: 1 }),
      }),
      [],
    )
    useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])
    useEffect(() => {
      mats.screen.map = screenTex
      mats.screen.color.set('#ffffff')
      mats.screen.needsUpdate = true
    }, [screenTex, mats])

    return (
      <group ref={ref} {...rest}>
        <mesh geometry={g.body} material={mats.frame} dispose={null} />
        <mesh geometry={g.bezel} material={mats.bezel} position-z={FRONT_Z + 0.0008} dispose={null} />
        <mesh geometry={g.screen} material={mats.screen} position-z={FRONT_Z + 0.0016} dispose={null} />
        <mesh geometry={g.back} material={mats.back} position-z={-FRONT_Z - 0.0008} rotation-y={Math.PI} dispose={null} />
      </group>
    )
  },
)
