import { useState } from 'react'
import { PageHero } from '@/components/layout/PageHero'
import { SceneCanvas } from '@/components/three/SceneCanvas'
import { GrowthScene } from '@/components/three/HeroScenes'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { Modal } from '@/components/ui/Modal'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { Accordion } from '@/components/ui/Accordion'
import { INVESTMENTS, RISK_NOTES, type InvestmentCategory } from '@/data/investments'
import { CONSULTED_AT } from '@/data/sources'
import { scrollToElement } from '@/lib/smooth'
import { useReducedMotion } from '@/lib/useMedia'
import { cn } from '@/lib/cn'

const FACTS = [
  { k: 'R$ 1,00', v: 'investimento inicial no CDB' },
  { k: 'R$ 0', v: 'de corretagem na renda variável' },
  { k: 'Sem taxa', v: 'de administração no Tesouro Direto' },
  { k: 'R$ 100', v: 'para começar em fundos' },
]

const GLOSSARY = [
  {
    q: 'O que é o CDI?',
    a: 'É a taxa de referência das operações entre bancos e fica muito próxima da Selic. Muitos títulos pós-fixados rendem um percentual do CDI (por exemplo, “100% do CDI”).',
  },
  {
    q: 'O que é o FGC?',
    a: 'O Fundo Garantidor de Créditos protege depósitos e alguns investimentos bancários (como CDB, LCI, LCA e poupança) em caso de falha da instituição, dentro dos limites e regras definidos pelo próprio fundo.',
  },
  {
    q: 'O que é IR regressivo?',
    a: 'É a tabela de Imposto de Renda em que a alíquota cai conforme o tempo de aplicação: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias, cobrada sobre o rendimento.',
  },
  {
    q: 'O que é liquidez?',
    a: 'É a facilidade de transformar o investimento em dinheiro. Liquidez diária permite resgatar em qualquer dia útil; “no vencimento” significa que o valor só fica disponível na data final do título.',
  },
  {
    q: 'O que é perfil de investidor (suitability)?',
    a: 'É um questionário obrigatório que identifica seus objetivos e sua tolerância a risco, para que os produtos oferecidos sejam adequados ao seu perfil.',
  },
]

function RiskMeter({ score, dark = false }: { score: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Risco ${score} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-5 rounded-full',
            i <= score ? 'bg-gradient-to-r from-inter-400 to-inter-600' : dark ? 'bg-white/15' : 'bg-ink/10',
          )}
        />
      ))}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-ink/10 py-4 first:border-t-0 sm:grid-cols-[160px_1fr] sm:gap-6">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-inter-700">{label}</dt>
      <dd className="text-[0.95rem] leading-relaxed text-ink/75">{value}</dd>
    </div>
  )
}

export default function Investments() {
  const reduced = useReducedMotion()
  const [detail, setDetail] = useState<InvestmentCategory | null>(null)

  return (
    <>
      <PageHero
        tone="dark"
        kicker="Investimentos"
        title={
          <>
            Seu dinheiro, <span className="text-gradient-inter">trabalhando por você.</span>
          </>
        }
        subtitle="Renda fixa, Tesouro Direto, fundos, bolsa e muito mais em uma única plataforma. Entenda cada modalidade, seus riscos e sua liquidez antes de investir."
        actions={
          <>
            <LiquidButton
              variant="orange"
              size="lg"
              onClick={() => scrollToElement('#categorias')}
              iconRight={<Icon name="arrowDown" size={18} />}
            >
              Explorar categorias
            </LiquidButton>
            <LiquidButton variant="glass" size="lg" onClick={() => scrollToElement('#comparativo')}>
              Comparar riscos
            </LiquidButton>
          </>
        }
        visual={
          <SceneCanvas className="absolute inset-0" camera={{ position: [0, 0.3, 6.2], fov: 35 }} testId="invest-canvas">
            <GrowthScene reduced={reduced} />
          </SceneCanvas>
        }
      >
        <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-xl">
          {FACTS.map((f) => (
            <div key={f.v} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <p className="font-display text-2xl font-bold text-inter-300">{f.k}</p>
              <p className="mt-1 text-xs text-white/55">{f.v}</p>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Categorias */}
      <section id="categorias" data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            kicker="Ecossistema de investimentos"
            title="Conceitos simples para decisões conscientes."
            subtitle="Cada categoria tem uma explicação acessível, o nível de risco, a liquidez e como a rentabilidade é formada — sem promessas de retorno."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INVESTMENTS.map((inv, i) => (
              <Reveal key={inv.id} delay={(i % 3) * 0.07} className={cn(i === 0 && 'lg:col-span-2')}>
                <TiltCard className="h-full rounded-[28px]">
                  <article
                    className={cn(
                      'flex h-full flex-col rounded-[28px] p-7',
                      i === 0 ? 'noise relative overflow-hidden bg-night text-white' : 'glass-panel',
                    )}
                  >
                    {i === 0 && (
                      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.45),transparent_65%)]" />
                    )}
                    <div className="relative flex items-start justify-between gap-4">
                      <span
                        className={cn(
                          'grid h-12 w-12 place-items-center rounded-2xl',
                          i === 0 ? 'bg-white/10 text-inter-300 ring-1 ring-white/15' : 'bg-gradient-to-br from-inter-400 to-inter-600 text-white',
                        )}
                      >
                        <Icon name={inv.icon} size={22} />
                      </span>
                      <div className="text-right">
                        <p className={cn('text-[0.65rem] font-semibold uppercase tracking-[0.16em]', i === 0 ? 'text-white/45' : 'text-ink/40')}>
                          Risco · {inv.risk}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <RiskMeter score={inv.riskScore} dark={i === 0} />
                        </div>
                      </div>
                    </div>
                    <p className={cn('relative mt-7 text-xs font-semibold uppercase tracking-[0.16em]', i === 0 ? 'text-inter-300' : 'text-inter-700')}>
                      {inv.kicker}
                    </p>
                    <h3 className="relative mt-2 text-2xl font-semibold">{inv.title}</h3>
                    <p className={cn('relative mt-3 flex-1', i === 0 ? 'text-white/70' : 'text-ink/65')}>{inv.summary}</p>
                    <dl className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className={i === 0 ? 'text-white/45' : 'text-ink/45'}>Mínimo</dt>
                        <dd className="font-medium">{inv.minimum.split(' (')[0]}</dd>
                      </div>
                      <div>
                        <dt className={i === 0 ? 'text-white/45' : 'text-ink/45'}>Liquidez</dt>
                        <dd className="font-medium">{inv.liquidityShort}</dd>
                      </div>
                    </dl>
                    <div className="relative mt-6">
                      <LiquidButton
                        variant={i === 0 ? 'glass' : 'light'}
                        size="sm"
                        onClick={() => setDetail(inv)}
                        iconRight={<Icon name="arrowRight" size={15} />}
                        data-testid={`invest-${inv.id}`}
                      >
                        Saiba mais
                      </LiquidButton>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section id="comparativo" data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.25),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading
            tone="dark"
            kicker="Riscos, liquidez e rentabilidade"
            title="Compare antes de escolher."
            subtitle="Risco, liquidez e rentabilidade andam juntos: em geral, mais retorno potencial significa mais risco ou menos liquidez."
          />
          <Reveal className="mt-12">
            <div className="glass-panel-dark overflow-hidden">
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[860px] text-left text-sm">
                  <caption className="sr-only">Comparativo de categorias de investimento</caption>
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                      <th scope="col" className="px-6 py-4 font-semibold">Categoria</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Risco</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Liquidez</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Rentabilidade</th>
                      <th scope="col" className="px-6 py-4 font-semibold">Garantia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INVESTMENTS.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/5 align-top last:border-0">
                        <th scope="row" className="px-6 py-5 font-display text-base font-semibold">{inv.title}</th>
                        <td className="px-6 py-5">
                          <RiskMeter score={inv.riskScore} dark />
                          <span className="mt-2 block text-xs text-white/50">{inv.risk}</span>
                        </td>
                        <td className="px-6 py-5 text-white/65">{inv.liquidity}</td>
                        <td className="px-6 py-5 text-white/65">{inv.returns}</td>
                        <td className="px-6 py-5 text-white/65">{inv.guarantee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <Disclaimer tone="dark" title="Avisos">
              {RISK_NOTES.join(' ')} O nível de risco exibido é uma indicação didática deste projeto, não uma
              classificação oficial do Inter.
            </Disclaimer>
          </Reveal>
        </div>
      </section>

      {/* Glossário */}
      <section data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading kicker="Glossário" title="Termos que você vai encontrar." />
            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-wrap gap-3">
                <LiquidButton to="/emprestimos" variant="orange" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
                  Crédito para investidores
                </LiquidButton>
                <LiquidButton to="/cartoes" variant="light" size="md">
                  Conheça o Inter Win
                </LiquidButton>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Accordion items={GLOSSARY} />
          </Reveal>
        </div>
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''} kicker={detail?.kicker}>
        {detail && (
          <div data-testid={`invest-details-${detail.id}`}>
            <p className="text-lg leading-relaxed text-ink/75">{detail.concept}</p>
            <div className="my-6 flex flex-wrap items-center gap-3 rounded-2xl bg-inter-50 p-4 ring-1 ring-inter-200">
              <span className="text-sm font-semibold">Risco: {detail.risk}</span>
              <RiskMeter score={detail.riskScore} />
            </div>
            <dl>
              <Row label="Investimento mínimo" value={detail.minimum} />
              <Row label="Liquidez" value={detail.liquidity} />
              <Row label="Rentabilidade" value={detail.returns} />
              <Row label="Impostos" value={detail.taxes} />
              <Row label="Garantia" value={detail.guarantee} />
            </dl>
            <Disclaimer className="mt-6">
              Conteúdo educativo baseado em informações do site oficial (consulta em {CONSULTED_AT}). Não é recomendação de
              investimento nem promessa de rentabilidade.
            </Disclaimer>
            <div className="mt-6">
              <LiquidButton href={detail.source} variant="orange" size="md" iconRight={<Icon name="arrowUpRight" size={16} />}>
                Ver no site oficial
              </LiquidButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
