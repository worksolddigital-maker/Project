// WorkSuite — Convite de sociedade
// Uma única timeline GSAP (pausada) controla tudo; o render faz seek quadro a quadro.
import * as THREE from './node_modules/three/build/three.module.js';

gsap.registerPlugin(SplitText, MorphSVGPlugin, DrawSVGPlugin, CustomEase);
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

// ---------- orbe 3D ----------
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
const VERT = /* glsl */`
uniform float uTime; uniform float uAmp; uniform float uFreq;
varying vec3 vN; varying vec3 vV; varying float vD;
${NOISE}
float disp(vec3 p){
  return (snoise(p*uFreq+vec3(0.,uTime*.2,uTime*.12))*.86 + snoise(p*uFreq*1.75-vec3(uTime*.15))*.14)*uAmp;
}
void main(){
  vec3 n=normalize(position);
  vec3 t=normalize(abs(n.y)>.99?cross(n,vec3(1.,0.,0.)):cross(n,vec3(0.,1.,0.)));
  vec3 b=normalize(cross(n,t));
  float e=.012;
  float d0=disp(n);
  vec3 p0=n*(1.+d0);
  vec3 n1=normalize(n+t*e); vec3 p1=n1*(1.+disp(n1));
  vec3 n2=normalize(n+b*e); vec3 p2=n2*(1.+disp(n2));
  vec3 nn=normalize(cross(p1-p0,p2-p0)); if(dot(nn,n)<0.) nn=-nn;
  vD=d0;
  vec4 mv=modelViewMatrix*vec4(p0,1.);
  vV=-mv.xyz; vN=normalize(normalMatrix*nn);
  gl_Position=projectionMatrix*mv;
}`;
const FRAG = /* glsl */`
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime;
varying vec3 vN; varying vec3 vV; varying float vD;
void main(){
  vec3 n=normalize(vN); vec3 v=normalize(vV);
  float ndv=clamp(dot(n,v),0.,1.);
  float fres=pow(1.-ndv,2.4);
  float band=.5+.5*sin(vD*9.+n.y*2.6+n.x*1.4+uTime*.35);
  vec3 base=mix(uA,uB,smoothstep(.12,.95,band));
  base=mix(base,uC,smoothstep(.55,1.,.5+.5*n.x)*.55);
  vec3 L1=normalize(vec3(-.5,.8,.7)); vec3 L2=normalize(vec3(.8,-.35,.45));
  float d1=max(dot(n,L1),0.); float d2=max(dot(n,L2),0.);
  float s1=pow(max(dot(n,normalize(L1+v)),0.),48.);
  vec3 col=base*(.08+.78*d1+.26*d2);
  col+=s1*.8;
  col+=fres*mix(uB,vec3(1.),.25)*.95;
  col=col/(1.+col*.32);
  gl_FragColor=vec4(col,1.);
}`;

const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.setClearColor(0x000000, 0);
const scene3 = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
camera.position.z = 6;
const U = 1080 / (2 * 6 * Math.tan(THREE.MathUtils.degToRad(17.5))); // px por unidade no plano z=0
const uniforms = {
  uTime: { value: 0 }, uAmp: { value: 0.2 }, uFreq: { value: 0.82 },
  uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uC: { value: new THREE.Vector3() },
};
const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 220, 160), new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG }));
scene3.add(mesh);
const COOL = [[0.27, 0.16, 0.92], [0.27, 0.83, 1.0], [1.0, 0.37, 0.64]];
const WARM = [[0.78, 0.22, 0.2], [1.0, 0.8, 0.5], [1.0, 0.45, 0.58]];
const orb = { x: 2.15, y: -0.05, s: 0, amp: 0.2, warm: 0, op: 1, glow: 1 };
const haloC = $('#halo-c'), haloW = $('#halo-w');
function renderGL(t) {
  uniforms.uTime.value = t;
  uniforms.uAmp.value = orb.amp * 0.78;
  ['uA', 'uB', 'uC'].forEach((k, i) => uniforms[k].value.set(
    ...COOL[i].map((c, j) => c + (WARM[i][j] - c) * orb.warm)));
  mesh.position.set(orb.x, orb.y, 0);
  mesh.scale.setScalar(Math.max(orb.s, 1e-4));
  mesh.rotation.set(Math.sin(t * 0.25) * 0.25, t * 0.18, 0);
  mesh.visible = orb.s > 0.003;
  canvas.style.opacity = orb.op;
  const px = 960 + orb.x * U, py = 540 - orb.y * U;
  const size = Math.max(orb.s, 0) * U * 3.4 * (1 + orb.amp * 0.5);
  [[haloC, 1 - orb.warm], [haloW, orb.warm]].forEach(([el, a]) => {
    el.style.width = el.style.height = size + 'px';
    el.style.transform = `translate(${px - size / 2}px, ${py - size / 2}px)`;
    el.style.opacity = orb.op * orb.glow * a;
  });
  renderer.render(scene3, camera);
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
  await Promise.all(['800 100px "Bricolage Grotesque"', '600 100px "Bricolage Grotesque"', '800 100px Syne', '500 100px Syne', '700 100px Syne', 'italic 400 100px "Instrument Serif"',
    '500 100px Manrope', '600 100px Manrope', '700 100px Manrope', '800 100px Manrope', '700 100px "JetBrains Mono"']
    .map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  CustomEase.create('cine', 'M0,0 C0.7,0 0.15,1 1,1');

  // ajustes de corpo antes do split
  fitWords($$('#track h3'), 455);
  $$('.fcard .name').forEach((e) => fitLine(e, 456));

  // ----- todos os splits primeiro (antes de qualquer transform) -----
  const S = {
    l1: splitC($('#s1-l1')), l2: splitC($('#s1-l2')), k1: splitC($('#s1-kick')),
    rot: ['#s1-r1', '#s1-r2', '#s1-r3'].map((s) => splitC($(s))),
    wm: splitC($('#wordmark')), tag: splitW($('#tagline')),
    cards: $$('#track h3').map(splitC), tiles: $$('#s3-row h4').map(splitC),
    k3: splitC($('#s3-kick')), b3: splitC($('#s3-big')),
    k4: splitC($('#s4-kick')), p4: $$('#s4-panels h3').map(splitC), code: splitC($('#s4 .g3')),
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
  // stroke com linecap redondo: esconde a "pontinha" antes de começar a desenhar
  const draw = (sel, t, o = {}) => {
    tl.fromTo(sel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, t);
    return tl.fromTo(sel, { drawSVG: o.from ?? '0%' }, { drawSVG: o.to ?? '100%', duration: o.d ?? 1, ease: o.ease ?? 'power2.inOut', stagger: o.st ?? 0 }, t);
  };

  // ---------- ambiente ----------
  gsap.set(orb, { x: 2.15, y: -0.05, s: 0, amp: 0.2, warm: 0, op: 1, glow: 1 });
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
  tl.to(orb, { s: 0.16, duration: 2.6, ease: 'power2.out' }, 0.5);
  const i0 = idx('toda');
  S.l1.words.forEach((w, i) => inChars($$('.c', w), WORDS[i0 + i].s - 0.06, { st: 0.03, d: 1.1 }));
  S.l2.words.forEach((w, i) => inChars($$('.c', w), WORDS[i0 + 3 + i].s - 0.06, { st: 0.03, d: 1.1 }));
  tl.to(orb, { s: 0.55, amp: 0.26, duration: 1.6, ease: 'expo.out' }, T('ideia') - 0.12);
  outChars(S.l1.chars, T('mas') - 0.16, { st: 0.008, d: 0.5 });
  outChars(S.l2.chars, T('mas') - 0.1, { st: 0.008, d: 0.5 });
  inChars(S.k1.chars, T('transformar') - 0.25, { st: 0.012, d: 0.8 });
  const rc = [T('presenca'), T('estrategia', 1), T('resultado', 1)];
  S.rot.forEach((sp, i) => {
    inChars(sp.chars, rc[i] - 0.12, { rx: -85, st: 0.026, d: 0.95 });
    if (i < 2) outChars(sp.chars, rc[i + 1] - 0.3, { st: 0.01, d: 0.32, rx: 60 });
  });
  tl.to(orb, { s: 0.75, y: 0.12, duration: 1.2, ease: 'expo.out' }, rc[0] - 0.1);
  tl.to(orb, { s: 0.95, y: -0.05, x: 2.25, duration: 1.2, ease: 'expo.out' }, rc[1] - 0.1);
  tl.to(orb, { s: 1.15, amp: 0.3, duration: 1.2, ease: 'expo.out' }, rc[2] - 0.1);
  // hero reveal: o orbe engole a tela
  const tx = TE('resultado', 1) + 0.25;
  tl.to('#s1-kick', { autoAlpha: 0, duration: 0.4 }, tx - 0.2);
  tl.to('#s1-r3', { scale: 1.12, filter: 'blur(16px)', autoAlpha: 0, duration: 0.9, ease: 'power2.in', transformOrigin: '30% 50%' }, tx);
  tl.to(orb, { x: 0, y: 0, s: 5.6, amp: 0.5, duration: 1.05, ease: 'expo.in' }, tx);
  tl.to('#flash', { opacity: 1, duration: 0.32, ease: 'power2.in' }, tx + 0.78);
  const t2 = tx + 1.1;
  tl.set(orb, { s: 0, x: 0, y: (540 - 340) / U, amp: 0.22 }, t2);
  unvis('#s1', t2);
  tl.to('#flash', { opacity: 0, duration: 1.2, ease: 'power2.out' }, t2);

  // ================= S2 — a marca =================
  vis('#s2', t2);
  tw('#mark', { scale: 0, rotation: -60, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 1.5, ease: 'expo.out' }, t2);
  tl.to('#mark-shape', { morphSVG: 'M60 8 H140 C168.7 8 192 31.3 192 60 V140 C192 168.7 168.7 192 140 192 H60 C31.3 192 8 168.7 8 140 V60 C8 31.3 31.3 8 60 8 Z', duration: 1.0, ease: 'power3.inOut' }, t2 + 0.45);
  draw('#mark-w', T('nasceu') - 0.1, { d: 0.95 });
  tl.to(orb, { s: 0.6, amp: 0.16, duration: 1.6, ease: 'expo.out' }, t2 + 0.05);
  inChars(S.wm.chars.slice(0, 4), T('work', 1) - 0.12, { st: 0.05, d: 1.1, rx: -70 });
  inChars(S.wm.chars.slice(4), T('suite', 1) - 0.12, { st: 0.05, d: 1.1, rx: -70 });
  tw('#wordmark', { scale: 1.08, letterSpacing: '.02em' }, { scale: 1, letterSpacing: '-.045em', duration: 2.6, ease: 'expo.out' }, T('work', 1) - 0.15);
  tw('#tagline', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0, ease: 'expo.out' }, T('uma', 2) - 0.35);
  const ti2 = idx('uma', 2);
  S.tag.words.forEach((w, i) => tw(w, { opacity: 0.16 }, { opacity: 1, duration: 0.35, ease: 'power2.out' }, WORDS[ti2 + i].s - 0.05));
  const x2 = TE('digital') + 0.12;
  tl.to('#lockup', { y: -90, scale: 0.92, autoAlpha: 0, filter: 'blur(10px)', duration: 0.75, ease: 'power3.in' }, x2);
  tl.to(orb, { x: 0, y: -3.95, s: 2.4, amp: 0.3, duration: 1.4, ease: 'expo.inOut' }, x2);
  unvis('#s2', x2 + 0.8);
  tw('#hud', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, x2 + 0.55);
  tw('#hud-logo', { x: -24 }, { x: 0, duration: 1.2, ease: 'expo.out' }, x2 + 0.55);
  sec(0, x2 + 0.6);

  // ================= S3 — serviços =================
  const t3 = x2 + 0.35;
  vis('#s3', t3);
  const cards = $$('#track .card');
  const cx = (i) => 440 - i * 1100;
  gsap.set('#track', { x: 1960 });
  cards.forEach((c, i) => gsap.set(c, { scale: i ? 0.9 : 1, opacity: i ? 0.35 : 1, rotationY: i ? -10 : 0, transformOrigin: '50% 50%' }));
  tl.to('#track', { x: cx(0), duration: 1.35, ease: 'expo.out' }, t3);
  const cardIn = (i, t) => {
    const c = cards[i];
    inChars(S.cards[i].chars, t, { st: 0.022, d: 1.0 });
    tw(c.querySelector('.num'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, t - 0.1);
    tw(c.querySelector('p'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.0, ease: 'expo.out' }, t + 0.25);
    tw(c.querySelector('.viz'), { x: 140 }, { x: 0, duration: 1.7, ease: 'expo.out' }, t - 0.35);
  };
  const moveTo = (i, t) => {
    tl.to('#track', { x: cx(i), duration: 1.05, ease: 'power4.inOut' }, t);
    cards.forEach((c, j) => tl.to(c, { scale: j === i ? 1 : 0.9, opacity: j === i ? 1 : 0.35, rotationY: j < i ? 10 : j > i ? -10 : 0, duration: 1.05, ease: 'power4.inOut' }, t));
  };
  // 01 marketing
  const m0 = T('marketing', 1);
  cardIn(0, m0 - 0.15);
  tw($$('#card1 .bars rect'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, m0);
  draw('#card1 .curve', m0 + 0.3, { d: 1.3 });
  tw('#card1 .cdot', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.6, ease: 'back.out(2.2)' }, m0 + 1.45);
  tw($$('#card1 .chip'), { autoAlpha: 0, y: 20, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', stagger: 0.14 }, T('estrategico') + 0.1);
  // 02 sites
  const b0 = T('desenvolvimento');
  moveTo(1, b0 - 0.45);
  cardIn(1, b0 - 0.05);
  tw('#card2 .browser', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0, ease: 'expo.out' }, b0 - 0.1);
  tw('#card2 .bhero', { clipPath: 'inset(0% 100% 0% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.9, ease: 'expo.inOut' }, b0 + 0.2);
  tw(['#card2 .bh1', '#card2 .bh2', '#card2 .bbtn'], { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08 }, b0 + 0.7);
  tw($$('#card2 .bcell'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, b0 + 0.55);
  tw('#card2 .cursor', { x: 60, y: 60, autoAlpha: 0 }, { x: -252, y: -96, autoAlpha: 1, duration: 1.0, ease: 'power3.inOut' }, b0 + 0.9);
  tl.to('#card2 .bbtn', { x: 5, y: 4, duration: 0.4, ease: 'power2.out' }, b0 + 1.55); // magnético
  tl.to(['#card2 .bbtn', '#card2 .cursor'], { scale: 0.88, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, b0 + 1.95);
  tl.to('#card2 .bhero', { filter: 'brightness(1.25) saturate(1.15)', duration: 0.25, yoyo: true, repeat: 1 }, b0 + 2.0);
  // 03 portfólios
  const p0 = T('portfolios');
  moveTo(2, p0 - 0.45);
  cardIn(2, p0 - 0.05);
  tw($$('#card3 .tile'), { clipPath: 'inset(100% 0% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.1, ease: 'expo.inOut', stagger: 0.08 }, p0);
  tw($$('#card3 .tile i'), { scale: 1.4 }, { scale: 1, duration: 1.8, ease: 'expo.out', stagger: 0.08 }, p0 + 0.1);
  // saída do trilho + 4 serviços
  const tr = T('identidade') - 0.5;
  tl.to('#track', { x: cx(2) - 1400, duration: 0.9, ease: 'power3.in' }, tr);
  tl.to(cards, { opacity: 0, duration: 0.7, ease: 'power2.in' }, tr + 0.2);
  const st = $$('#s3-row .stile');
  const stc = [T('identidade'), T('redes'), T('trafego'), T('criacao')];
  st.forEach((el, i) => {
    tw(el, { autoAlpha: 0, y: 90, rotationX: -55, transformOrigin: '50% 100%', transformPerspective: 1400 }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.1, ease: 'expo.out' }, stc[i] - 0.25);
    draw($$('svg > *', el), stc[i] - 0.05, { d: 1.0, st: 0.1 });
    inChars(S.tiles[i].chars, stc[i] - 0.1, { st: 0.018, d: 0.9 });
  });
  // convergência: tudo em um só lugar
  const tc = T('tudo') - 0.1;
  st.forEach((el, i) => {
    const dx = 960 - (152 + i * 412 + 190), dy = 540 - (300 + 220);
    tl.to(el, { x: dx, y: dy, scale: 0.18, rotation: (i - 1.5) * 14, autoAlpha: 0, duration: 0.9, ease: 'power3.in' }, tc + i * 0.05);
  });
  tl.to(orb, { x: 0, y: -0.15, s: 0.45, amp: 0.28, duration: 0.95, ease: 'power3.inOut' }, tc);
  tl.to(orb, { s: 1.15, amp: 0.42, duration: 1.2, ease: 'expo.out' }, tc + 0.9);
  inChars(S.k3.chars, T('tudo') - 0.05, { st: 0.01, d: 0.8 });
  syncWords(S.b3, idx('crescer') + 1, { st: 0.03, d: 1.0, rx: -60, lead: 0.08 });
  tl.to(orb, { y: -1.3, s: 1.3, amp: 0.3, duration: 1.4, ease: 'power3.inOut' }, T('lugar') - 0.9);
  const x3 = T('aqui') - 0.35;
  outChars(S.k3.chars, x3, { st: 0.005, d: 0.4 });
  outChars(S.b3.chars, x3, { st: 0.012, d: 0.5 });
  unvis('#s3', x3 + 0.8);

  // ================= S4 — método =================
  const t4 = x3 + 0.3;
  vis('#s4', t4);
  sec(1, t4);
  tl.to(orb, { x: 0, y: -3.9, s: 2.4, amp: 0.28, duration: 1.5, ease: 'expo.inOut' }, x3);
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
  // glifo 1: alvo
  draw('.g1 .r1', pc[0] - 0.3, { from: '0% 0%', to: '0% 72%', d: 1.3 });
  draw('.g1 .r2', pc[0] - 0.2, { from: '0% 0%', to: '0% 84%', d: 1.3 });
  draw('.g1 .r3', pc[0] - 0.1, { d: 1.1 });
  draw('.g1 .arw', pc[0] + 0.6, { d: 0.6, ease: 'power3.out' });
  tw('.g1 .r1', { rotation: 0 }, { rotation: 220, svgOrigin: '100 100', duration: 6, ease: 'sine.inOut' }, pc[0]);
  tw('.g1 .r2', { rotation: 0 }, { rotation: -180, svgOrigin: '100 100', duration: 6, ease: 'sine.inOut' }, pc[0]);
  // glifo 2: morph orgânico
  tw('#morph-a', { scale: 0, svgOrigin: '100 100' }, { scale: 1, duration: 1.0, ease: 'expo.out' }, pc[1] - 0.3);
  tl.to('#morph-a', { morphSVG: '#morph-b', duration: 1.1, ease: 'power2.inOut' }, pc[1] + 0.25);
  tl.to('#morph-a', { morphSVG: '#morph-c', duration: 1.1, ease: 'power2.inOut' }, pc[1] + 1.45);
  // glifo 3: código
  inChars(S.code.chars, pc[2] - 0.25, { st: 0.07, d: 0.9 });
  tl.to('.caret', { opacity: 0, duration: 0.01, yoyo: true, repeat: 15, repeatDelay: 0.4 }, pc[2] - 0.3);
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
  tl.to(orb, { y: -2.95, s: 2.3, amp: 0.34, duration: 2.4, ease: 'power2.inOut' }, T('crescimento') - 0.2);
  const x4 = T('por') - 0.42;
  outChars(S.f4.chars, x4, { st: 0.005, d: 0.42 });
  outChars(S.k42.chars, x4, { st: 0.005, d: 0.4 });
  unvis('#s4', x4 + 0.75);

  // ================= S5 — sócios =================
  const t5 = x4 + 0.12;
  vis('#s5', t5);
  sec(2, t5);
  tl.to(orb, { x: 0, y: -3.95, s: 2.5, amp: 0.26, duration: 1.6, ease: 'expo.inOut' }, t5);
  syncWords(S.h5, idx('por'), { st: 0.02, d: 0.9, lead: 0.06 }, [0, 1, 2, 3, 6, 7, 8, 9, 10, 11]);
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
  tl.to(orb, { warm: 1, duration: 2.2, ease: 'power2.inOut' }, t6);
  tl.to(orb, { x: 0, y: -3.6, s: 2.3, amp: 0.24, duration: 1.6, ease: 'expo.inOut' }, t6);
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
  tl.to(orb, { x: 0, y: -0.1, s: 0.25, warm: 0, duration: 0.9, ease: 'power3.inOut' }, uv + 0.15);
  tl.to(orb, { s: 1.25, amp: 0.36, duration: 1.3, ease: 'expo.out' }, uv + 1.0);
  outChars(S.h7.chars, T('juntos') - 0.4, { st: 0.006, d: 0.42 });
  tl.to(orb, { x: 2.45, y: 0.55, s: 1.05, duration: 1.6, ease: 'power3.inOut' }, T('juntos') - 0.2);
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
  tl.to(orb, { warm: 1, x: 0, y: -3.9, s: 2.5, amp: 0.24, duration: 1.6, ease: 'expo.inOut' }, x7);
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
  tl.to(orb, { y: -3.0, s: 2.3, amp: 0.3, duration: 2.0, ease: 'power2.inOut' }, x8a);
  // assinatura
  const xf = T('work', 4) - 0.6;
  tl.to('#s8-ask', { autoAlpha: 0, filter: 'blur(14px)', scale: 1.12, duration: 0.6, ease: 'power3.in' }, xf);
  tl.to('#hud', { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, xf);
  tl.to(orb, { warm: 0, x: 0, y: (540 - 275) / U, s: 0.62, amp: 0.24, duration: 1.6, ease: 'expo.inOut' }, xf);
  tl.to(['.w1', '.w2'], { opacity: 0.55, duration: 2 }, xf);
  tl.to(['.b1', '.b2', '.b3'], { opacity: 0.9, duration: 2 }, xf);
  const tf = xf + 0.45;
  tw('#fmark', { scale: 0, rotation: -45, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 1.3, ease: 'expo.out' }, tf);
  draw('#fmark-w', tf + 0.25, { d: 0.9 });
  inChars(S.fw.chars.slice(0, 4), T('work', 4) - 0.1, { st: 0.05, d: 1.1, rx: -70 });
  inChars(S.fw.chars.slice(4), T('suite', 4) - 0.1, { st: 0.05, d: 1.1, rx: -70 });
  tw('#fword', { letterSpacing: '.02em' }, { letterSpacing: '-.045em', duration: 2.6, ease: 'expo.out' }, T('work', 4) - 0.12);
  syncWords(S.ft, idx('vamos', 2), { st: 0.02, d: 0.9, lead: 0.06 });
  tw('#fnames', { autoAlpha: 0, y: 16, letterSpacing: '.5em' }, { autoAlpha: 1, y: 0, letterSpacing: '.32em', duration: 1.6, ease: 'expo.out' }, TE('juntos', 2) + 0.05);
  tw('#fserv', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, TE('juntos', 2) + 0.45);
  tl.to('#fade', { opacity: 1, duration: 1.2, ease: 'power2.in' }, TOTAL - 1.25);
  tl.set({}, {}, TOTAL);

  window.__tl = tl;
  window.__seek = (t) => {
    tl.time(Math.min(t, TOTAL), false);
    renderGL(t);
    const f = Math.round(t * 60);
    grainEl.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  };
  window.__duration = TOTAL;
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
