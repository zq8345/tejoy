#!/usr/bin/env node
// 后台发布路径的门 —— 调用【生产真正调用的那个函数】,不是照着我的理解手写一个等价物。
//
// ⭐ 这个 P0 之所以活下来,正是因为没人真跑过那条路径:类型看着对、代码读着对,
//   而它在 R1 给 product.html 加 24 个 {{t.}} token 那天就死了 —— 它跑不了,
//   因为渲染和 GitHub API 长在一起。所以先把渲染抽成纯函数 buildProductFiles(在 [[path]].js),
//   这里直接调它,readPage 注入成"读磁盘"(线上注入的是 GitHub API)。
//
// ⚠️ 我第一版栽在这条上:文件开头写着"手写等价调用只能证明我以为的签名",第②节自己就那么干了。
//    攻击时(把 render 调用还原成 P0 原样)②照样全绿 —— **尺子在量我的副本,不是原件**。
//
// 三件事:
//   ① 后台源码里的调用带齐 catalog / modelDisplay(源码断言,不靠我记得)
//   ② 用真实仓库数据跑生产那个函数,产物无未解析 token、无 undefined、英文页零回归
//   ③ 反向:拿掉 catalog 必须【抛】—— 不许静默回落(altOf 以前就是这么静默造假的)
import fs from "fs";
import { render, regenListPage } from "../functions/_lib/render.js";
import { buildProductFiles } from "../functions/api/admin/[[path]].js";

const CRLF = /\r\n/g;
const nl = (x) => x.replace(CRLF, "\n");

let fail = 0;
const ok = (name, cond, extra = "") => { console.log(`  ${cond ? "✅" : "🔴"} ${name}${extra ? "  " + extra : ""}`); if (!cond) fail++; };

const ADMIN = "functions/api/admin/[[path]].js";
// ⚠️ 扫源码前先剥注释(并先归一 CRLF)。第一版没剥:我自己注释里的一句
//    "regenListPage() 都拿不到 catalog" 被数成了第三个调用点,门当场红 —— 尺子造的假失败。
//    归一 CRLF 是上一道门的教训:JS 正则里 \r 是行终止符、`.` 不匹配它。
const src = nl(fs.readFileSync(ADMIN, "utf8"))
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");

console.log("【① 后台源码里的调用参数】");
const renderCall = (src.match(/render\(prod,\s*\{[\s\S]*?\}\);/) || [""])[0];
ok("render 调用带 catalog", /\bcatalog\b/.test(renderCall));
ok("render 调用带 modelDisplay", /\bmodelDisplay\b/.test(renderCall));
ok("render 调用带 locale", /\blocale\b/.test(renderCall));
const listCalls = [...src.matchAll(/regenListPage\([^)]*\)/g)].map((m) => m[0]);
ok(`regenListPage 每一处都带 catalog(共 ${listCalls.length} 处)`,
  listCalls.length > 0 && listCalls.every((c) => /\bcatalog\b/.test(c)));
ok("loadCtx 读了 data/chrome.json", src.includes('"data/chrome.json"'));
ok("loadCtx 读了 data/locales.json", src.includes('"data/locales.json"'));
ok("不再持久化 meta_title(派生值,化石刚删掉)", !/meta_title:\s*en\.meta_title/.test(src));

console.log("\n【② 跑生产那个函数(buildProductFiles),真实仓库数据】");
const ctx = {
  template: fs.readFileSync("data/templates/product.html", "utf8"),
  site: JSON.parse(fs.readFileSync("data/site.json", "utf8")),
  manifest: JSON.parse(fs.readFileSync("data/products-index.json", "utf8")),
  catalog: JSON.parse(fs.readFileSync("data/chrome.json", "utf8")),
  modelDisplay: JSON.parse(fs.readFileSync("data/locales.json", "utf8")).model_display,
};
const prod = JSON.parse(fs.readFileSync("data/products/4200.json", "utf8"));
const readPage = async (rel) => (fs.existsSync(rel) ? fs.readFileSync(rel, "utf8") : null);

let files = null, err = null;
try { files = await buildProductFiles(ctx, prod, { oldCategory: null, readPage }); }
catch (e) { err = e; }
ok("buildProductFiles 跑通(不抛)", !err, err ? err.message.slice(0, 110) : "");
if (files) {
  const detail = files.find((f) => f.path.endsWith(`${prod.id}.html`));
  const list = files.find((f) => f.path === "products/index.html");
  const json = files.find((f) => f.path.endsWith(`${prod.id}.json`));
  ok("产出详情页 + 列表页", !!detail && !!list, files.map((f) => f.path).join(" · ").slice(0, 95));
  ok("详情页没有未解析 token", !!detail && !/\{\{/.test(detail.content));
  ok("详情页没有 undefined", !!detail && !detail.content.includes("undefined"));
  const title = detail ? ((detail.content.match(/<title>([^<]*)<\/title>/) || [])[1] || "") : "";
  ok("<title> 非空且已派生", title.length > 10 && title.includes("Tejoy"), JSON.stringify(title.slice(0, 55)));
  const real = ctx.catalog["card.alt.suffix"] && ctx.catalog["card.alt.suffix"].en;
  ok("卡片 alt 来自 catalog,不是硬编码兜底", !!list && !!real && list.content.includes(`${real}"`), JSON.stringify(real));
  // ⚠️ 比【内容】不比字节:工作区 CRLF 检出、生成器吐 LF,比字节永远不等 —— 那是检出方式,不是回归。
  ok("英文列表页内容零回归", !!list && nl(list.content) === nl(fs.readFileSync("products/index.html", "utf8")));
  ok("不把派生的 meta_title 写回产品 JSON", !!json && !JSON.parse(json.content).i18n.en.meta_title);
}

console.log("\n【③ 反向:拿掉 catalog 必须抛,不许静默回落】");
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const EN = (p) => p;
const diskList = fs.readFileSync("products/index.html", "utf8");
ok("render 缺 catalog → 抛", throws(() => render(prod, { template: ctx.template, imgBase: ctx.site.img_base, related: [], locale: "en", modelDisplay: ctx.modelDisplay, urlOf: EN })));
ok("render 缺 modelDisplay → 抛", throws(() => render(prod, { template: ctx.template, imgBase: ctx.site.img_base, related: [], locale: "en", catalog: ctx.catalog, urlOf: EN })));
ok("regenListPage 缺 catalog → 抛", throws(() => regenListPage(diskList, ctx.manifest, null, { locale: "en", urlOf: EN })));

console.log(`\n${fail ? "🔴" : "✅"} admin-publish-check: ${fail} 项失败`);
process.exit(fail ? 1 : 0);
