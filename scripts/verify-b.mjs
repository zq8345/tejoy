#!/usr/bin/env node
// R3(b) 验收:生成的 22 个页 vs HEAD,减掉【逐条点名】的有意结构修复后必须内容零回归。
//
// ⚠️ 写成文件,不再用 shell 转义的 node -e。那条路上我栽了太多次:$1/$2 被 shell 吃掉、
// 正则被分隔符咬断 —— 于是我读到的是【我的检查器的 bug】,却当成了活儿的 bug,
// 甚至据此宣布"抽取器有跨 slug 状态串扰、之前所有数据作废"。那是假警报。
// 检查器和被检对象一样需要被当成代码对待。
import fs from "fs";
import { execSync } from "child_process";

const ws = (s) => s.replace(/\r\n/g, "\n").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

// 有意的结构修复,逐条点名 —— 不是把整类排除掉让门变绿
// ① breadcrumb 由 route 派生:position 1 = 首页,position 2 = 本页(en 存量 bug 由构造修复)
// ② FAQPage 的 @id 同理(en/faq 写的是 tejoy.com/?faq/ —— 全站唯一,来源查不到,不写进结论)
// ③ 重复 description 去重:总工逐页读了全文后裁的,不是通用规律
// ④ hreflang 由 route 派生、两侧都发(en 侧时有时无,pt 齐全)
const KEEP = { contact: 1, "certifications-testing": 1, compatibility: 1, "oem-odm-manufacturing": 1,
  "patents-manufacturing": 1, "starlink-compatible-accessories": 0, video: 0 };

// ⚠️ 这条注释是【已知的固定串】,就用字面量 —— 别给通配符留任何空间。
// 我先写 [^>]*:注释里含 "<->",它在第一个 ">" 就停,永远匹配不上(假绿)。
// 改成 [\s\S]*? 更糟:"hreflang alternates" 左边那个通配符是【无界】的,于是它从 head 里第一个
// <!-- 一路吞到 hreflang 注释,把中间所有 JSON-LD 块全吃掉 —— 然后我看着自己检查器造出来的
// 残骸,以为是生成器把 about 的 head 截断了。生成的页面从头到尾都是好的。
// 一个左边无界的惰性通配符,不是"宽松一点",是一把会吃掉任意长度的剪刀。
const HL_COMMENT = "<!-- hreflang alternates (en <-> pt paired page) -->";
const killHL = (s) => s.split(HL_COMMENT).join("")
  .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>/g, "");

const intended = (s, slug, isPt) => {
  const self = `https://tejoy.com${isPt ? "/pt/" : "/"}${slug}/`;
  const home = isPt ? "https://tejoy.com/pt/" : "https://tejoy.com";
  if (isPt) {
    // ⑤ pt 独有的开发者注释。模板只有一份、从 en 出,所以 pt 会丢掉它。它在 </footer> 之后、
    // 不是 chrome-sync 的锚点(那个用的是 partial 里的 <!-- #block:name -->),对读者不可见。
    s = s.split("<!--Site Footer End-->").join("");
    // ⑥ ⭐ 这一处【pt 才是有缺陷的那边】—— 头一回。pt/contact 有【两个】author meta:
    //    顶部多一个 content="tejoy.com"(还坐在 <meta charset> 前面),下面才是正常的
    //    content="tejoy";en 只有后者。模板从 en 出,正好把这个重复且值不一致的 meta 去掉 = 修复。
    //    「pt 永远对」也不是规律 —— 规律是【哪边对要逐条问】,这次答案就是 en。
    if (slug === "contact") s = s.replace(/[ \t]*<meta name="author" content="tejoy\.com" \/>\s*\n?/, "");
  }
  let n = 0;
  s = s.replace(/("item": ")([^"]*)(")/g, (m, a, v, c) => { n++; return n === 1 ? a + home + c : n === 2 ? a + self + c : m; });
  s = s.replace(/('@id':\s*')[^']*(#[^']*')/, (m, a, c) => a + self + c);
  const all = [...s.matchAll(/[ \t]*<meta name="description" content="[^"]*"[^>]*>\s*\n?/g)];
  if (all.length > 1) { const k = KEEP[slug] ?? 0; all.forEach((m, i) => { if (i !== k) s = s.replace(m[0], ""); }); }
  return s;
};

const PAGES = ["faq", "about", "contact", "service", "certifications-testing", "oem-odm-manufacturing",
  "patents-manufacturing", "video", "compatibility", "brand-affiliation-faq", "starlink-compatible-accessories"];
let ok = 0; const bad = [];
for (const slug of PAGES) {
  for (const isPt of [false, true]) {
    const f = `${isPt ? "pt/" : ""}${slug}/index.html`;
    if (!fs.existsSync(f)) continue;
    const head = execSync(`git show HEAD:"${f}"`, { encoding: "utf8", maxBuffer: 1 << 26 });
    const want = ws(killHL(intended(head, slug, isPt)));
    const got = ws(killHL(fs.readFileSync(f, "utf8")));
    if (want === got) { ok++; continue; }
    let i = 0; while (i < Math.min(want.length, got.length) && want[i] === got[i]) i++;
    bad.push({ f, i, want: want.slice(Math.max(0, i - 55), i + 80), got: got.slice(Math.max(0, i - 55), i + 80) });
  }
}
console.log(`R3(b) 内容零回归(减掉逐条点名的有意结构修复): ${ok} / ${ok + bad.length}`);
for (const b of bad.slice(0, 4)) {
  console.log(`\n🔴 ${b.f} @${b.i}`);
  console.log(`   期望: ${JSON.stringify(b.want)}`);
  console.log(`   生成: ${JSON.stringify(b.got)}`);
}
if (bad.length > 4) console.log(`\n   …另 ${bad.length - 4} 个`);
process.exit(bad.length ? 1 : 0);
