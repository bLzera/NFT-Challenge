// Extrator de design tokens + assets do Figma.
//
// Uso:
//   node scripts/figma/extract.mjs                 # varre o arquivo inteiro (top-level frames)
//   node scripts/figma/extract.mjs --node 1-23     # só o frame/tela do node-id (link)
//   node scripts/figma/extract.mjs --list          # lista os frames top-level e seus ids
//
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadEnv, figma, parseFileKey, normalizeNodeId,
  paintToString, attachStyleNames,
} from './lib.mjs';

loadEnv();
const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = parseFileKey(process.env.FIGMA_FILE_KEY);
if (!TOKEN || !FILE_KEY) {
  console.error('Faltam FIGMA_TOKEN e/ou FIGMA_FILE_KEY no .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? true) : null;
};

const OUT = resolve(process.cwd(), 'design');

// --- extração de propriedades de um nó -> objeto plano de tokens ---
function extractNode(node) {
  const out = { name: node.name, type: node.type };

  if (node.absoluteBoundingBox) {
    out.size = `${Math.round(node.absoluteBoundingBox.width)}×${Math.round(node.absoluteBoundingBox.height)}`;
  }
  // auto-layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    out.layout = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    if (node.itemSpacing) out.gap = node.itemSpacing;
    const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft];
    if (p.some((v) => v)) out.padding = `${p.map((v) => v ?? 0).join(' ')} (T R B L)`;
    if (node.primaryAxisAlignItems) out.justify = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) out.align = node.counterAxisAlignItems;
  }
  // fills / strokes
  const fills = (node.fills || []).map((f, i) => {
    if (node.__styleNames?.fill && i === 0) f.__styleName = node.__styleNames.fill;
    return paintToString(f);
  }).filter(Boolean);
  if (fills.length) out.fill = fills;

  const strokes = (node.strokes || []).map((s) => {
    if (node.__styleNames?.stroke) s.__styleName = node.__styleNames.stroke;
    return paintToString(s);
  }).filter(Boolean);
  if (strokes.length) {
    out.stroke = strokes;
    out.strokeWeight = node.strokeWeight;
    if (node.strokeAlign) out.strokeAlign = node.strokeAlign;
  }
  // raio de borda
  if (node.cornerRadius != null) out.radius = node.cornerRadius;
  else if (node.rectangleCornerRadii) out.radius = node.rectangleCornerRadii.join(' ');
  // efeitos (sombras/blur)
  const effects = (node.effects || []).filter((e) => e.visible !== false).map((e) => {
    if (e.type.includes('SHADOW')) {
      return `${e.type}: x${e.offset?.x ?? 0} y${e.offset?.y ?? 0} blur${e.radius} spread${e.spread ?? 0} ${e.color ? paintToString({ type: 'SOLID', color: e.color }) : ''}`.trim();
    }
    return `${e.type}: ${e.radius}`;
  });
  if (effects.length) out.effects = effects;
  // tipografia
  if (node.style) {
    const s = node.style;
    const ls = Math.round((s.letterSpacing ?? 0) * 100) / 100;
    out.text = `${s.fontFamily} ${s.fontWeight} ${s.fontSize}px / lh ${Math.round(s.lineHeightPx ?? 0)}px / ls ${ls}`;
    if (node.__styleNames?.text) out.textStyle = node.__styleNames.text;
    if (node.characters) out.content = node.characters.slice(0, 80);
  }
  if (node.opacity != null && node.opacity < 1) out.opacity = node.opacity;
  return out;
}

// Coleta tokens nomeados (style name -> valor resolvido), primeira ocorrência.
function collectTokens(node, tokens) {
  const n = node.__styleNames || {};
  if (n.fill && node.fills?.[0]) {
    tokens.colors.set(n.fill, tokens.colors.get(n.fill) || paintToString(node.fills[0]));
  }
  if (n.stroke && node.strokes?.[0]) {
    tokens.colors.set(n.stroke, tokens.colors.get(n.stroke) || paintToString(node.strokes[0]));
  }
  if (n.text && node.style) {
    const s = node.style;
    const ls = Math.round((s.letterSpacing ?? 0) * 100) / 100;
    tokens.text.set(n.text, tokens.text.get(n.text) ||
      `${s.fontFamily} ${s.fontWeight} / ${s.fontSize}px / lh ${Math.round(s.lineHeightPx ?? 0)}px / ls ${ls}`);
  }
}

// percorre a árvore acumulando nós relevantes (que tenham algo visual)
function walk(node, stylesMeta, tokens, depth = 0, acc = []) {
  attachStyleNames(node, stylesMeta);
  if (tokens) collectTokens(node, tokens);
  const t = extractNode(node);
  const hasVisual = t.fill || t.stroke || t.text || t.layout || t.effects || t.radius != null;
  if (hasVisual || depth === 0) acc.push({ depth, ...t });
  for (const child of node.children || []) walk(child, stylesMeta, tokens, depth + 1, acc);
  return acc;
}

function tokensToMarkdown(tokens) {
  const sortEntries = (m) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const lines = ['# Design Tokens', '', '## Cores', ''];
  lines.push('| Token | Valor |', '| --- | --- |');
  for (const [name, val] of sortEntries(tokens.colors)) {
    lines.push(`| \`${name}\` | ${(val || '').replace(/ \(.*\)$/, '')} |`);
  }
  lines.push('', '## Tipografia', '', '| Style | Specs |', '| --- | --- |');
  for (const [name, val] of sortEntries(tokens.text)) lines.push(`| \`${name}\` | ${val} |`);
  return lines.join('\n') + '\n';
}

function toMarkdown(frameName, rows) {
  const lines = [`# ${frameName}`, ''];
  for (const r of rows) {
    const indent = '  '.repeat(r.depth);
    lines.push(`${indent}- **${r.name}** \`${r.type}\`${r.size ? ` — ${r.size}` : ''}`);
    const props = { ...r };
    delete props.name; delete props.type; delete props.depth; delete props.size;
    for (const [k, v] of Object.entries(props)) {
      lines.push(`${indent}  - ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    }
  }
  return lines.join('\n') + '\n';
}

async function listFrames() {
  const { document } = await figma(`/files/${FILE_KEY}?depth=2`, TOKEN);
  const pages = document.children || [];
  for (const page of pages) {
    console.log(`\n📄 ${page.name}`);
    for (const frame of page.children || []) {
      console.log(`   ${frame.id.padEnd(12)} ${frame.name}`);
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(resolve(OUT, 'components'), { recursive: true });

  if (flag('--list')) return listFrames();

  const file = await figma(`/files/${FILE_KEY}`, TOKEN);
  const stylesMeta = file.styles || {};
  console.log(`Arquivo: ${file.name} — ${Object.keys(stylesMeta).length} styles encontrados`);

  // decide o conjunto de frames a processar
  let frames = [];
  const nodeId = flag('--node');
  if (nodeId) {
    const id = normalizeNodeId(nodeId);
    const { nodes } = await figma(`/files/${FILE_KEY}/nodes?ids=${id}`, TOKEN);
    frames = Object.values(nodes).map((n) => n.document);
  } else {
    for (const page of file.document.children || []) {
      for (const frame of page.children || []) frames.push(frame);
    }
  }

  const tokens = { colors: new Map(), text: new Map() };
  for (const frame of frames) {
    const rows = walk(frame, stylesMeta, tokens);
    const safe = frame.name.replace(/[^\w-]+/g, '_');
    writeFileSync(resolve(OUT, 'components', `${safe}.md`), toMarkdown(frame.name, rows));
    console.log(`✓ ${frame.name} (${rows.length} nós) → design/components/${safe}.md`);
  }

  writeFileSync(resolve(OUT, 'tokens.md'), tokensToMarkdown(tokens));
  console.log(`✓ tokens: ${tokens.colors.size} cores, ${tokens.text.size} text styles → design/tokens.md`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
