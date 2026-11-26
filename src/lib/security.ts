/** Security policy and activity-log vocabulary shared by server, demo and UI. */
export const SECURITY_POLICY = {
  /** Wrong passwords in a row before the account is locked. */
  maxFailedLogins: 5,
  lockMinutes: 15,
  /** A session ends after this long without activity. */
  idleMinutes: 120,
  /** ...and in any case this many days after sign-in. */
  sessionDays: 7,
  minPasswordLength: 10,
};

/** The password may not contain the person's own first or last name. */
export function passwordContainsName(password: string, name: string): boolean {
  const plain = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const p = plain(password);
  return plain(name)
    .split(/\s+/)
    .filter((part) => part.length >= 3)
    .some((part) => p.includes(part));
}

export interface SessionInfo {
  /** Short fingerprint of the session (never the token). */
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export const AUDIT_ACTIONS = {
  "auth.register": "Conta criada",
  "auth.login": "Entrou no sistema",
  "auth.login_failed": "Tentativa de acesso com senha incorreta",
  "auth.locked": "Conta bloqueada após tentativas incorretas",
  "auth.logout": "Saiu do sistema",
  "auth.password_changed": "Alterou a senha",
  "auth.sessions_revoked": "Encerrou sessões em outros dispositivos",
  "trade.create": "Registrou operação",
  "trade.update": "Editou operação",
  "trade.delete": "Excluiu operação",
  "trade.delete_all": "Excluiu todas as operações",
  "cash.create": "Registrou movimentação",
  "cash.update": "Editou movimentação",
  "cash.delete": "Excluiu movimentação",
  "strategy.create": "Criou estratégia",
  "strategy.update": "Editou estratégia",
  "strategy.delete": "Excluiu estratégia",
  "journal.create": "Escreveu no diário",
  "journal.update": "Editou anotação do diário",
  "journal.delete": "Excluiu anotação do diário",
  "settings.update": "Alterou parâmetros",
  "profile.update": "Alterou dados do perfil",
  "import.commit": "Importou histórico",
  "backup.restore": "Restaurou backup",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Sign-in and password events form the security log; the rest is account activity. */
export const isSecurityAction = (a: string) => a.startsWith("auth.");

export interface AuditEvent {
  id: string;
  action: AuditAction;
  /** Small JSON object with the event's details (rendered by the client). */
  detail: string;
  ip: string;
  createdAt: string;
}
