"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="glass rounded-2xl">
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        title="Algo deu errado nesta página"
        description={error.message || "Erro inesperado."}
        action={
          <Button variant="secondary" onClick={reset} icon={<RefreshCw className="size-4" />}>
            Tentar novamente
          </Button>
        }
      />
    </div>
  );
}
