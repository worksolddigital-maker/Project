import type { Metadata } from "next";
import { OperationsView } from "@/features/trades/operations-view";

export const metadata: Metadata = { title: "Operações" };

export default function Page() {
  return <OperationsView />;
}
