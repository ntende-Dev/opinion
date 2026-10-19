import * as THREE from "three";

/**
 * A single printed broadside, rendered live.
 *
 * The pipeline is the one from the 3d-paper-material reference build: a fibre
 * height field baked once into a half-float target, a torn-deckle silhouette
 * painted into a mask with the frayed fibres standing proud of it, four offset
 * layers to give the sheet a thickness, and a lit pass that lets a little
 * daylight through the thinnest parts. Everything is procedural — no image
 * files are fetched and no texture is generated off-device.
 *
 * Two deliberate departures from the reference scene, because this sheet sits
 * on a paper-white page rather than hanging in a dark room:
 *
 *   1. The room is gone. The canvas is transparent and a shadow-catching plane
 *      grounds the sheet, so the page itself reads as the surface it lies on.
 *   2. There is no macro window. The whole sheet is baked at one texel density,
 *      which is what a broadside read at ~700px wide needs.
 */

/* ── the sheet ──────────────────────────────────────────────────────────── */

const SW = 2.2; // sheet width in scene units
const SH = 1.52; // sheet height
const M = 0.055; // margin the torn edges are allowed to wander into
const GW = SW + 2 * M;
const GH = SH + 2 * M;

const PPU = 620; // baked texels per unit
const BW = Math.round((GW * PPU) / 8) * 8;
const BH = Math.round((GH * PPU) / 8) * 8;
const TS = 2600; // tear samples per unit

const SEG_X = 132;
const SEG_Y = 92;

const CREASE = { c: [0.6, 0.0] as [number, number], dir: [0.16, 1.0] as [number, number] };

/**
 * A neutral wove stock, kept deliberately close to the site's paper white.
 * A warm cream here would pull the page toward the templated look the design
 * brief rules out, so the sheet is cool-neutral and the warmth comes from the
 * light, not the pigment.
 */
const STOCK = {
  tint: 0xf5f5f2,
  rough: 0.92,
  sheen: 0.26,
  alb: [0.2, 0.06] as [number, number],
  height: 0.0028,
  thick: 0.0075,
  fa: [13, 21] as [number, number],
  fb: [19, 12] as [number, number],
  fibreRelief: 0.3,
  tooth: 420,
  toothAmp: 0.16,
  laid: [0, 0, 0] as [number, number, number],
  speck: [235, 0.9992] as [number, number],
  crease: 0.72,
  trans: 0.3,
  edgeTone: [0.955, 0.95, 0.925] as [number, number, number],
  tearA: [5, 92, 5, 88] as [number, number, number, number],
  fray: [0, 1.1, 0, 1.1] as [number, number, number, number],
  frayScale: 7,
  feather: 4.4,
  age: 0.1,
  seed: 23,
};

/* ── noise (verbatim from the reference build) ──────────────────────────── */

const NOISE = /* glsl */ `
  vec2 hash2(vec2 p){
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return fract(sin(p)*43758.5453123)*2.0-1.0;
  }
  float hash1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
  float gnoise(vec2 x){
    vec2 p = floor(x), w = fract(x);
    vec2 u = w*w*w*(w*(w*6.0-15.0)+10.0);
    float a = dot(hash2(p+vec2(0,0)), w-vec2(0,0));
    float b = dot(hash2(p+vec2(1,0)), w-vec2(1,0));
    float c = dot(hash2(p+vec2(0,1)), w-vec2(0,1));
    float d = dot(hash2(p+vec2(1,1)), w-vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y)*0.7+0.5;
  }
  float fbm(vec2 p, int oct){
    float s=0.0,a=0.5,n=0.0;
    for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*gnoise(p); n+=a; p=p*2.03+11.7; a*=0.5; }
    return s/max(n,1e-4);
  }
  float ridged(vec2 p, int oct){
    float s=0.0,a=0.5,n=0.0;
    for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*(1.0-abs(gnoise(p)*2.0-1.0)); n+=a; p=p*2.11+5.3; a*=0.5; }
    return s/max(n,1e-4);
  }
`;

/* ── deterministic helpers ──────────────────────────────────────────────── */

const lcg = (seed: number) => {
  let sd = seed | 0;
  return () => {
    sd = (sd * 1664525 + 1013904223) & 0xffffffff;
    return (sd >>> 8) / 16777216;
  };
};

const h1 = (i: number, s: number) => {
  let n = (Math.imul(i, 374761393) + Math.imul(s, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

const n1 = (x: number, s: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = h1(i, s);
  return a + (h1(i + 1, s) - a) * u;
};

const fbmJ = (x: number, s: number, o: number) => {
  let v = 0;
  let a = 0.5;
  let n = 0;
  for (let k = 0; k < o; k++) {
    v += a * n1(x, s + k * 31);
    n += a;
    x *= 2.07;
    a *= 0.5;
  }
  return v / n;
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ── the tear ───────────────────────────────────────────────────────────── */

/** A torn edge is not a wave: it runs, turns, runs, and frays at the finest scale. */
function tearLine(n: number, A: number, rf: () => number, seed: number) {
  const y = new Float32Array(n);
  let s = 0;
  let v = 0;
  let m = 0;
  let q = 0;
  for (let i = 0; i < n; i++) {
    s += -s * 0.08 + (rf() - 0.5) * 0.4;
    if (rf() < 0.006) s += (rf() - 0.5) * 4.0;
    v += s * 0.5;
    v -= v * 0.02;
    y[i] = v;
    m += v;
    q += v * v;
  }
  m /= n;
  const sd = Math.sqrt(Math.max(1e-6, q / n - m * m));
  for (let i = 0; i < n; i++) {
    y[i] =
      A *
        (0.14 * ((y[i] - m) / sd) +
          1.7 * (fbmJ(i / 320, seed, 2) - 0.5) +
          0.55 * (fbmJ(i / 64, seed + 3, 2) - 0.5) +
          0.16 * (fbmJ(i / 9, seed + 7, 2) - 0.5)) +
      (rf() - 0.5) * 0.45;
  }
  return y;
}

type Edge = { n: number; edge: Float32Array; fib: Float32Array; feather: Float32Array };

function buildEdge(
  n: number,
  A: number,
  rf: () => number,
  seed: number,
  kind: number,
  frayAmt: number,
  frayScale: number,
  featherScale: number,
): Edge {
  const edge = tearLine(n, A, rf, seed);
  const fib: number[] = [];
  if (frayAmt > 0) {
    for (let x = 0; x < n; x += 0.45 + rf() * 0.9) {
      if (rf() < 0.35) continue;
      const i = Math.min(n - 1, x | 0);
      const yE = edge[i];
      const long = rf() < 0.05;
      const len = (long ? 5 + rf() * 10 : 0.8 + rf() * rf() * 5.5) * frayScale;
      const ang = Math.PI / 2 + (rf() - 0.5) * (long ? 2.2 : 1.7);
      const y0 = yE - rf() * 2.2;
      const dx = Math.cos(ang) * len;
      const dy = Math.sin(ang) * len;
      const al = long ? 0.18 + rf() * 0.22 : 0.3 + rf() * 0.45;
      const lw = long ? 0.3 + rf() * 0.25 : 0.35 + rf() * 0.4;
      const bend = (rf() - 0.5) * len * 0.5;
      if (rf() > Math.min(1, frayAmt)) continue;
      fib.push(x, y0, dx, dy, bend, al, lw);
    }
  }
  const feather = new Float32Array(Math.ceil(n / 2));
  for (let i = 0, k = 0; i < n; i += 2, k++) {
    feather[k] =
      (0.4 + 3.2 * Math.pow(fbmJ(i / 26, kind * 13 + 4, 3), 2.2) + 0.6 * n1(i / 3.1, kind + 5)) *
      featherScale *
      (frayAmt > 0 ? 1 : 0.25);
  }
  return { n, edge, fib: new Float32Array(fib), feather };
}

function buildModel(seed: number) {
  const rf = lcg(0x9e3779b9 ^ seed);
  const lens = [SW, SH, SW, SH];
  return {
    sides: lens.map((len, k) =>
      buildEdge(
        Math.floor(len * TS) + 1,
        STOCK.tearA[k],
        rf,
        seed + k * 17 + 3,
        k,
        STOCK.fray[k],
        STOCK.frayScale,
        STOCK.feather,
      ),
    ),
  };
}

/* ── the ink ────────────────────────────────────────────────────────────── */

/** Painted in milli-units of the sheet plane (canvas y down, origin top-left). */
function paintInk(g: CanvasRenderingContext2D, ctxScale: number, lines: string[], family: string) {
  const W = GW * 1000;
  const H = GH * 1000;
  g.save();
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  g.lineJoin = "round";
  g.lineCap = "round";
  /* The bleed halo sits below the ink threshold, so only the fibres carry it out. */
  g.shadowColor = "rgba(0,0,0,0.72)";
  g.shadowBlur = 4.2 * ctxScale;
  g.textAlign = "center";
  g.textBaseline = "middle";

  let size = 218; // ≈64 css px on a 680px-wide plate
  const maxW = W * 0.76;
  g.font = `400 ${size}px ${family}`;
  for (const line of lines) {
    while (g.measureText(line).width > maxW && size > 48) {
      size *= 0.96;
      g.font = `400 ${size}px ${family}`;
    }
  }

  const lh = size * 1.18;
  const total = lh * lines.length;
  let y = H / 2 - total / 2 + lh / 2 - H * 0.012;
  for (const line of lines) {
    g.fillText(line, W / 2, y);
    y += lh;
  }
  g.restore();
}

/* ── the masks ──────────────────────────────────────────────────────────── */

/*
  R thin (the pale feathered strip inside a tear)
  G silhouette
  B ink (with its bleed halo)
  A blurred silhouette (used to toast the edge)
*/
function paintMasks(W: number, H: number, model: ReturnType<typeof buildModel>, out: Uint8Array, lines: string[], family: string) {
  const kx = W / GW;
  const ky = H / GH;
  const ppu = kx;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const silC = mk();
  const thinC = mk();
  const inkC = mk();
  const ageC = mk();
  const gs = silC.getContext("2d")!;
  const gt = thinC.getContext("2d")!;
  const gi = inkC.getContext("2d")!;
  const ga = ageC.getContext("2d")!;
  gs.fillStyle = "#000";
  gs.fillRect(0, 0, W, H);
  gt.fillStyle = "#000";
  gt.fillRect(0, 0, W, H);

  const step = Math.max(1, Math.floor(TS / (kx * 1.5)));
  const S = model.sides;
  const poly: number[] = [];
  for (let i = 0; i < S[0].n; i += step) poly.push(M + i / TS, M - S[0].edge[i] / TS);
  for (let j = 0; j < S[1].n; j += step) poly.push(M + SW + S[1].edge[j] / TS, M + j / TS);
  for (let i = S[2].n - 1; i >= 0; i -= step) poly.push(M + i / TS, M + SH + S[2].edge[i] / TS);
  for (let j = S[3].n - 1; j >= 0; j -= step) poly.push(M - S[3].edge[j] / TS, M + j / TS);
  const tracePoly = (g: CanvasRenderingContext2D) => {
    g.beginPath();
    g.moveTo(poly[0], poly[1]);
    for (let k = 2; k < poly.length; k += 2) g.lineTo(poly[k], poly[k + 1]);
    g.closePath();
  };

  const base: [number, number, number, number, number, number] = [kx, 0, 0, ky, 0, 0];
  gs.setTransform(...base);
  gs.fillStyle = "#fff";
  tracePoly(gs);
  gs.fill();

  const sideM = (k: number): [number, number, number, number, number, number] => {
    const e = M * kx;
    const f = M * ky;
    const ex = (M + SW) * kx;
    const fy = (M + SH) * ky;
    return [
      [kx / TS, 0, 0, -ky / TS, e, f],
      [0, ky / TS, kx / TS, 0, ex, f],
      [kx / TS, 0, 0, ky / TS, e, fy],
      [0, ky / TS, -kx / TS, 0, e, f],
    ][k] as [number, number, number, number, number, number];
  };

  gs.strokeStyle = "#fff";
  gs.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const m = sideM(k);
    const fb = S[k].fib;
    const N = fb.length / 7;
    gs.setTransform(...m);
    const px = Math.abs(m[0]) + Math.abs(m[1]);
    for (let q = 0; q < N; q++) {
      const o = q * 7;
      const x = fb[o];
      const y0 = fb[o + 1];
      const dx = fb[o + 2];
      const dy = fb[o + 3];
      const bend = fb[o + 4];
      const cx = m[0] * x + m[2] * y0 + m[4];
      const cy = m[1] * x + m[3] * y0 + m[5];
      if (cx < -60 || cy < -60 || cx > W + 60 || cy > H + 60) continue;
      gs.globalAlpha = Math.min(1, fb[o + 5] * 1.25);
      gs.lineWidth = Math.max(fb[o + 6] * 1.7, 0.7 / px);
      gs.beginPath();
      gs.moveTo(x, y0);
      gs.quadraticCurveTo(x + dx / 2 + bend, y0 + dy / 2, x + dx, y0 + dy);
      gs.stroke();
    }
    gs.globalAlpha = 1;

    /* The feathered strip: paper thinner than the sheet, inside the tear. */
    gt.setTransform(...m);
    gt.fillStyle = "#fff";
    gt.shadowColor = "#fff";
    gt.shadowBlur = 1.2;
    const ed = S[k].edge;
    const fe = S[k].feather;
    const n = S[k].n;
    gt.beginPath();
    gt.moveTo(0, ed[0]);
    for (let i = 0, q = 0; i < n; i += 2, q++) gt.lineTo(i, ed[i] - fe[q]);
    for (let i = (n - 1) & ~1; i >= 0; i -= 2) gt.lineTo(i, ed[i] + 0.4);
    gt.closePath();
    gt.fill();
  }
  gt.setTransform(1, 0, 0, 1, 0, 0);

  /* Edge age: the silhouette, blurred off to the side so only the blur lands. */
  const X = 20000;
  ga.setTransform(kx, 0, 0, ky, X, 0);
  ga.shadowColor = "#000";
  ga.shadowBlur = 0.075 * ppu;
  ga.shadowOffsetX = -X;
  ga.shadowOffsetY = 0;
  ga.fillStyle = "#000";
  tracePoly(ga);
  ga.fill();

  gi.setTransform(kx / 1000, 0, 0, ky / 1000, 0, 0);
  paintInk(gi, ppu * 0.0045, lines, family);

  const D = [thinC, silC, inkC, ageC].map((c) => c.getContext("2d")!.getImageData(0, 0, W, H).data);
  for (let r = 0; r < H; r++) {
    const dr = H - 1 - r;
    for (let x = 0; x < W; x++) {
      const s = (r * W + x) * 4;
      const o = (dr * W + x) * 4;
      out[o] = D[0][s];
      out[o + 1] = D[1][s];
      out[o + 2] = D[2][s + 3];
      out[o + 3] = D[3][s + 3];
    }
  }
}

/* ── the fibre field ────────────────────────────────────────────────────── */

function makeBakeMaterial() {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uQ0: { value: new THREE.Vector2() },
      uQs: { value: new THREE.Vector2() },
      uFa: { value: new THREE.Vector2() },
      uFb: { value: new THREE.Vector2() },
      uTooth: { value: 300 },
      uToothAmp: { value: 0.1 },
      uLaid: { value: new THREE.Vector3() },
      uSpeck: { value: new THREE.Vector2() },
      uCrease: { value: 0.5 },
      uCr: { value: new THREE.Vector4() },
      uFibreRelief: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader:
      NOISE +
      `
      varying vec2 vUv; uniform vec2 uQ0,uQs,uFa,uFb,uSpeck; uniform float uTooth,uToothAmp,uCrease,uFibreRelief;
      uniform vec3 uLaid; uniform vec4 uCr;
      void main(){
        vec2 q = uQ0 + vUv*uQs;
        float fw = max(length(dFdx(q)), length(dFdy(q)));
        /* formation — the cloudy thick-and-thin of a couched sheet */
        float form = fbm(q*2.6, 4)*0.62 + fbm(q*7.4, 3)*0.38;
        vec2 qw = q + 0.014*vec2(gnoise(q*6.0) - 0.5, gnoise(q*6.0 + 13.3) - 0.5);
        float ta = (gnoise(q*2.1 + 9.0) - 0.5)*1.5;
        qw = mat2(cos(ta), -sin(ta), sin(ta), cos(ta))*qw;
        float fa = ridged(vec2(qw.x*uFa.x, qw.y*uFa.y), 3);
        float fb = ridged(vec2(qw.x*uFb.x, qw.y*uFb.y), 3);
        float fibre = max(smoothstep(0.91,0.995,fa), smoothstep(0.92,0.995,fb));
        fibre = mix(fibre, 0.12, smoothstep(0.16, 0.55, fw*112.0));
        float fa2 = ridged(vec2(qw.x*uFa.x*2.7 + 3.1, qw.y*uFa.y*2.7), 2);
        float fb2 = ridged(vec2(qw.x*uFb.x*2.7, qw.y*uFb.y*2.7 + 7.7), 2);
        float fine = max(smoothstep(0.90,0.99,fa2), smoothstep(0.90,0.99,fb2));
        fine = mix(fine, 0.06, smoothstep(0.16, 0.55, fw*112.0*2.7));
        fibre = max(fibre, fine*0.55);
        float speck = smoothstep(uSpeck.y, 1.0, hash1(floor(q*uSpeck.x)));
        speck = mix(speck, 0.006, smoothstep(0.18, 0.50, fw*uSpeck.x));
        { vec2 cq = (fract(q*uSpeck.x) - 0.5)*vec2(1.0, 1.9); speck *= smoothstep(0.5, 0.12, length(cq)); }
        float tooth = gnoise(q*uTooth)*0.65 + gnoise(q*uTooth*2.7 + 5.0)*0.35;
        tooth = mix(tooth, 0.5, smoothstep(0.15, 0.55, fw*uTooth*1.3));
        float laid = 0.5, chain = 0.0;
        if (uLaid.x > 0.0){
          float wob = (gnoise(q*vec2(1.5, 9.0)) - 0.5)*0.6;
          laid = smoothstep(0.35, 1.0, 0.5 + 0.5*sin(6.2832*(q.y*uLaid.x + wob)));
          laid = mix(laid, 0.5, smoothstep(0.15, 0.5, fw*uLaid.x));
          float cx = (fract(q.x/0.19 + 0.5 + wob*0.02) - 0.5)*0.19;
          chain = exp(-pow(cx/0.0045, 2.0));
        }
        vec2 cd = normalize(uCr.zw);
        float dd = dot(q - uCr.xy, vec2(-cd.y, cd.x)) + (gnoise(q*30.0) - 0.5)*0.0022;
        float crease = exp(-pow(dd/0.0030, 2.0))*uCrease;
        float crease2 = exp(-pow(dd/0.020, 2.0))*uCrease;
        float white = crease*(0.35 + 0.65*gnoise(q*380.0));
        float h = 0.5 + (form - 0.5)*0.12 + fibre*uFibreRelief*0.34 + (tooth - 0.5)*uToothAmp
                - speck*0.20 + (laid - 0.5)*uLaid.y*0.16 - chain*uLaid.z*0.10 - crease*0.55 - crease2*0.06;
        float formT = form + (0.5 - laid)*uLaid.y*0.12 - chain*uLaid.z*0.14 - crease*0.10;
        gl_FragColor = vec4(h, formT, min(1.0, fibre + white*0.6), speck);
      }`,
  });
}

/* ── the scene ──────────────────────────────────────────────────────────── */

export type PaperScene = {
  setReducedMotion(v: boolean): void;
  setPointer(nx: number, ny: number): void;
  dispose(): void;
  debug: {
    render(): void;
    info(): Record<string, unknown>;
    grid(cols: number, rows: number): string[];
    sample(x: number, y: number): [number, number, number, number];
    reduced(v: boolean): void;
  };
};

export type PaperSceneOptions = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  lines: string[];
  fontFamily: string;
  reducedMotion: boolean;
  onReady?: () => void;
};

export function createPaperScene(o: PaperSceneOptions): PaperScene {
  const renderer = new THREE.WebGLRenderer({
    canvas: o.canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  THREE.ColorManagement.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);

  /* ── the fibre bake ── */
  const bakeMat = makeBakeMaterial();
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat));

  const rtBase = new THREE.WebGLRenderTarget(BW, BH, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
    samples: 0,
  });
  rtBase.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const maskBase = new THREE.DataTexture(new Uint8Array(BW * BH * 4), BW, BH, THREE.RGBAFormat, THREE.UnsignedByteType);
  maskBase.minFilter = THREE.LinearMipmapLinearFilter;
  maskBase.magFilter = THREE.LinearFilter;
  maskBase.generateMipmaps = true;
  maskBase.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  maskBase.flipY = false;

  function bake() {
    const u = bakeMat.uniforms;
    u.uQ0.value.set(-GW / 2, -GH / 2);
    u.uQs.value.set(GW, GH);
    u.uFa.value.set(...STOCK.fa);
    u.uFb.value.set(...STOCK.fb);
    u.uTooth.value = STOCK.tooth;
    u.uToothAmp.value = STOCK.toothAmp;
    u.uLaid.value.set(...STOCK.laid);
    u.uSpeck.value.set(...STOCK.speck);
    u.uCrease.value = STOCK.crease;
    u.uCr.value.set(CREASE.c[0], CREASE.c[1], CREASE.dir[0], CREASE.dir[1]);
    u.uFibreRelief.value = STOCK.fibreRelief;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rtBase);
    renderer.render(quadScene, quadCam);
    renderer.setRenderTarget(prev);
  }

  /* ── shared uniforms ── */
  const dummyTex = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, THREE.RGBAFormat);
  dummyTex.needsUpdate = true;

  const SU = {
    tFB: { value: rtBase.texture },
    tMB: { value: maskBase },
    uTint: { value: new THREE.Color(STOCK.tint) },
    uHeight: { value: STOCK.height },
    uBack: { value: 0.22 },
    uTr: { value: STOCK.trans },
    uAge: { value: STOCK.age },
    uAlb: { value: new THREE.Vector2(...STOCK.alb) },
    uHs: { value: new THREE.Vector2(GW / 2, GH / 2) },
    uEdgeTone: { value: new THREE.Vector3(...STOCK.edgeTone) },
  };

  function paperMat(layer: number) {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: STOCK.rough,
      metalness: 0,
      side: THREE.DoubleSide,
      sheen: STOCK.sheen,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xffffff),
      specularIntensity: 0.35,
      bumpMap: dummyTex,
      bumpScale: 1,
      alphaToCoverage: true,
    });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, SU, { uLayer: { value: layer } });
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vSUv;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSUv = uv;");
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec2 vSUv;
          uniform sampler2D tFB, tMB; uniform float uHeight, uBack, uTr, uAge, uLayer;
          uniform vec3 uTint, uEdgeTone; uniform vec2 uHs, uAlb;
          ${NOISE}`,
        )
        .replace(
          "#include <bumpmap_pars_fragment>",
          `
          vec2 dHdxy_fwd(){
            vec2 dx = dFdx(vSUv), dy = dFdy(vSUv);
            float H0 = texture2D(tFB, vSUv).x;
            return uHeight*vec2(texture2D(tFB, vSUv + dx).x - H0, texture2D(tFB, vSUv + dy).x - H0);
          }
          vec3 perturbNormalArb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection){
            vec3 sX = dFdx(surf_pos), sY = dFdy(surf_pos);
            vec3 R1 = cross(sY, surf_norm), R2 = cross(surf_norm, sX);
            float fDet = dot(sX, R1)*faceDirection;
            vec3 vGrad = sign(fDet)*(dHdxy.x*R1 + dHdxy.y*R2);
            return normalize(abs(fDet)*surf_norm - vGrad);
          }`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec2 pQ = (vSUv - 0.5)*2.0*uHs;
          vec4 pF = texture2D(tFB, vSUv);
          vec4 pM = texture2D(tMB, vSUv);
          float pInk = uLayer > 0.5 ? 0.0 : smoothstep(0.62, 0.85, pM.b + pF.b*0.40 + (0.5 - pF.g)*0.50 + (gnoise(pQ*210.0) - 0.5)*0.16)*smoothstep(0.03, 0.16, pM.b);
          float eD = smoothstep(0.55, 1.0, pM.a);
          float toast = (1.0 - eD)*smoothstep(0.12, 0.45, pM.a)*uAge*(0.55 + 0.9*fbm(pQ*9.0, 3));
          float fox = smoothstep(0.80, 0.90, fbm(pQ*13.0 + 3.0, 3))*uAge*0.6*(0.25 + 0.75*(1.0 - eD));
          float pd = 0.92 + (pF.g - 0.5)*uAlb.x + pF.b*uAlb.y + pM.r*0.05;
          vec3 alb = uTint*pd;
          alb = mix(alb, vec3(0.30, 0.22, 0.14)*uTint*2.2, clamp(pF.a*0.7, 0.0, 0.8));
          alb = mix(alb, alb*vec3(0.72, 0.60, 0.44), clamp(toast, 0.0, 1.0)*0.9);
          alb = mix(alb, alb*vec3(0.74, 0.64, 0.50), clamp(fox, 0.0, 1.0));
          /* the house ink: #111827 */
          alb = mix(alb, vec3(0.0075, 0.0106, 0.0203), pInk*0.97);
          if (uLayer > 0.5) alb = uTint*uEdgeTone*(0.92 + 0.16*pF.b);
          diffuseColor.rgb = alb;
          /* Lit through, not on: daylight behind the sheet, held back where the sheet is thick. */
          float ptr = 0.74 + (0.5 - pF.g)*0.85 + (0.5 - fbm(pQ*1.1 + 7.0, 3))*0.45 - pF.b*0.22 - pF.a*0.45;
          ptr = max(0.0, ptr*uTr + pM.r*0.45*uTr) * (1.0 - pInk*0.93);
          vec3 pBack = vec3(1.0, 0.985, 0.955)*ptr*mix(vec3(1.0), uTint, 0.35)*uBack*(uLayer > 0.5 ? 0.7 : 1.0);`,
        )
        .replace("#include <alphamap_fragment>", "#include <alphamap_fragment>\n          diffuseColor.a *= smoothstep(0.04, 0.55, pM.g);")
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (0.5 - pF.x)*0.28 - pInk*0.30, 0.3, 1.0);`,
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n          totalEmissiveRadiance += pBack;");
    };
    m.customProgramCacheKey = () => `paper${layer}`;
    return m;
  }

  /* ── the sheet's shape: a soft bow, one opened crease, one rolled corner ── */
  const CURL = 0.42;

  function displace(x: number, y: number, out: number[]) {
    const t = (GH / 2 - y) / GH; // 0 top … 1 bottom
    let X = x;
    let Y = y;
    let Z = 0.055 * Math.pow(t, 1.35) * (1 - Math.pow((2 * x) / GW, 2)) + 0.03 * (x / GW) * t;

    const cl = Math.hypot(CREASE.dir[0], CREASE.dir[1]);
    const d = ((x - CREASE.c[0]) * -CREASE.dir[1] + (y - CREASE.c[1]) * CREASE.dir[0]) / cl;
    Z += -0.05 * (Math.sqrt(d * d + 0.028 * 0.028) - 0.028) * (0.15 + 0.85 * t);

    /* lower-right corner rolled toward the viewer: a proper cylinder roll, so length is kept */
    const nx = 0.62;
    const ny = -0.78;
    const R = 0.2;
    const th = 2.4 * CURL;
    const p0x = SW / 2 - nx * 0.55;
    const p0y = -SH / 2 - ny * 0.55;
    const s = (x - p0x) * nx + (y - p0y) * ny;
    if (s > 0 && th > 0.001) {
      const thc = Math.min(s / R, th);
      const a = R * Math.sin(thc) + (s - R * thc) * Math.cos(thc);
      const b = R * (1 - Math.cos(thc)) + (s - R * thc) * Math.sin(thc);
      X = x - nx * s + nx * a;
      Y = y - ny * s + ny * a;
      Z += b;
    }
    out[0] = X;
    out[1] = Y;
    out[2] = Z;
    return out;
  }

  const geoFront = new THREE.PlaneGeometry(GW, GH, SEG_X, SEG_Y);
  const layerGeos = [1, 2, 3].map(() => geoFront.clone());
  const tmp = [0, 0, 0];

  function shapeSheet() {
    const P = geoFront.attributes.position;
    const flat = geoFront.userData.flat || (geoFront.userData.flat = P.array.slice());
    for (let i = 0; i < P.count; i++) {
      displace(flat[i * 3], flat[i * 3 + 1], tmp);
      P.setXYZ(i, tmp[0], tmp[1], tmp[2]);
    }
    P.needsUpdate = true;
    geoFront.computeVertexNormals();
    geoFront.computeBoundingSphere();
    geoFront.computeBoundingBox();
    const N = geoFront.attributes.normal;
    layerGeos.forEach((g, k) => {
      const Q = (g as THREE.BufferGeometry).attributes.position;
      const off = STOCK.thick * ((k + 1) / 3);
      for (let i = 0; i < P.count; i++) {
        Q.setXYZ(i, P.getX(i) - N.getX(i) * off, P.getY(i) - N.getY(i) * off, P.getZ(i) - N.getZ(i) * off);
      }
      Q.needsUpdate = true;
      (g as THREE.BufferGeometry).attributes.normal.array.set(N.array);
      (g as THREE.BufferGeometry).attributes.normal.needsUpdate = true;
      (g as THREE.BufferGeometry).computeBoundingSphere();
      (g as THREE.BufferGeometry).computeBoundingBox();
    });
  }

  const matFront = paperMat(0);
  const matLayer = paperMat(1);
  const sheet = new THREE.Mesh(geoFront, matFront);
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  sheet.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaMap: maskBase,
    alphaTest: 0.5,
  });
  scene.add(sheet);
  const layers = layerGeos.map((g) => {
    const m = new THREE.Mesh(g, matLayer);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  });

  /* ── ground: a shadow catcher only, so the page shows through ── */
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 8),
    new THREE.ShadowMaterial({ color: 0x101c30, opacity: 0.16, depthWrite: false, transparent: true }),
  );
  catcher.position.set(0, 0, -0.06);
  catcher.receiveShadow = true;
  scene.add(catcher);

  /* ── lights ── */
  const key = new THREE.SpotLight(0xfff4e4, 105, 0, 0.46, 1.0, 2.0);
  key.position.set(-4.2, 2.6, 3.9);
  key.target.position.set(0.1, -0.05, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 6;
  key.shadow.blurSamples = 20;
  key.shadow.camera.near = 3;
  key.shadow.camera.far = 14;
  scene.add(key, key.target);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 0.95);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xfff8ee, 0.34);
  fill.position.set(2.4, 0.8, 4.0);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe6edf8, 0.22);
  rim.position.set(3.2, 0.5, 2.0);
  scene.add(rim);

  /* ── build the maps and the shape ── */
  const model = buildModel(STOCK.seed);
  paintMasks(BW, BH, model, maskBase.image.data as Uint8Array, o.lines, o.fontFamily);
  maskBase.needsUpdate = true;
  bake();
  shapeSheet();
  renderer.shadowMap.needsUpdate = true;

  /* ── camera ── */
  let W = 1;
  let H = 1;
  let reduced = o.reducedMotion;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = 0;

  function resize() {
    const rect = o.host.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  function cameraDistance() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dH = (GH * 1.22) / (2 * tanH * 0.88);
    const dW = (GW * 1.16) / (2 * tanH * Math.max(0.2, camera.aspect));
    return Math.max(dH, dW);
  }

  function poseCamera() {
    const d = cameraDistance();
    const swayX = reduced ? 0 : Math.sin(clock * 0.17) * 0.16;
    const swayY = reduced ? 0 : Math.sin(clock * 0.11 + 1.0) * 0.045;
    camera.position.set(-0.3 + swayX + pointer.x * 0.09, 0.1 + swayY + pointer.y * 0.06, d);
    camera.lookAt(0.02, -0.01, 0);
  }

  function renderNow() {
    poseCamera();
    renderer.render(scene, camera);
  }

  /* ── loop ── */
  let raf = 0;
  let running = false;
  let inView = true;
  let pointerSettling = false;
  let ready = false;

  function frame(now: number) {
    running = false;
    if (!inView || document.hidden) return;
    if (!reduced) clock = now / 1000;
    const px = pointer.tx;
    const py = pointer.ty;
    pointerSettling = Math.abs(pointer.x - px) > 0.001 || Math.abs(pointer.y - py) > 0.001;
    pointer.x += (px - pointer.x) * 0.06;
    pointer.y += (py - pointer.y) * 0.06;
    renderNow();
    if (!ready) {
      ready = true;
      o.onReady?.();
    }
    if (!reduced || pointerSettling) schedule();
  }

  function schedule() {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  resize();
  renderNow();
  if (!ready) {
    ready = true;
    o.onReady?.();
  }
  if (!reduced) schedule();

  /* ── observers ── */
  const ro = new ResizeObserver(() => {
    resize();
    renderer.shadowMap.needsUpdate = true;
    renderNow();
  });
  ro.observe(o.host);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        if (inView) {
          renderNow();
          schedule();
        }
      }
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(o.host);

  const onVisibility = () => {
    if (!document.hidden) {
      renderNow();
      schedule();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  /* ── debug (local only, or ?paperDebug) ── */
  const debugOn =
    typeof location !== "undefined" &&
    (location.search.includes("paperDebug") || location.hostname === "localhost" || location.hostname === "127.0.0.1");

  const debug: PaperScene["debug"] = {
    render: () => renderNow(),
    reduced: (v: boolean) => {
      reduced = v;
      if (raf) cancelAnimationFrame(raf);
      running = false;
      renderNow();
    },
    info: () => ({
      size: [W, H],
      dpr: renderer.getPixelRatio(),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
      programs: renderer.info.programs?.length ?? 0,
      reduced,
      ready,
    }),
    sample: (x: number, y: number) => {
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      const dpr = renderer.getPixelRatio();
      gl.readPixels(Math.round(x * dpr), Math.round((H - y - 1) * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2], px[3]];
    },
    grid: (cols: number, rows: number) => {
      renderNow();
      const gl = renderer.getContext();
      const dpr = renderer.getPixelRatio();
      const w = Math.round(W * dpr);
      const h = Math.round(H * dpr);
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const ramp = " .:-=+*#%@";
      const out: string[] = [];
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < cols; c++) {
          const x0 = Math.floor((c * w) / cols);
          const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
          const y0 = Math.floor((r * h) / rows);
          const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
          let sum = 0;
          let n = 0;
          for (let y = y0; y < y1; y += 2) {
            for (let x = x0; x < x1; x += 2) {
              const yy = h - 1 - y;
              const i = (yy * w + x) * 4;
              const a = buf[i + 3] / 255;
              /* composite over the page's white so the alpha sheet reads */
              const l = (buf[i] * 0.2126 + buf[i + 1] * 0.7152 + buf[i + 2] * 0.0722) * a + 255 * (1 - a);
              sum += l;
              n++;
            }
          }
          const v = n ? sum / n / 255 : 1;
          line += ramp[Math.min(ramp.length - 1, Math.max(0, Math.round(v * (ramp.length - 1))))];
        }
        out.push(line);
      }
      return out;
    },
  };

  if (debugOn) {
    (window as unknown as Record<string, unknown>).__paper = debug;
  }

  return {
    setReducedMotion(v: boolean) {
      reduced = v;
      if (v) {
        if (raf) cancelAnimationFrame(raf);
        running = false;
        renderNow();
      } else {
        schedule();
      }
    },
    setPointer(nx: number, ny: number) {
      pointer.tx = Math.max(-1, Math.min(1, nx));
      pointer.ty = Math.max(-1, Math.min(1, ny));
      pointerSettling = true;
      schedule();
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (debugOn) delete (window as unknown as Record<string, unknown>).__paper;
      rtBase.dispose();
      maskBase.dispose();
      dummyTex.dispose();
      geoFront.dispose();
      layerGeos.forEach((g) => g.dispose());
      matFront.dispose();
      matLayer.dispose();
      catcher.geometry.dispose();
      (catcher.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    debug,
  };
}
