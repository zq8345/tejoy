#!/usr/bin/env node
/* Wanew Phase 2 — 英文产品详情/分类页 -> pt (正文英文, 只换外壳+chrome+head+双向切换器)
 * 基线: origin/main ba60dadd (含批次B: clean-URL 内链 + 机型专属 h1 + FAB方角 + CSS ?v=54)
 * 用法: node phase2-convert.js --dry-run    校验不写盘
 *       node phase2-convert.js --run        真跑(生成pt页 + 给英文原页加PT切换器/hreflang)
 *       node phase2-convert.js --inspect <src> <enUrl> <ptUrl>
 * ⚠️ URL 全用 clean(无.html, 对齐批次B); 输出文件仍写 pt/<dir>/<n>.html
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

/* ---------- 外壳 + 切换器块模板 (运行时从 pt/index.html 抽) ---------- */
function sliceBetween(s, a, b, inc) { const i = s.indexOf(a); if (i < 0) return null; const j = s.indexOf(b, i + a.length); if (j < 0) return null; return s.slice(i, inc ? j + b.length : j); }
function loadShell() {
  const pt = fs.readFileSync(path.join(ROOT, 'pt/index.html'), 'utf8');
  const header = sliceBetween(pt, '<header class="main-header clearfix">', '</header>', true);
  const footer = sliceBetween(pt, '<footer class="site-footer">', '</footer>', true);
  const mobilenav = sliceBetween(pt, '<div class="mobile-nav__wrapper">', '<a href="#" data-target="html" class="scroll-to-target scroll-to-top">', false);
  const lsIdx = pt.indexOf('.lang-switch{position');
  let styleBlock = null;
  if (lsIdx >= 0) { const ss = pt.lastIndexOf('<style>', lsIdx), se = pt.indexOf('</style>', lsIdx); if (ss >= 0 && se >= 0) styleBlock = pt.slice(ss, se + 8); }
  // EN 切换器块(pt壳里, EN指向"/") -> 供 en-side 派生 PT 块
  const enBlock = sliceBetween(pt, '<div class="lang-switch" data-lang-switch>', '</div>', true);
  if (!header || !footer || !mobilenav || !enBlock) throw new Error('外壳抽取失败, 检查 pt/index.html 锚点');
  if (!styleBlock || !/position:absolute;top:50%;right:24px/.test(styleBlock) || !/max-width:1199px/.test(styleBlock)) throw new Error('切换器样式块抽取失败');
  // PT 块(供英文页): EN->PT 变体
  const ptBlock = enBlock
    .replace('href="/"', 'href="__PT__"')
    .replace('hreflang="en"', 'hreflang="pt-BR"')
    .replace('Ver esta página em inglês', 'Ver esta página em português')
    .replace('<span>EN</span>', '<span>PT</span>');
  return { header, footer, mobilenav, styleBlock, ptBlock };
}

/* ---------- chrome 字面映射 (权威取自 pt/mini/4199) ---------- */
const CHROME = [
  ['>Category:', '>Categoria:'], ['>Contact Now<', '>Fale conosco agora<'],
  ['>Send an Inquiry<', '>Envie uma consulta<'], ['>Company Name<', '>Nome da empresa<'],
  ['>Company<', '>Empresa<'], ['>Name<', '>Nome<'], ['>Phone<', '>Telefone<'],
  ['>Email<', '>E-mail<'], ['>Message<', '>Mensagem<'], ['>Submit<', '>Enviar<'],
  ['>Related products<', '>Produtos relacionados<'], ['>Description<', '>Descrição<'],
  ['placeholder="Your Name"', 'placeholder="Seu nome"'], ['placeholder="Your Email"', 'placeholder="Seu e-mail"'],
  // --- Phase 2.5 外壳漏译 sweep (总工 2026-07-14) ---
  ['page-header__title">Products<', 'page-header__title">Produtos<'],                                  // banner标题(详情页)
  ['>Starlink-compatible accessories for every terminal generation.<', '>Acessórios compatíveis com Starlink para todas as gerações de terminal.<'], // banner副标题(详情+分类)
  ['<span>Back</span>', '<span>Voltar</span>'],                                                        // 返回按钮
  [">Interested in this product? Leave us a message and we'll reply as soon as possible.<", '>Tem interesse neste produto? Deixe sua mensagem que responderemos o mais rápido possível.<'], // 咨询引导语
  // 表单可见裸标签(sr-only已由上面译, 这里译裸文本; 顺序在sr-only之后)
  ['</label>Company Name', '</label>Nome da empresa'], ['</label>Name', '</label>Nome'],
  ['</label>Phone', '</label>Telefone'], ['</label>Message', '</label>Mensagem'],
  // 占位符(补漏)
  ['placeholder="Company Name"', 'placeholder="Nome da empresa"'], ['placeholder="Your Phone"', 'placeholder="Seu telefone"'],
  ['placeholder="Your Message"', 'placeholder="Sua mensagem"'],
  // JSON-LD 面包屑 Home
  ['"name": "Home"', '"name": "Início"'],
  // 分类页过滤器(权威译法对齐 Phase1 pt/products; data-filter/href精确锚定)
  ['chiprow__label">Model<', 'chiprow__label">Modelo<'], ['chiprow__label">Type<', 'chiprow__label">Tipo<'],
  ['data-filter="all">All <', 'data-filter="all">Todos <'], ['href="/products/">All <', 'href="/products/">Todos <'],
  ['data-filter="mounts">Mounts & Brackets <', 'data-filter="mounts">Suportes e Fixações <'],
  ['data-filter="power">Power & Charging <', 'data-filter="power">Energia e Carregamento <'],
  ['data-filter="cables">Cables <', 'data-filter="cables">Cabos <'],
  ['data-filter="networking">Networking <', 'data-filter="networking">Redes <'],
  ['data-filter="cases">Cases & Protection <', 'data-filter="cases">Cases e Proteção <'],
];
/* 孤儿注释(残留脚本已删,注释留存) -> 清除 */
const ORPHAN_COMMENTS = [
  '<!-- 多语言页脚数据：所有语言的 Products 和 Service 子分类 -->',
  '<!-- 多语言Home/首页客户端翻译（放在body尾部确保DOM已就绪） -->',
];
/* 分类页 h1 机型专属词表 (总工 2026-07-14) */
const CAT_H1 = {
  'enterprise': ['Starlink Enterprise Accessories', 'Acessórios para Starlink Enterprise'],
  'performance-gen-1': ['Starlink Performance (Gen 1) Accessories', 'Acessórios para Starlink Performance (Gen 1)'],
  'performance-gen-3': ['Starlink Performance (Gen 3) Accessories', 'Acessórios para Starlink Performance (Gen 3)'],
  'standard-actuated': ['Starlink Standard Actuated Accessories', 'Acessórios para Starlink Standard Actuated'],
  'standard-circular': ['Starlink Standard Circular Accessories', 'Acessórios para Starlink Standard Circular'],
};

/* ---------- 残渣删除 ---------- */
function deleteScriptWith(html, marker) { const m = html.indexOf(marker); if (m < 0) return html; const s = html.lastIndexOf('<script', m), e = html.indexOf('</script>', m); if (s < 0 || e < 0) return html; return html.slice(0, s) + html.slice(e + 9); }

/* ---------- 链接策略 (clean URL; 产品目录hub+详情都/pt/; hub目录仅hub) ---------- */
const PRODUCT_DIRS = ['mini','standard','enterprise','standard-actuated','standard-circular','performance-gen-1','performance-gen-3','products'];
// Phase2.6 起这10个内容页也有 pt 版 → 校验器/链接策略须知道, 否则 /pt/service/ 等被误判死链
const CONTENT_DIRS = ['faq','service','video','industrial','hangye','certifications-testing',
  'oem-odm-manufacturing','patents-manufacturing','brand-affiliation-faq','starlink-compatible-accessories'];
const HUB_ONLY = ['compatibility','about','contact','marine','rv-off-grid','mounts','power', ...CONTENT_DIRS];
function prefixPtLinks(html) {
  return html.replace(/href="\/([a-z0-9-]+)(\/[^"]*)?"/g, (full, p1, rest) => {
    if (full.startsWith('href="/pt/')) return full;
    if (PRODUCT_DIRS.includes(p1)) return `href="/pt/${p1}${rest || '/'}"`;   // clean(/mini/4200) 或 hub(/mini/) 都覆盖
    if (HUB_ONLY.includes(p1)) { const isHub = !rest || rest === '/'; return isHub ? `href="/pt/${p1}/"` : full; }
    return full;
  });
}

/* ---------- head 接线 (clean URL) ---------- */
function fixHead(html, enUrl, ptUrl) {
  html = html.replace(/<html[^>]*>/, '<html lang="pt-BR">');
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="https://wanew.com${ptUrl}" />`);
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');
  const trio = `\n<link rel="alternate" hreflang="en" href="https://wanew.com${enUrl}" />`
             + `\n<link rel="alternate" hreflang="pt-BR" href="https://wanew.com${ptUrl}" />`
             + `\n<link rel="alternate" hreflang="x-default" href="https://wanew.com${enUrl}" />`;
  html = html.replace(/(<link rel="canonical"[^>]*>)/, `$1${trio}`);
  html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="https://wanew.com${ptUrl}" />`);
  if (/og:locale/.test(html)) html = html.replace(/<meta property="og:locale"[^>]*>/, '<meta property="og:locale" content="pt_BR" />');
  else html = html.replace(/(<meta property="og:url"[^>]*>)/, `$1\n<meta property="og:locale" content="pt_BR" />`);
  html = html.replace(/"inLanguage"\s*:\s*"[^"]*"/g, '"inLanguage": "pt-BR"');
  return html;
}

/* CRLF容错替换: 源HTML可能CRLF而JSON是LF; 匹配LF或CRLF版本, 插入对应行尾的pt */
function replaceFlexible(h, enVal, ptVal) {
  if (!enVal || ptVal === undefined || ptVal === null) return h;
  if (h.includes(enVal)) return h.split(enVal).join(ptVal);                 // LF源
  const enCRLF = enVal.replace(/\n/g, '\r\n'), ptCRLF = ptVal.replace(/\n/g, '\r\n');
  if (enCRLF !== enVal && h.includes(enCRLF)) return h.split(enCRLF).join(ptCRLF);  // CRLF源
  return h;                                                                  // 未匹配(容错: 不改)
}
/* 按 id 读产品 {en, pt} (相关产品卡标题用) */
function loadProductById(id) {
  const jp = path.join(ROOT, 'data', 'products', `${id}.json`);
  if (!fs.existsSync(jp)) return null;
  const j = JSON.parse(fs.readFileSync(jp, 'utf8'));
  return j.i18n ? { en: j.i18n.en, pt: j.i18n['pt-BR'] } : null;
}
/* 详情页: 用 i18n.pt-BR 替换正文/摘要/meta/标题 (en值→pt值; 顺序防子串碰撞: desc→summary→meta_desc→meta_title→title) */
function applyPtContent(h, en, pt) {
  if (!pt) return h;
  h = replaceFlexible(h, en.description_html, pt.description_html);
  if (en.summary_html) h = replaceFlexible(h, en.summary_html, pt.summary_html);
  h = replaceFlexible(h, en.meta_description, pt.meta_description);
  h = replaceFlexible(h, en.meta_title, pt.meta_title);
  // 本产品标题 → pt: h1/JSON-LD name/breadcrumb + meta_title内的title前缀(上面已换meta_title,此步把其中英文title也换pt)
  if (pt.title) h = replaceFlexible(h, en.title, pt.title);
  // 相关产品卡标题 → 各自pt.title (抽页面里产品链接的id, 加载各自JSON; 全量时相关卡也pt, 样板时相关无pt.title则跳过)
  const relIds = [...new Set([...h.matchAll(/href="\/(?:pt\/)?(?:mini|standard|enterprise|standard-actuated|standard-circular|performance-gen-1|performance-gen-3)\/(\d+)"/g)].map(m => m[1]))];
  for (const rid of relIds) {
    const rp = loadProductById(rid);
    if (rp && rp.pt && rp.pt.title && rp.en.title) h = replaceFlexible(h, rp.en.title, rp.pt.title);
  }
  return h;
}

/* ---------- 生成 pt 页 ---------- */
function toPt(enHtml, enUrl, ptUrl, shell, catDir, ptContent) {
  let h = enHtml;
  const hs = h.indexOf('<header class="main-header clearfix">'), he = h.indexOf('</header>');
  if (hs >= 0 && he >= 0) h = h.slice(0, hs) + shell.header + h.slice(he + 9);
  const fs2 = h.indexOf('<footer class="site-footer">'), fe = h.indexOf('</footer>');
  if (fs2 >= 0 && fe >= 0) h = h.slice(0, fs2) + shell.footer + h.slice(fe + 9);
  const ms = h.indexOf('<div class="mobile-nav__wrapper">'), me = h.indexOf('<a href="#" data-target="html" class="scroll-to-target scroll-to-top">', ms);
  if (ms >= 0 && me >= 0) h = h.slice(0, ms) + shell.mobilenav + h.slice(me);
  h = deleteScriptWith(h, 'var FOOTER_LANGS');
  h = deleteScriptWith(h, 'function getCookie');
  // 详情页正文/摘要/meta → pt (在 CHROME/prefixPtLinks 前, 保 en 值原样匹配; 之后 prefixPtLinks 会处理 pt 正文里的链接)
  if (ptContent) h = applyPtContent(h, ptContent.en, ptContent.pt);
  if (shell.styleBlock && !/\.lang-switch\{position/.test(h)) h = h.replace('</head>', shell.styleBlock + '\n</head>');
  for (const [en, pt] of CHROME) h = h.split(en).join(pt);
  for (const c of ORPHAN_COMMENTS) h = h.split(c).join('');  // 删孤儿注释
  if (catDir && CAT_H1[catDir]) h = h.split('>' + CAT_H1[catDir][0] + '<').join('>' + CAT_H1[catDir][1] + '<');  // 分类h1机型专属
  h = fixHead(h, enUrl, ptUrl);
  h = prefixPtLinks(h);
  // 切换器 EN href 指英文原页(clean) — 最后设, 避开 prefixPtLinks
  h = h.replace('<a href="/" class="lang-switch__link" hreflang="en"', `<a href="${enUrl}" class="lang-switch__link" hreflang="en"`);
  return h;
}

/* ---------- 给英文原页加 PT 切换器 + hreflang + 样式 (幂等) ---------- */
function injectEnSide(enHtml, enUrl, ptUrl, shell) {
  if (/class="lang-switch__link"/.test(enHtml)) return enHtml;  // 已注入
  let h = enHtml;
  // 样式
  if (!/\.lang-switch\{position/.test(h)) h = h.replace('</head>', shell.styleBlock + '\n</head>');
  // PT 切换器块 -> 插在 __call 前
  const block = shell.ptBlock.replace('__PT__', ptUrl);
  h = h.replace('                     <div class="main-menu-wrapper__call">', block + '\n                     <div class="main-menu-wrapper__call">');
  // hreflang trio (英文页原有canonical, 在其后插; 若已有hreflang先删)
  h = h.replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');
  const trio = `\n<link rel="alternate" hreflang="en" href="https://wanew.com${enUrl}" />`
             + `\n<link rel="alternate" hreflang="pt-BR" href="https://wanew.com${ptUrl}" />`
             + `\n<link rel="alternate" hreflang="x-default" href="https://wanew.com${enUrl}" />`;
  h = h.replace(/(<link rel="canonical"[^>]*>)/, `$1${trio}`);
  return h;
}

/* ---------- 校验 ---------- */
function validatePt(h, ptUrl) {
  const iss = [];
  const o = (h.match(/<div/g) || []).length, c = (h.match(/<\/div>/g) || []).length;
  if (o !== c) iss.push(`div ${o}/${c}`);
  if (/FOOTER_LANGS/.test(h)) iss.push('FOOTER_LANGS残');
  if (/function getCookie/.test(h)) iss.push('cookie残');
  if (!/<html lang="pt-BR">/.test(h)) iss.push('lang');
  if (!h.includes(`canonical" href="https://wanew.com${ptUrl}"`)) iss.push('canonical');
  if ((h.match(/rel="alternate" hreflang/g) || []).length !== 3) iss.push('hreflang≠3');
  if (!/class="lang-switch__link"/.test(h)) iss.push('无切换器');
  if (!/position:absolute;top:50%;right:24px/.test(h) || !/max-width:1199px\){\.lang-switch\{position:static/.test(h)) iss.push('切换器样式');
  if (/>Send an Inquiry<|>Related products<|>Category:</.test(h)) iss.push('chrome英文残');
  const bad = [...h.matchAll(/href="\/pt\/([a-z0-9-]+)(\/[^"]*)?"/g)].filter(m => { const d = m[1], r = m[2] || ''; if (PRODUCT_DIRS.includes(d)) return false; if (HUB_ONLY.includes(d)) return !(r === '' || r === '/'); return true; }).map(m => `/pt/${m[1]}${m[2]||''}`);
  if (bad.length) iss.push('死链:' + [...new Set(bad)].slice(0,2).join(','));
  return iss;
}

/* ---------- manifest ---------- */
function buildManifest() {
  const list = [];
  const DETAIL_DIRS = ['mini','standard','enterprise','standard-actuated','standard-circular','performance-gen-1','performance-gen-3'];
  for (const dir of DETAIL_DIRS) {
    const d = path.join(ROOT, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/^\d+\.html$/.test(f)) {
      const n = f.replace('.html', '');
      list.push({ src: `${dir}/${f}`, enUrl: `/${dir}/${n}`, ptUrl: `/pt/${dir}/${n}`, out: `pt/${dir}/${f}`, kind: 'detail', id: Number(n) });
    }
  }
  for (const dir of ['enterprise','performance-gen-1','performance-gen-3','standard-actuated','standard-circular']) {
    list.push({ src: `${dir}/index.html`, enUrl: `/${dir}/`, ptUrl: `/pt/${dir}/`, out: `pt/${dir}/index.html`, kind: 'category', catDir: dir });
  }
  return list;
}

/* 详情页: 从 data/products/{id}.json 取 {en, pt} 供 applyPtContent (interim 渲染 pt 描述) */
function loadPtContent(item) {
  if (item.kind !== 'detail' || item.id == null) return null;
  const jp = path.join(ROOT, 'data', 'products', `${item.id}.json`);
  if (!fs.existsSync(jp)) return null;
  const j = JSON.parse(fs.readFileSync(jp, 'utf8'));
  if (!j.i18n || !j.i18n['pt-BR']) return null;
  return { en: j.i18n.en, pt: j.i18n['pt-BR'] };
}

/* ---------- main ---------- */
(function main() {
  const args = process.argv;
  const MODE = args.includes('--run') ? 'run' : (args.includes('--inspect') ? 'inspect' : 'dry');
  const shell = loadShell();
  if (MODE === 'inspect') {
    const i = args.indexOf('--inspect'); const src = args[i+1], enUrl = args[i+2], ptUrl = args[i+3];
    const mItem = buildManifest().find(x => x.src === src) || {};
    const h = toPt(fs.readFileSync(path.join(ROOT, src), 'utf8'), enUrl, ptUrl, shell, mItem.catDir, loadPtContent(mItem));
    const g = re => { const m = h.match(re); return m ? m[0].slice(0,95) : '(无)'; };
    console.log('lang:', g(/<html[^>]*>/), '\ncanonical:', g(/<link rel="canonical"[^>]*>/), '\nhreflang数:', (h.match(/rel="alternate" hreflang/g)||[]).length,
      '\nswitcherEN:', g(/<a href="[^"]*" class="lang-switch__link" hreflang="en"/), '\nchrome译:', /Categoria:/.test(h), /Envie uma consulta/.test(h),
      '\n英文正文保留:', /RJ45|POE|AWG|Starlink|Ethernet/.test(h), '\n残渣:', /FOOTER_LANGS/.test(h), /function getCookie/.test(h),
      '\n相关产品/pt/clean:', g(/href="\/pt\/mini\/\d+"/), '\ndiv:', (h.match(/<div/g)||[]).length, (h.match(/<\/div>/g)||[]).length,
      '\n校验:', validatePt(h, ptUrl).join('|') || 'OK');
    return;
  }
  const PT_ONLY = args.includes('--pt-only');   // 只写pt页, 绝不动en页(interim渲染用, 保dev render.js的en基线)
  const onlyIx = args.indexOf('--only');        // --only <id/src> 只处理一个(sample-first)
  const onlyKey = onlyIx >= 0 ? args[onlyIx + 1] : null;
  let manifest = buildManifest();
  if (onlyKey) manifest = manifest.filter(it => String(it.id) === onlyKey || it.src === onlyKey);
  console.log(`模式=${MODE}${PT_ONLY ? ' [pt-only]' : ''}${onlyKey ? ' [only ' + onlyKey + ']' : ''} 外壳:header ${shell.header.length}b footer ${shell.footer.length}b | manifest ${manifest.length}页`);
  let ok = 0, bad = 0;
  for (const it of manifest) {
    const srcAbs = path.join(ROOT, it.src);
    if (!fs.existsSync(srcAbs)) { console.log(`SKIP缺: ${it.src}`); continue; }
    const en = fs.readFileSync(srcAbs, 'utf8');
    const pt = toPt(en, it.enUrl, it.ptUrl, shell, it.catDir, loadPtContent(it));
    const iss = validatePt(pt, it.ptUrl);
    if (iss.length) { bad++; console.log(`❌ ${it.ptUrl}: ${iss.join(' | ')}`); continue; }
    ok++;
    if (MODE === 'run') {
      const outAbs = path.join(ROOT, it.out); fs.mkdirSync(path.dirname(outAbs), { recursive: true }); fs.writeFileSync(outAbs, pt);
      if (!PT_ONLY) { const enInj = injectEnSide(en, it.enUrl, it.ptUrl, shell); if (enInj !== en) fs.writeFileSync(srcAbs, enInj); }  // en页加PT切换器(--pt-only时跳过, 绝不动en)
    }
  }
  console.log(`\n结果: OK=${ok} 问题=${bad} / ${manifest.length}`);
  if (MODE === 'dry') console.log('（dry-run: 未写盘）');
})();
