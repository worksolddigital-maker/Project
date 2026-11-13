import { rayPathD } from './logoGeometry'
import { cn } from '@/lib/cn'

const RAYS = rayPathD()

interface Props {
  className?: string
  /** cor do símbolo e do texto */
  tone?: 'orange' | 'white' | 'ink' | 'current'
  showWordmark?: boolean
  title?: string
}

const TONES = {
  orange: '#FF7A00',
  white: '#FFFFFF',
  ink: '#0C0A09',
  current: 'currentColor',
}

/** Logotipo estilizado "inter" (raios + wordmark). Representação conceitual. */
export function InterLogo({ className, tone = 'orange', showWordmark = true, title = 'Inter' }: Props) {
  const fill = TONES[tone]
  return (
    <svg
      viewBox={showWordmark ? '0 0 344 100' : '0 0 100 100'}
      className={cn('block shrink-0', className)}
      style={{ aspectRatio: showWordmark ? '344 / 100' : '1 / 1' }}
      role="img"
      aria-label={title}
    >
      <path d={RAYS} fill={fill} />
      {showWordmark && (
        <text
          x="104"
          y="94"
          fill={fill}
          fontFamily="Sora, Inter, sans-serif"
          fontWeight={700}
          fontSize="104"
          letterSpacing="-4"
          textLength="236"
          lengthAdjust="spacingAndGlyphs"
        >
          inter
        </text>
      )}
    </svg>
  )
}
