"use client";

import { Activity, CalendarDays, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { gsap, shouldReduceMotion, SplitText, useGSAP } from "@/lib/gsap";

const FEATURES = [
  { icon: Activity, label: "Lucro, prejuízo e retorno calculados automaticamente" },
  { icon: ShieldCheck, label: "Alertas quando seus limites de risco são atingidos" },
  { icon: CalendarDays, label: "Calendário de resultados e diário de disciplina" },
  { icon: FileSpreadsheet, label: "Importação e exportação em CSV e Excel" },
];

/** Decorative candles: heights only, no values — purely illustrative. */
const CANDLES = [38, 52, 44, 61, 57, 70, 64, 78, 72, 88, 81, 95, 90, 104, 99, 116];

function HeroArt() {
  return (
    <svg viewBox="0 0 560 260" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-pos)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-pos)" stopOpacity="0" />
        </linearGradient>
        <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="hero-grid" stroke="rgb(255 255 255 / 0.05)">
        {[50, 100, 150, 200].map((y) => (
          <line key={y} x1="0" x2="560" y1={y} y2={y} />
        ))}
      </g>
      <g className="hero-candles">
        {CANDLES.map((h, i) => {
          const x = 18 + i * 34;
          const up = i % 4 !== 2;
          return (
            <g key={i} className="hero-candle" style={{ transformOrigin: `${x + 6}px 240px` }}>
              <line x1={x + 6} x2={x + 6} y1={240 - h - 14} y2={240 - h + 40} stroke={up ? "rgb(30 211 138 / 0.35)" : "rgb(245 71 92 / 0.35)"} />
              <rect x={x} y={240 - h} width="12" height="34" rx="2" fill={up ? "rgb(30 211 138 / 0.28)" : "rgb(245 71 92 / 0.3)"} />
            </g>
          );
        })}
      </g>
      <path className="hero-area" d="M0 210 C 70 200, 110 170, 160 176 S 250 130, 300 136 S 390 80, 440 86 S 520 40, 560 30 L 560 260 L 0 260 Z" fill="url(#hero-area)" />
      <path
        className="hero-line"
        d="M0 210 C 70 200, 110 170, 160 176 S 250 130, 300 136 S 390 80, 440 86 S 520 40, 560 30"
        fill="none"
        stroke="var(--color-pos)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#hero-glow)"
      />
      <circle className="hero-dot" cx="560" cy="30" r="5" fill="var(--color-fg)" />
    </svg>
  );
}

export function AuthScreen({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (shouldReduceMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      let split: SplitText | null = null;

      tl.from(".auth-hero-frame", { opacity: 0, y: 30, scale: 0.98, duration: 1.2 })
        .from(".hero-candle", { scaleY: 0, opacity: 0, stagger: 0.035, duration: 0.9 }, 0.2)
        .from(".hero-line", { drawSVG: "0%", duration: 1.8, ease: "power2.inOut" }, 0.35)
        .from(".hero-area", { opacity: 0, duration: 1.2 }, 0.9)
        .from(".hero-dot", { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(3)" }, 1.9)
        .from(".auth-feature", { opacity: 0, x: -16, stagger: 0.08, duration: 0.8 }, 1.0)
        .from(".auth-card", { opacity: 0, y: 24, filter: "blur(8px)", duration: 1 }, 0.15);

      const headline = root.current?.querySelector<HTMLElement>(".auth-headline");
      const splitIt = () => {
        if (!headline) return;
        split = SplitText.create(headline, { type: "lines,chars", mask: "lines", linesClass: "split-line" });
        tl.from(split.chars, { yPercent: 115, rotate: 8, opacity: 0, stagger: 0.016, duration: 1 }, 0.3);
      };
      if (document.fonts?.status === "loaded") splitIt();
      else document.fonts?.ready.then(splitIt);

      // Depth parallax following the pointer (fine pointers only).
      const fine = window.matchMedia("(pointer: fine)").matches;
      const layers = gsap.utils.toArray<HTMLElement>("[data-depth]");
      const movers = layers.map((el) => ({
        el,
        depth: Number(el.dataset.depth),
        x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
      }));
      const onMove = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => {
          m.x(nx * m.depth);
          m.y(ny * m.depth);
        });
      };
      if (fine) window.addEventListener("pointermove", onMove);
      return () => {
        window.removeEventListener("pointermove", onMove);
        split?.revert();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative z-10 grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div data-depth="-12" className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-pos/10 blur-[120px]" />
        <div data-depth="18" className="pointer-events-none absolute right-[-120px] bottom-[-160px] size-[420px] rounded-full bg-info/10 blur-[120px]" />
        <Logo />
        <div className="relative max-w-xl">
          <p className="label-caps mb-5 text-pos/90">Gestão profissional de trading</p>
          <h1 className="auth-headline text-[44px] leading-[1.04] font-semibold tracking-[-0.035em] text-fg xl:text-[54px]">
            Disciplina transforma operações em resultado.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Registre cada entrada, acompanhe sua banca e enxergue seu risco com a clareza de um terminal institucional.
          </p>
          <div data-depth="10" className="auth-hero-frame glass mt-10 rounded-2xl p-5">
            <HeroArt />
          </div>
        </div>
        <ul className="relative grid max-w-xl grid-cols-2 gap-x-6 gap-y-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="auth-feature flex items-start gap-2.5 text-[13px] text-muted">
              <Icon className="mt-0.5 size-4 shrink-0 text-fg/70" strokeWidth={1.75} />
              {label}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="auth-card w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
