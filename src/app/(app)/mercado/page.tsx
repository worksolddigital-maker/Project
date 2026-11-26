import type { Metadata } from "next";
import { MarketView } from "@/features/market/market-view";

export const metadata: Metadata = { title: "Mercado ao vivo" };

export default function Page() {
  return <MarketView />;
}
