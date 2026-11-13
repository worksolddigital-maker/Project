import * as THREE from 'three'
import type { CardFinish } from '@/data/cards'
import { drawLogo } from '@/components/brand/logoGeometry'

/* ──────────────────────────────────────────────────────────────
   Texturas procedurais (canvas 2D → THREE.CanvasTexture)
   Nenhuma imagem externa: carregamento instantâneo e sem links quebrados.
   As texturas ficam num cache com contagem de referências e são
   descartadas (dispose) quando nenhum componente as usa mais.
   ────────────────────────────────────────────────────────────── */

export const CARD_W = 1.586
export const CARD_H = 1

interface FinishSpec {
  stops: [number, string][]
  logo: string
  ink: string
  chip: 'silver' | 'gold'
  sheen: number
  brushed: number
  stripe: string
}

export const FINISHES: Record<CardFinish, FinishSpec> = {
  orange: {
    stops: [
      [0, '#FFB061'],
      [0.38, '#FF8A1C'],
      [0.72, '#FF7A00'],
      [1, '#E25A00'],
    ],
    logo: '#FFFFFF',
    ink: 'rgba(255,255,255,0.86)',
    chip: 'silver',
    sheen: 0.22,
    brushed: 0.012,
    stripe: '#1b1209',
  },
  white: {
    stops: [
      [0, '#FFFFFF'],
      [0.45, '#F4F2EF'],
      [1, '#D9D5CF'],
    ],
    logo: '#FF7A00',
    ink: 'rgba(40,36,32,0.62)',
    chip: 'silver',
    sheen: 0.5,
    brushed: 0.035,
    stripe: '#2a2622',
  },
  graphite: {
    stops: [
      [0, '#6A6A70'],
      [0.45, '#48484D'],
      [1, '#2A2A2E'],
    ],
    logo: '#FFFFFF',
    ink: 'rgba(255,255,255,0.72)',
    chip: 'gold',
    sheen: 0.18,
    brushed: 0.06,
    stripe: '#0d0d0e',
  },
  black: {
    stops: [
      [0, '#2C2C2E'],
      [0.5, '#141415'],
      [1, '#040404'],
    ],
    logo: '#FFFFFF',
    ink: 'rgba(255,255,255,0.7)',
    chip: 'silver',
    sheen: 0.14,
    brushed: 0.07,
    stripe: '#000000',
  },
}

/** gerador pseudoaleatório determinístico (mesma textura a cada render) */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function paintBase(ctx: CanvasRenderingContext2D, W: number, H: number, f: FinishSpec, seed: number) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  f.stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // textura escovada (brushed metal)
  const rand = rng(seed)
  ctx.save()
  ctx.globalAlpha = 1
  for (let i = 0; i < H; i += 2) {
    const a = rand() * f.brushed
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.fillRect(0, i, W, 1 + (rand() > 0.85 ? 1 : 0))
  }
  ctx.restore()

  // faixa de brilho diagonal (reflexo suave)
  const s = ctx.createLinearGradient(W * 0.05, 0, W * 0.75, H)
  s.addColorStop(0, 'rgba(255,255,255,0)')
  s.addColorStop(0.42, `rgba(255,255,255,${f.sheen * 0.6})`)
  s.addColorStop(0.5, `rgba(255,255,255,${f.sheen})`)
  s.addColorStop(0.58, `rgba(255,255,255,${f.sheen * 0.4})`)
  s.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = s
  ctx.fillRect(0, 0, W, H)

  // vinheta sutil nas bordas
  const v = ctx.createRadialGradient(W * 0.4, H * 0.35, H * 0.2, W * 0.5, H * 0.5, W * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.16)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)
}

function paintChip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: 'silver' | 'gold') {
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  if (kind === 'gold') {
    g.addColorStop(0, '#F6DE9A')
    g.addColorStop(0.45, '#C99B45')
    g.addColorStop(0.7, '#F1D58A')
    g.addColorStop(1, '#A77B2E')
  } else {
    g.addColorStop(0, '#F4F4F4')
    g.addColorStop(0.45, '#A9AAAE')
    g.addColorStop(0.7, '#EDEDED')
    g.addColorStop(1, '#8D8E92')
  }
  ctx.save()
  roundRect(ctx, x, y, w, h, h * 0.16)
  ctx.fillStyle = g
  ctx.fill()
  ctx.clip()
  ctx.strokeStyle = 'rgba(60,50,40,0.45)'
  ctx.lineWidth = Math.max(1, h * 0.018)
  ctx.beginPath()
  ctx.moveTo(x, y + h / 3)
  ctx.lineTo(x + w * 0.36, y + h / 3)
  ctx.moveTo(x, y + (2 * h) / 3)
  ctx.lineTo(x + w * 0.36, y + (2 * h) / 3)
  ctx.moveTo(x + w, y + h / 3)
  ctx.lineTo(x + w * 0.64, y + h / 3)
  ctx.moveTo(x + w, y + (2 * h) / 3)
  ctx.lineTo(x + w * 0.64, y + (2 * h) / 3)
  ctx.moveTo(x + w * 0.36, y)
  ctx.lineTo(x + w * 0.36, y + h)
  ctx.moveTo(x + w * 0.64, y)
  ctx.lineTo(x + w * 0.64, y + h)
  ctx.stroke()
  roundRect(ctx, x + w * 0.36, y + h * 0.28, w * 0.28, h * 0.44, h * 0.06)
  ctx.stroke()
  ctx.restore()
}

function paintContactless(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = size * 0.09
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const r = size * (0.22 + i * 0.22)
    ctx.beginPath()
    ctx.arc(x, y, r, -Math.PI / 4.2, Math.PI / 4.2)
    ctx.stroke()
  }
  ctx.restore()
}

/** Duas circunferências sobrepostas da bandeira. */
function paintNetworkMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const off = r * 0.62
  ctx.save()
  ctx.fillStyle = '#EB001B'
  ctx.beginPath()
  ctx.arc(cx - off, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#F79E1B'
  ctx.beginPath()
  ctx.arc(cx + off, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx - off, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#FF5F00'
  ctx.beginPath()
  ctx.arc(cx + off, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawCardFront(canvas: HTMLCanvasElement, finish: CardFinish, label?: string) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const f = FINISHES[finish]
  paintBase(ctx, W, H, f, 7)

  // logotipo no canto superior direito (como nos cartões do vídeo de referência)
  drawLogo(ctx, W * 0.925, H * 0.245, H * 0.118, f.logo, 'right')

  // chip + aproximação
  paintChip(ctx, W * 0.085, H * 0.4, W * 0.125, H * 0.17, f.chip)
  paintContactless(ctx, W * 0.255, H * 0.485, H * 0.09, f.ink)

  // bandeira
  paintNetworkMark(ctx, W * 0.855, H * 0.8, H * 0.085)

  if (label) {
    ctx.save()
    ctx.fillStyle = f.ink
    ctx.font = `600 ${H * 0.048}px Sora, Inter, sans-serif`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${H * 0.012}px`
    ctx.fillText(label.toUpperCase(), W * 0.085, H * 0.84)
    ctx.restore()
  }
}

export function drawCardBack(canvas: HTMLCanvasElement, finish: CardFinish, label?: string) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const f = FINISHES[finish]
  paintBase(ctx, W, H, f, 13)

  // tarja magnética
  const sg = ctx.createLinearGradient(0, H * 0.11, 0, H * 0.31)
  sg.addColorStop(0, f.stripe)
  sg.addColorStop(0.5, '#2b2620')
  sg.addColorStop(1, f.stripe)
  ctx.fillStyle = sg
  ctx.fillRect(0, H * 0.11, W, H * 0.19)

  // painel de assinatura
  ctx.save()
  roundRect(ctx, W * 0.06, H * 0.41, W * 0.6, H * 0.13, H * 0.02)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,122,0,0.18)'
  ctx.lineWidth = H * 0.006
  for (let x = -H; x < W; x += H * 0.035) {
    ctx.beginPath()
    ctx.moveTo(x, H * 0.55)
    ctx.lineTo(x + H * 0.2, H * 0.4)
    ctx.stroke()
  }
  ctx.restore()

  // código de segurança fictício (mascarado)
  ctx.save()
  roundRect(ctx, W * 0.69, H * 0.41, W * 0.13, H * 0.13, H * 0.02)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = '#1b1b1b'
  ctx.font = `700 ${H * 0.06}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('•••', W * 0.755, H * 0.478)
  ctx.restore()

  // textos legais ilustrativos
  ctx.save()
  ctx.fillStyle = f.ink
  ctx.font = `500 ${H * 0.036}px Inter, sans-serif`
  ctx.fillText('Cartão ilustrativo · projeto conceitual não oficial', W * 0.06, H * 0.64)
  ctx.globalAlpha = 0.75
  ctx.fillText('Sem dados reais. Representação artística do acabamento.', W * 0.06, H * 0.69)
  if (label) {
    ctx.globalAlpha = 1
    ctx.font = `600 ${H * 0.042}px Sora, Inter, sans-serif`
    ctx.fillText(label.toUpperCase(), W * 0.06, H * 0.76)
  }
  ctx.restore()

  drawLogo(ctx, W * 0.06, H * 0.9, H * 0.075, f.logo, 'left')
  paintNetworkMark(ctx, W * 0.88, H * 0.85, H * 0.06)
}

/** Tela ilustrativa do Super App (sem login, sem dados reais). */
export function drawAppScreen(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height
  const u = W / 100 // unidade relativa

  ctx.fillStyle = '#F7F4F0'
  ctx.fillRect(0, 0, W, H)

  // status bar + ilha
  ctx.fillStyle = '#111'
  ctx.font = `600 ${u * 4}px Inter, sans-serif`
  ctx.fillText('9:41', u * 9, u * 9)
  roundRect(ctx, u * 35, u * 3.6, u * 30, u * 8, u * 4)
  ctx.fill()
  for (let i = 0; i < 4; i++) ctx.fillRect(u * (76 + i * 2.6), u * (8 - i * 1.2), u * 1.7, u * (1.6 + i * 1.2))
  roundRect(ctx, u * 88, u * 5.2, u * 7, u * 3.6, u * 1)
  ctx.fill()

  // cabeçalho
  drawLogo(ctx, u * 7, u * 25, u * 7, '#FF7A00', 'left')
  ctx.fillStyle = '#ffe2c7'
  ctx.beginPath()
  ctx.arc(u * 88, u * 21.5, u * 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FF7A00'
  ctx.font = `700 ${u * 4.2}px Sora, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('A', u * 88, u * 23)
  ctx.textAlign = 'left'

  // cartão de saldo
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.08)'
  ctx.shadowBlur = u * 4
  ctx.shadowOffsetY = u * 1
  roundRect(ctx, u * 6, u * 33, u * 88, u * 30, u * 5)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#6b6560'
  ctx.font = `500 ${u * 3.6}px Inter, sans-serif`
  ctx.fillText('Saldo em conta', u * 11, u * 42)
  ctx.fillStyle = '#141414'
  ctx.font = `700 ${u * 7.4}px Sora, sans-serif`
  ctx.fillText('R$ ••••••', u * 11, u * 53)
  ctx.fillStyle = '#9b948d'
  ctx.font = `500 ${u * 3}px Inter, sans-serif`
  ctx.fillText('Tela ilustrativa · sem dados reais', u * 11, u * 59.5)
  ctx.strokeStyle = '#FF7A00'
  ctx.lineWidth = u * 0.8
  ctx.beginPath()
  ctx.ellipse(u * 85, u * 50, u * 3.6, u * 2.2, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(u * 80.5, u * 54)
  ctx.lineTo(u * 89.5, u * 46)
  ctx.stroke()

  // ações rápidas
  const actions = ['Pix', 'Pagar', 'Transferir', 'Investir']
  actions.forEach((a, i) => {
    const cx = u * (17 + i * 22)
    const cy = u * 75
    ctx.fillStyle = '#FFE8D3'
    ctx.beginPath()
    ctx.arc(cx, cy, u * 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FF7A00'
    ctx.save()
    ctx.translate(cx, cy)
    if (i === 0) {
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-u * 2.6, -u * 2.6, u * 5.2, u * 5.2)
    } else if (i === 1) {
      ctx.fillRect(-u * 3.4, -u * 2.4, u * 6.8, u * 4.8)
      ctx.fillStyle = '#FFE8D3'
      ctx.fillRect(-u * 3.4, -u * 1, u * 6.8, u * 1.2)
    } else if (i === 2) {
      ctx.beginPath()
      ctx.moveTo(-u * 3.2, u * 0.6)
      ctx.lineTo(u * 1.5, u * 0.6)
      ctx.lineTo(u * 1.5, u * 2.6)
      ctx.lineTo(u * 3.8, -u * 0.4)
      ctx.lineTo(u * 1.5, -u * 3.4)
      ctx.lineTo(u * 1.5, -u * 1.4)
      ctx.lineTo(-u * 3.2, -u * 1.4)
      ctx.fill()
    } else {
      ;[0, 1, 2].forEach((b) => ctx.fillRect(-u * 3.4 + b * u * 2.5, u * 3 - u * (2 + b * 1.8), u * 1.7, u * (2 + b * 1.8)))
    }
    ctx.restore()
    ctx.fillStyle = '#3d3934'
    ctx.font = `500 ${u * 3.2}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(a, cx, u * 87)
    ctx.textAlign = 'left'
  })

  // banner shopping
  const bg = ctx.createLinearGradient(u * 6, u * 93, u * 94, u * 115)
  bg.addColorStop(0, '#FF9A3C')
  bg.addColorStop(1, '#FF6A00')
  roundRect(ctx, u * 6, u * 93, u * 88, u * 22, u * 5)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${u * 4.6}px Sora, sans-serif`
  ctx.fillText('Shopping', u * 11, u * 102.5)
  ctx.font = `500 ${u * 3.3}px Inter, sans-serif`
  ctx.fillText('Cashback em centenas de lojas', u * 11, u * 109)
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(u * 85, u * 104, u * 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // meus cartões
  ctx.fillStyle = '#141414'
  ctx.font = `700 ${u * 4.4}px Sora, sans-serif`
  ctx.fillText('Meus cartões', u * 7, u * 127)
  ctx.fillStyle = '#FF7A00'
  ctx.font = `600 ${u * 3.4}px Inter, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('Ver todos', u * 93, u * 127)
  ctx.textAlign = 'left'
  const cg = ctx.createLinearGradient(u * 6, u * 132, u * 60, u * 166)
  cg.addColorStop(0, '#FFA552')
  cg.addColorStop(1, '#F06800')
  roundRect(ctx, u * 6, u * 132, u * 56, u * 35, u * 3.5)
  ctx.fillStyle = cg
  ctx.fill()
  drawLogo(ctx, u * 58, u * 141, u * 4.2, '#fff', 'right')
  paintChip(ctx, u * 10, u * 147, u * 8.4, u * 6.4, 'silver')
  paintNetworkMark(ctx, u * 54, u * 160, u * 3.2)
  roundRect(ctx, u * 66, u * 132, u * 28, u * 35, u * 3.5)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = '#6b6560'
  ctx.font = `500 ${u * 3}px Inter, sans-serif`
  ctx.fillText('Pontos', u * 70, u * 142)
  ctx.fillText('Loop', u * 70, u * 146.5)
  ctx.fillStyle = '#FF7A00'
  ctx.font = `700 ${u * 5}px Sora, sans-serif`
  ctx.fillText('••••', u * 70, u * 158)

  // barra inferior
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, H - u * 22, W, u * 22)
  const tabs = ['Início', 'Cartões', 'Shop', 'Investir', 'Mais']
  tabs.forEach((t, i) => {
    const cx = u * (12 + i * 19)
    ctx.fillStyle = i === 0 ? '#FF7A00' : '#b7b0a9'
    roundRect(ctx, cx - u * 2.6, H - u * 18, u * 5.2, u * 5.2, u * 1.4)
    ctx.fill()
    ctx.font = `500 ${u * 2.8}px Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(t, cx, H - u * 8.6)
    ctx.textAlign = 'left'
  })
  ctx.fillStyle = '#111'
  roundRect(ctx, u * 34, H - u * 3.6, u * 32, u * 1.3, u * 0.65)
  ctx.fill()
}

/* ── Cache com contagem de referências ───────────────────────── */

interface Entry {
  texture: THREE.Texture
  refs: number
  timer?: number
}
const cache = new Map<string, Entry>()

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function create(key: string, w: number, h: number, draw: (c: HTMLCanvasElement) => void, anisotropy: number) {
  const canvas = makeCanvas(w, h)
  draw(canvas)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  tex.name = key
  return tex
}

export type TextureKind = 'front' | 'back' | 'app'

export function acquireTexture(kind: TextureKind, finish: CardFinish, label: string, width: number, version: number, anisotropy = 8) {
  const key = `${kind}|${finish}|${label}|${width}|${version}`
  let entry = cache.get(key)
  if (!entry) {
    let texture: THREE.Texture
    if (kind === 'app') {
      texture = create(key, width, Math.round(width * (1.46 / 0.68)), drawAppScreen, anisotropy)
    } else {
      const h = Math.round(width / CARD_W)
      texture = create(
        key,
        width,
        h,
        (c) => (kind === 'front' ? drawCardFront(c, finish, label) : drawCardBack(c, finish, label)),
        anisotropy,
      )
    }
    entry = { texture, refs: 0 }
    cache.set(key, entry)
  }
  if (entry.timer) {
    window.clearTimeout(entry.timer)
    entry.timer = undefined
  }
  entry.refs++
  const e = entry
  return {
    texture: entry.texture,
    release() {
      e.refs--
      if (e.refs <= 0) {
        // pequeno atraso para sobreviver a remontagens rápidas (StrictMode / transições)
        e.timer = window.setTimeout(() => {
          if (e.refs <= 0) {
            e.texture.dispose()
            cache.delete(key)
          }
        }, 4000)
      }
    },
  }
}

/** Gera uma imagem (data URL) do cartão — usada no fallback sem WebGL. */
export function cardImageURL(finish: CardFinish, side: 'front' | 'back', label?: string, width = 640) {
  const c = makeCanvas(width, Math.round(width / CARD_W))
  if (side === 'front') drawCardFront(c, finish, label)
  else drawCardBack(c, finish, label)
  return c.toDataURL('image/png')
}
