"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { api, ApiClientError } from "@/lib/api/client";
import { hardNavigate } from "@/lib/navigation";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation/schemas";
import { AuthScreen } from "./auth-screen";

function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api") ? next : "/dashboard";
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="focus-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-subtle hover:text-fg"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", json: parsed.data });
      hardNavigate(safeNext());
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Não foi possível entrar.");
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
      <p className="mt-1.5 text-sm text-muted">Acesse seu painel de gerenciamento.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
        <FormError message={formError} />
        <Field label="E-mail" error={errors.email}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} autoFocus name="email" />
          )}
        </Field>
        <Field label="Senha" error={errors.password}>
          {(id, d) => (
            <PasswordInput id={id} aria-describedby={d} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} name="password" />
          )}
        </Field>
        <Magnetic className="mt-2">
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} data-testid="login-submit">
            Entrar no painel
          </Button>
        </Magnetic>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-fg underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthScreen>
  );
}

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parsed = registerSchema.safeParse({ name: form.name, email: form.email, password: form.password, timezone });
    const fe = parsed.success ? {} : fieldErrors(parsed.error);
    if (form.password !== form.confirm) fe.confirm = "As senhas não conferem.";
    if (!parsed.success || fe.confirm) return setErrors(fe);
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/register", { method: "POST", json: parsed.data });
      hardNavigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        setErrors(err.fields);
      } else setFormError("Não foi possível criar a conta.");
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
      <p className="mt-1.5 text-sm text-muted">Seus dados ficam salvos com segurança no banco de dados.</p>
      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
        <FormError message={formError} />
        <Field label="Nome" error={errors.name}>
          {(id) => <Input id={id} autoComplete="name" value={form.name} onChange={set("name")} invalid={!!errors.name} autoFocus name="name" />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={form.email} onChange={set("email")} invalid={!!errors.email} name="email" />}
        </Field>
        <Field label="Senha" error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!errors.password} name="password" />}
        </Field>
        <Field label="Confirmar senha" error={errors.confirm}>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} invalid={!!errors.confirm} name="confirm" />}
        </Field>
        <Magnetic className="mt-2">
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} data-testid="register-submit">
            Criar conta e começar
          </Button>
        </Magnetic>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthScreen>
  );
}
