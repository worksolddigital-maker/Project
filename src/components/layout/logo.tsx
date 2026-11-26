import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line-strong bg-gradient-to-b from-white/[0.09] to-white/[0.02]",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
        <path d="M5 22 L11 15 L16 18.5 L26 8" fill="none" stroke="var(--color-pos)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="8" r="2.4" fill="var(--color-fg)" />
      </svg>
    </span>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-fg">Trading Desk</span>
          <span className="block text-[10.5px] tracking-[0.14em] text-subtle uppercase">Performance Suite</span>
        </span>
      )}
    </span>
  );
}
