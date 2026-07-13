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

export function render(prod, { template, imgBase, related }) {
  const e = prod.i18n.en;
  const slides = prod.images.map((im) =>
    `\n                  <div class="swiper-slide feedback-single bg-white position-relative rounded"><img src="${resolveImg(im, imgBase)}" alt="${im.alt}" class="img-fluid" loading="lazy"></div>`
  ).join("") + "\n                ";
  const cards = related.map((c) =>
    `\n              <div class="col-xl-3 col-lg-4 col-md-6">\n                <div class="blog-one__single">\n                  <a href="${c.href}">\n                    <div class="blog-one__img"><img src="${c.img}" alt="${c.alt}" loading="lazy"></div>\n                    <div class="blog-content"><h3 class="blog-one__title">${c.title}</h3></div>\n                  </a>\n                </div>\n              </div>`
  ).join("") + "\n            ";
  const summary = e.summary_html ? `<div class="item-explain">\n                ${e.summary_html}\n              </div>` : "";
  const robots = prod.robots ? `\n<meta name="robots" content="${prod.robots}">` : "";
  const reps = {
    META_TITLE: e.meta_title, KEYWORDS: e.keywords || "", META_DESC: e.meta_description,
    ROBOTS_META: robots, CANONICAL: `https://tejoy.com/${prod.category}/${prod.id}`,
    GALLERY_MAIN: slides, GALLERY_THUMB: slides, CATEGORY: CATMAP[prod.category] || prod.category,
    TITLE: e.title, SUMMARY_BLOCK: summary, DESCRIPTION: e.description_html,
    RELATED: cards, JSONLD_BREADCRUMB: prod.jsonld_breadcrumb || "", JSONLD_PRODUCT: prod.jsonld_product || "",
  };
  let r = template;
  for (const [k, v] of Object.entries(reps)) r = r.split(`{{${k}}}`).join(v);
  return r;
}

// entries: manifest rows {id,category,form,title,thumb}. Returns up to 4 related cards,
// same-category first, then same form-factor, then any — so no product is left empty.
export function genRelated(prodEntry, entries) {
  const byId = (a, b) => a.id - b.id;
  const others = entries.filter((p) => p.id !== prodEntry.id);
  const sameCat = others.filter((p) => p.category === prodEntry.category).sort(byId);
  const sameForm = others.filter((p) => p.category !== prodEntry.category && p.form === prodEntry.form).sort(byId);
  const rest = others.filter((p) => p.category !== prodEntry.category && p.form !== prodEntry.form).sort(byId);
  return [...sameCat, ...sameForm, ...rest].slice(0, 4).map((s) => ({
    href: `/${s.category}/${s.id}.html`,
    img: s.thumb || "",
    alt: `${s.title} - tejoy Products`,
    title: s.title,
  }));
}

// ---- List-page regen (/products/ + /{category}/): rebuild the card grid + chip counts ----
// form-factor bucket name -> data-form key used on the list pages.
export const FORM_KEY = {
  "Cables": "cables", "Mounts & Brackets": "mounts", "Power & Charging": "power",
  "Networking": "networking", "Cases & Protection": "cases",
};

export function cardHtml(e) {
  const alt = `${e.title} - tejoy Products`;
  return `\n              <div class="col-xl-3 col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="200ms" data-cat="${e.category}" data-form="${FORM_KEY[e.form] || ""}">\n                <div class="blog-one__single">\n                  <a href="/${e.category}/${e.id}.html">\n                    <div class="blog-one__img">\n                      <img src="${e.thumb}" alt="${alt}" loading="lazy">\n                    </div>\n                    <div class="blog-content">\n                      <h3 class="blog-one__title">${e.title}</h3>\n                      <p class="blog-one__tt">${e.excerpt || ""}</p>\n                    </div>\n                  </a>\n                </div>\n              </div>`;
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
export function regenListPage(html, entries, catFilter) {
  const scope = (catFilter ? entries.filter((e) => e.category === catFilter) : entries.slice())
    .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
  const cards = scope.map(cardHtml).join("") + "\n            ";
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
