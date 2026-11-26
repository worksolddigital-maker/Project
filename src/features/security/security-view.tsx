"use client";

import { CheckCircle2, Clock, KeyRound, LogOut, MonitorSmartphone, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge, Panel } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { describeUserAgent, timeAgo } from "@/features/activity/describe";
import { EventList } from "@/features/activity/event-list";
import { useReadyData } from "@/hooks/app-data";
import { useNowMinute } from "@/hooks/use-client-store";
import { api, ApiClientError } from "@/lib/api/client";
import { useAudit, useRevokeSession, useSessions } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/domain/dates";
import { hardNavigate } from "@/lib/navigation";
import { SECURITY_POLICY } from "@/lib/security";
import { changePasswordSchema, fieldErrors } from "@/lib/validation/schemas";

function PasswordPanel() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
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
    <Panel title="Alterar senha" subtitle="Ao alterar, todas as outras sessões abertas são encerradas.">
      <form onSubmit={submit} className="grid max-w-md gap-4" noValidate>
        <Field label="Senha atual" error={errors.currentPassword}>
          {(id) => <Input id={id} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" invalid={!!errors.currentPassword} name="currentPassword" />}
        </Field>
        <Field
          label="Nova senha"
          error={errors.newPassword}
          hint={`Mínimo de ${SECURITY_POLICY.minPasswordLength} caracteres, com maiúsculas, minúsculas e números, sem conter o seu nome.`}
        >
          {(id) => <Input id={id} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" invalid={!!errors.newPassword} name="newPassword" />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirm}>
          {(id) => <Input id={id} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" invalid={!!errors.confirm} name="confirmPassword" />}
        </Field>
        <div>
          <Button type="submit" variant="primary" loading={saving} icon={<KeyRound className="size-4" />} data-testid="change-password">
            Alterar senha
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SessionsPanel() {
  const { settings } = useReadyData();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const toast = useToast();
  const list = sessions.data ?? [];
  const others = list.filter((s) => !s.current).length;

  const end = async (id: string) => {
    try {
      await revoke.mutateAsync(id);
      toast.success(id === "others" ? "Outras sessões encerradas" : "Sessão encerrada");
    } catch (err) {
      toast.error("Não foi possível encerrar", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Panel
      title="Sessões ativas"
      subtitle={`Encerradas automaticamente após ${SECURITY_POLICY.idleMinutes / 60} h sem uso ou ${SECURITY_POLICY.sessionDays} dias após a entrada.`}
      actions={
        <Button size="sm" variant="secondary" icon={<LogOut className="size-3.5" />} onClick={() => end("others")} disabled={!others || revoke.isPending}>
          Encerrar as outras
        </Button>
      }
    >
      {sessions.isPending ? (
        <div className="skeleton h-24 rounded-xl" />
      ) : (
        <ul className="divide-y divide-line" data-testid="sessions-list">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <MonitorSmartphone className="size-5 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg">
                  {describeUserAgent(s.userAgent)}
                  {s.current && <Badge tone="pos">Este dispositivo</Badge>}
                </p>
                <p className="text-xs text-muted">
                  {s.ip && <span className="mono">{s.ip} · </span>}
                  entrou em {formatDateTime(s.createdAt, settings.timezone)} · ativo {timeAgo(s.lastSeenAt)}
                </p>
              </div>
              {!s.current && (
                <Button size="xs" variant="ghost" className="hover:text-neg" onClick={() => end(s.id)} disabled={revoke.isPending}>
                  Encerrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SecurityContent() {
  const { user, settings } = useReadyData();
  const now = useNowMinute();
  const log = useAudit("security", { limit: 60 });
  const events = log.data ?? [];
  const since = now - 24 * 3600 * 1000;
  const failed24h = events.filter((e) => (e.action === "auth.login_failed" || e.action === "auth.locked") && new Date(e.createdAt).getTime() > since).length;
  const lastLogins = events.filter((e) => e.action === "auth.login");
  const previousLogin = lastLogins[1];
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cards = [
    {
      icon: failed24h ? ShieldAlert : ShieldCheck,
      tone: failed24h ? "text-warn" : "text-pos",
      label: "Tentativas incorretas (24 h)",
      value: String(failed24h),
      sub: `Bloqueio após ${SECURITY_POLICY.maxFailedLogins} seguidas, por ${SECURITY_POLICY.lockMinutes} min`,
    },
    {
      icon: Clock,
      tone: "text-muted",
      label: "Acesso anterior",
      value: previousLogin ? timeAgo(previousLogin.createdAt) : "—",
      sub: previousLogin ? `${formatDateTime(previousLogin.createdAt, settings.timezone)}${previousLogin.ip ? ` · ${previousLogin.ip}` : ""}` : "Nenhum acesso anterior registrado",
    },
    {
      icon: KeyRound,
      tone: "text-muted",
      label: "Senha alterada",
      value: user?.passwordChangedAt ? timeAgo(user.passwordChangedAt) : "—",
      sub: user?.passwordChangedAt ? formatDateTime(user.passwordChangedAt, settings.timezone) : "Sem registro de alteração",
    },
  ];

  return (
    <>
      <PageHeader title="Segurança" description="Senha, sessões abertas e o registro de acessos da sua conta." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <p className="flex items-center gap-2 text-xs text-muted">
              <c.icon className={cn("size-4", c.tone)} /> {c.label}
            </p>
            <p className="num mt-2 text-xl font-semibold text-fg">{c.value}</p>
            <p className="mt-1 text-xs text-subtle">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <PasswordPanel />
        <SessionsPanel />
        <Panel title="Registro de acessos" subtitle="Entradas, saídas, tentativas incorretas e alterações de senha" bodyClassName="px-3 sm:px-4">
          <EventList events={events} currency={settings.currency} timezone={settings.timezone} showIp emptyText="Nenhum evento de segurança registrado." testId="security-log" />
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="Proteções ativas">
            <ul className="space-y-2.5 text-[13px] text-muted">
              {[
                `Senha com no mínimo ${SECURITY_POLICY.minPasswordLength} caracteres, maiúsculas, minúsculas e números, guardada apenas como hash (scrypt).`,
                `Bloqueio de ${SECURITY_POLICY.lockMinutes} minutos após ${SECURITY_POLICY.maxFailedLogins} senhas incorretas seguidas, além de limite de tentativas por dispositivo.`,
                `Sessão encerrada após ${SECURITY_POLICY.idleMinutes / 60} h sem uso e, no máximo, ${SECURITY_POLICY.sessionDays} dias após a entrada.`,
                "Excluir todas as operações, restaurar backup e excluir a conta exigem a sua senha novamente.",
                "Trocar a senha encerra as sessões em outros dispositivos.",
                "Todas as alterações de dados ficam registradas no Monitoramento.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pos" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Excluir conta" className="border-neg/20">
            <p className="mb-4 text-sm text-muted">Remove permanentemente a conta e todos os dados (operações, banca, diário, metas e registros).</p>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
              Excluir minha conta
            </Button>
          </Panel>
        </div>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Excluir conta permanentemente?"
        confirmLabel="Excluir conta"
        requireText="EXCLUIR"
        requirePassword
        error={deleteError}
        loading={deleting}
        description="Esta ação não pode ser desfeita. Baixe um backup em Configurações antes, se quiser guardar seus dados."
        onConfirm={async (password) => {
          setDeleting(true);
          setDeleteError(null);
          try {
            await api("/api/account", { method: "DELETE", json: { password, confirmation: "EXCLUIR" } });
            hardNavigate("/cadastro");
          } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Falha ao excluir.");
            setDeleting(false);
          }
        }}
      />
    </>
  );
}

export function SecurityView() {
  return (
    <DataGate>
      <SecurityContent />
    </DataGate>
  );
}
