import { Link } from 'react-router-dom'
import { InterLogo } from '@/components/brand/InterLogo'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS } from '@/routes'
import { CONSULTED_AT, SOURCE_LIST } from '@/data/sources'

export function Footer() {
  return (
    <footer data-nav-theme="dark" className="noise relative overflow-hidden bg-night text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-inter-600/25 blur-[120px]" />
      <div className="container-x relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.3fr_1fr_1.4fr]">
        <div>
          <InterLogo tone="white" className="h-9 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            Uma experiência digital conceitual que apresenta o ecossistema do Inter: cartões, shopping, crédito,
            investimentos e a história da instituição.
          </p>
          <div className="mt-6 rounded-2xl bg-white/[0.05] p-4 text-xs leading-relaxed text-white/55 ring-1 ring-white/10">
            <strong className="text-white/80">Projeto não oficial.</strong> Este site não é o site do Banco Inter
            S.A., não possui vínculo com a instituição, não oferece produtos, não tem área de login e não solicita
            dados pessoais ou bancários. Marcas e nomes pertencem aos respectivos titulares.
          </div>
        </div>

        <nav aria-label="Rodapé">
          <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Navegação</h2>
          <ul className="grid gap-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="group inline-flex items-center gap-2 text-white/75 transition hover:text-white">
                  <span className="h-px w-3 bg-inter-500 transition-all group-hover:w-6" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            Fontes oficiais consultadas
          </h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {SOURCE_LIST.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 transition hover:text-inter-300"
                >
                  {s.label}
                  <Icon name="arrowUpRight" size={13} />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-white/40">
            Informações consultadas em {CONSULTED_AT}. Condições, taxas e benefícios podem mudar — confira sempre no
            Super App ou no site oficial.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} · Experiência conceitual de design e tecnologia</span>
          <span>React · Three.js · GSAP ScrollTrigger · Tailwind CSS</span>
        </div>
      </div>
    </footer>
  )
}
