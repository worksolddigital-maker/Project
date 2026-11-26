import { AnimatePresence, motion } from "motion/react";
import { CloudCheck, FlaskConical, HardDrive, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { EXAMPLE_PASSWORD, openExampleAccount } from "./backend/sample";
import { emptyState, getPersistenceMode, getSaveStatus, getState, replaceState, subscribeSaveStatus } from "./backend/store";
import type { NoticeTone } from "./notices";
import { hardNavigate } from "./shims/navigation";

const STORAGE_TEXT = {
  cloud: "Os dados ficam salvos de forma privada na sua conta Claude: só você vê, em qualquer dispositivo.",
  local: "Os dados ficam salvos neste navegador.",
  memory: "Os dados não serão salvos ao fechar esta página.",
};

/** Floating panel that explains the demo and offers example data. */
export function DemoDock({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(!signedIn);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notices, setNotices] = useState<{ id: number; message: string; tone: NoticeTone }[]>([]);
  const status = useSyncExternalStore(subscribeSaveStatus, getSaveStatus, getSaveStatus);
  const mode = getPersistenceMode() ?? "memory";
  const isExample = getState().accounts.find((a) => a.id === getState().session)?.example ?? false;

  useEffect(() => {
    let n = 0;
    const onNotice = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: NoticeTone }>).detail;
      setNotices((list) => (list.some((x) => x.message === message) ? list : [...list.slice(-2), { id: ++n, message, tone }]));
      setOpen(true);
    };
    window.addEventListener("demo:notice", onNotice);
    return () => window.removeEventListener("demo:notice", onNotice);
  }, []);

  const StatusIcon = status === "saving" ? LoaderCircle : status === "error" ? TriangleAlert : mode === "cloud" ? CloudCheck : HardDrive;
  const statusText = status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : status === "saved" ? "Salvo" : "Pronto";

  return (
    <div
      className={cn(
        "no-print fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] z-[65] flex flex-col items-start gap-2",
        // Desktop: sit beside the sidebar instead of over the account card.
        signedIn && "lg:left-[276px]",
      )}
    >
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-strong w-[min(360px,calc(100vw-24px))] rounded-2xl p-4"
            aria-label="Sobre esta demonstração"
            data-lenis-prevent
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-pos/90">Versão de demonstração</p>
                <p className="mt-1 text-sm font-semibold text-fg">O sistema completo, rodando no seu navegador</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="focus-ring rounded-md p-1 text-subtle hover:text-fg" aria-label="Fechar painel">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Mesmas telas, cálculos e validações da versão instalada. {STORAGE_TEXT[mode]}
            </p>
            {notices.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {notices.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs",
                      n.tone === "error" ? "border-neg/30 bg-neg/10 text-neg" : n.tone === "warning" ? "border-warn/30 bg-warn/10 text-warn" : "border-line bg-white/[0.04] text-muted",
                    )}
                  >
                    <span>{n.message}</span>
                    <button type="button" className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dispensar aviso" onClick={() => setNotices((l) => l.filter((x) => x.id !== n.id))}>
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid gap-2">
              {!isExample && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await openExampleAccount();
                    setOpen(false);
                    hardNavigate("/dashboard");
                  }}
                  data-testid="demo-example"
                >
                  Abrir conta de exemplo (dados fictícios)
                </Button>
              )}
              {isExample && (
                <div className="space-y-1 text-xs">
                  <p className="text-warn">Você está na conta de exemplo: todos os números são fictícios.</p>
                  <p className="text-muted">
                    Senha desta conta (pedida em ações sensíveis): <span className="mono text-fg">{EXAMPLE_PASSWORD}</span>
                  </p>
                </div>
              )}
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      replaceState(emptyState());
                      setConfirmReset(false);
                      hardNavigate("/cadastro");
                    }}
                  >
                    Apagar tudo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                  Apagar todos os dados da demo
                </Button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring glass-strong inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs text-muted transition-colors hover:text-fg"
        aria-expanded={open}
        data-testid="demo-dock"
      >
        <FlaskConical className="size-3.5 text-pos" />
        <span className="font-medium text-fg">Demo</span>
        <span className="h-3 w-px bg-line-strong" />
        <StatusIcon className={cn("size-3.5", status === "saving" && "animate-spin", status === "error" && "text-neg")} />
        <span className="max-sm:hidden">{statusText}</span>
      </button>
    </div>
  );
}
