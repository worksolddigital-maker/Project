import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { EASE, lockScroll } from './events';
import './results.css';

export interface ResultImage {
  src: string;
  large: string;
  width: number;
  height: number;
}

export interface ResultEntry {
  id: string;
  alt: string;
  treatment: string | null;
  note: string | null;
  before: ResultImage;
  after: ResultImage;
}

interface Props {
  items: ResultEntry[];
}

/** Comparador antes/depois acessível (range nativo = teclado e leitores de tela). */
function Compare({
  item,
  size,
  layoutId,
}: {
  item: ResultEntry;
  size: 'card' | 'large';
  layoutId?: string;
}) {
  const [pos, setPos] = useState(50);
  const before = size === 'large' ? item.before.large : item.before.src;
  const after = size === 'large' ? item.after.large : item.after.src;
  const ratio = `${item.before.width} / ${item.before.height}`;

  return (
    <motion.div
      layoutId={layoutId}
      className={`cmp cmp--${size}`}
      style={{ '--pos': `${pos}%`, aspectRatio: ratio } as CSSProperties}
      data-cursor="Arrastar"
    >
      <img
        className="cmp__img"
        src={before}
        alt={`Antes — ${item.alt}`}
        loading="lazy"
        decoding="async"
        width={item.before.width}
        height={item.before.height}
        draggable={false}
      />
      <div className="cmp__after">
        <img
          className="cmp__img"
          src={after}
          alt={`Depois — ${item.alt}`}
          loading="lazy"
          decoding="async"
          width={item.after.width}
          height={item.after.height}
          draggable={false}
        />
      </div>
      <span className="cmp__tag cmp__tag--before" aria-hidden="true">Antes</span>
      <span className="cmp__tag cmp__tag--after" aria-hidden="true">Depois</span>
      <span className="cmp__handle" aria-hidden="true">
        <span className="cmp__knob">
          <svg viewBox="0 0 24 24">
            <path d="M9 7 4 12l5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </span>
      <input
        className="cmp__range"
        type="range"
        min={0}
        max={100}
        step={1}
        value={pos}
        onChange={(e) => setPos(Number(e.currentTarget.value))}
        aria-label={`Comparar antes e depois${item.treatment ? ` — ${item.treatment}` : ''}`}
        aria-valuetext={`${pos}% depois`}
      />
    </motion.div>
  );
}

export default function ResultsGallery({ items }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const open = (index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setActive(index);
  };
  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setActive((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (active === null) return;
    lockScroll(true);
    const id = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(id);
      lockScroll(false);
      triggerRef.current?.focus();
    };
  }, [active === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) step(1);
    if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) step(-1);
    if (e.key === 'Tab' && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  const current = active === null ? null : items[active];

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.75, ease: EASE }}>
      <ul className="results-grid" role="list">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            className="result-card"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -12% 0px' }}
            transition={{ duration: 0.9, ease: EASE, delay: (i % 3) * 0.08 }}
          >
            <Compare item={item} size="card" layoutId={active === i ? undefined : `cmp-${item.id}`} />
            <div className="result-card__meta">
              <div>
                {item.treatment && <p className="result-card__treatment">{item.treatment}</p>}
                {item.note && <p className="result-card__note">{item.note}</p>}
              </div>
              <button
                type="button"
                className="result-card__zoom"
                onClick={(e) => open(i, e.currentTarget)}
                aria-label={`Ampliar resultado${item.treatment ? ` de ${item.treatment}` : ''}`}
              >
                Ampliar
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
                </svg>
              </button>
            </div>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {current && active !== null && (
          <motion.div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Resultado ampliado${current.treatment ? ` — ${current.treatment}` : ''}`}
            ref={dialogRef}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            data-lenis-prevent
          >
            <button className="lightbox__backdrop" aria-hidden="true" tabIndex={-1} onClick={close} />
            <div
              className="lightbox__inner"
              style={{ '--r': current.before.width / current.before.height } as CSSProperties}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  className="lightbox__stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <Compare item={current} size="large" layoutId={`cmp-${current.id}`} />
                </motion.div>
              </AnimatePresence>
              <div className="lightbox__bar">
                <div className="lightbox__info">
                  {current.treatment && <p className="lightbox__treatment">{current.treatment}</p>}
                  {current.note && <p className="lightbox__note">{current.note}</p>}
                  <p className="lightbox__count">
                    {active + 1} / {items.length}
                  </p>
                </div>
                <div className="lightbox__controls">
                  {items.length > 1 && (
                    <>
                      <button type="button" className="lightbox__btn" onClick={() => step(-1)} aria-label="Resultado anterior">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M20 12H4.5M10.5 5.5 4 12l6.5 6.5" />
                        </svg>
                      </button>
                      <button type="button" className="lightbox__btn" onClick={() => step(1)} aria-label="Próximo resultado">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 12h15.5M13.5 5.5 20 12l-6.5 6.5" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button type="button" className="lightbox__btn lightbox__btn--close" onClick={close} ref={closeRef} aria-label="Fechar">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
