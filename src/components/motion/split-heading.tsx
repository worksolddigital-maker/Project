"use client";

import { useRef, type ElementType } from "react";
import { cn } from "@/lib/cn";
import { gsap, shouldReduceMotion, SplitText, useGSAP } from "@/lib/gsap";

interface SplitHeadingProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** "chars" for hero typography, "words" for page titles. */
  by?: "chars" | "words";
  delay?: number;
}

/** Kinetic typography: masked line reveal with staggered words/chars (GSAP SplitText). */
export function SplitHeading({ text, as: Tag = "h1", className, by = "words", delay = 0 }: SplitHeadingProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || shouldReduceMotion()) return;
      let split: SplitText | null = null;
      let tween: gsap.core.Tween | null = null;
      let cancelled = false;
      const run = () => {
        if (cancelled || !el.isConnected) return;
        split = SplitText.create(el, { type: `lines,${by}`, linesClass: "split-line", mask: "lines" });
        tween = gsap.from(by === "chars" ? split.chars : split.words, {
          yPercent: 110,
          opacity: 0,
          rotate: by === "chars" ? 6 : 2,
          duration: by === "chars" ? 0.9 : 0.75,
          ease: "expo.out",
          stagger: by === "chars" ? 0.018 : 0.05,
          delay,
          onComplete: () => {
            split?.revert();
            split = null;
          },
        });
      };
      // Split only after fonts are ready so line breaks are measured correctly.
      if (document.fonts?.status === "loaded") run();
      else document.fonts?.ready.then(run);
      return () => {
        cancelled = true;
        tween?.kill();
        split?.revert();
      };
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {text}
    </Tag>
  );
}
