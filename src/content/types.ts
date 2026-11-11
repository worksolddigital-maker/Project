export type ImgKey =
  | 'inicio' | 'treino' | 'corrida' | 'mobilidade' | 'alimentacao' | 'feira' | 'sono' | 'foco' | 'mesa'
  | 'tempo' | 'habitos' | 'apoio' | 'mente' | 'equilibrio' | 'rotina' | 'programa' | 'metas' | 'jornada'

export type CalloutKind = 'nota' | 'atencao' | 'ajuda' | 'exemplo' | 'fonte'

export type WidgetName =
  | 'autoavaliacao' | 'top3' | 'timer5' | 'desafio7' | 'gatilhos' | 'respiracao' | 'tabelaRotina'
  | 'iniciarPrograma' | 'fases' | 'avaliacaoFase' | 'painel' | 'hoje' | 'calendario' | 'semana'
  | 'objetivos' | 'diario' | 'certificado' | 'novoCiclo' | 'referencias' | 'apoioContatos'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string; eyebrow?: string; id?: string }
  | { t: 'h3'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'steps'; items: [string, string][] }
  | { t: 'cards'; items: { tag?: string; title: string; text: string }[]; cols?: 2 | 3 }
  | { t: 'callout'; kind: CalloutKind; title?: string; text: string }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { t: 'quote'; text: string }
  | { t: 'image'; img: ImgKey; caption: string }
  | { t: 'mistakes'; items: [string, string][] }
  | { t: 'summary'; items: string[] }
  | { t: 'goals'; items: [string, string][] }
  | { t: 'checklist'; id: string; title: string; items: string[]; log?: string; hint?: string }
  | { t: 'field'; id: string; label: string; placeholder?: string; rows?: number }
  | { t: 'tabs'; tabs: { label: string; blocks: Block[] }[] }
  | { t: 'widget'; name: WidgetName; arg?: string }
  | { t: 'cta'; label: string; to: string; note?: string }

export type GroupId = 'abertura' | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8' | 'c9' | 'programa' | 'ferramentas' | 'final'

export interface Page {
  id: string
  group: GroupId
  title: string
  /** rótulo curto para menus */
  short?: string
  lead?: string
  img?: ImgKey
  special?: 'capa' | 'indice'
  blocks: Block[]
}

/* Construtores curtos para manter os arquivos de conteúdo legíveis. */
export const P = (text: string): Block => ({ t: 'p', text })
export const H = (text: string, eyebrow?: string, id?: string): Block => ({ t: 'h', text, eyebrow, id })
export const H3 = (text: string): Block => ({ t: 'h3', text })
export const UL = (...items: string[]): Block => ({ t: 'list', items })
export const OL = (...items: string[]): Block => ({ t: 'list', items, ordered: true })
export const Steps = (...items: [string, string][]): Block => ({ t: 'steps', items })
export const Cards = (cols: 2 | 3, ...items: [string, string, string?][]): Block => ({
  t: 'cards', cols, items: items.map(([title, text, tag]) => ({ title, text, tag })),
})
export const Note = (kind: CalloutKind, title: string, text: string): Block => ({ t: 'callout', kind, title, text })
export const Table = (head: string[], rows: string[][], caption?: string): Block => ({ t: 'table', head, rows, caption })
export const Quote = (text: string): Block => ({ t: 'quote', text })
export const Img = (img: ImgKey, caption: string): Block => ({ t: 'image', img, caption })
export const Mistakes = (...items: [string, string][]): Block => ({ t: 'mistakes', items })
export const Summary = (...items: string[]): Block => ({ t: 'summary', items })
export const Goals = (...items: [string, string][]): Block => ({ t: 'goals', items })
export const Check = (id: string, title: string, items: string[], opts: { log?: string; hint?: string } = {}): Block => ({
  t: 'checklist', id, title, items, ...opts,
})
export const Field = (id: string, label: string, placeholder?: string, rows = 3): Block => ({ t: 'field', id, label, placeholder, rows })
export const Tabs = (...tabs: [string, Block[]][]): Block => ({ t: 'tabs', tabs: tabs.map(([label, blocks]) => ({ label, blocks })) })
export const W = (name: WidgetName, arg?: string): Block => ({ t: 'widget', name, arg })
export const Cta = (label: string, to: string, note?: string): Block => ({ t: 'cta', label, to, note })
