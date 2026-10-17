// Helpers do extrator Figma — sem dependências externas (Node 18+, fetch nativo).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnv(root = process.cwd()) {
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env opcional */ }
}

const BASE = 'https://api.figma.com/v1';

export async function figma(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) {
    throw new Error(`Figma API ${res.status} em ${path}: ${await res.text()}`);
  }
  return res.json();
}

// Extrai a file key de um link completo ou devolve a própria string se já for a key.
export function parseFileKey(input) {
  if (!input) return '';
  const m = input.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  return m ? m[1] : input.trim();
}

// node-id no link vem como "1-23"; a API usa "1:23".
export function normalizeNodeId(id) {
  return id ? id.replace(/-/g, ':') : id;
}

// cor Figma (r,g,b,a em 0..1) -> hex. Inclui alpha só se < 1.
export function colorToHex({ r, g, b, a = 1 }, opacity = 1) {
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const alpha = a * opacity;
  const base = `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  return alpha < 1 ? `${base}${to(alpha)}` : base;
}

export function paintToString(paint, stylesMap) {
  if (!paint || paint.visible === false) return null;
  const named = paint.__styleName ? ` (${paint.__styleName})` : '';
  if (paint.type === 'SOLID') return `${colorToHex(paint.color, paint.opacity ?? 1)}${named}`;
  if (paint.type?.startsWith('GRADIENT')) {
    const stops = (paint.gradientStops || [])
      .map((s) => colorToHex(s.color))
      .join(' → ');
    return `${paint.type} [${stops}]${named}`;
  }
  if (paint.type === 'IMAGE') return `IMAGE (ref: ${paint.imageRef})`;
  return `${paint.type}${named}`;
}

// Resolve o nome do style aplicado a um nó para uma propriedade (fill/stroke/effect/text).
export function attachStyleNames(node, stylesMeta) {
  if (!node.styles || !stylesMeta) return;
  node.__styleNames = {};
  for (const [prop, styleId] of Object.entries(node.styles)) {
    const meta = stylesMeta[styleId];
    if (meta) node.__styleNames[prop] = meta.name;
  }
}
