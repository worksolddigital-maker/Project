import { Fragment, type ReactNode } from 'react'
import { href } from '../lib/router'

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g

/**
 * Texto com marcação mínima usada nos arquivos de conteúdo:
 * **negrito**, [rótulo](pagina), [rótulo](pagina/ancora), [rótulo](ref:chave) e [rótulo](https://…).
 */
export function Rich({ text }: { text: string }): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null
    if (part.startsWith('**')) return <strong key={i}><Rich text={part.slice(2, -2)} /></strong>
    const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (m) {
      const [, label, target] = m
      if (/^https?:/.test(target)) {
        return <a key={i} className="link link--ext" href={target} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (abre em nova aba)</span></a>
      }
      if (target.startsWith('ref:')) {
        return <a key={i} className="link link--ref" href={href('referencias', target.slice(4))} title="Ver a fonte nas referências">{label}</a>
      }
      const [page, anchor] = target.split('/')
      return <a key={i} className="link" href={href(page, anchor)}>{label}</a>
    }
    return <Fragment key={i}>{part.split('\n').map((line, j) => (j ? <Fragment key={j}><br />{line}</Fragment> : line))}</Fragment>
  })
}
