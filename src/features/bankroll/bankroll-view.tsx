"use client";

import { ArrowDownToLine, ArrowUpFromLine, Banknote, Coins, Landmark, Pencil, PiggyBank, Scale, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { EquityChart } from "@/components/charts/charts";
import { DataGate, PageHeader } from "@/components/layout/page";
import { RevealGroup } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState, Panel, ProgressBar, Segmented } from "@/components/ui/misc";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { equitySeries } from "@/features/analytics/series";
import { SettingsFieldsForm } from "@/features/settings/settings-fields";
import { MoneyText } from "@/features/trades/trade-bits";
import { useReadyData } from "@/hooks/app-data";
import { ApiClientError } from "@/lib/api/client";
import { useDeleteCash, useSaveCash } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { dayKeyOf, formatDateTime, todayKey, wallTimeOf, zonedWallTimeToIso } from "@/lib/domain/dates";
import { computeGoals } from "@/lib/domain/goals";
import { centsToInput, currencySymbol, formatMoney, formatPct, parseMoneyToCents } from "@/lib/domain/money";
import type { CashMovement, CashMovementType } from "@/lib/domain/types";
import { cashMovementInputSchema, fieldErrors } from "@/lib/validation/schemas";

function CashForm({ open, onClose, movement }: { open: boolean; onClose: () => void; movement: CashMovement | null }) {
  const { settings, portfolio } = useReadyData();
  const tz = settings.timezone;
  const save = useSaveCash();
  const toast = useToast();
  const [type, setType] = useState<CashMovementType>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      const now = new Date().toISOString();
      setType(movement?.type ?? "DEPOSIT");
      setAmount(movement ? centsToInput(movement.amountCents) : "");
      setDate(movement ? dayKeyOf(movement.occurredAt, tz) : todayKey(tz));
      setTime((movement ? wallTimeOf(movement.occurredAt, tz) : wallTimeOf(now, tz)).slice(0, 5));
      setNote(movement?.note ?? "");
      setErrors({});
      setFormError(null);
    }
  }

  const submit = async () => {
    setFormError(null);
    let occurredAt = "";
    try {
      occurredAt = zonedWallTimeToIso(date, time || "00:00", tz);
    } catch {
      /* invalid */
    }
    const amountCents = parseMoneyToCents(amount);
    const parsed = cashMovementInputSchema.safeParse({ type, amountCents: amountCents ?? 0, occurredAt, note });
    if (!parsed.success) {
      const fe = fieldErrors(parsed.error);
      setErrors({ amount: fe.amountCents ?? "", date: fe.occurredAt ?? "", note: fe.note ?? "" });
      return;
    }
    if (type === "WITHDRAWAL" && !movement && parsed.data.amountCents > portfolio.balanceCents) {
      setErrors({ amount: `Retirada maior que o saldo atual (${formatMoney(portfolio.balanceCents, settings.currency)}).` });
      return;
    }
    try {
      await save.mutateAsync({ id: movement?.id, input: parsed.data });
      toast.success(type === "DEPOSIT" ? "Depósito registrado" : "Retirada registrada", formatMoney(parsed.data.amountCents, settings.currency));
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={movement ? "Editar movimentação" : "Nova movimentação"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={save.isPending} data-testid="cash-save">
            Salvar
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <FormError message={formError} />
        <Segmented<CashMovementType>
          ariaLabel="Tipo de movimentação"
          value={type}
          onChange={setType}
          className="w-full"
          options={[
            { value: "DEPOSIT", label: "Depósito", tone: "pos" },
            { value: "WITHDRAWAL", label: "Retirada", tone: "neg" },
          ]}
        />
        <Field label="Valor" error={errors.amount}>
          {(id) => <Input id={id} name="amount" inputMode="decimal" prefix={currencySymbol(settings.currency)} value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount} data-autofocus placeholder="0,00" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" error={errors.date}>
            {(id) => <Input id={id} type="date" max={todayKey(tz)} value={date} onChange={(e) => setDate(e.target.value)} invalid={!!errors.date} />}
          </Field>
          <Field label="Hora">
            {(id) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </Field>
        </div>
        <Field label="Observação" optional error={errors.note}>
          {(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[64px]" />}
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function BankrollContent() {
  const { portfolio: p, settings, cash } = useReadyData();
  const cur = settings.currency;
  const money = (v: number) => formatMoney(Math.round(v), cur);
  const del = useDeleteCash();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CashMovement | null>(null);
  const [toDelete, setToDelete] = useState<CashMovement | null>(null);
  const equity = useMemo(() => equitySeries(p), [p]);
  const goals = computeGoals(p, settings);
  const daily = goals.find((g) => g.key === "daily")!;
  const lossUsed = settings.dailyLossLimitCents ? Math.max(0, -p.todayStats.netCents) / settings.dailyLossLimitCents : null;
  const stakeByRisk = settings.riskPerTradePct && p.balanceCents > 0 ? Math.floor((p.balanceCents * settings.riskPerTradePct) / 100) : null;

  return (
    <>
      <PageHeader
        title="Gerenciamento de banca"
        description="Controle de capital, depósitos, retiradas e limites operacionais."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ArrowUpFromLine className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              data-testid="add-cash"
            >
              Depósito / retirada
            </Button>
          </>
        }
      />
      <StatGrid className="lg:grid-cols-3 min-[1760px]:grid-cols-6">
        <StatCard emphasis label="Saldo atualizado" value={p.balanceCents} format={money} icon={<Wallet className="size-4" />} testId="bank-balance" />
        <StatCard label="Capital inicial" value={p.initialCapitalCents} format={money} icon={<Banknote className="size-4" />} />
        <StatCard label="Total depositado" value={p.depositsCents} format={money} icon={<ArrowDownToLine className="size-4" />} />
        <StatCard label="Total retirado" value={p.withdrawalsCents} format={money} icon={<ArrowUpFromLine className="size-4" />} />
        <StatCard
          label="Resultado de trading"
          value={p.netCents}
          format={(v) => formatMoney(Math.round(v), cur, { signed: true })}
          tone={p.netCents > 0 ? "pos" : p.netCents < 0 ? "neg" : "neutral"}
          icon={<Scale className="size-4" />}
        />
        <StatCard
          label="Rentabilidade"
          value={p.returnPct}
          format={(v) => formatPct(v, { signed: true, digits: 2 })}
          tone={p.returnPct && p.returnPct > 0 ? "pos" : p.returnPct && p.returnPct < 0 ? "neg" : "neutral"}
          icon={<PiggyBank className="size-4" />}
        />
      </StatGrid>

      <p className="mt-3 text-xs text-subtle">
        Saldo = capital inicial + depósitos − retiradas + resultado das operações. Rentabilidade = resultado ÷ (capital inicial + depósitos).
      </p>

      <RevealGroup className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel data-reveal className="xl:col-span-2" title="Parâmetros da banca" subtitle="Deixe em branco para desativar um limite. Os mesmos valores aparecem em Risco e Metas.">
          <SettingsFieldsForm
            testId="bank-settings"
            keys={["initialCapitalCents", "maxStakeCents", "riskPerTradePct", "dailyLossLimitCents", "dailyProfitGoalCents", "weeklyProfitGoalCents", "monthlyProfitGoalCents", "defaultPayoutPct"]}
          />
        </Panel>
        <Panel data-reveal title="Situação de hoje" subtitle="Comparada aos seus parâmetros">
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted">Resultado do dia</span>
                <MoneyText cents={p.todayStats.netCents} currency={cur} className="font-semibold" />
              </div>
              <p className="mt-0.5 text-xs text-subtle">Saldo no início do dia: {formatMoney(p.todayStartBalanceCents, cur)}</p>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted">Limite diário de perda</span>
                <span className="num text-fg">
                  {settings.dailyLossLimitCents ? `${formatMoney(Math.max(0, -p.todayStats.netCents), cur)} / ${formatMoney(settings.dailyLossLimitCents, cur)}` : "Não definido"}
                </span>
              </div>
              <ProgressBar value={(lossUsed ?? 0) * 100} tone={lossUsed === null ? "neutral" : lossUsed >= 1 ? "neg" : lossUsed >= 0.8 ? "warn" : "neutral"} label="Limite diário de perda consumido" />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted">Meta diária</span>
                <span className="num text-fg">{daily.target ? `${formatMoney(Math.max(0, daily.current), cur)} / ${formatMoney(daily.target, cur)}` : "Não definida"}</span>
              </div>
              <ProgressBar value={daily.progressPct} tone={daily.status === "reached" ? "pos" : "neutral"} label="Progresso da meta diária" />
            </div>
            <div className="rounded-xl border border-line bg-white/[0.02] p-3.5">
              <p className="label-caps">Valor por operação pelo seu risco</p>
              <p className="num mt-1 text-lg font-semibold">{stakeByRisk === null ? "—" : formatMoney(stakeByRisk, cur)}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {settings.riskPerTradePct ? `${formatPct(settings.riskPerTradePct)} do saldo atual — cálculo do seu próprio parâmetro.` : "Defina o risco por operação para ver o cálculo."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel data-reveal className="xl:col-span-2" title="Evolução do saldo">
          <EquityChart data={equity} currency={cur} height={260} />
        </Panel>

        <Panel
          data-reveal
          title="Depósitos e retiradas"
          subtitle={`${cash.length} movimentação(ões)`}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Adicionar
            </Button>
          }
          bodyClassName="px-2 sm:px-3"
        >
          {cash.length === 0 ? (
            <EmptyState icon={<Landmark className="size-5" />} title="Nenhuma movimentação" description="Registre depósitos e retiradas para manter o saldo fiel à corretora." />
          ) : (
            <ul className="max-h-[340px] space-y-1 overflow-y-auto" data-lenis-prevent data-testid="cash-list">
              {cash.map((c) => (
                <li key={c.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]">
                  <span className={cn("grid size-8 place-items-center rounded-lg border", c.type === "DEPOSIT" ? "border-pos/20 bg-pos/10 text-pos" : "border-neg/20 bg-neg/10 text-neg")}>
                    {c.type === "DEPOSIT" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{c.type === "DEPOSIT" ? "Depósito" : "Retirada"}</p>
                    <p className="truncate text-[11.5px] text-subtle">
                      {formatDateTime(c.occurredAt, settings.timezone)}
                      {c.note && ` · ${c.note}`}
                    </p>
                  </div>
                  <MoneyText cents={c.type === "DEPOSIT" ? c.amountCents : -c.amountCents} currency={cur} className="text-[13px] font-semibold" />
                  <div className="flex opacity-60 group-hover:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Editar movimentação"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Excluir movimentação" className="hover:text-neg" onClick={() => setToDelete(c)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2 border-t border-line px-3 pt-3 text-xs text-muted">
            <Coins className="size-3.5" /> Saldo líquido de movimentações:{" "}
            <MoneyText cents={p.depositsCents - p.withdrawalsCents} currency={cur} className="font-medium" />
          </div>
        </Panel>
      </RevealGroup>

      <CashForm open={formOpen} onClose={() => setFormOpen(false)} movement={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={del.isPending}
        title="Excluir movimentação?"
        confirmLabel="Excluir"
        description={toDelete && <>A {toDelete.type === "DEPOSIT" ? "entrada" : "retirada"} de {formatMoney(toDelete.amountCents, cur)} será removida e o saldo recalculado.</>}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            toast.success("Movimentação excluída");
            setToDelete(null);
          } catch (err) {
            toast.error("Não foi possível excluir", err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </>
  );
}

export function BankrollView() {
  return (
    <DataGate>
      <BankrollContent />
    </DataGate>
  );
}
