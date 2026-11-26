"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { gsap, shouldReduceMotion } from "@/lib/gsap";

interface CountUpProps {
  value: number;
  format: (v: number) => string;
  className?: string;
  duration?: number;
}

/**
 * Animated numeric value (GSAP tween on a plain object, text written directly).
 * Animates from the previous value so live updates feel continuous.
 */
export function CountUp({ value, format, className, duration = 1.1 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ v: 0 });
  const first = useRef(true);
  const render = useEffectEvent((v: number) => {
    if (ref.current) ref.current.textContent = format(v);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shouldReduceMotion() || !Number.isFinite(value)) {
      state.current.v = value;
      render(value);
      return;
    }
    const from = first.current ? 0 : state.current.v;
    first.current = false;
    state.current.v = from;
    const tween = gsap.to(state.current, {
      v: value,
      duration: from === value ? 0 : duration,
      ease: "expo.out",
      onUpdate: () => render(state.current.v),
      onComplete: () => render(value),
    });
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
