# 【3】重复 meta description —— **根找到了，但它不是"重复注入"**

> 总调度：「**别一页页删** —— 先找出为什么会重复注入。**改根，不是改症状。** 找不到根就报我，别硬删。」
> **找到了，而且跟假设不同：没有"注入"这回事。所以我没删。**

---

## ⚠️ 一、规模比报告说的大：**31 个，不是 13 个**

我扫了全站 249 个 HTML（有 description 的 248 个），**重复的 description 值共 3 组**：

| 组 | 页面数 | 内容 |
|---|---|---|
| **A** | **21** | `Tejoy is a leading manufacturer of Starlink-compatible accessories…`（en 站点标语） |
| **B** | **8** | `A Tejoy é uma fabricante líder de acessórios compatíveis com Starlink…`（pt 站点标语） |
| **C** | **2** | `Discover the must-have Starlink Marine Accessories…`（`marine/88` + `marine/91`） |

**合计 31 个页面**，其中包括**首页 `index.html`** 和 **`404.html`**。

---

## ⭐ 二、根：**不是"重复注入"，是"从来没人给它们写过"**

### 我先错了一次，记下来
我第一反应是查生成器模板，果然在 `data/templates/product.html` 里找到了这句话 → **差点结案说"模板硬编码了默认 description"**。

**但那是错的**。逐行看模板：
```
第 97 行：<meta name="description" content="{{META_DESC}}">     ← 正常占位符
第 133 行："description": "Tejoy is a leading manufacturer…"      ← 这是 JSON-LD 里的
```
`render.js:27` 会把 `META_DESC` 替换成 `e.meta_description` → **产品详情页有自己的 description**（实测 `mini/4200.html` ✅）。

### 真相
| 事实 | 数字 |
|---|---|
| 这句话出现在 **JSON-LD 的 `"description"`** 字段 | **228 个文件** |
| 这句话被用作 **`<meta name="description">`** | **21 个文件** |

**JSON-LD 里那 228 个是 `"@type": "WebSite"` 的站点描述 —— 全站一致是正确的，不是缺陷。**（已核实 `@type`）

**没有任何脚本在生成这 31 个页面的 description**（`scripts/` 下全是我写的审计脚本，`regen.mjs` 只管产品页）。

→ **它们是手写的静态页。作者没给它们写 description，就把首页那句站点标语复制过来凑数了。**
→ **「重复注入」这个根不存在 —— 没有注入器。**

---

## 三、所以「改根」是什么意思

**没有根可改。** 31 个页面缺的是**内容**，不是**机制**。选项只有两个：

| 方案 | 做法 | 代价 |
|---|---|---|
| **A. 手写** | 给这 31 个页面各写一条 | 31 条 × 判断，且**下次加新页还是会漏** |
| **B. 建真源** | 建一个 `page-meta` catalog（页面路径 → description），生成器/守卫读它；缺失即报错 | 要 dev 配合，但**由构造消除，且新页漏了会红** |

**B 跟 dev 的 chrome catalog 是同一个形状** —— 事实上，**这 31 个页面正是 dev 的 R1/R2 在处理的那批**（分类页/FAQ/contact/video/service/hangye + pt 对应页）。
→ **建议并进 dev 的 catalog，而不是我这边手写 31 条。**

---

## 四、⚠️ 我**没有**动手，理由

1. **总调度明确说「找不到根就报我，别硬删」** —— 根不存在，我报。
2. **31 个里有 2 个不该改**：
   - **`index.html`（首页）** —— **首页用站点标语当 description 是合理的**，不是缺陷
   - **`404.html`** —— noindex 类页面，无所谓
   → **一刀切删会误伤首页。**
3. **这 31 个页面正在 dev 的 R2 射程内** —— 我现在改，**会跟他的重生成打架**，而且**移动 en 基线**。
4. **写 29 条 description 是内容工作** —— 跟【3】那 61 条 meta 是同一类活，而**那个已经被你叫停了**（「给错误抛光不是产出」）。这批同理：**要写就一起写，别夹在修 bug 里。**

---

## 📌 附：组 C（`marine/88` + `marine/91`）单独说
这两个是**指南文章**，共用同一条 marine 配件 description。它们**不在 dev 的射程内**，也**不是站点标语** —— 是真正意义上的"两篇文章共用一条描述"。
**这 2 条可以单独修**，但同样是内容工作，等排期。

---

## ❓ 待裁
1. **认不认「没有根可改」这个结论？**（证据：228 个 JSON-LD 是 `@type: WebSite` 的正确用法；21 个 meta 是手写页缺内容；无生成器参与）
2. **走 A 还是 B？** 我建议 **B，并进 dev 的 catalog** —— 这 31 个页面正是他 R1/R2 在处理的那批。
3. 若走 A（手写）：**要不要现在写？** 它跟被你叫停的那 61 条是同一类活。

---

*多语言窗 · 扫全站 249 个 HTML · 每条附证据 · **零改动（根不存在，没硬删）***
