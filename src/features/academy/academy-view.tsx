"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DataGate, PageHeader } from "@/components/layout/page";
import { Tabs } from "@/components/ui/misc";
import { useReadyData } from "@/hooks/app-data";
import { AnatomyTab } from "./tab-anatomy";
import { BuySellTab } from "./tab-buysell";
import { ConsciousTab } from "./tab-conscious";
import { MarketKnowledgeTab, QuizTab } from "./tab-learn";
import { PatternsTab } from "./tab-patterns";
import { TimesTab } from "./tab-times";

type Tab =
  | "anatomia"
  | "padroes"
  | "compra-venda"
  | "tempos"
  | "consciencia"
  | "conhecer"
  | "treino";

const TABS: { value: Tab; label: string }[] = [
  { value: "anatomia", label: "Anatomia da vela" },
  { value: "padroes", label: "Padrões" },
  { value: "compra-venda", label: "Compra × Venda" },
  { value: "tempos", label: "Tempos e sessões" },
  { value: "consciencia", label: "Operar com consciência" },
  { value: "conhecer", label: "Conhecer o mercado" },
  { value: "treino", label: "Treino" },
];

function AcademyContent() {
  const { settings } = useReadyData();
  // Rendered only on the client (behind DataGate), so the hash can seed the initial tab.
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1) as Tab;
    return TABS.some((t) => t.value === h) ? h : "anatomia";
  });
  const change = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
  };

  return (
    <>
      <PageHeader
        title="Academia de velas"
        description="Aprenda a ler cada vela e pavio em 3D, os padrões de compra e venda, os melhores horários de observação e, principalmente, quando parar."
      />
      <Tabs<Tab> className="mb-5" value={tab} onChange={change} tabs={TABS} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          data-testid={`academy-${tab}`}
        >
          {tab === "anatomia" && <AnatomyTab />}
          {tab === "padroes" && <PatternsTab />}
          {tab === "compra-venda" && <BuySellTab />}
          {tab === "tempos" && <TimesTab tz={settings.timezone} />}
          {tab === "consciencia" && <ConsciousTab />}
          {tab === "conhecer" && <MarketKnowledgeTab />}
          {tab === "treino" && <QuizTab />}
        </motion.div>
      </AnimatePresence>
      <p className="mt-6 text-center text-[11px] text-subtle">
        Conteúdo educativo. Nenhum padrão garante resultado e este painel não
        recomenda operações.
      </p>
    </>
  );
}

export function AcademyView() {
  return (
    <DataGate>
      <AcademyContent />
    </DataGate>
  );
}
