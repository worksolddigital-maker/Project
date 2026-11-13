import { InterLogo } from '@/components/brand/InterLogo'

export function PageLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-cream" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <InterLogo className="h-9 w-auto animate-pulse" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-inter-100">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,#FF7A00,transparent)] bg-[length:200%_100%]" />
        </div>
        <span className="sr-only">Carregando…</span>
      </div>
    </div>
  )
}
