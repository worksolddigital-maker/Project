import {
  BarChart3,
  CalendarDays,
  CandlestickChart,
  FileSpreadsheet,
  LayoutDashboard,
  NotebookPen,
  Settings,
  ShieldAlert,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, description: "Visão geral da conta e do desempenho" },
  { href: "/operacoes", label: "Operações", short: "Operações", icon: CandlestickChart, description: "Registro e histórico de operações" },
  { href: "/banca", label: "Gerenciamento de banca", short: "Banca", icon: Wallet, description: "Capital, depósitos, retiradas e limites" },
  { href: "/risco", label: "Gestão de risco", short: "Risco", icon: ShieldAlert, description: "Exposição, drawdown e alertas" },
  { href: "/estatisticas", label: "Estatísticas", short: "Estatísticas", icon: BarChart3, description: "Gráficos e análises de desempenho" },
  { href: "/calendario", label: "Calendário", short: "Calendário", icon: CalendarDays, description: "Resultado dia a dia" },
  { href: "/diario", label: "Diário de trading", short: "Diário", icon: NotebookPen, description: "Disciplina e comportamento" },
  { href: "/metas", label: "Metas", short: "Metas", icon: Target, description: "Objetivos e limites" },
  { href: "/relatorios", label: "Relatórios", short: "Relatórios", icon: FileSpreadsheet, description: "Exportação CSV, Excel e impressão" },
  { href: "/configuracoes", label: "Configurações", short: "Configurações", icon: Settings, description: "Conta, preferências e dados" },
];

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
