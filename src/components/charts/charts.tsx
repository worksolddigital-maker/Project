"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatPct } from "@/lib/domain/money";
import type { Currency } from "@/lib/domain/types";
import { axisCommon, C, ChartEmpty, ChartLegend, ChartTooltipBox, compactMoney, toneOfValue } from "./chart-kit";

/* ------------------------------ Equity / balance ----------------------------- */

export interface EquityDatum {
  label: string;
  detail: string;
  balance: number; // cents
  delta: number; // cents
  kind: string;
}

export function EquityChart({ data, currency, height = 300 }: { data: EquityDatum[]; currency: Currency; height?: number }) {
  const gid = useId().replace(/:/g, "");
  if (data.length < 2) return <ChartEmpty height={height} message="Registre operações para visualizar a evolução do saldo." />;
  const up = data[data.length - 1].balance >= data[0].balance;
  const color = up ? C.pos : C.neg;
  return (
    <div style={{ height }} role="img" aria-label="Gráfico de evolução do saldo">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`eq-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" {...axisCommon} minTickGap={36} interval="preserveStartEnd" />
          <YAxis
            {...axisCommon}
            width={72}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => compactMoney(v, currency)}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as EquityDatum;
              return (
                <ChartTooltipBox
                  title={d.detail}
                  rows={[
                    { label: "Saldo", value: formatMoney(d.balance, currency) },
                    { label: d.kind, value: formatMoney(d.delta, currency, { signed: true }), tone: toneOfValue(d.delta) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill={`url(#eq-${gid})`}
            activeDot={{ r: 4.5, stroke: C.surface, strokeWidth: 2, fill: color }}
            dot={false}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------ P&L bars (signed) ---------------------------- */

export interface PnlDatum {
  label: string;
  detail?: string;
  net: number; // cents
  count: number;
  wins: number;
  losses: number;
  extra?: { label: string; value: string }[];
}

export function PnlBarChart({ data, currency, height = 260, emptyMessage }: { data: PnlDatum[]; currency: Currency; height?: number; emptyMessage?: string }) {
  if (!data.length || data.every((d) => d.count === 0)) return <ChartEmpty height={height} message={emptyMessage} />;
  return (
    <div style={{ height }} role="img" aria-label="Gráfico de lucro e prejuízo">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" {...axisCommon} minTickGap={12} interval="equidistantPreserveStart" />
          <YAxis {...axisCommon} width={72} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.16)" />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PnlDatum;
              return (
                <ChartTooltipBox
                  title={d.detail ?? d.label}
                  rows={[
                    { label: "Resultado", value: formatMoney(d.net, currency, { signed: true }), tone: toneOfValue(d.net) },
                    { label: "Operações", value: d.count },
                    { label: "WIN / LOSS", value: `${d.wins} / ${d.losses}` },
                    ...(d.extra ?? []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="net" maxBarSize={24} animationDuration={800}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? C.pos : C.neg} radius={(d.net >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as number} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- Win / loss donut ---------------------------- */

export function WinLossDonut({ wins, losses, draws, height = 220 }: { wins: number; losses: number; draws: number; height?: number }) {
  const total = wins + losses + draws;
  if (!total) return <ChartEmpty height={height} message="Nenhuma operação registrada." />;
  const data = [
    { name: "WIN", value: wins, color: C.pos },
    { name: "LOSS", value: losses, color: C.neg },
    { name: "Empate", value: draws, color: C.draw },
  ].filter((d) => d.value > 0);
  const winRate = wins + losses ? (wins / (wins + losses)) * 100 : null;
  return (
    <div>
      <div className="relative" style={{ height }} role="img" aria-label={`Distribuição: ${wins} WIN, ${losses} LOSS, ${draws} empates`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return <ChartTooltipBox rows={[{ label: p.name, value: `${p.value} (${formatPct((p.value / total) * 100)})`, color: p.color }]} />;
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke={C.surface}
              strokeWidth={2}
              cornerRadius={4}
              animationDuration={900}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-2xl font-semibold text-fg">{winRate === null ? "—" : formatPct(winRate)}</p>
            <p className="text-[11px] text-muted">taxa de acerto</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <ChartLegend
          items={[
            { label: `WIN ${wins}`, color: C.pos },
            { label: `LOSS ${losses}`, color: C.neg },
            { label: `Empate ${draws}`, color: C.draw },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------------------------------- Win rate --------------------------------- */

export interface WinRateDatum {
  label: string;
  detail: string;
  daily: number | null;
  cumulative: number | null;
  wins: number;
  losses: number;
}

export function WinRateChart({ data, height = 260 }: { data: WinRateDatum[]; height?: number }) {
  if (!data.length) return <ChartEmpty height={height} />;
  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            { label: "Acumulada", color: C.fg, kind: "line" },
            { label: "Do dia", color: C.blue, kind: "line" },
          ]}
        />
      </div>
      <div style={{ height }} role="img" aria-label="Gráfico da taxa de acerto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axisCommon} minTickGap={24} interval="preserveStartEnd" />
            <YAxis {...axisCommon} width={44} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.14)" />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.18)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as WinRateDatum;
                return (
                  <ChartTooltipBox
                    title={d.detail}
                    rows={[
                      { label: "Acumulada", value: formatPct(d.cumulative), color: C.fg },
                      { label: "Do dia", value: formatPct(d.daily), color: C.blue },
                      { label: "WIN / LOSS", value: `${d.wins} / ${d.losses}` },
                    ]}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="daily" stroke={C.blue} strokeWidth={1.5} strokeOpacity={0.7} dot={false} connectNulls animationDuration={800} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={C.fg}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: C.surface, strokeWidth: 2, fill: C.fg }}
              connectNulls
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------- Horizontal ranking bars ------------------------ */

export interface RankDatum {
  name: string;
  net: number;
  count: number;
  winRate: number | null;
}

export function RankBarChart({ data, currency, maxItems = 8 }: { data: RankDatum[]; currency: Currency; maxItems?: number }) {
  if (!data.length) return <ChartEmpty height={200} />;
  const items = data.slice(0, maxItems);
  const height = Math.max(160, items.length * 38 + 24);
  return (
    <div style={{ height }} role="img" aria-label="Ranking por resultado">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={C.grid} horizontal={false} />
          <XAxis type="number" {...axisCommon} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <YAxis type="category" dataKey="name" {...axisCommon} width={112} tick={{ ...axisCommon.tick, fill: C.muted, fontFamily: "var(--font-geist-sans)" }} />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.16)" />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as RankDatum;
              return (
                <ChartTooltipBox
                  title={d.name}
                  rows={[
                    { label: "Resultado", value: formatMoney(d.net, currency, { signed: true }), tone: toneOfValue(d.net) },
                    { label: "Operações", value: d.count },
                    { label: "Taxa de acerto", value: formatPct(d.winRate) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="net" maxBarSize={18} animationDuration={800}>
            {items.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? C.pos : C.neg} radius={(d.net >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as unknown as number} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------- Goal history (bars + target) ------------------- */

export function GoalBarChart({ data, currency, goal, height = 220 }: { data: PnlDatum[]; currency: Currency; goal: number | null; height?: number }) {
  if (!data.some((d) => d.count > 0)) return <ChartEmpty height={height} message="Sem operações no período." />;
  return (
    <div style={{ height }} role="img" aria-label="Resultado comparado à meta">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" {...axisCommon} minTickGap={10} interval="equidistantPreserveStart" />
          <YAxis {...axisCommon} width={72} tickFormatter={(v: number) => compactMoney(v, currency)} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.16)" />
          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke={C.fg}
              strokeOpacity={0.55}
              label={{ value: "Meta", position: "insideTopRight", fill: C.muted, fontSize: 11 }}
            />
          )}
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PnlDatum;
              return (
                <ChartTooltipBox
                  title={d.detail ?? d.label}
                  rows={[
                    { label: "Resultado", value: formatMoney(d.net, currency, { signed: true }), tone: toneOfValue(d.net) },
                    ...(goal !== null ? [{ label: "Meta", value: formatMoney(goal, currency) }] : []),
                    { label: "Operações", value: d.count },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="net" maxBarSize={24} animationDuration={800}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.net >= 0 ? C.pos : C.neg}
                fillOpacity={goal !== null && d.net >= 0 && d.net < goal ? 0.55 : 1}
                radius={(d.net >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as number}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------- Drawdown ---------------------------------- */

export interface DrawdownDatum {
  label: string;
  detail: string;
  pct: number; // negative percentage for the underwater curve
  cents: number;
}

export function DrawdownChart({ data, currency, height = 240 }: { data: DrawdownDatum[]; currency: Currency; height?: number }) {
  const gid = useId().replace(/:/g, "");
  if (data.length < 2) return <ChartEmpty height={height} message="Sem histórico suficiente para calcular o drawdown." />;
  const min = Math.min(...data.map((d) => d.pct), -1);
  return (
    <div style={{ height }} role="img" aria-label="Gráfico de drawdown">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`dd-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.neg} stopOpacity={0.05} />
              <stop offset="100%" stopColor={C.neg} stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" {...axisCommon} minTickGap={36} interval="preserveStartEnd" />
          <YAxis {...axisCommon} width={48} domain={[Math.floor((min * 1.1) / 5) * 5, 0]} allowDecimals={false} tickCount={5} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.18)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DrawdownDatum;
              return (
                <ChartTooltipBox
                  title={d.detail}
                  rows={[
                    { label: "Drawdown", value: formatPct(d.pct, { digits: 2 }), tone: d.pct < 0 ? "neg" : "neutral" },
                    { label: "Valor", value: formatMoney(-d.cents, currency), tone: d.cents > 0 ? "neg" : "neutral" },
                  ]}
                />
              );
            }}
          />
          <Area type="stepAfter" dataKey="pct" stroke={C.neg} strokeWidth={1.5} fill={`url(#dd-${gid})`} dot={false} animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
