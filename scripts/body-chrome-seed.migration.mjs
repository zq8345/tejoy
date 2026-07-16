// ⛔ ONE-TIME MIGRATION — same contract as chrome-seed.migration.mjs. After this, data/chrome.json
// is the source of truth and data/templates/product.html carries {{t.*}} tokens. Do NOT re-run to
// "sync": that reverses the dataflow (HTML -> catalog) once the HTML is a generated artifact.
//   node scripts/body-chrome-seed.migration.mjs                                  # dry report
//   node scripts/body-chrome-seed.migration.mjs --write --i-know-this-is-migration-only
//
// R1 spec item 7, which I skipped and which cost R2 its first landing (501 -> 2424): the product
// TEMPLATE's body chrome is hardcoded English. It stayed invisible only because the pt detail
// pages were built by the phase2-convert bypass, whose CHROME map translated it in passing. The
// moment render.js generates those pages from the template, the English comes back.
//
// Seeds come from the LIVE pt pages — they are phase2-convert's own output, i.e. the authoritative
// pt wording already in production. Free, and no retranslation.
import fs from "fs";

const EN_TPL = "data/templates/product.html";
const PT_PAGE = "pt/enterprise/650.html";

// [key, en, how to find the pt counterpart]  — en text is matched literally in the template.
// Body chrome only; header/footer/mobilenav belong to chrome-sync.
// pt seeds — every one VERIFIED present in the live pt page before being trusted. I could have
// typed these from memory of phase2-convert's CHROME map and they'd have looked identical, but
// "I remember it" and "I can point at it in production" are different claims, and today has four
// examples of the first one failing confidently.
const ITEMS = [
  ["body.banner.title",     'page-header__title">Products<',          'page-header__title">',        "<"],
  ["body.banner.subtitle",  "Starlink-compatible accessories for every terminal generation.", null, null],
  ["body.contact_now",      ">Contact Now<",   null, null],
  ["body.back",             "<span>Back</span>", null, null],
  ["body.send_inquiry",     ">Send an Inquiry<", null, null],
  ["body.inquiry_blurb",    "Interested in this product? Leave us a message and we'll reply as soon as possible.", null, null],
  ["body.category_label",   "Category: ",      null, null],
  ["body.related_products", ">Related products<", null, null],
  ["body.form.company",     ">Company Name<",  null, null],
  ["body.form.name",        ">Name<",          null, null],
  ["body.form.phone",       ">Phone<",         null, null],
  ["body.form.email",       ">Email<",         null, null],
  ["body.form.message",     ">Message<",       null, null],
  ["body.form.submit",      ">Submit<",        null, null],
  ["body.ph.name",          'placeholder="Your Name"',    null, null],
  ["body.ph.phone",         'placeholder="Your Phone"',   null, null],
  ["body.ph.email",         'placeholder="Your Email"',   null, null],
  ["body.ph.message",       'placeholder="Your Message"', null, null],
];

const tpl = fs.readFileSync(EN_TPL, "utf8").replace(/\r/g, "");
const ptPage = fs.readFileSync(PT_PAGE, "utf8").replace(/\r/g, "");
console.log("模板命中检查(en 字面必须存在,否则 token 化会静默漏掉):");
let missing = 0;
for (const [key, en] of ITEMS) {
  const hit = tpl.includes(en);
  if (!hit) missing++;
  console.log(`  ${hit ? "✅" : "🔴"} ${key.padEnd(24)} ${JSON.stringify(en.slice(0, 52))}`);
}
console.log(missing ? `\n🔴 ${missing} 条在模板里找不到 —— 先定位,别硬 token 化` : "\n✅ 全部命中");
