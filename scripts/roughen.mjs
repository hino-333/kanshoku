#!/usr/bin/env node
// ============================================================
//  仮素材の SVG に「Illustrator のラフ」のような手描きの揺れを焼き込む
// ============================================================
//  元データ：scripts/art-src/（幾何学的な形のままの SVG）
//  出力先  ：public/assets/（同じフォルダ名・同じファイル名で上書き）
//
//  使い方
//    npm run art:rough                         すべて作り直す
//    npm run art:rough -- food/onigiri.svg     1枚だけ作り直す
//    npm run art:rough -- --amp 2.2            揺れを強くする（表示サイズでの px）
//    npm run art:rough -- --amp 1 --seed 7     弱めに・別の揺れ方で
//
//  しくみ
//    1. rect / circle / ellipse / path をすべてパスに変換する
//    2. 輪郭を細かい点の列にし（表示サイズで約 3px ごと）
//    3. 各点を法線方向へ、なめらかなノイズ（正弦波の合成）の分だけずらし
//       なめらかな曲線でつなぐ（細かいギザギザではなく ゆるい凸凹にする）
//    4. 乱数の種は固定なので、何度実行しても同じ形になる
//  揺れの量は viewBox ではなく「実際に表示される大きさ」で決める（DISPLAY の表）。
//  小さい部品（目・海苔・きらきらなど）は、大きさに応じて揺れを弱める。
// ============================================================

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scripts/art-src');
const OUT = join(ROOT, 'public/assets');

// ------------------------------------------------------------ 設定
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
/** 揺れの強さ（表示サイズでの px。おおよその最大値） */
const AMP = opt('amp', 1.6);
/** 点の間隔（表示サイズでの px） */
const STEP = opt('step', 3);
const SEED = opt('seed', 1);
const only = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

/** 各ファイルの「いちばんよく見える大きさ」の横幅（px） */
const DISPLAY = {
  'character/normal.svg': 160,
  'character/blink.svg': 160,
  'food/*': 128,
  'furniture/window-plain.svg': 152,
  'furniture/window-curtain.svg': 152,
  'furniture/wall-garland.svg': 104,
  'furniture/wall-clock.svg': 104,
  'furniture/shelf-wood.svg': 120,
  'furniture/shelf-books.svg': 120,
  'furniture/rug-round.svg': 336,
  'furniture/rug-square.svg': 336,
  'furniture/cushion-butter.svg': 120,
  'furniture/cushion-cloud.svg': 120,
  'furniture/plant-pothos.svg': 72,
  'furniture/plant-cactus.svg': 72,
  'room/background.svg': 402,
  'room/prop-plate.svg': 68,
  'room/prop-fridge.svg': 80,
  'deco/sparkle.svg': 28,
  'deco/heart.svg': 28,
  'deco/steam.svg': 32,
  'deco/zzz.svg': 40,
  'deco/puff.svg': 56,
  'deco/magnifier.svg': 48,
  'deco/nori.svg': 20,
  'deco/pot.svg': 120,
  'deco/pocket.svg': 104,
  'deco/carrot.svg': 40,
  'deco/tomato.svg': 40,
  'deco/broccoli.svg': 40,
  'deco/hand.svg': 64,
};
const displayWidth = (rel) => DISPLAY[rel] ?? DISPLAY[rel.split('/')[0] + '/*'] ?? 120;

// ------------------------------------------------------------ 乱数とノイズ
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/**
 * 閉じた輪郭（周長 L px）に沿った、つなぎ目のないなめらかなノイズ。
 * 波長 5〜16px の細かい揺れ（縁のざらつき）＋ 60px 前後のゆるい揺れ（形のいびつさ）。
 */
function makeNoise(perimeterPx, random) {
  const bands = [
    [9, 0.2],
    [15, 0.3],
    [26, 0.32],
    [70, 0.5],
  ];
  const waves = [];
  for (const [wavelength, weight] of bands) {
    for (let j = 0; j < 2; j++) {
      const k = Math.max(1, Math.round((perimeterPx / wavelength) * (0.8 + random() * 0.4)));
      waves.push({ k, a: weight * (0.6 + random() * 0.4), p: random() * Math.PI * 2 });
    }
  }
  return (t) => waves.reduce((s, w) => s + w.a * Math.sin(2 * Math.PI * w.k * t + w.p), 0);
}

// ------------------------------------------------------------ 図形 → 点の列
const num = (attrs, k, d = 0) => (attrs[k] != null ? Number(attrs[k]) : d);

function rectToPath(a) {
  const x = num(a, 'x'), y = num(a, 'y'), w = num(a, 'width'), h = num(a, 'height');
  let rx = num(a, 'rx', a.ry != null ? num(a, 'ry') : 0);
  rx = Math.min(rx, w / 2, h / 2);
  if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  const k = 0.5523 * rx;
  return [
    `M${x + rx} ${y}`, `H${x + w - rx}`, `C${x + w - rx + k} ${y} ${x + w} ${y + rx - k} ${x + w} ${y + rx}`,
    `V${y + h - rx}`, `C${x + w} ${y + h - rx + k} ${x + w - rx + k} ${y + h} ${x + w - rx} ${y + h}`,
    `H${x + rx}`, `C${x + rx - k} ${y + h} ${x} ${y + h - rx + k} ${x} ${y + h - rx}`,
    `V${y + rx}`, `C${x} ${y + rx - k} ${x + rx - k} ${y} ${x + rx} ${y}`, 'Z',
  ].join('');
}
function ellipseToPath(cx, cy, rx, ry) {
  const kx = 0.5523 * rx, ky = 0.5523 * ry;
  return [
    `M${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}`,
    'Z',
  ].join('');
}

/** パスの d を、サブパスごとの点の列にする（M L H V C S Q T Z、絶対・相対） */
function flatten(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const subs = [];
  let cur = [], x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0, lastC = null;
  const n = () => Number(tokens[i++]);
  const bez = (pts, steps) => {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      if (pts.length === 4) {
        cur.push([
          mt ** 3 * pts[0][0] + 3 * mt * mt * t * pts[1][0] + 3 * mt * t * t * pts[2][0] + t ** 3 * pts[3][0],
          mt ** 3 * pts[0][1] + 3 * mt * mt * t * pts[1][1] + 3 * mt * t * t * pts[2][1] + t ** 3 * pts[3][1],
        ]);
      } else {
        cur.push([mt * mt * pts[0][0] + 2 * mt * t * pts[1][0] + t * t * pts[2][0], mt * mt * pts[0][1] + 2 * mt * t * pts[1][1] + t * t * pts[2][1]]);
      }
    }
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') {
      if (cur.length) subs.push(cur);
      cur = [];
      x = sx; y = sy;
      lastC = null;
      continue;
    }
    if (C === 'M') {
      if (cur.length) subs.push(cur);
      x = ox + n(); y = oy + n(); sx = x; sy = y;
      cur = [[x, y]];
      cmd = rel ? 'l' : 'L';
      lastC = null;
    } else if (C === 'L') { x = ox + n(); y = oy + n(); cur.push([x, y]); lastC = null; }
    else if (C === 'H') { x = (rel ? x : 0) + n(); cur.push([x, y]); lastC = null; }
    else if (C === 'V') { y = (rel ? y : 0) + n(); cur.push([x, y]); lastC = null; }
    else if (C === 'C' || C === 'S') {
      const p0 = [x, y];
      const p1 = C === 'C' ? [ox + n(), oy + n()] : lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
      const p2 = [ox + n(), oy + n()];
      const p3 = [ox + n(), oy + n()];
      bez([p0, p1, p2, p3], 24);
      lastC = p2; x = p3[0]; y = p3[1];
    } else if (C === 'Q' || C === 'T') {
      const p0 = [x, y];
      const p1 = C === 'Q' ? [ox + n(), oy + n()] : lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
      const p2 = [ox + n(), oy + n()];
      bez([p0, p1, p2], 16);
      lastC = p1; x = p2[0]; y = p2[1];
    } else {
      throw new Error(`未対応のパス命令 ${cmd}（円弧 A などはパスに変換してから使ってください）`);
    }
  }
  if (cur.length) subs.push(cur);
  return subs;
}

/** 点の列を、周長に沿って等間隔に取り直す（閉じた輪郭） */
function resample(pts, spacing) {
  const closed = [...pts, pts[0]];
  const seg = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const l = Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
    seg.push(l);
    total += l;
  }
  const count = Math.max(8, Math.round(total / spacing));
  const out = [];
  let si = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (si < seg.length - 1 && acc + seg[si] < target) acc += seg[si++];
    const t = seg[si] ? (target - acc) / seg[si] : 0;
    const a = closed[si], b = closed[si + 1];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { pts: out, total };
}

function roughenSub(pts, scale, random) {
  // scale = 表示 px / viewBox 単位
  const { pts: rs, total } = resample(pts, STEP / scale);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const sizePx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * scale;
  if (sizePx < 7) return rs; // 小さすぎる点（目の光など）は揺らさない
  // 小さい部品ほど揺れを弱める（形を保つ）
  const factor = Math.min(1, Math.max(0.3, sizePx / 70));
  const noise = makeNoise(total * scale, random);
  const amp = (AMP * factor) / scale; // viewBox 単位
  const n = rs.length;
  return rs.map((p, i) => {
    const a = rs[(i - 1 + n) % n], b = rs[(i + 1) % n];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    const v = noise(i / n) * amp;
    return [p[0] + nx * v, p[1] + ny * v];
  });
}

const fmt = (v) => (Math.round(v * 10) / 10).toString();
/** 点の列を、なめらかな曲線（Catmull-Rom → 3次ベジェ）でつなぐ。角ばったギザギザにしない */
function smoothD(s) {
  const n = s.length;
  let d = `M${fmt(s[0][0])} ${fmt(s[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = s[(i - 1 + n) % n], p1 = s[i], p2 = s[(i + 1) % n], p3 = s[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d + 'Z';
}
const toD = (subs) => subs.map(smoothD).join('');

// ------------------------------------------------------------ SVG を処理
function parseAttrs(s) {
  const a = {};
  for (const m of s.matchAll(/([a-zA-Z-:]+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}
const KEEP = ['fill', 'opacity', 'fill-opacity', 'fill-rule', 'clip-rule', 'data-rough'];

function processSvg(text, rel) {
  const vb = text.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const scale = displayWidth(rel) / vb[2];
  const random = rng(hash(rel) ^ SEED);
  let out = text.replace(/<(rect|circle|ellipse|path)\b([^>]*?)\/>/g, (whole, tag, attrStr) => {
    const a = parseAttrs(attrStr);
    if (a['data-rough'] === 'off') return whole;
    let d;
    if (tag === 'rect') d = rectToPath(a);
    else if (tag === 'circle') d = ellipseToPath(num(a, 'cx'), num(a, 'cy'), num(a, 'r'), num(a, 'r'));
    else if (tag === 'ellipse') d = ellipseToPath(num(a, 'cx'), num(a, 'cy'), num(a, 'rx'), num(a, 'ry'));
    else d = a.d;
    const subs = flatten(d).map((s) => roughenSub(s, scale, random));
    const keep = KEEP.filter((k) => a[k] != null).map((k) => ` ${k}="${a[k]}"`).join('');
    return `<path d="${toD(subs)}"${keep}/>`;
  });
  out = out.replace(/<!--\s*仮素材：([^>]*?)\s*-->/, '<!-- 仮素材：$1（ラフ加工済み・元データは scripts/art-src） -->');
  return out;
}

// ------------------------------------------------------------ 実行
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.svg') ? [p] : [];
  });
}
const files = walk(SRC).map((p) => relative(SRC, p)).filter((rel) => !only.length || only.includes(rel));
if (!files.length) {
  console.error('対象のファイルがありません。例: npm run art:rough -- food/onigiri.svg');
  process.exit(1);
}
let bytes = 0;
for (const rel of files) {
  const out = processSvg(readFileSync(join(SRC, rel), 'utf8'), rel);
  writeFileSync(join(OUT, rel), out);
  bytes += out.length;
}
console.log(`${files.length} 枚を作り直しました（揺れ ${AMP}px・点の間隔 ${STEP}px・種 ${SEED}・合計 ${(bytes / 1024).toFixed(1)}KB）`);
