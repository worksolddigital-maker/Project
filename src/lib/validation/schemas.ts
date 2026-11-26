import { z } from "zod";
import { isDayKey, isValidTimeZone } from "@/lib/domain/dates";
import { SECURITY_POLICY } from "@/lib/security";
import {
  MAX_EXPIRATION_SECONDS,
  MAX_PAYOUT_PCT,
  MIN_EXPIRATION_SECONDS,
  MIN_PAYOUT_PCT,
  resolveFinancials,
  validateManualProfit,
} from "@/lib/domain/trade-calc";
import {
  CASH_MOVEMENT_TYPES,
  CURRENCIES,
  DIRECTIONS,
  EMOTIONS,
  PLAN_ADHERENCE,
  TRADE_RESULTS,
} from "@/lib/domain/types";

const MAX_CENTS = 100_000_000_000;
const FUTURE_TOLERANCE_MS = 5 * 60_000;

const cents = (label: string) =>
  z
    .number({ error: `${label}: valor inválido.` })
    .int({ error: `${label}: valor inválido.` })
    .min(0, { error: `${label} não pode ser negativo.` })
    .max(MAX_CENTS, { error: `${label} muito alto.` });

const positiveCents = (label: string) => cents(label).min(1, { error: `${label} deve ser maior que zero.` });

const isoInstant = z.iso.datetime({ offset: true, error: "Data e hora inválidas." });

const notFuture = (value: string) => new Date(value).getTime() <= Date.now() + FUTURE_TOLERANCE_MS;

const dayKey = z.string().refine(isDayKey, { error: "Data inválida." });

/* ---------------------------------- Auth ---------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "E-mail inválido." }))
  .refine((v) => v.length <= 254, { error: "E-mail muito longo." });

export const passwordSchema = z
  .string()
  .min(SECURITY_POLICY.minPasswordLength, { error: `A senha precisa ter pelo menos ${SECURITY_POLICY.minPasswordLength} caracteres.` })
  .max(128, { error: "A senha pode ter no máximo 128 caracteres." })
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    error: "Use letras maiúsculas, minúsculas e números na senha.",
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe seu nome." }).max(80, { error: "Nome muito longo." }),
  email: emailSchema,
  password: passwordSchema,
  timezone: z.string().refine(isValidTimeZone).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Informe a senha." }).max(128),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe seu nome." }).max(80),
  email: emailSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Informe a senha atual." }).max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    error: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  });

/** Sensitive actions ask for the password again (re-authentication). */
export const reauthSchema = z.object({
  password: z.string().min(1, { error: "Confirme com a sua senha." }).max(128),
});

export const deleteAccountSchema = reauthSchema.extend({
  confirmation: z.literal("EXCLUIR", { error: 'Digite "EXCLUIR" para confirmar.' }),
});

export const deleteAllTradesSchema = reauthSchema.extend({
  confirmation: z.literal("EXCLUIR", { error: 'Digite "EXCLUIR" para confirmar.' }),
});

/* --------------------------------- Trades --------------------------------- */

export const tradeInputSchema = z
  .object({
    executedAt: isoInstant.refine(notFuture, { error: "A data da operação não pode estar no futuro." }),
    asset: z.string().trim().min(1, { error: "Informe o ativo." }).max(40, { error: "Ativo muito longo." }),
    direction: z.enum(DIRECTIONS, { error: "Selecione CALL ou PUT." }),
    stakeCents: positiveCents("Valor investido"),
    expirationSeconds: z
      .number({ error: "Expiração inválida." })
      .int()
      .min(MIN_EXPIRATION_SECONDS, { error: "Expiração mínima de 5 segundos." })
      .max(MAX_EXPIRATION_SECONDS, { error: "Expiração máxima de 7 dias." }),
    result: z.enum(TRADE_RESULTS, { error: "Selecione o resultado." }),
    payoutPct: z
      .number({ error: "Payout inválido." })
      .min(MIN_PAYOUT_PCT, { error: "Payout mínimo de 1%." })
      .max(MAX_PAYOUT_PCT, { error: "Payout máximo de 500%." })
      .nullable(),
    profitIsManual: z.boolean().default(false),
    profitCents: z.number().int().min(-MAX_CENTS).max(MAX_CENTS).nullable().optional(),
    strategyId: z.uuid({ error: "Estratégia inválida." }).nullable().default(null),
    notes: z.string().trim().max(2000, { error: "Observações: máximo de 2000 caracteres." }).default(""),
  })
  .superRefine((v, ctx) => {
    const outcome = resolveFinancials(v);
    if (!outcome.ok) ctx.addIssue({ code: "custom", message: outcome.error, path: [outcome.field] });
  });

export type TradeInput = z.infer<typeof tradeInputSchema>;

/* ------------------------------ Cash movements ----------------------------- */

export const cashMovementInputSchema = z.object({
  type: z.enum(CASH_MOVEMENT_TYPES, { error: "Tipo de movimentação inválido." }),
  amountCents: positiveCents("Valor"),
  occurredAt: isoInstant.refine(notFuture, { error: "A data não pode estar no futuro." }),
  note: z.string().trim().max(500, { error: "Observação muito longa." }).default(""),
});
export type CashMovementInput = z.infer<typeof cashMovementInputSchema>;

/* --------------------------------- Settings -------------------------------- */

const nullablePositiveCents = (label: string) => positiveCents(label).nullable();
const nullablePct = (label: string, max = 100) =>
  z
    .number({ error: `${label}: valor inválido.` })
    .gt(0, { error: `${label} deve ser maior que zero.` })
    .max(max, { error: `${label}: máximo de ${max}%.` })
    .nullable();
const nullableCount = (label: string, max: number) =>
  z
    .number({ error: `${label}: valor inválido.` })
    .int({ error: `${label}: use um número inteiro.` })
    .min(1, { error: `${label} deve ser no mínimo 1.` })
    .max(max, { error: `${label}: máximo de ${max}.` })
    .nullable();

const symbolKey = z.string().trim().min(1).max(40);

export const assetPrefsSchema = z.object({
  payouts: z.record(symbolKey, z.number().min(1, { error: "Payout mínimo de 1%." }).max(500, { error: "Payout máximo de 500%." })),
  favorites: z.array(symbolKey).max(200),
});

export const settingsSchema = z.object({
  currency: z.enum(CURRENCIES),
  timezone: z.string().refine(isValidTimeZone, { error: "Fuso horário inválido." }),
  initialCapitalCents: cents("Capital inicial"),
  defaultPayoutPct: z.number().min(MIN_PAYOUT_PCT).max(MAX_PAYOUT_PCT),
  maxStakeCents: nullablePositiveCents("Valor máximo por operação"),
  riskPerTradePct: nullablePct("Risco por operação"),
  dailyLossLimitCents: nullablePositiveCents("Limite diário de perda"),
  dailyProfitGoalCents: nullablePositiveCents("Meta diária"),
  weeklyProfitGoalCents: nullablePositiveCents("Meta semanal"),
  monthlyProfitGoalCents: nullablePositiveCents("Meta mensal"),
  maxTradesPerDay: nullableCount("Máximo de operações por dia", 1000),
  maxConsecutiveLosses: nullableCount("Máximo de perdas consecutivas", 100),
  maxDrawdownPct: nullablePct("Drawdown máximo"),
  maxDailyExposurePct: nullablePct("Exposição diária máxima", 10000),
  reducedMotion: z.boolean(),
  smoothScroll: z.boolean(),
  assetPrefs: assetPrefsSchema.optional(),
});

export const settingsUpdateSchema = settingsSchema.partial();
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

/* -------------------------------- Strategies ------------------------------- */

export const strategyInputSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome da estratégia." }).max(60, { error: "Nome muito longo." }),
  description: z.string().trim().max(500, { error: "Descrição muito longa." }).default(""),
});

/* --------------------------------- Journal --------------------------------- */

export const journalInputSchema = z.object({
  sessionDate: dayKey,
  tradeId: z.uuid().nullable().default(null),
  emotion: z.enum(EMOTIONS, { error: "Selecione seu estado emocional." }),
  emotionNote: z.string().trim().max(500).default(""),
  strategyId: z.uuid().nullable().default(null),
  followedPlan: z.enum(PLAN_ADHERENCE, { error: "Informe se seguiu o gerenciamento." }),
  impulsive: z.boolean(),
  mainMistake: z.string().trim().max(2000).default(""),
  didRight: z.string().trim().max(2000).default(""),
  toImprove: z.string().trim().max(2000).default(""),
});
export type JournalInput = z.infer<typeof journalInputSchema>;

/* --------------------------------- Import --------------------------------- */

export const importedTradeSchema = z.object({
  executedAt: isoInstant.refine(notFuture, { error: "Data no futuro." }),
  asset: z.string().trim().min(1).max(40),
  direction: z.enum(DIRECTIONS),
  stakeCents: positiveCents("Valor investido"),
  expirationSeconds: z.number().int().min(MIN_EXPIRATION_SECONDS).max(MAX_EXPIRATION_SECONDS),
  result: z.enum(TRADE_RESULTS),
  payoutPct: z.number().min(MIN_PAYOUT_PCT).max(MAX_PAYOUT_PCT).nullable(),
  profitIsManual: z.boolean(),
  profitCents: z.number().int().min(-MAX_CENTS).max(MAX_CENTS),
  strategyName: z.string().trim().max(60).nullable(),
  notes: z.string().max(2000).default(""),
}).superRefine((v, ctx) => {
  const err = validateManualProfit(v.result, v.stakeCents, v.profitCents);
  if (err) ctx.addIssue({ code: "custom", message: err, path: ["profitCents"] });
});

export const importCommitSchema = z.object({
  trades: z.array(importedTradeSchema).min(1, { error: "Nenhuma operação para importar." }).max(20000, {
    error: "Máximo de 20.000 operações por importação.",
  }),
  skipDuplicates: z.boolean().default(true),
});

/* --------------------------------- Backup --------------------------------- */

export const BACKUP_FORMAT = "trading-desk-backup";

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.string(),
  settings: settingsSchema,
  strategies: z.array(
    z.object({ id: z.uuid(), name: z.string().min(1).max(60), description: z.string().max(500), createdAt: z.string() }),
  ),
  trades: z.array(
    z.object({
      id: z.uuid(),
      executedAt: isoInstant,
      asset: z.string().min(1).max(40),
      direction: z.enum(DIRECTIONS),
      stakeCents: positiveCents("Valor"),
      expirationSeconds: z.number().int().min(MIN_EXPIRATION_SECONDS).max(MAX_EXPIRATION_SECONDS),
      result: z.enum(TRADE_RESULTS),
      payoutPct: z.number().min(MIN_PAYOUT_PCT).max(MAX_PAYOUT_PCT).nullable(),
      profitCents: z.number().int(),
      profitIsManual: z.boolean(),
      strategyId: z.uuid().nullable(),
      notes: z.string().max(2000),
      createdAt: z.string(),
      updatedAt: z.string(),
    }).superRefine((v, ctx) => {
      const err = validateManualProfit(v.result, v.stakeCents, v.profitCents);
      if (err) ctx.addIssue({ code: "custom", message: err, path: ["profitCents"] });
    }),
  ),
  cashMovements: z.array(
    z.object({
      id: z.uuid(),
      type: z.enum(CASH_MOVEMENT_TYPES),
      amountCents: positiveCents("Valor"),
      occurredAt: isoInstant,
      note: z.string().max(500),
      createdAt: z.string(),
    }),
  ),
  journal: z.array(
    z.object({
      id: z.uuid(),
      sessionDate: dayKey,
      tradeId: z.uuid().nullable(),
      emotion: z.enum(EMOTIONS),
      emotionNote: z.string().max(500),
      strategyId: z.uuid().nullable(),
      followedPlan: z.enum(PLAN_ADHERENCE),
      impulsive: z.boolean(),
      mainMistake: z.string().max(2000),
      didRight: z.string().max(2000),
      toImprove: z.string().max(2000),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
});
export type Backup = z.infer<typeof backupSchema>;

export const restoreBackupSchema = reauthSchema.extend({ backup: backupSchema });

/** Flattens zod issues into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
