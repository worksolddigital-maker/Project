import { useState } from 'react'
import { PageHero } from '@/components/layout/PageHero'
import { SceneCanvas } from '@/components/three/SceneCanvas'
import { CoinsScene } from '@/components/three/HeroScenes'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { Modal } from '@/components/ui/Modal'
import { Accordion } from '@/components/ui/Accordion'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { LoanSimulator } from '@/components/ui/LoanSimulator'
import { LOANS, LOAN_FAQ, type LoanModality } from '@/data/loans'
import { CONSULTED_AT } from '@/data/sources'
import { scrollToElement } from '@/lib/smooth'
import { useReducedMotion } from '@/lib/useMedia'

const STEPS = [
  { t: 'Simule', d: 'Informe valor e prazo no app ou no site do Inter para ver a proposta da modalidade.' },
  { t: 'Envie seus dados', d: 'Preencha os dados pessoais e os documentos solicitados.' },
  { t: 'Análise', d: 'O Inter avalia seu perfil, a margem ou a garantia, conforme a modalidade.' },
  { t: 'Revise e assine', d: 'Confira taxas, CET e prazos, e assine digitalmente.' },
  { t: 'Receba', d: 'O valor é liberado na conta após a aprovação e a assinatura.' },
]

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-t border-ink/10 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-inter-700">{title}</h3>
      <ul className="grid gap-2 text-[0.95rem] leading-relaxed text-ink/75">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-inter-500" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Loans() {
  const reduced = useReducedMotion()
  const [detail, setDetail] = useState<LoanModality | null>(null)

  return (
    <>
      <PageHero
        kicker="Empréstimos"
        title={
          <>
            Crédito com <span className="text-gradient-inter">clareza</span> do começo ao fim.
          </>
        }
        subtitle="Conheça as modalidades de empréstimo do Inter, entenda quem pode contratar e simule cenários de forma ilustrativa."
        actions={
          <>
            <LiquidButton
              variant="orange"
              size="lg"
              onClick={() => scrollToElement('#simulador')}
              iconRight={<Icon name="calculator" size={18} />}
              data-testid="loans-cta-sim"
            >
              Simular agora
            </LiquidButton>
            <LiquidButton variant="light" size="lg" onClick={() => scrollToElement('#modalidades')}>
              Ver modalidades
            </LiquidButton>
          </>
        }
        visual={
          <SceneCanvas className="absolute inset-0" camera={{ position: [0, 0.6, 5.2], fov: 35 }} testId="loans-canvas">
            <CoinsScene reduced={reduced} />
          </SceneCanvas>
        }
      />

      {/* Modalidades */}
      <section id="modalidades" data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            kicker="Modalidades"
            title="Um crédito para cada necessidade."
            subtitle="Toque em uma modalidade para ver quem pode contratar, condições, taxas divulgadas e prazos."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LOANS.map((l, i) => (
              <Reveal key={l.id} delay={(i % 3) * 0.07}>
                <TiltCard className="h-full rounded-[28px]">
                  <article className="glass-panel flex h-full flex-col p-7">
                    <span className="w-fit rounded-full bg-inter-100 px-3 py-1 text-xs font-semibold text-inter-700">{l.short}</span>
                    <h3 className="mt-5 text-2xl font-semibold">{l.name}</h3>
                    <p className="mt-3 flex-1 text-ink/65">{l.summary}</p>
                    <p className="mt-5 text-sm font-medium text-ink/80">{l.rates[0]}</p>
                    <div className="mt-6">
                      <LiquidButton
                        variant="light"
                        size="sm"
                        onClick={() => setDetail(l)}
                        iconRight={<Icon name="arrowRight" size={15} />}
                        data-testid={`loan-${l.id}`}
                      >
                        Ver condições
                      </LiquidButton>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute right-0 top-0 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.28),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading tone="dark" kicker="Como funciona" title="Contratação em cinco etapas." subtitle="O fluxo varia por modalidade, mas segue a mesma lógica — 100% digital ou com apoio de especialistas." />
          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.06}>
                <li className="glass-panel-dark relative h-full p-6">
                  <span className="font-display text-4xl font-bold text-inter-400">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm text-white/60">{s.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>

          {/* Taxas, quem pode e prazos */}
          <Reveal className="mt-16">
            <div className="glass-panel-dark overflow-hidden">
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[760px] text-left text-sm">
                  <caption className="px-6 pt-6 text-left font-display text-xl font-semibold text-white">
                    Quem pode solicitar, taxas e prazos
                  </caption>
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                      <th scope="col" className="px-6 py-4 font-semibold">Modalidade</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Quem pode</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Taxas e encargos divulgados</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Prazos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOANS.map((l) => (
                      <tr key={l.id} className="border-b border-white/5 align-top last:border-0">
                        <th scope="row" className="px-6 py-5 font-display text-base font-semibold">{l.name}</th>
                        <td className="px-6 py-5 text-white/65">{l.who[0]}</td>
                        <td className="px-6 py-5 text-white/80">{l.rates.join(' ')}</td>
                        <td className="px-6 py-5 text-white/65">{l.terms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/45">
              Taxas “a partir de” são os valores mínimos publicados no site oficial (consulta em {CONSULTED_AT}); a taxa
              final depende da análise. Onde o Inter não publica taxa, indicamos que ela é personalizada.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Simulador */}
      <section id="simulador" data-nav-theme="light" className="noise relative overflow-hidden bg-cream py-24 sm:py-28">
        <div className="pointer-events-none absolute -left-40 top-20 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,150,60,0.28),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading
            kicker="Simulação ilustrativa"
            title="Entenda o peso de cada escolha."
            subtitle="Altere valor, prazo e taxa e veja a parcela estimada. Não é uma proposta — é uma ferramenta para comparar cenários."
          />
          <Reveal delay={0.1} className="mt-12">
            <LoanSimulator />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading kicker="Perguntas frequentes" title="Dúvidas sobre crédito." />
            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap gap-3">
                <LiquidButton to="/investimentos" variant="orange" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
                  Investimentos como garantia
                </LiquidButton>
                <LiquidButton to="/cartoes" variant="light" size="md">
                  Ver cartões
                </LiquidButton>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Accordion items={LOAN_FAQ} />
          </Reveal>
        </div>
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''} kicker="Modalidade de empréstimo">
        {detail && (
          <div data-testid={`loan-details-${detail.id}`}>
            <p className="mb-6 text-lg text-ink/75">{detail.summary}</p>
            <Section title="Quem pode solicitar" items={detail.who} />
            <Section title="Condições" items={detail.conditions} />
            <Section title="Taxas e encargos" items={detail.rates} />
            <Section title="Prazos" items={[detail.terms]} />
            <Section title="Como contratar" items={detail.howTo} />
            <Disclaimer className="mt-4">
              Informações do site oficial consultadas em {CONSULTED_AT}. As condições reais dependem da análise e da oferta
              disponibilizada pelo Inter.
            </Disclaimer>
            <div className="mt-6 flex flex-wrap gap-3">
              <LiquidButton href={detail.source} variant="orange" size="md" iconRight={<Icon name="arrowUpRight" size={16} />}>
                Ver no site oficial
              </LiquidButton>
              <LiquidButton
                variant="light"
                size="md"
                onClick={() => {
                  setDetail(null)
                  window.setTimeout(() => scrollToElement('#simulador'), 350)
                }}
              >
                Ir para o simulador
              </LiquidButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
