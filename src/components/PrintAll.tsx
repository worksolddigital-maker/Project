import { groupById, pages } from '../content'
import { href } from '../lib/router'
import { Blocks, PrintCtx } from './Blocks'
import { imgUrl } from './Picture'
import { Icon } from './ui'
import { CAN_PRINT } from '../lib/env'

/** Versão contínua do e-book para impressão ou exportação em PDF (Ctrl/Cmd + P → "Salvar como PDF"). */
export function PrintAll() {
  const list = pages.filter((p) => !p.special)
  return (
    <PrintCtx.Provider value={true}>
      <div className="printall">
        <div className="printall__bar no-print">
          <a className="btn btn--text" href={href('indice')}>{Icon.back}<span>Voltar ao e-book</span></a>
          {CAN_PRINT ? <>
            <p>Versão para impressão. No diálogo, escolha <b>Salvar como PDF</b> para exportar.</p>
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>{Icon.print}<span>Imprimir / salvar PDF</span></button>
          </> : <p>Leitura contínua: todo o conteúdo do e-book em uma única página.</p>}
        </div>
        <section className="printall__cover">
          <img src={imgUrl('capa.webp')} width={1024} height={1536} alt="Capa do e-book RECOMEÇO: transforme sua vida" />
        </section>
        <section className="printall__page">
          <h1 tabIndex={-1} data-page-title>RECOMEÇO</h1>
          <p className="printall__sub">A construção de uma nova versão de si. Um guia prático para transformar sua saúde, seus hábitos, sua mente e sua rotina.</p>
          <ol className="printall__toc">{list.map((p) => <li key={p.id}><span>{groupById.get(p.group)!.label}</span> {p.title}</li>)}</ol>
        </section>
        {list.map((p) => (
          <section key={p.id} className="printall__page">
            <p className="printall__kicker">{groupById.get(p.group)!.label} · {groupById.get(p.group)!.title}</p>
            <h1>{p.title}</h1>
            {p.lead && <p className="printall__lead">{p.lead}</p>}
            <div className="article"><Blocks blocks={p.blocks} /></div>
          </section>
        ))}
      </div>
    </PrintCtx.Provider>
  )
}
