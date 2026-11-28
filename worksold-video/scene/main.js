// Work Sold — filme publicitário 3D (Three.js). Toda animação é função pura do tempo t,
// para renderização determinística quadro a quadro (window.renderFrame(t)).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const W = 1920, H = 1080;
const DURATION = 43.0;
const GREEN = new THREE.Color('#6cff1a');

// ---------- utilidades de tempo ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: k => k,
  oc: k => 1 - Math.pow(1 - k, 3),
  ic: k => k * k * k,
  ioc: k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  ios: k => -(Math.cos(Math.PI * k) - 1) / 2,
  oexp: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  iq: k => k * k,
  oback: k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
// trilha de keyframes: [{t, v:[...], e}] (e = easing do segmento que TERMINA neste keyframe)
function track(keys, t) {
  if (t <= keys[0].t) return keys[0].v.slice();
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.t) {
      const k = (E[b.e || 'ioc'])(prog(t, a.t, b.t));
      return a.v.map((x, j) => lerp(x, b.v[j], k));
    }
  }
  return keys[keys.length - 1].v.slice();
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- renderer / cena ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
scene.add(camera);

// fundo: gradiente com brilho verde nas bordas (identidade da marca)
const bgMat = new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false,
  uniforms: { uTime: { value: 0 }, uGlow: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uGlow;
    void main(){
      vec2 p = vUv;
      float side = smoothstep(0.50, 1.05, abs(p.x - 0.5) * 2.0);
      float left = smoothstep(0.2, 0.0, p.x) * (0.9 + 0.1*sin(uTime*0.7));
      float right = smoothstep(0.82, 1.05, p.x) * (0.9 + 0.1*sin(uTime*0.6 + 1.3)) * smoothstep(0.0, 0.9, p.y);
      float g = (left * 0.55 + right * 0.45 + side * 0.18) * uGlow;
      vec3 col = vec3(0.05, 0.42, 0.01) * g * 0.55;
      col += vec3(0.004, 0.012, 0.004) * (1.0 - length(p - 0.5));
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bg.frustumCulled = false; bg.renderOrder = -1000;
scene.add(bg);

// chão refletivo + grade sutil
const FLOOR_Y = -1.3;
const reflector = new Reflector(new THREE.PlaneGeometry(220, 220), { textureWidth: W / 2, textureHeight: H / 2, color: 0x505050, clipBias: 0.003 });
reflector.rotation.x = -Math.PI / 2; reflector.position.y = FLOOR_Y; scene.add(reflector);
const floorMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uCam: { value: new THREE.Vector3() }, uGrid: { value: 1 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `varying vec3 vW; uniform vec3 uCam; uniform float uGrid;
    void main(){
      float d = length(vW.xz - uCam.xz);
      float a = mix(0.80, 0.99, smoothstep(2.0, 18.0, d));
      vec2 gr = abs(fract(vW.xz * 0.5) - 0.5) / fwidth(vW.xz * 0.5);
      float line = 1.0 - min(min(gr.x, gr.y), 1.0);
      float fade = smoothstep(22.0, 4.0, d);
      vec3 col = vec3(0.10, 0.9, 0.05) * line * 0.10 * fade * uGrid;
      gl_FragColor = vec4(col, a);
    }`,
});
const floorOverlay = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), floorMat);
floorOverlay.rotation.x = -Math.PI / 2; floorOverlay.position.y = FLOOR_Y + 0.002; floorOverlay.renderOrder = 2;
scene.add(floorOverlay);

// luzes
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3, 6, 8); scene.add(key); scene.add(key.target);
const gL = new THREE.PointLight(0x5cff10, 16, 0, 2); scene.add(gL);
const gR = new THREE.PointLight(0x5cff10, 12, 0, 2); scene.add(gR);
const glint = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(glint);

// material de borda com fresnel (neon verde)
function rimMaterial(power = 2.6, strength = 1.6) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: GREEN.clone() }, uStrength: { value: strength }, uPower: { value: power }, uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uStrength; uniform float uPower; uniform float uOpacity;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower); gl_FragColor = vec4(uColor * f * uStrength * uOpacity, 1.0); }`,
  });
}
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0x010301, roughness: 0.1, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9, transparent: true });

// ---------- texturas ----------
const texLoader = new THREE.TextureLoader();
const loadTex = url => new Promise((res, rej) => texLoader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const loadText = url => fetch(url).then(r => r.text());
function svgToCanvasTexture(svgText, size = 512, color = '#6cff1a', glow = 26) {
  return new Promise(res => {
    const src = svgText.replace(/currentColor/g, color).replace(/<!--.*?-->/s, '');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d');
      g.shadowColor = color; g.shadowBlur = glow;
      const pad = size * 0.2; g.drawImage(img, pad, pad, size - 2 * pad, size - 2 * pad);
      g.shadowBlur = 0; g.drawImage(img, pad, pad, size - 2 * pad, size - 2 * pad);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; res(t);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  });
}

// ---------- celular 3D ----------
const PH = { w: 1.02, h: 1.94, d: 0.095, r: 0.13, sw: 0.955, sh: 1.837, sr: 0.1 };
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function screenGeometry(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}
const bodyGeo = new RoundedBoxGeometry(PH.w, PH.h, PH.d, 8, PH.r);
const scrGeo = screenGeometry(PH.sw, PH.sh, PH.sr);
const sheenMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uOff: { value: 0 }, uAmt: { value: 0.06 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform float uOff; uniform float uAmt;
    void main(){ float d = vUv.x * 0.8 + vUv.y * 0.55 - uOff; float b = exp(-pow(d * 5.5, 2.0)); gl_FragColor = vec4(vec3(1.0) * b * uAmt, 1.0); }`,
});
function makePhone(tex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color: 0x15171a, metalness: 0.85, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }));
  const rim = new THREE.Mesh(bodyGeo, rimMaterial(2.6, 1.1)); rim.scale.setScalar(1.004);
  const scr = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.86, 0.86, 0.86) }));
  scr.position.z = PH.d / 2 + 0.0015;
  const sheen = new THREE.Mesh(scrGeo, sheenMat.clone()); sheen.position.z = PH.d / 2 + 0.003;
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  cam.position.set(0, PH.sh / 2 - 0.045, PH.d / 2 + 0.004);
  const btnMat = body.material;
  const b1 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.22, 0.04, 2, 0.008), btnMat); b1.position.set(PH.w / 2 + 0.006, 0.42, 0);
  const b2 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.14, 0.04, 2, 0.008), btnMat); b2.position.set(-PH.w / 2 - 0.006, 0.5, 0);
  const b3 = b2.clone(); b3.position.y = 0.3;
  g.add(body, rim, scr, sheen, cam, b1, b2, b3);
  g.userData = { rim, sheen, scr };
  return g;
}

// ---------- ladrilho de vidro (logo / valores) ----------
function makeTile(w, h, d, r) {
  const geo = new RoundedBoxGeometry(w, h, d, 10, r);
  const g = new THREE.Group();
  const glass = new THREE.Mesh(geo, glassMat());
  const rim = new THREE.Mesh(geo, rimMaterial(2.6, 1.9)); rim.scale.setScalar(1.003);
  // moldura interna luminosa na face frontal
  const outer = roundedRectShape(w * 0.93, h * 0.93, r * 0.85);
  const inner = roundedRectShape(w * 0.905, h * 0.905, r * 0.8); outer.holes.push(inner);
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(outer, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.9, 0.12), transparent: true, opacity: 0.6, toneMapped: false }));
  frame.position.z = d / 2 + 0.002;
  g.add(glass, rim, frame);
  g.userData = { glass, rim, frame };
  return g;
}

// ---------- montagem ----------
const state = {};
async function build() {
  await document.fonts.load('500 64px Poppins'); await document.fonts.load('italic 800 64px Poppins'); await document.fonts.ready;
  const names = ['lucindo-hero', 'lucindo-momentos', 'sensuale-maquiagem', 'sensuale-marcas', 'progym-hero'];
  const texs = await Promise.all(names.map(n => loadTex(`../assets/img/${n}.jpg`)));
  state.phones = texs.map(t => { const p = makePhone(t); scene.add(p); return p; });

  // barra de busca (S1)
  const bar = new THREE.Group();
  const barGlass = new THREE.Mesh(new RoundedBoxGeometry(6.4, 1.0, 0.24, 10, 0.12), glassMat());
  const barRim = new THREE.Mesh(barGlass.geometry, rimMaterial(2.0, 1.8)); barRim.scale.setScalar(1.003);
  const bc = document.createElement('canvas'); bc.width = 2048; bc.height = 320;
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
  const barText = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.0), new THREE.MeshBasicMaterial({ map: btex, transparent: true, toneMapped: false }));
  barText.position.z = 0.125;
  bar.add(barGlass, barRim, barText); scene.add(bar);
  state.bar = { g: bar, canvas: bc, tex: btex, glass: barGlass, rim: barRim, text: barText };
  state.searchIcon = await new Promise(res => { const i = new Image(); i.onload = () => res(i); loadText('../node_modules/lucide-static/icons/search.svg').then(s => { i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.replace(/currentColor/g, '#6cff1a').replace(/<!--.*?-->/s, '')); }); });

  // ladrilhos de valores
  const icons = ['rocket', 'chart-no-axes-column-increasing', 'shield-check', 'handshake'];
  const iconTex = await Promise.all(icons.map(n => loadText(`../node_modules/lucide-static/icons/${n}.svg`).then(s => svgToCanvasTexture(s, 512))));
  state.tiles = iconTex.map(t => {
    const tile = makeTile(1.55, 1.55, 0.34, 0.32);
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(1.7, 1.7, 1.7), toneMapped: false, depthWrite: false }));
    icon.position.z = 0.175; tile.add(icon); scene.add(tile); return tile;
  });

  // logo 3D: letras vetorizadas do arquivo oficial + ladrilho de vidro
  const logo = new THREE.Group();
  const tile = makeTile(2.6, 2.48, 0.62, 0.52);
  logo.add(tile);
  const loader = new SVGLoader();
  const S = 2.6 / 3560; // 890 px do ladrilho original = 3560 unidades do SVG (escala 4x)
  const cx = 1416, cy = 840;
  const letterMats = {
    w_green: new THREE.MeshStandardMaterial({ color: 0x2f9a00, emissive: 0x4cff00, emissiveIntensity: 0.7, metalness: 0.0, roughness: 0.42, envMapIntensity: 0.3 }),
    s_white: new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.22, metalness: 0.3, roughness: 0.25, clearcoat: 1, envMapIntensity: 0.8 }),
  };
  for (const name of ['w_green', 's_white']) {
    const data = loader.parse(await loadText(`../assets/img/${name}.svg`));
    const grp = new THREE.Group();
    for (const path of data.paths) {
      for (const shape of SVGLoader.createShapes(path)) {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 150, bevelEnabled: true, bevelThickness: 26, bevelSize: 10, bevelSegments: 3, curveSegments: 10 });
        grp.add(new THREE.Mesh(geo, letterMats[name]));
      }
    }
    grp.scale.set(S, -S, S);
    grp.position.set(-cx * S, cy * S, 0.31 + (name === 's_white' ? 0.012 : 0));
    logo.add(grp);
  }
  scene.add(logo);
  state.logo = logo; state.logoTile = tile;

  // onda de choque do impacto
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 0.2), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(shock); state.shock = shock;

  // partículas
  const N = 900, r = rng(7);
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = lerp(-10, 36, r()); pos[i * 3 + 1] = lerp(-1.2, 6.5, r()); pos[i * 3 + 2] = lerp(-14, 7, r());
    seed[i * 4] = r(); seed[i * 4 + 1] = r(); seed[i * 4 + 2] = r(); seed[i * 4 + 3] = r();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const pm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 1 }, uBurst: { value: 0 }, uBurstC: { value: new THREE.Vector3() } },
    vertexShader: `attribute vec4 seed; uniform float uTime; uniform float uBurst; uniform vec3 uBurstC; varying float vA; varying float vW;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * (0.15 + seed.x * 0.3) + seed.y * 6.28) * 0.45;
        p.y = -1.2 + mod(position.y + 1.2 + uTime * (0.05 + seed.z * 0.12), 7.7);
        p.z += cos(uTime * (0.12 + seed.y * 0.2) + seed.x * 6.28) * 0.35;
        vec3 dir = normalize(p - uBurstC + 0.001);
        p += dir * uBurst * (1.5 + seed.x * 3.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float s = 1.0 + seed.w * 3.2;
        gl_PointSize = s * 120.0 / -mv.z;
        vA = (0.35 + 0.65 * seed.z) * smoothstep(0.0, 0.5, fract(uTime * 0.07 + seed.x)) * (0.6 + 0.4 * sin(uTime * 1.3 + seed.y * 40.0));
        vW = step(0.86, seed.x); vA *= smoothstep(2.0, 5.0, -mv.z);
      }`,
    fragmentShader: `uniform float uAmt; varying float vA; varying float vW;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(0.35, 1.0, 0.15), vec3(1.0), vW); gl_FragColor = vec4(col * a * vA * uAmt * 0.75, 1.0); }`,
  });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; scene.add(pts);
  state.particles = pm;

  // pós-processamento
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.16, 0.9);
  if (!location.search.includes('nobloom')) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  state.composer = composer; state.bloom = bloom;

  // DOM
  state.words = [...document.querySelectorAll('.w[data-t]')].map(el => ({ el, t: parseFloat(el.dataset.t) }));
  const $ = id => document.getElementById(id);
  Object.assign(state, { $, photo: $('photo'), photoImg: document.querySelector('#photo img'), sweep: document.querySelector('#photo .sweep'), flash: $('flash'), black: $('black') });
}

// ---------- desenho da barra de busca ----------
function drawBar(t) {
  const { canvas: c, tex } = state.bar; const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(state.searchIcon, 120, 95, 130, 130);
  const full = 'seu negócio';
  const n = Math.floor(clamp((t - 2.1) / 0.105, 0, full.length));
  const txt = full.slice(0, n);
  g.font = '500 118px Poppins'; g.textBaseline = 'middle';
  if (n === 0) { g.fillStyle = 'rgba(255,255,255,0.32)'; g.fillText('Pesquisar…', 300, 166); }
  g.fillStyle = '#f4f7f2'; g.fillText(txt, 300, 166);
  const tw = n ? g.measureText(txt).width : 0;
  const blink = (n > 0 && n < full.length) || Math.floor(t * 2.2) % 2 === 0;
  if (blink) { g.fillStyle = '#6cff1a'; g.fillRect(300 + tw + 10, 92, 9, 150); }
  // "carregando" no momento "O que ele encontra?"
  const q = prog(t, 4.6, 5.9);
  if (q > 0 && q < 1) {
    const x0 = 1500, wbar = 380, ph = (t * 1.6) % 1;
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x0, 158, wbar, 12);
    g.fillStyle = '#6cff1a'; g.fillRect(x0 + wbar * Math.max(0, ph - 0.3), 158, wbar * 0.3, 12);
  }
  tex.needsUpdate = true;
}

// ---------- coreografia ----------
const LX = 0, SX = 7, PX = 14;
const R = new THREE.Vector3(PX, -0.15, -3.2);
const V = new THREE.Vector3(PX, -0.05, -1.2);
const HIDE = -4.8;

const camPos = [
  { t: 0, v: [0, 0.55, 9.8] }, { t: 5.75, v: [0, 0.38, 7.7], e: 'ios' }, { t: 6.32, v: [0, 0.18, 1.6], e: 'ic' },
  { t: 6.33, v: [0, 0.65, 9.3], e: 'lin' }, { t: 11.0, v: [0, 0.65, 9.3] }, { t: 16.0, v: [0, 0.38, 7.7], e: 'ios' },
  { t: 16.95, v: [LX - 1.25, 0.15, 5.6] }, { t: 19.05, v: [LX - 1.08, 0.12, 5.4], e: 'ios' },
  { t: 19.85, v: [SX - 1.25, 0.15, 5.6] }, { t: 21.95, v: [SX - 1.08, 0.12, 5.4], e: 'ios' },
  { t: 22.75, v: [PX - 1.25, 0.15, 5.6] }, { t: 24.2, v: [PX - 1.12, 0.12, 5.4], e: 'ios' },
  { t: 25.55, v: [PX, 0.55, 6.9] }, { t: 28.25, v: [PX, 0.42, 6.1], e: 'ios' },
  { t: 29.05, v: [V.x, V.y + 0.35, V.z + 9.4] }, { t: 33.65, v: [V.x, V.y + 0.3, V.z + 8.9], e: 'lin' },
  { t: 34.15, v: [V.x, V.y + 0.28, V.z + 8.7], e: 'lin' }, { t: 35.0, v: [V.x, V.y + 0.28, V.z + 8.5], e: 'oc' },
  { t: 36.3, v: [V.x + 2.25, V.y + 0.25, V.z + 8.3], e: 'ioc' }, { t: 43, v: [V.x + 2.35, V.y + 0.22, V.z + 7.7], e: 'lin' },
];
const camTgt = [
  { t: 0, v: [0, 0.12, 0] }, { t: 6.32, v: [0, 0.12, 0] }, { t: 6.33, v: [0, -0.32, 0], e: 'lin' }, { t: 16.0, v: [0, -0.28, 0] },
  { t: 16.95, v: [LX - 1.25, -0.05, 0] }, { t: 19.05, v: [LX - 1.08, -0.05, 0], e: 'ios' },
  { t: 19.85, v: [SX - 1.25, -0.05, 0] }, { t: 21.95, v: [SX - 1.08, -0.05, 0], e: 'ios' },
  { t: 22.75, v: [PX - 1.25, -0.05, 0] }, { t: 24.2, v: [PX - 1.12, -0.05, 0], e: 'ios' },
  { t: 25.55, v: [PX, -0.42, -2.6] }, { t: 28.25, v: [PX, -0.42, -2.6], e: 'ios' },
  { t: 29.05, v: [V.x, V.y, V.z] }, { t: 35.0, v: [V.x, V.y, V.z], e: 'lin' },
  { t: 36.3, v: [V.x + 2.25, V.y, V.z], e: 'ioc' }, { t: 43, v: [V.x + 2.35, V.y, V.z], e: 'lin' },
];

// keyframes [x, y, z, rotY, scale] de cada celular até o anel
const phoneKeys = [
  [ { t: 11.5, v: [-2.5, HIDE, 0, 0.7, 1] }, { t: 12.65, v: [-2.5, -0.42, 0, 0.32, 1], e: 'oc' }, { t: 15.9, v: [-2.5, -0.42, 0, 0.26, 1], e: 'ios' }, { t: 16.95, v: [LX + 0.15, 0, 0.3, -0.38, 1], e: 'ioc' } ],
  [ { t: 16.05, v: [LX + 2.7, HIDE, -0.8, -1.0, 1] }, { t: 17.15, v: [LX + 1.65, -0.12, -0.42, -0.52, 1], e: 'oc' } ],
  [ { t: 11.7, v: [0, HIDE, 0.6, 0, 1] }, { t: 12.85, v: [0, -0.48, 0.6, 0, 1], e: 'oc' }, { t: 15.9, v: [0, -0.48, 0.6, 0, 1] }, { t: 16.95, v: [SX + 0.15, 0, 0.3, -0.38, 1], e: 'ioc' } ],
  [ { t: 18.95, v: [SX + 2.7, HIDE, -0.8, -1.0, 1] }, { t: 20.05, v: [SX + 1.65, -0.12, -0.42, -0.52, 1], e: 'oc' } ],
  [ { t: 11.9, v: [2.5, HIDE, 0, -0.7, 1] }, { t: 13.05, v: [2.5, -0.42, 0, -0.32, 1], e: 'oc' }, { t: 15.9, v: [2.5, -0.42, 0, -0.26, 1], e: 'ios' }, { t: 16.95, v: [PX + 0.35, 0.02, 0.35, -0.42, 1.12], e: 'ioc' } ],
];
const ringOrder = [-2, -1, 1, 2, 0]; // posição de cada celular no arco (P4 = ProGym ao centro)
const ARC_C = new THREE.Vector3(PX, -0.12, -10.0), ARC_R = 7.4;
const ringPose = (i, t) => {
  const a = ringOrder[i] * 0.275 + 0.035 * Math.sin((t - 24.25) * 0.5);
  const wave = 0.12 * Math.sin((t - 24.6) * 2.2 - ringOrder[i] * 0.9) * prog(t, 25.3, 25.9);
  return [ARC_C.x + Math.sin(a) * ARC_R, ARC_C.y + wave, ARC_C.z + Math.cos(a) * ARC_R, a, 1];
};
function phonePose(i, t) {
  let p = track(phoneKeys[i], t);
  const k0 = 24.25 + (i === 4 ? 0 : 0.07 * (2 - Math.abs(ringOrder[i])));
  if (t > k0) {
    const k = E.ioc(prog(t, k0, k0 + 1.25));
    const rp = ringPose(i, t);
    let dy = rp[3] - p[3]; // rotação pelo caminho mais curto
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    p = [lerp(p[0], rp[0], k), lerp(p[1], rp[1], k), lerp(p[2], rp[2], k), p[3] + dy * k, lerp(p[4], rp[4], k)];
  }
  const ex = E.ic(prog(t, 27.98 + 0.06 * i, 28.75 + 0.06 * i));
  p[1] -= ex * 6.5; p[3] += ex * 0.8;
  p[1] += Math.sin(t * 1.05 + i * 1.7) * 0.035;
  return p;
}

const valT = [28.9, 30.12, 31.42, 32.58];
const valX = [-3, -1, 1, 3];
function tilePose(i, t) {
  const w = valT[i];
  const k = E.oc(prog(t, w - 0.5, w + 0.08));
  const ex = E.ic(prog(t, 33.5 + 0.04 * i, 34.05 + 0.04 * i));
  const x = V.x + valX[i] * (1 + ex * 1.6), y = V.y + Math.sin(t * 1.2 + i) * 0.04 * k;
  const z = lerp(V.z - 7, V.z, k) + ex * 3.5;
  return { pos: [x, y, z], rotY: (1 - k) * 1.9 + Math.sin(t * 0.8 + i) * 0.08 * k, rotX: (1 - k) * 0.6, s: lerp(0.55, 1, k) * (1 - ex), vis: k > 0.001 && ex < 0.999 };
}

function setWord(el, t0, t) {
  const k = E.oc(prog(t, t0, t0 + 0.42));
  el.style.opacity = k.toFixed(3);
  el.style.transform = `translateY(${((1 - k) * 34).toFixed(1)}px)`;
  el.style.filter = k < 1 ? `blur(${((1 - k) * 10).toFixed(1)}px)` : 'none';
}
function block(id, tin, tout, t, dur = 0.35) {
  const el = state.$(id);
  const o = (tout == null) ? 1 : 1 - prog(t, tout, tout + dur);
  el.style.opacity = o.toFixed(3);
  el.style.visibility = (t < tin - 0.1 || o <= 0) ? 'hidden' : 'visible';
  if (tout != null) el.style.transform = `translateY(${(-prog(t, tout, tout + dur) * 30).toFixed(1)}px)`;
}
function swoosh(id, t0, t) {
  const p = document.querySelector(`#${id} path`); const L = 800;
  p.style.strokeDasharray = L; p.style.strokeDashoffset = (L * (1 - E.ioc(prog(t, t0, t0 + 0.55)))).toFixed(1);
}
const tmpV = new THREE.Vector3();

function update(t) {
  // câmera (+ tremor no impacto do logo)
  const cp = track(camPos, t), ct = track(camTgt, t);
  const sh = Math.exp(-(t - 34.16) * 7) * (t > 34.16 ? 1 : 0);
  camera.position.set(cp[0] + Math.sin(t * 71) * 0.05 * sh, cp[1] + Math.cos(t * 83) * 0.05 * sh, cp[2]);
  camera.lookAt(ct[0], ct[1], ct[2]);
  camera.updateMatrixWorld();
  floorMat.uniforms.uCam.value.copy(camera.position);

  // luzes seguem o alvo
  key.target.position.set(ct[0], ct[1], ct[2]); key.position.set(ct[0] + 3, 6, ct[2] + 8);
  gL.position.set(ct[0] - 5.5, 1.2, ct[2] + 2.5); gR.position.set(ct[0] + 5.5, 0.6, ct[2] + 2.0);
  bgMat.uniforms.uTime.value = t;

  // barra de busca
  const bar = state.bar;
  const bk = E.oc(prog(t, 0.5, 1.7));
  bar.g.visible = t < 6.4;
  bar.g.position.set(0, lerp(-0.6, -0.22, bk), 0);
  bar.g.rotation.x = lerp(-0.5, -0.1, bk) + 0.04 * prog(t, 1.7, 5.7);
  bar.g.scale.setScalar(lerp(0.9, 1, bk));
  bar.glass.material.opacity = bk; bar.text.material.opacity = bk; bar.rim.material.uniforms.uOpacity.value = bk;
  if (bar.g.visible) drawBar(t);

  // celulares
  state.phones.forEach((ph, i) => {
    const p = phonePose(i, t);
    ph.position.set(p[0], p[1], p[2]); ph.rotation.set(0, p[3], 0); ph.scale.setScalar(p[4]);
    ph.visible = p[1] > HIDE + 0.2 && t > 11 && t < 29.2;
    ph.userData.sheen.material.uniforms.uOff.value = 0.2 + p[3] * 0.9 + Math.sin(t * 0.4 + i) * 0.15;
  });

  // valores
  state.tiles.forEach((tl, i) => {
    const p = tilePose(i, t);
    tl.visible = p.vis; tl.position.set(...p.pos); tl.rotation.set(p.rotX, p.rotY, 0); tl.scale.setScalar(Math.max(p.s, 0.0001));
    const lab = state.$('v' + i);
    tmpV.set(p.pos[0], p.pos[1] - 1.05, p.pos[2]).project(camera);
    const k = prog(t, valT[i] - 0.05, valT[i] + 0.35), o = E.oc(k) * (1 - prog(t, 33.45, 33.75));
    lab.style.left = ((tmpV.x * 0.5 + 0.5) * W).toFixed(1) + 'px';
    lab.style.top = ((-tmpV.y * 0.5 + 0.5) * H).toFixed(1) + 'px';
    lab.style.opacity = o.toFixed(3);
    lab.style.transform = `translate(-50%, ${((1 - E.oc(k)) * 26).toFixed(1)}px)`;
  });

  // logo
  const L = state.logo;
  const lk = prog(t, 33.72, 34.16);
  L.visible = t > 33.7;
  const recoil = t > 34.16 ? Math.exp(-(t - 34.16) * 6) * Math.sin((t - 34.16) * 22) * 0.18 : 0;
  L.position.set(V.x, V.y + 0.05 + Math.sin(Math.max(0, t - 34.6) * 0.9) * 0.05, lerp(V.z - 28, V.z, E.iq(lk)) + recoil);
  L.rotation.set(0, (1 - E.oc(lk)) * 2.6 + 0.16 * Math.sin(Math.max(0, t - 34.7) * 0.55) * prog(t, 34.6, 35.6), 0);
  // reflexo de luz varrendo o logo
  const gk = prog(t, 36.0, 37.6);
  glint.position.set(V.x + lerp(-4, 4, E.ios(gk)), V.y + 1.2, V.z + 2.2);
  glint.intensity = Math.sin(gk * Math.PI) * 40 + Math.exp(-Math.max(0, t - 34.16) * 4) * 45 * (t > 34.16 ? 1 : 0);
  glint.position.y += 0;

  // onda de choque
  const sk = prog(t, 34.16, 34.95);
  state.shock.visible = sk > 0 && sk < 1;
  state.shock.position.set(V.x, V.y + 0.05, V.z - 0.4);
  state.shock.scale.setScalar(lerp(1.2, 9, E.oc(sk)));
  state.shock.material.opacity = Math.pow(1 - sk, 1.5) * 0.6;

  // partículas + bloom
  state.particles.uniforms.uTime.value = t;
  state.particles.uniforms.uAmt.value = 0.55 + 0.45 * prog(t, 0.2, 2.0);
  state.particles.uniforms.uBurst.value = E.oc(prog(t, 34.16, 35.2)) * 0.6;
  state.particles.uniforms.uBurstC.value.copy(V);
  const impact = (t > 34.16 ? Math.exp(-(t - 34.16) * 4.5) : 0);
  state.bloom.strength = 0.55 + impact * 0.6 + Math.exp(-Math.pow((t - 6.25) / 0.12, 2)) * 1.2;

  // ---------- DOM ----------
  for (const w of state.words) setWord(w.el, w.t, t);
  block('s1', 1.3, 4.3, t, 0.3);
  block('s1q', 4.5, 5.9, t, 0.3);
  block('s2', 6.8, 10.75, t, 0.3);
  ['s2r1', 's2r2'].forEach(id => { state.$(id).style.transform = `scaleX(${E.oc(prog(t, 6.85, 7.35)).toFixed(3)})`; });
  swoosh('s2sw', 10.12, t);
  block('s3', 11.5, 15.85, t, 0.3);
  // portfólio
  const pk = state.$('pf-kicker');
  pk.style.opacity = (E.oc(prog(t, 16.4, 16.9)) * (1 - prog(t, 24.05, 24.4))).toFixed(3);
  [[16.72, 18.95], [19.66, 21.9], [22.56, 24.1]].forEach(([a, b], i) => {
    const el = state.$('pf' + i);
    const kin = E.oc(prog(t, a, a + 0.55)), kout = E.ic(prog(t, b, b + 0.32));
    el.style.opacity = (kin * (1 - kout)).toFixed(3);
    el.style.transform = `translateX(${((1 - kin) * -60 + kout * -40).toFixed(1)}px)`;
    el.style.filter = kin < 1 ? `blur(${((1 - kin) * 8).toFixed(1)}px)` : 'none';
    el.querySelector('.line').style.transform = `scaleX(${E.oc(prog(t, a + 0.25, a + 0.85)).toFixed(3)})`;
  });
  block('s5', 24.6, 28.05, t, 0.3);
  block('s7', 35.2, null, t);
  state.$('s7r').style.transform = `scaleX(${E.oc(prog(t, 35.35, 35.9)).toFixed(3)})`;
  swoosh('s7sw', 38.5, t);
  const cta = state.$('cta');
  const ck = E.oback(prog(t, 39.15, 39.7));
  cta.style.opacity = clamp(ck).toFixed(3);
  const pulse = 1 + 0.025 * Math.sin(Math.max(0, t - 39.9) * 4.2) * prog(t, 39.9, 40.4);
  cta.style.transform = `translateY(${((1 - ck) * 30).toFixed(1)}px) scale(${pulse.toFixed(4)})`;

  // foto da marca (S2) com push-in e saída em zoom no ladrilho
  const ph = state.photo;
  const pin = prog(t, 6.18, 6.36), pout = prog(t, 10.95, 11.3);
  ph.style.opacity = (pin * (1 - pout)).toFixed(3);
  const z = lerp(1.04, 1.12, E.lin(prog(t, 6.3, 11.0))) * lerp(1, 2.6, E.ic(prog(t, 10.85, 11.3)));
  state.photoImg.style.transform = `scale(${z.toFixed(4)})`;
  state.photoImg.style.filter = pout > 0 ? `blur(${(pout * 14).toFixed(1)}px)` : 'none';
  const sw = prog(t, 6.9, 8.3);
  state.sweep.style.transform = `translateX(${lerp(-70, 70, E.ios(sw)).toFixed(1)}%)`;
  state.sweep.style.opacity = Math.sin(sw * Math.PI).toFixed(3);

  // flashes, entrada e saída
  const fl = Math.max(
    Math.exp(-Math.pow((t - 6.27) / 0.09, 2)) * 0.95,
    Math.exp(-Math.pow((t - 11.17) / 0.1, 2)) * 0.55,
    Math.exp(-Math.pow((t - 34.17) / 0.07, 2)) * 0.35);
  state.flash.style.opacity = fl.toFixed(3);
  state.black.style.opacity = Math.max(1 - E.ios(prog(t, 0.0, 0.9)), E.ios(prog(t, 42.1, 43.0))).toFixed(3);
}

let ready = false;
window.renderFrame = (t) => {
  update(t);
  const photoOpaque = t > 6.4 && t < 10.9;
  if (!photoOpaque) state.composer.render();
  return true;
};
window.DURATION = DURATION;
window.__ready = build().then(() => { ready = true; window.renderFrame(0); return true; });
window.__isReady = () => ready;
