import type { SVGProps } from 'react'

const PATHS = {
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7M9 7h8v8',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.2 4.2L19 7',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
  card: 'M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zM3 10h18M7 15h4',
  bag: 'M6 8h12l-1 12H7L6 8zM9 8V6.5a3 3 0 016 0V8',
  coins: 'M8 8c0 1.7 2.7 3 6 3s6-1.3 6-3-2.7-3-6-3-6 1.3-6 3zM8 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8M4 12c0 1.7 2.7 3 6 3M4 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3',
  chart: 'M4 19h16M7 16v-4M11 16V9M15 16v-6M19 16V6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  building: 'M4 21h16M6 21V9l6-4 6 4v12M9 21v-5h6v5M10 11h.01M14 11h.01',
  shield: 'M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3zM9 12l2 2 4-4',
  leaf: 'M5 19c8 0 14-6 14-14-8 0-14 6-14 14zM5 19l7-7',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  pie: 'M12 3v9h9a9 9 0 10-9-9zM15 3.5A9 9 0 0120.5 9H15V3.5z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  bank: 'M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
  plane: 'M2.5 12.5l19-8-6 16-3.5-6.5-9.5-1.5zM12 14l3.5-3.5',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z',
  wallet: 'M4 7.5A2.5 2.5 0 016.5 5H18v4M4 7.5v9A2.5 2.5 0 006.5 19H20v-10H6.5A2.5 2.5 0 014 7.5zM16 14h.01',
  phone: 'M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zM11 18h2',
  rotate: 'M4 12a8 8 0 0113.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.7L4 15.5M4 20v-4.5h4.5',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 12 7 12 7zM12 7c1.5-3 5-3.5 5-1.2C17 7 12 7 12 7z',
  percent: 'M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7M22 21v-1a6 6 0 00-4-5.6',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  rocket: 'M12 15l-3-3c1-4 4-8 10-9-1 6-5 9-9 10zM9 12l-4 1-2 3 4 1M12 15l-1 4 3 2 1-4M15 9h.01',
  cloud: 'M7 18a4.5 4.5 0 01-.7-8.9A6 6 0 0117.8 8 4.5 4.5 0 0117 18H7z',
  calculator: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  mouse: 'M12 3a5 5 0 015 5v8a5 5 0 01-10 0V8a5 5 0 015-5zM12 7v3',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  strokeWidth?: number
}

export function Icon({ name, size = 20, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
