/**
 * 泄漏分类器 —— 【单一真源】
 *
 * ⚠️ 为什么单独成模块: 基线(pt-leak-baseline.mjs)和验收比对(pt-leak-vs-baseline.mjs)
 *    必须用**同一套分类口径**. 抄两份 = 口径会漂 = 「从 N 降到 ~0」这把尺子失真.
 *    改这里 = 改考卷 -> 必须 bump SCANNER_VERSION + 重出基线 + 知会总调度.
 *
 * 分类(每一类都要能解释归谁修, 否则「逼近0」的验收标准会失真):
 *   a 卡片标题:     列表/分类页产品卡的英文标题/摘要   -> R2 生成器(从 i18n[locale] 渲卡片)
 *   b alt后缀:      "- wanew Products" 模板串         -> chrome catalog key
 *   c 图库alt文件名: alt 直接用了图片文件名(.jpg等)     -> ⚠️既有数据质量问题, 英文站同样如此,
 *                                                       非翻译泄漏, R2 不会自动修 -> 不计入「应逼近0」
 *   d 其它可见文本:  真正剩余的可见文本                -> 已逐个核实为真型号名
 *   e 链接类:       该指 pt 却指英文                  -> R1 localizeUrl
 */

export const CLASS_KEYS = ['a_cardTitles', 'b_altSuffix', 'c_galleryAltFilename', 'd_otherText', 'e_links'];

/** 不计入「应逼近0」的类 —— 详见 i18n-baseline.md §为什么验收不是 N */
export const EXCLUDED_FROM_ACCEPTANCE = ['c_galleryAltFilename'];

const isAltSuffix = (f) => f.hits.length === 1 && f.hits[0] === 'products';
const isFilenameAlt = (f) => f.kind === 'alt' && /\.(jpg|jpeg|png|webp|gif)\b/i.test(f.text);
const isListPage = (f) => /\/index\.html$/.test(f.file);

/** @param r scanner 的 --json 输出 -> { a_cardTitles: [...], ..., e_links: [...] } */
export function classify(r) {
  const cls = { a_cardTitles: [], b_altSuffix: [], c_galleryAltFilename: [], d_otherText: [], e_links: r.linkFindings };
  for (const f of r.findings) {
    if (isFilenameAlt(f)) cls.c_galleryAltFilename.push(f);
    else if (isAltSuffix(f)) cls.b_altSuffix.push(f);
    else if (isListPage(f)) cls.a_cardTitles.push(f);
    else cls.d_otherText.push(f);
  }
  return cls;
}

/** 验收看的数: a+b+d+e (c 排除, 见上) */
export function translationLeaksOf(cls) {
  return CLASS_KEYS.filter((k) => !EXCLUDED_FROM_ACCEPTANCE.includes(k)).reduce((s, k) => s + cls[k].length, 0);
}
