import type { Metadata } from "next";
import { SecurityView } from "@/features/security/security-view";

export const metadata: Metadata = { title: "Segurança" };

export default function Page() {
  return <SecurityView />;
}
