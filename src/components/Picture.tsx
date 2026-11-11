import { images } from '../content'
import type { ImgKey } from '../content/types'

const base = import.meta.env.BASE_URL

export const imgUrl = (name: string) => `${base}img/${name}`

export function Picture({ img, sizes = '100vw', eager = false, className }: { img: ImgKey; sizes?: string; eager?: boolean; className?: string }) {
  const m = images[img]
  return (
    <img
      className={className}
      src={imgUrl(`${img}-1800.webp`)}
      srcSet={`${imgUrl(`${img}-900.webp`)} 900w, ${imgUrl(`${img}-1800.webp`)} 1800w`}
      sizes={sizes}
      width={m.w}
      height={m.h}
      alt={m.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : undefined}
    />
  )
}
