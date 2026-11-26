import {
  Activity,
  BarChart3,
  CalendarDays,
  CandlestickChart,
  FileSpreadsheet,
  LayoutDashboard,
  NotebookPen,
  Settings,
  ShieldAlert,
  ShieldCheck,
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

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, description: "Visão geral da conta e do desempenho" },
      { href: "/monitoramento", label: "Monitoramento", short: "Monitoramento", icon: Activity, description: "Sessão ao vivo, limites e atividade da conta" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { href: "/operacoes", label: "Operações", short: "Operações", icon: CandlestickChart, description: "Registro e histórico de operações" },
      { href: "/calendario", label: "Calendário", short: "Calendário", icon: CalendarDays, description: "Resultado dia a dia" },
      { href: "/diario", label: "Diário de trading", short: "Diário", icon: NotebookPen, description: "Disciplina e comportamento" },
    ],
  },
  {
    label: "Capital e risco",
    items: [
      { href: "/banca", label: "Gerenciamento de banca", short: "Banca", icon: Wallet, description: "Capital, depósitos, retiradas e limites" },
      { href: "/risco", label: "Gestão de risco", short: "Risco", icon: ShieldAlert, description: "Exposição, drawdown e alertas" },
      { href: "/metas", label: "Metas", short: "Metas", icon: Target, description: "Objetivos e limites" },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/estatisticas", label: "Estatísticas", short: "Estatísticas", icon: BarChart3, description: "Gráficos e análises de desempenho" },
      { href: "/relatorios", label: "Relatórios", short: "Relatórios", icon: FileSpreadsheet, description: "Exportação CSV, Excel e impressão" },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/seguranca", label: "Segurança", short: "Segurança", icon: ShieldCheck, description: "Senha, sessões e registro de acessos" },
      { href: "/configuracoes", label: "Configurações", short: "Configurações", icon: Settings, description: "Preferências, ativos, estratégias e dados" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
