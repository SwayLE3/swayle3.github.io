import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- Tête en arrière-plan, avec le site qui se reflète dans les lunettes ---------- */

const MODEL_URL = 'assets/models/memoji.glb';
const LENS_NAME = 'eyewear_emoji_lenz';
// false = physiquement juste (le site te fait face, son reflet se lit à l'endroit).
// true = reflet en miroir, comme si la tête lisait le site par derrière.
const MIRROR = false;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('bg3d');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
} catch {
  canvas.remove();
  throw new Error('WebGL indisponible, tête 3D désactivée.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Neutral garde les teintes claires (peau, cheveux) ; ACES les délavait vers le blanc.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.1;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 500);

// Lumière principale chaude, plus un contre-jour bleuté accordé à la couleur d'accent du site.
const key = new THREE.DirectionalLight(0xfff1dc, 1.1);
key.position.set(-30, 40, 60);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8ab8ff, 1.6);
rim.position.set(40, 20, -40);
scene.add(rim);

/* ---------- Copie du site dessinée dans un canvas 2D ---------- */
// WebGL ne sait pas afficher du HTML : on redessine le site à partir de la position réelle
// de ses éléments. Le reflet suit donc le scroll en direct.

const mirror = document.createElement('canvas');
const ctx = mirror.getContext('2d');
const MIRROR_W = 768;
const mirrorTex = new THREE.CanvasTexture(mirror);
mirrorTex.colorSpace = THREE.SRGBColorSpace;
mirrorTex.minFilter = THREE.LinearMipmapLinearFilter;
mirrorTex.anisotropy = 4;

const css = getComputedStyle(document.documentElement);
const C = {
  bg: css.getPropertyValue('--bg').trim() || '#121212',
  line: css.getPropertyValue('--line-strong').trim() || 'rgba(255,255,255,.14)',
  accent: css.getPropertyValue('--accent').trim() || '#0075ff',
};

const BOXES = '.nav-pill, .frame, .frame-img img';
const WORDS = 'h1, h3, .row-title, .label, .nav-links a';
const LINES = '.sub, .lede, .inline-links, .block-head p, .item > p, dd, dt, figcaption, .foot p';
const MONO = '.ascii, .code';

const range = document.createRange();
const inView = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;

function drawMirror() {
  const s = MIRROR_W / innerWidth;
  const h = Math.round(innerHeight * s);
  if (mirror.width !== MIRROR_W || mirror.height !== h) {
    mirror.width = MIRROR_W;
    mirror.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, MIRROR_W, h);
  ctx.setTransform(s, 0, 0, s, 0, 0);

  for (const el of document.querySelectorAll(BOXES)) {
    const r = el.getBoundingClientRect();
    if (!inView(r)) continue;
    const st = getComputedStyle(el);
    const bg = st.backgroundColor;
    const radius = Math.min(parseFloat(st.borderTopLeftRadius) || 0, r.height / 2);
    ctx.beginPath();
    ctx.roundRect(r.left, r.top, r.width, r.height, radius);
    if (el.tagName === 'IMG') {
      // Les captures : un aplat clair, assez pour qu'on les devine dans le reflet.
      ctx.fillStyle = 'rgba(160, 170, 190, .35)';
      ctx.fill();
      continue;
    }
    if (bg && bg !== 'rgba(0, 0, 0, 0)') { ctx.fillStyle = bg; ctx.fill(); }
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1 / s;
    ctx.stroke();
  }

  // Lignes de texte courant : de simples barres, illisibles à cette taille de toute façon.
  for (const el of document.querySelectorAll(LINES)) {
    const box = el.getBoundingClientRect();
    if (!inView(box)) continue;
    ctx.fillStyle = getComputedStyle(el).color;
    ctx.globalAlpha = 0.9;
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) {
      if (r.width < 2) continue;
      const th = r.height * 0.42;
      ctx.fillRect(r.left, r.top + (r.height - th) / 2, r.width, th);
    }
    ctx.globalAlpha = 1;
  }

  // Titres : les vrais mots, à leur place.
  ctx.textBaseline = 'alphabetic';
  for (const el of document.querySelectorAll(WORDS)) {
    const box = el.getBoundingClientRect();
    if (!inView(box)) continue;
    const st = getComputedStyle(el);
    ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    ctx.fillStyle = st.color;
    const upper = st.textTransform === 'uppercase';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(text))) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        if (!inView(r)) continue;
        const word = upper ? m[0].toUpperCase() : m[0];
        ctx.fillText(word, r.left, r.bottom - r.height * 0.18, r.width * 1.05);
      }
    }
  }

  // Blocs monospace (compte-tours, ASCII, code) : ligne par ligne.
  for (const el of document.querySelectorAll(MONO)) {
    const r = el.getBoundingClientRect();
    if (!inView(r)) continue;
    const st = getComputedStyle(el);
    const lines = el.textContent.split('\n');
    const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.3;
    ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    ctx.fillStyle = st.color;
    const padT = parseFloat(st.paddingTop) || 0, padL = parseFloat(st.paddingLeft) || 0;
    lines.forEach((line, i) => {
      const y = r.top + padT + lh * (i + 0.8);
      if (y > r.top && y < r.bottom) ctx.fillText(line, r.left + padL, y);
    });
  }

  mirrorTex.needsUpdate = true;
}

/* ---------- Matériau des verres ---------- */

const lensMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  uniforms: {
    uSite: { value: mirrorTex },
    uSpread: { value: 0.45 },
    uAspect: { value: 1 },
    uOffL: { value: new THREE.Vector2() },
    uOffR: { value: new THREE.Vector2() },
    uMirror: { value: MIRROR ? -1 : 1 },
    uTint: { value: new THREE.Color(0x050505) },
    uBoost: { value: 1.6 },
    uRim: { value: new THREE.Color(C.accent) },
  },
  vertexShader: /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vSide;
    void main() {
      vSide = position.x;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewPos = mv.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D uSite;
    uniform float uSpread;
    uniform float uAspect;
    uniform float uMirror;
    uniform vec3 uTint;
    uniform float uBoost;
    uniform vec3 uRim;
    uniform vec2 uOffL;
    uniform vec2 uOffR;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vSide;

    void main() {
      vec3 v = normalize(vViewPos);
      vec3 n = normalize(vNormal);
      if (dot(n, v) > 0.0) n = -n;               // toujours la face tournée vers nous
      vec3 r = reflect(v, n);                     // direction réfléchie, vers l'écran

      // Le verre bombé agit comme un petit miroir convexe : la direction réfléchie
      // indique quel point de l'écran (donc du site) on voit à cet endroit.
      // On recentre chaque verre (gauche / droit) pour qu'il montre le milieu du site au repos.
      vec2 d = r.xy - (vSide > 0.0 ? uOffL : uOffR);
      vec2 uv = 0.5 + vec2(d.x * uMirror, d.y * uAspect) * uSpread;
      float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      vec3 site = texture2D(uSite, clamp(uv, 0.0, 1.0)).rgb * inside;
      // Le fond du site est presque noir : on creuse les noirs et on pousse le texte
      // pour que le reflet ressorte bien sur le verre teinté.
      site = pow(max(site - 0.06, 0.0), vec3(0.85)) * uBoost;

      float facing = clamp(dot(n, -v), 0.0, 1.0);
      float fresnel = pow(1.0 - facing, 3.0);

      // Petit reflet spéculaire, comme un néon au-dessus de l'écran.
      float glint = smoothstep(0.985, 1.0, dot(r, normalize(vec3(-0.35, 0.55, 0.76))));

      vec3 col = uTint + site * (0.85 + 0.6 * fresnel) + uRim * fresnel * 0.25 + vec3(glint) * 0.7;
      float alpha = mix(0.82, 0.98, fresnel);
      gl_FragColor = vec4(col, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

/* ---------- Chargement du modèle ---------- */

const pivot = new THREE.Group();   // tourne autour du centre de la tête
scene.add(pivot);
let headSize = new THREE.Vector3(1, 1, 1);
let loaded = false;
let lens = null;
const headMaterials = [];   // tout sauf les verres, pour atténuer la tête sans éteindre le reflet

new GLTFLoader().load(MODEL_URL, gltf => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  headSize = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  pivot.add(model);

  model.traverse(o => {
    if (!o.isMesh) return;
    if (o.name.includes(LENS_NAME)) {
      // Normales lissées : sinon le reflet se casse en facettes.
      let g = o.geometry.clone();
      g.deleteAttribute('normal');
      g = mergeVertices(g, 1e-3);
      g.computeVertexNormals();
      o.geometry = g;
      o.material = lensMaterial;
      o.renderOrder = 2;
      lens = o;
    } else {
      o.material.userData.baseEmissive = o.material.emissiveIntensity ?? 1;
      headMaterials.push(o.material);
    }
  });

  loaded = true;
  layout();
  drawMirror();
  wake();
}, undefined, err => {
  console.warn('Tête 3D : chargement impossible', err);
  canvas.remove();
});

/* ---------- Mise en page, souris, rendu ---------- */

function layout() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // La tête occupe ~85 % de la hauteur sur ordinateur, un peu moins en portrait.
  const fill = w / h < 0.8 ? 0.6 : 0.85;
  const dist = (headSize.y / fill) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.position.set(0, 0, dist + headSize.z / 2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  lensMaterial.uniforms.uAspect.value = w / h;
  if (lens) calibrate();
}

// Direction réfléchie moyenne de chaque verre quand la tête regarde droit devant.
function calibrate() {
  const rot = pivot.rotation.clone(), y = pivot.position.y;
  pivot.rotation.set(0, 0, 0);
  pivot.position.y = 0;
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  const mv = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, lens.matrixWorld);
  const nm = new THREE.Matrix3().getNormalMatrix(mv);
  const pos = lens.geometry.attributes.position, nor = lens.geometry.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), r = new THREE.Vector3();
  const sum = { L: new THREE.Vector2(), R: new THREE.Vector2() }, cnt = { L: 0, R: 0 };
  for (let i = 0; i < pos.count; i++) {
    const side = pos.getX(i) > 0 ? 'L' : 'R';
    p.fromBufferAttribute(pos, i).applyMatrix4(mv).normalize();
    n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    if (n.dot(p) > 0) n.negate();
    if (n.dot(p) > -0.5) continue;               // ignore la tranche des verres
    r.copy(p).reflect(n);
    sum[side].x += r.x; sum[side].y += r.y; cnt[side]++;
  }
  if (cnt.L) lensMaterial.uniforms.uOffL.value.copy(sum.L.divideScalar(cnt.L));
  if (cnt.R) lensMaterial.uniforms.uOffR.value.copy(sum.R.divideScalar(cnt.R));

  pivot.rotation.copy(rot);
  pivot.position.y = y;
}

const target = { x: 0, y: 0 };
const look = { x: 0, y: 0 };
let raf = 0, mirrorDirty = true, lastMirror = 0, fade = 0, lastFrame = 0;
let lastScroll = scrollY, scrollVel = 0;
const BASE = { key: key.intensity, rim: rim.intensity, env: scene.environmentIntensity };

addEventListener('pointermove', e => {
  target.x = e.clientX / innerWidth * 2 - 1;
  target.y = e.clientY / innerHeight * 2 - 1;
  wake();
}, { passive: true });
document.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; wake(); });
addEventListener('scroll', () => { mirrorDirty = true; wake(); }, { passive: true });
addEventListener('resize', () => { layout(); mirrorDirty = true; wake(); });
// Filet de sécurité : on rafraîchit aussi le reflet après un clic (mode CRT, etc.).
document.addEventListener('pointerdown', () => { mirrorDirty = true; wake(); });

function frame(now) {
  raf = 0;
  if (!loaded) return;
  const k = reduceMotion ? 1 : 0.06;
  look.x += (target.x - look.x) * k;
  look.y += (target.y - look.y) * k;
  const idle = reduceMotion ? 0 : Math.sin(now / 1800) * 0.025;
  // Vitesse de scroll lissée : la tête suit un peu le contenu qui défile (et le reflet glisse avec).
  const sy = scrollY;
  scrollVel += ((sy - lastScroll) - scrollVel) * 0.15;
  lastScroll = sy;
  const scrollTilt = reduceMotion ? 0 : Math.max(-0.14, Math.min(0.14, scrollVel * 0.004));
  pivot.rotation.y = look.x * 0.38;
  pivot.rotation.x = look.y * 0.22 + idle + scrollTilt;
  pivot.position.y = reduceMotion ? 0 : Math.sin(now / 2400) * headSize.y * 0.006;

  applyDim();

  if (mirrorDirty || now - lastMirror > 250) {
    drawMirror();
    mirrorDirty = false;
    lastMirror = now;
  }
  renderer.render(scene, camera);

  // Apparition en fondu du canvas entier.
  const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16;
  lastFrame = now;
  fade = reduceMotion ? 1 : Math.min(1, fade + dt / 800);
  canvas.style.opacity = fade.toFixed(3);

  // On continue tant que la tête bouge ; sinon on dort jusqu'au prochain évènement.
  const moving = Math.abs(target.x - look.x) + Math.abs(target.y - look.y) + Math.abs(scrollVel) > 0.0005;
  if (moving || !reduceMotion) raf = requestAnimationFrame(frame);
}

function wake() { if (!raf) raf = requestAnimationFrame(frame); }

// Quand on descend dans le contenu, on baisse l'éclairage de la tête pour garder le texte lisible.
// Les verres ne sont pas éclairés par ces lumières : le reflet du site reste net et lumineux.
let lastDim = -1;
function applyDim() {
  const narrow = innerWidth <= 600;
  const top = narrow ? 0.55 : 1, low = narrow ? 0.22 : 0.3;
  const t = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.7)));
  const d = top + (low - top) * t;
  if (Math.abs(d - lastDim) < 0.002) return;
  lastDim = d;
  key.intensity = BASE.key * d;
  rim.intensity = BASE.rim * d;
  scene.environmentIntensity = BASE.env * d;
  for (const m of headMaterials) {
    if ('emissiveIntensity' in m) m.emissiveIntensity = m.userData.baseEmissive * d;
  }
}

layout();

