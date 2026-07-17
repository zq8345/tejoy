import fs from "fs";
import { baseline } from "./scripts/_baseline.mjs";
// pt/marine 补齐 20 张卡(多语言签的 40 条译文)。总工批的 C 方案。
//
// 多语言的判断,我认:
//   · B(保持现状)不成立 —— pt 的那 10 篇恰好是 en 的最后 10 篇、一个连续区间,
//     那不是"挑给巴西人的",是【旧分页器第一页的残留】(我刚修掉的那个 bug)。
//     把 bug 的输出当成一个可选方案,是给它追认合法性。
//   · 它顶我那句也顶对了:我说"那 20 页在 pt 侧本来就点不到,所以没损失" —— 那是【状态论证】
//     =「我们一直有这个 bug,所以留着不亏」。而且那 10 张卡【已经在撒同样的谎】。
//   · 卡片用葡语描述英文文章不是撒谎 —— 那是图书馆目录。缺的只有一句"这本书是英文的"。
//
// ⚠️ 卡片链到 /marine/NN(en 正文),不是不存在的 /pt/marine/NN —— 这一步不写死,
//    它由 renderPage 的存在性规则算(Phase 3 一落地,链接自动切、badge 自动消失)。
const T = JSON.parse(fs.readFileSync("_marine-pt.json", "utf8"));
const ids = Object.keys(T).map(Number).sort((a, b) => b - a);

const F = "pt/marine/index.html";
const raw = baseline(F);                       // ⛔ 读基线,不读工作区
const crlf = fs.readFileSync(F, "utf8").includes("\r\n");
let h = raw;

const dateOf = (id) => {
  const p = baseline(`marine/${id}.html`);
  return ((p.match(/blog-details__meta"[^>]*>\s*<li>([^<]*)<\/li>/) || [])[1] || "").trim();
};
// pt 的日期格式:照抄 pt 侧现有卡片的写法,别自己发明(它是 pt 的形态,不是我的)
const ptDate = (iso) => {
  const M = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${M[m - 1]} de ${y}`;
};

const cardOf = (id) =>
  `              <div class="blog-sidebar__content-single">\n` +
  `                <div class="blog-sidebar__content-box">\n` +
  `                  <h3 class="blog-sidebar__title"> <a href="/marine/${id}">${T[id].title}</a> </h3>\n` +
  `                  <p class="time">${ptDate(dateOf(id))}</p>\n` +
  `                  <p class="blog-sidebar__text">${T[id].excerpt}</p>\n` +
  `                  <div class="blog-sidebar__read-more-btn"> <a href="/marine/${id}">Leia mais</a> </div>\n` +
  `                </div>\n` +
  `              </div>`;

const listed = [...new Set([...h.matchAll(/blog-sidebar__title"> <a href="\/marine\/(\d+)"/g)].map((m) => +m[1]))];
const missing = ids.filter((id) => !listed.includes(id));
console.log(`pt/marine 现有卡 ${listed.length} 张,补 ${missing.length} 张 → ${listed.length + missing.length}`);
if (!missing.length) { console.log("  已齐,无需补"); process.exit(0); }

// 追加在最后一张现存卡之后 —— 现有 10 张的字节完全不动
const last = Math.min(...listed);
const anchor = h.lastIndexOf(`href="/marine/${last}">Leia mais</a> </div>\n                </div>\n              </div>`);
if (anchor < 0) { console.log("  🔴 找不到最后一张卡的锚点 — 拒绝写"); process.exit(1); }
const end = h.indexOf("</div>", h.indexOf("</div>", h.indexOf("</div>", anchor) + 6) + 6) + 6;
const before = h;
h = h.slice(0, end) + "\n              \n" + missing.map(cardOf).join("\n              \n") + h.slice(end);
if (h === before) { console.log("  🔴 插入没发生 — 停"); process.exit(1); }   // 断言产物,不是断言函数返回

const bal = (s) => (s.match(/<div\b/g) || []).length - (s.match(/<\/div>/g) || []).length;
if (bal(raw) !== bal(h)) { console.log(`  🔴 div 失衡 ${bal(raw)} -> ${bal(h)} — 拒绝写`); process.exit(1); }
fs.writeFileSync(F, crlf ? h.replace(/\n/g, "\r\n") : h);

const now = [...new Set([...h.matchAll(/blog-sidebar__title"> <a href="\/marine\/(\d+)"/g)].map((m) => +m[1]))];
const oldCards = [...raw.matchAll(/<div class="blog-sidebar__content-single">[\s\S]*?<\/div>\s*<\/div>/g)].map((m) => m[0]);
const kept = oldCards.filter((c) => h.includes(c)).length;
console.log(`  ✅ 卡 ${now.length}/30 | div 平衡 ✅ | 原有 10 张逐字节原样: ${kept}/${oldCards.length}`);
