"use client";

import { DatabaseBackup, Download, FileSpreadsheet, KeyRound, Layers, LogOut, Pencil, Plus, Save, ShieldAlert, Trash2, Upload, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState, Panel, Tabs } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ImportWizard } from "@/features/trades/import-wizard";
import { useReadyData } from "@/hooks/app-data";
import { api, ApiClientError, downloadFile } from "@/lib/api/client";
import { useDeleteAllTrades, useDeleteStrategy, useInvalidateAll, useSaveStrategy, useUpdateProfile, useUpdateSettings } from "@/lib/api/hooks";
import { COMMON_TIMEZONES } from "@/lib/domain/dates";
import { hardNavigate } from "@/lib/navigation";
import { parsePercent } from "@/lib/domain/money";
import { CURRENCIES, type Currency, type Strategy } from "@/lib/domain/types";
import { changePasswordSchema, fieldErrors, profileSchema } from "@/lib/validation/schemas";

type Tab = "perfil" | "preferencias" | "estrategias" | "dados" | "seguranca";

function ProfileTab() {
  const { user } = useReadyData();
  const update = useUpdateProfile();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = profileSchema.safeParse({ name, email });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
      toast.success("Perfil atualizado");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        setErrors(err.fields);
      } else setFormError("Não foi possível salvar.");
    }
  };

  return (
    <Panel title="Perfil" subtitle={user ? `Conta criada em ${new Date(user.createdAt).toLocaleDateString("pt-BR")}` : undefined}>
      <form onSubmit={submit} className="grid max-w-xl gap-4" noValidate>
        <FormError message={formError} />
        <Field label="Nome" error={errors.name}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} autoComplete="name" />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} autoComplete="email" />}
        </Field>
        <div>
          <Button type="submit" variant="primary" loading={update.isPending} icon={<Save className="size-4" />}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PreferencesTab() {
  const { settings } = useReadyData();
  const update = useUpdateSettings();
  const toast = useToast();
  const [currency, setCurrency] = useState<Currency>(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [payout, setPayout] = useState(String(settings.defaultPayoutPct).replace(".", ","));
  const [payoutError, setPayoutError] = useState("");

  const save = async (patch: Parameters<typeof update.mutateAsync>[0], msg = "Preferências salvas") => {
    try {
      await update.mutateAsync(patch);
      toast.success(msg);
    } catch (err) {
      toast.error("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    }
  };

  const zones = COMMON_TIMEZONES.includes(settings.timezone) ? COMMON_TIMEZONES : [settings.timezone, ...COMMON_TIMEZONES];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Regional e operação" subtitle="O fuso horário define a qual dia cada operação pertence.">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const p = parsePercent(payout);
            if (p === null || p < 1 || p > 500) return setPayoutError("Informe um payout entre 1% e 500%.");
            setPayoutError("");
            void save({ currency, timezone, defaultPayoutPct: p });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moeda">
              {(id) => (
                <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} name="currency">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c === "BRL" ? "Real (R$)" : c === "USD" ? "Dólar (US$)" : "Euro (€)"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Fuso horário">
              {(id) => (
                <Select id={id} value={timezone} onChange={(e) => setTimezone(e.target.value)} name="timezone">
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Payout padrão" error={payoutError} hint="Valor sugerido ao registrar uma nova operação.">
            {(id) => <Input id={id} value={payout} onChange={(e) => setPayout(e.target.value)} suffix="%" inputMode="decimal" className="sm:w-48" />}
          </Field>
          <p className="text-xs text-subtle">A moeda altera apenas a exibição. Os valores já registrados não são convertidos.</p>
          <div>
            <Button type="submit" variant="primary" loading={update.isPending} icon={<Save className="size-4" />}>
              Salvar
            </Button>
          </div>
        </form>
      </Panel>
      <Panel title="Interface e animações" subtitle="Aplicado imediatamente">
        <div className="grid gap-5">
          <Switch
            checked={settings.reducedMotion}
            onChange={(v) => save({ reducedMotion: v }, v ? "Animações reduzidas" : "Animações completas")}
            label="Reduzir animações"
            description="Desativa transições cinematográficas, rolagem suave e efeitos de revelação. A preferência do sistema operacional também é respeitada."
          />
          <Switch
            checked={settings.smoothScroll}
            onChange={(v) => save({ smoothScroll: v }, v ? "Rolagem suave ativada" : "Rolagem suave desativada")}
            label="Rolagem suave"
            description="Rolagem com inércia (apenas em dispositivos com mouse/trackpad)."
          />
        </div>
      </Panel>
    </div>
  );
}

function StrategiesTab() {
  const { strategies, trades } = useReadyData();
  const save = useSaveStrategy();
  const del = useDeleteStrategy();
  const toast = useToast();
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Strategy | null>(null);

  const usage = (id: string) => trades.filter((t) => t.strategyId === id).length;

  const openForm = (s: Strategy | null) => {
    setEditing(s);
    setName(s?.name ?? "");
    setDescription(s?.description ?? "");
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) return setError("Informe o nome da estratégia.");
    try {
      await save.mutateAsync({ id: editing?.id, input: { name: name.trim(), description: description.trim() } });
      toast.success(editing ? "Estratégia atualizada" : "Estratégia criada", name.trim());
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    }
  };

  return (
    <Panel
      title="Estratégias"
      subtitle="Usadas para classificar operações e analisar desempenho."
      actions={
        <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => openForm(null)} data-testid="strategy-new">
          Nova estratégia
        </Button>
      }
    >
      {strategies.length === 0 ? (
        <EmptyState icon={<Layers className="size-5" />} title="Nenhuma estratégia cadastrada" description="Cadastre suas estratégias para filtrar e comparar resultados." />
      ) : (
        <ul className="divide-y divide-line" data-testid="strategy-list">
          {strategies.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.description || "Sem descrição"} · {usage(s.id)} operação(ões)</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" aria-label={`Editar ${s.name}`} onClick={() => openForm(s)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${s.name}`} className="hover:text-neg" onClick={() => setToDelete(s)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={editing ? "Editar estratégia" : "Nova estratégia"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submit} loading={save.isPending} data-testid="strategy-save">
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
          <FormError message={error} />
          <Field label="Nome">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} data-autofocus name="strategyName" />}
          </Field>
          <Field label="Descrição" optional>
            {(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />}
          </Field>
          <button type="submit" hidden />
        </form>
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={del.isPending}
        title="Excluir estratégia?"
        confirmLabel="Excluir"
        description={toDelete && <>As {usage(toDelete.id)} operação(ões) com “{toDelete.name}” serão mantidas, apenas sem estratégia vinculada.</>}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            toast.success("Estratégia excluída");
            setToDelete(null);
          } catch (err) {
            toast.error("Não foi possível excluir", err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </Panel>
  );
}

function DataTab() {
  const { trades } = useReadyData();
  const toast = useToast();
  const invalidateAll = useInvalidateAll();
  const deleteAll = useDeleteAllTrades();
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreData, setRestoreData] = useState<{ name: string; json: unknown; counts: string } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error("Operação não concluída", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const pickBackup = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json?.format !== "trading-desk-backup") throw new Error("Arquivo não é um backup deste sistema.");
      setRestoreData({
        name: file.name,
        json,
        counts: `${json.trades?.length ?? 0} operações, ${json.cashMovements?.length ?? 0} movimentações, ${json.journal?.length ?? 0} anotações, ${json.strategies?.length ?? 0} estratégias`,
      });
    } catch (err) {
      toast.error("Backup inválido", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Importar e exportar" subtitle="Planilhas compatíveis com Excel">
        <div className="grid gap-3">
          <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)} className="justify-start">
            Importar histórico (CSV ou Excel)
          </Button>
          <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} className="justify-start" loading={busy === "xlsx"} onClick={() => run("xlsx", () => downloadFile("/api/export?format=xlsx", "relatorio.xlsx"))}>
            Exportar relatório completo (.xlsx)
          </Button>
          <Button variant="secondary" icon={<Download className="size-4" />} className="justify-start" loading={busy === "csv"} onClick={() => run("csv", () => downloadFile("/api/export?format=csv", "operacoes.csv"))}>
            Exportar operações (.csv)
          </Button>
        </div>
      </Panel>
      <Panel title="Backup" subtitle="Cópia completa de configurações, operações, banca, diário e estratégias">
        <div className="grid gap-3">
          <Button variant="secondary" icon={<DatabaseBackup className="size-4" />} className="justify-start" loading={busy === "backup"} onClick={() => run("backup", () => downloadFile("/api/backup", "backup.json"))} data-testid="backup-download">
            Baixar backup (.json)
          </Button>
          <Button variant="secondary" icon={<Upload className="size-4" />} className="justify-start" onClick={() => fileRef.current?.click()}>
            Restaurar backup…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="backup-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickBackup(f);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-subtle">Restaurar substitui todos os dados atuais da conta pelo conteúdo do backup.</p>
        </div>
      </Panel>
      <Panel title="Zona de perigo" className="border-neg/20 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Excluir todas as operações</p>
            <p className="text-xs text-muted">Remove {trades.length} operação(ões). Configurações, banca e diário são mantidos.</p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} disabled={!trades.length} onClick={() => setConfirmDeleteAll(true)}>
            Excluir operações
          </Button>
        </div>
      </Panel>

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={!!restoreData}
        onClose={() => setRestoreData(null)}
        title="Restaurar backup?"
        confirmLabel="Substituir dados"
        requireText="RESTAURAR"
        loading={busy === "restore"}
        description={
          restoreData && (
            <>
              O arquivo <strong className="text-fg">{restoreData.name}</strong> contém {restoreData.counts}. Todos os dados atuais serão substituídos. Recomendamos baixar um backup antes.
            </>
          )
        }
        onConfirm={() =>
          run("restore", async () => {
            if (!restoreData) return;
            try {
              await api("/api/backup", { method: "POST", json: restoreData.json });
              await invalidateAll();
              toast.success("Backup restaurado", restoreData.counts);
              setRestoreData(null);
            } catch (err) {
              throw err instanceof ApiClientError ? err : new Error("Falha ao restaurar.");
            }
          })
        }
      />
      <ConfirmDialog
        open={confirmDeleteAll}
        onClose={() => setConfirmDeleteAll(false)}
        title="Excluir todas as operações?"
        confirmLabel="Excluir tudo"
        requireText="EXCLUIR"
        loading={deleteAll.isPending}
        description="Esta ação não pode ser desfeita. Considere baixar um backup antes."
        onConfirm={async () => {
          try {
            const r = await deleteAll.mutateAsync();
            toast.success("Operações excluídas", `${r.deleted} operação(ões) removida(s).`);
            setConfirmDeleteAll(false);
          } catch (err) {
            toast.error("Não foi possível excluir", err instanceof Error ? err.message : undefined);
          }
        }}
      />
    </div>
  );
}

function SecurityTab() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({ currentPassword: current, newPassword: next });
    const fe = parsed.success ? {} : fieldErrors(parsed.error);
    if (next !== confirm) fe.confirm = "As senhas não conferem.";
    if (!parsed.success || fe.confirm) return setErrors(fe);
    setErrors({});
    setSaving(true);
    try {
      const r = await api<{ closedSessions: number }>("/api/account/password", { method: "POST", json: parsed.data });
      toast.success("Senha alterada", r.closedSessions ? `${r.closedSessions} outra(s) sessão(ões) encerrada(s).` : undefined);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiClientError) setErrors(Object.keys(err.fields).length ? err.fields : { currentPassword: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Alterar senha" subtitle="Ao alterar, as outras sessões abertas são encerradas.">
        <form onSubmit={changePassword} className="grid max-w-md gap-4" noValidate>
          <Field label="Senha atual" error={errors.currentPassword}>
            {(id) => <Input id={id} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" invalid={!!errors.currentPassword} />}
          </Field>
          <Field label="Nova senha" error={errors.newPassword} hint="Mínimo de 8 caracteres, com letras e números.">
            {(id) => <Input id={id} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" invalid={!!errors.newPassword} />}
          </Field>
          <Field label="Confirmar nova senha" error={errors.confirm}>
            {(id) => <Input id={id} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" invalid={!!errors.confirm} />}
          </Field>
          <div>
            <Button type="submit" variant="primary" loading={saving} icon={<KeyRound className="size-4" />}>
              Alterar senha
            </Button>
          </div>
        </form>
      </Panel>
      <div className="grid gap-4">
        <Panel title="Sessões" subtitle="Encerre o acesso em outros dispositivos">
          <Button
            variant="secondary"
            icon={<LogOut className="size-4" />}
            onClick={async () => {
              try {
                const r = await api<{ closedSessions: number }>("/api/account/sessions", { method: "DELETE" });
                toast.success("Sessões encerradas", `${r.closedSessions} sessão(ões) em outros dispositivos.`);
              } catch (err) {
                toast.error("Falha", err instanceof Error ? err.message : undefined);
              }
            }}
          >
            Encerrar outras sessões
          </Button>
        </Panel>
        <Panel title="Excluir conta" className="border-neg/20">
          <p className="mb-4 text-sm text-muted">Remove permanentemente a conta e todos os dados (operações, banca, diário, metas).</p>
          <Button variant="danger" icon={<ShieldAlert className="size-4" />} onClick={() => setDeleteOpen(true)}>
            Excluir minha conta
          </Button>
        </Panel>
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        title="Excluir conta permanentemente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteText.trim().toUpperCase() !== "EXCLUIR" || !deletePassword}
              onClick={async () => {
                setDeleting(true);
                setDeleteError(null);
                try {
                  await api("/api/account", { method: "DELETE", json: { password: deletePassword, confirmation: "EXCLUIR" } });
                  hardNavigate("/cadastro");
                } catch (err) {
                  setDeleteError(err instanceof Error ? err.message : "Falha ao excluir.");
                  setDeleting(false);
                }
              }}
            >
              Excluir conta
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormError message={deleteError} />
          <p className="text-sm text-muted">Esta ação não pode ser desfeita. Baixe um backup antes, se quiser guardar seus dados.</p>
          <Field label="Sua senha">
            {(id) => <Input id={id} type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" />}
          </Field>
          <Field label='Digite "EXCLUIR" para confirmar'>
            {(id) => <Input id={id} value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function SettingsContent() {
  // Rendered only on the client (behind DataGate), so the hash can seed the initial tab.
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1) as Tab;
    return ["perfil", "preferencias", "estrategias", "dados", "seguranca"].includes(h) ? h : "perfil";
  });
  const change = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
  };
  return (
    <>
      <PageHeader title="Configurações" description="Conta, preferências, estratégias, dados e segurança." />
      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={change}
        tabs={[
          { value: "perfil", label: <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />Perfil</span> },
          { value: "preferencias", label: "Preferências" },
          { value: "estrategias", label: "Estratégias" },
          { value: "dados", label: "Dados e backup" },
          { value: "seguranca", label: "Segurança" },
        ]}
      />
      {tab === "perfil" && <ProfileTab />}
      {tab === "preferencias" && <PreferencesTab />}
      {tab === "estrategias" && <StrategiesTab />}
      {tab === "dados" && <DataTab />}
      {tab === "seguranca" && <SecurityTab />}
    </>
  );
}

export function SettingsView() {
  return (
    <DataGate>
      <SettingsContent />
    </DataGate>
  );
}
