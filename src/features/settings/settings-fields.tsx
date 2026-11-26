"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useReadyData } from "@/hooks/app-data";
import { ApiClientError } from "@/lib/api/client";
import { useUpdateSettings } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { centsToInput, currencySymbol, parseMoneyToCents, parsePercent } from "@/lib/domain/money";
import type { UserSettings } from "@/lib/domain/types";
import { fieldErrors, settingsUpdateSchema } from "@/lib/validation/schemas";

type Kind = "money" | "pct" | "int";

export type SettingKey =
  | "initialCapitalCents"
  | "defaultPayoutPct"
  | "maxStakeCents"
  | "riskPerTradePct"
  | "dailyLossLimitCents"
  | "dailyProfitGoalCents"
  | "weeklyProfitGoalCents"
  | "monthlyProfitGoalCents"
  | "maxTradesPerDay"
  | "maxConsecutiveLosses"
  | "maxDrawdownPct"
  | "maxDailyExposurePct";

const DEFS: Record<SettingKey, { label: string; kind: Kind; required?: boolean; hint?: string; placeholder?: string }> = {
  initialCapitalCents: { label: "Capital inicial", kind: "money", required: true, hint: "Valor com que a conta começou." },
  defaultPayoutPct: { label: "Payout padrão", kind: "pct", required: true, hint: "Sugerido ao registrar novas operações." },
  maxStakeCents: { label: "Valor máximo por operação", kind: "money", hint: "Alerta quando uma operação exceder." },
  riskPerTradePct: { label: "Risco por operação", kind: "pct", hint: "Percentual máximo do saldo por operação." },
  dailyLossLimitCents: { label: "Limite diário de perda", kind: "money", hint: "Alerta ao atingir 80% e 100%." },
  dailyProfitGoalCents: { label: "Meta diária de lucro", kind: "money" },
  weeklyProfitGoalCents: { label: "Meta semanal de lucro", kind: "money" },
  monthlyProfitGoalCents: { label: "Meta mensal de lucro", kind: "money" },
  maxTradesPerDay: { label: "Máximo de operações por dia", kind: "int" },
  maxConsecutiveLosses: { label: "Máximo de perdas consecutivas", kind: "int", hint: "Contadas dentro do mesmo dia." },
  maxDrawdownPct: { label: "Drawdown máximo tolerado", kind: "pct", hint: "Queda a partir do pico de resultado." },
  maxDailyExposurePct: { label: "Exposição diária máxima", kind: "pct", hint: "Total investido no dia ÷ saldo inicial do dia." },
};

function toInput(kind: Kind, v: number | null): string {
  if (v === null || v === undefined) return "";
  if (kind === "money") return centsToInput(v);
  return String(v).replace(".", ",");
}

function fromInput(kind: Kind, raw: string): { value: number | null; error?: string } {
  const s = raw.trim();
  if (!s) return { value: null };
  if (kind === "money") {
    const c = parseMoneyToCents(s);
    return c === null ? { value: null, error: "Valor inválido." } : { value: c };
  }
  const n = parsePercent(s);
  if (n === null) return { value: null, error: "Número inválido." };
  if (kind === "int" && !Number.isInteger(n)) return { value: null, error: "Use um número inteiro." };
  return { value: n };
}

export function SettingsFieldsForm({
  keys,
  columns = 2,
  submitLabel = "Salvar parâmetros",
  testId,
}: {
  keys: SettingKey[];
  columns?: 1 | 2 | 3;
  submitLabel?: string;
  testId?: string;
}) {
  const { settings } = useReadyData();
  const update = useUpdateSettings();
  const toast = useToast();
  const keysKey = keys.join("|");
  const initial = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, toInput(DEFS[k].kind, settings[k] as number | null)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keysKey, settings],
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    // Saved settings changed (here or on another page): reflect them in the form.
    setPrevInitial(initial);
    setValues(initial);
  }

  const dirty = keys.some((k) => values[k] !== initial[k]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const patch: Partial<UserSettings> = {};
    const errs: Record<string, string> = {};
    for (const k of keys) {
      const def = DEFS[k];
      const { value, error } = fromInput(def.kind, values[k] ?? "");
      if (error) errs[k] = error;
      else if (value === null && def.required) errs[k] = "Campo obrigatório.";
      else (patch as Record<string, number | null>)[k] = value;
    }
    if (Object.keys(errs).length) return setErrors(errs);
    const parsed = settingsUpdateSchema.safeParse(patch);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
      toast.success("Parâmetros salvos", "Indicadores e alertas foram recalculados.");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        setErrors(err.fields);
      } else setFormError("Não foi possível salvar.");
    }
  };

  const sym = currencySymbol(settings.currency);

  return (
    <form onSubmit={submit} noValidate data-testid={testId}>
      <FormError message={formError} />
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3")}>
        {keys.map((k) => {
          const def = DEFS[k];
          return (
            <Field key={k} label={def.label} error={errors[k]} hint={def.hint} optional={!def.required}>
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  name={k}
                  inputMode={def.kind === "int" ? "numeric" : "decimal"}
                  prefix={def.kind === "money" ? sym : undefined}
                  suffix={def.kind === "pct" ? "%" : undefined}
                  value={values[k] ?? ""}
                  placeholder={def.required ? "0" : "Sem limite"}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [k]: e.target.value }));
                    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
                  }}
                  invalid={!!errors[k]}
                />
              )}
            </Field>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-warn">Alterações não salvas</span>}
        <Button type="submit" variant="primary" loading={update.isPending} disabled={!dirty} icon={<Save className="size-4" />}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
