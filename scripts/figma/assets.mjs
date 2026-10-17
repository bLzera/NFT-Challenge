// Exporta assets do Figma.
//   node scripts/figma/assets.mjs --node 1-23 --svg          # exporta nós vetoriais do frame como SVG
//   node scripts/figma/assets.mjs --node 1-23 --png 2,3      # exporta como PNG nas escalas 2x e 3x
//
// Por padrão exporta nós do tipo VECTOR/COMPONENT/INSTANCE como SVG e os
// retângulos com fill de imagem como PNG. Baixa os binários para design/assets/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, figma, parseFileKey, normalizeNodeId } from './lib.mjs';

loadEnv();
const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = parseFileKey(process.env.FIGMA_FILE_KEY);
if (!TOKEN || !FILE_KEY) { console.error('Faltam FIGMA_TOKEN / FIGMA_FILE_KEY'); process.exit(1); }

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? true) : null; };

const OUT = resolve(process.cwd(), 'design', 'assets');
const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR', 'POLYGON']);

function collectExportables(node, acc = { svg: [], png: [] }) {
  const isIcon = VECTOR_TYPES.has(node.type) ||
    ((node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME') &&
      (node.children || []).every((c) => VECTOR_TYPES.has(c.type)) && (node.children?.length));
  const hasImageFill = (node.fills || []).some((f) => f.type === 'IMAGE' && f.visible !== false);

  if (isIcon) acc.svg.push({ id: node.id, name: node.name });
  else if (hasImageFill) acc.png.push({ id: node.id, name: node.name });
  else for (const c of node.children || []) collectExportables(c, acc);
  return acc;
}

async function download(url, path) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
}

async function exportBatch(items, format, scale, subdir) {
  if (!items.length) return;
  const dir = resolve(OUT, subdir);
  mkdirSync(dir, { recursive: true });
  const ids = items.map((i) => i.id).join(',');
  const q = `format=${format}&ids=${ids}` + (format === 'png' ? `&scale=${scale}` : '');
  const { images } = await figma(`/images/${FILE_KEY}?${q}`, TOKEN);
  const used = exportBatch._used ||= new Set();
  for (const item of items) {
    const url = images[item.id];
    if (!url) { console.warn(`  (sem imagem) ${item.name}`); continue; }
    let safe = item.name.replace(/[^\w-]+/g, '_');
    const suffix = format === 'png' && scale > 1 ? `@${scale}x` : '';
    // evita sobrescrever nós de mesmo nome: anexa o id na colisão
    if (used.has(`${safe}${suffix}`)) safe += `_${item.id.replace(/[:;]/g, '-')}`;
    used.add(`${safe}${suffix}`);
    const file = resolve(dir, `${safe}${suffix}.${format}`);
    await download(url, file);
    console.log(`  ✓ ${item.name} → ${safe}${suffix}.${format}`);
  }
}

// nomes de formas cruas (traços/linhas decorativos), não ícones nomeados
const GENERIC = /^(Stroke|Line|Rectangle|Vector|Ellipse|Path|Union|Subtract)\s*\d*$/i;

// Modo ícones globais: varre todas as telas, junta os vetores e deduplica por nome.
async function allIcons(includeGeneric) {
  const file = await figma(`/files/${FILE_KEY}`, TOKEN);
  const byName = new Map();
  for (const page of file.document.children || []) {
    for (const frame of page.children || []) {
      const { svg } = collectExportables(frame);
      for (const item of svg) {
        if (!includeGeneric && GENERIC.test(item.name)) continue;
        if (!byName.has(item.name)) byName.set(item.name, item); // primeiro vence
      }
    }
  }
  const icons = [...byName.values()];
  console.log(`Ícones únicos: ${icons.length} (dedupe por nome${includeGeneric ? '' : ', formas decorativas filtradas'})`);
  // a API aceita vários ids por chamada; fatiamos em lotes pra não estourar a URL
  for (let i = 0; i < icons.length; i += 50) {
    await exportBatch(icons.slice(i, i + 50), 'svg', 1, 'svg');
  }
}

async function main() {
  if (flag('--all-icons')) return allIcons(!!flag('--raw'));

  const nodeId = flag('--node');
  if (!nodeId) { console.error('Informe --node <id> ou --all-icons'); process.exit(1); }
  const id = normalizeNodeId(nodeId);
  const { nodes } = await figma(`/files/${FILE_KEY}/nodes?ids=${id}`, TOKEN);
  const root = Object.values(nodes)[0]?.document;
  if (!root) { console.error('Node não encontrado'); process.exit(1); }

  const { svg, png } = collectExportables(root);
  console.log(`Encontrados ${svg.length} vetores (SVG) e ${png.length} imagens (PNG)`);

  const wantSvg = flag('--svg') || (!flag('--png'));
  if (wantSvg) { console.log('SVG:'); await exportBatch(svg, 'svg', 1, 'svg'); }

  const pngArg = flag('--png');
  if (pngArg || png.length) {
    const scales = (typeof pngArg === 'string' ? pngArg : '2,3').split(',').map(Number);
    console.log('PNG:');
    for (const scale of scales) await exportBatch(png, 'png', scale, 'png');
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
