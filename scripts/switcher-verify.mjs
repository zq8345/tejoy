#!/usr/bin/env node
// 语言切换器的门。总工点名的三条,全部可计算:
//   ① href 指向【对侧】语种   ② hreflang 与目标语种一致   ③ 目标页真的存在
//
// ⭐ 为什么以前没有这道门 —— 这是最贵的一课:
// 切换器 100% 失效,活过了 R2 和 R3 整整三轮,而 chrome-verify 一路 253/253 全绿。
// 因为 chrome-verify 验的是"chrome 内容零回归 = 和 HEAD 一样"。切换器的 href 是【逐页变量】,
// 一个每页都不同的值,没法用"和 HEAD 一样"来验 —— 于是它落在了所有门的射程之外。
//
// 而多语言的 scanner 里有 `if (/lang-switch__link/i.test(tag)) continue;` —— 它写道:
//   「白名单不是『这里不会错』,是『这里我放弃观察』。我把这两件事当成了一件。」
//   「我自己造的盲区,恰好就是 bug 落地的地方。」
// 这句对我同样成立。所以这道门【专门】盯那个所有人都排除掉的地方。
import fs from "fs";

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name === "node_modules" || e.name === ".git" || e.name === "data" || e.name === "admin" ? [] :
  e.isDirectory() ? walk(`${d}/${e.name}`) : /\.html$/.test(e.name) ? [`${d}/${e.name}`] : []);

const fails = [];
let checked = 0, none = 0;
for (const p of walk(".").map((f) => f.replace("./", ""))) {
  const h = fs.readFileSync(p, "utf8");
  const i = h.indexOf('<div class="lang-switch"');
  if (i < 0) { none++; continue; }
  const seg = h.slice(i, i + 500);
  const href = (seg.match(/href="([^"]*)"/) || [])[1];
  const hl = (seg.match(/hreflang="([^"]*)"/) || [])[1];
  const isPt = p.startsWith("pt/");
  const enPath = "/" + (isPt ? p.slice(3) : p).replace(/index\.html$/, "").replace(/\.html$/, "");
  const want = isPt ? enPath : `/pt${enPath}`;
  const wantHl = isPt ? "en" : "pt-BR";
  const targetFile = want.endsWith("/") ? `${want.slice(1)}index.html` : `${want.slice(1)}.html`;
  const issues = [];
  if (href !== want) issues.push(`① href=${href} 应为 ${want}`);
  if (hl !== wantHl) issues.push(`② hreflang=${hl} 应为 ${wantHl}`);
  if (!fs.existsSync(targetFile)) issues.push(`③ 目标页不存在: ${targetFile}`);
  checked++;
  if (issues.length) fails.push(`${p}\n     ${issues.join("\n     ")}`);
}
console.log(`switcher-verify  有切换器的页 ${checked} | 无切换器 ${none}(en 页没有 pt 对侧时是合法的)`);
console.log(`  ① 指向对侧语种 · ② hreflang 与目标一致 · ③ 目标页存在:  ${checked - fails.length} / ${checked}  ${fails.length ? "🔴" : "✅"}`);
if (fails.length) { console.log(`\n🔴 ${fails.length} 个页:`); fails.slice(0, 10).forEach((f) => console.log(`   ${f}`)); }
process.exit(fails.length ? 1 : 0);
