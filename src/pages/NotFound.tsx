import { LiquidButton } from '@/components/ui/LiquidButton'
import { Icon } from '@/components/ui/Icon'
import { InterLogo } from '@/components/brand/InterLogo'

export default function NotFound() {
  return (
    <section className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-cream px-4" data-nav-theme="light">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-inter-400/30 blur-3xl" />
      <div className="relative text-center">
        <InterLogo className="mx-auto h-10 w-auto" />
        <p className="mt-10 font-display text-8xl font-extrabold tracking-tight text-gradient-inter">404</p>
        <h1 className="mt-4 text-3xl font-semibold">Página não encontrada</h1>
        <p className="mx-auto mt-3 max-w-md text-ink/60">O endereço acessado não existe neste projeto. Escolha um caminho abaixo.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LiquidButton to="/" variant="orange" iconLeft={<Icon name="home" size={18} />}>Voltar ao início</LiquidButton>
          <LiquidButton to="/cartoes" variant="light">Ver cartões</LiquidButton>
        </div>
      </div>
    </section>
  )
}
