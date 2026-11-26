"use client";

import { RotateCcw, RotateCw, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Ohlc } from "@/lib/academy/candles";
import type { ChartPattern } from "@/lib/academy/patterns";
import { shouldReduceMotion } from "@/lib/gsap";
import { CandleScene, webglAvailable } from "./candle-scene";

const POS = "var(--color-pos)";

const CONTROLS = [
  { action: "left", icon: RotateCcw, label: "Girar para a esquerda" },
  { action: "replay", icon: Play, label: "Rever animação" },
  { action: "right", icon: RotateCw, label: "Girar para a direita" },
] as const;
const NEG = "var(--color-neg)";

/** Flat candles for cards and the cheat sheet (crisp at any size, no WebGL). */
export function CandlesSvg({
  candles,
  focusFrom = 0,
  className,
  label,
}: {
  candles: Ohlc[];
  focusFrom?: number;
  className?: string;
  label?: string;
}) {
  const W = 20 + candles.length * 22;
  const H = 100;
  const min = Math.min(...candles.map((c) => c.l));
  const max = Math.max(...candles.map((c) => c.h));
  const y = (v: number) => 8 + (1 - (v - min) / (max - min || 1)) * (H - 16);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label ?? "Ilustração de candles"}
    >
      {candles.map((c, i) => {
        const x = 16 + i * 22;
        const color = c.c >= c.o ? POS : NEG;
        const top = y(Math.max(c.o, c.c));
        const bottom = y(Math.min(c.o, c.c));
        const dim = i < focusFrom;
        return (
          <g key={i} opacity={dim ? 0.3 : 1}>
            <line
              x1={x}
              x2={x}
              y1={y(c.h)}
              y2={y(c.l)}
              stroke={color}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
            <rect
              x={x - 6}
              y={top}
              width={12}
              height={Math.max(1.5, bottom - top)}
              rx={1.5}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Chart formations drawn from normalized points (0–100). */
export function ChartPatternSvg({
  pattern,
  className,
  compact = false,
}: {
  pattern: ChartPattern | "suporte" | "resistencia";
  className?: string;
  compact?: boolean;
}) {
  const X = (v: number) => 6 + v * 1.68;
  const Y = (v: number) => 6 + (100 - v) * 0.88;
  if (pattern === "suporte" || pattern === "resistencia") {
    const support = pattern === "suporte";
    const path: [number, number][] = support
      ? [
          [0, 80],
          [20, 40],
          [34, 60],
          [52, 22],
          [68, 46],
          [86, 24],
        ]
      : [
          [0, 20],
          [20, 60],
          [34, 40],
          [52, 78],
          [68, 54],
          [86, 76],
        ];
    const level = support ? 22 : 78;
    return (
      <svg
        viewBox="0 0 180 100"
        className={cn("h-full w-full", className)}
        role="img"
        aria-label={
          support
            ? "Preço testando um suporte"
            : "Preço testando uma resistência"
        }
      >
        <line
          x1={X(0)}
          x2={X(100)}
          y1={Y(level)}
          y2={Y(level)}
          stroke={support ? POS : NEG}
          strokeDasharray="4 4"
          strokeWidth={1.4}
        />
        <text
          x={X(100)}
          y={Y(level) + (support ? 12 : -5)}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-muted)"
        >
          {support ? "suporte" : "resistência"}
        </text>
        <polyline
          points={path.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
          fill="none"
          stroke="var(--color-fg)"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const up = pattern.kind.endsWith("alta");
  const neutral = pattern.kind === "indecisao";
  const [bx, by] = pattern.breakout;
  return (
    <svg
      viewBox="0 0 180 100"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={pattern.name}
    >
      {pattern.lines.map((l, i) => (
        <g key={i}>
          <line
            x1={X(l.from[0])}
            y1={Y(l.from[1])}
            x2={X(l.to[0])}
            y2={Y(l.to[1])}
            stroke="var(--color-muted)"
            strokeDasharray="4 4"
            strokeWidth={1.2}
          />
          {l.label && !compact && (
            <text
              x={X(l.to[0])}
              y={Y(l.to[1]) - 4}
              textAnchor="end"
              fontSize="9"
              fill="var(--color-muted)"
            >
              {l.label}
            </text>
          )}
        </g>
      ))}
      <polyline
        points={pattern.path.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
        fill="none"
        stroke="var(--color-fg)"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle
        cx={X(bx)}
        cy={Y(by)}
        r={3.6}
        fill={neutral ? "var(--color-info)" : up ? POS : NEG}
      />
      <circle
        cx={X(bx)}
        cy={Y(by)}
        r={7}
        fill="none"
        stroke={neutral ? "var(--color-info)" : up ? POS : NEG}
        strokeOpacity={0.45}
      />
      {!compact && (
        <text
          x={X(Math.min(bx, 80))}
          y={Y(by) + (up || neutral ? -11 : 17)}
          fontSize="9"
          textAnchor="middle"
          fill={neutral ? "var(--color-info)" : up ? POS : NEG}
        >
          confirmação
        </text>
      )}
    </svg>
  );
}

/**
 * 3D candles (Three.js). Drag to turn on desktop; buttons on every device.
 * Falls back to the flat drawing when WebGL is unavailable.
 */
export function Candles3D({
  candles,
  focusFrom = 0,
  anatomy = false,
  height = 380,
  label,
  onHover,
  animateChanges = true,
}: {
  candles: Ohlc[];
  focusFrom?: number;
  anatomy?: boolean;
  height?: number;
  label: string;
  onHover?: (index: number | null) => void;
  /** Replay the build-up animation when the candles change (off for live editing). */
  animateChanges?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CandleScene | null>(null);
  const hoverRef = useRef(onHover);
  const shownRef = useRef(false);
  // Rendered only on the client (behind DataGate), so feature checks can run here.
  const [supported] = useState(() => webglAvailable());
  const [failed, setFailed] = useState(false);
  const [coarse] = useState(
    () => window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    hoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;
    let scene: CandleScene | null = null;
    try {
      scene = new CandleScene(host, {
        reducedMotion: shouldReduceMotion(),
        coarsePointer: coarse,
        onHover: (i) => hoverRef.current?.(i),
      });
      sceneRef.current = scene;
    } catch {
      queueMicrotask(() => setFailed(true));
    }
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [supported, coarse]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setCandles(
      candles,
      focusFrom,
      anatomy,
      animateChanges || !shownRef.current,
    );
    shownRef.current = true;
  }, [candles, focusFrom, anatomy, animateChanges, supported]);

  if (!supported || failed) {
    return (
      <div
        className="rounded-xl border border-line bg-white/[0.02] p-4"
        style={{ height }}
      >
        <CandlesSvg candles={candles} focusFrom={focusFrom} label={label} />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={hostRef}
        className="relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(ellipse_at_50%_20%,rgba(122,167,255,0.08),transparent_60%)]"
        style={{ height }}
        role="img"
        aria-label={label}
        data-testid="candles-3d"
      />
      <div className="absolute right-2 bottom-2 flex gap-1">
        {CONTROLS.map((b) => (
          <button
            key={b.action}
            type="button"
            onClick={() => {
              const scene = sceneRef.current;
              if (b.action === "replay") scene?.playIntro();
              else
                scene?.rotateBy(
                  b.action === "left" ? -Math.PI / 6 : Math.PI / 6,
                );
            }}
            aria-label={b.label}
            title={b.label}
            className="focus-ring grid size-8 place-items-center rounded-lg border border-line bg-[#0b0e13]/80 text-muted backdrop-blur hover:text-fg"
          >
            <b.icon className="size-3.5" />
          </button>
        ))}
      </div>
      {!coarse && (
        <p className="pointer-events-none absolute top-2 left-3 text-[10.5px] text-subtle">
          Arraste para girar em 3D
        </p>
      )}
    </div>
  );
}
