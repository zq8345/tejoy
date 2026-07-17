#!/usr/bin/env node
// 回归测试:钉住那些【已经咬过我们两次以上】的行为。
//   node scripts/render.test.mjs
//
// 每一条都对应一个真事故,不是想象出来的边界。测试存在的意义是把"我记得"换成"它会炸"。
import { renderPage, assertNoTokens } from "../functions/_lib/render.js";
import { visibleText } from "./page-extract.migration.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  🔴 ${name} ${extra}`); } };
const throws = (name, fn, re) => {
  try { fn(); fail++; console.log(`  🔴 ${name} — 没抛`); }
  catch (e) { const m = re.test(e.message); if (m) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  🔴 ${name} — 抛了但不是预期的: ${e.message}`); } }
};

const urlOf = (p) => p;
const cat = { "x.a": { en: "A", "pt-BR": "Á" } };

console.log("\n【① canonical 必须是每页自己的路径】 —— 曾把 11 个信息页全部规范化到首页:");
ok("每页 canonical 用自己的 path",
  renderPage('<link rel="canonical" href="{{CANONICAL}}" />', { locale: "en", catalog: cat, urlOf, path: "/faq/" })
    .includes('href="https://tejoy.com/faq/"'));
ok("pt 加 /pt 前缀",
  renderPage('<link rel="canonical" href="{{CANONICAL}}" />', { locale: "pt-BR", catalog: cat, urlOf, path: "/faq/" })
    .includes('href="https://tejoy.com/pt/faq/"'));
throws("path 形状不对就炸(而不是悄悄当成首页)",
  () => renderPage("{{CANONICAL}}", { locale: "en", catalog: cat, urlOf, path: "faq" }), /path 必须形如/);
ok("breadcrumb 首页 URL 与本页 URL 是两个不同的 token",
  renderPage('{{HOME_URL}}|{{CANONICAL}}', { locale: "en", catalog: cat, urlOf, path: "/faq/" }) === "https://tejoy.com|https://tejoy.com/faq/");

console.log("\n【② 否定式:任何剩下的 {{...}} 都要炸】 —— 曾因正则不认连字符而放行:");
throws("带连字符的 token(正则曾不认识它,于是它被原样印出去)",
  () => renderPage("{{t.certifications-testing.meta.keywords}}", { locale: "en", catalog: cat, urlOf, path: "/x/" }), /不存在的 key|未解析/);
throws("我还没想到的 token 形状,也必须炸",
  () => assertNoTokens("<p>{{SOMETHING_I_NEVER_ANTICIPATED}}</p>", "en"), /未解析的 token/);
throws("拼错的 token 不会静默留在页面上",
  () => assertNoTokens("<p>{{t.x.a</p>{{ t.x.a }}", "en"), /未解析的 token/);
ok("解析干净就不炸", renderPage("{{t.x.a}}", { locale: "pt-BR", catalog: cat, urlOf, path: "/x/" }) === "Á");

console.log("\n【③ 紧跟【闭】标签后面的裸文本】 —— 同一个 bug 咬了两次(R1 的 seeder,R3(b) 的 contact/oem-odm):");
ok("</label>Name —— 用户真正读的那半,曾被整个漏掉",
  visibleText("<label>A</label>Name<input>").includes("Name"), JSON.stringify(visibleText("<label>A</label>Name<input>")));
ok("同时也要抓到标签包着的那半",
  visibleText("<label>A</label>Name<input>").includes("A"));
ok("连续闭标签之间的文本",
  visibleText("<div><b>x</b></div>Bare<div></div>").includes("Bare"));
ok("不含字母的不是散文(→ × 纯数字…一条规则代替一串特例)",
  visibleText("<span>→</span><b>12</b><i>Hi</i>").join("|") === "Hi");
ok("script/style 里的内容不是散文",
  visibleText("<style>.a{color:red}</style><script>var x='Hi'</script><p>Real</p>").join("|") === "Real");

console.log(`\n${fail ? "🔴" : "✅"} ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
