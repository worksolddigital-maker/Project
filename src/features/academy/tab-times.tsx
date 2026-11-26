"use client";

import { Clock, Newspaper } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge, Panel } from "@/components/ui/misc";
import { useNowMinute } from "@/hooks/use-client-store";
import { cn } from "@/lib/cn";
import { formatTime, zonedParts } from "@/lib/domain/dates";
import {
  londonNewYorkOverlap,
  sessionWindows,
  TIMEFRAMES,
} from "@/lib/academy/sessions";

const COLORS: Record<string, string> = {
  sydney: "bg-info/70",
  toquio: "bg-warn/70",
  londres: "bg-pos/70",
  "nova-york": "bg-neg/70",
};

/** Minutes since local midnight in the viewer's time zone. */
const minuteOfDay = (iso: string, tz: string) => {
  const p = zonedParts(iso, tz);
  return p.hour * 60 + p.minute;
};

export function TimesTab({ tz }: { tz: string }) {
  const minute = useNowMinute();
  const now = useMemo(() => (minute ? new Date(minute) : new Date()), [minute]);
  const windows = useMemo(() => sessionWindows(now), [now]);
  const overlap = londonNewYorkOverlap(windows);
  const nowMin = minuteOfDay(now.toISOString(), tz);

  return (
    <div className="grid grid-cols-1 gap-4">
      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-subtle" /> Sessões do mercado no seu
            horário
          </span>
        }
        subtitle={`Horários convertidos para ${tz.replace("_", " ")}, já considerando horário de verão de cada país. Cripto funciona 24 horas, todos os dias.`}
        data-testid="sessions"
      >
        <div
          className="relative mb-5 h-14 rounded-lg border border-line bg-white/[0.02]"
          aria-hidden
        >
          {windows.map((w, i) => {
            const a = minuteOfDay(w.start, tz);
            const b = minuteOfDay(w.end, tz);
            const segs =
              b > a
                ? [[a, b]]
                : [
                    [a, 1440],
                    [0, b],
                  ];
            return segs.map(([s, e], j) => (
              <div
                key={`${w.session.id}-${j}`}
                className={cn(
                  "absolute h-2.5 rounded-full",
                  COLORS[w.session.id],
                  w.open ? "opacity-100" : "opacity-45",
                )}
                style={{
                  left: `${(s / 1440) * 100}%`,
                  width: `${((e - s) / 1440) * 100}%`,
                  top: 6 + i * 11,
                }}
              />
            ));
          })}
          <div
            className="absolute top-0 bottom-0 w-px bg-fg"
            style={{ left: `${(nowMin / 1440) * 100}%` }}
          >
            <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-fg px-1 text-[9px] font-semibold text-[#07080a]">
              agora
            </span>
          </div>
        </div>
        <div
          className="mb-4 flex justify-between text-[10px] text-subtle"
          aria-hidden
        >
          {["00h", "06h", "12h", "18h", "24h"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {windows.map((w) => (
            <li
              key={w.session.id}
              className={cn(
                "rounded-xl border p-3",
                w.open
                  ? "border-pos/30 bg-pos/[0.04]"
                  : "border-line bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <span
                    className={cn("size-2 rounded-full", COLORS[w.session.id])}
                  />{" "}
                  {w.session.name}
                </p>
                <Badge tone={w.open ? "pos" : "neutral"}>
                  {w.open ? "Aberta" : "Fechada"}
                </Badge>
              </div>
              <p className="num mt-1 text-lg text-fg">
                {formatTime(w.start, tz)} – {formatTime(w.end, tz)}
              </p>
              <p className="text-[11px] text-subtle">
                {w.open
                  ? "Sessão em andamento"
                  : `Próxima abertura: ${new Date(w.start).toLocaleDateString("pt-BR", { timeZone: tz, weekday: "short", day: "2-digit" })}`}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {w.session.note}
              </p>
            </li>
          ))}
        </ul>
        <p
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-xs",
            overlap
              ? "border-warn/30 bg-warn/[0.06] text-warn"
              : "border-line text-muted",
          )}
        >
          {overlap
            ? "Londres e Nova York estão abertas ao mesmo tempo agora: é o período de maior volume e de movimentos mais rápidos do forex."
            : "Quando Londres e Nova York se sobrepõem, o forex tem o maior volume do dia e movimentos mais rápidos. Fora das sessões, o mercado fica mais lento e os pavios mais irregulares."}
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Tempos gráficos: o que observar em cada um"
          subtitle="Leia do maior para o menor: o tempo maior diz a direção, o menor mostra o momento"
        >
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] tracking-wider text-subtle uppercase">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">Tempo</th>
                  <th className="py-2 pr-3 font-medium">Para que serve</th>
                  <th className="py-2 font-medium">Antes, confira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {TIMEFRAMES.map((t) => (
                  <tr key={t.tf}>
                    <td className="py-2.5 pr-3 align-top">
                      <span className="mono font-semibold text-fg">{t.tf}</span>
                      <p className="text-[11px] text-subtle">{t.label}</p>
                    </td>
                    <td className="py-2.5 pr-3 align-top text-[13px] text-muted">
                      {t.use}
                    </td>
                    <td className="py-2.5 align-top text-[13px] text-muted">
                      {t.context}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Regras de tempo para observar, comprar e vender">
          <ol className="space-y-2.5 text-[13px] leading-relaxed text-muted">
            {[
              "Comece pelo tempo maior (M15 ou H1): marque a tendência e os suportes e resistências.",
              "Desça para o tempo da entrada (M1 ou M5) e espere o preço chegar num desses níveis.",
              "Espere a vela do padrão fechar. Vela ainda aberta pode mudar de formato até o último segundo.",
              "Espere a confirmação: a vela seguinte rompendo a máxima (compra) ou a mínima (venda) do padrão.",
              "Observe pelo menos 20 a 30 velas antes de decidir: um padrão isolado, sem contexto, quase não tem valor.",
              "Evite os minutos em torno de notícias importantes e da abertura das sessões: os pavios ficam longos e imprevisíveis.",
            ].map((r, i) => (
              <li key={r} className="flex gap-2.5">
                <span className="num grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] text-fg">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
          <Link
            href="/mercado"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-info hover:underline"
          >
            <Newspaper className="size-3.5" /> Ver as notícias de agora em
            Mercado ao vivo
          </Link>
        </Panel>
      </div>
    </div>
  );
}
