import { useMemo } from 'react'
import type { CardFinish } from '@/data/cards'
import { cardImageURL } from '@/components/three/textures'
import { useFontsReady } from '@/lib/useFontsReady'
import { cn } from '@/lib/cn'

interface Props {
  finish: CardFinish
  label?: string
  side?: 'front' | 'back'
  className?: string
  alt: string
  width?: number
}

/** Imagem do cartão gerada a partir da mesma arte procedural da cena 3D. */
export function CardImage({ finish, label, side = 'front', className, alt, width = 640 }: Props) {
  const fonts = useFontsReady()
  const src = useMemo(() => (fonts ? cardImageURL(finish, side, label, width) : ''), [finish, side, label, width, fonts])
  return (
    <div className={cn('relative aspect-[1.586/1]', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-[5%] object-cover shadow-[0_30px_60px_-28px_rgba(60,20,0,0.55),0_2px_6px_rgba(0,0,0,0.12)]"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded-[5%] bg-inter-100" role="img" aria-label={alt} />
      )}
    </div>
  )
}
