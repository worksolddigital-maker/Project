import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneCanvas } from '@/components/three/SceneCanvas'
import { CardsShowcaseScene } from '@/components/three/CardsShowcase'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { CardImage } from '@/components/ui/CardImage'
import { Modal } from '@/components/ui/Modal'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { Pill } from '@/components/ui/Pill'
import { CARDS, CARD_FEATURES, LOOP_FACTS, LOOP_REDEMPTIONS, WALLETS, type InterCard } from '@/data/cards'
import { CONSULTED_AT, OFFICIAL } from '@/data/sources'
import { useReducedMotion } from '@/lib/useMedia'
import { cn } from '@/lib/cn'

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-ink/10 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-inter-700">{title}</h3>
      <div className="text-[0.95rem] leading-relaxed text-ink/75">{children}</div>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5">
          <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-inter-500" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

function CardDetails({ card }: { card: InterCard }) {
  return (
    <div data-testid={`card-details-${card.id}`}>
      <CardImage finish={card.finish} label={card.shortName} alt={`Ilustração do ${card.name}`} className="mx-auto mb-7 w-full max-w-sm" />
      <DetailBlock title="Categoria">{card.category}</DetailBlock>
      <DetailBlock title="Anuidade">{card.annualFee}</DetailBlock>
      <DetailBlock title="Programa de pontos (Inter Loop)">
        <p className="mb-3 font-semibold text-ink">{card.points}</p>
        <p className="mb-2">Troque os pontos por:</p>
        <Bullets items={LOOP_REDEMPTIONS} />
      </DetailBlock>
      <DetailBlock title="Cashback">{card.cashback}</DetailBlock>
      <DetailBlock title="Benefícios">
        <Bullets items={card.benefits} />
      </DetailBlock>
      <DetailBlock title="Benefícios Mastercard">{card.mastercard}</DetailBlock>
      <DetailBlock title="Critérios de elegibilidade">
        <Bullets items={card.eligibility} />
      </DetailBlock>
      <DetailBlock title="Limite de crédito">
        <Bullets items={card.limit} />
      </DetailBlock>
      <DetailBlock title="Como solicitar">
        <ol className="grid gap-2">
          {card.howTo.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-inter-500 text-xs font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </DetailBlock>
      {card.extras && (
        <DetailBlock title="Observações">
          <Bullets items={card.extras} />
        </DetailBlock>
      )}
      <Disclaimer className="mt-4">
        Informações do site oficial consultadas em {CONSULTED_AT}. Condições, elegibilidade e benefícios dependem das
        regras vigentes e da análise de crédito.
      </Disclaimer>
      <div className="mt-6 flex flex-wrap gap-3">
        <LiquidButton href={card.source} variant="orange" size="md" iconRight={<Icon name="arrowUpRight" size={16} />}>
          Ver no site oficial
        </LiquidButton>
      </div>
    </div>
  )
}

export default function Cards() {
  const [selected, setSelected] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [detail, setDetail] = useState<InterCard | null>(null)
  const reduced = useReducedMotion()
  const card = CARDS[selected]

  const select = useCallback((i: number) => {
    setSelected(i)
    setFlipped(false)
  }, [])
  const toggleFlip = useCallback(() => setFlipped((f) => !f), [])

  return (
    <>
      {/* Vitrine 3D */}
      <section data-nav-theme="light" className="noise relative overflow-hidden bg-cream pb-20 pt-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[50rem] w-[50rem] animate-drift rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.42),rgba(255,140,40,0.12)_45%,transparent_68%)]" />
        <div className="pointer-events-none absolute -bottom-60 -left-40 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(255,180,110,0.35),transparent_65%)]" />
        <div className="container-x relative">
          <div className="mx-auto max-w-3xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-inter-700 ring-1 ring-white backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-inter-500" /> Cartões Inter
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-display text-[clamp(2.2rem,4.6vw,3.9rem)] font-bold leading-[1] tracking-[-0.04em]"
            >
              Cartões Inter. <span className="text-gradient-inter">Nenhum com anuidade.</span>
            </motion.h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-ink/60 sm:text-lg">
              Selecione um modelo e clique no cartão para girá-lo e ver o verso.
            </p>
          </div>

          <div className="mt-8 grid items-center gap-8 lg:mt-4 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <SceneCanvas
                className="relative h-[42vh] min-h-[280px] w-full lg:h-[56vh]"
                camera={{ position: [0, 0.15, 5.4], fov: 35 }}
                testId="cards-canvas"
                fallback={
                  <button
                    type="button"
                    onClick={toggleFlip}
                    className="mx-auto block w-[min(80%,420px)] pt-10 [perspective:1200px]"
                    aria-label={flipped ? 'Mostrar frente do cartão' : 'Mostrar verso do cartão'}
                  >
                    <div
                      className="relative transition-transform duration-700 [transform-style:preserve-3d]"
                      style={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
                    >
                      <CardImage finish={card.finish} label={card.shortName} alt={card.name} className="[backface-visibility:hidden]" />
                      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <CardImage finish={card.finish} side="back" label={card.shortName} alt={`Verso do ${card.name}`} />
                      </div>
                    </div>
                  </button>
                }
              >
                <CardsShowcaseScene
                  cards={CARDS}
                  selected={selected}
                  flipped={flipped}
                  onSelect={select}
                  onToggleFlip={toggleFlip}
                  reduced={reduced}
                />
              </SceneCanvas>

              {/* Seletor de modelos */}
              <div className="mt-2 flex flex-col items-center gap-4">
                <div
                  role="tablist"
                  aria-label="Modelos de cartão"
                  className="flex flex-wrap justify-center gap-1.5 rounded-full bg-white/60 p-1.5 ring-1 ring-white backdrop-blur-xl"
                >
                  {CARDS.map((c, i) => (
                    <button
                      key={c.id}
                      role="tab"
                      aria-selected={i === selected}
                      aria-controls="card-panel"
                      onClick={() => select(i)}
                      data-testid={`tab-${c.id}`}
                      className={cn(
                        'relative rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5',
                        i === selected ? 'text-white' : 'text-ink/60 hover:text-ink',
                      )}
                    >
                      {i === selected && (
                        <motion.span
                          layoutId="card-tab"
                          className="absolute inset-0 -z-0 rounded-full bg-gradient-to-b from-inter-400 to-inter-600 shadow-[0_8px_20px_-8px_rgba(255,122,0,0.8)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                      <span className="relative">{c.shortName}</span>
                    </button>
                  ))}
                </div>
                <LiquidButton
                  variant="light"
                  size="sm"
                  onClick={toggleFlip}
                  aria-pressed={flipped}
                  iconLeft={<Icon name="rotate" size={16} />}
                  data-testid="flip-button"
                >
                  {flipped ? 'Mostrar a frente' : 'Girar e ver o verso'}
                </LiquidButton>
                <p className="sr-only" aria-live="polite">
                  {card.name} selecionado, {flipped ? 'mostrando o verso' : 'mostrando a frente'}.
                </p>
              </div>
            </div>

            {/* Área lateral de informações */}
            <div id="card-panel" role="tabpanel" aria-label={card.name} data-testid="card-panel" data-flipped={flipped}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="glass-panel p-7 sm:p-9"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{card.annualFee}</Pill>
                    <Pill tone="white">Acabamento {card.finishLabel.toLowerCase()}</Pill>
                  </div>
                  <h2 className="mt-5 text-4xl font-semibold">{card.name}</h2>
                  <p className="mt-1 text-sm text-ink/50">{card.category}</p>
                  <p className="mt-4 text-lg text-ink/75">{card.tagline}</p>

                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/5">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Inter Loop</dt>
                      <dd className="mt-1 font-display text-lg font-semibold">{card.points.replace(' gastos no crédito', '')}</dd>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/5">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Anuidade</dt>
                      <dd className="mt-1 font-display text-lg font-semibold">R$ 0 · {card.annualFee}</dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">Como ter</p>
                    <ul className="mt-2 grid gap-1.5 text-[0.95rem] text-ink/75">
                      {card.eligibility.map((e) => (
                        <li key={e} className="flex gap-2">
                          <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-inter-500" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <LiquidButton
                      variant="orange"
                      size="md"
                      onClick={() => setDetail(card)}
                      iconRight={<Icon name="arrowRight" size={16} />}
                      data-testid="panel-details"
                    >
                      Ver detalhes
                    </LiquidButton>
                    <LiquidButton href={OFFICIAL.cards} variant="light" size="md" iconRight={<Icon name="arrowUpRight" size={16} />}>
                      Site oficial
                    </LiquidButton>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Todos os modelos */}
      <section id="modelos" data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            kicker="Modelos"
            title="Compare os quatro cartões Inter."
            subtitle="Todos sem anuidade e com o mesmo programa de pontos. O que muda é a velocidade de acúmulo e os critérios para ter cada um."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {CARDS.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.07} className="h-full">
                <TiltCard className="h-full rounded-[28px]">
                  <article className="glass-panel flex h-full flex-col p-6">
                    <CardImage finish={c.finish} label={c.shortName} alt={`Ilustração do ${c.name}`} className="transition-transform duration-700 group-hover/tilt:-translate-y-1" />
                    <h3 className="mt-6 text-2xl font-semibold">{c.name}</h3>
                    <p className="mt-1 text-sm text-ink/50">{c.category}</p>
                    <p className="mt-4 font-display text-lg font-semibold text-inter-600">{c.points.replace(' gastos no crédito', '')}</p>
                    <p className="mt-2 flex-1 text-sm text-ink/60">{c.eligibility[0]}</p>
                    <div className="mt-6">
                      <LiquidButton
                        variant="light"
                        size="sm"
                        onClick={() => setDetail(c)}
                        iconRight={<Icon name="arrowRight" size={15} />}
                        data-testid={`details-${c.id}`}
                      >
                        Ver detalhes
                      </LiquidButton>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          {/* Comparativo */}
          <Reveal className="mt-16">
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">Comparativo dos cartões Inter</caption>
                  <thead>
                    <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink/45">
                      <th scope="col" className="px-6 py-4 font-semibold">Cartão</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Anuidade</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Pontos Loop</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Pontos a cada R$ 100</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Como ter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CARDS.map((c) => (
                      <tr key={c.id} className="border-b border-ink/5 last:border-0">
                        <th scope="row" className="px-6 py-5 font-display text-base font-semibold">{c.name}</th>
                        <td className="px-6 py-5">{c.annualFee}</td>
                        <td className="px-6 py-5">1 ponto a cada R$ {c.pointsPerReal.toFixed(2).replace('.', ',')}</td>
                        <td className="px-6 py-5 font-semibold text-inter-600">{100 / c.pointsPerReal}</td>
                        <td className="px-6 py-5 text-ink/65">{c.eligibility.join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Recursos */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute -left-40 top-0 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.3),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading
            tone="dark"
            kicker="Recursos"
            title="Tudo o que sua vida financeira precisa, em um só cartão."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="glass-panel-dark h-full p-6">
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-white/50">Compatível com:</span>
              {WALLETS.map((w) => (
                <Pill key={w} tone="glass">{w}</Pill>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Como solicitar + Loop */}
      <section data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading kicker="Como solicitar" title="Habilite o crédito em três passos." />
            <ol className="mt-10 grid gap-4">
              {CARDS[0].howTo.map((s, i) => (
                <Reveal key={s} delay={i * 0.08}>
                  <li className="glass-panel flex items-start gap-5 p-6">
                    <span className="font-display text-4xl font-bold text-gradient-inter">{String(i + 1).padStart(2, '0')}</span>
                    <p className="pt-1.5 text-ink/75">{s}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={0.2}>
              <Disclaimer className="mt-6" title="Limite">
                Liberação de crédito sujeita a análise. Você pode ampliar o limite investindo no CDB Mais Limite ou na
                Poupança Mais Limite — o valor aplicado vira limite no cartão.
              </Disclaimer>
            </Reveal>
          </div>
          <div>
            <SectionHeading kicker="Inter Loop" title="Regras que vale conhecer." />
            <ul className="mt-10 grid gap-3">
              {LOOP_FACTS.map((f, i) => (
                <Reveal key={f} delay={i * 0.06}>
                  <li className="flex gap-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/5">
                    <Icon name="sparkle" size={20} className="mt-0.5 shrink-0 text-inter-500" />
                    <span className="text-ink/75">{f}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                <LiquidButton to="/shopping" variant="orange" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
                  Conheça o Inter Shop
                </LiquidButton>
                <LiquidButton to="/investimentos" variant="light" size="md">
                  Ver investimentos
                </LiquidButton>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''} kicker="Detalhes do cartão">
        {detail && <CardDetails card={detail} />}
      </Modal>
    </>
  )
}
