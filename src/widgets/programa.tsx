import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { pages } from '../content'
import { CheckBox, fmtDate, Icon, Meter, Ring } from '../components/ui'
import { href, navigate } from '../lib/router'
import { actions, AREAS, currentDay, dayRatio, isDayDone, PHASES, phaseOfDay, stats, todayISO, TOTAL_DAYS, useStore, type State } from '../lib/store'
import { ui } from '../lib/ui'
import { RatingGrid } from './basic'

const useAll = () => useStore((s) => s)
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function dateOfDay(s: State, day: number): Date | null {
  if (!s.startDate) return null
  const [y, m, d] = s.startDate.split('-').map(Number)
  return new Date(y, m - 1, d + day - 1)
}
const short = (d: Date | null) => (d ? `${WD[d.getDay()]}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '')

/* ---------- Iniciar o programa ---------- */
export function IniciarPrograma() {
  const s = useAll()
  const [edit, setEdit] = useState(false)
  const day = currentDay(s)
  if (!s.startDate) {
    return (
      <section className="panel start" aria-label="Iniciar o programa">
        <div>
          <h3>Pronto para começar?</h3>
          <p>Ao iniciar, hoje passa a ser o <b>Dia 1</b>. O calendário, o rastreador e o painel passam a acompanhar sua evolução.</p>
        </div>
        <button type="button" className="btn btn--primary btn--lg" onClick={() => actions.start()}><span>Iniciar meu programa hoje</span>{Icon.arrow}</button>
      </section>
    )
  }
  const ph = phaseOfDay(day)
  return (
    <motion.section className="panel start is-on" aria-label="Situação do programa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Ring value={day / TOTAL_DAYS} size={112} stroke={6} label="Avanço no calendário do programa"><span className="ring__big">{day}</span><span className="ring__small">de 90</span></Ring>
      <div className="start__body">
        <h3>Dia {day} · Fase {ph.n}: {ph.name}</h3>
        <p>Programa iniciado em {fmtDate(s.startDate + 'T12:00:00')}{s.cycle > 1 ? ` · ${s.cycle}º ciclo` : ''}.</p>
        <div className="btnrow">
          <a className="btn btn--primary" href={href('hoje')}><span>Registrar o dia de hoje</span>{Icon.arrow}</a>
          <a className="btn btn--outline" href={href(ph.page)}>Abrir a fase atual</a>
          <button type="button" className="btn btn--text" onClick={() => setEdit((v) => !v)}>Alterar data de início</button>
        </div>
        {edit && (
          <label className="minifield start__date"><span>Data de início</span>
            <input type="date" className="input" value={s.startDate} max={todayISO()} onChange={(e) => e.target.value && actions.start(e.target.value)} />
          </label>
        )}
      </div>
    </motion.section>
  )
}

/* ---------- Cartões das fases ---------- */
const OBJ = [
  'Identificar problemas, organizar o ambiente e estabelecer metas.',
  'Começar a desenvolver hábitos saudáveis.',
  'Fortalecer os hábitos e melhorar a disciplina.',
  'Transformar as mudanças em um estilo de vida sustentável.',
]
const END = ['Checklist de preparação', 'Avaliação dos primeiros 30 dias', 'Relatório de evolução dos 60 dias', 'Avaliação final e plano de continuidade']
export function Fases() {
  const s = useAll()
  const st = stats(s)
  const day = st.today
  return (
    <ol className="fases" data-lenis-prevent-touch>
      {st.phaseGoals.map((p, i) => {
        const current = day >= p.from && day <= p.to
        return (
          <li key={p.id} className={`fase ${current ? 'is-current' : ''} ${p.closed ? 'is-closed' : ''}`}>
            <span className="fase__n" aria-hidden="true">0{p.n}</span>
            <p className="fase__days">Dias {p.from} a {p.to}{current && <span className="pill pill--accent">Você está aqui</span>}{p.closed && <span className="pill pill--ok">{Icon.check} Concluída</span>}</p>
            <h3 className="fase__name">{p.name}</h3>
            <p className="fase__obj">{OBJ[i]}</p>
            <p className="fase__end"><span>Conclusão</span>{END[i]}</p>
            <div className="fase__prog"><Meter value={p.done / p.goals} label={`Metas da fase ${p.n}`} /><span>{p.done}/{p.goals} metas</span></div>
            <a className="btn btn--outline btn--sm" href={href(p.page)}><span>Abrir fase {p.n}</span>{Icon.arrow}</a>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Conclusão de fase ---------- */
const FASE_CFG: Record<string, { n: number; aval?: string; cmp?: string; title: string; fields: [string, string][]; next: string; nextLabel: string }> = {
  f1: { n: 1, title: 'Concluir a Fase 1', fields: [['aprendi', 'O que descobri sobre mim nesta primeira semana'], ['foco', 'Os hábitos que vou acompanhar diariamente na Fase 2']], next: 'fase-2', nextLabel: 'Ir para a Fase 2' },
  f2: { n: 2, aval: 'prog:aval:30', cmp: 'aval:inicial', title: 'Avaliação dos primeiros 30 dias', fields: [['melhorou', 'O que melhorou nestes 30 dias'], ['dificil', 'O que ainda está difícil'], ['ajuste', 'O que vou ajustar na próxima fase']], next: 'fase-3', nextLabel: 'Ir para a Fase 3' },
  f3: { n: 3, aval: 'prog:aval:60', cmp: 'prog:aval:30', title: 'Relatório de evolução dos 60 dias', fields: [['evolucao', 'Minha evolução: o que hoje é mais fácil do que há dois meses'], ['recaidas', 'Tropeços e o que aprendi com eles'], ['proximo', 'O que quero consolidar nos últimos 30 dias']], next: 'fase-4', nextLabel: 'Ir para a Fase 4' },
  f4: { n: 4, aval: 'prog:aval:90', cmp: 'prog:aval:60', title: 'Avaliação final e plano de continuidade', fields: [['conquistas', 'Minhas principais conquistas nestes 90 dias'], ['manter', 'Os hábitos que vou manter como inegociáveis'], ['novos', 'Meus novos objetivos para os próximos 90 dias'], ['plano', 'Como vou acompanhar e revisar o novo ciclo']], next: 'jornada', nextLabel: 'Ver a conclusão' },
}
export function AvaliacaoFase({ arg = 'f1' }: { arg?: string }) {
  const cfg = FASE_CFG[arg]
  const fields = useStore((s) => s.fields)
  const closedAt = useStore((s) => s.checks[`prog:${arg}:concluida`])
  const goalsDone = useStore((s) => PHASES[cfg.n - 1].goals - Array.from({ length: PHASES[cfg.n - 1].goals }).filter((_, i) => !s.checks[`prog:${arg}:meta:${i}`]).length)
  const total = PHASES[cfg.n - 1].goals
  return (
    <section className={`panel fim ${closedAt ? 'is-closed' : ''}`} aria-label={cfg.title}>
      <header className="panel__head"><h3>{cfg.title}</h3><span className="pill">{goalsDone}/{total} metas</span></header>
      {cfg.aval && (
        <>
          <p className="hint">Dê novas notas de 1 a 10 às mesmas áreas. A variação em relação à avaliação anterior aparece ao lado.</p>
          <RatingGrid prefix={cfg.aval} compareTo={cfg.cmp} />
        </>
      )}
      {cfg.fields.map(([k, label]) => (
        <label key={k} className="field">
          <span className="field__label">{label}</span>
          <textarea className="field__input" rows={3} value={fields[`prog:${arg}:${k}`] ?? ''} onChange={(e) => actions.setField(`prog:${arg}:${k}`, e.target.value)} />
        </label>
      ))}
      <AnimatePresence mode="wait">
        {closedAt ? (
          <motion.div key="ok" className="fim__done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <span className="fim__seal">{Icon.check}</span>
            <div>
              <h4>Fase {cfg.n} concluída em {fmtDate(closedAt)}</h4>
              <p>{cfg.n < 4 ? 'Reconheça o que você fez até aqui. A próxima fase constrói sobre esta base.' : 'Noventa dias de escolhas repetidas. Isso já faz parte de quem você é.'}</p>
              <div className="btnrow">
                <a className="btn btn--primary" href={href(cfg.next)}><span>{cfg.nextLabel}</span>{Icon.arrow}</a>
                <button type="button" className="btn btn--text" onClick={() => actions.toggle(`prog:${arg}:concluida`)}>Reabrir fase</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="cta" className="fim__cta" exit={{ opacity: 0 }}>
            <p className="hint">{goalsDone < total ? `Você marcou ${goalsDone} de ${total} metas. Pode concluir assim mesmo e levar as pendentes para a próxima fase.` : 'Todas as metas marcadas. Hora de fechar esta fase.'}</p>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => actions.toggle(`prog:${arg}:concluida`, `Fase ${cfg.n} concluída`)}><span>Concluir a Fase {cfg.n}</span>{Icon.check}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------- Hoje: checklist diário + rastreador semanal ---------- */
export function Hoje() {
  const s = useAll()
  const today = currentDay(s)
  const [sel, setSel] = useState(() => { const d = ui.day || today; ui.day = 0; return d })
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  if (!s.startDate) return <IniciarPrograma />
  const day = Math.max(1, Math.min(TOTAL_DAYS, sel || today))
  const ph = phaseOfDay(day)
  const done = isDayDone(s, day)
  const ratio = dayRatio(s, day)
  const w0 = Math.floor((day - 1) / 7) * 7 + 1
  const week = Array.from({ length: 7 }, (_, i) => w0 + i).filter((d) => d <= TOTAL_DAYS)
  const add = (e: React.FormEvent) => { e.preventDefault(); if (name.trim()) { actions.addHabit(name.trim()); setName('') } }
  return (
    <div className="hoje">
      <section className="panel" aria-label="Checklist diário">
        <header className="hoje__head">
          <button type="button" className="iconbtn" aria-label="Dia anterior" disabled={day <= 1} onClick={() => setSel(day - 1)}>{Icon.back}</button>
          <div className="hoje__title">
            <h3 aria-live="polite">Dia {day} <small>de 90</small></h3>
            <p>{short(dateOfDay(s, day))} · Fase {ph.n}{day === today ? ' · hoje' : day > today ? ' · futuro' : ''}</p>
          </div>
          <button type="button" className="iconbtn" aria-label="Próximo dia" disabled={day >= TOTAL_DAYS} onClick={() => setSel(day + 1)}>{Icon.arrow}</button>
        </header>
        {day !== today && <button type="button" className="btn btn--text hoje__back" onClick={() => setSel(today)}>Voltar para hoje (dia {today})</button>}
        <Meter value={ratio} label="Hábitos marcados no dia" />
        <ul className="checklist__list">
          {s.habits.map((h) => (
            <li key={h.id} className="hoje__habit">
              <CheckBox checked={!!s.checks[`prog:hab:${day}:${h.id}`]} onChange={() => actions.toggle(`prog:hab:${day}:${h.id}`)}>{h.name}</CheckBox>
              {editing && <button type="button" className="iconbtn iconbtn--sm" aria-label={`Remover hábito: ${h.name}`} onClick={() => actions.removeHabit(h.id)}>{Icon.trash}</button>}
            </li>
          ))}
        </ul>
        {s.habits.length === 0 && <p className="hint">Nenhum hábito na lista. Adicione ao menos um abaixo.</p>}
        <div className="hoje__edit no-print">
          <button type="button" className="btn btn--text" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>{editing ? 'Concluir edição' : 'Editar hábitos'}</button>
          {editing && (
            <form onSubmit={add} className="hoje__add">
              <input className="input" type="text" value={name} maxLength={80} placeholder="Novo hábito (ex.: ler 10 páginas)" aria-label="Nome do novo hábito" onChange={(e) => setName(e.target.value)} />
              <button type="submit" className="btn btn--outline">{Icon.plus}<span>Adicionar</span></button>
            </form>
          )}
        </div>
        <label className="field">
          <span className="field__label">Nota do dia (opcional)</span>
          <textarea className="field__input" rows={2} value={s.fields[`prog:nota:${day}`] ?? ''} placeholder="O que ajudou? O que atrapalhou?" onChange={(e) => actions.setField(`prog:nota:${day}`, e.target.value)} />
        </label>
        <div className={`hoje__close ${done ? 'is-done' : ''}`}>
          <p aria-live="polite">{done ? `Dia ${day} concluído. Mais um tijolo no lugar.` : `${Math.round(ratio * 100)}% dos hábitos marcados. Feche o dia quando terminar, mesmo que não esteja perfeito.`}</p>
          <button type="button" className={`btn ${done ? 'btn--outline' : 'btn--primary'}`} aria-pressed={done} onClick={() => actions.toggle(`prog:day:${day}`)}>{done ? <>{Icon.check}<span>Dia concluído</span></> : <span>Concluir o dia</span>}</button>
        </div>
      </section>

      <section className="panel" aria-label="Rastreador de hábitos da semana">
        <header className="panel__head"><h3>Rastreador de hábitos · semana {Math.floor((day - 1) / 7) + 1}</h3><span className="pill">dias {week[0]} a {week[week.length - 1]}</span></header>
        <div className="tablewrap__scroll" data-lenis-prevent-touch>
          <table className="tracker">
            <thead>
              <tr><th scope="col">Hábito</th>
                {week.map((d) => <th key={d} scope="col" className={d === today ? 'is-today' : ''}><button type="button" onClick={() => setSel(d)} aria-label={`Abrir dia ${d}`}><b>{d}</b><small>{dateOfDay(s, d) ? WD[dateOfDay(s, d)!.getDay()] : ''}</small></button></th>)}
                <th scope="col">Semana</th></tr>
            </thead>
            <tbody>
              {s.habits.map((h) => {
                const n = week.filter((d) => s.checks[`prog:hab:${d}:${h.id}`]).length
                return (
                  <tr key={h.id}>
                    <th scope="row">{h.name}</th>
                    {week.map((d) => {
                      const on = !!s.checks[`prog:hab:${d}:${h.id}`]
                      return <td key={d}><button type="button" className={`tick ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={`${h.name}, dia ${d}`} onClick={() => actions.toggle(`prog:hab:${d}:${h.id}`)}>{on && Icon.check}</button></td>
                    })}
                    <td className="tracker__sum">{n}/{week.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ---------- Calendário de 90 dias ---------- */
export function Calendario() {
  const s = useAll()
  const today = currentDay(s)
  const open = (d: number) => { ui.day = d; navigate('hoje') }
  return (
    <section className="panel cal" aria-label="Calendário de 90 dias">
      {!s.startDate && <p className="hint">O calendário passa a mostrar datas quando você <a className="link" href={href('programa')}>iniciar o programa</a>.</p>}
      {PHASES.map((p) => (
        <div key={p.id} className="cal__phase">
          <h3 className="cal__ptitle"><span>Fase {p.n}</span>{p.name}<small>dias {p.from}–{p.to}</small></h3>
          <ol className="cal__grid">
            {Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i).map((d) => {
              const r = dayRatio(s, d), done = isDayDone(s, d)
              const level = r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4
              const date = dateOfDay(s, d)
              return (
                <li key={d}>
                  <button type="button" className={`cal__day lv${level} ${done ? 'is-done' : ''} ${d === today ? 'is-today' : ''}`} disabled={!s.startDate} onClick={() => open(d)}
                    aria-label={`Dia ${d}${date ? `, ${short(date)}` : ''}: ${Math.round(r * 100)}% dos hábitos${done ? ', dia concluído' : ''}${d === today ? ', hoje' : ''}`}
                    title={`Dia ${d}${date ? ` · ${short(date)}` : ''} · ${Math.round(r * 100)}% dos hábitos${done ? ' · concluído' : ''}`}>
                    <span>{d}</span>{done && <i>{Icon.check}</i>}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
      <p className="cal__legend" aria-hidden="true">
        <span>Hábitos marcados:</span><i className="cal__sw lv0" />0%<i className="cal__sw lv1" /><i className="cal__sw lv2" /><i className="cal__sw lv3" /><i className="cal__sw lv4" />100%
        <span className="cal__lg"><i className="cal__sw is-done">{Icon.check}</i>dia concluído</span><span className="cal__lg"><i className="cal__sw is-today" />hoje</span>
      </p>
    </section>
  )
}

/* ---------- Planejamento e avaliação semanal ---------- */
const SCALES: [string, string][] = [['energia', 'Energia'], ['consistencia', 'Consistência'], ['humor', 'Humor'], ['sono', 'Qualidade do sono']]
export function Semana() {
  const s = useAll()
  const today = currentDay(s) || 1
  const [w, setW] = useState(Math.floor((today - 1) / 7) + 1)
  const k = (x: string) => `prog:sem:${w}:${x}`
  const days = Array.from({ length: 7 }, (_, i) => (w - 1) * 7 + 1 + i).filter((d) => d <= TOTAL_DAYS)
  const F = (key: string, label: string, ph?: string, rows = 2) => (
    <label className="field"><span className="field__label">{label}</span>
      <textarea className="field__input" rows={rows} placeholder={ph} value={s.fields[k(key)] ?? ''} onChange={(e) => actions.setField(k(key), e.target.value)} /></label>
  )
  return (
    <div className="semana">
      <div className="semana__nav" role="group" aria-label="Selecionar semana">
        <button type="button" className="iconbtn" aria-label="Semana anterior" disabled={w <= 1} onClick={() => setW(w - 1)}>{Icon.back}</button>
        <h3 aria-live="polite">Semana {w} <small>de 13 · dias {days[0]} a {days[days.length - 1]}</small></h3>
        <button type="button" className="iconbtn" aria-label="Próxima semana" disabled={w >= 13} onClick={() => setW(w + 1)}>{Icon.arrow}</button>
      </div>
      <section className="panel" aria-label="Planejamento semanal">
        <header className="panel__head"><h3>Planejamento</h3><span className="pill">antes da semana começar</span></header>
        {F('metas', 'Três metas desta semana', '1. …\n2. …\n3. …', 3)}
        <ul className="semana__days">
          {days.map((d) => (
            <li key={d}>
              <label htmlFor={`sem-${w}-${d}`}><b>Dia {d}</b><small>{short(dateOfDay(s, d))}</small></label>
              <input id={`sem-${w}-${d}`} type="text" className="input" placeholder="Treino, tarefa-chave, compromisso…" value={s.fields[k(`d${d}`)] ?? ''} onChange={(e) => actions.setField(k(`d${d}`), e.target.value)} />
            </li>
          ))}
        </ul>
      </section>
      <section className="panel" aria-label="Avaliação semanal">
        <header className="panel__head"><h3>Avaliação</h3><span className="pill">ao final da semana</span></header>
        <ul className="scale">
          {SCALES.map(([id, label]) => {
            const v = s.ratings[k(id)]
            return (
              <li key={id}>
                <span id={`sc-${id}`}>{label}</span>
                <div role="radiogroup" aria-labelledby={`sc-${id}`} className="scale__opts">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={v === n} className={`scale__opt ${v === n ? 'is-on' : ''} ${v != null && n <= v ? 'is-fill' : ''}`} onClick={() => actions.setRating(k(id), n)} aria-label={`${label}: ${n} de 5`}>{n}</button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
        {F('bom', 'O que funcionou nesta semana')}
        {F('ruim', 'O que atrapalhou')}
        {F('ajuste', 'Um ajuste para a próxima semana', 'Mude uma coisa por vez.')}
      </section>
    </div>
  )
}

/* ---------- Objetivos ---------- */
export function Objetivos() {
  const fields = useStore((s) => s.fields)
  const checks = useStore((s) => s.checks)
  return (
    <section className="panel" aria-label="Meus objetivos">
      <ol className="obj">
        {[0, 1, 2].map((i) => {
          const text = fields[`prog:obj:${i}`] ?? ''
          const on = !!checks[`prog:obj:c:${i}`]
          return (
            <li key={i} className={on ? 'is-done' : ''}>
              <span className="top3__n" aria-hidden="true">{i + 1}</span>
              <textarea className="field__input" rows={2} value={text} aria-label={`Objetivo ${i + 1}`} placeholder={['Ex.: estar na cama às 23h de domingo a quinta', 'Ex.: dois treinos de força e duas caminhadas por semana', 'Ex.: começar pela tarefa mais importante antes de abrir mensagens'][i]} onChange={(e) => actions.setField(`prog:obj:${i}`, e.target.value)} />
              <CheckBox checked={on} onChange={() => actions.toggle(`prog:obj:c:${i}`, `Objetivo alcançado: ${text || `objetivo ${i + 1}`}`)}><span className="obj__lbl">Alcançado</span></CheckBox>
            </li>
          )
        })}
      </ol>
      <p className="hint">Objetivos de processo: específicos, mensuráveis e ajustados ao seu ponto de partida. Revise-os ao final de cada fase.</p>
    </section>
  )
}

/* ---------- Diário de reflexões ---------- */
interface Entry { at: string; text: string }
export function Diario() {
  const raw = useStore((s) => s.fields['diario'])
  const [text, setText] = useState('')
  let list: Entry[] = []
  try { list = raw ? JSON.parse(raw) : [] } catch { /* ignore */ }
  const save = (l: Entry[]) => actions.setField('diario', JSON.stringify(l))
  const add = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim()) return; save([{ at: new Date().toISOString(), text: text.trim() }, ...list]); setText('') }
  return (
    <section className="panel diario" aria-label="Diário de reflexões">
      <form onSubmit={add}>
        <label className="field"><span className="field__label">Nova reflexão</span>
          <textarea className="field__input" rows={4} value={text} placeholder="O que percebi hoje? O que quero lembrar?" onChange={(e) => setText(e.target.value)} /></label>
        <button type="submit" className="btn btn--primary" disabled={!text.trim()}>Guardar reflexão</button>
      </form>
      <ul className="diario__list">
        <AnimatePresence initial={false}>
          {list.map((en) => (
            <motion.li key={en.at} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }}>
              <time dateTime={en.at}>{fmtDate(en.at)}</time>
              <p>{en.text}</p>
              <button type="button" className="iconbtn iconbtn--sm no-print" aria-label={`Apagar reflexão de ${fmtDate(en.at)}`} onClick={() => save(list.filter((x) => x.at !== en.at))}>{Icon.trash}</button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {list.length === 0 && <p className="hint">Suas reflexões guardadas aparecem aqui, da mais recente para a mais antiga.</p>}
    </section>
  )
}

/* ---------- Painel ---------- */
function WeeksChart({ weeks, current }: { weeks: number[]; current: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560, H = 190, L = 34, B = 26, T = 12, cw = (W - L - 8) / 13, bw = 14, ph = H - B - T
  return (
    <figure className="chart">
      <figcaption>Consistência dos hábitos por semana <small>percentual de hábitos marcados</small></figcaption>
      <div className="chart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de barras: percentual de hábitos marcados em cada uma das 13 semanas. Os valores estão na tabela abaixo.">
          {[0, 0.5, 1].map((g) => (
            <g key={g}><line className="chart__grid" x1={L} x2={W - 4} y1={T + ph * (1 - g)} y2={T + ph * (1 - g)} /><text className="chart__axis" x={L - 8} y={T + ph * (1 - g) + 4} textAnchor="end">{g * 100}%</text></g>
          ))}
          {weeks.map((v, i) => {
            const h = Math.max(v > 0 ? 3 : 0, ph * v), x = L + cw * i + (cw - bw) / 2, y = T + ph - h
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={L + cw * i} y={T} width={cw} height={ph + B} fill="transparent" />
                {h > 0 && <path className={`chart__bar ${i + 1 === current ? 'is-current' : ''} ${hover === i ? 'is-hover' : ''}`} d={`M${x},${y + ph * 0 + h} v${-(h - Math.min(4, h))} q0,${-Math.min(4, h)} ${Math.min(4, h)},${-Math.min(4, h)} h${bw - 2 * Math.min(4, h)} q${Math.min(4, h)},0 ${Math.min(4, h)},${Math.min(4, h)} v${h - Math.min(4, h)} z`} />}
                <text className={`chart__axis ${i + 1 === current ? 'is-current' : ''}`} x={L + cw * i + cw / 2} y={H - 8} textAnchor="middle">S{i + 1}</text>
              </g>
            )
          })}
        </svg>
        {hover != null && (
          <div className="chart__tip" style={{ left: `${((L + cw * hover + cw / 2) / W) * 100}%` }} aria-hidden="true">
            <b>{Math.round(weeks[hover] * 100)}%</b><span>Semana {hover + 1}{hover + 1 === current ? ' (atual)' : ''}</span>
          </div>
        )}
      </div>
      <details className="chart__table"><summary>Ver como tabela</summary>
        <table className="table table--compact"><thead><tr><th scope="col">Semana</th><th scope="col">Hábitos marcados</th></tr></thead>
          <tbody>{weeks.map((v, i) => <tr key={i}><th scope="row">Semana {i + 1}</th><td>{Math.round(v * 100)}%</td></tr>)}</tbody></table>
      </details>
    </figure>
  )
}

const SERIES = [['aval:inicial', 'Início'], ['prog:aval:30', '30 dias'], ['prog:aval:60', '60 dias'], ['prog:aval:90', '90 dias']] as const
function EvolutionChart({ ratings }: { ratings: Record<string, number> }) {
  const present = SERIES.filter(([p]) => AREAS.some((a) => ratings[`${p}:${a.id}`] != null))
  if (!present.length) return <p className="hint">Faça a <a className="link" href={href('c1-autoavaliacao')}>autoavaliação inicial</a> para ver aqui a sua linha de base. As avaliações de 30, 60 e 90 dias serão comparadas a ela.</p>
  const x = (v: number) => `${((v - 1) / 9) * 100}%`
  return (
    <figure className="chart">
      <figcaption>Evolução por área <small>notas de 1 a 10 em cada avaliação</small></figcaption>
      <ul className="chart__legend">{present.map(([p, l]) => <li key={p}><i className={`dot dot--${SERIES.findIndex((s) => s[0] === p)}`} />{l}</li>)}</ul>
      <ul className="dots">
        {AREAS.map((a) => {
          const vals = present.map(([p, l]) => ({ p, l, v: ratings[`${p}:${a.id}`] })).filter((d) => d.v != null)
          const min = Math.min(...vals.map((d) => d.v)), max = Math.max(...vals.map((d) => d.v))
          return (
            <li key={a.id} className="dots__row">
              <span className="dots__label">{a.label}</span>
              <div className="dots__track" role="img" aria-label={`${a.label}: ${vals.map((d) => `${d.l} ${d.v}`).join(', ') || 'sem notas'}`}>
                {vals.length > 1 && <span className="dots__link" style={{ left: x(min), width: `calc(${x(max)} - ${x(min)})` }} />}
                {vals.map((d) => <span key={d.p} className={`dot dot--${SERIES.findIndex((s) => s[0] === d.p)}`} style={{ left: x(d.v) }} title={`${d.l}: ${d.v}`} />)}
              </div>
              <span className="dots__val">{vals.length ? vals[vals.length - 1].v : '–'}</span>
            </li>
          )
        })}
      </ul>
      <p className="dots__scale" aria-hidden="true"><span>1</span><span>5</span><span>10</span></p>
      <details className="chart__table"><summary>Ver como tabela</summary>
        <table className="table table--compact"><thead><tr><th scope="col">Área</th>{present.map(([p, l]) => <th key={p} scope="col">{l}</th>)}</tr></thead>
          <tbody>{AREAS.map((a) => <tr key={a.id}><th scope="row">{a.label}</th>{present.map(([p]) => <td key={p}>{ratings[`${p}:${a.id}`] ?? '–'}</td>)}</tr>)}</tbody></table>
      </details>
    </figure>
  )
}

export function Painel() {
  const s = useAll()
  const st = stats(s)
  const read = pages.filter((p) => s.visited[p.id]).length
  const log = [...s.log].sort((a, b) => b.at.localeCompare(a.at))
  const [all, setAll] = useState(false)
  return (
    <div className="painel">
      {!s.startDate && <IniciarPrograma />}
      <section className="tiles" aria-label="Indicadores">
        <div className="tile tile--hero">
          <Ring value={st.daysDone / TOTAL_DAYS} size={148} stroke={8} label="Dias concluídos no programa"><span className="ring__big">{st.daysDone}</span><span className="ring__small">de 90 dias</span></Ring>
          <div><h3>Dias concluídos</h3><p>{s.startDate ? <>Você está no <b>dia {st.today}</b>, Fase {phaseOfDay(st.today).n}.</> : 'O programa ainda não foi iniciado.'}</p><a className="btn btn--primary btn--sm" href={href('hoje')}><span>Registrar hoje</span>{Icon.arrow}</a></div>
        </div>
        <div className="tile"><span className="tile__v">{st.streak}</span><span className="tile__l">{st.streak === 1 ? 'dia seguido' : 'dias seguidos'}</span><span className="tile__s">sequência atual</span></div>
        <div className="tile"><span className="tile__v">{st.goalsDone}<small>/{st.goalsTotal}</small></span><span className="tile__l">metas das fases</span><Meter value={st.goalsDone / st.goalsTotal} label="Metas das fases concluídas" /></div>
        <div className="tile"><span className="tile__v">{st.ticks}</span><span className="tile__l">hábitos marcados</span><span className="tile__s">desde o início do ciclo</span></div>
        <div className="tile"><span className="tile__v">{Math.round((read / pages.length) * 100)}<small>%</small></span><span className="tile__l">do e-book lido</span><Meter value={read / pages.length} label="Progresso de leitura" /></div>
      </section>

      <section className="panel" aria-label="Fases do programa">
        <header className="panel__head"><h3>Fases</h3><a className="link" href={href('programa')}>Ver o programa</a></header>
        <ul className="pfases">
          {st.phaseGoals.map((p) => (
            <li key={p.id}>
              <a href={href(p.page)} className="pfases__name"><b>Fase {p.n}</b> {p.name}</a>
              <Meter value={p.done / p.goals} label={`Metas da fase ${p.n}`} />
              <span className="pfases__n">{p.done}/{p.goals}</span>
              <span className={`pill ${p.closed ? 'pill--ok' : ''}`}>{p.closed ? <>{Icon.check} Concluída</> : st.today >= p.from && st.today <= p.to ? 'Em andamento' : st.today > p.to ? 'Em aberto' : 'A seguir'}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="painel__charts">
        <section className="panel"><WeeksChart weeks={st.weeks} current={st.today ? Math.floor((st.today - 1) / 7) + 1 : 0} /></section>
        <section className="panel"><EvolutionChart ratings={s.ratings} /></section>
      </div>

      <section className="panel" aria-label="Histórico de metas concluídas">
        <header className="panel__head"><h3>Histórico de metas concluídas</h3><span className="pill">{log.length}</span></header>
        {log.length === 0
          ? <p className="hint">As metas de fase, objetivos e desafios que você marcar aparecem aqui com a data de conclusão.</p>
          : <ul className="hist">{(all ? log : log.slice(0, 8)).map((e) => <li key={e.key}><span className="hist__ic">{Icon.check}</span><span>{e.label}</span><time dateTime={e.at}>{fmtDate(e.at)}</time></li>)}</ul>}
        {log.length > 8 && <button type="button" className="btn btn--text" onClick={() => setAll((v) => !v)}>{all ? 'Mostrar menos' : `Mostrar todas (${log.length})`}</button>}
        {s.archive.length > 0 && <p className="hint">Ciclos anteriores: {s.archive.map((a) => `${a.cycle}º ciclo, ${a.daysDone} dias e ${a.goalsDone} metas concluídas`).join(' · ')}.</p>}
      </section>

      <nav className="quick" aria-label="Ferramentas de acompanhamento">
        <a href={href('hoje')}><b>Hoje</b><span>Checklist diário e rastreador</span></a>
        <a href={href('semana')}><b>Semana</b><span>Planejamento e avaliação</span></a>
        <a href={href('diario')}><b>Reflexões</b><span>Dificuldades e diário</span></a>
        <a href={href('c9-tabela')}><b>Rotina</b><span>Tabela diária editável</span></a>
      </nav>
    </div>
  )
}

/* ---------- Novo ciclo ---------- */
export function NovoCiclo() {
  const s = useAll()
  const [ask, setAsk] = useState(false)
  return (
    <section className="panel ciclo" aria-label="Revisar metas e iniciar novo ciclo">
      <div>
        <h3>Pronto para o próximo ciclo?</h3>
        <p>Revise o que você construiu e, quando quiser, comece novos 90 dias. Seu progresso atual é arquivado; capítulos lidos, reflexões e a rotina são mantidos.</p>
      </div>
      {ask ? (
        <div className="ciclo__confirm" role="alert">
          <p>Iniciar o {s.cycle + 1}º ciclo hoje? O calendário, os hábitos marcados e as metas das fases serão reiniciados.</p>
          <div className="btnrow">
            <button type="button" className="btn btn--primary" onClick={() => { actions.newCycle(); setAsk(false); navigate('programa') }}>Sim, iniciar novo ciclo</button>
            <button type="button" className="btn btn--text" onClick={() => setAsk(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="btnrow">
          <a className="btn btn--outline" href={href('painel')}><span>Revisar minhas metas</span></a>
          <button type="button" className="btn btn--primary" onClick={() => setAsk(true)}><span>Iniciar um novo ciclo de 90 dias</span>{Icon.arrow}</button>
        </div>
      )}
    </section>
  )
}

/* ---------- Certificado ---------- */
export function Certificado() {
  const s = useAll()
  const st = stats(s)
  const closedAt = s.checks['prog:f4:concluida']
  const phasesClosed = st.phaseGoals.filter((p) => p.closed).length
  const print = () => {
    document.documentElement.classList.add('print-cert')
    const off = () => { document.documentElement.classList.remove('print-cert'); window.removeEventListener('afterprint', off) }
    window.addEventListener('afterprint', off)
    window.print()
  }
  return (
    <div className="cert-wrap">
      <label className="minifield no-print cert__name"><span>Seu nome, como deve aparecer no certificado</span>
        <input className="input" type="text" value={s.name} maxLength={60} placeholder="Digite seu nome" autoComplete="name" onChange={(e) => actions.setName(e.target.value)} />
      </label>
      {!closedAt && (
        <p className="callout callout--nota no-print"><span className="callout__kind">Em andamento</span>
          O certificado é liberado quando você concluir a <a className="link" href={href('fase-4')}>Fase 4</a>. Até aqui: {phasesClosed} de 4 fases concluídas e {st.daysDone} dias registrados. Abaixo, uma prévia.</p>
      )}
      <motion.article className={`cert ${closedAt ? '' : 'is-preview'}`} aria-label="Certificado simbólico de conclusão"
        initial={{ opacity: 0, y: 24, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}>
        <div className="cert__inner">
          <p className="cert__brand">RECOME<span>ÇO</span></p>
          <p className="cert__kind">Certificado simbólico de conclusão</p>
          <p className="cert__txt">Este certificado reconhece que</p>
          <p className="cert__who">{s.name.trim() || 'Seu nome'}</p>
          <p className="cert__txt">concluiu o programa de transformação pessoal de 90 dias, construindo, dia após dia, novas escolhas para a saúde, os hábitos, a mente e a rotina.</p>
          <ul className="cert__stats">
            <li><b>{st.daysDone}</b><span>dias concluídos</span></li>
            <li><b>{st.goalsDone}</b><span>metas alcançadas</span></li>
            <li><b>{s.cycle}º</b><span>ciclo</span></li>
          </ul>
          <p className="cert__date">{closedAt ? fmtDate(closedAt) : 'Data de conclusão'}</p>
          <p className="cert__quote">"Você não precisa mudar tudo em um dia. Precisa construir, todos os dias, as escolhas que deseja levar para o resto da vida."</p>
          {!closedAt && <span className="cert__stamp" aria-hidden="true">Prévia</span>}
        </div>
      </motion.article>
      <div className="btnrow no-print cert__actions">
        <button type="button" className="btn btn--primary" onClick={print}>{Icon.print}<span>Imprimir ou salvar em PDF</span></button>
        <a className="btn btn--outline" href={href('painel')}>Revisar minhas metas</a>
      </div>
    </div>
  )
}
