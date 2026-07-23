#!/usr/bin/env node
/**
 * 列表页 <head> 的一次性修正(跑完即历史,保留是为了留痕)
 *
 * ⭐ 为什么需要它:8 个列表页(/products/ + 7 个机型页 + Gen 2 聚合页)【不是模板渲染的】。
 *   regenListPage / setListTitle / setListLabels 只往【已有 HTML】里打补丁,灌卡片、<title>、
 *   筛选栏标签;`<html lang>` / canonical / og:url / og:locale / hreflang 是**手写烘死在页面里的**。
 *   于是 es 骨架从 en 复制过来后,正文已经是西语,head 却整套还是英语的 ——
 *   `<html lang="en">` 配西语正文 = 对 Google 声明"这是英语页",比缺译更糟。
 *
 * ⚠️⚠️ 这是**同一条规则第四次被写死**(regen 的 dirOf、renderPage 的 canonical、
 *   switcher-verify 的 isPt、这里)。**正确的收口是把列表页 head 也纳入生成器(B2)**,
 *   总工已记账,不在本轮。本脚本是 B1:一次性把值算对,不假装问题解决了。
 *   → 所以它【自己】也从 data/locales.json 派生,不写死任何 "pt"/"es":
 *     一次性脚本也不许成为第五份实现。
 */
import fs from "fs";
import { localeDirs } from "./locale-dirs.mjs";

const locales = JSON.parse(fs.readFileSync("data/locales.json", "utf8"));
const DIR = localeDirs(locales);
const ENABLED = locales.enabled;
const DEFAULT = locales.default;

// 8 个列表页的路由(与 regen.mjs 的 CATS/AGGREGATES 同一批页)
const ROUTES = ["/products/", "/mini/", "/standard/", "/standard-actuated/", "/standard-circular/",
  "/performance-gen-1/", "/performance-gen-3/", "/enterprise/"];

const urlFor = (route, loc) => (DIR[loc] ? `/${DIR[loc]}${route}` : route);
const fileFor = (route, loc) => `${urlFor(route, loc).slice(1)}index.html`;

let touched = 0;
for (const route of ROUTES) {
  for (const loc of ENABLED) {
    const f = fileFor(route, loc);
    if (!fs.existsSync(f)) { console.log(`  跳过(该语种没有这个页): ${f}`); continue; }
    const before = fs.readFileSync(f, "utf8");
    let h = before;
    const selfUrl = `https://wanew.com${urlFor(route, loc)}`;
    const enUrl = `https://wanew.com${route}`;

    // ① <html lang>
    h = h.replace(/<html lang="[^"]*"/, `<html lang="${loc}"`);
    // ② canonical / og:url —— 每页指自己
    h = h.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${selfUrl}" />`);
    h = h.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${selfUrl}" />`);
    // ③ og:locale —— 非默认语种才有(和 renderPage 的 OG_LOCALE 规则一致)
    const ogLocale = `<meta property="og:locale" content="${loc.replace("-", "_")}" />`;
    if (loc === DEFAULT) {
      h = h.replace(/\n<meta property="og:locale" content="[^"]*" \/>/, "");
    } else if (/<meta property="og:locale"/.test(h)) {
      h = h.replace(/<meta property="og:locale" content="[^"]*" \/>/, ogLocale);
    } else {
      h = h.replace(/(<meta property="og:url" content="[^"]*" \/>)/, `$1\n${ogLocale}`);
    }
    // ④ hreflang —— 派生出来的:每一门 enabled 语种,当且仅当它那边真的有这个页。
    //    ⚠️ 我第一版写的是"把连续的那一段换掉"(一个非全局正则)。它假设文件里【只有一段】、
    //       而且是连续的 —— 结果换掉一段后另一段还留着,页面上出现了【两个 hreflang 块】,
    //       第二个还是旧的两语种版本。⭐ 又是"按我以为的形状去改",而不是"按不变量去改"。
    //    → 改成:**把所有 alternate 行全删掉,再在原来第一行的位置插入唯一一块。**
    //       这样无论原文有几段、连不连续、跑几次,结果都一样(幂等)。
    const block = ENABLED.filter((l) => fs.existsSync(fileFor(route, l)))
      .map((l) => `<link rel="alternate" hreflang="${l}" href="https://wanew.com${urlFor(route, l)}" />`)
      .concat(`<link rel="alternate" hreflang="x-default" href="${enUrl}" />`).join("\n");
    const lines = h.split("\n");
    const isAlt = (s) => /^\s*<link rel="alternate" hreflang="/.test(s);
    const at = lines.findIndex(isAlt);
    if (at < 0) throw new Error(`${f}: 找不到任何 hreflang 行 —— 停下来看,不要猜`);
    const kept = lines.filter((s) => !isAlt(s));
    // 删掉整块后,原位置可能留下多余空行(我上一版就是这么冒出一个空行的)—— 一并收掉
    const before2 = kept.slice(0, at), after2 = kept.slice(at);
    while (after2.length && after2[0].trim() === "") after2.shift();
    h = [...before2, ...block.split("\n"), ...after2].join("\n");

    if (h !== before) { fs.writeFileSync(f, h); touched++; console.log(`  ✏️  ${f}`); }
    // ⭐ 插入必须在产物里找得到 —— 断言产物,不断言"replace 返回了什么"
    const out = fs.readFileSync(f, "utf8");
    for (const [what, needle] of [["html lang", `<html lang="${loc}"`], ["canonical", `href="${selfUrl}" />`],
      ["hreflang self", `hreflang="${loc}" href="${selfUrl}"`]]) {
      if (!out.includes(needle)) throw new Error(`${f}: ${what} 改完在产物里找不到 ${needle}`);
    }
  }
}
console.log(`\nlist-page-head-fix: 改了 ${touched} 个文件(路由 ${ROUTES.length} × 语种 ${ENABLED.length})`);
