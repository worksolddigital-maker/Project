/** Utilidades de interface independentes de animação. */
import { ScrollTrigger } from '../lib/gsap';
import { qs, qsa, root } from '../lib/env';

/** Mapa do Google carregado apenas quando se aproxima da tela. */
export function initMap() {
  const map = qs('[data-map]');
  if (!map?.dataset.src) return;
  const load = () => {
    if (map.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.src = map.dataset.src!;
    iframe.title = 'Mapa — Letícia Orlandin Estética Avançada, Cidade Alta, Bento Gonçalves/RS';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    iframe.addEventListener('load', () => iframe.classList.add('is-loaded'), { once: true });
    map.appendChild(iframe);
  };
  if (!('IntersectionObserver' in window)) return load();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        load();
        io.disconnect();
      }
    },
    { rootMargin: '600px 0px' },
  );
  io.observe(map);
}

/** Vídeos (Reels) tocam apenas visíveis, mudos e sem som automático. */
export function initInViewVideos({ animate }: { animate: boolean }) {
  const videos = qsa<HTMLVideoElement>('video[data-autoplay-in-view]');
  if (!videos.length || !animate || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.preload = 'auto';
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.35 },
  );
  videos.forEach((video) => {
    video.addEventListener('playing', () => video.classList.add('is-playing'));
    io.observe(video);
  });
}

/** Botão flutuante do WhatsApp: aparece após o hero e some no contato. */
export function initFloatingWhatsApp() {
  const float = qs('[data-wa-float]');
  if (!float) return;
  let pastHero = false;
  let nearEnd = false;
  const update = () => root.classList.toggle('wa-visible', pastHero && !nearEnd);

  const hero = qs('[data-hero], [data-phero]');
  ScrollTrigger.create({
    trigger: hero ?? document.body,
    start: hero ? 'bottom 60%' : 'top -400',
    end: 'max',
    onToggle: (self) => {
      pastHero = self.isActive;
      update();
    },
  });
  const end = qs('#contato') ?? qs('[data-footer]');
  if (end) {
    ScrollTrigger.create({
      trigger: end,
      start: 'top 85%',
      end: 'max',
      onToggle: (self) => {
        nearEnd = self.isActive;
        update();
      },
    });
  }
}
