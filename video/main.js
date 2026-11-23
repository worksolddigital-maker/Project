// Work Sold — Convite de sociedade
// Uma única timeline GSAP (pausada) controla tudo; o render faz seek quadro a quadro.
// Figuras 3D (renderizadas por IA, fundo transparente) entram sincronizadas com cada frase.

gsap.registerPlugin(SplitText, CustomEase);
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e)));

const WORDS = window.WORDS;
const TOTAL = window.TOTAL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- cues da narração ----------
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function idx(word, n = 1) {
  const t = norm(word); let k = 0;
  for (let i = 0; i < WORDS.length; i++) if (norm(WORDS[i].w) === t && ++k === n) return i;
  throw new Error(`cue "${word}" #${n} não encontrada`);
}
const T = (w, n = 1) => WORDS[idx(w, n)].s;
const TE = (w, n = 1) => WORDS[idx(w, n)].e;

// ---------- texto ----------
const GRADS = { g: '--grad', gw: '--warm', gf: '--fusion' };
function fixGrad(root) {
  // gradiente contínuo por palavra/caractere após o split
  const nodes = [...(root.matches('.g,.gw,.gf') ? [root] : []), ...root.querySelectorAll('.g,.gw,.gf')];
  nodes.forEach((g) => {
    const key = Object.keys(GRADS).find((k) => g.classList.contains(k));
    const gr = g.getBoundingClientRect();
    let parts = $$('.c', g);
    if (!parts.length) parts = $$('.w', g);
    if (!parts.length) return;
    parts.forEach((p) => {
      const r = p.getBoundingClientRect();
      p.style.backgroundImage = `var(${GRADS[key]})`;
      p.style.backgroundSize = `${gr.width}px ${gr.height}px`;
      p.style.backgroundPosition = `${gr.left - r.left}px ${gr.top - r.top}px`;
      p.style.backgroundRepeat = 'no-repeat';
      p.style.webkitBackgroundClip = 'text';
      p.style.backgroundClip = 'text';
      p.style.color = 'transparent';
    });
    g.classList.remove(key);
    g.style.background = 'none';
  });
}
const splitC = (el) => { const s = SplitText.create(el, { type: 'words,chars', mask: 'chars', charsClass: 'c', wordsClass: 'w' }); fixGrad(el); return s; };
const splitW = (el) => SplitText.create(el, { type: 'words', wordsClass: 'w' });

function fitWords(els, max) {
  // reduz o corpo até a palavra mais larga caber em `max`
  const probe = document.createElement('span');
  probe.className = 'display';
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0';
  document.body.appendChild(probe);
  let fs = Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  const words = els.flatMap((e) => e.textContent.trim().split(/\s+/));
  const widest = () => Math.max(...words.map((w) => { probe.textContent = w; return probe.getBoundingClientRect().width; }));
  probe.style.fontSize = fs + 'px';
  while (widest() > max && fs > 16) { fs -= 1; probe.style.fontSize = fs + 'px'; }
  els.forEach((e) => (e.style.fontSize = fs + 'px'));
  probe.remove();
}
function fitLine(el, max) {
  let fs = parseFloat(getComputedStyle(el).fontSize);
  el.style.whiteSpace = 'nowrap';
  el.style.display = 'inline-block';
  while (el.getBoundingClientRect().width > max && fs > 16) { fs -= 1; el.style.fontSize = fs + 'px'; }
  el.style.display = '';
}

// ---------- grão anti-banding (imperceptível) ----------
const grainEl = $('#grain');
{
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); const img = x.createImageData(256, 256);
  let seed = 1234567; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < img.data.length; i += 4) { const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0); grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
}

// ---------- build ----------
async function build() {
  await Promise.all(['800 100px "Bricolage Grotesque"', '600 100px "Bricolage Grotesque"', '800 100px Montserrat', '600 100px Montserrat', 'italic 400 100px "Instrument Serif"',
    '500 100px Manrope', '600 100px Manrope', '700 100px Manrope', '800 100px Manrope', '700 100px "JetBrains Mono"']
    .map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  // logo: imagens decodificadas antes do primeiro quadro
  const mask = new Image(); mask.src = 'assets/logo/ws-mask.png';
  await Promise.all([mask, ...document.images].map((im) => im.decode().catch(() => {})));

  CustomEase.create('cine', 'M0,0 C0.7,0 0.15,1 1,1');

  // ajustes de corpo antes do split
  fitWords($$('#track h3'), 330);
  $$('.fcard .name').forEach((e) => fitLine(e, 456));

  // ----- todos os splits primeiro (antes de qualquer transform) -----
  const S = {
    l1: splitC($('#s1-l1')), l2: splitC($('#s1-l2')), k1: splitC($('#s1-kick')),
    rot: ['#s1-r1', '#s1-r2', '#s1-r3'].map((s) => splitC($(s))),
    wm: splitC($('#wordmark')), tag: splitW($('#tagline')),
    cards: $$('#track h3').map(splitC),
    k3: splitC($('#s3-kick')), b3: splitC($('#s3-big')),
    k4: splitC($('#s4-kick')), p4: $$('#s4-panels h3').map(splitC),
    sem: splitC($('#s4-sem')), stack: $$('#s4-stack .s4w').map(splitC), k42: splitC($('#s4-kick2')), f4: splitC($('#s4-final')),
    h5: splitC($('#s5-head')), mono5: $$('.fcard .mono').map(splitC), name5: $$('.fcard .name').map(splitC),
    k6: splitC($('#s6-kick')), l6: splitC($('#s6-line')), nm: splitC($('#s6-name')), for6: splitC($('#s6-for')),
    h7: splitC($('#s7-head')), mono7: $$('.ptile .mono').map(splitC), t7: splitC($('#s7-text')), p7: $$('.pillar h4').map(splitC),
    h8: splitC($('#s8-head')), ask: splitC($('#s8-ask')), fw: splitC($('#fword')), ft: splitC($('#ftag')),
  };

  const tl = gsap.timeline({ paused: true });
  const vis = (sel, t) => tl.set(sel, { autoAlpha: 1 }, t);
  const unvis = (sel, t) => tl.set(sel, { autoAlpha: 0 }, t);
  const inChars = (chars, t, o = {}) => tl.fromTo(chars,
    { yPercent: 145, rotationX: o.rx ?? 0, transformPerspective: 700, transformOrigin: '50% 100%' },
    { yPercent: 0, rotationX: 0, duration: o.d ?? 1.0, ease: o.ease ?? 'expo.out', stagger: o.st ?? 0.028 }, t);
  const outChars = (chars, t, o = {}) => tl.to(chars,
    { yPercent: -135, rotationX: o.rx ?? 0, opacity: 0, duration: o.d ?? 0.5, ease: o.ease ?? 'power3.in', stagger: o.st ?? 0.012 }, t);
  // revela cada palavra no instante em que é falada
  const syncWords = (split, start, o = {}, offs = null) => split.words.forEach((w, i) =>
    inChars($$('.c', w), WORDS[start + (offs ? offs[i] : i)].s - (o.lead ?? 0.07), o));
  const tw = (sel, from, to, t) => tl.fromTo(sel, from, to, t);

  // ---------- figuras 3D ----------
  // entrada: sai do desfoque, cresce e gira até o lugar; saída: avança e desfoca
  const figIn = (id, t, o = {}) => {
    tl.set(id, { autoAlpha: 1 }, t);
    tl.fromTo(id, { scale: o.s0 ?? 0.62, x: o.x0 ?? 0, y: o.y0 ?? 70, rotation: o.r0 ?? -9, filter: 'blur(22px)', opacity: 0 },
      { scale: 1, x: 0, y: 0, rotation: 0, filter: 'blur(0px)', opacity: 1, duration: o.d ?? 1.1, ease: 'expo.out' }, t);
    tl.fromTo(id + ' .fglow', { scale: 0.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out' }, t);
  };
  const figFloat = (id, t, dur) => tl.fromTo(id + ' img', { y: -12, rotation: -1.6 },
    { y: 12, rotation: 1.6, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: Math.max(1, Math.ceil(dur / 1.9)) }, t);
  const figOut = (id, t, o = {}) => {
    const d = o.d ?? 0.45;
    tl.to(id, { scale: o.s1 ?? 1.25, x: o.x1 ?? 0, y: o.y1 ?? -60, rotation: o.r1 ?? 8, filter: 'blur(20px)', opacity: 0, duration: d, ease: 'power3.in' }, t);
    tl.set(id, { autoAlpha: 0 }, t + d);
  };
  // capa 3D dentro de um card/painel
  const coverIn = (card, t, el = card.querySelector('.cover')) => {
    tw(el.querySelector('img'), { scale: 0.55, y: 50, rotation: -8, filter: 'blur(16px)', opacity: 0 },
      { scale: 1, y: 0, rotation: 0, filter: 'blur(0px)', opacity: 1, duration: 1.3, ease: 'expo.out' }, t);
    tw(el.querySelector('.cglow'), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5, ease: 'expo.out' }, t);
    tl.fromTo(el, { y: -7 }, { y: 7, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: 7 }, t + 0.6);
  };

  // ---------- ambiente ----------
  tl.fromTo('#bg', { opacity: 0 }, { opacity: 1, duration: 3, ease: 'power2.out' }, 0);
  tl.to('.b1', { x: 260, y: 140, duration: 15, ease: 'sine.inOut', yoyo: true, repeat: 6 }, 0);
  tl.to('.b2', { x: -240, y: -120, duration: 17, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0);
  tl.to('.b3', { x: -300, y: -200, duration: 13, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 0);
  tl.to('.w1', { x: 200, y: 160, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: 6 }, 0);
  tl.to('.w2', { x: -220, y: -140, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0);
  tl.fromTo('#stage', { scale: 1 }, { scale: 1.025, duration: TOTAL, ease: 'none' }, 0);

  // HUD
  const secs = $$('#hud-bl .sec');
  gsap.set(secs, { yPercent: 170 });
  const sec = (i, t) => {
    if (i > 0) tl.to(secs[i - 1], { yPercent: -170, duration: 0.5, ease: 'power3.inOut' }, t);
    tl.fromTo(secs[i], { yPercent: 170 }, { yPercent: 0, duration: 0.65, ease: 'power3.out' }, t + 0.12);
  };

  // ================= S1 — gancho =================
  vis('#s1', 0);
  const i0 = idx('toda');
  S.l1.words.forEach((w, i) => inChars($$('.c', w), WORDS[i0 + i].s - 0.06, { st: 0.03, d: 1.1 }));
  S.l2.words.forEach((w, i) => inChars($$('.c', w), WORDS[i0 + 3 + i].s - 0.06, { st: 0.03, d: 1.1 }));
  outChars(S.l1.chars, T('mas') - 0.16, { st: 0.008, d: 0.5 });
  outChars(S.l2.chars, T('mas') - 0.1, { st: 0.008, d: 0.5 });
  inChars(S.k1.chars, T('transformar') - 0.25, { st: 0.012, d: 0.8 });
  const rc = [T('presenca'), T('estrategia', 1), T('resultado', 1)];
  S.rot.forEach((sp, i) => {
    inChars(sp.chars, rc[i] - 0.12, { rx: -85, st: 0.026, d: 0.95 });
    if (i < 2) outChars(sp.chars, rc[i + 1] - 0.3, { st: 0.01, d: 0.32, rx: 60 });
  });
  // hero reveal: o troféu avança para a câmera
  const tx = TE('resultado', 1) + 0.25;
  tl.to('#s1-kick', { autoAlpha: 0, duration: 0.4 }, tx - 0.2);
  tl.to('#s1-r3', { scale: 1.12, filter: 'blur(16px)', autoAlpha: 0, duration: 0.9, ease: 'power2.in', transformOrigin: '30% 50%' }, tx);
  tl.to('#flash', { opacity: 1, duration: 0.32, ease: 'power2.in' }, tx + 0.78);
  const t2 = tx + 1.1;
  unvis('#s1', t2);
  tl.to('#flash', { opacity: 0, duration: 1.2, ease: 'power2.out' }, t2);

  // ================= S2 — a marca =================
  vis('#s2', t2);
  // logo WS: o W entra pela diagonal esquerda, o S pela direita, e se encaixam
  tw('#logo-w', { x: -170, y: -90, autoAlpha: 0, clipPath: 'inset(0% 100% 0% 0%)' }, { x: 0, y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' }, t2 + 0.05);
  tw('#logo-s', { x: 170, y: 90, autoAlpha: 0, clipPath: 'inset(0% 0% 0% 100%)' }, { x: 0, y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' }, t2 + 0.3);
  tw('#logo', { scale: 0.86, transformOrigin: '50% 50%' }, { scale: 1, duration: 2.6, ease: 'expo.out' }, t2);
  tw('#logo-glow', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: 'expo.out' }, t2);
  tl.to('#logo-glow', { scale: 1.18, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1 }, T('nasceu') - 0.05);
  inChars(S.wm.chars.slice(0, 4), T('work', 1) - 0.12, { st: 0.05, d: 1.1, rx: -70 });
  inChars(S.wm.chars.slice(4), T('sold', 1) - 0.12, { st: 0.05, d: 1.1, rx: -70 });
  tw('#wordmark', { scale: 1.06, letterSpacing: '.12em' }, { scale: 1, letterSpacing: '-.01em', duration: 2.6, ease: 'expo.out' }, T('work', 1) - 0.15);
  tw('#tagline', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0, ease: 'expo.out' }, T('solucoes') - 0.35);
  const ti2 = idx('solucoes');
  S.tag.words.forEach((w, i) => tw(w, { opacity: 0.16 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, WORDS[ti2 + i].s - 0.05));
  const x2 = TE('longe') + 0.12;
  tl.to('#lockup', { y: -90, scale: 0.92, autoAlpha: 0, filter: 'blur(10px)', duration: 0.75, ease: 'power3.in' }, x2);
  unvis('#s2', x2 + 0.8);
  tw('#hud', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, x2 + 0.55);
  tw('#hud-logo', { x: -24 }, { x: 0, duration: 1.2, ease: 'expo.out' }, x2 + 0.55);
  sec(0, x2 + 0.6);

  // ================= S3 — serviços =================
  const t3 = x2 + 0.35;
  vis('#s3', t3);
  const cards = $$('#track .card');
  const svc = [T('sites'), T('landing'), T('portfolios'), T('videos')];
  const tc = T('todo') - 0.15; // convergência
  tw('#track', { x: 70 }, { x: -70, duration: tc - t3, ease: 'none' }, t3); // deriva horizontal lenta
  cards.forEach((c, i) => {
    const t = svc[i] - 0.38;
    tw(c, { clipPath: 'inset(100% 0% 0% 0% round 34px)', y: 90, rotationY: -16, transformOrigin: '50% 100%' },
      { clipPath: 'inset(0% 0% 0% 0% round 34px)', y: 0, rotationY: 0, duration: 1.2, ease: 'expo.out' }, t);
    inChars(S.cards[i].chars, svc[i] - 0.08, { st: 0.02, d: 0.9 });
    tw(c.querySelector('.num'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, t + 0.1);
    tw(c.querySelector('p'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' }, svc[i] + 0.15);
    coverIn(c, t + 0.12);
  });
  // convergência: todo o marketing digital em um só lugar
  cards.forEach((c, i) => {
    const dx = 960 - (100 - 70 + i * 440 + 200);
    tl.to(c, { x: dx, y: 155, scale: 0.2, rotation: (i - 1.5) * 12, autoAlpha: 0, duration: 0.9, ease: 'power3.in' }, tc + i * 0.04);
  });
  inChars(S.k3.chars, T('marketing', 1) - 0.15, { st: 0.01, d: 0.8 });
  syncWords(S.b3, idx('crescer') + 1, { st: 0.03, d: 1.0, rx: -60, lead: 0.08 });
  const x3 = T('aqui') - 0.35;
  outChars(S.k3.chars, x3, { st: 0.005, d: 0.4 });
  outChars(S.b3.chars, x3, { st: 0.012, d: 0.5 });
  unvis('#s3', x3 + 0.8);

  // ================= S4 — método =================
  const t4 = x3 + 0.3;
  vis('#s4', t4);
  sec(1, t4);
  inChars(S.k4.chars, T('cada') - 0.1, { st: 0.015, d: 0.8 });
  const panels = $$('#s4-panels .panel');
  const pc = [T('estrategia', 2), T('design'), T('tecnologia')];
  panels.forEach((p, i) => {
    const t = pc[i] - 0.5;
    tw(p, { clipPath: 'inset(100% 0% 0% 0% round 38px)', y: 60 }, { clipPath: 'inset(0% 0% 0% 0% round 38px)', y: 0, duration: 1.2, ease: 'expo.out' }, t);
    tw(p.querySelector('.in'), { y: 120, scale: 1.1 }, { y: 0, scale: 1, duration: 1.6, ease: 'expo.out' }, t);
    inChars(S.p4[i].chars, pc[i] - 0.08, { st: 0.03, d: 0.95 });
    tw(p.querySelector('.sub'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, t + 0.3);
    tw(p.querySelector('.pn'), { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 1.0, ease: 'expo.out' }, t + 0.2);
  });
  // figuras 3D dos painéis: alvo, design, chip
  $$('#s4-panels .pimg').forEach((el, i) => coverIn(el.parentElement, pc[i] - 0.25, el));
  // "Sem fórmulas prontas." -> se desfaz
  const x4a = T('sem') - 0.4;
  tl.to(panels, { y: -70, autoAlpha: 0, duration: 0.6, ease: 'power3.in', stagger: 0.06 }, x4a);
  outChars(S.k4.chars, x4a, { st: 0.005, d: 0.4 });
  syncWords(S.sem, idx('sem'), { st: 0.025, d: 0.9 });
  const xs = T('com', 4) - 0.32;
  tl.set(S.sem.masks, { overflow: 'visible' }, xs - 0.01);
  S.sem.chars.forEach((c, i) => tl.to(c, {
    x: (rnd(i) - 0.5) * 1500, y: (rnd(i + 50) - 0.5) * 950, rotation: (rnd(i + 99) - 0.5) * 240,
    scale: 0.4 + rnd(i + 7) * 0.8, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
  }, xs + rnd(i + 3) * 0.08));
  const sc = [T('proposito'), T('criatividade'), T('foco') - 0.3];
  S.stack.forEach((sp, i) => inChars(sp.chars, sc[i] - 0.08, { st: 0.025, d: 1.0, rx: -50 }));
  const x4b = T('realmente') - 0.45;
  S.stack.forEach((sp, i) => outChars(sp.chars, x4b + i * 0.05, { st: 0.006, d: 0.45 }));
  inChars(S.k42.chars, T('realmente') - 0.3, { st: 0.012, d: 0.8 });
  syncWords(S.f4, idx('crescimento') - 1, { st: 0.02, d: 0.9 });
  const x4 = T('por') - 0.42;
  outChars(S.f4.chars, x4, { st: 0.005, d: 0.42 });
  outChars(S.k42.chars, x4, { st: 0.005, d: 0.4 });
  unvis('#s4', x4 + 0.75);

  // ================= S5 — sócios =================
  const t5 = x4 + 0.12;
  vis('#s5', t5);
  sec(2, t5);
  syncWords(S.h5, idx('por'), { st: 0.02, d: 0.9, lead: 0.06 }, [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11]);
  tl.to('#s5-head', { y: -290, scale: 0.5, transformOrigin: '50% 0%', duration: 1.1, ease: 'power4.inOut' }, T('jeferson') - 0.65);
  const fc = [$('#fc1'), $('#fc2')];
  const fcT = [T('jeferson'), T('kaue')];
  fc.forEach((c, i) => {
    const t = fcT[i] - 0.35;
    tw(c, { clipPath: 'inset(100% 0% 0% 0% round 44px)', y: 80 }, { clipPath: 'inset(0% 0% 0% 0% round 44px)', y: 0, duration: 1.4, ease: 'expo.out' }, t);
    tw(c.querySelector('.fbg'), { scale: 1.35 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, t);
    inChars(S.mono5[i].chars, t + 0.15, { st: 0.08, d: 1.2, rx: -60 });
    inChars(S.name5[i].chars, fcT[i] - 0.05, { st: 0.025, d: 0.9 });
    tw(c.querySelector('.role'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, fcT[i] + 0.3);
    tw(c, { rotationY: i ? 7 : -7, rotationX: 4 }, { rotationY: i ? -5 : 5, rotationX: -3, duration: 4.0, ease: 'sine.inOut' }, t);
  });
  const x5 = T('agora') - 0.55;
  tl.to('#fc1', { x: -560, rotationY: -35, autoAlpha: 0, duration: 1.0, ease: 'power3.in' }, x5);
  tl.to('#fc2', { x: 560, rotationY: 35, autoAlpha: 0, duration: 1.0, ease: 'power3.in' }, x5);
  tl.to('#s5-head', { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, x5);
  unvis('#s5', x5 + 1.05);

  // ================= S6 — o convite =================
  const t6 = x5 + 0.2;
  vis('#s6', t6);
  sec(3, t6);
  tl.to(['.w1', '.w2'], { opacity: 1, duration: 2.2, ease: 'power2.inOut' }, t6);
  tl.to(['.b1', '.b2', '.b3'], { opacity: 0.25, duration: 2.2, ease: 'power2.inOut' }, t6);
  tl.to('#hud-br', { color: 'rgba(246,221,174,.9)', duration: 1.5 }, t6);
  inChars(S.k6.chars, T('agora') - 0.3, { st: 0.02, d: 0.8 });
  syncWords(S.l6, idx('chegou'), { st: 0.02, d: 0.9, lead: 0.06 });
  const x6a = T('kewin', 1) - 0.5;
  outChars(S.l6.chars, x6a, { st: 0.006, d: 0.42 });
  outChars(S.k6.chars, x6a, { st: 0.01, d: 0.4 });
  inChars(S.nm.chars, T('kewin', 1) - 0.12, { st: 0.045, d: 1.2, rx: -80 });
  tw('#s6-name', { letterSpacing: '.04em' }, { letterSpacing: '-.035em', duration: 2.2, ease: 'expo.out' }, T('kewin', 1) - 0.12);
  const tc6 = T('este') - 0.35;
  tl.to('#s6-name', { y: -170, scale: 0.55, autoAlpha: 0, filter: 'blur(8px)', duration: 0.9, ease: 'power3.in' }, tc6);
  tw('#invite', { y: 380, rotationX: 62, scale: 0.86, autoAlpha: 0, transformOrigin: '50% 100%' }, { y: 0, rotationX: 0, scale: 1, autoAlpha: 1, duration: 1.6, ease: 'expo.out' }, tc6 + 0.35);
  tw('#invite', { rotationY: -6 }, { rotationY: 5, duration: 5.0, ease: 'sine.inOut' }, tc6 + 0.35);
  tw(['#invite .top', '#invite .no', '#invite .k', '#invite .nm', '#invite .desc', '#invite .from'], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, tc6 + 0.75);
  inChars(S.for6.chars, T('convite', 1) - 0.2, { st: 0.012, d: 0.8 });
  tw('#invite .shine', { xPercent: -160, rotation: 8 }, { xPercent: 420, rotation: 8, duration: 1.8, ease: 'power2.inOut' }, tc6 + 1.4);
  const ts = T('socio') - 0.2;
  tw('#seal', { scale: 2.4, rotation: -50, autoAlpha: 0, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.75, ease: 'power4.out' }, ts);
  tl.to('#invite-wrap', { y: 7, duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.out' }, ts + 0.32);
  tw('#seal-text', { rotation: 0 }, { rotation: 120, svgOrigin: '100 100', duration: 6, ease: 'none' }, ts);
  tw('#invite .shine', { xPercent: -160 }, { xPercent: 420, duration: 1.6, ease: 'power2.inOut' }, ts + 0.4);
  const x6 = T('tres') - 0.45;
  tl.to('#invite', { y: -120, scale: 1.12, autoAlpha: 0, rotationX: -18, filter: 'blur(6px)', duration: 0.75, ease: 'power3.in' }, x6);
  outChars(S.for6.chars, x6, { st: 0.006, d: 0.4 });
  unvis('#s6', x6 + 0.8);

  // ================= S7 — três sócios =================
  const t7 = x6 + 0.2;
  vis('#s7', t7);
  sec(4, t7);
  tl.to(['.w1', '.w2'], { opacity: 0.6, duration: 2, ease: 'power2.inOut' }, t7);
  tl.to(['.b1', '.b2', '.b3'], { opacity: 0.8, duration: 2, ease: 'power2.inOut' }, t7);
  const ti7 = idx('tres');
  syncWords(S.h7, ti7, { st: 0.025, d: 0.9, lead: 0.06 });
  const pt = $$('#s7-tiles .ptile');
  const t3s = T('tres');
  pt.forEach((p, i) => {
    tw(p, { clipPath: 'inset(100% 0% 0% 0% round 38px)', y: 70 }, { clipPath: 'inset(0% 0% 0% 0% round 38px)', y: 0, duration: 1.2, ease: 'expo.out' }, t3s - 0.1 + i * 0.16);
    inChars(S.mono7[i].chars, t3s + 0.05 + i * 0.16, { st: 0.07, d: 1.1, rx: -50 });
    tw(p.querySelector('.name'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, t3s + 0.35 + i * 0.16);
  });
  tw('#s7-tiles .tag', { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, t3s + 0.9);
  const uv = WORDS[ti7 + 2].s; // "Uma só visão"
  pt.forEach((p, i) => {
    const dx = 960 - (342 + i * 428 + 190);
    tl.to(p, { x: dx, y: -20, scale: 0.32, autoAlpha: 0, rotation: (i - 1) * 8, duration: 1.0, ease: 'power3.inOut' }, uv + 0.15);
  });
  outChars(S.h7.chars, T('juntos') - 0.4, { st: 0.006, d: 0.42 });
  syncWords(S.t7, idx('juntos'), { st: 0.018, d: 0.9, lead: 0.06 });
  const pl = $$('#s7-pillars .pillar');
  const pc7 = [T('atendendo'), T('criando'), T('construindo')];
  pl.forEach((p, i) => {
    tw(p, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1.0, ease: 'expo.out' }, pc7[i] - 0.2);
    tw(p.querySelector('.dot'), { scale: 0 }, { scale: 1, duration: 0.7, ease: 'back.out(3)' }, pc7[i] - 0.05);
    inChars(S.p7[i].chars, pc7[i] - 0.1, { st: 0.012, d: 0.8 });
  });
  tl.to($$('#s7-pillars .dot'), { scale: 1.6, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out', stagger: 0.08 }, T('entrega', 2) - 0.1);
  const x7 = T('kewin', 2) - 0.5;
  tl.to(['#s7-text', '#s7-pillars'], { y: -50, autoAlpha: 0, filter: 'blur(8px)', duration: 0.6, ease: 'power3.in', stagger: 0.06 }, x7);
  unvis('#s7', x7 + 0.75);

  // ================= S8 — seu lugar + assinatura =================
  const t8 = x7 + 0.3;
  vis('#s8', t8);
  sec(5, t8);
  tl.to(['.w1', '.w2'], { opacity: 0.95, duration: 2, ease: 'power2.inOut' }, t8);
  tl.to(['.b1', '.b2', '.b3'], { opacity: 0.45, duration: 2, ease: 'power2.inOut' }, t8);
  syncWords(S.h8, idx('kewin', 2), { st: 0.022, d: 0.9, lead: 0.06 });
  const sl = $$('#s8-slots .slot');
  const ls = T('lugar', 2);
  sl.forEach((s, i) => tw(s, { autoAlpha: 0, y: 80, rotationX: -40, transformPerspective: 1200, transformOrigin: '50% 100%' }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.1, ease: 'expo.out' }, ls - 0.2 + i * 0.14));
  const tr8 = T('reservado');
  tl.to('#s8 .slot.me .aura', { opacity: 1, duration: 0.9, ease: 'power2.out' }, tr8 - 0.1);
  tl.to('#s8 .slot.me', { scale: 1.06, duration: 0.9, ease: 'expo.out' }, tr8 - 0.1);
  tw('#s8 .slot .pill', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' }, tr8 + 0.1);
  tl.to('#s8 .slot .pill i', { opacity: 0.25, duration: 0.45, yoyo: true, repeat: 3, ease: 'sine.inOut' }, tr8 + 0.4);
  const x8a = T('aceita') - 0.45;
  outChars(S.h8.chars, x8a, { st: 0.006, d: 0.42 });
  tl.to(sl, { y: 60, autoAlpha: 0, filter: 'blur(6px)', duration: 0.55, ease: 'power3.in', stagger: 0.05 }, x8a);
  syncWords(S.ask, idx('aceita'), { st: 0.035, d: 1.1, rx: -60, lead: 0.08 });
  tw('#s8-ask', { scale: 1 }, { scale: 1.06, duration: 2.4, ease: 'sine.inOut' }, T('aceita') - 0.1);
  // assinatura
  const xf = T('work', 4) - 0.6;
  tl.to('#s8-ask', { autoAlpha: 0, filter: 'blur(14px)', scale: 1.12, duration: 0.6, ease: 'power3.in' }, xf);
  tl.to('#hud', { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, xf);
  tl.to(['.w1', '.w2'], { opacity: 0.55, duration: 2 }, xf);
  tl.to(['.b1', '.b2', '.b3'], { opacity: 0.9, duration: 2 }, xf);
  const tf = xf + 0.45;
  tw('#flogo-w', { x: -150, y: -80, autoAlpha: 0, clipPath: 'inset(0% 100% 0% 0%)' }, { x: 0, y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' }, tf);
  tw('#flogo-s', { x: 150, y: 80, autoAlpha: 0, clipPath: 'inset(0% 0% 0% 100%)' }, { x: 0, y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' }, tf + 0.2);
  tw('#flogo', { scale: 0.86, transformOrigin: '50% 50%' }, { scale: 1, duration: 2.4, ease: 'expo.out' }, tf);
  tw('#flogo-glow', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: 'expo.out' }, tf);
  inChars(S.fw.chars.slice(0, 4), T('work', 4) - 0.1, { st: 0.05, d: 1.1, rx: -70 });
  inChars(S.fw.chars.slice(4), T('sold', 4) - 0.1, { st: 0.05, d: 1.1, rx: -70 });
  tw('#fword', { letterSpacing: '.12em' }, { letterSpacing: '-.01em', duration: 2.6, ease: 'expo.out' }, T('work', 4) - 0.12);
  syncWords(S.ft, idx('vamos', 2), { st: 0.02, d: 0.9, lead: 0.06 });
  tw('#fnames', { autoAlpha: 0, y: 16, letterSpacing: '.5em' }, { autoAlpha: 1, y: 0, letterSpacing: '.32em', duration: 1.6, ease: 'expo.out' }, TE('juntos', 2) + 0.05);
  tw('#fserv', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, TE('juntos', 2) + 0.45);

  // ================= figuras 3D por frase =================
  // S1 — ideia → cérebro, presença → globo, estratégia → xadrez, resultado → troféu
  figIn('#f-brain', T('ideia') - 0.2);
  figFloat('#f-brain', T('ideia'), rc[0] - T('ideia'));
  figOut('#f-brain', rc[0] - 0.32);
  [['#f-globe', 0], ['#f-knight', 1], ['#f-trophy', 2]].forEach(([id, i]) => {
    figIn(id, rc[i] - 0.14, { d: 0.9 });
    figFloat(id, rc[i], 1.2);
    if (i < 2) figOut(id, rc[i + 1] - 0.32);
  });
  // hero reveal: o troféu avança para a câmera e a luz explode
  tl.to('#f-trophy', { x: 960 - 1570, y: 20, scale: 2.9, filter: 'blur(26px)', opacity: 0, duration: 1.05, ease: 'expo.in' }, tx);
  tl.set('#f-trophy', { autoAlpha: 0 }, t2);
  // S3 — "crescer": o foguete sobe de onde os cards convergem e decola na saída
  figIn('#f-rocket', tc + 0.55, { y0: 240, s0: 0.7, r0: 0, d: 1.3 });
  figFloat('#f-rocket', tc + 1.4, x3 - tc - 1.4);
  tl.to('#f-rocket', { x: 260, y: -1150, scale: 0.75, opacity: 0, duration: 0.95, ease: 'power3.in' }, x3 - 0.15);
  tl.set('#f-rocket', { autoAlpha: 0 }, x3 + 0.85);
  // S4 — "confia na gente": aperto de mão
  figIn('#f-handshake', T('confia') - 0.35, { y0: 120 });
  figFloat('#f-handshake', T('confia') + 0.5, x4 - T('confia'));
  figOut('#f-handshake', x4, { y1: 40 });
  // S6 — "próximo passo": escada dourada
  figIn('#f-stairs', T('proximo') - 0.4, { x0: 120, y0: 40, r0: 6 });
  figFloat('#f-stairs', T('proximo') + 0.4, x6a - T('proximo'));
  figOut('#f-stairs', x6a - 0.05, { x1: 160, y1: -120 });
  // S7 — "uma só visão": três anéis entrelaçados; "liderar e gerenciar… marketing": megafone
  figIn('#f-rings', uv + 0.6, { s0: 0.4, r0: -20, y0: 0, d: 1.3 });
  figFloat('#f-rings', uv + 1.4, T('juntos') - uv - 1.4);
  figOut('#f-rings', T('juntos') - 0.35, { x1: 420, y1: -160, s1: 0.7 });
  figIn('#f-megaphone', T('juntos') - 0.05, { x0: 160, y0: 0, r0: 10 });
  figFloat('#f-megaphone', T('juntos') + 0.8, x7 - T('juntos'));
  figOut('#f-megaphone', x7, { x1: 120 });
  // S8 — "aceita o convite?": envelope com lacre dourado
  figIn('#f-envelope', T('aceita') + 0.15, { y0: 160, r0: 10, d: 1.2 });
  figFloat('#f-envelope', T('aceita') + 0.9, xf - T('aceita'));
  figOut('#f-envelope', xf, { y1: 80, s1: 1.1 });

  tl.to('#fade', { opacity: 1, duration: 1.2, ease: 'power2.in' }, TOTAL - 1.25);
  tl.set({}, {}, TOTAL);

  window.__tl = tl;
  window.__seek = (t) => {
    tl.time(Math.min(t, TOTAL), false);
    const f = Math.round(t * 60);
    grainEl.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  };
  window.__duration = TOTAL;
  window.__advance = (t) => tl.time(Math.min(t, TOTAL), false); // só a timeline (aquecimento)
  window.__seek(0);

  // pré-visualização no navegador: index.html?play
  if (location.search.includes('play')) {
    const audio = new Audio('audio/narracao-90s.wav');
    const start = () => { audio.play(); document.removeEventListener('click', start); };
    document.addEventListener('click', start);
    gsap.ticker.add(() => window.__seek(audio.currentTime));
  }
  window.__ready = true;
}

build().catch((e) => { window.__errors.push(String(e.stack || e)); window.__ready = true; });
