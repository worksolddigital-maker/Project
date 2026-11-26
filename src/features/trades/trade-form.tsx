"use client";

import { ArrowDownRight, ArrowUpRight, LayoutGrid, Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Segmented, toneOf, TONE_TEXT } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useReadyData } from "@/hooks/app-data";
import { ApiClientError } from "@/lib/api/client";
import { useSaveStrategy, useSaveTrade, useUpdateSettings } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { dayKeyOf, todayKey, wallTimeOf, zonedWallTimeToIso } from "@/lib/domain/dates";
import { centsToInput, currencySymbol, formatMoney, formatPct, parseMoneyToCents, parsePercent } from "@/lib/domain/money";
import { checkDraftTrade } from "@/lib/domain/risk";
import { findAsset, suggestedPayout } from "@/lib/domain/assets";
import { computeProfitCents, EXPIRATION_PRESETS, normalizeAsset, returnPct } from "@/lib/domain/trade-calc";
import type { Direction, Trade, TradeResult } from "@/lib/domain/types";
import { fieldErrors, tradeInputSchema } from "@/lib/validation/schemas";
import { AssetBadge, AssetPicker } from "./asset-picker";

interface FormState {
  date: string;
  time: string;
  asset: string;
  direction: Direction;
  stake: string;
  expiration: string; // seconds as string or "custom"
  customExpValue: string;
  customExpUnit: "s" | "m" | "h";
  result: TradeResult;
  payout: string;
  manualProfit: boolean;
  profit: string;
  strategyId: string;
  notes: string;
}

const UNIT_SECONDS = { s: 1, m: 60, h: 3600 } as const;

function initialState(trade: Trade | null, tz: string, defaults: { dayKey?: string; payout: number; last?: Trade }): FormState {
  if (trade) {
    const preset = EXPIRATION_PRESETS.some((p) => p.seconds === trade.expirationSeconds);
    return {
      date: dayKeyOf(trade.executedAt, tz),
      time: wallTimeOf(trade.executedAt, tz),
      asset: trade.asset,
      direction: trade.direction,
      stake: centsToInput(trade.stakeCents),
      expiration: preset ? String(trade.expirationSeconds) : "custom",
      customExpValue: preset ? "" : String(trade.expirationSeconds),
      customExpUnit: "s",
      result: trade.result,
      payout: trade.payoutPct === null ? "" : String(trade.payoutPct).replace(".", ","),
      manualProfit: trade.profitIsManual,
      profit: trade.profitIsManual ? centsToInput(trade.profitCents) : "",
      strategyId: trade.strategyId ?? "",
      notes: trade.notes,
    };
  }
  const now = new Date().toISOString();
  const last = defaults.last;
  return {
    date: defaults.dayKey ?? todayKey(tz),
    time: wallTimeOf(now, tz).slice(0, 5),
    asset: last?.asset ?? "",
    direction: "CALL",
    stake: last ? centsToInput(last.stakeCents) : "",
    expiration: String(last?.expirationSeconds && EXPIRATION_PRESETS.some((p) => p.seconds === last.expirationSeconds) ? last.expirationSeconds : 60),
    customExpValue: "",
    customExpUnit: "m",
    result: "WIN",
    payout: String(last?.payoutPct ?? defaults.payout).replace(".", ","),
    manualProfit: false,
    profit: "",
    strategyId: last?.strategyId ?? "",
    notes: "",
  };
}

interface TradeFormModalProps {
  open: boolean;
  onClose: () => void;
  trade: Trade | null;
  defaultDayKey?: string;
}

export function TradeFormModal({ open, onClose, trade, defaultDayKey }: TradeFormModalProps) {
  const { settings, portfolio, trades, strategies } = useReadyData();
  const tz = settings.timezone;
  const toast = useToast();
  const save = useSaveTrade();
  const saveStrategy = useSaveStrategy();
  // The provider remounts this component (new key) every time it opens, so the
  // initial state is always computed fresh for the trade being edited/created.
  const [form, setForm] = useState<FormState>(() =>
    initialState(trade, tz, { dayKey: defaultDayKey, payout: settings.defaultPayoutPct, last: trades[0] }),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [newStrategy, setNewStrategy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Once the person types a payout, picking an asset no longer overwrites it.
  const [payoutTouched, setPayoutTouched] = useState(!!trade);
  const updateSettings = useUpdateSettings();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  const recentAssets = useMemo(() => [...new Set(trades.map((t) => t.asset))].slice(0, 9), [trades]);

  const chooseAsset = (symbol: string, payout: number | null) => {
    set("asset", symbol);
    if (!payoutTouched && payout !== null) set("payout", String(payout).replace(".", ","));
    setPickerOpen(false);
  };

  const toggleFavorite = (symbol: string) => {
    const favs = settings.assetPrefs.favorites;
    const next = favs.includes(symbol) ? favs.filter((f) => f !== symbol) : [...favs, symbol];
    updateSettings.mutate({ assetPrefs: { ...settings.assetPrefs, favorites: next } });
  };

  const assetInfo = findAsset(form.asset);

  const stakeCents = parseMoneyToCents(form.stake);
  const payoutPct = parsePercent(form.payout);
  const expirationSeconds =
    form.expiration === "custom"
      ? (() => {
          const v = parsePercent(form.customExpValue);
          return v && v > 0 ? Math.round(v * UNIT_SECONDS[form.customExpUnit]) : null;
        })()
      : Number(form.expiration);
  const manualProfitCents = form.manualProfit ? parseMoneyToCents(form.profit) : null;
  const previewProfit =
    stakeCents && stakeCents > 0
      ? form.result === "DRAW"
        ? 0
        : form.manualProfit
          ? manualProfitCents
          : computeProfitCents(form.result, stakeCents, payoutPct)
      : null;
  const previewReturn = previewProfit !== null && stakeCents ? returnPct(previewProfit, stakeCents) : null;

  const warnings = checkDraftTrade(portfolio, settings, { stakeCents, dayKey: form.date, editingId: trade?.id ?? null });

  const buildInput = () => {
    let executedAt = "";
    try {
      executedAt = form.date && form.time ? zonedWallTimeToIso(form.date, form.time, tz) : "";
    } catch {
      executedAt = "";
    }
    return {
      executedAt,
      asset: normalizeAsset(form.asset),
      direction: form.direction,
      stakeCents: stakeCents ?? 0,
      expirationSeconds: expirationSeconds ?? 0,
      result: form.result,
      payoutPct: form.payout.trim() === "" ? null : (payoutPct ?? Number.NaN),
      profitIsManual: form.result !== "DRAW" && form.manualProfit,
      profitCents: form.manualProfit ? manualProfitCents : null,
      strategyId: form.strategyId || null,
      notes: form.notes,
    };
  };

  const submit = async (keepOpen: boolean) => {
    setFormError(null);
    const parsed = tradeInputSchema.safeParse(buildInput());
    if (!parsed.success) {
      const fe = fieldErrors(parsed.error);
      if (fe.executedAt) fe.date = fe.executedAt;
      if (fe.stakeCents) fe.stake = fe.stakeCents;
      if (fe.expirationSeconds) fe.expiration = fe.expirationSeconds;
      if (fe.payoutPct) fe.payout = fe.payoutPct;
      if (fe.profitCents) fe.profit = fe.profitCents;
      setErrors(fe);
      return;
    }
    try {
      await save.mutateAsync({ id: trade?.id, input: parsed.data });
      toast.success(trade ? "Operação atualizada" : "Operação registrada", `${parsed.data.asset} · ${parsed.data.direction}`);
      if (keepOpen && !trade) {
        setForm((f) => ({ ...f, result: "WIN", manualProfit: false, profit: "", notes: "", time: wallTimeOf(new Date().toISOString(), tz).slice(0, 5) }));
        setErrors({});
      } else {
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (Object.keys(err.fields).length) setErrors(err.fields);
      } else setFormError("Não foi possível salvar a operação.");
    }
  };

  const createStrategy = async () => {
    const name = (newStrategy ?? "").trim();
    if (!name) return;
    try {
      const s = await saveStrategy.mutateAsync({ input: { name, description: "" } });
      set("strategyId", s.id);
      setNewStrategy(null);
      toast.success("Estratégia criada", s.name);
    } catch (err) {
      toast.error("Não foi possível criar a estratégia", err instanceof Error ? err.message : undefined);
    }
  };

  const cur = settings.currency;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={trade ? "Editar operação" : "Nova operação"}
      description="O resultado financeiro é calculado automaticamente a partir do valor, resultado e payout."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {!trade && (
            <Button variant="secondary" onClick={() => submit(true)} loading={save.isPending} data-testid="trade-save-another">
              Salvar e adicionar outra
            </Button>
          )}
          <Button variant="primary" onClick={() => submit(false)} loading={save.isPending} data-testid="trade-save">
            {trade ? "Salvar alterações" : "Registrar operação"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onFocus={(e) => {
          const t = e.target as HTMLElement;
          if (pickerOpen && t.tagName !== "BUTTON" && (t as HTMLInputElement).name !== "asset") setPickerOpen(false);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
        noValidate
      >
        <FormError message={formError} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Data" error={errors.date} className="col-span-1 sm:col-span-1">
            {(id) => <Input id={id} type="date" value={form.date} max={todayKey(tz)} onChange={(e) => set("date", e.target.value)} invalid={!!errors.date} name="date" />}
          </Field>
          <Field label="Horário" className="col-span-1">
            {(id) => <Input id={id} type="time" step={1} value={form.time} onChange={(e) => set("time", e.target.value)} name="time" />}
          </Field>
          <Field
            label="Ativo"
            error={errors.asset}
            className="col-span-2"
            hint={assetInfo ? `Payout de referência: ${suggestedPayout(assetInfo.symbol, settings.assetPrefs) ?? "—"}%` : undefined}
          >
            {(id, d) => (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {assetInfo && <AssetBadge symbol={assetInfo.symbol} className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 scale-[0.8]" />}
                  <Input
                    id={id}
                    aria-describedby={d}
                    value={form.asset}
                    onChange={(e) => {
                      set("asset", e.target.value);
                      const exact = findAsset(e.target.value);
                      if (exact && !payoutTouched) {
                        const p = suggestedPayout(exact.symbol, settings.assetPrefs);
                        if (p !== null) set("payout", String(p).replace(".", ","));
                      }
                    }}
                    onFocus={() => setPickerOpen(true)}
                    placeholder="Pesquisar um ativo…"
                    autoComplete="off"
                    invalid={!!errors.asset}
                    name="asset"
                    className={cn(assetInfo && "pl-12")}
                    data-autofocus={!trade || undefined}
                    role="combobox"
                    aria-expanded={pickerOpen}
                    aria-controls="asset-picker"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-label="Ver lista de ativos"
                  title="Ver lista de ativos"
                  data-testid="asset-picker-toggle"
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
            )}
          </Field>
        </div>

        {pickerOpen && (
          <div id="asset-picker">
            <AssetPicker
              value={form.asset}
              prefs={settings.assetPrefs}
              recent={recentAssets}
              onPick={chooseAsset}
              onToggleFavorite={toggleFavorite}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de operação">
            {() => (
              <Segmented<Direction>
                ariaLabel="Tipo de operação"
                value={form.direction}
                onChange={(v) => set("direction", v)}
                className="w-full"
                options={[
                  { value: "CALL", label: <><ArrowUpRight className="size-4" /> CALL</>, tone: "pos" },
                  { value: "PUT", label: <><ArrowDownRight className="size-4" /> PUT</>, tone: "neg" },
                ]}
              />
            )}
          </Field>
          <Field label="Resultado">
            {() => (
              <Segmented<TradeResult>
                ariaLabel="Resultado"
                value={form.result}
                onChange={(v) => set("result", v)}
                className="w-full"
                options={[
                  { value: "WIN", label: "WIN", tone: "pos" },
                  { value: "LOSS", label: "LOSS", tone: "neg" },
                  { value: "DRAW", label: "EMPATE" },
                ]}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Valor investido" error={errors.stake}>
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                prefix={currencySymbol(cur)}
                value={form.stake}
                onChange={(e) => set("stake", e.target.value)}
                placeholder="0,00"
                invalid={!!errors.stake}
                name="stake"
              />
            )}
          </Field>
          <Field label="Payout" error={errors.payout} hint={form.result === "WIN" && !form.manualProfit ? "Usado no cálculo do lucro" : undefined}>
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                suffix="%"
                value={form.payout}
                onChange={(e) => {
                  setPayoutTouched(true);
                  set("payout", e.target.value);
                }}
                placeholder="85"
                invalid={!!errors.payout}
                name="payout"
              />
            )}
          </Field>
          <Field label="Expiração" error={errors.expiration} className="col-span-2 sm:col-span-1">
            {(id) => (
              <div className="flex gap-2">
                <Select id={id} value={form.expiration} onChange={(e) => set("expiration", e.target.value)} name="expiration">
                  {EXPIRATION_PRESETS.map((p) => (
                    <option key={p.seconds} value={p.seconds}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Personalizada…</option>
                </Select>
              </div>
            )}
          </Field>
        </div>

        {form.expiration === "custom" && (
          <div className="grid grid-cols-2 gap-3 sm:w-1/2">
            <Field label="Tempo" error={errors.expiration}>
              {(id) => <Input id={id} inputMode="decimal" value={form.customExpValue} onChange={(e) => set("customExpValue", e.target.value)} placeholder="90" />}
            </Field>
            <Field label="Unidade">
              {(id) => (
                <Select id={id} value={form.customExpUnit} onChange={(e) => set("customExpUnit", e.target.value as FormState["customExpUnit"])}>
                  <option value="s">segundos</option>
                  <option value="m">minutos</option>
                  <option value="h">horas</option>
                </Select>
              )}
            </Field>
          </div>
        )}

        {form.result !== "DRAW" && (
          <div className="rounded-xl border border-line bg-white/[0.02] p-3.5">
            <Switch
              checked={form.manualProfit}
              onChange={(v) => set("manualProfit", v)}
              label="Informar lucro/prejuízo manualmente"
              description="Use quando o valor creditado pela corretora diferir do cálculo pelo payout."
            />
            {form.manualProfit && (
              <Field label={form.result === "WIN" ? "Lucro recebido" : "Prejuízo"} error={errors.profit} className="mt-3 sm:w-1/2">
                {(id) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    prefix={currencySymbol(cur)}
                    value={form.profit}
                    onChange={(e) => set("profit", e.target.value)}
                    placeholder={form.result === "WIN" ? "0,00" : "-0,00"}
                    invalid={!!errors.profit}
                    name="profit"
                  />
                )}
              </Field>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estratégia" optional error={errors.strategyId}>
            {(id) =>
              newStrategy === null ? (
                <div className="flex gap-2">
                  <Select id={id} value={form.strategyId} onChange={(e) => set("strategyId", e.target.value)} name="strategy">
                    <option value="">Sem estratégia</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" size="icon" onClick={() => setNewStrategy("")} aria-label="Nova estratégia" title="Nova estratégia">
                    <Plus className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id={id}
                    autoFocus
                    value={newStrategy}
                    onChange={(e) => setNewStrategy(e.target.value)}
                    placeholder="Nome da estratégia"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void createStrategy();
                      }
                    }}
                  />
                  <Button variant="secondary" onClick={createStrategy} loading={saveStrategy.isPending}>
                    Criar
                  </Button>
                  <Button variant="ghost" onClick={() => setNewStrategy(null)}>
                    Cancelar
                  </Button>
                </div>
              )
            }
          </Field>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-gradient-to-br from-white/[0.035] to-transparent p-3.5">
            <div>
              <p className="label-caps">Lucro / prejuízo</p>
              <p className={cn("num mt-1 text-lg font-semibold", TONE_TEXT[toneOf(previewProfit)])} data-testid="trade-preview-profit">
                {previewProfit === null ? "—" : formatMoney(previewProfit, cur, { signed: true })}
              </p>
            </div>
            <div>
              <p className="label-caps">Retorno</p>
              <p className={cn("num mt-1 text-lg font-semibold", TONE_TEXT[toneOf(previewReturn)])}>
                {previewReturn === null ? "—" : formatPct(previewReturn, { signed: true })}
              </p>
            </div>
          </div>
        </div>

        <Field label="Observações" optional error={errors.notes}>
          {(id) => (
            <Textarea id={id} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Contexto da entrada, confluências, etc." maxLength={2000} name="notes" />
          )}
        </Field>

        {warnings.length > 0 && (
          <div className="rounded-xl border border-warn/25 bg-warn/[0.07] p-3.5" role="status">
            <p className="flex items-center gap-2 text-sm font-medium text-warn">
              <TriangleAlert className="size-4" /> Atenção aos seus parâmetros de risco
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-xs text-warn/90">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
