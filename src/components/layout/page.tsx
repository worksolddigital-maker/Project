"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";
import { SplitHeading } from "@/components/motion/split-heading";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useAppData } from "@/hooks/app-data";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-caps mb-2">{eyebrow}</p>}
        <SplitHeading text={title} className="text-2xl font-semibold tracking-[-0.025em] text-fg sm:text-[30px] sm:leading-[1.15]" />
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-80 rounded-2xl" />
    </div>
  );
}

/** Renders children only when the shared data is loaded; handles loading and error states. */
export function DataGate({ children, skeleton }: { children: ReactNode; skeleton?: ReactNode }) {
  const { ready, error, refetch } = useAppData();
  if (error && !ready) {
    return (
      <div className="glass rounded-2xl">
        <EmptyState
          icon={<ServerCrash className="size-5" />}
          title="Não foi possível carregar seus dados"
          description={error.message}
          action={
            <Button variant="secondary" onClick={refetch} icon={<RefreshCw className="size-4" />}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }
  if (!ready) return <>{skeleton ?? <PageSkeleton />}</>;
  return <>{children}</>;
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:gap-4", className)}>{children}</div>;
}
