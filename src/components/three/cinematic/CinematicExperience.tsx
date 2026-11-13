import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { InterLogo } from '@/components/brand/InterLogo'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon } from '@/components/ui/Icon'
import { SceneCanvas } from '../SceneCanvas'
import { CinematicScene, type ProgressState } from './CinematicScene'
import { CAPTIONS, FINAL_WIN, OVERLAY_WIN, STEPS, type HeroAnchor } from './timeline'
import { ScrollTrigger, useGSAP } from '@/lib/gsap'
import { range, smoothstep, windowed } from '@/lib/math'
import { useIsMobile, useReducedMotion } from '@/lib/useMedia'
import { hasWebGL } from '@/lib/webgl'
import { navTheme } from '@/lib/navTheme'
import { scrollToElement, scrollToY } from '@/lib/smooth'
import { cardImageURL } from '../textures'
import { HeroBackdrop, DarkBackdrop } from './Backdrops'

/**
 * Experiência de abertura + animação cinematográfica controlada por scroll.
 * Estrutura: seção alta (≈10 telas) com um palco "sticky" de 100svh.
 * O ScrollTrigger converte a posição em progresso normalizado (0..1),
 * que dirige a cena 3D e todas as camadas DOM no mesmo frame.
 */
export function CinematicExperience() {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const anchorMobile = useRef<HTMLDivElement>(null)
  const anchorDesktop = useRef<HTMLDivElement>(null)
  const progress = useRef<ProgressState>({ target: 0, current: 0 }).current
  const reduced = useReducedMotion()
  const mobile = useIsMobile()
  const [webgl] = useState(() => hasWebGL())
  const [anchor, setAnchor] = useState<HeroAnchor | null>(null)

  // refs das camadas DOM
  const heroText = useRef<HTMLDivElement>(null)
  const heroBg = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const overlayLogo = useRef<HTMLDivElement>(null)
  const streak = useRef<HTMLDivElement>(null)
  const finalBox = useRef<HTMLDivElement>(null)
  const hud = useRef<HTMLDivElement>(null)
  const hudBar = useRef<HTMLDivElement>(null)
  const hudLabel = useRef<HTMLSpanElement>(null)
  const hudIndex = useRef<HTMLSpanElement>(null)
  const captionRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastStep = useRef(-1)
  const lastTheme = useRef<'light' | 'dark'>('light')

  // Progresso normalizado do scroll (fonte única da animação)
  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          progress.target = self.progress
        },
        onRefresh: (self) => {
          progress.target = self.progress
        },
      })
      return () => st.kill()
    },
    { scope: section },
  )

  // Hook de inspeção usado pelos testes automatizados (reversibilidade)
  useEffect(() => {
    const w = window as Window & { __cinematic?: ProgressState }
    w.__cinematic = progress
    return () => {
      delete w.__cinematic
    }
  }, [progress])

  // Mede onde o cartão deve ficar no herói (ao lado do nome / abaixo no celular)
  useLayoutEffect(() => {
    const st = stage.current
    if (!st) return
    const measure = () => {
      // usa o anchor visível (mobile ou desktop); o outro está com display:none
      const el = [anchorDesktop.current, anchorMobile.current].find((e) => e && e.offsetWidth > 0)
      if (!el) return
      const r = el.getBoundingClientRect()
      const s = st.getBoundingClientRect()
      if (!s.width || !s.height) return
      // a posição é medida com o herói sem deslocamento (progresso 0)
      const heroShift = heroText.current ? new DOMMatrixReadOnly(getComputedStyle(heroText.current).transform).m42 : 0
      const next = {
        cx: (r.left + r.width / 2 - s.left) / s.width,
        cy: (r.top - heroShift + r.height / 2 - s.top) / s.height,
        w: r.width / s.width,
      }
      setAnchor((prev) =>
        prev && Math.abs(prev.cx - next.cx) < 0.002 && Math.abs(prev.cy - next.cy) < 0.002 && Math.abs(prev.w - next.w) < 0.002
          ? prev
          : next,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (anchorMobile.current) ro.observe(anchorMobile.current)
    if (anchorDesktop.current) ro.observe(anchorDesktop.current)
    ro.observe(st)
    return () => ro.disconnect()
  }, [])

  /** Aplica o mesmo progresso a todas as camadas DOM (chamado pela cena a cada frame). */
  const onFrame = useCallback((p: number) => {
    const set = (el: HTMLElement | null, o: number, y = 0, interactive = false) => {
      if (!el) return
      el.style.opacity = o.toFixed(3)
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
      el.style.visibility = o < 0.005 ? 'hidden' : 'visible'
      if (interactive) el.style.pointerEvents = o > 0.5 ? 'auto' : 'none'
    }

    const heroO = 1 - smoothstep(range(p, 0.004, 0.042))
    set(heroText.current, heroO, -60 * (1 - heroO), true)
    set(hint.current, 1 - smoothstep(range(p, 0, 0.015)))
    if (heroBg.current) heroBg.current.style.opacity = (1 - smoothstep(range(p, 0.025, 0.085))).toFixed(3)

    CAPTIONS.forEach((c, i) => {
      const o = windowed(p, ...c.win)
      set(captionRefs.current[i], o, 26 * (1 - o))
    })

    const ov = windowed(p, ...OVERLAY_WIN)
    if (overlay.current) {
      overlay.current.style.opacity = ov.toFixed(3)
      overlay.current.style.visibility = ov < 0.005 ? 'hidden' : 'visible'
    }
    if (overlayLogo.current) {
      const s = 0.94 + 0.1 * range(p, OVERLAY_WIN[0], OVERLAY_WIN[3])
      overlayLogo.current.style.transform = `scale(${s.toFixed(4)})`
    }
    if (streak.current) {
      const k = range(p, 0.71, 0.8)
      streak.current.style.transform = `translate3d(${(-60 + 120 * k).toFixed(2)}vw, 0, 0)`
      streak.current.style.opacity = (Math.sin(k * Math.PI) * 0.95).toFixed(3)
    }

    const fo = windowed(p, ...FINAL_WIN)
    set(finalBox.current, fo, 30 * (1 - fo), true)

    // HUD de etapas (1..10) — some quando o CTA final assume a tela
    const hudO = smoothstep(range(p, 0.04, 0.06)) * (1 - 0.85 * ov) * (1 - fo)
    if (hud.current) {
      hud.current.style.opacity = hudO.toFixed(3)
      hud.current.style.visibility = hudO < 0.01 ? 'hidden' : 'visible'
    }
    if (hudBar.current) hudBar.current.style.transform = `scaleX(${range(p, 0.05, 1).toFixed(4)})`
    let step = 0
    for (let i = 0; i < STEPS.length; i++) if (p >= STEPS[i].at) step = i
    if (step !== lastStep.current) {
      lastStep.current = step
      if (hudLabel.current) hudLabel.current.textContent = STEPS[step].label
      if (hudIndex.current) hudIndex.current.textContent = String(step + 1).padStart(2, '0')
    }

    // tema da navbar (herói claro → palco escuro)
    const theme = p < 0.045 ? 'light' : 'dark'
    if (theme !== lastTheme.current) {
      lastTheme.current = theme
      if (section.current) section.current.dataset.navTheme = theme
      const r = section.current?.getBoundingClientRect()
      if (r && r.top <= 50 && r.bottom > 50) navTheme.set(theme)
    }
  }, [])

  // Sem WebGL: mesma timeline dirigida por requestAnimationFrame (camadas DOM continuam funcionando)
  useEffect(() => {
    if (webgl) return
    let raf = 0
    const loop = () => {
      progress.current += (progress.target - progress.current) * 0.15
      onFrame(progress.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [webgl, onFrame, progress])

  const exploreScroll = () => {
    const el = section.current
    if (!el) return
    const y = el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.12
    scrollToY(y)
  }

  return (
    <section
      ref={section}
      data-nav-theme="light"
      aria-label="Abertura cinematográfica do Banco Inter"
      className="relative h-[820svh] md:h-[1000vh]"
      data-testid="cinematic"
    >
      <div ref={stage} className="sticky top-0 h-[100svh] w-full overflow-hidden" data-testid="cinematic-stage">
        <DarkBackdrop />
        <div ref={heroBg} className="absolute inset-0">
          <HeroBackdrop />
        </div>

        <SceneCanvas
          className="absolute inset-0"
          eventSource={stage}
          testId="cinematic-canvas"
          fallback={<FallbackHeroCard anchor={anchor} />}
        >
          <CinematicScene progress={progress} onFrame={onFrame} reduced={reduced} anchor={anchor} />
        </SceneCanvas>

        {/* Overlay do logotipo (etapa 9) */}
        <div
          ref={overlay}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-0"
          style={{
            visibility: 'hidden',
            background:
              'radial-gradient(120% 90% at 50% 42%, #FFA54A 0%, #FF8412 38%, #FF7400 62%, #D85200 100%)',
          }}
        >
          <div ref={streak} className="absolute left-1/2 top-[46%] h-[2px] w-[70vw] -translate-x-1/2">
            <div className="h-full w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)] shadow-[0_0_24px_6px_rgba(255,255,255,0.55)]" />
          </div>
          <div ref={overlayLogo} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <InterLogo
              tone="white"
              className="w-[80vw] drop-shadow-[0_0_40px_rgba(255,255,255,0.45)] md:w-[58vw]"
            />
          </div>
          <p className="absolute inset-x-0 top-[calc(50%+17vw)] text-center font-display text-lg font-medium tracking-wide text-white/90 md:top-[calc(50%+11vw)] md:text-2xl">
            Para simplificar a vida.
          </p>
        </div>

        {/* Herói: BANCO INTER + cartão 3D ao lado */}
        <div ref={heroText} className="absolute inset-0 z-10 flex items-start md:items-center" data-testid="hero">
          <div className="container-x grid w-full gap-4 pt-24 md:grid-cols-[1.18fr_0.82fr] md:items-center md:gap-8 md:pt-0">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-inter-700 ring-1 ring-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-inter-500" /> Banco digital · Super App
              </p>
              <h1 className="font-display text-[clamp(2.6rem,11vw,8.4rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-ink">
                BANCO <span className="text-gradient-inter">INTER</span>
              </h1>

              {/* No celular o cartão aparece aqui, entre o nome e o texto */}
              <div ref={anchorMobile} className="my-5 aspect-[1.586/1] w-[62vw] max-w-[320px] md:hidden" aria-hidden="true" />

              <p className="mt-2 max-w-xl text-balance font-display text-2xl font-semibold leading-tight text-ink md:mt-7 md:text-[2rem]">
                Seu mundo financeiro em um só lugar.
              </p>
              <p className="mt-4 max-w-lg text-balance text-[0.98rem] leading-relaxed text-ink/65 md:text-lg [@media(max-height:740px)]:max-md:hidden">
                Conheça um ecossistema completo de soluções financeiras, cartões, investimentos, shopping e muito mais.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <LiquidButton
                  to="/cartoes"
                  variant="orange"
                  size="md"
                  iconRight={<Icon name="arrowRight" size={18} />}
                  data-testid="hero-cta-cards"
                >
                  Conheça nossos cartões
                </LiquidButton>
                <LiquidButton variant="light" size="md" onClick={exploreScroll} data-testid="hero-cta-explore">
                  Explore o Inter
                </LiquidButton>
                <LiquidButton
                  variant="light"
                  size="md"
                  onClick={() => scrollToElement('#solucoes', -40)}
                  data-testid="hero-cta-solutions"
                >
                  Acesse as soluções
                </LiquidButton>
              </div>
            </div>
            {/* No desktop o cartão ocupa esta coluna, ao lado do nome */}
            <div className="hidden md:block">
              <div ref={anchorDesktop} className="mx-auto aspect-[1.586/1] w-[88%]" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Legendas sincronizadas */}
        {CAPTIONS.map((c, i) => (
          <div
            key={c.id}
            ref={(el) => {
              captionRefs.current[i] = el
            }}
            className="pointer-events-none absolute inset-x-0 bottom-[9svh] z-10 opacity-0 md:bottom-[11vh]"
            style={{ visibility: 'hidden' }}
          >
            <div className="container-x">
              <div className="mx-auto max-w-md text-center md:mx-0 md:text-left">
                <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-inter-300">{c.kicker}</p>
                <p className="text-balance font-display text-[1.65rem] font-semibold leading-[1.1] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.5)] md:text-4xl">
                  {c.title}
                </p>
                {c.text && <p className="mt-3 text-sm text-white/70 md:text-base">{c.text}</p>}
              </div>
            </div>
          </div>
        ))}

        {/* Etapa 10: apresentação do Super App */}
        <div
          ref={finalBox}
          className="absolute inset-x-0 top-24 z-10 opacity-0 md:top-1/2 md:-translate-y-1/2"
          style={{ visibility: 'hidden', pointerEvents: 'none' }}
          data-testid="cinematic-final"
        >
          <div className="container-x">
            <div className="mx-auto max-w-md text-center md:mx-0 md:max-w-[26rem] md:text-left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-inter-300">Super App Inter</p>
              <h2 className="text-balance text-3xl font-semibold leading-[1.05] text-white md:text-5xl">
                Tudo isso na palma da sua mão.
              </h2>
              <p className="mt-4 hidden text-white/65 md:block">
                Conta, cartões, investimentos, crédito e shopping com cashback reunidos em um único app.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5 md:mt-6 md:justify-start md:gap-3">
                <LiquidButton to="/cartoes" variant="orange" size={mobile ? 'sm' : 'md'} iconRight={<Icon name="arrowRight" size={16} />}>
                  Ver opções de cartões
                </LiquidButton>
                <LiquidButton to="/shopping" variant="glass" size={mobile ? 'sm' : 'md'}>
                  Conheça o Inter Shop
                </LiquidButton>
              </div>
            </div>
          </div>
        </div>

        {/* HUD: etapa atual da narrativa */}
        <div
          ref={hud}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-24 z-10 w-44 opacity-0 sm:right-8 md:top-auto md:bottom-10 md:w-56"
          style={{ visibility: 'hidden' }}
        >
          <div className="flex items-baseline justify-between font-display text-white">
            <span ref={hudIndex} className="text-2xl font-semibold tabular-nums md:text-3xl">01</span>
            <span className="text-xs text-white/50">/ 10</span>
          </div>
          <span ref={hudLabel} className="mt-1 block truncate text-xs text-white/70">O cartão flutua</span>
          <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/15">
            <div ref={hudBar} className="h-full w-full origin-left scale-x-0 rounded-full bg-inter-400" />
          </div>
        </div>

        {/* Indicação de scroll */}
        <div ref={hint} className="pointer-events-none absolute inset-x-0 bottom-5 z-10 hidden justify-center md:flex">
          <div className="flex flex-col items-center gap-2 text-ink/50">
            <Icon name="mouse" size={22} />
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.25em]">Role para explorar</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Fallback sem WebGL: cartão estático renderizado a partir da mesma textura procedural. */
function FallbackHeroCard({ anchor }: { anchor: HeroAnchor | null }) {
  const [src] = useState(() => cardImageURL('orange', 'front', undefined, 800))
  const a = anchor ?? { cx: 0.73, cy: 0.5, w: 0.32 }
  return (
    <img
      src={src}
      alt="Cartão Inter laranja (ilustração)"
      className="absolute animate-float rounded-[4%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]"
      style={{
        left: `${(a.cx - a.w / 2) * 100}%`,
        top: `calc(${a.cy * 100}% - ${(a.w / 1.586 / 2) * 100}vw)`,
        width: `${a.w * 100}%`,
      }}
    />
  )
}
