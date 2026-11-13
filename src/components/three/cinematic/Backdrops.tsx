/** Fundo do herói: branco com gradientes orgânicos laranja (referência: imagem 2). */
export function HeroBackdrop() {
  return (
    <div className="noise absolute inset-0 overflow-hidden bg-cream">
      <div className="absolute -right-[18%] -top-[25%] h-[85vmax] w-[85vmax] animate-drift rounded-full bg-[radial-gradient(circle_at_center,rgba(255,122,0,0.55)_0%,rgba(255,138,30,0.28)_35%,rgba(255,122,0,0)_68%)]" />
      <div className="absolute -bottom-[35%] -left-[25%] h-[70vmax] w-[70vmax] animate-drift rounded-full bg-[radial-gradient(circle_at_center,rgba(255,176,103,0.42)_0%,rgba(255,176,103,0)_65%)] [animation-delay:-7s]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-80"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFD3A1" stopOpacity="0" />
            <stop offset="0.45" stopColor="#FF9A3C" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FF6A00" stopOpacity="0.85" />
          </linearGradient>
          <filter id="hero-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
        <path
          d="M820 -80 C 1040 160, 760 380, 980 620 S 1380 760, 1520 980 L 1520 -80 Z"
          fill="url(#hero-sweep)"
          filter="url(#hero-blur)"
        />
        <path
          d="M1010 120 C 1120 300, 940 520, 1180 760"
          stroke="#FFB067"
          strokeOpacity="0.55"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream/80 to-transparent" />
    </div>
  )
}

/** Palco escuro com brilho alaranjado (referência: vídeo e imagem 1). */
export function DarkBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-night">
      <div className="absolute left-1/2 top-1/2 h-[90vmax] w-[90vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,110,0,0.32)_0%,rgba(190,70,0,0.16)_32%,rgba(0,0,0,0)_62%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="flame" cx="0.25" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#FFE3C0" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#FF8A1F" stopOpacity="0.45" />
            <stop offset="1" stopColor="#7A2A00" stopOpacity="0" />
          </radialGradient>
          <filter id="flame-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="70" />
          </filter>
        </defs>
        <path
          d="M-120 120 C 160 40, 380 260, 300 520 S 520 820, 760 700 S 980 380, 1180 560 L 1180 1000 L -120 1000 Z"
          fill="url(#flame)"
          filter="url(#flame-blur)"
          opacity="0.6"
        />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  )
}
