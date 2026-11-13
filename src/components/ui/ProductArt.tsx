import { useId } from 'react'
import type { ProductArt as Art } from '@/data/shop'

/** Ilustrações vetoriais com volume (gradientes + sombra) para as categorias do Shop. */
export function ProductArt({ art, className }: { art: Art; className?: string }) {
  const id = useId().replace(/:/g, '')
  const g = (n: string) => `${id}-${n}`
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={g('o')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB061" />
          <stop offset="1" stopColor="#F06400" />
        </linearGradient>
        <linearGradient id={g('d')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3a3f" />
          <stop offset="1" stopColor="#0d0d0f" />
        </linearGradient>
        <linearGradient id={g('l')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#efe8e0" />
        </linearGradient>
        <linearGradient id={g('s')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={g('sh')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7a2a00" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7a2a00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="142" rx="64" ry="9" fill={`url(#${g('sh')})`} />
      {art === 'phone' && (
        <g transform="rotate(-8 100 80)">
          <rect x="70" y="14" width="60" height="120" rx="14" fill={`url(#${g('d')})`} />
          <rect x="74" y="18" width="52" height="112" rx="11" fill={`url(#${g('o')})`} />
          <rect x="90" y="22" width="20" height="6" rx="3" fill="#111" />
          <rect x="74" y="18" width="52" height="40" rx="11" fill={`url(#${g('s')})`} opacity="0.6" />
        </g>
      )}
      {art === 'laptop' && (
        <g>
          <rect x="44" y="30" width="112" height="72" rx="8" fill={`url(#${g('d')})`} />
          <rect x="50" y="36" width="100" height="60" rx="4" fill={`url(#${g('o')})`} />
          <path d="M30 108h140l-10 16H40z" fill={`url(#${g('l')})`} />
          <rect x="84" y="108" width="32" height="4" rx="2" fill="#d6cdc3" />
          <rect x="50" y="36" width="100" height="20" fill={`url(#${g('s')})`} opacity="0.5" />
        </g>
      )}
      {art === 'tv' && (
        <g>
          <rect x="24" y="22" width="152" height="92" rx="8" fill={`url(#${g('d')})`} />
          <rect x="30" y="28" width="140" height="80" rx="4" fill={`url(#${g('o')})`} />
          <path d="M30 28h70L60 108H30z" fill="#fff" opacity="0.12" />
          <rect x="88" y="114" width="24" height="16" fill="#2a2a2e" />
          <rect x="64" y="128" width="72" height="6" rx="3" fill="#2a2a2e" />
        </g>
      )}
      {art === 'console' && (
        <g>
          <path d="M44 70c0-16 12-26 28-26h56c16 0 28 10 28 26v14c0 20-12 34-26 34-10 0-14-10-22-10h-16c-8 0-12 10-22 10-14 0-26-14-26-34z" fill={`url(#${g('d')})`} />
          <circle cx="76" cy="76" r="10" fill="#555" />
          <rect x="72" y="66" width="8" height="20" rx="2" fill="#bbb" />
          <rect x="66" y="72" width="20" height="8" rx="2" fill="#bbb" />
          <circle cx="126" cy="70" r="5" fill="#FF7A00" />
          <circle cx="138" cy="80" r="5" fill="#FFB061" />
          <circle cx="114" cy="80" r="5" fill="#FFD3A1" />
          <circle cx="126" cy="90" r="5" fill="#F06400" />
        </g>
      )}
      {art === 'appliance' && (
        <g>
          <rect x="64" y="10" width="72" height="126" rx="10" fill={`url(#${g('l')})`} stroke="#e4dbd1" />
          <line x1="64" y1="56" x2="136" y2="56" stroke="#e0d6cb" strokeWidth="2" />
          <rect x="120" y="22" width="5" height="24" rx="2.5" fill={`url(#${g('o')})`} />
          <rect x="120" y="66" width="5" height="36" rx="2.5" fill={`url(#${g('o')})`} />
          <rect x="64" y="10" width="18" height="126" rx="9" fill={`url(#${g('s')})`} opacity="0.7" />
        </g>
      )}
      {art === 'perfume' && (
        <g>
          <rect x="88" y="16" width="24" height="18" rx="4" fill={`url(#${g('d')})`} />
          <rect x="92" y="32" width="16" height="8" fill="#c9b9a6" />
          <rect x="62" y="40" width="76" height="92" rx="18" fill={`url(#${g('o')})`} opacity="0.92" />
          <rect x="70" y="48" width="18" height="76" rx="9" fill="#fff" opacity="0.28" />
          <rect x="84" y="78" width="32" height="20" rx="4" fill="#fff" opacity="0.9" />
        </g>
      )}
      {art === 'sneaker' && (
        <g>
          <path d="M30 104c0-10 6-16 16-18l34-8 16-26c4-6 12-8 18-4l10 8c6 4 10 10 12 16l8 22c18 2 26 6 26 14v6H30z" fill={`url(#${g('o')})`} />
          <path d="M30 112h140v8c0 4-3 6-6 6H36c-3 0-6-2-6-6z" fill={`url(#${g('l')})`} />
          <path d="M86 78l10 10M96 70l10 10M106 62l10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {art === 'sofa' && (
        <g>
          <rect x="40" y="48" width="120" height="50" rx="16" fill={`url(#${g('o')})`} />
          <rect x="26" y="70" width="30" height="50" rx="12" fill="#E85F00" />
          <rect x="144" y="70" width="30" height="50" rx="12" fill="#E85F00" />
          <rect x="50" y="82" width="100" height="34" rx="10" fill="#FF9A3C" />
          <rect x="40" y="120" width="8" height="14" rx="2" fill="#5a3a24" />
          <rect x="152" y="120" width="8" height="14" rx="2" fill="#5a3a24" />
        </g>
      )}
      {art === 'gift' && (
        <g>
          <rect x="52" y="58" width="96" height="76" rx="8" fill={`url(#${g('l')})`} stroke="#e8ddd1" />
          <rect x="46" y="44" width="108" height="22" rx="6" fill={`url(#${g('o')})`} />
          <rect x="92" y="44" width="16" height="90" fill="#F06400" />
          <path d="M100 44c-10-20-34-22-34-8 0 10 20 8 34 8zM100 44c10-20 34-22 34-8 0 10-20 8-34 8z" fill="#FF7A00" />
        </g>
      )}
    </svg>
  )
}
