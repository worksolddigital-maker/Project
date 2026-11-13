import { CinematicExperience } from '@/components/three/cinematic/CinematicExperience'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { CardImage } from '@/components/ui/CardImage'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { CARDS, LOOP_REDEMPTIONS } from '@/data/cards'
import { OFFICIAL } from '@/data/sources'
import { cn } from '@/lib/cn'

interface Tile {
  to: string
  icon: IconName
  kicker: string
  title: string
  text: string
  cta: string
  className?: string
}

const TILES: Tile[] = [
  {
    to: '/shopping',
    icon: 'bag',
    kicker: 'Inter Shop',
    title: 'Shopping com cashback',
    text: 'Centenas de lojas parceiras e dinheiro de volta direto na conta.',
    cta: 'Conheça o Inter Shop',
  },
  {
    to: '/emprestimos',
    icon: 'coins',
    kicker: 'Crédito',
    title: 'Empréstimos',
    text: 'Consignado, Home Equity, antecipação do FGTS e crédito com garantia de investimentos.',
    cta: 'Simular empréstimo',
  },
  {
    to: '/investimentos',
    icon: 'trend',
    kicker: 'Investimentos',
    title: 'Do primeiro real ao patrimônio',
    text: 'CDB a partir de R$ 1,00, Tesouro Direto, fundos, bolsa e muito mais.',
    cta: 'Conheça os investimentos',
  },
  {
    to: '/sobre',
    icon: 'building',
    kicker: 'Institucional',
    title: 'Sobre o Inter',
    text: 'De Intermedium, em 1994, a um Super App com mais de 43 milhões de clientes.',
    cta: 'Conheça nossa história',
  },
]

const NUMBERS = [
  { value: '43 mi+', label: 'clientes em 2025' },
  { value: '2015', label: 'primeira conta 100% digital e gratuita do Brasil' },
  { value: '2018', label: 'primeiro banco digital a abrir capital na B3' },
  { value: 'R$ 1,2 tri', label: 'em volume entre crédito, débito e Pix em 2024' },
]

function EcosystemTile({ tile, delay }: { tile: Tile; delay: number }) {
  return (
    <Reveal delay={delay} className={cn('h-full', tile.className)}>
      <TiltCard className="h-full rounded-[28px]">
        <article className="glass-panel flex h-full flex-col p-7 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-inter-400 to-inter-600 text-white shadow-[0_12px_24px_-10px_rgba(255,122,0,0.8)]">
              <Icon name={tile.icon} size={22} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">{tile.kicker}</span>
          </div>
          <h3 className="mt-8 text-2xl font-semibold">{tile.title}</h3>
          <p className="mt-3 flex-1 leading-relaxed text-ink/60">{tile.text}</p>
          <div className="mt-7">
            <LiquidButton to={tile.to} variant="light" size="sm" iconRight={<Icon name="arrowRight" size={16} />}>
              {tile.cta}
            </LiquidButton>
          </div>
        </article>
      </TiltCard>
    </Reveal>
  )
}

export default function Home() {
  const maxPoints = 100 / Math.min(...CARDS.map((c) => c.pointsPerReal))
  return (
    <>
      <CinematicExperience />

      {/* Ecossistema */}
      <section id="solucoes" data-nav-theme="light" className="noise relative overflow-hidden bg-cream py-24 sm:py-32">
        <div className="pointer-events-none absolute -left-40 top-20 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,150,60,0.28),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading
            kicker="Soluções"
            title={
              <>
                Seu mundo financeiro <span className="text-gradient-inter">em um só lugar.</span>
              </>
            }
            subtitle="Conheça um ecossistema completo de soluções financeiras, cartões, investimentos, shopping e muito mais — cada um com sua própria página."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {/* destaque: cartões */}
            <Reveal className="lg:col-span-2 lg:row-span-2">
              <TiltCard className="h-full rounded-[32px]" max={5}>
                <article className="noise relative flex h-full min-h-[460px] flex-col overflow-hidden rounded-[32px] bg-night p-7 text-white sm:p-10">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.55),transparent_65%)]" />
                  <div className="relative flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                      <Icon name="card" size={22} />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Cartões Inter</span>
                  </div>
                  <div className="relative mt-8 grid flex-1 items-center gap-8 md:grid-cols-[1fr_1.1fr]">
                    <div>
                      <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">
                        Quatro cartões. <br /> Nenhuma anuidade.
                      </h3>
                      <p className="mt-4 max-w-sm text-white/65">
                        Gold, Platinum, Prime e Win — todos sem anuidade e com o programa de pontos Inter Loop.
                      </p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <LiquidButton to="/cartoes" variant="orange" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
                          Ver opções de cartões
                        </LiquidButton>
                      </div>
                    </div>
                    <div className="relative mx-auto h-56 w-full max-w-sm sm:h-64 [perspective:1200px]">
                      {(['black', 'white', 'orange'] as const).map((f, i) => (
                        <div
                          key={f}
                          className="absolute left-1/2 top-1/2 w-[78%]"
                          style={{
                            transform: `translate(-50%, -50%) translate(${(i - 1) * 26}px, ${(i - 1) * -22}px) rotateX(18deg) rotateZ(${-14 + i * 6}deg)`,
                            zIndex: i,
                          }}
                        >
                          <div className="animate-float" style={{ animationDelay: `${i * -1.4}s` }}>
                            <CardImage
                              finish={f}
                              alt={`Cartão Inter ${f === 'orange' ? 'laranja' : f === 'black' ? 'preto' : 'branco'}`}
                              width={520}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
            {TILES.map((t, i) => (
              <EcosystemTile key={t.to} tile={t} delay={0.08 * (i + 1)} />
            ))}
          </div>
        </div>
      </section>

      {/* Inter Loop */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.28),transparent_65%)]" />
        <div className="container-x relative grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              tone="dark"
              kicker="Inter Loop"
              title="Cada compra no crédito vira pontos."
              subtitle="O programa de pontos do Inter é o mesmo para todos os cartões — o que muda é a velocidade de acúmulo."
            />
            <Reveal delay={0.1}>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {LOOP_REDEMPTIONS.map((r) => (
                  <li key={r} className="flex items-start gap-3 text-sm text-white/75">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-inter-500/20 text-inter-300">
                      <Icon name="check" size={13} strokeWidth={2.4} />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <LiquidButton href={OFFICIAL.loop} variant="glass" size="sm" iconRight={<Icon name="arrowUpRight" size={15} />}>
                  Regras no site oficial
                </LiquidButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="glass-panel-dark p-6 sm:p-9">
              <p className="text-sm text-white/60">Pontos Loop acumulados a cada R$ 100,00 gastos no crédito</p>
              <div className="mt-7 grid gap-5">
                {CARDS.map((c) => {
                  const pts = 100 / c.pointsPerReal
                  return (
                    <div key={c.id}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="font-display font-semibold">{c.name}</span>
                        <span className="font-display text-2xl font-semibold tabular-nums text-inter-300">
                          {pts} <span className="text-sm font-medium text-white/50">pontos</span>
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <Reveal y={0} blur={false} className="h-full">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-inter-600 via-inter-500 to-inter-300 shadow-[0_0_20px_rgba(255,122,0,0.6)]"
                            style={{ width: `${(pts / maxPoints) * 100}%` }}
                          />
                        </Reveal>
                      </div>
                      <p className="mt-1.5 text-xs text-white/45">{c.points}</p>
                    </div>
                  )
                })}
              </div>
              <Disclaimer tone="dark" className="mt-7" title="Cálculo">
                Conversão direta das taxas de acúmulo publicadas na página oficial de cartões. Nos cartões Gold,
                Platinum e Prime é necessário ter o Débito Automático da fatura ativo.
              </Disclaimer>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Números */}
      <section data-nav-theme="light" className="relative bg-cream py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            align="center"
            kicker="Trajetória"
            title="Uma história escrita em números."
            subtitle="Marcos divulgados pelo Inter&Co em seu site de Relações com Investidores."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map((n, i) => (
              <Reveal key={n.label} delay={i * 0.08}>
                <div className="glass-panel h-full p-7 text-center">
                  <p className="font-display text-4xl font-bold tracking-tight text-gradient-inter sm:text-5xl">{n.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">{n.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <LiquidButton to="/sobre" variant="light" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
              Ver linha do tempo completa
            </LiquidButton>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden py-24 text-white sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_10%,#FFB061_0%,#FF7A00_38%,#D45200_75%,#7A2A00_100%)]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-[30rem] w-[30rem] rounded-full bg-white/20 blur-3xl" />
        <div className="container-x relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] sm:text-6xl">
              Explore cada parte do ecossistema.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/85">
              Navegue pelas páginas para conhecer cartões, shopping, crédito, investimentos e a história do Inter.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LiquidButton to="/cartoes" variant="glass" size="lg">Cartões</LiquidButton>
              <LiquidButton to="/shopping" variant="glass" size="lg">Shopping</LiquidButton>
              <LiquidButton to="/emprestimos" variant="glass" size="lg">Empréstimos</LiquidButton>
              <LiquidButton to="/investimentos" variant="glass" size="lg">Investimentos</LiquidButton>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
