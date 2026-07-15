# pt-shell 权威 spec（给 dev：render.js locale 化用）

> ## ⭐ 给 dev 的 pt 种子 + 两条对账（静默期留档，直接取用，不必问我）
>
> **pt 种子真源（copy 不重译）**：
> - `phase2-convert.js` 的 **`CHROME[]` 数组**（约 38-90 行）= 全部 chrome 英→pt 字面映射（含 Phase2.5 sweep 补的 banner/Back/引导语/表单裸标签/占位符/分类过滤器）
> - `phase2-convert.js` 的 **`CAT_H1`** = 分类页 h1 机型专属词表
> - **`pt/index.html`** = pt 外壳三块（header/footer/mobile-nav）+ **修过的双模式切换器 CSS** 的定稿版
>
> **对账①：en footer 15 单元 vs pt 27 「不对齐」= 不是漂移。**
> 原因：**en 页脚靠 `FOOTER_LANGS` JS 运行时填**（Products/Guides 子项），**pt 侧我烘焙成静态了**
> （Phase1 起就删残渣+静态 footer）。所以 en 静态源里只数得到 15、pt 数得到 27。
> → 你把 en 也烘焙成静态后，两边自然对齐。**不用去找"谁改错了"，没人改错。**
>
> **对账②：header en 41 = pt 41 完美对齐。** 9 个「相同」里 6 个是计数、1 个箭头实体、
> **2 个是葡语同形词**（`Industrial`/`FAQ` —— 葡语拼写相同，不是漏译，别当缺口修）。
>
> **另：`meta_title` 别沿用我的做法。** 我的 JSON 里存了 `i18n["pt-BR"].meta_title`（机械派生=英文产品名+pt后缀），
> 靠字符串替换保持同步 → 必然有「改了一半」的中间态（我手改过一次就产出了半英半葡的 title，被 scanner 抓到）。
> **总调度定的正解：R2 直接派生 `meta_title = 本地化标题 + {{t.meta.title.suffix}}`（后缀是 catalog key），JSON 不存 meta_title。**
> 我已停止手动维护它，你落地时直接取代即可。
>
> **验收 oracle**：`node scripts/pt-leak-scan.mjs`（两类检查，exit 1）。基线冻结在 `i18n-baseline.md`
> （scanner v1.0.0 @ 836f341f，**translationLeaks = 501 → 应逼近 0**）。
> ⚠️ **`e_links` 那 35 处（7 个 Phase-1 pt 页页脚）正是 `localizeUrl` 该由构造杀掉的**——你的样板验其中一页即可。
> ⚠️ 别按 N=547 验收：其中 46 处是 `alt` 直接写了图片文件名（英文站同样如此）= 既有数据问题，R2 不会修，不该计入。

多语言窗是 pt 外壳的**唯一真源**。dev 让 `functions/_lib/render.js` 输出 pt 页时，**吸收这套规则，别重发明**。参考实现=`phase2-convert.js`（repo根，untracked，已生产验证 64详情+5分类上线）。下面是 render.js locale 化必须落地的契约与规则。

## 0. 数据契约（开工前对齐，避免键对不上）
`data/products/{id}.json` 的 `i18n["pt-BR"]` 字段集（多语言窗正在写入）：
```json
"i18n": {
  "en":    { "title","summary_html","description_html","keywords","meta_title","meta_description" },
  "pt-BR": { "summary_html","description_html","meta_description" }   // 只这3个是翻译内容
}
```
- **title / keywords / meta_title 不在 pt-BR 里** → render.js 取 pt 时对这些字段**回退 en**。
- **meta_title(pt) = 机械派生**（非翻译）：`en.meta_title` 把固定后缀 ` | Premium Starlink Accessories, Mounts &amp; Power Solutions` 换成 ` | Acessórios Premium para Starlink, Suportes e Soluções de Energia`，其余（产品名+`-{Model}-Tejoy`）保持英文。render.js 生成 pt 页时做这个替换即可。
- **字段级回退原则**：`const e = mergeI18n(prod.i18n.en, prod.i18n['pt-BR'])`（pt 有则用 pt，缺则用 en）。

## 1. 输出路径 & clean URL
- pt 详情页写 `pt/{category}/{id}.html`；pt 分类页写 `pt/{category}/index.html`。
- URL 全 clean（`/pt/mini/4200` 无 .html）；CF 对 `/pt/*` 的 clean-URL 路由已实测通（`/pt/mini/4199`→200）。canonical/hreflang/og/内链都用 clean。

## 2. 外壳（nav/footer/mobile-nav）
- 权威 pt 外壳 = `pt/index.html` 的 `<header class="main-header clearfix">…</header>`、`<footer class="site-footer">…</footer>`、`<div class="mobile-nav__wrapper">…`（到 `<a ... scroll-to-target scroll-to-top>` 前）。
- render.js 生成 pt 页时用 pt 版外壳替换英文外壳（phase2-convert.js `loadShell()` 就是从 pt/index.html 抽这三块）。
- **删残渣**：pt 页不得含 `FOOTER_LANGS` `<script>` 和 `getCookie('lg')` 翻译 `<script>`（英文模板里有，pt 要删）。也删两条孤儿注释 `<!-- 多语言页脚数据… -->` `<!-- 多语言Home/首页客户端翻译… -->`。

## 3. head 接线（pt 页）
- `<html lang="pt-BR">`
- canonical / og:url / hreflang(pt-BR) = `https://tejoy.com/pt/{path}`
- hreflang trio：`en`→英文原路径、`pt-BR`→/pt/路径、`x-default`→英文原路径
- og:locale=`pt_BR`；JSON-LD `inLanguage`=`pt-BR`、Breadcrumb item→/pt/、`"name":"Home"`→`"Início"`
- title/keywords 用 en（回退）；meta_description 用 pt；meta_title 用机械派生 pt

## 4. 语言切换器（双向，两侧都要）
- **样式（内联，双模式定位）**——见 pt/index.html head 内 `.lang-switch` `<style>` 块：桌面 `position:absolute;top:50%;right:24px;transform:translateY(-50%)`；`@media(max-width:1199px){position:static;grid-column:2;justify-self:end}`。（这是修过 logo 重叠的最终版，务必照搬。）
- **pt 页**：nav 里放 EN 切换块，`<a href="{英文原clean路径}" class="lang-switch__link" hreflang="en" …><span>EN</span></a>`
- **英文页**：nav 里放 PT 切换块（`hreflang="pt-BR"`、`<span>PT</span>`、href=`/pt/`路径），插在 `<div class="main-menu-wrapper__call">` 前；英文页也要补 reciprocal hreflang trio。（phase2-convert.js `injectEnSide()` 即此逻辑。）

## 5. chrome 字面映射（完整表在 phase2-convert.js 的 `CHROME` 数组）
render.js 生成 pt 页时对可见 chrome 文本做这些字面替换（节选，全量见 phase2-convert.js）：
Category:→Categoria: · Send an Inquiry→Envie uma consulta · Contact Now→Fale conosco agora · Related products→Produtos relacionados · Back→Voltar · Description→Descrição · Submit→Enviar · 表单标签(Company Name/Name/Phone/Email/Message→Nome da empresa/Nome/Telefone/E-mail/Mensagem)含 sr-only 与可见裸文本两处 · 占位符 · banner(Products→Produtos + 副标题) · 咨询引导语 · 分类过滤器(Model→Modelo/Type→Tipo/All→Todos/Cables→Cabos/Networking→Redes/Mounts & Brackets→Suportes e Fixações/Power & Charging→Energia e Carregamento/Cases & Protection→Cases e Proteção) · aria-label="logo image"→"Página inicial"

## 6. 链接策略（prefixPtLinks，见 phase2-convert.js）
- **产品目录**（mini/standard/enterprise/standard-actuated/standard-circular/performance-gen-1/performance-gen-3/products）：hub 与详情页 href 都加 `/pt/`。
- **hub 目录**（compatibility/about/contact/marine/rv-off-grid/mounts/power）：**只 `/dir/` 本身**加 `/pt/`；其**文章子页**（如 `/marine/4382`）**保持英文**（指南文章 Phase3 才译）→ 否则软404。
- 其余（faq/video/service/hangye/industrial…）保持英文。static/skin/mailto/#锚照旧。
- ⚠️切换器的 EN 链必须指英文原路径，**最后设、别被 prefixPtLinks 误加 /pt/**（phase2-convert.js 用顺序解决：prefixPtLinks 在前、设切换器 href 在最后）。

## 7. 分类页 h1 机型专属词表（总工 2026-07-14）
enterprise→Acessórios para Starlink Enterprise · performance-gen-1→…Performance (Gen 1) · performance-gen-3→…Performance (Gen 3) · standard-actuated→…Standard Actuated · standard-circular→…Standard Circular（对应英文 `Starlink {Model} Accessories`）。

## 8. 验收标尺（render.js pt 输出退役 phase2-convert.js 的门槛，总工验）
- **en 字节一致**：render.js 生成的英文页与现网英文页字节一致（locale 化不能动 en 输出）。
- **pt 正确**：div 平衡、无残渣、hreflang trio、双向切换器、chrome 全 pt、i18n.pt-BR 内容进页、meta_title 机械派生对。
- **漏斗通 + 零死链**：pt 列表→pt 详情→相关产品全 /pt/ 且存在（现网 2682 链 0 死链，别回退）。
- phase2-convert.js **先别删**，留作 fallback/对照，等 render.js pt 输出验通再退役。
