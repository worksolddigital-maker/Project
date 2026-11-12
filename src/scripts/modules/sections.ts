/** Coreografias específicas de cada seção. */
import { gsap, loadMorphSVG, prepareStroke, ScrollTrigger, SplitText } from '../lib/gsap';
import { matches, mq, qs, qsa } from '../lib/env';

/* ------------------------------------------------------------------ */
/* Hero — parallax cinematográfico ao rolar                            */
/* ------------------------------------------------------------------ */
export function initHeroScroll() {
  const hero = qs('[data-hero]');
  if (!hero) return;
  const img = qs('[data-hero-img]', hero);
  const content = qs('.hero__content', hero);
  const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  if (img) gsap.to(img, { yPercent: 9, scale: 1.05, ease: 'none', scrollTrigger: st });
  if (content && !matches(mq.mobile)) gsap.to(content, { yPercent: -10, ease: 'none', scrollTrigger: st });
}

/* ------------------------------------------------------------------ */
/* Manifesto — tipografia cinética: palavras ganham presença ao rolar  */
/* ------------------------------------------------------------------ */
export function initManifesto() {
  const text = qs('[data-manifesto-text]');
  if (!text) return;
  // Cada linha é "preenchida" da esquerda para a direita conforme a rolagem
  // (background-clip: text). Sem opacidade parcial — que desloca acentos em
  // fontes variáveis — e sem texto de baixo contraste para leitores.
  SplitText.create(text, {
    type: 'lines',
    linesClass: 'manifesto__line',
    aria: 'none',
    autoSplit: true,
    onSplit(self) {
      gsap.set(self.lines, { backgroundPositionX: '100%' });
      return gsap.to(self.lines, {
        backgroundPositionX: '0%',
        ease: 'none',
        stagger: 1,
        duration: 1,
        scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 46%', scrub: 0.6 },
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Procedimentos — navegação de categorias com indicador deslizante    */
/* ------------------------------------------------------------------ */
export function initProcedureNav() {
  const bar = qs('[data-pnav-bar]');
  const indicator = qs('[data-pnav-indicator]');
  if (!bar || !indicator) return;
  const items = qsa<HTMLAnchorElement>('[data-pnav-item]', bar);

  const setActive = (id: string | null) => {
    items.forEach((item) => item.classList.toggle('is-active', item.dataset.pnavItem === id));
    const active = items.find((item) => item.dataset.pnavItem === id);
    if (!active) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    if (bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
    }
  };

  let current: string | null = null;
  qsa('[data-pcat]').forEach((cat) => {
    ScrollTrigger.create({
      trigger: cat,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (self.isActive) {
          current = cat.dataset.pcat ?? null;
          setActive(current);
        }
      },
    });
  });
  window.addEventListener('resize', () => setActive(current), { passive: true });
}

/* ------------------------------------------------------------------ */
/* Mapeamento facial — traçado desenhado (DrawSVG)                     */
/* ------------------------------------------------------------------ */
export function initMappingLines() {
  qsa('[data-mapping]').forEach((svg) => {
    const all = qsa<SVGPathElement>('[data-map-line]', svg);
    // Linhas tracejadas mantêm o tracejado: surgem por escala.
    const dashed = all.filter((l) => l.hasAttribute('stroke-dasharray'));
    const lines = all.filter((l) => !l.hasAttribute('stroke-dasharray'));
    const dots = qsa('[data-map-dot]', svg);

    // Com vector-effect: non-scaling-stroke o tracejado é medido em pixels de
    // tela; por isso o comprimento considera a escala atual do SVG.
    const screenLength = (path: SVGPathElement) => {
      const m = path.getScreenCTM();
      const scale = m ? Math.hypot(m.a, m.b) : 1;
      return path.getTotalLength() * scale + 2;
    };
    const hide = () => {
      lines.forEach((l) => {
        const len = screenLength(l);
        gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.set(dashed, { scaleY: 0, transformOrigin: '50% 0%' });
      gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
    };
    const draw = () => {
      hide();
      return gsap
        .timeline()
        .to(lines, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'loInOut' })
        .to(dashed, { scaleY: 1, duration: 1.4, ease: 'loInOut' }, 0.1)
        .to(dots, { scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(2)' }, 0.8);
    };
    hide();
    ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => draw() });
    const card = svg.closest('[data-tilt], [data-phero]');
    card?.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') draw();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Método SER — morfologia orgânica (MorphSVG) guiada pela rolagem     */
/* ------------------------------------------------------------------ */
export async function initMetodo() {
  const block = qs('[data-metodo]');
  if (!block) return;
  const clip = qs<SVGPathElement>('[data-metodo-clip]', block);
  const outline = qs<SVGPathElement>('[data-metodo-outline]', block);
  const image = qs('[data-metodo-image]', block);
  const ghost = qs('[data-metodo-ghost]', block);
  const kinetic = qs('[data-metodo-kinetic]', block);

  if (clip && outline) {
    await loadMorphSVG();
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: block, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
    });
    tl.to(clip, { morphSVG: clip.dataset.shapeB, duration: 1 })
      .to(clip, { morphSVG: clip.dataset.shapeC, duration: 1 })
      .to(outline, { morphSVG: outline.dataset.shapeB, rotation: 5, svgOrigin: '250 310', duration: 1 }, 0)
      .to(outline, { morphSVG: outline.dataset.shapeC, rotation: -4, svgOrigin: '250 310', duration: 1 }, 1);
    if (image) {
      tl.fromTo(image, { scale: 1.16, svgOrigin: '250 310' }, { scale: 1, svgOrigin: '250 310', duration: 2 }, 0);
    }
  }

  if (ghost) {
    gsap.fromTo(
      ghost,
      { xPercent: 14 },
      {
        xPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: block, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  }

  if (kinetic) {
    SplitText.create(kinetic, {
      type: 'chars',
      mask: 'chars',
      aria: 'none',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.chars, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.022,
          ease: 'lo',
          scrollTrigger: { trigger: kinetic, start: 'top 85%', once: true },
        });
      },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Como funciona — jornada horizontal fixada (desktop)                 */
/* ------------------------------------------------------------------ */
export function initProcess() {
  const section = qs('[data-process]');
  if (!section) return;
  const pin = qs('[data-process-pin]', section)!;
  const track = qs('[data-process-track]', section)!;
  const steps = qsa('[data-pstep]', section);
  const bar = qs('[data-process-progress]', section);

  const mm = gsap.matchMedia();
  mm.add({ desktop: mq.desktop, mobile: '(max-width: 1023px)' }, (ctx) => {
    const { desktop } = ctx.conditions as { desktop: boolean };

    if (desktop) {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const move = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      if (bar) {
        gsap.to(bar, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
        });
      }
      steps.forEach((step) => {
        const num = qs('[data-pstep-num]', step);
        const body = qs('[data-pstep-body]', step);
        const icon = qs('[data-pstep-icon]', step);
        const st = { trigger: step, containerAnimation: move, start: 'left 92%', end: 'left 48%', scrub: true };
        if (num) gsap.fromTo(num, { xPercent: 45, opacity: 0.15 }, { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: st });
        // Revelação por máscara (sem transparência no texto).
        if (body) {
          gsap.fromTo(
            body,
            { y: 50, clipPath: 'inset(0% 0% 100% 0%)' },
            { y: 0, clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { ...st, start: 'left 85%', end: 'left 52%' } },
          );
        }
        if (icon instanceof SVGGeometryElement) {
          prepareStroke(icon);
          gsap.to(icon, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { ...st, start: 'left 80%', end: 'left 45%' } });
        }
      });
    } else {
      steps.forEach((step) => {
        gsap.fromTo(
          step,
          { autoAlpha: 0, y: 36 },
          { autoAlpha: 1, y: 0, duration: 1.1, ease: 'lo', scrollTrigger: { trigger: step, start: 'top 88%', once: true } },
        );
        const icon = qs('[data-pstep-icon]', step);
        if (icon instanceof SVGGeometryElement) {
          prepareStroke(icon);
          gsap.to(icon, { strokeDashoffset: 0, duration: 1.4, ease: 'loInOut', scrollTrigger: { trigger: step, start: 'top 85%', once: true } });
        }
      });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Instagram — letreiro que reage à velocidade da rolagem              */
/* ------------------------------------------------------------------ */
export function initMarquee() {
  qsa('[data-marquee]').forEach((track) => {
    const chunks = track.children.length || 1;
    const loop = gsap.to(track, {
      xPercent: -100 / chunks,
      duration: 26,
      ease: 'none',
      repeat: -1,
      paused: true,
      // Permite inverter a direção indefinidamente.
      onReverseComplete() {
        this.totalTime(this.rawTime() + this.duration() * 50);
      },
    });
    const speed = { value: 1 };
    const apply = () => loop.timeScale(speed.value);
    ScrollTrigger.create({
      trigger: track,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      onUpdate: (self) => {
        const dir = self.direction === -1 ? -1 : 1;
        const boost = gsap.utils.clamp(0, 5, Math.abs(self.getVelocity()) / 320);
        gsap.to(speed, {
          value: dir * (1 + boost),
          duration: 0.3,
          overwrite: true,
          onUpdate: apply,
          onComplete: () => {
            gsap.to(speed, { value: dir, duration: 1.4, ease: 'power2.out', onUpdate: apply });
          },
        });
      },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Rodapé — assinatura gigante                                         */
/* ------------------------------------------------------------------ */
export function initFooter() {
  const giant = qs('[data-footer-giant]');
  if (!giant) return;
  SplitText.create(giant, {
    type: 'chars',
    mask: 'chars',
    aria: 'none',
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.chars, {
        yPercent: 100,
        duration: 1.3,
        stagger: 0.03,
        ease: 'lo',
        scrollTrigger: { trigger: giant, start: 'top 95%', once: true },
      });
    },
  });
}
