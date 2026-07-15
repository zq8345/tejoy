# 【2】图库 alt — 查证报告 + 待总工裁决

> 结论先说：**这条不能按原话做**。总工给的四个前提里有三个不成立，
> 而且我在查的过程中发现**我自己的基线漏了账**。下面每条都附查证方法，别信我一次。

---

## 一、总工的前提 vs 实际

原话：「修 46 处 alt。**en 和 pt 两侧都改**。纯数据、零渲染风险、生成器直接吃、**零返工**」

| 前提 | 实际 | 查证 |
|---|---|---|
| 「46 处」 | ❌ **数据层实为 60 处，涉及 12 个产品**（不是 3 个页面） | 见下 §二 |
| 「en 和 pt 两侧都改」 | ❌ **物理上做不到**：alt 是**语言中立的单一字段**，没有 i18n 槽。改它 = en 和 pt 同时变 | 见下 §三 |
| 「零返工」 | ❌ 只改 pt HTML 的话，**R2 一落地就被覆盖** | 见下 §三 |
| 「纯数据、生成器直接吃」 | ✅ 对。`data/products/{id}.json` → `images[].alt`，render.js 直接吃 | `functions/_lib/render.js:19` |

---

## 二、真实规模：60 处 / 12 个产品（基线记的 46 是 HTML 出现次数，不是可修单位）

```
产品ID  分类                 文件名alt数  样本
4199    mini                   4    "2.jpg - tejoy"
42      performance-gen-3      8    "Starlink Performance Adapter Gen 3 cable-images (1).jpg - tejoy"
4200    mini                   5    "dc-dc 4.jpg - tejoy"
4201    mini                   5    "22.jpg - tejoy"
4202    performance-gen-3      4    "31.png - tejoy"
4203    mini                   4    "1.jpg - tejoy"
4204    mini                   4    "2.jpg - tejoy"
4205    mini                   4    "3.jpg - tejoy"
4206    mini                   3    "1.jpg - tejoy"
4207    mini                   4    "5.jpg - tejoy"
43      performance-gen-3      8    "Starlink Performance Adapter Gen 3 cable-images001.jpg - tejoy"
44      mini                   7    "2 in 1 Starlink Mini Cable (1).jpg - tejoy"
合计: 60 处, 12 个产品
```

**基线的 46 是怎么来的**：44/42/43 三个产品 = 7+8+8 = 23 个 alt 值，
每张图在 HTML 里渲染**两次**（主图轮播 + 缩略图），23×2 = 46。✅ 数字自洽。

### ⚠️ 我自己的基线漏了账（必须报）

总工要求「c 类必须挂账、不许消失」。但 `pt-leak-baseline.json` 的 ledger 只记了 **23 个 alt 值**（46 次出现），
**另外 37 个 alt 值 scanner 根本看不见**。

**根因（scanner 的真实盲区）**：`englishHits()` 要求命中 `EN_MARKERS` 才报。
- `"2 in 1 Starlink Mini Cable (1).jpg - tejoy"` → 有 `cable`/`in` 等标记词 → ✅ 报出
- `"2.jpg - tejoy"` / `"31.png - tejoy"` / `"dc-dc 4.jpg - tejoy"` → 分词后只剩 `jpg`/`tejoy`/数字，**零标记词** → ❌ 漏报

**对验收口径的影响：无。** c 类本就不计入 `translationLeaks`，
所以 **`translationLeaks = 501 → ~0` 这把尺子不受影响，基线不用重出、SCANNER_VERSION 不用 bump**。
受影响的只有「图片/数据质量」那本**待办账**——它少了 37 条。本文件即补账。

---

## 三、为什么「两侧都改」物理上做不到 → 【2】必须重排

**真源**：`data/products/{id}.json`
```jsonc
{
  "i18n": { "en": {...}, "pt-BR": { "title", "summary_html", "description_html", "meta_title", "meta_description" } },
  "images": [ { "src": "...", "alt": "2 in 1 Starlink Mini Cable (1).jpg - tejoy" } ]   // ← 在 i18n 之外
}
```
**`images` 不在 `i18n` 里**（查证：`'images' in p.i18n['pt-BR']` → `false`）。
render.js 无条件读同一个 `im.alt` 喂给 en 和 pt 两条渲染路径。

于是：
- **改 `images[].alt` → en 输出变 → 直接破 dev R2 的「en 字节一致」验收门。**
- **想「只改 pt」→ 做不到**，字段只有一个。除非去手改 pt HTML —— 但那是旁路补丁，
  **R2 从 JSON 重新生成 pt 时会原样覆盖掉** → 这正是「零返工」的反面。

→ **跟 `card.alt.suffix` 是同一道闸**：内容改动夹带进重构，会把重构的验收信号一起毁掉。

---

## 四、比 alt 是不是文件名更严重的事：**431 个 alt 全是废话**

我把全部 64 个产品的 431 个 alt 分了类，结果只有两种形态、**没有第三种**：

| 形态 | 数量 | 样本 |
|---|---|---|
| A 文件名式 | **60** | `"2.jpg - tejoy"` |
| B **整条产品标题逐字重复** + `- tejoy` | **371** | `"(2 Pack) For Starlink Ethernet Adapter Cable Enterprise Extension to RJ45 Cable, Starlink Cable 23AWG Waterproof SPX-RJ45 Coupler with End Caps - tejoy"` |
| C 含标题+其它信息 | **0** | — |
| D 其它 | **0** | — |

**B 类（371 处）比 A 类（60 处）更糟**，而总工的队列里根本没提到它：
650 号产品有 8 张图，**8 个 alt 一模一样**，全是那条 100+ 字符的怪物标题。
屏幕阅读器用户逐图 tab 过去，要把同一句话听 8 遍。A 类至少 `(1)(2)(3)` 还能区分图片。

→ **没有任何一个 alt 携带「这张图是什么」的信息。** 修 60 处只是把最难看的那批藏起来，
真正的洞是 431 处**全部**没有信息。

---

## 五、⭐ 一个总工不知道的能力：**我能看图**

总工写「未见图，alt 为据标题推断，**理想应看图重写**」——这个假设不成立。
`Read` 工具能直接读图片，**图就在磁盘上**（我逐个验过 44 号 7 张图全部存在，287KB~734KB）。

**样板**（44 号首图 `1777337750969009.jpg`，我实际看了）：

| | 内容 |
|---|---|
| 现状 | `2 in 1 Starlink Mini Cable (1).jpg - tejoy` |
| 「据标题推断」（总工的降级方案） | `Cabo Starlink Mini 2 em 1 — imagem 1 de 7` |
| **看图实写** | `Cabo 2 em 1 cinza-escuro enrolado, com conector RJ45 e plugue DC em cada extremidade, e adaptador USB-C avulso ao lado` |

图里真实内容：深灰色盘绕线缆，两端各分叉为 RJ45 网口 + DC 电源头，另附一颗独立的 USB-C 转接头。
**这些信息标题里一个字都没有。** 「据标题推断」那条路会产出一句正确但零信息的话——
比文件名强，但依然不是好 alt，只是**看起来**像好 alt。

---

## 六、我的判断（总工邀请我评结构，我评）

### 6.1 修正我自己上一份签字里的一句话

`chrome-pt-decisions.md` 里我写过「c 类 46 处跟 b 类 256 处是同一档病」。
**看过真图之后，这句只对一半，我改口**：

| | b 类：列表页卡片 alt | c 类：详情页图库 alt |
|---|---|---|
| 现状 | `{标题} - tejoy Products` | `{文件名} - tejoy` |
| 有信息吗 | ❌ 标题旁边就是标题，纯冗余 | ❌ 但**这个位置本该有信息** |
| 正确修法 | **删字段**，由 `{本地化标题}` 派生 | **保留字段 + 补 i18n 槽 + 看图实写** |

→ 卡片 alt 该**消失**；图库 alt 该**被认真写**。我上次把两者归成一类是偷懒。

### 6.2 建议排法

| 序 | 做什么 | 为什么这个顺序 |
|---|---|---|
| **1** | **R2 照常落地**，`images[].alt` **一个字都不动** | 保住「en 字节一致」门——那是总工判断生成器做对没有的唯一干净信号 |
| **2** | R2 验收通过后，独立一次改动：`images[]` 补 i18n 槽（`i18n[locale].images[].alt`），契约同 title 走 `?? en` 兜底 | 结构先对，才谈内容 |
| **3** | 看图重写 alt。**范围是 431 处，不是 60 处**；60 处只是最脏的那批 | 60 是症状，431 是病 |

**§3 的工作量要如实说**：431 张图逐张看、双语写。这不是等待期的填充活，是一个独立的内容项目。
若总工只想先止血，**最小有效动作是 §3 只做 60 处 A 类**（它们连"哪张图"都区分不了），
B 类 371 处虽然更烦人但至少说对了产品是什么。

---

## 七、我这一轮实际做了什么 / 没做什么

- ✅ 查清真源、算出真实规模、补上基线漏的 37 条账、验证我能看图、出了一个看图实写的样板
- ❌ **没有改任何 `data/products/*.json`** —— 会破 R2 验收门
- ❌ **没有手改 pt HTML** —— R2 会覆盖，是返工
- ❌ **没有手写 60 条"据标题推断"的 alt** —— 我能看图，写推断版是明知有更好做法却交次品；
  且若走 §6.2，这 60 条会连同另外 371 条一起重写，先写就是扔掉的工

**待总工裁决**：
1. 认不认 §6.2 的排法（R2 先落 → 补 i18n 槽 → 看图重写 431 处）？
2. 若要止血，先做 60 处 A 类还是全 431？
3. 基线漏账已在本文件补上，**验收尺子 501→~0 不受影响**，确认不用重出基线 / 不用 bump 版本？

---

*多语言窗（pt 真源）· 基于 `dc5cdcb7`（= origin/main，已核实无偏移）*
