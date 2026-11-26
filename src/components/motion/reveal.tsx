"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, shouldReduceMotion, useGSAP } from "@/lib/gsap";

/**
 * Scroll-driven clip-path reveal for panels: each `[data-reveal]` child
 * opens from a horizontal slit while rising slightly (GSAP ScrollTrigger.batch).
 */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || shouldReduceMotion()) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
      if (!items.length) return;
      gsap.set(items, { clipPath: "inset(12% 0% 12% 0% round 16px)", opacity: 0, y: 28 });
      const triggers = ScrollTrigger.batch(items, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            clipPath: "inset(0% 0% 0% 0% round 16px)",
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.08,
            clearProps: "clipPath,transform",
          }),
      });
      return () => triggers.forEach((t) => t.kill());
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
