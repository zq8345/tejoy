#!/usr/bin/env node
/**
 * es-MX 灌入 data/pages/*.json —— 一次性迁移脚本（跑完即历史，保留是为了留痕）
 *
 * ⭐ 出处纪律：这里【不逐条写 reason】—— 出处集中在 data/es-glossary.json，由 es-glossary-check 强制。
 *   「Home→Inicio」不需要 reason；术语才需要。906 条各带一份 reason 只是噪音，
 *   而且它会腐烂：术语改了没人会回头改 906 条 reason。**术语表是单一真源，reason 是它的派生物。**
 *   → 只有【偏离常规、或我判断与某个来源冲突】的条目才在这里写行内注释。
 */
import { seedLocale } from './es-seed-lib.mjs';

/* ═══ video.json（16 条） ═══════════════════════════════════════════════ */
const VIDEO = {
  'video.page-header-title.1': 'Videos',              // ⭐ 墨西哥无重音（术语表 forbidden: vídeo）
  'video.page-header-subtitle.1': 'Demostraciones de productos y guías de instalación.',
  'video.alt.1': 'Presentación de la fábrica - video wanew',
  'video.a.1': 'Presentación de la fábrica',

  /* ⚠️ meta/ld 的品牌串:与 chrome 的 meta.title.suffix 【逐字一致】。
   *   pt 在这里用了冒号(「Starlink: Suportes e...」)而 chrome 用逗号 —— pt 自己不一致。
   *   es 全站统一走【逗号】版,与我签的 chrome meta.title.suffix 对齐。
   * 📌 挂账(dev 的活,不是我的):pages 的 meta.title 是【存】的,不是派生的 ——
   *   而 render.js:20 对产品明确写着 "deliberately NOT read from data — it is DERIVED"。
   *   存派生值 = 标题一改就静默漂,**这正是当初半英半葡 meta_title 上线的成因**。 */
  'video.meta.title': 'Videos - Wanew | Accesorios Premium para Starlink, Soportes y Soluciones de Energía',
  'video.meta.site_name': 'Wanew | Accesorios Premium para Starlink, Soportes y Soluciones de Energía',
  'video.meta.desc':
    'Wanew es un fabricante líder de accesorios compatibles con Starlink: soportes, adaptadores de energía, cables y estuches protectores. Más de 15 años de experiencia, más de 200 patentes. OEM/ODM disponible. No afiliada a SpaceX.',
  'video.ld.description':
    'Wanew es un fabricante líder de accesorios de terceros compatibles con Starlink: soportes, adaptadores de energía, cables y estuches protectores. Independiente de SpaceX y Starlink.',
  // ⚠️ "third-party" → "de terceros",与 chrome footer.copyright 的免责声明【逐字一致】。这是合规文案,含义不能漂。

  'video.ld.knowsAbout': 'accesorios compatibles con Starlink',
  'video.ld.knowsAbout.2': 'accesorios para internet satelital',
  'video.ld.knowsAbout.3': 'conectividad para casa rodante',   // RV → casa rodante（术语表；与 Starlink MX 的 autocaravana 冲突,见 forbidden）
  'video.ld.knowsAbout.4': 'energía sin red eléctrica',        // off-grid → 展开。pt 直接留了 off-grid,**不拿 pt 推 es**
  'video.ld.knowsAbout.5': 'sistemas de soporte',
  'video.ld.name': 'Wanew | Accesorios Premium para Starlink, Soportes y Soluciones de Energía',
  'video.ld.name.2': 'Inicio',
  'video.ld.name.3': 'Videos',
};

const BATCHES = [['data/pages/video.json', VIDEO, {}]];

console.log('\n【es-MX 灌入 pages】');
let grandTotal = 0, grandSeeded = 0;
for (const [file, values, opts] of BATCHES) {
  const r = seedLocale(file, values, opts);
  grandTotal += r.total; grandSeeded += r.seeded;
  const tail = r.skipped.length ? `  ⚠️ 故意留空 ${r.skipped.length}: ${r.skipped.join(', ')}` : '';
  console.log(`  ✅ ${r.file.padEnd(46)} ${String(r.seeded).padStart(3)}/${String(r.total).padEnd(3)}${tail}`);
}
console.log(`\n  合计 ${grandSeeded}/${grandTotal} —— 对账通过（en/pt-BR 一字节未变 · key 集合未变 · 无未声明的漏译）`);
