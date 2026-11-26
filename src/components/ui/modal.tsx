"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/use-client-store";
import { cn } from "@/lib/cn";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** "sheet" slides in from the right (details panels). */
  variant?: "center" | "sheet";
}

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

/** Open dialogs, top-most last: only the top one reacts to Escape/Tab. */
const modalStack: string[] = [];

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, footer, size = "md", variant = "center" }: ModalProps) {
  const mounted = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const requestClose = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    modalStack.push(titleId);
    if (modalStack.length === 1) {
      root.style.overflow = "hidden";
      root.classList.add("modal-open");
      window.dispatchEvent(new CustomEvent("app:scroll-lock", { detail: true }));
    }
    const isTop = () => modalStack[modalStack.length - 1] === titleId;
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const idx = modalStack.lastIndexOf(titleId);
      if (idx !== -1) modalStack.splice(idx, 1);
      if (modalStack.length === 0) {
        root.style.overflow = "";
        root.classList.remove("modal-open");
        window.dispatchEvent(new CustomEvent("app:scroll-lock", { detail: false }));
      }
      previouslyFocused?.focus?.();
    };
  }, [open, titleId]);

  if (!mounted) return null;

  const sheet = variant === "sheet";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex",
              sheet ? "justify-end" : "items-end justify-center sm:items-center sm:p-6",
            )}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              // Every variant animates opacity so exits complete even when reduced motion skips transforms.
              initial={sheet ? { x: "100%", opacity: 0 } : { opacity: 0, y: 32, scale: 0.97, filter: "blur(8px)" }}
              animate={sheet ? { x: 0, opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={sheet ? { x: "100%", opacity: 0 } : { opacity: 0, y: 16, scale: 0.98, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
              className={cn(
                "glass-strong pointer-events-auto flex w-full flex-col overflow-hidden",
                sheet ? "h-full max-w-xl rounded-l-2xl" : cn("max-h-[92dvh] rounded-t-2xl sm:rounded-2xl", SIZES[size]),
              )}
            >
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-black/20 px-5 py-3.5 sm:px-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  /** Requires typing this word to enable the confirm button. */
  requireText?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "danger",
  loading,
  requireText,
}: ConfirmProps) {
  const [typed, setTyped] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setTyped("");
  }
  const blocked = requireText ? typed.trim().toUpperCase() !== requireText : false;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => void onConfirm()}
            loading={loading}
            disabled={blocked}
            data-testid="confirm-button"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted">{description}</div>
      {requireText && (
        <div className="mt-4">
          <label className="text-xs text-muted">
            Digite <span className="font-mono text-fg">{requireText}</span> para confirmar
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            data-autofocus
            className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white/[0.03] px-3 font-mono text-sm text-fg outline-none focus:border-white/25"
          />
        </div>
      )}
    </Modal>
  );
}
