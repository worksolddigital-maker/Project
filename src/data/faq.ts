/**
 * Perguntas frequentes da página inicial.
 * TODO: respostas informativas — revisar e aprovar com a profissional.
 */
import { site } from './site';

export interface FaqItem {
  q: string;
  a: string;
  topic: 'Avaliação' | 'Planejamento' | 'Procedimentos' | 'Agendamento';
}

export const faq: FaqItem[] = [
  {
    topic: 'Avaliação',
    q: 'Como funciona a avaliação?',
    a: 'A avaliação é o primeiro passo de qualquer tratamento. É o momento de conversar sobre suas expectativas, analisar as características do seu rosto e da sua pele e entender quais caminhos fazem sentido para você. Nenhum procedimento é indicado sem essa etapa.',
  },
  {
    topic: 'Planejamento',
    q: 'O que é o Método SER?',
    a: 'É uma proposta de planejamento dos tratamentos por etapas, com acompanhamento e respeito ao tempo de evolução de cada paciente. Conforme a indicação, combina de forma estratégica tecnologias e procedimentos — como o Ultraformer MPT e os bioestimuladores de colágeno. Os resultados são construídos com planejamento, sem pressa e sem excessos.',
  },
  {
    topic: 'Planejamento',
    q: 'Os resultados ficam naturais?',
    a: 'A naturalidade é o princípio que orienta cada planejamento: a proposta é refinar, não transformar. Os resultados variam de pessoa para pessoa e são conversados com transparência durante a avaliação.',
  },
  {
    topic: 'Procedimentos',
    q: 'Quantas sessões são necessárias?',
    a: 'Depende do procedimento, das suas características e da resposta do seu organismo. Na remoção de tatuagem, por exemplo, o processo é progressivo. A estimativa é apresentada após a avaliação.',
  },
  {
    topic: 'Procedimentos',
    q: 'Quais são os valores dos procedimentos?',
    a: 'Os valores dependem do planejamento indicado para você e são apresentados após a avaliação, junto com todas as etapas do tratamento.',
  },
  {
    topic: 'Agendamento',
    q: 'Como faço para agendar?',
    a: `Basta enviar uma mensagem pelo WhatsApp ${site.phone.display}. Você recebe as informações sobre os horários disponíveis e as orientações para a sua avaliação.`,
  },
];
