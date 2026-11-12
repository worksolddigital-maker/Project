import { useId, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import { EASE, requestRefresh } from './events';
import './faq.css';

export interface FaqEntry {
  q: string;
  a: string;
  topic: string;
}

interface Props {
  items: FaqEntry[];
  /** Exibe os filtros por tema (desligado nas páginas de procedimento). */
  filters?: boolean;
  /** Índice aberto inicialmente (null = todos fechados). */
  initialOpen?: number | null;
}

const ALL = 'Todas';

export default function FaqAccordion({ items, filters = true, initialOpen = 0 }: Props) {
  const baseId = useId();
  const topics = useMemo(
    () => [ALL, ...Array.from(new Set(items.map((i) => i.topic)))],
    [items],
  );
  const [topic, setTopic] = useState(ALL);
  const [open, setOpen] = useState<number | null>(initialOpen);
  const showFilters = filters && topics.length > 2;

  const visible = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => topic === ALL || item.topic === topic);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.65, ease: EASE }}>
      <div className="faq-ui">
        {showFilters && (
        <div className="faq-ui__filters" role="group" aria-label="Filtrar perguntas por tema">
          <LayoutGroup id={`${baseId}-filters`}>
            {topics.map((t) => {
              const active = t === topic;
              return (
                <button
                  key={t}
                  type="button"
                  className={`faq-ui__filter${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    setTopic(t);
                    setOpen(null);
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId={`${baseId}-pill`}
                      className="faq-ui__pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="faq-ui__filter-text">{t}</span>
                </button>
              );
            })}
          </LayoutGroup>
        </div>
        )}

        <ul className="faq-ui__list" role="list">
          <AnimatePresence initial={false} mode="popLayout" onExitComplete={requestRefresh}>
            {visible.map((item) => {
              const isOpen = open === item.index;
              const qId = `${baseId}-q-${item.index}`;
              const aId = `${baseId}-a-${item.index}`;
              return (
                <motion.li
                  key={item.index}
                  layout="position"
                  className={`faq-item${isOpen ? ' is-open' : ''}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
                >
                  <h3 className="faq-item__heading">
                    <button
                      id={qId}
                      type="button"
                      className="faq-item__q"
                      aria-expanded={isOpen}
                      aria-controls={aId}
                      onClick={() => setOpen(isOpen ? null : item.index)}
                    >
                      <span className="faq-item__num" aria-hidden="true">
                        {String(item.index + 1).padStart(2, '0')}
                      </span>
                      <span className="faq-item__text">{item.q}</span>
                      <span className="faq-item__icon" aria-hidden="true">
                        <motion.svg
                          viewBox="0 0 24 24"
                          animate={{ rotate: isOpen ? 135 : 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                        >
                          <path d="M12 5v14M5 12h14" />
                        </motion.svg>
                      </span>
                    </button>
                  </h3>
                  <motion.div
                    id={aId}
                    role="region"
                    aria-labelledby={qId}
                    className="faq-item__panel"
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    onAnimationComplete={requestRefresh}
                    inert={!isOpen}
                  >
                    <div className="faq-item__a">
                      {showFilters && <span className="faq-item__topic">{item.topic}</span>}
                      <p>{item.a}</p>
                    </div>
                  </motion.div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </MotionConfig>
  );
}
