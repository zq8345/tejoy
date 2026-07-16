// Canonical product-page render — imported by BOTH scripts/regen.mjs (Node, local) and
// the CF Pages Function (Workers, publish-time regen). Pure string templating; no runtime
// APIs. related is generated from lightweight manifest entries {id,category,form,title,thumb}
// so publish-time regen needs only the manifest (not every product JSON).

export const CATMAP = {
  "mini": "Mini", "standard": "Standard", "standard-actuated": "Standard-Actuated",
  "standard-circular": "Standard-Circular", "performance-gen-1": "Performance-Gen-1",
  "performance-gen-3": "Performance-Gen-3", "enterprise": "Enterprise",
};

export function resolveImg(im, imgBase) {
  return im && im.key !== undefined ? imgBase + im.key : (im ? im.src : "");
}

// Field-level locale merge: every field falls back to en when the locale lacks it
// (i18n[locale][field] ?? en[field]) — including title (a pt title still carries tokens like
// Type-C/RJ45/AWG and the model name). keywords is en-only, outside the pt-BR contract.
//
// meta_title is deliberately NOT read from data here — it is DERIVED (see metaTitleOf). A derived
// value stored as data drifts the moment someone edits the title, and the drift is invisible:
// that is exactly how "For Roteador Starlink Mini Cable…" (half English, half pt) got shipped.
// Derived values are not data.
export function mergeI18n(prod, locale) {
  const en = prod.i18n.en;
  if (locale === "en") return en;
  const loc = (prod.i18n && prod.i18n[locale]) || {};
  return {
    title: loc.title ?? en.title,
    keywords: en.keywords,
    summary_html: loc.summary_html ?? en.summary_html,
    description_html: loc.description_html ?? en.description_html,
    meta_description: loc.meta_description ?? en.meta_description,
  };
}

// meta_title = {localized title}-{model display}-Tejoy{locale brand suffix}.
// Reproduces the stored value for all 64 products exactly, so deriving loses nothing and cannot
// go half-translated. Adding a language costs one catalog key, not 64 stored strings.
export function metaTitleOf(e, prod, locale, modelDisplay, catalog) {
  const sfx = catalog && catalog["meta.title.suffix"];
  const model = modelDisplay && modelDisplay[prod.category];
  // Without the catalog/model map wired in, fall back to the STORED meta_title so this change is
  // strictly additive: a caller that hasn't been updated behaves exactly as before. Deriving with
  // an empty suffix would silently drop the brand tail from every en <title> — a caller half-way
  // through migration must not be able to quietly break output.
  if (!sfx || !model) return prod.i18n.en.meta_title;
  const suffix = sfx[locale] ?? sfx.en ?? "";
  return `${e.title}-${model}-Tejoy${suffix}`;
}

export function render(prod, { template, imgBase, related, locale = "en", modelDisplay, catalog }) {
  const e = mergeI18n(prod, locale);
  const slides = prod.images.map((im) =>
    `\n                  <div class="swiper-slide feedback-single bg-white position-relative rounded"><img src="${resolveImg(im, imgBase)}" alt="${im.alt}" class="img-fluid" loading="lazy"></div>`
  ).join("") + "\n                ";
  const cards = related.map((c) =>
    `\n              <div class="col-xl-3 col-lg-4 col-md-6">\n                <div class="blog-one__single">\n                  <a href="${c.href}">\n                    <div class="blog-one__img"><img src="${c.img}" alt="${c.alt}" loading="lazy"></div>\n                    <div class="blog-content"><h3 class="blog-one__title">${c.title}</h3></div>\n                  </a>\n                </div>\n              </div>`
  ).join("") + "\n            ";
  const summary = e.summary_html ? `<div class="item-explain">\n                ${e.summary_html}\n              </div>` : "";
  const robots = prod.robots ? `\n<meta name="robots" content="${prod.robots}">` : "";
  // JSON-LD Product embeds the English meta_description verbatim; for a non-en locale swap it so
  // the structured data matches the visible <meta>. The name field stays en (SKU/model).
  let jsonldProduct = prod.jsonld_product || "";
  if (locale !== "en" && jsonldProduct) {
    const enDesc = prod.i18n.en.meta_description;
    if (enDesc && e.meta_description && e.meta_description !== enDesc) jsonldProduct = jsonldProduct.split(enDesc).join(e.meta_description);
  }
  const reps = {
    META_TITLE: metaTitleOf(e, prod, locale, modelDisplay, catalog), KEYWORDS: e.keywords || "", META_DESC: e.meta_description,
    ROBOTS_META: robots, CANONICAL: `https://tejoy.com/${prod.category}/${prod.id}`,
    GALLERY_MAIN: slides, GALLERY_THUMB: slides, CATEGORY: (modelDisplay && modelDisplay[prod.category]) || CATMAP[prod.category] || prod.category,
    TITLE: e.title, SUMMARY_BLOCK: summary, DESCRIPTION: e.description_html,
    RELATED: cards, JSONLD_BREADCRUMB: prod.jsonld_breadcrumb || "", JSONLD_PRODUCT: jsonldProduct,
  };
  let r = template;
  for (const [k, v] of Object.entries(reps)) r = r.split(`{{${k}}}`).join(v);
  return r;
}

// entries: manifest rows {id,category,form,title,thumb}. Returns up to 4 related cards,
// same-category first, then same form-factor, then any — so no product is left empty.
// A manifest entry's title/excerpt are English; a locale's are under entry.i18n[locale].
// Same field-level fallback rule as the catalog — one rule, applied everywhere.
export const entryTitle = (e, locale) => (e.i18n && e.i18n[locale] && e.i18n[locale].title) || e.title;
export const entryExcerpt = (e, locale) => (e.i18n && e.i18n[locale] && e.i18n[locale].excerpt) ?? (e.excerpt || "");
// The card alt suffix is a template string, so it belongs in the catalog — not hardcoded here,
// where no guard could ever see it and every new language would inherit English silently.
// (The i18n window argues this suffix should not exist at all — 64 cards means a screen-reader
// user hears it 64 times — but removing it changes the EN alt output and would break R2's own
// "en byte-identical" gate. So: use it now, delete it as its own change. r1-findings.md §8.5.)
const altOf = (title, locale, catalog) => {
  const s = catalog && catalog["card.alt.suffix"];
  const suffix = (s && (s[locale] ?? s.en)) ?? "- tejoy Products";
  return `${title} ${suffix}`;
};

export function genRelated(prodEntry, entries, locale = "en", catalog) {
  const byId = (a, b) => a.id - b.id;
  const others = entries.filter((p) => p.id !== prodEntry.id);
  const sameCat = others.filter((p) => p.category === prodEntry.category).sort(byId);
  const sameForm = others.filter((p) => p.category !== prodEntry.category && p.form === prodEntry.form).sort(byId);
  const rest = others.filter((p) => p.category !== prodEntry.category && p.form !== prodEntry.form).sort(byId);
  return [...sameCat, ...sameForm, ...rest].slice(0, 4).map((s) => {
    const title = entryTitle(s, locale);
    return { href: `/${s.category}/${s.id}`, img: s.thumb || "", alt: altOf(title, locale, catalog), title };
  });
}

// ---- List-page regen (/products/ + /{category}/): rebuild the card grid + chip counts ----
// form-factor bucket name -> data-form key used on the list pages.
export const FORM_KEY = {
  "Cables": "cables", "Mounts & Brackets": "mounts", "Power & Charging": "power",
  "Networking": "networking", "Cases & Protection": "cases",
};

export function cardHtml(e, locale = "en", catalog, urlOf) {
  const title = entryTitle(e, locale);
  const alt = altOf(title, locale, catalog);
  const href = urlOf ? urlOf(`/${e.category}/${e.id}`, locale) : `/${e.category}/${e.id}`;
  return `\n              <div class="col-xl-3 col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="200ms" data-cat="${e.category}" data-form="${FORM_KEY[e.form] || ""}">\n                <div class="blog-one__single">\n                  <a href="${href}">\n                    <div class="blog-one__img">\n                      <img src="${e.thumb}" alt="${alt}" loading="lazy">\n                    </div>\n                    <div class="blog-content">\n                      <h3 class="blog-one__title">${title}</h3>\n                      <p class="blog-one__tt">${entryExcerpt(e, locale)}</p>\n                    </div>\n                  </a>\n                </div>\n              </div>`;
}

function updateChips(html, id, countFn) {
  return html.replace(new RegExp(`(<div class="product-chips" id="${id}">)([^]*?)(</div>)`), (m, open, inner, close) => {
    const upd = inner.replace(/(data-filter="([^"]+)"[^>]*>[^<]*<span class="product-chip__n">)(\d+)(<\/span>)/g,
      (mm, pre, f, old, post) => pre + countFn(f) + post);
    return open + upd + close;
  });
}

// Rebuild #productGrid cards + the model/form chip counts. catFilter=null for /products/,
// or a category slug for /{category}/. Returns updated html (unchanged if no #productGrid).
export function regenListPage(html, entries, catFilter, { locale = "en", catalog, urlOf } = {}) {
  const scope = (catFilter ? entries.filter((e) => e.category === catFilter) : entries.slice())
    .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
  // NB: must be an arrow, not `scope.map(cardHtml)` — map passes (el, index, array), so the bare
  // reference would feed the INDEX in as `locale`. It would even look fine in en (an unknown
  // locale falls back to English), which is the worst kind of wrong: right by accident.
  const cards = scope.map((e) => cardHtml(e, locale, catalog, urlOf)).join("") + "\n            ";
  html = html.replace(
    /(<div class="row" id="productGrid">)(?:\s*<div class="col-xl-3[^"]*"[^>]*data-cat="[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/div>\s*<\/div>)*\s*(<\/div>)/,
    (m, open, close) => open + cards + close
  );
  const countModel = (f) => (f === "all" ? entries.length : entries.filter((e) => e.category === f).length);
  const countForm = (f) => (f === "all" ? scope.length : scope.filter((e) => FORM_KEY[e.form] === f).length);
  html = updateChips(html, "modelChips", countModel);
  html = updateChips(html, "formChips", countForm);
  return html;
}

// Short text excerpt for list cards (first ~92 chars of description/summary).
// Derived, never stored: the excerpt is the head of the description. Deriving it per locale means
// a pt card excerpt follows the pt description automatically — nobody has to remember to update
// a second copy, and it cannot go stale.
export function excerptOf(prod, locale = "en") {
  const e = mergeI18n(prod, locale);
  const txt = (e.description_html || e.summary_html || "")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  return txt ? txt.slice(0, 92).trim() + " ···" : "";
}
