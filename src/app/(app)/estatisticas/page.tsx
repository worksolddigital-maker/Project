import type { Metadata } from "next";
import { StatsView } from "@/features/stats/stats-view";

export const metadata: Metadata = { title: "Estatísticas" };

export default function Page() {
  return <StatsView />;
}
