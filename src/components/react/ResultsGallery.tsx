import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import { EASE, lockScroll } from './events';
import './results.css';

export interface ResultImage {
  src: string;
  large: string;
  width: number;
  height: number;
}

export interface ResultViewEntry {
  id: string;
  label: string;
  alt: string;
  focus: string | null;
  before: ResultImage;
  after: ResultImage;
}

export interface ResultEntry {
  id: string;
  treatment: string | null;
  note: string | null;
  quote: string | null;
  story: string[];
  link: { href: string; label: string } | null;
  views: ResultViewEntry[];
}

interface Props {
  items: ResultEntry[];
  /** O primeiro caso aparece em destaque, com a história completa. */
  featureFirst?: boolean;
  /** Exibe o link para a página do procedimento (desligado na própria página). */
  showLinks?: boolean;
  /** Rótulo do caso em destaque (null = só o selo do tratamento). */
  featuredLabel?: string | null;
}

const ratioOf = (v: ResultViewEntry) => v.before.width / v.before.height;
const caseLabel = (item: ResultEntry, view: ResultViewEntry) =>
  [item.treatment, item.views.length > 1 ? view.label : null].filter(Boolean).join(' — ');

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h15.5M13.5 5.5 20 12l-6.5 6.5" />
  </svg>
);
const ZoomIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </svg>
);

/** Comparador antes/depois. Preenche o quadro pai; range nativo = teclado e leitores de tela. */
function Compare({ view, size, label }: { view: ResultViewEntry; size: 'card' | 'large'; label: string }) {
  const [pos, setPos] = useState(50);
  const before = size === 'large' ? view.before.large : view.before.src;
  const after = size === 'large' ? view.after.large : view.after.src;

  return (
    <div className="cmp" style={{ '--pos': `${pos}%`, '--focus': view.focus ?? '50% 50%' } as CSSProperties}>
      <img
        className="cmp__img"
        src={before}
        alt={`Antes — ${view.alt}`}
        loading="lazy"
        decoding="async"
        width={view.before.width}
        height={view.before.height}
        draggable={false}
      />
      <div className="cmp__after">
        <img
          className="cmp__img"
          src={after}
          alt={`Depois — ${view.alt}`}
          loading="lazy"
          decoding="async"
          width={view.after.width}
          height={view.after.height}
          draggable={false}
        />
      </div>
      <span className="cmp__tag cmp__tag--before" aria-hidden="true">
        Antes
      </span>
      <span className="cmp__tag cmp__tag--after" aria-hidden="true">
        Depois
      </span>
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
        aria-label={`Comparar antes e depois${label ? ` — ${label}` : ''}`}
        aria-valuetext={`Divisória em ${pos}%: antes à esquerda, depois à direita`}
      />
    </div>
  );
}

/** Quadro com proporção fixa; a troca de ângulo é um esmaecimento curto. */
function Frame({ item, viewIndex, ratio }: { item: ResultEntry; viewIndex: number; ratio: number }) {
  const view = item.views[viewIndex];
  return (
    <div className="cmp-frame" style={{ aspectRatio: ratio }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.id}
          className="cmp-frame__layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.45, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <Compare view={view} size="card" label={caseLabel(item, view)} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ViewTabs({
  item,
  active,
  onChange,
  tone = 'light',
}: {
  item: ResultEntry;
  active: number;
  onChange: (index: number) => void;
  tone?: 'light' | 'dark';
}) {
  const id = useId();
  if (item.views.length < 2) return null;
  return (
    <div className={`rtabs rtabs--${tone}`} role="group" aria-label="Escolher o ângulo da foto">
      <LayoutGroup id={id}>
        {item.views.map((v, i) => {
          const isActive = i === active;
          return (
            <button
              key={v.id}
              type="button"
              className={`rtabs__tab${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onChange(i)}
            >
              {isActive && (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="rtabs__pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              )}
              <span className="rtabs__text">{v.label}</span>
            </button>
          );
        })}
      </LayoutGroup>
    </div>
  );
}

function ZoomButton({ onClick, label }: { onClick: (el: HTMLElement) => void; label: string }) {
  return (
    <button type="button" className="result-zoom" onClick={(e) => onClick(e.currentTarget)} aria-label={label}>
      Ampliar
      <ZoomIcon />
    </button>
  );
}

function FeaturedCase({
  item,
  view,
  onView,
  onZoom,
  showLink,
  label,
}: {
  item: ResultEntry;
  view: number;
  onView: (i: number) => void;
  onZoom: (el: HTMLElement) => void;
  showLink: boolean;
  label: string | null;
}) {
  const ratio = ratioOf(item.views[0]);
  return (
    <article className="rfeat" aria-label={`Caso em destaque${item.treatment ? ` — ${item.treatment}` : ''}`}>
      <div className="rfeat__stage" style={{ '--ratio': ratio } as CSSProperties}>
        <div className="rfeat__frame">
          <Frame item={item} viewIndex={view} ratio={ratio} />
        </div>
        <div className="rfeat__controls">
          <ViewTabs item={item} active={view} onChange={onView} />
          <ZoomButton onClick={onZoom} label={`Ampliar ${caseLabel(item, item.views[view]) || 'resultado'}`} />
        </div>
      </div>

      <div className="rfeat__text">
        <p className="rfeat__kicker">
          {label && <span>{label}</span>}
          {item.treatment && <span className="rfeat__chip">{item.treatment}</span>}
        </p>
        {item.quote && (
          <blockquote className="rfeat__quote">
            <p>“{item.quote}”</p>
          </blockquote>
        )}
        {item.story.map((paragraph, i) => (
          <p key={i} className={`rfeat__story${i === item.story.length - 1 ? ' rfeat__story--last' : ''}`}>
            {paragraph}
          </p>
        ))}
        <p className="rfeat__source">Da publicação de @leticiaorlandin.estetica</p>
        {showLink && item.link && (
          <a className="rfeat__link" href={item.link.href}>
            {item.link.label}
            <ArrowIcon />
          </a>
        )}
      </div>
    </article>
  );
}

function ResultCard({
  item,
  view,
  onView,
  onZoom,
  showLink,
}: {
  item: ResultEntry;
  view: number;
  onView: (i: number) => void;
  onZoom: (el: HTMLElement) => void;
  showLink: boolean;
}) {
  const ratio = ratioOf(item.views[0]);
  const orientation = ratio >= 1 ? 'landscape' : 'portrait';
  return (
    <li className={`result-card result-card--${orientation}`}>
      <Frame item={item} viewIndex={view} ratio={ratio} />
      <div className="result-card__body">
        <div className="result-card__meta">
          <div className="result-card__info">
            {item.treatment && <p className="result-card__treatment">{item.treatment}</p>}
            {item.note && <p className="result-card__note">{item.note}</p>}
          </div>
          <ZoomButton onClick={onZoom} label={`Ampliar ${caseLabel(item, item.views[view]) || 'resultado'}`} />
        </div>
        <ViewTabs item={item} active={view} onChange={onView} />
        {item.quote && <p className="result-card__quote">“{item.quote}”</p>}
        {showLink && item.link && (
          <a className="result-card__link" href={item.link.href}>
            {item.link.label}
            <ArrowIcon />
          </a>
        )}
      </div>
    </li>
  );
}

function Lightbox({
  items,
  index,
  view,
  onView,
  onStep,
  onClose,
}: {
  items: ResultEntry[];
  index: number;
  view: number;
  onView: (i: number) => void;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const item = items[index];
  const current = item.views[view];
  const ratio = ratioOf(current);

  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  // Teclas globais enquanto o diálogo está aberto (mesmo se o foco se perder).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inRange = e.target instanceof HTMLInputElement;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && !inRange && items.length > 1) {
        e.preventDefault();
        onStep(1);
      } else if (e.key === 'ArrowLeft' && !inRange && items.length > 1) {
        e.preventDefault();
        onStep(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose, onStep]);

  // Se o elemento focado sumir (ex.: abas de um caso com um só ângulo),
  // o foco volta para dentro do diálogo.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) closeRef.current?.focus();
  }, [index, view]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([tabindex="-1"]), input, [href]',
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

  return (
    <motion.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Resultado ampliado${item.treatment ? ` — ${item.treatment}` : ''}`}
      ref={dialogRef}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      data-lenis-prevent
    >
      <button className="lightbox__backdrop" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="lightbox__inner">
        <div className="lightbox__top">
          <div className="lightbox__title">
            {item.treatment && <p className="lightbox__treatment">{item.treatment}</p>}
            {item.note && <p className="lightbox__note">{item.note}</p>}
          </div>
          <ViewTabs item={item} active={view} onChange={onView} tone="dark" />
        </div>

        <div className="lightbox__stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${item.id}-${current.id}`}
              className="lightbox__frame"
              style={{ '--r': ratio, aspectRatio: ratio } as CSSProperties}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } }}
              exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.2 } }}
            >
              <Compare view={current} size="large" label={caseLabel(item, current)} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="lightbox__bar">
          <p className="lightbox__count">
            {items.length > 1 ? `Caso ${index + 1} de ${items.length}` : 'Arraste a linha para comparar'}
          </p>
          <div className="lightbox__controls">
            {items.length > 1 && (
              <>
                <button type="button" className="lightbox__btn" onClick={() => onStep(-1)} aria-label="Caso anterior">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 12H4.5M10.5 5.5 4 12l6.5 6.5" />
                  </svg>
                </button>
                <button type="button" className="lightbox__btn" onClick={() => onStep(1)} aria-label="Próximo caso">
                  <ArrowIcon />
                </button>
              </>
            )}
            <button type="button" className="lightbox__btn lightbox__btn--close" onClick={onClose} ref={closeRef} aria-label="Fechar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ResultsGallery({
  items,
  featureFirst = true,
  showLinks = true,
  featuredLabel = 'Caso em destaque',
}: Props) {
  const [views, setViews] = useState<number[]>(() => items.map(() => 0));
  const [open, setOpen] = useState<{ index: number; view: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // O diálogo é renderizado no <body> (portal): nenhum ancestral com
  // transform/filter pode limitar o position: fixed.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setPortalTarget(document.body), []);

  const setView = useCallback((index: number, view: number) => {
    setViews((prev) => prev.map((v, i) => (i === index ? view : v)));
  }, []);

  const openAt = (index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setOpen({ index, view: views[index] ?? 0 });
  };
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((o) => {
        if (!o) return o;
        const index = (o.index + dir + items.length) % items.length;
        return { index, view: views[index] ?? 0 };
      }),
    [items.length, views],
  );

  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    lockScroll(true);
    return () => {
      lockScroll(false);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const featured = featureFirst ? items[0] : undefined;
  const rest = featureFirst ? items.slice(1) : items;
  const offset = featureFirst ? 1 : 0;

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
      {featured && (
        <FeaturedCase
          item={featured}
          view={views[0]}
          onView={(v) => setView(0, v)}
          onZoom={(el) => openAt(0, el)}
          showLink={showLinks}
          label={featuredLabel}
        />
      )}

      {rest.length > 0 && (
        <ul className="results-grid" role="list">
          {rest.map((item, i) => (
            <ResultCard
              key={item.id}
              item={item}
              view={views[i + offset]}
              onView={(v) => setView(i + offset, v)}
              onZoom={(el) => openAt(i + offset, el)}
              showLink={showLinks}
            />
          ))}
        </ul>
      )}

      {portalTarget &&
        createPortal(
          <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: EASE }}>
            <AnimatePresence>
              {open && (
                <Lightbox
                  items={items}
                  index={open.index}
                  view={open.view}
                  onView={(v) => {
                    setOpen((o) => (o ? { ...o, view: v } : o));
                    setView(open.index, v);
                  }}
                  onStep={step}
                  onClose={close}
                />
              )}
            </AnimatePresence>
          </MotionConfig>,
          portalTarget,
        )}
    </MotionConfig>
  );
}
