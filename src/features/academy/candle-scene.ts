import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { gsap } from "@/lib/gsap";
import type { Ohlc } from "@/lib/academy/candles";

const GREEN = new THREE.Color("#1ed38a");
const RED = new THREE.Color("#f5475c");
const SPACING = 1.15;
const HEIGHT = 4.2;
const BODY = 0.62;
const WICK = 0.045;

export interface SceneOptions {
  reducedMotion: boolean;
  /** Touch screens: no drag-to-rotate, so the page keeps scrolling. */
  coarsePointer: boolean;
  onHover?: (index: number | null) => void;
}

interface CandleNode {
  group: THREE.Group;
  body: THREE.Mesh;
  wicks: THREE.Mesh[];
  materials: THREE.MeshPhysicalMaterial[];
  dim: boolean;
}

const LABEL_CLASS =
  "pointer-events-none rounded-md border border-white/15 bg-[#0b0e13]/90 px-1.5 py-0.5 text-[10.5px] leading-tight font-medium whitespace-nowrap text-white shadow-lg";

/**
 * Small Three.js scene that draws candles as 3D bodies and wicks. One instance
 * per viewer; call dispose() on unmount (it frees geometries, materials,
 * textures and the WebGL context).
 */
export class CandleScene {
  private renderer: THREE.WebGLRenderer;
  private labels: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private controls: OrbitControls;
  private root = new THREE.Group();
  private candles: CandleNode[] = [];
  private labelObjects: CSS2DObject[] = [];
  private boxGeo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  private cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14);
  private grid: THREE.GridHelper;
  private floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(9, 9);
  private hovered: number | null = null;
  private yaw = 0;
  /** x of the candle the camera centers on (the labelled one in anatomy mode). */
  private focusX = 0;
  private anatomy = false;
  private frame = 0;
  private visible = true;
  private disposed = false;
  private started = performance.now();
  private observers: (ResizeObserver | IntersectionObserver)[] = [];
  private cleanups: (() => void)[] = [];

  constructor(
    private host: HTMLElement,
    private opts: SceneOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    Object.assign(this.labels.domElement.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
    });
    host.appendChild(this.labels.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 4;
    Object.assign(key.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 30,
    });
    const rim = new THREE.DirectionalLight(0x7aa7ff, 0.9);
    rim.position.set(-5, 3, -5);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, 2, 6);
    this.scene.add(key, rim, fill);

    this.grid = new THREE.GridHelper(24, 48, 0x253041, 0x141a23);
    this.grid.position.y = -0.02;
    // Invisible floor that only receives the candles' shadows.
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.38 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.01;
    this.floor.receiveShadow = true;
    this.scene.add(this.grid, this.floor, this.root);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !opts.reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.enableZoom = false; // never hijack the page scroll
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.45;
    this.controls.rotateSpeed = 0.6;
    if (opts.coarsePointer) {
      this.controls.enabled = false;
      this.renderer.domElement.style.touchAction = "pan-y";
    }
    this.controls.addEventListener("change", () => this.requestRender());

    const onMove = (e: PointerEvent) => {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      this.pick();
    };
    const onLeave = () => {
      this.pointer.set(9, 9);
      this.pick();
    };
    this.renderer.domElement.addEventListener("pointermove", onMove);
    this.renderer.domElement.addEventListener("pointerleave", onLeave);
    this.cleanups.push(() => {
      this.renderer.domElement.removeEventListener("pointermove", onMove);
      this.renderer.domElement.removeEventListener("pointerleave", onLeave);
    });

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(host);
    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.loop();
    });
    io.observe(host);
    this.observers.push(ro, io);
    const onVisibility = () => {
      if (document.visibilityState === "visible") this.loop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() =>
      document.removeEventListener("visibilitychange", onVisibility),
    );
    this.resize();
  }

  /** Replaces the candles. `focusFrom`: index where the highlighted pattern starts. */
  setCandles(
    data: Ohlc[],
    focusFrom: number,
    anatomy: boolean,
    animate = true,
  ) {
    this.clearCandles();
    if (!data.length) return this.requestRender();
    const min = Math.min(...data.map((d) => d.l));
    const max = Math.max(...data.map((d) => d.h));
    const scale = HEIGHT / (max - min || 1);
    const y = (v: number) => (v - min) * scale;
    const x0 = -((data.length - 1) * SPACING) / 2;

    data.forEach((d, i) => {
      const bullish = d.c >= d.o;
      const dim = i < focusFrom;
      const color = bullish ? GREEN : RED;
      const mat = () =>
        new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: dim ? 0.04 : 0.16,
          roughness: 0.32,
          metalness: 0.05,
          clearcoat: 0.7,
          clearcoatRoughness: 0.25,
          transparent: dim,
          opacity: dim ? 0.32 : 1,
        });
      const bodyMat = mat();
      const wickMat = mat();
      const group = new THREE.Group();
      group.position.set(x0 + i * SPACING, y(d.l), 0);

      const top = Math.max(d.o, d.c);
      const bottom = Math.min(d.o, d.c);
      const bodyH = Math.max(0.03, y(top) - y(bottom));
      const body = new THREE.Mesh(this.boxGeo, bodyMat);
      body.scale.set(BODY, bodyH, BODY);
      body.position.y = y(bottom) - y(d.l) + bodyH / 2;
      body.userData.index = i;
      body.castShadow = !dim;

      const wicks: THREE.Mesh[] = [];
      const addWick = (from: number, to: number) => {
        const h = y(to) - y(from);
        if (h <= 0.001) return;
        const w = new THREE.Mesh(this.cylGeo, wickMat);
        w.scale.set(WICK, h, WICK);
        w.position.y = y(from) - y(d.l) + h / 2;
        w.userData.index = i;
        w.castShadow = !dim;
        wicks.push(w);
      };
      addWick(d.l, bottom);
      addWick(top, d.h);
      group.add(body, ...wicks);
      this.root.add(group);
      this.candles.push({
        group,
        body,
        wicks,
        materials: [bodyMat, wickMat],
        dim,
      });
    });

    this.anatomy = anatomy;
    this.focusX = anatomy ? x0 + (data.length - 1) * SPACING : 0;
    if (anatomy) this.addAnatomyLabels(data[data.length - 1], y, this.focusX);
    this.frameCamera(data.length);
    if (animate && !this.opts.reducedMotion) this.playIntro();
    this.requestRender();
  }

  /** Re-runs the build-up animation. */
  playIntro() {
    if (this.opts.reducedMotion) return;
    const groups = this.candles.map((c) => c.group.scale);
    gsap.killTweensOf(groups);
    gsap.fromTo(
      groups,
      { y: 0.001 },
      {
        y: 1,
        duration: 1,
        ease: "expo.out",
        stagger: 0.09,
        onUpdate: () => this.requestRender(),
      },
    );
    gsap.fromTo(
      this.root.rotation,
      { y: this.yaw - 0.35 },
      { y: this.yaw, duration: 1.6, ease: "power3.out" },
    );
  }

  /** Turns the candles around their center (buttons / keyboard). */
  rotateBy(rad: number) {
    this.yaw += rad;
    if (this.opts.reducedMotion) {
      this.root.rotation.y = this.yaw;
      this.requestRender();
      return;
    }
    gsap.to(this.root.rotation, {
      y: this.yaw,
      duration: 0.7,
      ease: "power3.out",
      onUpdate: () => this.requestRender(),
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    gsap.killTweensOf(this.root.rotation);
    this.clearCandles();
    this.observers.forEach((o) => o.disconnect());
    this.cleanups.forEach((f) => f());
    this.controls.dispose();
    this.boxGeo.dispose();
    this.cylGeo.dispose();
    this.grid.geometry.dispose();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    (Array.isArray(this.grid.material)
      ? this.grid.material
      : [this.grid.material]
    ).forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }

  /* -------------------------------- internals ------------------------------- */

  private addAnatomyLabels(d: Ohlc, y: (v: number) => number, x: number) {
    const top = Math.max(d.o, d.c);
    const bottom = Math.min(d.o, d.c);
    const bullish = d.c >= d.o;
    const left: [string, number][] = [
      ["Máxima", d.h],
      [bullish ? "Fechamento" : "Abertura", top],
      [bullish ? "Abertura" : "Fechamento", bottom],
      ["Mínima", d.l],
    ];
    const right: [string, number][] = [];
    if (d.h > top) right.push(["Pavio superior", (d.h + top) / 2]);
    right.push([
      `Corpo ${bullish ? "de alta" : "de baixa"}`,
      (top + bottom) / 2,
    ]);
    if (bottom > d.l) right.push(["Pavio inferior", (bottom + d.l) / 2]);
    const make = (text: string, px: number, py: number, anchorX: number) => {
      const el = document.createElement("div");
      el.className = LABEL_CLASS;
      el.textContent = text;
      const obj = new CSS2DObject(el);
      obj.position.set(px, py, 0);
      obj.center.set(anchorX, 0.5);
      this.root.add(obj);
      this.labelObjects.push(obj);
    };
    // Space labels apart when levels are close.
    const place = (items: [string, number][], px: number, anchor: number) => {
      let last = Number.POSITIVE_INFINITY;
      for (const [text, v] of items) {
        const py = Math.min(y(v), last - 0.34);
        last = py;
        make(text, px, py, anchor);
      }
    };
    place(left, x - BODY / 2 - 0.12, 1);
    place(right, x + BODY / 2 + 0.12, 0);
  }

  private clearCandles() {
    for (const c of this.candles) {
      gsap.killTweensOf(c.group.scale);
      c.materials.forEach((m) => m.dispose());
      this.root.remove(c.group);
    }
    this.candles = [];
    for (const l of this.labelObjects) {
      l.element.remove();
      this.root.remove(l);
    }
    this.labelObjects = [];
    this.hovered = null;
  }

  private frameCamera(count: number) {
    // Labels need about 2.4 units on each side of the labelled candle.
    const width = this.anatomy ? 5.6 : Math.max(3, count * SPACING + 1.6);
    const dist =
      Math.max(8, width * 1.45) /
      Math.min(1.25, Math.max(0.7, this.camera.aspect / 1.6));
    // Three-quarter view from slightly above, so the depth of bodies and wicks shows.
    this.camera.position.set(this.focusX + width * 0.42, HEIGHT * 1.35, dist);
    this.controls.target.set(this.focusX, HEIGHT / 2, 0);
    this.controls.update();
  }

  private resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    // The canvas follows its container (never the other way around, or grids grow on phones).
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.candles.length) this.frameCamera(this.candles.length);
    this.requestRender();
  }

  private pick() {
    const targets = this.candles.flatMap((c) => [c.body, ...c.wicks]);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const index = hit ? (hit.object.userData.index as number) : null;
    if (index === this.hovered) return;
    this.hovered = index;
    this.candles.forEach((c, i) =>
      c.materials.forEach(
        (m) => (m.emissiveIntensity = i === index ? 0.45 : c.dim ? 0.04 : 0.16),
      ),
    );
    this.renderer.domElement.style.cursor = index === null ? "grab" : "pointer";
    this.opts.onHover?.(index);
    this.requestRender();
  }

  private needsRender = true;
  private requestRender() {
    this.needsRender = true;
    if (this.opts.reducedMotion) this.loop();
  }

  /** Animated: renders every visible frame (gentle sway). Reduced motion: renders on demand. */
  private loop = () => {
    cancelAnimationFrame(this.frame);
    if (
      this.disposed ||
      !this.visible ||
      document.visibilityState !== "visible"
    )
      return;
    if (!this.opts.reducedMotion) {
      const t = (performance.now() - this.started) / 1000;
      if (!gsap.isTweening(this.root.rotation))
        this.root.rotation.y = this.yaw + Math.sin(t * 0.35) * 0.1;
      this.controls.update();
      this.renderFrame();
      this.frame = requestAnimationFrame(this.loop);
      return;
    }
    if (this.needsRender) this.renderFrame();
  };

  private renderFrame() {
    this.needsRender = false;
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}

/** True when the browser can create a WebGL context. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
