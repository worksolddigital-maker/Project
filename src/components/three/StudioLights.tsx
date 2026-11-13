import { Environment, Lightformer } from '@react-three/drei'

/**
 * Iluminação de estúdio: luzes diretas + mapa de ambiente procedural
 * (Lightformers renderizados uma única vez num cubemap — sem download de HDRI).
 */
export function StudioLights({ warm = 1 }: { warm?: number }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} color="#fff4ea" />
      <directionalLight position={[-4, -1.5, 3]} intensity={0.55} color="#ffb874" />
      <pointLight position={[0, 0.5, -2.5]} intensity={6 * warm} distance={9} color="#ff7a00" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 3.2, 4]} rotation-x={Math.PI / 2.6} scale={[7, 1.4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ffe2c4" position={[-5, 0.5, 1.5]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff8a2a" position={[5, -0.5, 1.5]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#ffffff" position={[2.5, 2, -4]} scale={2.2} />
        <Lightformer form="rect" intensity={0.8} color="#ffb070" position={[0, -3, 2]} rotation-x={-Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>
    </>
  )
}
