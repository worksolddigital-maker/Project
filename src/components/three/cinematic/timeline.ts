import type { Key } from '@/lib/keyframes'
import { clamp } from '@/lib/math'
import { CARD_H, CARD_W } from '../textures'
import { PHONE_H, PHONE_W } from '../PhoneMesh'

/* ──────────────────────────────────────────────────────────────
   Linha do tempo da animação cinematográfica (Home)
   Todo estado visual = f(progresso normalizado do scroll ∈ [0,1]).
   Nada é disparado por eventos independentes: rolar para cima
   devolve exatamente o quadro anterior.
   ────────────────────────────────────────────────────────────── */

export const TAU = Math.PI * 2
export const HALF_PI = Math.PI / 2
export const FOV = 35
export const BASE_Z = 6

/** Centro e largura do logotipo na face do cartão (unidades do cartão). */
export const LOGO_LOCAL: [number, number] = [0.493, 0.303]
export const LOGO_W = 0.38

/** Marcos do scroll → as 10 etapas pedidas no briefing. */
export const PHASES = {
  heroEnd: 0.05,
  floatEnd: 0.12, // 1. cartão flutuando
  spinEnd: 0.24, // 2. giro lento
  approachEnd: 0.3, // 3. câmera se aproxima
  fillEnd: 0.36, // 4. cartão ocupa a tela
  asideEnd: 0.44, // 5. cartão vai para o lado
  trioEnd: 0.51, // 6. surgem três cartões
  holdEnd: 0.57, // 7. lado a lado
  refocusEnd: 0.66, // 8. câmera volta ao principal
  logoEnd: 0.72, // 9. logotipo em destaque
  logoHold: 0.8,
  appEnd: 0.9, // 10. aplicativo Inter
} as const

export const STEPS: { at: number; label: string }[] = [
  { at: 0.05, label: 'O cartão flutua' },
  { at: PHASES.floatEnd, label: 'Rotação no próprio eixo' },
  { at: PHASES.spinEnd, label: 'A câmera se aproxima' },
  { at: PHASES.approachEnd, label: 'O cartão ocupa a tela' },
  { at: PHASES.fillEnd, label: 'Movimento lateral' },
  { at: PHASES.asideEnd, label: 'Surgem três cartões' },
  { at: PHASES.trioEnd, label: 'Lado a lado' },
  { at: PHASES.holdEnd, label: 'Foco no cartão principal' },
  { at: PHASES.refocusEnd, label: 'O logotipo em destaque' },
  { at: PHASES.logoHold, label: 'Super App Inter' },
]

export interface HeroAnchor {
  /** centro e largura normalizados (0..1) em relação à viewport */
  cx: number
  cy: number
  w: number
}

export interface CineLayout {
  aspect: number
  portrait: boolean
  Wv: number
  Hv: number
  hero: { x: number; y: number; s: number }
  s1: number
  c1y: number
  dFill: number
  sideX: number
  sT: number
  spacing: number
  zoomD: number
  S7: number
  final: { cx: number; cy: number; cz: number; cs: number; px: number; py: number; ps: number }
}

export function computeLayout(width: number, height: number, anchor: HeroAnchor | null): CineLayout {
  const aspect = width / Math.max(1, height)
  const portrait = aspect < 0.85
  const tanHalf = Math.tan(((FOV * Math.PI) / 180) / 2)
  const Hv = 2 * BASE_Z * tanHalf
  const Wv = Hv * aspect
  const widthAt = (d: number) => 2 * d * tanHalf * aspect

  // Herói: o cartão ocupa o "anchor" medido no DOM (ao lado do nome / abaixo no celular)
  const a = anchor ?? (portrait ? { cx: 0.5, cy: 0.42, w: 0.66 } : { cx: 0.73, cy: 0.5, w: 0.32 })
  const hero = {
    x: (a.cx - 0.5) * Wv,
    y: (0.5 - a.cy) * Hv,
    s: clamp((a.w * Wv) / CARD_W, 0.35, 1.45),
  }

  const s1 = portrait ? (Wv * 0.62) / CARD_W : clamp((Wv * 0.25) / CARD_W, 0.6, 1.15)
  const c1y = portrait ? 0.12 : 0.06

  // distância de câmera para o cartão preencher a tela sem cortar
  const fillW = portrait ? 0.84 : 0.64
  const fillH = 0.62
  const dW = (s1 * CARD_W) / (fillW * 2 * tanHalf * aspect)
  const dH = (s1 * CARD_H) / (fillH * 2 * tanHalf)
  const dFill = clamp(Math.max(dW, dH), 1.4, BASE_Z)

  const sT = Math.min((Hv * 0.5) / CARD_W, Wv * (portrait ? 0.25 : 0.19))
  const spacing = sT * (portrait ? 1.22 : 1.36)
  const sideX = -(portrait ? Wv * 0.16 : Wv * 0.27)

  const zoomD = 4
  const S7 = ((portrait ? 0.8 : 0.58) * widthAt(zoomD)) / LOGO_W

  const final = portrait
    ? {
        cx: -Wv * 0.17,
        cy: -Hv * 0.32,
        cz: 0.55,
        cs: (Wv * 0.44) / CARD_W,
        px: Wv * 0.14,
        py: -Hv * 0.17,
        ps: Math.min((Hv * 0.42) / PHONE_H, (Wv * 0.46) / PHONE_W),
      }
    : {
        cx: Wv * 0.05,
        cy: -0.18,
        cz: 0.45,
        cs: s1 * 0.95,
        px: Wv * 0.24,
        py: 0.02,
        ps: (Hv * 0.64) / PHONE_H,
      }

  return { aspect, portrait, Wv, Hv, hero, s1, c1y, dFill, sideX, sT, spacing, zoomD, S7, final }
}

export interface Timeline {
  heroRy: number
  main: Key[]
  black: Key[]
  white: Key[]
  phone: Key[]
  camera: Key[]
}

/** Vetores: [x, y, z, rx, ry, rz, escala] — câmera: [x, y, z]. */
export function buildTimeline(L: CineLayout): Timeline {
  const P = PHASES
  const { hero, s1, c1y, sT, spacing, sideX, S7, final: F, Wv, Hv } = L
  const heroRy = -0.45
  const zoomX = -LOGO_LOCAL[0] * S7
  const zoomY = -LOGO_LOCAL[1] * S7
  const off = Wv * 0.5 + sT * 1.6 + 0.6

  const main: Key[] = [
    { p: 0, v: [hero.x, hero.y, 0, 0.12, heroRy, 0.06, hero.s] },
    { p: P.floatEnd, v: [0, c1y, 0, 0.42, -0.35, -0.55, s1] },
    { p: P.spinEnd, v: [0, c1y, 0, 0.2, -0.35 + TAU, -0.3, s1] },
    { p: P.approachEnd, v: [0, 0, 0, 0.04, TAU + 0.06, -0.03, s1] },
    { p: P.fillEnd, v: [0, 0, 0, -0.03, TAU - 0.08, 0.02, s1] },
    { p: P.asideEnd, v: [sideX, 0.05, -0.25, 0.08, TAU + 0.5, HALF_PI, sT] },
    { p: P.trioEnd, v: [0, 0, 0, 0, TAU, HALF_PI, sT] },
    { p: P.holdEnd, v: [0, 0, 0.06, 0.02, TAU - 0.06, HALF_PI, sT] },
    { p: P.refocusEnd, v: [0, 0, 0, 0, TAU, 0, s1] },
    { p: P.logoEnd, v: [zoomX, zoomY, 0, 0, TAU, 0, S7] },
    { p: P.logoHold, v: [zoomX, zoomY, 0, 0, TAU, 0, S7] },
    { p: P.appEnd, v: [F.cx, F.cy, F.cz, 0.12, TAU + 0.5, 0.16, F.cs] },
    { p: 1, v: [F.cx, F.cy, F.cz, 0.06, TAU + 0.32, 0.1, F.cs] },
  ]

  const side = (dir: -1 | 1): Key[] => [
    { p: P.fillEnd + 0.04, v: [dir * off, 0.1, -0.6, 0, TAU - dir * 0.7, HALF_PI, sT] },
    { p: P.trioEnd, v: [dir * spacing, 0, -0.05, 0, TAU - dir * 0.28, HALF_PI, sT] },
    { p: P.holdEnd, v: [dir * spacing, 0, -0.05, 0, TAU - dir * 0.12, HALF_PI, sT] },
    { p: P.refocusEnd - 0.01, v: [dir * off, 0.25, -0.9, 0, TAU - dir * 0.9, HALF_PI, sT] },
  ]

  const phone: Key[] = [
    { p: P.logoHold - 0.02, v: [F.px, -Hv * 0.75 - 1.2, -0.4, 0.35, -0.9, 0.05, F.ps] },
    { p: P.appEnd, v: [F.px, F.py, 0, 0.04, -0.34, 0, F.ps] },
    { p: 1, v: [F.px, F.py, 0, 0.02, -0.2, 0, F.ps] },
  ]

  const camera: Key[] = [
    { p: 0, v: [0, 0, BASE_Z] },
    { p: P.spinEnd, v: [0, 0, BASE_Z] },
    { p: P.approachEnd, v: [0, 0, L.dFill] },
    { p: P.fillEnd, v: [0, 0, L.dFill * 0.97] },
    { p: P.asideEnd, v: [0, 0, BASE_Z] },
    { p: P.holdEnd, v: [0, 0, BASE_Z] },
    { p: P.refocusEnd, v: [0, 0, 5] },
    { p: P.logoEnd, v: [0, 0, L.zoomD] },
    { p: P.logoHold, v: [0, 0, L.zoomD] },
    { p: P.appEnd, v: [0, 0, BASE_Z] },
    { p: 1, v: [0, 0, BASE_Z] },
  ]

  return { heroRy, main, black: side(-1), white: side(1), phone, camera }
}

/* ── Camadas DOM sincronizadas ao mesmo progresso ────────────── */

export interface CaptionDef {
  id: string
  win: [number, number, number, number]
  kicker: string
  title: string
  text?: string
}

export const CAPTIONS: CaptionDef[] = [
  {
    id: 'c1',
    win: [0.055, 0.075, 0.105, 0.12],
    kicker: '01 · Cartão Inter',
    title: 'Um cartão. Um ecossistema inteiro.',
  },
  {
    id: 'c2',
    win: [0.125, 0.145, 0.215, 0.235],
    kicker: 'Sem anuidade',
    title: 'Todos os cartões Inter são sem anuidade.',
    text: 'Gold, Platinum, Prime e Win — conforme o site oficial.',
  },
  {
    id: 'c3',
    win: [0.245, 0.265, 0.34, 0.36],
    kicker: 'Inter Loop',
    title: 'Pontos em cada compra no crédito.',
    text: 'De 1 ponto a cada R$ 10,00 até 1 ponto a cada R$ 2,00, conforme o cartão.',
  },
  {
    id: 'c4',
    win: [0.45, 0.47, 0.55, 0.57],
    kicker: 'Um cartão para cada momento',
    title: 'Laranja, preto e branco.',
    text: 'Representação artística dos acabamentos.',
  },
  {
    id: 'c5',
    win: [0.585, 0.6, 0.645, 0.66],
    kicker: 'Benefícios Loop',
    title: 'Pontos que voltam pra você.',
    text: 'Milhas, cashback, Salas VIP, dólares, descontos na fatura e investimentos.',
  },
]

export const OVERLAY_WIN: [number, number, number, number] = [0.722, 0.742, 0.785, 0.815]
export const FINAL_WIN: [number, number, number, number] = [0.87, 0.91, 2, 3]
