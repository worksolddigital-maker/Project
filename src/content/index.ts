import { parte1 } from './parte1'
import { parte2 } from './parte2'
import { parte3 } from './parte3'
import { abertura, ferramentas, final, programa } from './parte4'
import type { GroupId, ImgKey, Page } from './types'

export const pages: Page[] = [...abertura, ...parte1, ...parte2, ...parte3, ...programa, ...ferramentas, ...final]
export const pageById = new Map(pages.map((p) => [p.id, p]))
export const pageIndex = (id: string) => pages.findIndex((p) => p.id === id)

export interface Group { id: GroupId; label: string; title: string; n?: number }
export const groups: Group[] = [
  { id: 'abertura', label: 'Abertura', title: 'Abertura' },
  { id: 'c1', n: 1, label: 'Capítulo 1', title: 'O início da transformação' },
  { id: 'c2', n: 2, label: 'Capítulo 2', title: 'Saúde física e qualidade de vida' },
  { id: 'c3', n: 3, label: 'Capítulo 3', title: 'Alimentação e nutrição' },
  { id: 'c4', n: 4, label: 'Capítulo 4', title: 'Sono e recuperação' },
  { id: 'c5', n: 5, label: 'Capítulo 5', title: 'Foco, disciplina e produtividade' },
  { id: 'c6', n: 6, label: 'Capítulo 6', title: 'Como vencer a procrastinação' },
  { id: 'c7', n: 7, label: 'Capítulo 7', title: 'Abandonando hábitos e vícios' },
  { id: 'c8', n: 8, label: 'Capítulo 8', title: 'Saúde mental e equilíbrio' },
  { id: 'c9', n: 9, label: 'Capítulo 9', title: 'Construindo uma nova rotina' },
  { id: 'programa', label: 'Programa', title: 'Transformação em 90 dias' },
  { id: 'ferramentas', label: 'Ferramentas', title: 'Metas e acompanhamento' },
  { id: 'final', label: 'Encerramento', title: 'Sua nova jornada' },
]
export const groupById = new Map(groups.map((g) => [g.id, g]))
export const pagesOf = (g: GroupId) => pages.filter((p) => p.group === g)

export interface ImgMeta { alt: string; w: number; h: number; by: string }
export const images: Record<ImgKey, ImgMeta> = {
  inicio: { alt: 'Pessoa caminhando no alto de uma montanha ao nascer do sol', w: 1800, h: 1074, by: 'Marek Piwnicki' },
  treino: { alt: 'Fileira de halteres em uma academia com luz baixa', w: 1800, h: 1165, by: 'Jason Grant' },
  corrida: { alt: 'Silhueta de uma pessoa correndo em uma estrada ao amanhecer', w: 1800, h: 1262, by: 'Lucas Favre' },
  mobilidade: { alt: 'Pessoa se alongando sobre um tapete de ioga iluminado pelo sol', w: 1800, h: 1200, by: 'Junseong Lee' },
  alimentacao: { alt: 'Prato com ovo, legumes, folhas e abacate sobre mesa de madeira', w: 1800, h: 1225, by: 'Brooke Lark' },
  feira: { alt: 'Banca de feira com legumes, verduras e frutas frescas', w: 1800, h: 1200, by: 'Iñigo De la Maza' },
  sono: { alt: 'Quarto escuro com cama arrumada e um abajur aceso', w: 1800, h: 1200, by: 'Jp Valery' },
  foco: { alt: 'Mesa de trabalho organizada com notebook e cadeira', w: 1800, h: 1200, by: 'Luca Bravo' },
  mesa: { alt: 'Mesa de madeira com notebook, caneca, bloco de notas e celular', w: 1800, h: 1200, by: 'Andrew Neel' },
  tempo: { alt: 'Silhueta de uma ampulheta com areia caindo', w: 1800, h: 1200, by: 'Halil Celik' },
  habitos: { alt: 'Pessoa ao anoitecer com o rosto iluminado pela tela do celular', w: 1800, h: 1197, by: 'Rui Silvestre' },
  apoio: { alt: 'Silhuetas de três pessoas sentadas conversando diante da neblina', w: 1800, h: 1200, by: 'Priscilla Du Preez' },
  mente: { alt: 'Mulher sentada em um banco observando as montanhas ao pôr do sol', w: 1800, h: 1200, by: 'Sage Friedman' },
  equilibrio: { alt: 'Pedras empilhadas em equilíbrio em uma praia', w: 1800, h: 1200, by: 'Colton Sturgeon' },
  rotina: { alt: 'Caderno aberto com caneta ao lado de uma xícara de café', w: 1800, h: 1200, by: 'Priscilla Du Preez' },
  programa: { alt: 'Trilha estreita subindo uma encosta em direção a picos rochosos', w: 1800, h: 1013, by: 'Vadim Matei' },
  metas: { alt: 'Xícara de café sobre um planner mensal aberto', w: 1800, h: 1203, by: 'Estée Janssens' },
  jornada: { alt: 'Pessoa em pé sobre uma colina acima das nuvens ao amanhecer', w: 1800, h: 1015, by: 'Cristina Gottardi' },
}

export interface Ref { key: string; cat: 'inst' | 'sci' | 'serv'; text: string; url: string }
/** Todas as referências foram conferidas; não incluir fontes que não tenham sido consultadas. */
export const refs: Ref[] = [
  { key: 'oms-af', cat: 'inst', text: 'World Health Organization. WHO guidelines on physical activity and sedentary behaviour. Geneva: WHO; 2020.', url: 'https://www.who.int/publications/i/item/9789240015128' },
  { key: 'guia-af', cat: 'inst', text: 'Brasil. Ministério da Saúde. Guia de Atividade Física para a População Brasileira. Brasília: Ministério da Saúde; 2021.', url: 'https://www.gov.br/saude/pt-br/composicao/saps/ecv/publicacoes/guia-de-atividade-fisica-para-populacao-brasileira' },
  { key: 'guia-alimentar', cat: 'inst', text: 'Brasil. Ministério da Saúde. Guia Alimentar para a População Brasileira. 2. ed. Brasília: Ministério da Saúde; 2014.', url: 'https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf' },
  { key: 'oms-dieta', cat: 'inst', text: 'World Health Organization. Healthy diet (fact sheet).', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  { key: 'oms-saude-mental', cat: 'inst', text: 'World Health Organization. Mental health: strengthening our response (fact sheet).', url: 'https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response' },
  { key: 'oms-estresse', cat: 'inst', text: 'World Health Organization. Doing What Matters in Times of Stress: An Illustrated Guide. Geneva: WHO; 2020.', url: 'https://www.who.int/publications/i/item/9789240003927' },
  { key: 'oms-alcool', cat: 'inst', text: 'World Health Organization. Alcohol (fact sheet).', url: 'https://www.who.int/news-room/fact-sheets/detail/alcohol' },
  { key: 'oms-tabaco', cat: 'inst', text: 'World Health Organization. Tobacco (fact sheet).', url: 'https://www.who.int/news-room/fact-sheets/detail/tobacco' },
  { key: 'oms-jogos', cat: 'inst', text: 'World Health Organization. Gaming disorder: frequently asked questions (CID-11).', url: 'https://www.who.int/standards/classifications/frequently-asked-questions/gaming-disorder' },
  { key: 'medline-abstinencia', cat: 'inst', text: 'MedlinePlus, U.S. National Library of Medicine. Alcohol withdrawal.', url: 'https://medlineplus.gov/ency/article/000764.htm' },
  { key: 'inca-tabagismo', cat: 'serv', text: 'Instituto Nacional de Câncer (INCA). Programa Nacional de Controle do Tabagismo.', url: 'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude/programa-nacional-de-controle-do-tabagismo' },
  { key: 'caps', cat: 'serv', text: 'Brasil. Ministério da Saúde. Centros de Atenção Psicossocial (CAPS).', url: 'https://www.gov.br/saude/pt-br/composicao/saes/desmad/raps/caps' },
  { key: 'cvv', cat: 'serv', text: 'Centro de Valorização da Vida (CVV). Apoio emocional e prevenção do suicídio: telefone 188 e chat.', url: 'https://cvv.org.br/' },
  { key: 'ouvsus', cat: 'serv', text: 'Brasil. Ministério da Saúde. OuvSUS 136: canal de informações e ouvidoria do SUS.', url: 'https://www.gov.br/saude/ouvsus' },
  { key: 'bull2020', cat: 'sci', text: 'Bull FC, Al-Ansari SS, Biddle S, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. British Journal of Sports Medicine. 2020;54(24):1451–1462.', url: 'https://doi.org/10.1136/bjsports-2020-102955' },
  { key: 'monteiro2019', cat: 'sci', text: 'Monteiro CA, Cannon G, Levy RB, et al. Ultra-processed foods: what they are and how to identify them. Public Health Nutrition. 2019;22(5):936–941.', url: 'https://doi.org/10.1017/S1368980018003762' },
  { key: 'watson2015', cat: 'sci', text: 'Watson NF, Badr MS, Belenky G, et al. Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society. Sleep. 2015;38(6):843–844.', url: 'https://doi.org/10.5665/sleep.4716' },
  { key: 'hirshkowitz2015', cat: 'sci', text: 'Hirshkowitz M, Whiton K, Albert SM, et al. National Sleep Foundation’s sleep time duration recommendations: methodology and results summary. Sleep Health. 2015;1(1):40–43.', url: 'https://doi.org/10.1016/j.sleh.2014.12.010' },
  { key: 'chang2015', cat: 'sci', text: 'Chang AM, Aeschbach D, Duffy JF, Czeisler CA. Evening use of light-emitting eReaders negatively affects sleep, circadian timing, and next-morning alertness. PNAS. 2015;112(4):1232–1237.', url: 'https://doi.org/10.1073/pnas.1418490112' },
  { key: 'lally2010', cat: 'sci', text: 'Lally P, van Jaarsveld CHM, Potts HWW, Wardle J. How are habits formed: Modelling habit formation in the real world. European Journal of Social Psychology. 2010;40(6):998–1009.', url: 'https://doi.org/10.1002/ejsp.674' },
  { key: 'wood2007', cat: 'sci', text: 'Wood W, Neal DT. A new look at habits and the habit-goal interface. Psychological Review. 2007;114(4):843–863.', url: 'https://doi.org/10.1037/0033-295X.114.4.843' },
  { key: 'gollwitzer1999', cat: 'sci', text: 'Gollwitzer PM. Implementation intentions: Strong effects of simple plans. American Psychologist. 1999;54(7):493–503.', url: 'https://doi.org/10.1037/0003-066X.54.7.493' },
  { key: 'locke2002', cat: 'sci', text: 'Locke EA, Latham GP. Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. American Psychologist. 2002;57(9):705–717.', url: 'https://doi.org/10.1037/0003-066X.57.9.705' },
  { key: 'steel2007', cat: 'sci', text: 'Steel P. The nature of procrastination: A meta-analytic and theoretical review of quintessential self-regulatory failure. Psychological Bulletin. 2007;133(1):65–94.', url: 'https://doi.org/10.1037/0033-2909.133.1.65' },
  { key: 'sirois2013', cat: 'sci', text: 'Sirois F, Pychyl T. Procrastination and the Priority of Short-Term Mood Regulation: Consequences for Future Self. Social and Personality Psychology Compass. 2013;7(2):115–127.', url: 'https://doi.org/10.1111/spc3.12011' },
  { key: 'mark2008', cat: 'sci', text: 'Mark G, Gudith D, Klocke U. The cost of interrupted work: more speed and stress. Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (CHI ’08). 2008:107–110.', url: 'https://doi.org/10.1145/1357054.1357072' },
  { key: 'ward2017', cat: 'sci', text: 'Ward AF, Duke K, Gneezy A, Bos MW. Brain Drain: The Mere Presence of One’s Own Smartphone Reduces Available Cognitive Capacity. Journal of the Association for Consumer Research. 2017;2(2):140–154.', url: 'https://doi.org/10.1086/691462' },
]
export const refByKey = new Map(refs.map((r) => [r.key, r]))
