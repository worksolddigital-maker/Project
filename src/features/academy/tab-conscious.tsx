"use client";

import {
  CircleCheck,
  CircleX,
  Hand,
  OctagonAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui/misc";
import { useReadyData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";
import { breakEvenWinRate } from "@/lib/academy/candles";
import { formatMoney, formatPct } from "@/lib/domain/money";

const CHECKLIST = [
  "A tendência no tempo maior está clara (ou sei que o mercado está lateral)",
  "O preço está num suporte, resistência ou formação conhecida",
  "O padrão de velas está completo e a vela já fechou",
  "Esperei a confirmação na vela seguinte",
  "Não há notícia importante nos próximos minutos",
  "O valor da entrada respeita o meu limite por operação",
  "Estou calmo: não estou tentando recuperar perda",
];

function PlanRow({
  label,
  value,
  limit,
  hit,
  hint,
}: {
  label: string;
  value: string;
  limit: string | null;
  hit: boolean;
  hint: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <p className="text-[13px] text-fg">{label}</p>
        <p className="text-[11px] text-subtle">
          {limit ? hint : "Sem limite definido"}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "num text-sm font-semibold",
            hit ? "text-neg" : "text-fg",
          )}
        >
          {value}
          {limit ? (
            <span className="font-normal text-subtle"> / {limit}</span>
          ) : null}
        </p>
        {limit && (
          <Badge tone={hit ? "neg" : "pos"}>{hit ? "Pare" : "Ok"}</Badge>
        )}
      </div>
    </li>
  );
}

export function ConsciousTab() {
  const { settings: s, portfolio: p, risk: m } = useReadyData();
  const cur = s.currency;
  const [checked, setChecked] = useState<boolean[]>(() =>
    CHECKLIST.map(() => false),
  );

  const withPayout = p.sortedTrades.filter(
    (t) => typeof t.payoutPct === "number",
  );
  const avgPayout = withPayout.length
    ? withPayout.reduce((a, t) => a + (t.payoutPct ?? 0), 0) / withPayout.length
    : s.defaultPayoutPct;
  const needed = breakEvenWinRate(avgPayout);
  const win = p.summary.winRate;
  const decisive = p.summary.wins + p.summary.losses;
  const gap = win === null ? null : win - needed;

  const today = p.todayStats;
  const lossHit =
    !!s.dailyLossLimitCents && -today.netCents >= s.dailyLossLimitCents;
  const streakHit =
    !!s.maxConsecutiveLosses && m.todayLossStreak >= s.maxConsecutiveLosses;
  const tradesHit = !!s.maxTradesPerDay && today.count >= s.maxTradesPerDay;
  const goalHit =
    !!s.dailyProfitGoalCents && today.netCents >= s.dailyProfitGoalCents;
  const stop = lossHit || streakHit || tradesHit;
  const noLimits =
    !s.dailyLossLimitCents && !s.maxConsecutiveLosses && !s.maxTradesPerDay;
  const raises = m.stakeIncreasesAfterLoss.length;

  const onePct = Math.max(0, Math.round(p.balanceCents * 0.01));
  const twoPct = Math.max(0, Math.round(p.balanceCents * 0.02));
  // Doubling after each loss: what five losses in a row cost.
  const base = s.maxStakeCents ? Math.min(s.maxStakeCents, 1000) : 1000;
  const martingale = [0, 1, 2, 3, 4].reduce((a, i) => a + base * 2 ** i, 0);
  const allChecked = checked.every(Boolean);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel
        className={cn(stop ? "border-neg/30" : goalHit ? "border-warn/30" : "")}
        title={
          <span className="inline-flex items-center gap-2">
            {stop ? (
              <OctagonAlert className="size-4 text-neg" />
            ) : (
              <ShieldCheck className="size-4 text-pos" />
            )}{" "}
            Seu plano hoje
          </span>
        }
        subtitle="Calculado com as suas operações e os limites que você definiu"
        data-testid="plan-today"
      >
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            stop
              ? "border-neg/30 bg-neg/[0.07] text-neg"
              : goalHit
                ? "border-warn/30 bg-warn/[0.07] text-warn"
                : "border-pos/25 bg-pos/[0.05] text-pos",
          )}
        >
          {stop
            ? "Pelo seu próprio plano, hoje é dia de parar. Amanhã o mercado continua aí."
            : goalHit
              ? "Meta do dia batida. Parar agora protege o resultado; continuar é arriscar o que já ganhou."
              : noLimits
                ? "Você ainda não definiu limites. Sem eles, não existe ponto de parada."
                : "Dentro do seu plano até agora."}
        </p>
        <ul className="mt-2 divide-y divide-line">
          <PlanRow
            label="Perda do dia"
            value={formatMoney(Math.max(0, -today.netCents), cur)}
            limit={
              s.dailyLossLimitCents
                ? formatMoney(s.dailyLossLimitCents, cur)
                : null
            }
            hit={lossHit}
            hint="Atingiu: encerre o dia"
          />
          <PlanRow
            label="Perdas seguidas hoje"
            value={String(m.todayLossStreak)}
            limit={
              s.maxConsecutiveLosses ? String(s.maxConsecutiveLosses) : null
            }
            hit={streakHit}
            hint="Atingiu: pausa obrigatória"
          />
          <PlanRow
            label="Operações hoje"
            value={String(today.count)}
            limit={s.maxTradesPerDay ? String(s.maxTradesPerDay) : null}
            hit={tradesHit}
            hint="Atingiu: chega por hoje"
          />
          <PlanRow
            label="Meta do dia"
            value={formatMoney(Math.max(0, today.netCents), cur)}
            limit={
              s.dailyProfitGoalCents
                ? formatMoney(s.dailyProfitGoalCents, cur)
                : null
            }
            hit={false}
            hint="Batida: considere encerrar"
          />
        </ul>
        {raises > 0 && (
          <p className="mt-2 text-xs text-warn">
            Hoje você aumentou o valor logo depois de uma perda {raises}{" "}
            vez(es). Esse é o comportamento que mais quebra bancas.
          </p>
        )}
        <Link
          href="/risco"
          className="mt-3 inline-block text-xs text-info hover:underline"
        >
          {noLimits ? "Definir meus limites" : "Ajustar limites"} →
        </Link>
      </Panel>

      <Panel
        title="A matemática do payout"
        subtitle="Quanto você precisa acertar só para não perder dinheiro"
        data-testid="break-even"
      >
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-line p-3">
            <p className="label-caps">Payout médio</p>
            <p className="num mt-1 text-xl font-semibold text-fg">
              {formatPct(avgPayout)}
            </p>
            <p className="text-[11px] text-subtle">
              {withPayout.length
                ? `${withPayout.length} operações`
                : "padrão das configurações"}
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="label-caps">Acerto necessário</p>
            <p className="num mt-1 text-xl font-semibold text-warn">
              {formatPct(needed)}
            </p>
            <p className="text-[11px] text-subtle">para empatar</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="label-caps">Seu acerto</p>
            <p
              className={cn(
                "num mt-1 text-xl font-semibold",
                gap === null
                  ? "text-muted"
                  : gap >= 0
                    ? "text-pos"
                    : "text-neg",
              )}
            >
              {formatPct(win)}
            </p>
            <p className="text-[11px] text-subtle">
              {decisive ? `${decisive} operações decididas` : "sem operações"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Com payout de {formatPct(avgPayout)}, cada acerto paga menos do que
          cada erro custa. Por isso acertar 50% não basta: é preciso acertar
          pelo menos {formatPct(needed)}.{" "}
          {gap === null
            ? "Registre suas operações para ver onde você está."
            : decisive < 30
              ? "Você ainda tem poucas operações: o número pode mudar muito."
              : gap >= 0
                ? "Seu histórico está acima desse ponto. Resultado passado não garante o futuro: mantenha os limites."
                : "Seu histórico está abaixo desse ponto: no ritmo atual, quanto mais operar, mais tende a perder."}
        </p>
      </Panel>

      <Panel
        title="Quando parar"
        subtitle="Regras que valem para qualquer estratégia"
      >
        <ul className="space-y-2 text-[13px] text-muted">
          {[
            "Bateu o limite de perda do dia: encerre, sem exceção.",
            `Perdeu ${s.maxConsecutiveLosses ?? 3} vezes seguidas: pare pelo menos 30 minutos e reveja o que fez no Diário.`,
            "Sentiu vontade de aumentar o valor para recuperar: é o sinal mais claro de que é hora de sair.",
            "Bateu a meta e começou a operar com menos critério.",
            "Está cansado, irritado, com pressa ou distraído.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Hand className="mt-0.5 size-3.5 shrink-0 text-neg" /> {t}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Quando não entrar e quando pode seguir">
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-2 text-[13px] text-muted">
            <li className="label-caps text-neg">Não entre</li>
            {[
              "Minutos antes e depois de notícias fortes (juros, inflação, emprego dos EUA)",
              "Logo na abertura de uma sessão",
              "Mercado lateral, sem nível claro",
              "Padrão sem confirmação ou vela ainda aberta",
              "Payout baixo, que exige acerto alto demais",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleX className="mt-0.5 size-3.5 shrink-0 text-neg" /> {t}
              </li>
            ))}
          </ul>
          <ul className="space-y-2 text-[13px] text-muted">
            <li className="label-caps text-pos">Pode seguir</li>
            {[
              "Dentro de todos os limites do dia",
              "A entrada passou no checklist",
              "Horário com movimento normal",
              "Calmo, seguindo o plano escrito",
              "Valor fixo por operação, sem compensar perdas",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-pos" />{" "}
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel
        title="Checklist antes de cada entrada"
        subtitle="Marque com honestidade. Se faltar um item, a resposta é esperar."
        data-testid="checklist"
      >
        <ul className="space-y-1.5">
          {CHECKLIST.map((item, i) => (
            <li key={item}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted hover:bg-white/[0.03]">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() =>
                    setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
                  }
                  className="mt-0.5 size-4 accent-[var(--color-pos)]"
                />
                <span className={checked[i] ? "text-fg" : ""}>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        <div
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-sm",
            allChecked && !stop
              ? "border-pos/30 bg-pos/[0.06] text-pos"
              : "border-line text-muted",
          )}
          data-testid="checklist-result"
        >
          {stop
            ? "Mesmo com tudo marcado: seu limite do dia já foi atingido."
            : allChecked
              ? "Entrada dentro das suas regras. Isso não garante o resultado; garante que você seguiu o plano."
              : `Faltam ${checked.filter((v) => !v).length} item(ns). Espere a próxima oportunidade.`}
          <button
            type="button"
            onClick={() => setChecked(CHECKLIST.map(() => false))}
            className="ml-2 text-xs text-subtle underline-offset-4 hover:underline"
          >
            limpar
          </button>
        </div>
      </Panel>

      <Panel title="Tamanho da entrada" subtitle="Com o seu saldo atual">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line p-3">
            <p className="label-caps">1% do saldo</p>
            <p className="num mt-1 text-lg font-semibold text-fg">
              {formatMoney(onePct, cur)}
            </p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="label-caps">2% do saldo</p>
            <p className="num mt-1 text-lg font-semibold text-fg">
              {formatMoney(twoPct, cur)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Arriscar de 1% a 2% por operação faz uma sequência ruim custar pouco.
          Com 10 perdas seguidas a 2%, a banca cai cerca de 18%; a 10%, cai 65%.
        </p>
        <p className="mt-2 rounded-lg border border-neg/25 bg-neg/[0.05] px-3 py-2 text-xs leading-relaxed text-muted">
          <strong className="text-neg">
            Dobrar a entrada depois de perder (martingale):
          </strong>{" "}
          começando com {formatMoney(base, cur)}, cinco perdas seguidas custam{" "}
          {formatMoney(martingale, cur)} para tentar ganhar menos de{" "}
          {formatMoney(base, cur)}. Sequências de 5 perdas acontecem com
          qualquer estratégia.
        </p>
      </Panel>

      <Panel className="xl:col-span-2" title="Antes de depositar">
        <p className="text-sm leading-relaxed text-muted">
          Confira se a corretora é autorizada a atuar no Brasil na página de
          alertas da CVM (gov.br/cvm). A CVM já emitiu alertas contra corretoras
          estrangeiras de opções binárias que captavam clientes brasileiros sem
          autorização. Opções binárias têm risco alto e prazo curtíssimo: use
          apenas dinheiro que você pode perder e pratique primeiro na conta demo
          da plataforma.
        </p>
      </Panel>
    </div>
  );
}
