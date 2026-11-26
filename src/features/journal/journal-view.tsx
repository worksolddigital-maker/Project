"use client";

import { BookOpen, Brain, Link2, NotebookPen, Pencil, Plus, Search, Trash2, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Badge, EmptyState, Panel, ProgressBar, Segmented } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { MoneyText } from "@/features/trades/trade-bits";
import { useReadyData } from "@/hooks/app-data";
import { ApiClientError } from "@/lib/api/client";
import { useDeleteJournal, useSaveJournal } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { dayKeyOf, formatDayKey, formatTime } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import {
  EMOTION_LABELS,
  EMOTIONS,
  PLAN_ADHERENCE_LABELS,
  POSITIVE_EMOTIONS,
  RESULT_LABELS,
  type Emotion,
  type JournalEntry,
  type PlanAdherence,
} from "@/lib/domain/types";
import { fieldErrors, journalInputSchema } from "@/lib/validation/schemas";

interface FormState {
  sessionDate: string;
  tradeId: string;
  emotion: Emotion | "";
  emotionNote: string;
  strategyId: string;
  followedPlan: PlanAdherence;
  impulsive: "no" | "yes";
  mainMistake: string;
  didRight: string;
  toImprove: string;
}

function JournalForm({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: JournalEntry | null }) {
  const { portfolio: p, strategies, settings } = useReadyData();
  const save = useSaveJournal();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm({
        sessionDate: entry?.sessionDate ?? p.today,
        tradeId: entry?.tradeId ?? "",
        emotion: entry?.emotion ?? "",
        emotionNote: entry?.emotionNote ?? "",
        strategyId: entry?.strategyId ?? "",
        followedPlan: entry?.followedPlan ?? "YES",
        impulsive: entry?.impulsive ? "yes" : "no",
        mainMistake: entry?.mainMistake ?? "",
        didRight: entry?.didRight ?? "",
        toImprove: entry?.toImprove ?? "",
      });
      setErrors({});
      setFormError(null);
    }
  }

  const dayTrades = useMemo(
    () => (form ? p.sortedTrades.filter((t) => dayKeyOf(t.executedAt, p.tz) === form.sessionDate) : []),
    [form, p],
  );

  if (!form) return null;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = async () => {
    setFormError(null);
    const parsed = journalInputSchema.safeParse({
      ...form,
      tradeId: form.tradeId || null,
      strategyId: form.strategyId || null,
      emotion: form.emotion || undefined,
      impulsive: form.impulsive === "yes",
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    try {
      await save.mutateAsync({ id: entry?.id, input: parsed.data });
      toast.success(entry ? "Anotação atualizada" : "Anotação registrada", formatDayKey(parsed.data.sessionDate, "long"));
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        setErrors(err.fields);
      } else setFormError("Não foi possível salvar.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={entry ? "Editar anotação" : "Nova anotação no diário"}
      description="Registre seu comportamento com honestidade: é o que permite evoluir a disciplina."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={save.isPending} data-testid="journal-save">
            Salvar anotação
          </Button>
        </>
      }
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <FormError message={formError} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sessão de trading (data)" error={errors.sessionDate}>
            {(id) => (
              <Input
                id={id}
                type="date"
                max={p.today}
                value={form.sessionDate}
                onChange={(e) => {
                  set("sessionDate", e.target.value);
                  set("tradeId", "");
                }}
                invalid={!!errors.sessionDate}
              />
            )}
          </Field>
          <Field label="Relacionar a uma operação" optional error={errors.tradeId} hint={dayTrades.length ? undefined : "Nenhuma operação nesta data."}>
            {(id) => (
              <Select id={id} value={form.tradeId} onChange={(e) => set("tradeId", e.target.value)} disabled={!dayTrades.length}>
                <option value="">Sessão inteira</option>
                {dayTrades.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatTime(t.executedAt, p.tz)} · {t.asset} · {t.direction} · {RESULT_LABELS[t.result]} ({formatMoney(t.profitCents, settings.currency, { signed: true })})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Como estava meu emocional?" error={errors.emotion}>
          {() => (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Estado emocional">
              {EMOTIONS.map((e) => {
                const active = form.emotion === e;
                return (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set("emotion", e)}
                    className={cn(
                      "focus-ring h-8 rounded-full border px-3 text-xs transition-colors",
                      active
                        ? POSITIVE_EMOTIONS.has(e)
                          ? "border-pos/40 bg-pos/15 text-pos"
                          : "border-warn/40 bg-warn/15 text-warn"
                        : "border-line text-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    {EMOTION_LABELS[e]}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
        <Field label="Detalhe sobre o emocional" optional>
          {(id) => <Input id={id} value={form.emotionNote} onChange={(e) => set("emotionNote", e.target.value)} maxLength={500} placeholder="Ex.: dormi pouco, estava ansioso após o primeiro LOSS" />}
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Qual estratégia utilizei?" optional>
            {(id) => (
              <Select id={id} value={form.strategyId} onChange={(e) => set("strategyId", e.target.value)}>
                <option value="">Não informada</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Segui meu gerenciamento?">
            {() => (
              <Segmented<PlanAdherence>
                ariaLabel="Segui meu gerenciamento"
                value={form.followedPlan}
                onChange={(v) => set("followedPlan", v)}
                className="w-full"
                options={[
                  { value: "YES", label: "Sim", tone: "pos" },
                  { value: "PARTIAL", label: "Parcial" },
                  { value: "NO", label: "Não", tone: "neg" },
                ]}
              />
            )}
          </Field>
          <Field label="Operei por impulso?">
            {() => (
              <Segmented<"no" | "yes">
                ariaLabel="Operei por impulso"
                value={form.impulsive}
                onChange={(v) => set("impulsive", v)}
                className="w-full"
                options={[
                  { value: "no", label: "Não", tone: "pos" },
                  { value: "yes", label: "Sim", tone: "neg" },
                ]}
              />
            )}
          </Field>
        </div>

        <Field label="Qual foi meu principal erro?" optional error={errors.mainMistake}>
          {(id) => <Textarea id={id} value={form.mainMistake} onChange={(e) => set("mainMistake", e.target.value)} maxLength={2000} name="mainMistake" />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="O que fiz corretamente?" optional>
            {(id) => <Textarea id={id} value={form.didRight} onChange={(e) => set("didRight", e.target.value)} maxLength={2000} name="didRight" />}
          </Field>
          <Field label="O que preciso melhorar?" optional>
            {(id) => <Textarea id={id} value={form.toImprove} onChange={(e) => set("toImprove", e.target.value)} maxLength={2000} name="toImprove" />}
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function Insights() {
  const { journal, portfolio: p, settings } = useReadyData();
  const cur = settings.currency;
  const data = useMemo(() => {
    const total = journal.length;
    const followed = journal.filter((j) => j.followedPlan === "YES").length;
    const impulsive = journal.filter((j) => j.impulsive).length;
    const emotions = new Map<Emotion, number>();
    journal.forEach((j) => emotions.set(j.emotion, (emotions.get(j.emotion) ?? 0) + 1));
    // Average day result grouped by plan adherence (one value per session date).
    const byPlan = (pred: (j: JournalEntry) => boolean) => {
      const dates = new Set(journal.filter(pred).map((j) => j.sessionDate));
      const nets = [...dates].map((d) => p.days.get(d)?.netCents).filter((v): v is number => v !== undefined);
      return nets.length ? { avg: nets.reduce((a, b) => a + b, 0) / nets.length, n: nets.length } : null;
    };
    return {
      total,
      followedPct: total ? (followed / total) * 100 : null,
      impulsive,
      emotions: [...emotions.entries()].sort((a, b) => b[1] - a[1]),
      followedAvg: byPlan((j) => j.followedPlan === "YES"),
      notFollowedAvg: byPlan((j) => j.followedPlan !== "YES"),
      impulsiveAvg: byPlan((j) => j.impulsive),
    };
  }, [journal, p]);

  if (!data.total) return null;
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-3">
      <Panel title="Disciplina" subtitle={`${data.total} anotação(ões)`}>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">Seguiu o gerenciamento</span>
              <span className="num text-fg">{formatPct(data.followedPct)}</span>
            </div>
            <ProgressBar value={data.followedPct ?? 0} tone="pos" label="Sessões seguindo o gerenciamento" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Zap className="size-4 text-warn" /> Sessões com operação por impulso
            </span>
            <span className="num font-semibold">{data.impulsive}</span>
          </div>
        </div>
      </Panel>
      <Panel title="Resultado médio do dia" subtitle="Cruzando o diário com as operações reais">
        <ul className="space-y-2.5 text-sm">
          {[
            ["Seguiu o gerenciamento", data.followedAvg],
            ["Não seguiu / parcial", data.notFollowedAvg],
            ["Operou por impulso", data.impulsiveAvg],
          ].map(([label, v]) => {
            const val = v as { avg: number; n: number } | null;
            return (
              <li key={label as string} className="flex items-center justify-between gap-3">
                <span className="text-muted">
                  {label as string} {val && <span className="text-xs text-subtle">({val.n} dia(s))</span>}
                </span>
                {val ? <MoneyText cents={Math.round(val.avg)} currency={cur} className="font-semibold" /> : <span className="text-subtle">—</span>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Estados emocionais" subtitle="Frequência nas anotações">
        <ul className="space-y-2">
          {data.emotions.slice(0, 5).map(([e, n]) => (
            <li key={e} className="text-xs">
              <div className="mb-1 flex justify-between">
                <span className={POSITIVE_EMOTIONS.has(e) ? "text-fg" : "text-warn"}>{EMOTION_LABELS[e]}</span>
                <span className="num text-muted">{n}</span>
              </div>
              <ProgressBar value={(n / data.total) * 100} tone={POSITIVE_EMOTIONS.has(e) ? "neutral" : "warn"} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function JournalContent() {
  const { journal, journalLoading, portfolio: p, settings, strategyName, trades } = useReadyData();
  const del = useDeleteJournal();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [toDelete, setToDelete] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<"all" | PlanAdherence>("all");
  const [impulse, setImpulse] = useState<"all" | "yes" | "no">("all");
  const tradeMap = useMemo(() => new Map(trades.map((t) => [t.id, t])), [trades]);

  const filtered = journal.filter((j) => {
    if (plan !== "all" && j.followedPlan !== plan) return false;
    if (impulse !== "all" && j.impulsive !== (impulse === "yes")) return false;
    const q = search.trim().toLowerCase();
    if (q && ![j.mainMistake, j.didRight, j.toImprove, j.emotionNote, EMOTION_LABELS[j.emotion]].some((t) => t.toLowerCase().includes(q))) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Diário de trading"
        description="Acompanhe emocional, disciplina e aprendizados de cada sessão ou operação."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={openNew} data-testid="journal-new">
            Nova anotação
          </Button>
        }
      />
      <Insights />
      <Panel
        title="Histórico de anotações"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no texto…" className="h-9 w-48 pl-8 text-[13px]" aria-label="Buscar anotações" />
            </div>
            <Select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className="h-9 w-auto text-[13px]" aria-label="Filtrar por gerenciamento">
              <option value="all">Gerenciamento: todos</option>
              <option value="YES">Seguiu</option>
              <option value="PARTIAL">Parcialmente</option>
              <option value="NO">Não seguiu</option>
            </Select>
            <Select value={impulse} onChange={(e) => setImpulse(e.target.value as typeof impulse)} className="h-9 w-auto text-[13px]" aria-label="Filtrar por impulso">
              <option value="all">Impulso: todos</option>
              <option value="yes">Com impulso</option>
              <option value="no">Sem impulso</option>
            </Select>
          </div>
        }
      >
        {journalLoading ? (
          <div className="skeleton h-40 rounded-xl" />
        ) : journal.length === 0 ? (
          <EmptyState
            icon={<NotebookPen className="size-5" />}
            title="Seu diário está vazio"
            description="Ao final de cada sessão, registre como você se sentiu, se seguiu o plano e o que aprendeu."
            action={
              <Button variant="primary" onClick={openNew}>
                Escrever primeira anotação
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search className="size-5" />} title="Nenhuma anotação encontrada" description="Ajuste os filtros." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2" data-testid="journal-list">
            {filtered.map((j) => {
              const t = j.tradeId ? tradeMap.get(j.tradeId) : undefined;
              const day = p.days.get(j.sessionDate);
              return (
                <li key={j.id} className="group rounded-2xl border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{formatDayKey(j.sessionDate, "long")}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone={POSITIVE_EMOTIONS.has(j.emotion) ? "pos" : "warn"}>
                          <Brain className="size-3" /> {EMOTION_LABELS[j.emotion]}
                        </Badge>
                        <Badge tone={j.followedPlan === "YES" ? "pos" : j.followedPlan === "NO" ? "neg" : "warn"}>Gerenciamento: {PLAN_ADHERENCE_LABELS[j.followedPlan]}</Badge>
                        {j.impulsive && (
                          <Badge tone="neg">
                            <Zap className="size-3" /> Impulso
                          </Badge>
                        )}
                        {j.strategyId && <Badge>{strategyName(j.strategyId)}</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Editar anotação"
                        onClick={() => {
                          setEditing(j);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Excluir anotação" className="hover:text-neg" onClick={() => setToDelete(j)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
                    {t ? (
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="size-3" /> {t.asset} {t.direction} · <MoneyText cents={t.profitCents} currency={settings.currency} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3" /> Sessão inteira
                      </span>
                    )}
                    {day && (
                      <span>
                        Resultado do dia: <MoneyText cents={day.netCents} currency={settings.currency} />
                      </span>
                    )}
                  </div>
                  {j.emotionNote && <p className="mt-2 text-xs text-muted italic">“{j.emotionNote}”</p>}
                  <dl className="mt-3 space-y-2 text-[13px]">
                    {[
                      ["Principal erro", j.mainMistake, "text-neg"],
                      ["Fiz corretamente", j.didRight, "text-pos"],
                      ["Preciso melhorar", j.toImprove, "text-warn"],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v, c]) => (
                        <div key={k}>
                          <dt className={cn("text-[11px] font-medium tracking-wide uppercase", c)}>{k}</dt>
                          <dd className="mt-0.5 leading-relaxed whitespace-pre-line text-muted">{v}</dd>
                        </div>
                      ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <JournalForm open={formOpen} onClose={() => setFormOpen(false)} entry={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={del.isPending}
        title="Excluir anotação?"
        confirmLabel="Excluir"
        description={toDelete && <>A anotação de {formatDayKey(toDelete.sessionDate)} será removida permanentemente.</>}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            toast.success("Anotação excluída");
            setToDelete(null);
          } catch (err) {
            toast.error("Não foi possível excluir", err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </>
  );
}

export function JournalView() {
  return (
    <DataGate>
      <JournalContent />
    </DataGate>
  );
}
