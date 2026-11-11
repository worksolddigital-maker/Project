import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { refs } from '../content'
import { CheckBox, Icon, Meter, Ring } from '../components/ui'
import { actions, AREAS, useStore } from '../lib/store'

/* ---------- utilidades ---------- */
function useJsonField<T>(key: string, fallback: T): [T, (v: T) => void] {
  const raw = useStore((s) => s.fields[key])
  let value = fallback
  if (raw) { try { value = JSON.parse(raw) as T } catch { /* mantém o padrão */ } }
  return [value, (v: T) => actions.setField(key, JSON.stringify(v))]
}

/* ---------- Notas por área (autoavaliação e avaliações de fase) ---------- */
export function RatingGrid({ prefix, compareTo }: { prefix: string; compareTo?: string }) {
  const ratings = useStore((s) => s.ratings)
  const vals = AREAS.map((a) => ratings[`${prefix}:${a.id}`])
  const filled = vals.filter((v) => v != null) as number[]
  const avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0
  return (
    <div className="rating">
      <ul className="rating__list">
        {AREAS.map((a) => {
          const v = ratings[`${prefix}:${a.id}`]
          const before = compareTo ? ratings[`${compareTo}:${a.id}`] : undefined
          return (
            <li key={a.id} className="rating__row">
              <label htmlFor={`${prefix}-${a.id}`} className="rating__label">{a.label}</label>
              <input
                id={`${prefix}-${a.id}`} type="range" min={1} max={10} step={1} value={v ?? 5}
                className={`rating__range ${v == null ? 'is-unset' : ''}`}
                style={{ ['--fill' as string]: `${(((v ?? 5) - 1) / 9) * 100}%` }}
                onChange={(e) => actions.setRating(`${prefix}:${a.id}`, Number(e.target.value))}
                onPointerDown={() => { if (v == null) actions.setRating(`${prefix}:${a.id}`, 5) }}
                aria-valuetext={v == null ? 'sem nota' : `${v} de 10`}
              />
              <output className="rating__val" htmlFor={`${prefix}-${a.id}`}>
                {v ?? '–'}
                {before != null && v != null && v !== before && <small className={v > before ? 'up' : 'down'}>{v > before ? '+' : ''}{v - before}</small>}
              </output>
            </li>
          )
        })}
      </ul>
      <p className="rating__sum" aria-live="polite">
        {filled.length === AREAS.length
          ? <>Média geral: <b>{avg.toFixed(1).replace('.', ',')}</b> de 10. Suas notas estão salvas e aparecem no <a className="link" href="#/painel">painel</a>.</>
          : <>Arraste cada controle para dar a nota. Faltam {AREAS.length - filled.length} de {AREAS.length} áreas.</>}
      </p>
    </div>
  )
}

export function Autoavaliacao() {
  const ratings = useStore((s) => s.ratings)
  const rated = AREAS.filter((a) => ratings[`aval:inicial:${a.id}`] != null)
  const lowest = [...rated].sort((a, b) => ratings[`aval:inicial:${a.id}`] - ratings[`aval:inicial:${b.id}`]).slice(0, 2)
  return (
    <section className="panel" aria-label="Autoavaliação inicial">
      <RatingGrid prefix="aval:inicial" />
      {rated.length === AREAS.length && (
        <motion.p className="panel__note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          Áreas que mais pedem atenção agora: <b>{lowest.map((a) => a.label).join(' e ')}</b>. Considere começar por elas na Fase 1.
        </motion.p>
      )}
    </section>
  )
}

/* ---------- Três prioridades do dia ---------- */
export function Top3() {
  const fields = useStore((s) => s.fields)
  const checks = useStore((s) => s.checks)
  const any = [0, 1, 2].some((i) => fields[`top3:${i}`] || checks[`top3:c:${i}`])
  const reset = () => [0, 1, 2].forEach((i) => { actions.setField(`top3:${i}`, ''); if (checks[`top3:c:${i}`]) actions.toggle(`top3:c:${i}`) })
  return (
    <section className="panel top3" aria-label="Três prioridades do dia">
      <ol className="top3__list">
        {[0, 1, 2].map((i) => {
          const done = !!checks[`top3:c:${i}`]
          return (
            <li key={i} className={done ? 'is-done' : ''}>
              <span className="top3__n" aria-hidden="true">{i + 1}</span>
              <input type="text" className="input" value={fields[`top3:${i}`] ?? ''} placeholder={['A tarefa mais importante do dia', 'Segunda prioridade', 'Terceira prioridade'][i]}
                aria-label={`Prioridade ${i + 1}`} onChange={(e) => actions.setField(`top3:${i}`, e.target.value)} />
              <CheckBox checked={done} onChange={() => actions.toggle(`top3:c:${i}`)}><span className="sr-only">Prioridade {i + 1} concluída</span></CheckBox>
            </li>
          )
        })}
      </ol>
      <div className="panel__foot">
        <p className="hint">Escreva com verbo e resultado: "enviar a proposta revisada".</p>
        {any && <button type="button" className="btn btn--text" onClick={reset}>Novo dia: limpar</button>}
      </div>
    </section>
  )
}

/* ---------- Método dos cinco minutos ---------- */
const FIVE = 5 * 60
export function Timer5() {
  const [left, setLeft] = useState(FIVE)
  const [running, setRunning] = useState(false)
  const end = useRef(0)
  useEffect(() => {
    if (!running) return
    end.current = Date.now() + left * 1000
    const id = window.setInterval(() => {
      const l = Math.max(0, Math.round((end.current - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) setRunning(false)
    }, 250)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  const done = left === 0
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')
  return (
    <section className={`panel timer ${done ? 'is-done' : ''}`} aria-label="Cronômetro de cinco minutos">
      <Ring value={1 - left / FIVE} size={168} stroke={6} label="Tempo decorrido">
        <span className="timer__time" role="timer" aria-live="off">{mm}:{ss}</span>
      </Ring>
      <div className="timer__side">
        <p className="timer__msg" aria-live="polite">
          {done ? 'Cinco minutos feitos. Você está livre para parar, ou pode aproveitar o embalo e continuar.'
            : running ? 'Só esta tarefa. O resto pode esperar cinco minutos.'
            : left < FIVE ? 'Pausado. Retome quando quiser.' : 'Escolha a tarefa, afaste o celular e comece.'}
        </p>
        <div className="timer__btns">
          {!done && <button type="button" className="btn btn--primary" onClick={() => setRunning((r) => !r)}>{running ? 'Pausar' : left < FIVE ? 'Continuar' : 'Começar cinco minutos'}</button>}
          {(left < FIVE) && <button type="button" className="btn btn--outline" onClick={() => { setRunning(false); setLeft(FIVE) }}>{done ? 'Mais cinco minutos' : 'Reiniciar'}</button>}
        </div>
      </div>
    </section>
  )
}

/* ---------- Desafio de sete dias ---------- */
const DESAFIO: [string, string][] = [
  ['Mapear', 'Liste tudo o que você vem adiando. Escolha uma única tarefa para trabalhar nesta semana.'],
  ['Cinco minutos', 'Use o cronômetro de cinco minutos na tarefa escolhida. Só começar já conta.'],
  ['Dividir', 'Quebre a tarefa em passos de até 30 minutos, cada um começando com um verbo. Faça o primeiro.'],
  ['Preparar o ambiente', 'Mesa limpa, celular em outro cômodo, notificações desligadas. Faça um bloco de 25 minutos.'],
  ['O mais difícil primeiro', 'Comece o dia pela parte que você mais evita, antes de abrir mensagens e redes.'],
  ['Prazo com testemunha', 'Combine com alguém uma entrega para hoje e avise quando terminar.'],
  ['Revisar', 'O que funcionou? Escreva seu plano "se–então" e escolha a tarefa da próxima semana.'],
]
export function Desafio7() {
  const checks = useStore((s) => s.checks)
  const done = DESAFIO.filter((_, i) => checks[`desafio7:${i}`]).length
  return (
    <section className="panel desafio" aria-label="Desafio de sete dias contra a procrastinação">
      <header className="panel__head">
        <h3>Sete dias, sete começos</h3>
        <span className="pill">{done}/7 dias</span>
      </header>
      <Meter value={done / 7} label="Progresso do desafio" />
      <ol className="desafio__list">
        {DESAFIO.map(([t, d], i) => {
          const on = !!checks[`desafio7:${i}`]
          return (
            <li key={i} className={`desafio__day ${on ? 'is-on' : ''}`}>
              <span className="desafio__n">Dia {i + 1}</span>
              <h4>{t}</h4>
              <p>{d}</p>
              <CheckBox checked={on} onChange={() => actions.toggle(`desafio7:${i}`, `Desafio de 7 dias · dia ${i + 1}: ${t}`)}>{on ? 'Concluído' : 'Marcar como feito'}</CheckBox>
            </li>
          )
        })}
      </ol>
      <AnimatePresence>
        {done === 7 && (
          <motion.p className="celebrate" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {Icon.check} Desafio concluído. Você treinou o gesto mais importante: começar. Ele entra para o seu histórico no painel.
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------- Mapa de gatilhos ---------- */
interface Trigger { q: string; g: string; f: string; a: string }
const EMPTY: Trigger = { q: '', g: '', f: '', a: '' }
export function Gatilhos() {
  const [rows, setRows] = useJsonField<Trigger[]>('c7:mapa', [])
  const [draft, setDraft] = useState<Trigger>(EMPTY)
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.g.trim() && !draft.f.trim()) return
    setRows([...rows, draft]); setDraft(EMPTY)
  }
  const F = (k: keyof Trigger, label: string, ph: string) => (
    <label className="minifield"><span>{label}</span>
      <input className="input" type="text" value={draft[k]} placeholder={ph} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
    </label>
  )
  return (
    <section className="panel" aria-label="Mapa de gatilhos">
      <form className="gat__form" onSubmit={add}>
        {F('q', 'Quando e onde', 'Ter, 22h, no sofá')}
        {F('g', 'Gatilho (o que senti ou aconteceu)', 'Cansaço depois de um dia tenso')}
        {F('f', 'O que fiz', 'Rolei o feed por 1h30')}
        {F('a', 'O que posso fazer no lugar', 'Banho e 10 páginas de um livro')}
        <button type="submit" className="btn btn--primary">{Icon.plus}<span>Adicionar registro</span></button>
      </form>
      {rows.length === 0
        ? <p className="hint">Nenhum registro ainda. Adicione o primeiro acima; depois de alguns dias, os padrões aparecem.</p>
        : (
          <div className="tablewrap__scroll" tabIndex={0} role="group" aria-label="Registros de gatilhos" data-lenis-prevent-touch>
            <table className="table table--compact">
              <thead><tr><th scope="col">Quando e onde</th><th scope="col">Gatilho</th><th scope="col">O que fiz</th><th scope="col">Alternativa</th><th scope="col"><span className="sr-only">Remover</span></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}><td>{r.q}</td><td>{r.g}</td><td>{r.f}</td><td>{r.a}</td>
                    <td><button type="button" className="iconbtn iconbtn--sm no-print" aria-label={`Remover registro ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>{Icon.trash}</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  )
}

/* ---------- Respiração guiada ---------- */
const IN = 4, OUT = 6
export function Respiracao() {
  const [on, setOn] = useState(false)
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!on) return
    const start = Date.now() - t * 1000
    const id = window.setInterval(() => setT(Math.floor((Date.now() - start) / 1000)), 200)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])
  const inCycle = t % (IN + OUT)
  const inhale = inCycle < IN
  const count = inhale ? IN - inCycle : IN + OUT - inCycle
  const cycles = Math.floor(t / (IN + OUT))
  return (
    <section className="panel breath" aria-label="Respiração guiada">
      <div className="breath__stage" aria-hidden="true">
        <motion.div className="breath__orb" animate={{ scale: on ? (inhale ? 1 : 0.58) : 0.72 }} transition={{ duration: on ? (inhale ? IN : OUT) : 0.8, ease: 'easeInOut' }} />
        <span className="breath__count">{on ? count : ''}</span>
      </div>
      <div className="breath__side">
        <p className="breath__phase" aria-live="polite">{on ? (inhale ? 'Inspire pelo nariz' : 'Solte o ar devagar') : 'Quatro segundos para inspirar, seis para soltar.'}</p>
        <p className="hint">{on ? `${cycles} ${cycles === 1 ? 'ciclo completo' : 'ciclos completos'} · cerca de dois a três minutos já ajudam` : 'Sente-se com os pés apoiados e os ombros soltos.'}</p>
        <button type="button" className="btn btn--primary" onClick={() => { setOn((v) => !v); if (on) setT(0) }}>{on ? 'Encerrar' : 'Começar a respirar'}</button>
      </div>
    </section>
  )
}

/* ---------- Tabela de rotina editável ---------- */
interface Row { h: string; a: string }
const PRESETS: Record<string, Row[]> = {
  'Horário diurno': [
    { h: '06:30', a: 'Acordar, água, janela aberta' }, { h: '06:45', a: 'Mobilidade ou caminhada curta' }, { h: '07:15', a: 'Café da manhã sem telas' },
    { h: '08:00', a: 'Bloco de foco: tarefa nº 1' }, { h: '10:00', a: 'Mensagens e e-mails em lote' }, { h: '12:30', a: 'Almoço e caminhada de 10 minutos' },
    { h: '14:00', a: 'Bloco de foco: tarefa nº 2' }, { h: '17:30', a: 'Fechamento do dia: três prioridades de amanhã' }, { h: '18:30', a: 'Treino' },
    { h: '20:00', a: 'Jantar e tempo livre' }, { h: '22:15', a: 'Telas desligadas, rotina noturna' }, { h: '23:00', a: 'Dormir' },
  ],
  'Turno tarde/noite': [
    { h: '09:00', a: 'Acordar, água, luz natural' }, { h: '09:30', a: 'Treino' }, { h: '10:30', a: 'Refeição principal' },
    { h: '11:30', a: 'Tarefas pessoais ou estudo (bloco de foco)' }, { h: '13:30', a: 'Preparar marmita e deslocamento' }, { h: '14:00', a: 'Trabalho' },
    { h: '18:30', a: 'Intervalo: refeição de verdade' }, { h: '22:30', a: 'Fim do turno, volta para casa' }, { h: '23:15', a: 'Desaceleração sem telas' }, { h: '00:30', a: 'Dormir' },
  ],
  'Turno da madrugada': [
    { h: '15:00', a: 'Acordar, água, luz forte' }, { h: '15:30', a: 'Refeição' }, { h: '16:30', a: 'Treino' },
    { h: '18:00', a: 'Tempo com a família, tarefas pessoais' }, { h: '20:30', a: 'Refeição principal e preparo de lanches' }, { h: '22:00', a: 'Trabalho' },
    { h: '02:00', a: 'Lanche leve; última cafeína' }, { h: '06:00', a: 'Fim do turno; óculos escuros no trajeto' }, { h: '07:00', a: 'Rotina de sono: quarto escuro e silencioso' }, { h: '07:30', a: 'Dormir' },
  ],
}
export function TabelaRotina() {
  const [rows, setRows] = useJsonField<Row[]>('c9:rotina', [])
  const [pending, setPending] = useState<string | null>(null)
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const load = (name: string) => { setRows(PRESETS[name]); setPending(null) }
  return (
    <section className="panel rotina" aria-label="Tabela de rotina diária editável">
      <div className="rotina__presets no-print">
        <span className="hint">Carregar modelo:</span>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} type="button" className="btn btn--outline btn--sm" onClick={() => (rows.length ? setPending(name) : load(name))}>{name}</button>
        ))}
      </div>
      {pending && (
        <p className="rotina__confirm" role="alert">Substituir sua tabela atual pelo modelo "{pending}"?{' '}
          <button type="button" className="btn btn--primary btn--sm" onClick={() => load(pending)}>Substituir</button>{' '}
          <button type="button" className="btn btn--text btn--sm" onClick={() => setPending(null)}>Cancelar</button></p>
      )}
      {rows.length === 0 && <p className="hint">Sua tabela está vazia. Carregue um modelo ou adicione a primeira linha.</p>}
      <ul className="rotina__rows">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.li key={i} className="rotina__row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
              <input type="time" className="input rotina__time" value={r.h} aria-label={`Horário da linha ${i + 1}`} onChange={(e) => set(i, { h: e.target.value })} />
              <input type="text" className="input" value={r.a} aria-label={`Atividade da linha ${i + 1}`} placeholder="Atividade" onChange={(e) => set(i, { a: e.target.value })} />
              <button type="button" className="iconbtn iconbtn--sm no-print" aria-label={`Remover linha ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>{Icon.trash}</button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="panel__foot no-print">
        <div className="btnrow">
          <button type="button" className="btn btn--outline" onClick={() => setRows([...rows, { h: '', a: '' }])}>{Icon.plus}<span>Adicionar linha</span></button>
          {rows.length > 1 && <button type="button" className="btn btn--text" onClick={() => setRows([...rows].sort((a, b) => a.h.localeCompare(b.h)))}>Ordenar por horário</button>}
        </div>
        <button type="button" className="btn btn--text" onClick={() => window.print()}>{Icon.print}<span>Imprimir</span></button>
      </div>
    </section>
  )
}

/* ---------- Serviços de apoio ---------- */
const refUrl = (k: string) => refs.find((r) => r.key === k)!.url
export function ApoioContatos() {
  const items: { t: string; d: string; tel?: string; url?: string }[] = [
    { t: 'Unidade Básica de Saúde (UBS)', d: 'Porta de entrada do SUS. Avaliação, orientação e encaminhamento para saúde mental, tabagismo, álcool e outras necessidades.' },
    { t: 'CAPS e CAPS AD', d: 'Centros de Atenção Psicossocial: atendimento gratuito em saúde mental e, nos CAPS AD, para álcool e outras drogas.', url: refUrl('caps') },
    { t: 'CVV · 188', d: 'Apoio emocional e prevenção do suicídio. Gratuito e sigiloso, 24 horas, por telefone e chat.', tel: '188', url: refUrl('cvv') },
    { t: 'SAMU · 192', d: 'Urgências e emergências: risco imediato à vida, convulsões, confusão mental, sinais de overdose.', tel: '192' },
    { t: 'Tratamento do tabagismo no SUS', d: 'Acompanhamento gratuito para parar de fumar, oferecido na rede pública. Procure a unidade de saúde mais próxima.', url: refUrl('inca-tabagismo') },
    { t: 'OuvSUS · 136', d: 'Canal do Ministério da Saúde para informações sobre serviços do SUS.', tel: '136', url: refUrl('ouvsus') },
  ]
  return (
    <ul className="apoio">
      {items.map((it) => (
        <li key={it.t} className="apoio__item">
          <h4>{it.t}</h4>
          <p>{it.d}</p>
          <div className="apoio__links">
            {it.tel && <a className="btn btn--outline btn--sm" href={`tel:${it.tel}`}>Ligar {it.tel}</a>}
            {it.url && <a className="link link--ext" href={it.url} target="_blank" rel="noopener noreferrer">Página oficial<span className="sr-only"> (abre em nova aba)</span></a>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Referências ---------- */
const CATS = [
  ['inst', 'Diretrizes e documentos de organismos de saúde'],
  ['sci', 'Publicações científicas'],
  ['serv', 'Serviços e programas públicos citados'],
] as const
export function Referencias() {
  return (
    <div className="refs">
      {CATS.map(([cat, title]) => (
        <section key={cat}>
          <h2 className="sec__title sec__title--sm">{title}</h2>
          <ol className="refs__list">
            {refs.filter((r) => r.cat === cat).map((r) => (
              <li key={r.key} id={`ref-${r.key}`}>
                <p>{r.text}</p>
                <a className="link link--ext" href={r.url} target="_blank" rel="noopener noreferrer">{r.url}<span className="sr-only"> (abre em nova aba)</span></a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
