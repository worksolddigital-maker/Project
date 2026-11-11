import type { WidgetName } from '../content/types'
import { ApoioContatos, Autoavaliacao, Desafio7, Gatilhos, Referencias, Respiracao, TabelaRotina, Timer5, Top3 } from './basic'
import { AvaliacaoFase, Calendario, Certificado, Diario, Fases, Hoje, IniciarPrograma, NovoCiclo, Objetivos, Painel, Semana } from './programa'

export function Widget({ name, arg }: { name: WidgetName; arg?: string }) {
  switch (name) {
    case 'autoavaliacao': return <Autoavaliacao />
    case 'top3': return <Top3 />
    case 'timer5': return <Timer5 />
    case 'desafio7': return <Desafio7 />
    case 'gatilhos': return <Gatilhos />
    case 'respiracao': return <Respiracao />
    case 'tabelaRotina': return <TabelaRotina />
    case 'apoioContatos': return <ApoioContatos />
    case 'referencias': return <Referencias />
    case 'iniciarPrograma': return <IniciarPrograma />
    case 'fases': return <Fases />
    case 'avaliacaoFase': return <AvaliacaoFase arg={arg} />
    case 'painel': return <Painel />
    case 'hoje': return <Hoje />
    case 'calendario': return <Calendario />
    case 'semana': return <Semana />
    case 'objetivos': return <Objetivos />
    case 'diario': return <Diario />
    case 'certificado': return <Certificado />
    case 'novoCiclo': return <NovoCiclo />
  }
}
