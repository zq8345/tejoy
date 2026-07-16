#!/usr/bin/env node
/**
 * es 标记词表【反向自检】—— 总调度的要求，比"列 40 个同形词"强得多
 *
 * ⭐ 为什么需要它（总调度的原话）：
 *   「你的 EN_MARKERS 是「英文标记词」清单 —— 这个设计本身对 es 就是危险的，
 *    因为英语和西语的同源词是**成体系的**（-al/-ble/-ción/-ar 家族），不是零星几个。
 *    你列了 40+，但**你没法穷举它**。」
 *   「别拿"我列了 40 个"当完成 —— 拿"**喂干净西语进去它闭嘴**"当完成。」
 *
 * ⭐ 这跟我自己那条规矩是一对：
 *   「匹配不上的要吼出来」  ← 防漏报（检查只报告它找到的）
 *   「匹配上的也得能被证伪」← 防误报（本文件）
 *
 * 用法：
 *   node scripts/es-marker-selftest.mjs            用 pt 的 EN_MARKERS 跑（演示它会炸成什么样）
 *   node scripts/es-marker-selftest.mjs --markers <文件>   用候选 es 标记词表跑
 *
 * 判定：**任何一条命中 = 假阳性 = 清单还没清干净。合格 = 0。**
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ── 语料：本产品域的【已知干净西语】────────────────────────────────────
 * 刻意堆满这个目录真实会出现的词：cable / red / adaptador / soporte / potencia …
 * ⚠️ 这些句子全部是合法西语，一条泄漏都没有。scanner 报出任何一条都是它的错。 */
const CLEAN_ES = [
  // 线缆类（cable = 西语核心词，pt 的 EN_MARKERS 里它是"英文标记词"）
  'Cable de red para Starlink Gen 3 con conector RJ45 impermeable IP67.',
  'El cable es flexible y durable, con material de cobre puro de 23AWG.',
  'Adaptador de red universal compatible con el router Starlink.',
  'Conecte el cable al panel de control sin cortar ni crimpar el cable original.',
  // 支架类
  'Soporte de tubo para antena Starlink, diseño simple y resistente al metal oxidado.',
  'Instalación en techo horizontal o vertical, con ajuste manual del ángulo.',
  // 供电类
  'Fuente de alimentación con protección contra sobrecarga y cortocircuito.',
  'Cargador para auto de 12V a 24V, ideal para casa rodante, camión o bote.',
  'La batería externa debe entregar al menos 100 W de potencia real.',
  // 通用营销（同源词密度最高的地方）
  'Un producto profesional de calidad industrial, con diseño original y funcional.',
  'Rendimiento estable y confiable en uso normal, sin pérdida de señal.',
  'Solución práctica para instalación personal o comercial, local o internacional.',
  // 表单 / chrome
  'Nombre de la empresa', 'Su nombre', 'Su teléfono', 'Su mensaje', 'Enviar consulta',
  'Comprar por tipo', 'Comprar por modelo Starlink', 'Todos los productos',
  'Cables', 'Soportes y Fijaciones', 'Energía y Carga', 'Redes', 'Estuches y Protección',
];

/* ── 取标记词表 ──────────────────────────────────────────────────────── */
const arg = process.argv.indexOf('--markers');
let markers, source;
if (arg > 0) {
  const raw = fs.readFileSync(process.argv[arg + 1], 'utf8');
  markers = new Set([...raw.matchAll(/'([a-zà-ÿñ-]+)'/gi)].map((m) => m[1].toLowerCase()));
  source = process.argv[arg + 1];
} else {
  const raw = fs.readFileSync(path.join(HERE, 'pt-leak-scan.mjs'), 'utf8');
  const m = raw.match(/const EN_MARKERS = new Set\(\[([\s\S]*?)\]\);/);
  markers = new Set([...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]));
  source = 'pt-leak-scan.mjs 的 EN_MARKERS（演示：它对 es 会炸成什么样）';
}

/* ⚠️ 词边界必须含重音字母 **和 ñ** —— 否则 año / diseño / pequeño 被切断，
   señal 切成 "se"+"al"（"al" 恰好是英语词！）→ 假阳性从天而降。
   这正是 pt 那个 "transferência → transfer" bug 的西语版，只是更严重。 */
const WORD_RE = /[a-zà-ÿñ][a-zà-ÿñ'-]*/gi;

let hits = 0;
const byWord = {};
console.log(`\n【es 标记词表 反向自检】`);
console.log(`标记词来源：${source}（${markers.size} 个词）`);
console.log(`语料：${CLEAN_ES.length} 条【已知干净的西语】—— 一条泄漏都没有\n`);

for (const line of CLEAN_ES) {
  const words = line.toLowerCase().match(WORD_RE) || [];
  const bad = words.filter((w) => markers.has(w));
  if (bad.length) {
    hits += bad.length;
    bad.forEach((w) => (byWord[w] = (byWord[w] || 0) + 1));
    console.log(`  ❌ {${[...new Set(bad)].join(',')}}  ${line.slice(0, 62)}`);
  }
}

console.log('');
if (hits === 0) {
  console.log('✅ 合格：喂干净西语进去，它闭嘴了。标记词表可用。');
  process.exit(0);
}
console.log(`❌ 不合格：${hits} 处假阳性 / ${CLEAN_ES.length} 条干净西语`);
console.log(`   涉及 ${Object.keys(byWord).length} 个词（按命中次数）：`);
Object.entries(byWord).sort((a, b) => b[1] - a[1]).forEach(([w, n]) => console.log(`     ${String(n).padStart(2)}×  ${w}`));
console.log('');
console.log('⭐ 这就是「列 40 个同形词」不等于「清单干净了」的证据。');
console.log('   合格线不是"我想到了多少"，是"喂干净西语进去它报 0"。');
process.exit(1);
