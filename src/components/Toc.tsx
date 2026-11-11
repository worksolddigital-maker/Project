import { groups, pages, pagesOf } from '../content'
import { href } from '../lib/router'
import { useStore } from '../lib/store'
import { pageLabel, useReadingProgress } from './Shell'
import { Icon, Meter } from './ui'

export function Toc() {
  const visited = useStore((s) => s.visited)
  const { n, total, ratio } = useReadingProgress()
  return (
    <div className="toc">
      <header className="toc__head">
        <span className="hero__kicker">Sumário</span>
        <h1 className="toc__title" tabIndex={-1} data-page-title data-split>Índice</h1>
        <p className="toc__lead" data-reveal="">Nove capítulos, um programa de 90 dias e as ferramentas para acompanhar sua evolução. Toque em qualquer item para abrir.</p>
        <div className="toc__progress" data-reveal="">
          <Meter value={ratio} label="Progresso de leitura" />
          <span>{n} de {total} páginas visitadas</span>
        </div>
      </header>
      <ol className="toc__groups">
        {groups.map((g) => {
          const list = pagesOf(g.id).filter((p) => p.id !== 'indice')
          const done = list.filter((p) => visited[p.id]).length
          return (
            <li key={g.id} className="toc__group" data-reveal="">
              <div className="toc__ghead">
                <span className="toc__n" aria-hidden="true">{g.n ? String(g.n).padStart(2, '0') : '—'}</span>
                <div>
                  <span className="toc__glabel">{g.label}</span>
                  <h2 className="toc__gtitle"><a href={href(list[0].id)}>{g.title}</a></h2>
                </div>
                <span className="toc__gcount" aria-label={`${done} de ${list.length} páginas visitadas`}>{done}/{list.length}</span>
              </div>
              <ul className="toc__pages">
                {list.map((p) => (
                  <li key={p.id}>
                    <a className={`toc__link ${visited[p.id] ? 'is-visited' : ''}`} href={href(p.id)}>
                      <span className="toc__mark" aria-hidden="true">{visited[p.id] && Icon.check}</span>
                      <span className="toc__ptitle">{pageLabel(p)}</span>
                      <span className="toc__pn" aria-hidden="true">{String(pages.indexOf(p) + 1).padStart(2, '0')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
