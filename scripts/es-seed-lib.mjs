/**
 * es-MX 灌入的共用底座 —— chrome / pages 共用一条插入 + 对账管线
 *
 * ⭐ 为什么是【文本插入】而不是 JSON 往返（chrome 那次实测）：
 *   JSON.parse→stringify 往返后与原文差 341 字符。「往返 ≠ 原文」意味着一旦这么写，
 *   diff 变成"整个文件重写" —— **review 不了，而且可能悄悄动了转义**
 *   （catalog 的值是 HTML-ESCAPED，& 必须写 &amp;）。
 *   → 只插新行，en / pt-BR 一个字节都不碰，然后【逐键对账】证明它。不是"看着像对的"。
 */
import fs from 'fs';

/**
 * @param {string} file      目标 catalog（data/chrome.json 或 data/pages/*.json）
 * @param {object} values    { key: [value, reason] }  —— reason 可为 '' （pages 的出处集中在术语表）
 * @param {object} opts      { allowMissing: string[] }  故意不给值的 key，必须显式列出
 */
export function seedLocale(file, values, opts = {}) {
  const LOC = 'es-MX';
  const before = fs.readFileSync(file, 'utf8');
  const beforeObj = JSON.parse(before);
  let out = before;
  let done = 0;
  const notFound = [];

  for (const [key, entry] of Object.entries(values)) {
    const [value, reason] = Array.isArray(entry) ? entry : [entry, ''];
    // 在该 key 块内最后一个 "pt-BR": <string> 之后插入
    const keyRe = new RegExp(`("${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*\\{[\\s\\S]*?)("pt-BR"\\s*:\\s*)("(?:[^"\\\\]|\\\\.)*")`);
    if (!keyRe.test(out)) { notFound.push(key); continue; }
    const ins = reason
      ? `,\n    "${LOC}": ${JSON.stringify(value)},\n    "reason.${LOC}": ${JSON.stringify(reason)}`
      : `,\n    "${LOC}": ${JSON.stringify(value)}`;
    out = out.replace(keyRe, (_, head, ptKey, ptVal) => `${head}${ptKey}${ptVal}${ins}`);
    done++;
  }

  if (notFound.length) return fail(`这些 key 在 ${file} 里没找到（我在给不存在的 key 写译文）：\n  ` + notFound.join('\n  '));

  let afterObj;
  try { afterObj = JSON.parse(out); } catch (e) { return fail(`写出来的不是合法 JSON：${e.message}`); }

  /* ── 对账 —— 「凡是"匹配到才算"的检查，都要同时数一遍"总共有几个"」 ── */
  const errs = [];
  for (const [k, v] of Object.entries(beforeObj)) {
    if (k.startsWith('_')) continue;
    for (const loc of ['en', 'pt-BR']) {
      if (JSON.stringify(afterObj[k]?.[loc]) !== JSON.stringify(v[loc])) errs.push(`${k}.${loc} 被改动了`);
    }
  }
  if (Object.keys(beforeObj).join('|') !== Object.keys(afterObj).join('|')) errs.push('顶层 key 集合变了');

  const translatable = Object.keys(beforeObj).filter((k) => !k.startsWith('_'));
  const withEs = translatable.filter((k) => afterObj[k][LOC] !== undefined);
  const without = translatable.filter((k) => afterObj[k][LOC] === undefined);
  if (withEs.length !== done) errs.push(`插入 ${done} 条，但文件里有 ${withEs.length} 条带 ${LOC}`);

  /* ⚠️ 漏掉的 key 必须是【显式声明过的】。「我忘了翻」和「我故意不翻」长得一模一样 ——
     不强制声明的话，漏译会伪装成设计。 */
  const allowed = new Set(opts.allowMissing || []);
  const unexpected = without.filter((k) => !allowed.has(k));
  if (unexpected.length) errs.push(`这些 key 没给 ${LOC} 值，也没在 allowMissing 里声明（漏译会伪装成设计）：\n    ` + unexpected.join('\n    '));

  if (errs.length) return fail(errs.join('\n  '));

  fs.writeFileSync(file, out);
  return { file, total: translatable.length, seeded: withEs.length, skipped: without };

  function fail(msg) { console.error(`\n❌ ${file} 对账不过，不落盘：\n  ${msg}`); process.exit(1); }
}
