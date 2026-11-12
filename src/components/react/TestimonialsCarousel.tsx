import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { EASE } from './events';
import './testimonials.css';

export interface TestimonialEntry {
  name: string;
  text: string;
  treatment?: string;
  source?: string;
}

interface Props {
  items: TestimonialEntry[];
}

export default function TestimonialsCarousel({ items }: Props) {
  const [[index, direction], setState] = useState<[number, 1 | -1]>([0, 1]);
  const go = (dir: 1 | -1) =>
    setState(([i]) => [(i + dir + items.length) % items.length, dir]);
  const item = items[index];

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.8, ease: EASE }}>
      <div className="tcar" aria-roledescription="carrossel" aria-label="Depoimentos de pacientes">
        <div className="tcar__stage" aria-live="polite">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.figure
              key={index}
              className="tcar__item"
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40, transition: { duration: 0.35 } }}
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${items.length}`}
            >
              <span className="tcar__mark" aria-hidden="true">“</span>
              <blockquote className="tcar__quote">
                <p>{item.text}</p>
              </blockquote>
              <figcaption className="tcar__author">
                <span className="tcar__name">{item.name}</span>
                {(item.treatment || item.source) && (
                  <span className="tcar__meta">
                    {[item.treatment, item.source && `via ${item.source}`].filter(Boolean).join(' · ')}
                  </span>
                )}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {items.length > 1 && (
          <div className="tcar__nav">
            <button type="button" className="tcar__btn" onClick={() => go(-1)} aria-label="Depoimento anterior">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 12H4.5M10.5 5.5 4 12l6.5 6.5" />
              </svg>
            </button>
            <div className="tcar__dots" role="tablist" aria-label="Escolher depoimento">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Depoimento ${i + 1}`}
                  className={`tcar__dot${i === index ? ' is-active' : ''}`}
                  onClick={() => setState([i, i > index ? 1 : -1])}
                >
                  {i === index && <motion.span layoutId="tcar-dot" className="tcar__dot-fill" />}
                </button>
              ))}
            </div>
            <button type="button" className="tcar__btn" onClick={() => go(1)} aria-label="Próximo depoimento">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h15.5M13.5 5.5 20 12l-6.5 6.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
