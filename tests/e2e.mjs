/**
 * Testes end-to-end da experiência (Playwright).
 *
 * Uso:
 *   npm run build && npx vite preview --port 4173 &
 *   BASE_URL=http://localhost:4173 npm run test:e2e
 *
 * Requer o pacote `playwright` com o Chromium instalado
 * (npm i -D playwright && npx playwright install chromium),
 * ou PLAYWRIGHT_PATH apontando para uma instalação existente.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let pw
try {
  pw = require('playwright')
} catch {
  try {
    pw = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright')
  } catch {
    console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium')
    process.exit(1)
  }
}
const { chromium, devices } = pw

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const ROUTES = [
  { path: '/', h1: /BANCO\s*INTER/i },
  { path: '/cartoes', h1: /Cartões Inter/i },
  { path: '/shopping', h1: /dinheiro de volta/i },
  { path: '/emprestimos', h1: /Crédito com/i },
  { path: '/investimentos', h1: /Seu dinheiro/i },
  { path: '/sobre', h1: /Belo Horizonte/i },
]

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const IGNORED = ['THREE.Clock', 'Download the React DevTools', '[vite]']
function watchConsole(page, bucket) {
  page.on('console', (m) => {
    if (!['error', 'warning'].includes(m.type())) return
    const t = m.text()
    if (IGNORED.some((i) => t.includes(i))) return
    bucket.push(`[${m.type()}] ${t}`)
  })
  page.on('pageerror', (e) => bucket.push(`[pageerror] ${e.message}`))
}

async function h1Text(page) {
  await page.waitForSelector('main h1', { timeout: 20000 })
  return (await page.locator('main h1').first().innerText()).replace(/\s+/g, ' ')
}

/** Aguarda o título da nova página (as transições mantêm a página anterior por ~0,5 s). */
async function waitH1(page, re, timeout = 20000) {
  try {
    await page.waitForFunction(
      ({ src, flags }) => {
        const h = document.querySelectorAll('main h1')
        return h.length === 1 && new RegExp(src, flags).test(h[0].innerText.replace(/\s+/g, ' '))
      },
      { src: re.source, flags: re.flags },
      { timeout },
    )
    return true
  } catch {
    return false
  }
}

async function gone(page, selector, timeout = 8000) {
  try {
    await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, selector, { timeout })
    return true
  } catch {
    return false
  }
}

async function scrollCinematic(page, f) {
  await page.evaluate((f) => {
    const sec = document.querySelector('[data-testid="cinematic"]')
    window.scrollTo(0, sec.offsetTop + (sec.offsetHeight - innerHeight) * f)
  }, f)
  await page.waitForFunction(
    (f) => {
      const c = window.__cinematic
      return c && Math.abs(c.target - f) < 0.003 && c.current === c.target
    },
    f,
    { timeout: 120000 },
  )
  await page.waitForTimeout(150)
  return page.evaluate(() => window.__cinematicSnapshot?.())
}

function close(a, b, tol) {
  if (a === null || b === null) return a === b
  return a.every((v, i) => Math.abs(v - b[i]) <= tol)
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

/* ── 1. Rotas diretas (inclui refresh) ───────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  for (const r of ROUTES) {
    const errors = []
    watchConsole(page, errors)
    const res = await page.goto(BASE + r.path, { waitUntil: 'networkidle' })
    const h1 = await h1Text(page)
    check(`rota ${r.path} responde 200`, res?.status() === 200, `status ${res?.status()}`)
    check(`rota ${r.path} renderiza o título`, r.h1.test(h1), h1)
    await page.reload({ waitUntil: 'networkidle' })
    check(`rota ${r.path} funciona após atualizar`, r.h1.test(await h1Text(page)))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`rota ${r.path} sem rolagem horizontal`, overflow <= 0, `${overflow}px`)
    // imagens carregadas (sem quebradas)
    await page.waitForTimeout(800)
    const broken = await page.evaluate(() =>
      [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.alt || i.src.slice(0, 40)),
    )
    check(`rota ${r.path} sem imagens quebradas`, broken.length === 0, broken.join(', '))
    check(`rota ${r.path} sem erros de console`, errors.length === 0, errors.slice(0, 3).join(' | '))
    page.removeAllListeners('console')
    page.removeAllListeners('pageerror')
  }
  const res404 = await page.goto(BASE + '/rota-inexistente', { waitUntil: 'networkidle' })
  check('rota desconhecida exibe página 404', /não encontrada/i.test(await h1Text(page)), `status ${res404?.status()}`)
  await ctx.close()
}

/* ── 2. Navegação pelo menu + voltar/avançar ──────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const nav = page.locator('nav[aria-label="Navegação principal"]')
  for (const r of ROUTES.slice(1)) {
    await nav.locator(`a[href="${r.path}"]`).first().click()
    await page.waitForURL(BASE + r.path)
    check(`menu → ${r.path}`, await waitH1(page, r.h1))
  }
  await page.goBack()
  await page.waitForURL(BASE + '/investimentos')
  check('botão voltar do navegador', await waitH1(page, /Seu dinheiro/i))
  await page.goForward()
  await page.waitForURL(BASE + '/sobre')
  check('botão avançar do navegador', await waitH1(page, /Belo Horizonte/i))
  const scrollTop = await page.evaluate(() => scrollY)
  check('nova página começa no topo', scrollTop < 5, `scrollY=${scrollTop}`)
  await page.locator('[data-testid="nav-logo"]').click()
  await page.waitForURL(BASE + '/')
  check('logotipo volta ao início', await waitH1(page, /BANCO\s*INTER/i))
  await ctx.close()
}

/* ── 3. Botões contextuais da Home ────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__cinematic !== undefined)
  await page.locator('[data-testid="hero-cta-explore"]').click()
  await page.waitForTimeout(2200)
  const y1 = await page.evaluate(() => scrollY)
  check('“Explore o Inter” avança a narrativa', y1 > 400, `scrollY=${Math.round(y1)}`)
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(600)
  await page.locator('[data-testid="hero-cta-solutions"]').click()
  await page.waitForTimeout(2500)
  const solTop = await page.evaluate(() => document.querySelector('#solucoes').getBoundingClientRect().top)
  check('“Acesse as soluções” rola até o ecossistema', Math.abs(solTop) < 200, `top=${Math.round(solTop)}`)
  await page.locator('#solucoes a[href="/shopping"]').first().click()
  await page.waitForURL(BASE + '/shopping')
  check('“Conheça o Inter Shop” abre /shopping', true)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.locator('[data-testid="hero-cta-cards"]').click()
  await page.waitForURL(BASE + '/cartoes')
  check('“Conheça nossos cartões” abre /cartoes', true)
  await ctx.close()
}

/* ── 4. Animação por scroll: reversível ───────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  watchConsole(page, errors)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => typeof window.__cinematicSnapshot === 'function', null, { timeout: 30000 })
  const marks = [0.18, 0.33, 0.5, 0.62, 0.74, 0.95]
  const down = {}
  let finalOpacity = 0
  for (const f of marks) {
    down[f] = await scrollCinematic(page, f)
    if (f === 0.95) {
      finalOpacity = Number(await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="cinematic-final"]')).opacity))
    }
  }
  const up = {}
  for (const f of [...marks].reverse()) up[f] = await scrollCinematic(page, f)
  for (const f of marks) {
    const a = down[f]
    const b = up[f]
    const posOk = close([a.main[0], a.main[2], ...a.main.slice(3)], [b.main[0], b.main[2], ...b.main.slice(3)], 0.002)
    const yOk = Math.abs(a.main[1] - b.main[1]) < 0.05 // flutuação sutil por tempo
    const camOk = close(a.camera, b.camera, 0.002)
    const trioOk = close(a.black, b.black, 0.06)
    check(`scroll reversível em p=${f}`, posOk && yOk && camOk && trioOk, `desce ${JSON.stringify(a.main.slice(0, 3))} / sobe ${JSON.stringify(b.main.slice(0, 3))}`)
  }
  // trio visível somente nas etapas 6–7 e celular apenas no final
  check('três cartões aparecem lado a lado (p=0.5)', down[0.5].black !== null)
  check('trio oculto fora das etapas (p=0.18)', down[0.18].black === null)
  check('aplicativo surge no final (p=0.95)', down[0.95].phone !== null)
  const cam = down[0.33].camera[2]
  check('câmera se aproxima do cartão (p=0.33)', cam < 5.5, `z=${cam}`)
  check('CTA final visível no fim da narrativa', finalOpacity > 0.9, `opacity=${finalOpacity}`)
  // volta ao topo: herói reaparece
  await scrollCinematic(page, 0)
  const heroO = await page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-testid="hero"]')).opacity))
  check('herói retorna ao subir até o topo', heroO > 0.99, `opacity=${heroO}`)
  check('animação sem erros de console', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

/* ── 5. Cartões 3D: seleção, giro 180°, detalhes ─────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/cartoes', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__cardsShowcase !== undefined, null, { timeout: 30000 })
  const angle = async () => {
    await page.waitForTimeout(2600)
    return page.evaluate(() => window.__cardsShowcase.angles()[window.__cardsShowcase.selected])
  }
  const box = await page.locator('[data-testid="cards-canvas"] canvas').boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const a1 = await angle()
  check('clique no cartão gira 180° (verso)', Math.abs(Math.abs(a1) - Math.PI) < 0.35, `ângulo=${a1.toFixed(3)}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const a2 = await angle()
  check('novo clique retorna à frente', Math.abs(a2) < 0.35, `ângulo=${a2.toFixed(3)}`)
  await page.locator('[data-testid="flip-button"]').click()
  const a3 = await angle()
  check('botão “Girar” também gira 180°', Math.abs(Math.abs(a3) - Math.PI) < 0.35, `ângulo=${a3.toFixed(3)}`)
  for (const id of ['platinum', 'prime', 'win', 'gold']) {
    await page.locator(`[data-testid="tab-${id}"]`).click()
    const ok = await page
      .waitForFunction(
        (id) => {
          const h = document.querySelectorAll('[data-testid="card-panel"] h2')
          return h.length === 1 && h[0].innerText.toLowerCase().includes(id)
        },
        id,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false)
    const name = await page.locator('[data-testid="card-panel"] h2').first().innerText()
    check(`seleção ${id} atualiza o painel`, ok, name)
  }
  await page.locator('[data-testid="panel-details"]').click()
  await page.waitForSelector('[data-testid="card-details-gold"]')
  const txt = await page.locator('[role="dialog"]').innerText()
  const sections = ['Categoria', 'Anuidade', 'Programa de pontos', 'Cashback', 'Benefícios Mastercard', 'Critérios de elegibilidade', 'Limite de crédito', 'Como solicitar']
  check('“Ver detalhes” mostra todas as informações', sections.every((s) => txt.toLowerCase().includes(s.toLowerCase())))
  await page.keyboard.press('Escape')
  check('Esc fecha os detalhes', await gone(page, '[role="dialog"][aria-modal="true"]'))
  for (const id of ['gold', 'platinum', 'prime', 'win']) {
    await page.locator(`[data-testid="details-${id}"]`).click()
    await page.waitForSelector(`[data-testid="card-details-${id}"]`)
    await page.locator('[data-testid="modal-close"]').click()
    await gone(page, '[role="dialog"][aria-modal="true"]')
  }
  check('“Ver detalhes” funciona para os 4 modelos', true)
  await ctx.close()
}

/* ── 6. Interações das demais páginas ─────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/emprestimos', { waitUntil: 'networkidle' })
  const pay = () => page.locator('[data-testid="sim-payment"]').innerText()
  const p0 = await pay()
  await page.locator('[data-testid="term-60"]').click()
  await page.waitForTimeout(300)
  const p1 = await pay()
  check('simulador: mudar prazo recalcula a parcela', p0 !== p1, `${p0} → ${p1}`)
  await page.locator('[data-testid="preset-consignado"]').click()
  await page.locator('[data-testid="sim-amount"]').fill('20000')
  await page.locator('[data-testid="sim-amount"]').blur()
  await page.waitForTimeout(300)
  const p2 = await pay()
  check('simulador: mudar modalidade e valor recalcula', p2 !== p1, p2)
  // conferência matemática (Tabela Price) com os valores exibidos
  const ok = await page.evaluate(() => {
    const rate = Number(document.querySelector('[data-testid="sim-rate"]').value) / 100
    const n = Number(document.querySelector('[aria-pressed="true"][data-testid^="term-"]').dataset.testid.split('-')[1])
    const pmt = (20000 * rate) / (1 - Math.pow(1 + rate, -n))
    const shown = Number(document.querySelector('[data-testid="sim-payment"]').innerText.replace(/[^\d,]/g, '').replace(',', '.'))
    return Math.abs(pmt - shown) < 0.02
  })
  check('simulador: parcela confere com a Tabela Price', ok)
  await page.locator('[data-testid="loan-home-equity"]').click()
  await page.waitForSelector('[data-testid="loan-details-home-equity"]')
  check('“Ver condições” abre detalhes da modalidade', /1,19% a\.m\. \+ IPCA/.test(await page.locator('[role="dialog"]').innerText()))
  await page.keyboard.press('Escape')
  check('Esc fecha o painel de empréstimo', await gone(page, '[role="dialog"][aria-modal="true"]'))

  await page.goto(BASE + '/shopping', { waitUntil: 'networkidle' })
  await page.locator('[data-testid="cashback-price"]').fill('1000')
  await page.locator('[data-testid="cashback-pct"]').fill('12')
  check('calculadora de cashback: R$ 1.000 a 12% = R$ 120', /120,00/.test(await page.locator('[data-testid="cashback-value"]').innerText()))
  const prods = await page.locator('[data-testid^="product-"]').count()
  check('vitrine com categorias de produtos', prods >= 6, `${prods} cards`)
  const ext = await page.locator('[data-testid^="product-"] a[target="_blank"]').evaluateAll((as) => as.every((a) => a.href.startsWith('https://') && a.rel.includes('noopener')))
  check('botões de oferta levam ao site oficial com segurança', ext)

  await page.goto(BASE + '/investimentos', { waitUntil: 'networkidle' })
  for (const id of ['renda-fixa', 'cdb', 'lci-lca', 'tesouro-direto', 'fundos', 'renda-variavel', 'outros']) {
    await page.locator(`[data-testid="invest-${id}"]`).click()
    await page.waitForSelector(`[data-testid="invest-details-${id}"]`)
    await page.locator('[data-testid="modal-close"]').click()
    await gone(page, '[role="dialog"][aria-modal="true"]')
  }
  check('“Saiba mais” funciona nas 7 categorias de investimento', true)

  // todos os links internos apontam para rotas válidas
  const valid = new Set(['/', '/cartoes', '/shopping', '/emprestimos', '/investimentos', '/sobre'])
  let bad = []
  for (const r of ROUTES) {
    await page.goto(BASE + r.path, { waitUntil: 'networkidle' })
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    bad = bad.concat(hrefs.filter((h) => h.startsWith('/') && !valid.has(h)).map((h) => `${r.path}→${h}`))
    const empty = await page.locator('a:not([href]), a[href=""], a[href="#"]').count()
    if (empty) bad.push(`${r.path}: ${empty} link(s) vazio(s)`)
  }
  check('nenhum link interno quebrado ou vazio', bad.length === 0, bad.slice(0, 5).join(', '))
  await ctx.close()
}

/* ── 7. Mobile: menu, layout e animação ───────────────────────── */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  const errors = []
  watchConsole(page, errors)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const logo = await page.locator('[data-testid="nav-logo"] svg').boundingBox()
  check('mobile: logotipo visível na navbar', logo && logo.width > 40, `${logo?.width}px`)
  await page.locator('[data-testid="mobile-menu-toggle"]').tap()
  await page.waitForSelector('#mobile-menu')
  await page.locator('#mobile-menu a[href="/investimentos"]').tap()
  await page.waitForURL(BASE + '/investimentos')
  check('mobile: menu navega e fecha', (await gone(page, '#mobile-menu')) && (await waitH1(page, /Seu dinheiro/i)))
  for (const r of ROUTES) {
    await page.goto(BASE + r.path, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`mobile: ${r.path} sem rolagem horizontal`, overflow <= 0, `${overflow}px`)
  }
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => typeof window.__cinematicSnapshot === 'function', null, { timeout: 30000 })
  const a = await scrollCinematic(page, 0.5)
  await scrollCinematic(page, 0.9)
  const b = await scrollCinematic(page, 0.5)
  check('mobile: animação reversível', close(a.main.slice(3), b.main.slice(3), 0.002) && Math.abs(a.main[0] - b.main[0]) < 0.002)
  check('mobile: sem erros de console', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} verificações aprovadas`)
if (failed.length) {
  console.log('Falhas:')
  failed.forEach((f) => console.log(`  ✗ ${f.name} ${f.detail}`))
  process.exit(1)
}
