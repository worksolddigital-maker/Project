import { createContext, useContext, useId, useState } from 'react'
import { motion } from 'motion/react'
import { images } from '../content'
import type { Block } from '../content/types'
import { actions, useStore } from '../lib/store'
import { href } from '../lib/router'
import { Picture } from './Picture'
import { Rich } from './Rich'
import { CheckBox, Icon, Meter } from './ui'
import { Widget } from '../widgets'

/** No modo de impressão, abas são exibidas em sequência e nada depende de interação. */
export const PrintCtx = createContext(false)

const CALLOUT_LABEL = { nota: 'Nota', atencao: 'Atenção', ajuda: 'Procure ajuda', exemplo: 'Exemplo', fonte: 'Fonte' } as const

export function Checklist({ id, title, items, log, hint }: { id: string; title: string; items: string[]; log?: string; hint?: string }) {
  const checks = useStore((s) => s.checks)
  const done = items.filter((_, i) => checks[`${id}:${i}`]).length
  const complete = done === items.length
  const clear = () => items.forEach((it, i) => { if (checks[`${id}:${i}`]) actions.toggle(`${id}:${i}`, log ? `${log}: ${it}` : undefined) })
  return (
    <section className={`checklist ${complete ? 'is-complete' : ''}`} aria-label={title}>
      <header className="checklist__head">
        <h3 className="checklist__title">{title}</h3>
        <span className="checklist__count" aria-live="polite">{done}/{items.length}</span>
      </header>
      <Meter value={done / items.length} label={`Progresso: ${title}`} />
      <ul className="checklist__list">
        {items.map((it, i) => (
          <li key={i}>
            <CheckBox checked={!!checks[`${id}:${i}`]} onChange={() => actions.toggle(`${id}:${i}`, log ? `${log}: ${it}` : undefined)}>{it}</CheckBox>
          </li>
        ))}
      </ul>
      <footer className="checklist__foot">
        {complete
          ? <motion.p className="checklist__done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{Icon.check} Lista concluída</motion.p>
          : <p className="checklist__hint">{hint ?? 'Suas marcações ficam salvas neste dispositivo.'}</p>}
        {done > 0 && <button type="button" className="btn btn--text no-print" onClick={clear}>Limpar</button>}
      </footer>
    </section>
  )
}

export function FieldBox({ id, label, placeholder, rows = 3 }: { id: string; label: string; placeholder?: string; rows?: number }) {
  const value = useStore((s) => s.fields[id] ?? '')
  const uid = useId()
  return (
    <div className="field">
      <label htmlFor={uid} className="field__label">{label}</label>
      <textarea id={uid} className="field__input" rows={rows} value={value} placeholder={placeholder} onChange={(e) => actions.setField(id, e.target.value)} />
      <span className="field__status" aria-hidden="true">{value ? 'Salvo neste dispositivo' : 'Seu texto é salvo automaticamente'}</span>
    </div>
  )
}

function TabsBlock({ tabs }: { tabs: { label: string; blocks: Block[] }[] }) {
  const [active, setActive] = useState(0)
  const print = useContext(PrintCtx)
  const uid = useId()
  if (print) {
    return <div className="tabs tabs--print">{tabs.map((t, i) => <div key={i}><h4 className="tabs__printlabel">{t.label}</h4><Blocks blocks={t.blocks} nested /></div>)}</div>
  }
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault(); e.stopPropagation()
    const n = (active + d + tabs.length) % tabs.length
    setActive(n)
    document.getElementById(`${uid}-t${n}`)?.focus()
  }
  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" onKeyDown={onKey} data-lenis-prevent-touch>
        {tabs.map((t, i) => (
          <button key={i} id={`${uid}-t${i}`} type="button" role="tab" aria-selected={i === active} aria-controls={`${uid}-p`} tabIndex={i === active ? 0 : -1}
            className={`tabs__tab ${i === active ? 'is-active' : ''}`} onClick={() => setActive(i)}>
            {t.label}
            {i === active && <motion.span layoutId={`${uid}-ind`} className="tabs__ind" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />}
          </button>
        ))}
      </div>
      <motion.div key={active} id={`${uid}-p`} role="tabpanel" aria-labelledby={`${uid}-t${active}`} className="tabs__panel"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <Blocks blocks={tabs[active].blocks} nested />
      </motion.div>
    </div>
  )
}

function Cell({ text }: { text: string }) { return <Rich text={text} /> }

function One({ b }: { b: Block }) {
  switch (b.t) {
    case 'p': return <p className="prose"><Rich text={b.text} /></p>
    case 'h': return (
      <header className="sec" id={b.id}>
        {b.eyebrow && <span className="sec__eyebrow">{b.eyebrow}</span>}
        <h2 className="sec__title">{b.text}</h2>
      </header>
    )
    case 'h3': return <h3 className="sub">{b.text}</h3>
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul'
      return <L className={`list ${b.ordered ? 'list--ol' : ''}`}>{b.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</L>
    }
    case 'steps': return (
      <ol className="steps">
        {b.items.map(([t, d], i) => (
          <li key={i} className="steps__item">
            <span className="steps__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div><h4 className="steps__t">{t}</h4><p><Rich text={d} /></p></div>
          </li>
        ))}
      </ol>
    )
    case 'cards': return (
      <div className={`cards cards--${b.cols ?? 3}`}>
        {b.items.map((c, i) => (
          <article key={i} className="card">
            {c.tag && <span className="card__tag">{c.tag}</span>}
            <h4 className="card__title">{c.title}</h4>
            <p><Rich text={c.text} /></p>
          </article>
        ))}
      </div>
    )
    case 'callout': return (
      <aside className={`callout callout--${b.kind}`} role={b.kind === 'ajuda' || b.kind === 'atencao' ? 'note' : undefined}>
        <span className="callout__kind">{CALLOUT_LABEL[b.kind]}</span>
        {b.title && <h4 className="callout__title">{b.title}</h4>}
        <p><Rich text={b.text} /></p>
      </aside>
    )
    case 'table': return (
      <figure className="tablewrap">
        <div className="tablewrap__scroll" tabIndex={0} role="group" aria-label={b.caption ?? 'Tabela'} data-lenis-prevent-touch>
          <table className="table">
            <thead><tr>{b.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row"><Cell text={c} /></th> : <td key={j} data-label={b.head[j]}><Cell text={c} /></td>))}</tr>)}</tbody>
          </table>
        </div>
        {b.caption && <figcaption>{b.caption}</figcaption>}
      </figure>
    )
    case 'quote': return <blockquote className="quote"><p>{b.text}</p></blockquote>
    case 'image': return (
      <figure className="figure" data-figure>
        <div className="figure__frame"><Picture img={b.img} sizes="(min-width: 1100px) 1040px, 100vw" className="figure__img" /></div>
        <figcaption>{b.caption} <span className="figure__credit">Foto: {images[b.img].by} / Unsplash</span></figcaption>
      </figure>
    )
    case 'mistakes': return (
      <div className="mistakes">
        {b.items.map(([wrong, right], i) => (
          <div key={i} className="mistakes__row">
            <p className="mistakes__wrong"><span className="mistakes__tag">Erro comum</span>{wrong}</p>
            <p className="mistakes__right"><span className="mistakes__tag">Faça assim</span>{right}</p>
          </div>
        ))}
      </div>
    )
    case 'summary': return (
      <ul className="summary">{b.items.map((it, i) => <li key={i}><span className="summary__ic">{Icon.check}</span><span><Rich text={it} /></span></li>)}</ul>
    )
    case 'goals': return (
      <ul className="goals">
        {b.items.map(([text, to], i) => (
          <li key={i}><a className="goals__link" href={href(to)}><span>{text}</span><span className="goals__to">{to.replace('fase-', 'Fase ')} {Icon.arrow}</span></a></li>
        ))}
      </ul>
    )
    case 'checklist': return <Checklist {...b} />
    case 'field': return <FieldBox {...b} />
    case 'tabs': return <TabsBlock tabs={b.tabs} />
    case 'widget': return <Widget name={b.name} arg={b.arg} />
    case 'cta': return (
      <div className="cta no-print">
        {b.note && <p className="cta__note">{b.note}</p>}
        <a className="btn btn--outline" href={href(...(b.to.split('/') as [string, string?]))}><span>{b.label}</span>{Icon.arrow}</a>
      </div>
    )
  }
}

const WIDE = new Set(['cards', 'table', 'image', 'mistakes', 'tabs', 'widget', 'steps', 'checklist', 'goals', 'summary'])

export function Blocks({ blocks, nested = false }: { blocks: Block[]; nested?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div key={i} className={`blk blk--${b.t} ${WIDE.has(b.t) && !nested ? 'blk--wide' : ''}`} data-reveal={nested ? undefined : ''}>
          <One b={b} />
        </div>
      ))}
    </>
  )
}
