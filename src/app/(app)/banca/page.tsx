import type { Metadata } from "next";
import { BankrollView } from "@/features/bankroll/bankroll-view";

export const metadata: Metadata = { title: "Gerenciamento de banca" };

export default function Page() {
  return <BankrollView />;
}
