/**
 * Geometria do símbolo de "raios" estilizado usado no logotipo.
 * É compartilhada entre o SVG da interface e as texturas 3D desenhadas em canvas,
 * garantindo a mesma identidade nas duas camadas.
 * Coordenadas em um box 100x100 (y para baixo).
 */
export const RAY_ANGLES = [102, 119, 136, 153, 170]
const ORIGIN = { x: 96, y: 96 }
const INNER = 30
const OUTER = 92

export function rayPolygons(): Array<Array<[number, number]>> {
  return RAY_ANGLES.map((deg, i) => {
    const a = (deg * Math.PI) / 180
    const dir = { x: Math.cos(a), y: -Math.sin(a) }
    const nrm = { x: -dir.y, y: dir.x }
    const outer = OUTER - i * 3
    const wIn = 3.4
    const wOut = 6.4
    const p1: [number, number] = [ORIGIN.x + dir.x * INNER + nrm.x * wIn, ORIGIN.y + dir.y * INNER + nrm.y * wIn]
    const p2: [number, number] = [ORIGIN.x + dir.x * outer + nrm.x * wOut, ORIGIN.y + dir.y * outer + nrm.y * wOut]
    const p3: [number, number] = [ORIGIN.x + dir.x * outer - nrm.x * wOut, ORIGIN.y + dir.y * outer - nrm.y * wOut]
    const p4: [number, number] = [ORIGIN.x + dir.x * INNER - nrm.x * wIn, ORIGIN.y + dir.y * INNER - nrm.y * wIn]
    return [p1, p2, p3, p4]
  })
}

export function rayPathD(): string {
  return rayPolygons()
    .map((poly) => `M${poly.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`)
    .join(' ')
}

/** Desenha os raios num contexto 2D, dentro de um box (x, y, size). */
export function drawRays(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 100
  ctx.beginPath()
  for (const poly of rayPolygons()) {
    poly.forEach(([px, py], i) => {
      const X = x + px * s
      const Y = y + py * s
      if (i === 0) ctx.moveTo(X, Y)
      else ctx.lineTo(X, Y)
    })
    ctx.closePath()
  }
  ctx.fill()
}

/**
 * Desenha o logotipo completo (raios + "inter") alinhado pela linha de base.
 * Retorna a largura total desenhada.
 */
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  height: number,
  color: string,
  align: 'left' | 'right' | 'center' = 'left',
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `700 ${height}px Sora, Inter, sans-serif`
  ctx.textBaseline = 'alphabetic'
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-height * 0.04}px`
  const text = 'inter'
  const textW = ctx.measureText(text).width
  const raySize = height * 0.92
  const gap = height * 0.06
  const total = raySize + gap + textW
  let left = x
  if (align === 'right') left = x - total
  if (align === 'center') left = x - total / 2
  drawRays(ctx, left, baseline - raySize * 0.97, raySize)
  ctx.fillText(text, left + raySize + gap, baseline)
  ctx.restore()
  return total
}
