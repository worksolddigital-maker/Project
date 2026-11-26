"use client";

import { CircleCheck, FileSpreadsheet, FileUp, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Select, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useReadyData } from "@/hooks/app-data";
import { api, ApiClientError, downloadFile } from "@/lib/api/client";
import { useInvalidateAll } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/domain/dates";
import {
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  mappingIssues,
  normalizeRow,
  type ImportField,
  type ImportMapping,
  type ImportedTrade,
} from "@/lib/domain/import-mapping";
import { formatMoney } from "@/lib/domain/money";
import { EXPIRATION_PRESETS, formatExpiration } from "@/lib/domain/trade-calc";
import { RESULT_LABELS } from "@/lib/domain/types";

interface Parsed {
  headers: string[];
  rows: string[][];
  fileName: string;
  sheetName: string | null;
  truncated: boolean;
  mapping: ImportMapping;
}

type Step = "upload" | "map" | "done";

export function ImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useReadyData();
  const toast = useToast();
  const invalidateAll = useInvalidateAll();
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
  const [usePayoutFallback, setUsePayoutFallback] = useState(false);
  const [expFallback, setExpFallback] = useState<string>("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; duplicates: number; strategiesCreated: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setMapping(null);
    setError(null);
    setResult(null);
    setUsePayoutFallback(false);
    setExpFallback("");
  };

  const close = () => {
    onClose();
    window.setTimeout(reset, 300);
  };

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 8 * 1024 * 1024) return setError("Arquivo maior que 8 MB.");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api<Parsed>("/api/import/parse", { method: "POST", body });
      setParsed(data);
      setMapping(data.mapping);
      setStep("map");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao ler o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const normalized = useMemo(() => {
    if (!parsed || !mapping) return null;
    const opts = {
      timezone: settings.timezone,
      fallbackPayoutPct: usePayoutFallback ? settings.defaultPayoutPct : null,
      fallbackExpirationSeconds: expFallback ? Number(expFallback) : null,
    };
    const ok: { index: number; trade: ImportedTrade }[] = [];
    const bad: { index: number; errors: string[] }[] = [];
    parsed.rows.forEach((row, index) => {
      const r = normalizeRow(row, mapping, opts);
      if (r.ok) ok.push({ index, trade: r.trade });
      else bad.push({ index, errors: r.errors });
    });
    return { ok, bad };
  }, [parsed, mapping, usePayoutFallback, expFallback, settings]);

  const issues = mapping ? mappingIssues(mapping) : [];

  const commit = async () => {
    if (!normalized || !normalized.ok.length) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await api<{ inserted: number; duplicates: number; strategiesCreated: number }>("/api/import/commit", {
        method: "POST",
        json: { trades: normalized.ok.map((r) => r.trade), skipDuplicates },
      });
      setResult({ ...res, skipped: normalized.bad.length });
      setStep("done");
      await invalidateAll();
      toast.success("Importação concluída", `${res.inserted} operação(ões) importada(s).`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao importar.");
    } finally {
      setCommitting(false);
    }
  };

  const setField = (field: ImportField, value: string) =>
    setMapping((m) => (m ? { ...m, [field]: value === "" ? null : Number(value) } : m));

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Importar histórico de operações"
      description="Arquivos CSV ou Excel (.xlsx). Nenhum dado é gravado antes da sua confirmação."
      footer={
        step === "map" ? (
          <>
            <Button variant="ghost" onClick={reset}>
              Trocar arquivo
            </Button>
            <Button
              variant="primary"
              onClick={commit}
              loading={committing}
              disabled={issues.length > 0 || !normalized?.ok.length}
              data-testid="import-commit"
            >
              Importar {normalized?.ok.length ?? 0} operação(ões)
            </Button>
          </>
        ) : step === "done" ? (
          <Button variant="primary" onClick={close}>
            Concluir
          </Button>
        ) : (
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
        )
      }
    >
      <FormError message={error} />
      {step === "upload" && (
        <div className="grid gap-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void upload(f);
            }}
            className={cn(
              "focus-ring flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition-colors",
              dragOver ? "border-pos/50 bg-pos/[0.06]" : "border-line-strong bg-white/[0.02] hover:bg-white/[0.04]",
            )}
          >
            <span className="mb-4 grid size-12 place-items-center rounded-2xl border border-line bg-white/[0.04]">
              <FileUp className="size-5 text-muted" />
            </span>
            <span className="text-sm font-medium text-fg">{uploading ? "Lendo arquivo…" : "Arraste o arquivo aqui ou clique para selecionar"}</span>
            <span className="mt-1 text-xs text-muted">.csv ou .xlsx · até 8 MB · até 20.000 linhas</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            data-testid="import-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <div className="rounded-xl border border-line bg-white/[0.02] p-4 text-sm text-muted">
            <p className="font-medium text-fg">Formato esperado</p>
            <p className="mt-1">
              Uma linha por operação. As colunas são reconhecidas automaticamente (data, hora, ativo, tipo, valor, expiração, resultado,
              payout, lucro, estratégia, observações) e você pode ajustar o mapeamento no próximo passo. Como a Hezilex não oferece API
              pública, use a exportação/planilha do seu histórico.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => downloadFile("/api/import/template?format=csv", "modelo.csv")}>
                Modelo CSV
              </Button>
              <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => downloadFile("/api/import/template?format=xlsx", "modelo.xlsx")}>
                Modelo Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "map" && parsed && mapping && normalized && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="neutral">{parsed.fileName}</Badge>
            {parsed.sheetName && <Badge tone="neutral">Planilha: {parsed.sheetName}</Badge>}
            <Badge tone="neutral">{parsed.rows.length} linha(s)</Badge>
            {parsed.truncated && <Badge tone="warn">Arquivo truncado em 20.000 linhas</Badge>}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Mapeamento de colunas</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {IMPORT_FIELDS.map((f) => (
                <Field key={f} label={IMPORT_FIELD_LABELS[f]}>
                  {(id) => (
                    <Select id={id} value={mapping[f] ?? ""} onChange={(e) => setField(f, e.target.value)} data-testid={`map-${f}`}>
                      <option value="">— não usar —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ))}
            </div>
            {issues.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-warn">
                {issues.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 rounded-xl border border-line bg-white/[0.02] p-4 md:grid-cols-3">
            <Switch
              checked={skipDuplicates}
              onChange={setSkipDuplicates}
              label="Ignorar duplicadas"
              description="Mesma data/hora, ativo, tipo, valor e resultado."
            />
            <Switch
              checked={usePayoutFallback}
              onChange={setUsePayoutFallback}
              label={`Payout padrão (${String(settings.defaultPayoutPct).replace(".", ",")}%)`}
              description="Para WIN sem payout e sem lucro informado."
            />
            <Field label="Expiração quando ausente">
              {(id) => (
                <Select id={id} value={expFallback} onChange={(e) => setExpFallback(e.target.value)}>
                  <option value="">Exigir na planilha</option>
                  {EXPIRATION_PRESETS.map((p) => (
                    <option key={p.seconds} value={p.seconds}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-pos/20 bg-pos/[0.06] p-3.5">
              <CircleCheck className="size-5 text-pos" />
              <div>
                <p className="num text-lg font-semibold text-pos" data-testid="import-valid-count">
                  {normalized.ok.length}
                </p>
                <p className="text-xs text-muted">linhas válidas para importar</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-3 rounded-xl border p-3.5", normalized.bad.length ? "border-warn/25 bg-warn/[0.06]" : "border-line")}>
              <TriangleAlert className={cn("size-5", normalized.bad.length ? "text-warn" : "text-subtle")} />
              <div>
                <p className="num text-lg font-semibold">{normalized.bad.length}</p>
                <p className="text-xs text-muted">linhas com erro (não serão importadas)</p>
              </div>
            </div>
          </div>

          {normalized.ok.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Pré-visualização</p>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[720px] text-xs">
                  <thead className="bg-white/[0.03] text-left text-muted">
                    <tr>
                      {["Linha", "Data/hora", "Ativo", "Tipo", "Valor", "Expiração", "Resultado", "Payout", "Lucro/prejuízo", "Estratégia"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {normalized.ok.slice(0, 8).map(({ index, trade: t }) => (
                      <tr key={index} className="border-t border-line">
                        <td className="num px-3 py-2 text-subtle">{index + 2}</td>
                        <td className="num px-3 py-2">{formatDateTime(t.executedAt, settings.timezone, true)}</td>
                        <td className="px-3 py-2">{t.asset}</td>
                        <td className={cn("px-3 py-2", t.direction === "CALL" ? "text-pos" : "text-neg")}>{t.direction}</td>
                        <td className="num px-3 py-2">{formatMoney(t.stakeCents, settings.currency)}</td>
                        <td className="px-3 py-2">{formatExpiration(t.expirationSeconds)}</td>
                        <td className="px-3 py-2">{RESULT_LABELS[t.result]}</td>
                        <td className="num px-3 py-2">{t.payoutPct === null ? "—" : `${String(t.payoutPct).replace(".", ",")}%`}</td>
                        <td className={cn("num px-3 py-2", t.profitCents > 0 ? "text-pos" : t.profitCents < 0 ? "text-neg" : "")}>
                          {formatMoney(t.profitCents, settings.currency, { signed: true })}
                        </td>
                        <td className="px-3 py-2 text-muted">{t.strategyName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {normalized.bad.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-warn">Linhas com erro</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-xs text-muted">
                {normalized.bad.slice(0, 50).map((b) => (
                  <li key={b.index}>
                    <span className="num text-fg">Linha {b.index + 2}:</span> {b.errors.join(" ")}
                  </li>
                ))}
                {normalized.bad.length > 50 && <li>… e mais {normalized.bad.length - 50} linha(s).</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="py-6 text-center" data-testid="import-result">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full border border-pos/30 bg-pos/10">
            <CircleCheck className="size-7 text-pos" />
          </span>
          <p className="text-lg font-semibold">Importação concluída</p>
          <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {[
              ["Importadas", result.inserted],
              ["Duplicadas ignoradas", result.duplicates],
              ["Linhas com erro", result.skipped],
              ["Estratégias criadas", result.strategiesCreated],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line p-3">
                <p className="num text-xl font-semibold">{v}</p>
                <p className="text-[11px] text-muted">{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
