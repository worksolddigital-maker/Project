import { useMemo, useState } from 'react'
import { PageHero } from '@/components/layout/PageHero'
import { SceneCanvas } from '@/components/three/SceneCanvas'
import { ShopScene } from '@/components/three/HeroScenes'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { TiltCard } from '@/components/ui/TiltCard'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { ProductArt } from '@/components/ui/ProductArt'
import { Pill } from '@/components/ui/Pill'
import {
  CASHBACK_EXAMPLE,
  CASHBACK_RULES,
  CASHBACK_SNAPSHOT,
  SHOP_BENEFITS,
  SHOP_CATEGORIES,
  SHOP_DEPARTMENTS,
  SHOP_INTRO,
  SHOP_STEPS,
  SHOP_TIPS,
} from '@/data/shop'
import { CONSULTED_AT, OFFICIAL } from '@/data/sources'
import { formatBRL } from '@/lib/format'
import { scrollToElement } from '@/lib/smooth'
import { useReducedMotion } from '@/lib/useMedia'

const BENEFIT_ICONS: IconName[] = ['wallet', 'star', 'gift', 'users']

function CashbackCalculator() {
  const [price, setPrice] = useState(CASHBACK_EXAMPLE.price)
  const [pct, setPct] = useState(CASHBACK_EXAMPLE.percent)
  const back = useMemo(() => (price * pct) / 100, [price, pct])
  const fill = ((pct - 1) / (40 - 1)) * 100
  return (
    <div className="glass-panel p-6 sm:p-8" data-testid="cashback-calculator">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-inter-700">Como o cashback é calculado</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/60">Valor do produto</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display font-semibold text-ink/40">R$</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={100000}
              step={1}
              value={price}
              onChange={(e) => setPrice(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))}
              className="glass-input pl-12"
              aria-label="Valor do produto em reais"
              data-testid="cashback-price"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-2 flex justify-between text-sm font-medium text-ink/60">
            Percentual de cashback <strong className="text-ink">{pct}%</strong>
          </span>
          <input
            type="range"
            min={1}
            max={40}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="range mt-4"
            style={{ ['--fill' as string]: `${fill}%` }}
            aria-label="Percentual de cashback"
            data-testid="cashback-pct"
          />
        </label>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-inter-50 p-4 ring-1 ring-inter-200">
          <p className="text-xs text-ink/50">Você recebe de volta</p>
          <p className="font-display text-2xl font-bold text-inter-600" data-testid="cashback-value">{formatBRL(back)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/5">
          <p className="text-xs text-ink/50">Na prática, o produto sai por</p>
          <p className="font-display text-2xl font-bold">{formatBRL(Math.max(0, price - back))}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-ink/55">
        Exemplo oficial: {CASHBACK_EXAMPLE.text} O simulador é educativo — o percentual real é informado junto a cada
        produto ou loja e pode variar sem aviso prévio.
      </p>
    </div>
  )
}

export default function Shopping() {
  const reduced = useReducedMotion()
  return (
    <>
      <PageHero
        kicker="Inter Shop"
        title={
          <>
            Compre com <span className="text-gradient-inter">dinheiro de volta.</span>
          </>
        }
        subtitle={SHOP_INTRO.what}
        actions={
          <>
            <LiquidButton
              variant="orange"
              size="lg"
              onClick={() => scrollToElement('#categorias')}
              iconRight={<Icon name="arrowDown" size={18} />}
            >
              Ver categorias
            </LiquidButton>
            <LiquidButton href={OFFICIAL.shop} variant="light" size="lg" iconRight={<Icon name="arrowUpRight" size={18} />}>
              Abrir o Shopping do Inter
            </LiquidButton>
          </>
        }
        visual={
          <SceneCanvas className="absolute inset-0" camera={{ position: [0, 0.4, 5.6], fov: 35 }} testId="shop-canvas">
            <ShopScene reduced={reduced} />
          </SceneCanvas>
        }
      />

      {/* O que é + como funciona */}
      <section data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <SectionHeading kicker="O que é" title="Um shopping inteiro dentro do Super App." />
            <Reveal delay={0.1}>
              <div className="grid gap-3 text-ink/70">
                <p>{SHOP_INTRO.partners}</p>
                <p>{SHOP_INTRO.since}</p>
              </div>
            </Reveal>
          </div>

          <h3 className="mt-16 text-2xl font-semibold">Como comprar</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {SHOP_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="glass-panel h-full p-7">
                  <span className="font-display text-5xl font-bold text-gradient-inter">{String(i + 1).padStart(2, '0')}</span>
                  <h4 className="mt-4 font-display text-xl font-semibold">{s.title}</h4>
                  <p className="mt-2 text-ink/65">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cashback */}
      <section data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              kicker="Cashback"
              title="Parte do valor volta para a sua conta."
              subtitle="O cashback é calculado sobre o valor líquido do produto — frete e juros não entram na conta."
            />
            <Reveal delay={0.1} className="mt-10">
              <div className="glass-panel overflow-hidden">
                <p className="border-b border-ink/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                  Quando o cashback é creditado
                </p>
                <ul>
                  {CASHBACK_RULES.map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-6 border-b border-ink/5 px-6 py-4 last:border-0">
                      <span className="text-sm text-ink/70">{r.label}</span>
                      <span className="shrink-0 text-right font-display text-sm font-semibold text-inter-600">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-4 text-sm text-ink/55">
                Para não correntistas, o percentual creditado pode ser igual, mas geralmente corresponde a 70% do
                percentual indicado para a loja.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <CashbackCalculator />
          </Reveal>
        </div>
      </section>

      {/* Benefícios + ofertas */}
      <section data-nav-theme="dark" className="noise relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <div className="pointer-events-none absolute -right-40 top-0 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.3),transparent_65%)]" />
        <div className="container-x relative">
          <SectionHeading tone="dark" kicker="Benefícios" title="Vantagens que somam a cada compra." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHOP_BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06}>
                <div className="glass-panel-dark h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-inter-500/20 text-inter-300">
                    <Icon name={BENEFIT_ICONS[i]} size={20} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <SectionHeading
              tone="dark"
              kicker="Ofertas e promoções"
              title="As ofertas mudam todos os dias."
              subtitle="Percentuais e preços são definidos com as lojas parceiras e exibidos no próprio Shopping do Inter. Abaixo, um retrato de ofertas relâmpago vistas no site oficial."
            />
            <Reveal delay={0.1}>
              <div className="glass-panel-dark p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Observado em {CASHBACK_SNAPSHOT.date}</p>
                  <Pill tone="glass">Retrato pontual</Pill>
                </div>
                <ul className="mt-6 grid gap-3">
                  {CASHBACK_SNAPSHOT.items.map((it) => (
                    <li key={it.store} className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-5 py-4 ring-1 ring-white/10">
                      <span className="font-medium">{it.store}</span>
                      <span className="font-display text-lg font-semibold text-inter-300">{it.value} de cashback</span>
                    </li>
                  ))}
                </ul>
                <Disclaimer tone="dark" className="mt-6">
                  Exemplos de percentuais “até X%” exibidos em ofertas relâmpago de shopping.inter.co na data indicada. Não
                  são ofertas vigentes garantidas — confira as condições atualizadas antes de comprar.
                </Disclaimer>
                <div className="mt-6">
                  <LiquidButton href={OFFICIAL.shop} variant="orange" size="md" iconRight={<Icon name="arrowUpRight" size={16} />}>
                    Ver ofertas de hoje
                  </LiquidButton>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Categorias / vitrine */}
      <section id="categorias" data-nav-theme="light" className="bg-cream py-24 sm:py-28">
        <div className="container-x">
          <SectionHeading
            kicker="Categorias de produtos"
            title="Uma vitrine para cada desejo."
            subtitle="Preços e cashback variam por loja e campanha e são exibidos em tempo real no Shopping do Inter — por isso não os reproduzimos aqui."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SHOP_CATEGORIES.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 0.07}>
                <TiltCard className="h-full rounded-[28px]">
                  <article className="glass-panel flex h-full flex-col overflow-hidden p-0" data-testid={`product-${c.id}`}>
                    <div className="relative grid h-48 place-items-center bg-[radial-gradient(circle_at_50%_40%,#fff_0%,#ffe8d3_60%,#ffd9b8_100%)]">
                      <ProductArt
                        art={c.art}
                        className="h-40 w-auto transition-transform duration-700 ease-[var(--ease-cinematic)] group-hover/tilt:-translate-y-2 group-hover/tilt:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-semibold">{c.name}</h3>
                      <p className="mt-2 flex-1 text-sm text-ink/60">{c.description}</p>
                      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-ink/45">Preço</dt>
                          <dd className="font-medium">Consulte no Shop</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink/45">Cashback</dt>
                          <dd className="font-medium text-inter-600">{c.cashback}</dd>
                        </div>
                      </dl>
                      <div className="mt-6">
                        <LiquidButton href={c.url} variant="light" size="sm" iconRight={<Icon name="arrowUpRight" size={15} />}>
                          Conhecer a oferta
                        </LiquidButton>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-14">
            <p className="mb-4 text-sm font-semibold text-ink/50">Departamentos disponíveis</p>
            <div className="flex flex-wrap gap-2">
              {SHOP_DEPARTMENTS.map((d) => (
                <Pill key={d} tone="white">{d}</Pill>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dicas */}
      <section data-nav-theme="light" className="bg-mist py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <SectionHeading
            kicker="Fique atento"
            title="Como garantir o seu cashback."
            subtitle="Orientações publicadas nas perguntas frequentes do Shopping do Inter."
          />
          <div>
            <ul className="grid gap-3">
              {SHOP_TIPS.map((t, i) => (
                <Reveal key={t} delay={i * 0.05}>
                  <li className="flex gap-4 rounded-2xl bg-white/80 p-5 ring-1 ring-ink/5">
                    <Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-inter-500" />
                    <span className="text-ink/75">{t}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
            <Disclaimer className="mt-6">
              Conteúdo baseado no Shopping do Inter (consultado em {CONSULTED_AT}). Este projeto não vende produtos nem
              processa compras — os botões levam ao site oficial.
            </Disclaimer>
            <div className="mt-8 flex flex-wrap gap-3">
              <LiquidButton to="/cartoes" variant="orange" size="md" iconRight={<Icon name="arrowRight" size={16} />}>
                Ganhe pontos com os cartões
              </LiquidButton>
              <LiquidButton to="/investimentos" variant="light" size="md">
                Conheça os investimentos
              </LiquidButton>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
