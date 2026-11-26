"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line bg-white/[0.03] px-3 text-sm text-fg placeholder:text-subtle transition-[border-color,background-color,box-shadow] duration-200 outline-none hover:border-line-strong focus:border-white/25 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgb(255_255_255/0.06)] disabled:opacity-50 aria-[invalid=true]:border-neg/60 aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgb(245_71_92/0.12)]";

export interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  optional?: boolean;
}

export function Field({ label, error, hint, className, children, optional }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted">
          {label}
          {optional && <span className="font-normal text-subtle">(opcional)</span>}
        </label>
      )}
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-neg" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefix, suffix, ...rest },
  ref,
) {
  if (prefix || suffix) {
    return (
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3 text-xs text-subtle">{prefix}</span>}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-10", prefix && "pl-10", suffix && "pr-9", className)}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute right-3 text-xs text-subtle">{suffix}</span>}
      </div>
    );
  }
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, "min-h-[84px] resize-y py-2.5 leading-relaxed", className)}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-10 cursor-pointer appearance-none pr-9", className)}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-subtle"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  },
);

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={switchId} className="cursor-pointer">
        <span className="block text-sm text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-ring relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-300",
          checked ? "border-pos/40 bg-pos/80" : "border-line-strong bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "inline-block size-3.5 rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-out-expo)]",
            checked ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-sm text-neg">
      {message}
    </div>
  );
}
