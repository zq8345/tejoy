import fs from "fs";
// 解析多语言交的 40 条译文。先【对账】再用:20 个标题 + 20 段摘要,一条都不能少、
// 也不能多出一个 en 那边没有的 id —— 交付物本身也要过门,不能因为它是别人交的就免检。
const md = fs.readFileSync("pt-marine-cards.md", "utf8");
const rows = [...md.matchAll(/^\|\s*\*\*(\d+)\*\*\s*\|\s*`([^`]+)`\s*\|/gm)].map((m) => [+m[1], m[2]]);
const byId = {};
for (const [id, v] of rows) (byId[id] ||= []).push(v);

const onDisk = fs.readdirSync("marine").filter((f) => /^\d+\.html$/.test(f)).map((f) => +f.replace(".html", ""));
const ptHas = onDisk.filter((id) => fs.existsSync(`pt/marine/${id}.html`));
const need = onDisk.filter((id) => id <= 81).sort((a, b) => b - a);   // pt hub 缺的那 20 篇

console.log(`译文表格行 ${rows.length} | 涉及 ${Object.keys(byId).length} 个 id`);
console.log(`marine 磁盘 ${onDisk.length} 篇 | pt 侧有正文 ${ptHas.length} 篇 | pt hub 缺卡 ${need.length} 篇`);
const counts = {};
Object.entries(byId).forEach(([id, v]) => (counts[v.length] ||= []).push(id));
for (const [n, ids] of Object.entries(counts)) console.log(`  每个 id ${n} 条译文: ${ids.length} 个 id`);

const missing = need.filter((id) => !byId[id] || byId[id].length < 2);
const extra = Object.keys(byId).map(Number).filter((id) => !need.includes(id));
console.log(`\n对账:`);
console.log(`  需要 ${need.length} 个 id × 2 条(标题+摘要)= ${need.length * 2} 条`);
console.log(`  缺译文的 id: ${missing.length} ${missing.length ? missing.join(",") : "✅"}`);
console.log(`  多出来的 id: ${extra.length} ${extra.length ? extra.join(",") : "✅"}`);
if (!missing.length && !extra.length) {
  fs.writeFileSync("_marine-pt.json", JSON.stringify(Object.fromEntries(need.map((id) => [id, { title: byId[id][0], excerpt: byId[id][1] }])), null, 2));
  console.log(`\n✅ 40 条齐、无多余 → _marine-pt.json`);
  console.log(`   样例 81: ${JSON.stringify(byId[81][0].slice(0, 50))}`);
  console.log(`            ${JSON.stringify(byId[81][1].slice(0, 50))}`);
}
