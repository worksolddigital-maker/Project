import type { Metadata } from "next";
import { JournalView } from "@/features/journal/journal-view";

export const metadata: Metadata = { title: "Diário de trading" };

export default function Page() {
  return <JournalView />;
}
