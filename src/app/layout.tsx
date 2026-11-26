import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Trading Desk — Gestão profissional de trading",
    template: "%s · Trading Desk",
  },
  description:
    "Painel de gerenciamento de trading: operações, banca, risco, estatísticas, calendário, diário e metas em um só lugar.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060709",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <div className="ambient" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
