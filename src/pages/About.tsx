import { useRef } from 'react'
import { PageHero } from '@/components/layout/PageHero'
import { SceneCanvas } from '@/components/three/SceneCanvas'
import { CardFanScene } from '@/components/three/HeroScenes'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { ABOUT_SOURCE, ECOSYSTEM, PILLARS, TIMELINE } from '@/data/about'
import { CONSULTED_AT } from '@/data/sources'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { scrollToElement } from '@/lib/smooth'
import { useReducedMotion } from '@/lib/useMedia'
import { cn } from '@/lib/cn'

const ECO_ICONS: IconName[] = ['bank', 'coins', 'trend', 'shield', 'bag', 'globe']
const PILLAR_ICONS: IconName[] = ['cloud', 'rocket', 'phone']

/** Clientes por ano (milhões), conforme a linha do tempo de RI. */
const CLIENTS: { year: string; value: number; label: string }[] = [
  { year: '2016', value: 0.08, label: '80 mil' },
  { year: '2017', value: 0.37, label: '370 mil+' },
  { year: '2019', value: 4, label: '4 mi+' },
  { year: '2020', value: 8.5, label: '8,5 mi' },
  { year: '2021', value: 16, label: '16 mi' },
  { year: '2022', value: 24, label: '24 mi' },
  { year: '2023', value: 26, label: '26 mi' },
  { year: '2024', value: 36, label: '36 mi' },
  { year: '2025', value: 43, label: '43 mi+' },
]

function ClientsChart() {
  const root = useRef<HTMLDivElement>(null)
  const max = 45
  useGSAP(
    () => {
      gsap.from('[data-bar]', {
        scaleY: 0,
        transformOrigin: 'bottom',
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      })
    },
    { scope: root },
  )
  return (
    <div ref={root} className="glass-panel-dark p-6 sm:p-8">
      <p className="text-sm text-white/55">Clientes (milhões) · anos informados na linha do tempo oficial</p>
      <div className="mt-8 flex h-64 items-end gap-2 sm:gap-4" role="img" aria-label="Gráfico de crescimento de clientes de 2016 a 2025">
        {CLIENTS.map((c) => (
          <div key={c.year} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[0.65rem] font-semibold text-inter-300 sm:text-xs">{c.label}</span>
            <div
              data-bar
              className="w-full rounded-t-lg bg-gradient-to-t from-inter-700 via-inter-500 to-inter-300 shadow-[0_0_24px_rgba(255,122,0,0.35)]"
              style={{ height: `${Math.max(1.2, (c.value / max) * 100)}%` }}
            />
            <span className="text-[0.65rem] text-white/50 sm:text-xs">{c.year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Timeline() {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useGSAP(
    () => {
      // linha de progresso ligada ao scroll (reversível: scrub)
      gsap.fromTo(
        '[data-progress]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top 60%', end: 'bottom 60%', scrub: true },
        },
      )
      if (reduced) return
      gsap.utils.toArray<HTMLElement>('[data-milestone]').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0.25, x: el.dataset.side === 'left' ? -30 : 30 },
          {
            opacity: 1,
            x: 0,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 55%', scrub: true },
          },
        )
      })
      ScrollTrigger.refresh()
    },
    { scope: root, dependencies: [reduced] },
  )

  return (
    <div ref={root} className="relative mt-16" data-testid="timeline">
      <div className="absolute bottom-0 left-4 top-0 w-px bg-ink/10 md:left-1/2" aria-hidden="true" />
      <div
        data-progress
        className="absolute left-4 top-0 h-full w-[3px] -translate-x-px origin-top rounded-full bg-gradient-to-b from-inter-300 via-inter-500 to-inter-700 md:left-1/2"
        aria-hidden="true"
      />
      <ol className="grid gap-10">
        {TIMELINE.map((m, i) => {
          const left = i % 2 === 0
          return (
            <li key={m.year} className="relative grid md:grid-cols-2 md:gap-16">
              <span
                className="absolute left-4 top-6 z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-white ring-4 ring-inter-500 md:left-1/2"
                aria-hidden="true"
              />
              <div
                data-milestone
                data-side={left ? 'left' : 'right'}
                className={cn('pl-12 md:pl-0', left ? 'md:pr-4 md:text-right' : 'md:col-start-2 md:pl-4')}
              >
                <div className="glass-panel inline-block w-full p-6 text-left sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display text-4xl font-bold tracking-tight text-gradient-inter">{m.year}</p>
                    {m.clients && (
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{m.clients} clientes</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{m.title}</h3>
                  <p className="mt-2 text-ink/65">{m.text}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function About() {
  const reduced = useReducedMotion()
  return (
    <>
      <PageHero
        kicker="Sobre o Inter"
        title={
          <>
            De Belo Horizonte para <span className="text-gradient-inter">o mundo.</span>
          </>
        }
        subtitle="Uma trajetória que começou em 1994 como Intermedium Financeira e se transformou em um Super App com banco, crédito, investimentos, seguros, shopping e conta global."
        actions={
          <>
            <LiquidButton
              variant="orange"
              size="lg"
              onClick={() => scrollToElement('#historia')}
              iconRight={<Icon name="arrowDown" size={18} />}
            >
              Ver a linha do tempo
            </LiquidButton>
            <LiquidButton href={ABOUT_SOURCE} variant="light" size="lg" iconRight={<Icon name="arrowUpRight" size={18} />}>
              Relações com Investidores
            </LiquidButton>
          </>
        }
        visual={
          <SceneCanvas className="absolute inset-0" camera={{ position: [0, 0.2, 5.4], fov: 35 }} testId="about-canvas">
            <CardFanScene reduced={reduced} />
          </SceneCanvas>
        }
      />

      {/* História */}
      <section id="historia" data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            align="center"
            kicker="Evolução da instituição"
            title="Três décadas de transformação."
            subtitle="Da financeira mineira ao primeiro banco digital listado na B3 e, depois, na Nasdaq."
          />
          <Timeline />
          <Reveal className="mt-14">
            <Disclaimer>
              Linha do tempo baseada na página “Our Story” do site de Relações com Investidores do Inter&amp;Co (consulta em{' '}
              {CONSULTED_AT}).
            </Disclaimer>
          </Reveal>
        </div>
      </section>

      {/* Crescimento */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute -left-40 top-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.3),transparent_65%)]" />
        <div className="container-x relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            tone="dark"
            kicker="Experiência digital"
            title="Milhões de pessoas no mesmo Super App."
            subtitle="De 80 mil clientes digitais em 2016 para mais de 43 milhões em 2025."
          />
          <Reveal delay={0.1}>
            <ClientsChart />
          </Reveal>
        </div>
      </section>

      {/* Ecossistema + pilares */}
      <section data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            kicker="Ecossistema financeiro"
            title="Serviços que conversam entre si."
            subtitle="Um ecossistema integrado em que cada produto fortalece o outro — dos pontos do cartão ao cashback do shopping."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM.map((e, i) => (
              <Reveal key={e.title} delay={(i % 3) * 0.06}>
                <TiltCard className="h-full rounded-[28px]">
                  <div className="glass-panel h-full p-7">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-inter-400 to-inter-600 text-white">
                      <Icon name={ECO_ICONS[i]} size={22} />
                    </span>
                    <h3 className="mt-6 text-xl font-semibold">{e.title}</h3>
                    <p className="mt-2 text-ink/65">{e.text}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="relative h-full overflow-hidden rounded-[28px] bg-gradient-to-br from-inter-500 to-inter-700 p-8 text-white shadow-[0_30px_60px_-30px_rgba(200,80,0,0.8)]">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
                  <Icon name={PILLAR_ICONS[i]} size={28} />
                  <h3 className="mt-6 text-2xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-white/85">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços → outras páginas */}
      <section data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x text-center">
          <SectionHeading align="center" kicker="Serviços oferecidos" title="Continue explorando." />
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <LiquidButton to="/cartoes" variant="orange" size="lg">Ver opções de cartões</LiquidButton>
              <LiquidButton to="/shopping" variant="light" size="lg">Conheça o Inter Shop</LiquidButton>
              <LiquidButton to="/emprestimos" variant="light" size="lg">Empréstimos</LiquidButton>
              <LiquidButton to="/investimentos" variant="light" size="lg">Conheça os investimentos</LiquidButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
