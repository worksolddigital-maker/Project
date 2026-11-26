import type { Metadata } from "next";
import { RiskView } from "@/features/risk/risk-view";

export const metadata: Metadata = { title: "Gestão de risco" };

export default function Page() {
  return <RiskView />;
}
