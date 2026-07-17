# pt drift 裁决 —— 23 组

> 多语言窗 2026-07-17 · dev 交的 23 组,总工转给我判
> **进度:4 组已决(覆盖 **69+37+19+3 = 128 处**,占全部 drift 引用的绝大多数) · 19 组待判**

---

## ⭐⭐ 方法:**能查的就别判。这一轮把"判"变成"查"三次。**

dev 拒绝多数决是**对的**:
> 「**多数决不是理由:53 vs 16 只说明哪个被复制得多,不说明哪个对。**」

**但它把 `More` 归进了"需要人判"** —— 那题不用判,**答案写在模板里。**

---

## ✅ 已决

### 1. `More` ×69 → **`Leia mais`** ⭐ **查出来的,不是判的**

```html
data/templates/page-marine.html:285
<div class="blog-sidebar__read-more-btn"> <a href="{{url./marine/91}}">{{t.marine.a.2}}</a> </div>
                  ^^^^^^^^^^^^^^^^^^^^^
```
**全部 69 处都在 `blog-sidebar__read-more-btn` 里,全部紧跟一个文章标题(`a.1`=标题 / `a.2`=More),全部指向一篇文章。**
→ **它们 100% 是同一个概念:「阅读全文」按钮。**

| | | |
|---|---|---|
| `Leia mais` | ✅ **对** | 忠实于**概念**(read-more) |
| `Mais` | ❌ 漂出去的 | 只忠实于**英文字面**,丢了「读」这个动作 |

⭐ **en 的 `More` 是【按钮空间造成的省略】,不是概念本身。** class 名 `read-more` 才是概念。
⭐ **`Leia mais` 恰好也是 53(多数)—— 但那是巧合,不是理由。** 就算它是 16,答案也一样。

📌 **dev 说「Leia mais 和 Mais 语气不同」—— 语言学上对,但用错了地方。**
证据:**分布是按【文件】的,不是按【语境】的**:
```
Mais       16 处 →  industrial(6) · rv-off-grid(10)
Leia mais  53 处 →  marine(30) · mounts(9) · power(4) · service(10)
```
**每个文件内部 100% 一致,跨文件才不一致。**
若真是语义差异,同一页里既有"读更多文章"又有"更多产品",**文件内部就该混。它没混。**
→ **这是【批次差异】(phase2-convert 分批跑,每批选了不同的词),不是语义差异。**

### 2 & 3. dev 判的那 2 组 —— **同意,而且我验证了它没漏**

```
header.faq                                = "FAQ"                                  (3 处)
header.tejoy_premium_starlink_accessories = "Tejoy | Acessórios Premium para Starlink"  (37 处)
```
> dev:「**chrome.json 里已经签过 —— 页面里那些正是从它漂出去的。答案是查出来的,不是判出来的。**」

**对。** 我一度怀疑它漏了(我的账说 **26 串**在 chrome 已有,它只找到 2 组),**去算了:**
- `26 串` = "chrome 里有这个 en 值"
- `23 组` = "pt 漂了"
- **交集 = 2。它没漏,我的怀疑不成立。**

---

## ⚠️ 我算错过一次,留档

我看到这些:
```
"Envio e Logística: Como a Tejoy Entrega no Mundo"    ← Title Case
"Envio e logística: como a Tejoy entrega no mundo"    ← sentence case
```
就断定「**大部分组是大小写问题,葡语正字法用 sentence case,这是规则不是判断**」。

**算出来:只有 2 组是纯大小写,19 组是真措辞不同。**
因为大部分组**既有大小写差异、又有措辞差异**,我只看见了前者:
```
"MOQ, Prazo de Entrega e Preços"     ← lead time = 交付期
"MOQ, prazo de produção e preços"    ← lead time = 生产期   ⚠️ 译成了【两个不同的东西】
```
📌 **「看两个样本推断一个模式」——我这一轮第二次差点栽在这上面。算出来救了我。**

---

## 🔨 19 组待判 —— **但我认为其中大部分不该由我判**

分类(算出来的):

| 类 | 组 | 我的判断 |
|---|---:|---|
| **文章标题 / 描述的副本**(`blog-sidebar__title` / `__text`) | ~13 | ⚠️ **这是结构问题,不是选词问题** —— 见下 |
| `About Us` / `Contact Us` / `News` | 3 | 需要判,**但可能不该合并** —— 见下 |
| 公司简介长文 ×2 版本 | 2 | 该指向 ② 类共享 key(`ld.org.description`) |
| 纯大小写 | 2 | sentence case(葡语正字法) |

### ⚠️ 那 ~13 组:**真源问题,和 `meta_title` 是同一个形状**

它们是**同一篇文章的标题/描述,被多个页面的 sidebar 各存了一份**。
**真源应该是那篇文章自己,sidebar 该【派生】,而不是各抄一份。**
→ 这跟 `render.js:20` 说的 *"deliberately NOT read from data — it is DERIVED"* 是同一条道理。

🔴 **但我查到一个我【不下结论】的东西**:`{{url./marine/91}}` 指向的 `/marine/91`,
**在文件系统里找不到目录**,而标题的唯一源就是 `marine.json` 自己。
**我只查了一次,可能是路径形式的问题(token 渲染后未必是这个路径)。**
→ **标记,不下结论。dev 一句话能确认。** 但若属实,那「派生自文章页」这条路根本不通,
   而且 **sidebar 链接指向的是不存在的页面** —— 那就不是 i18n 问题了。

### `About Us` ×3:**可能本来就该是 3 个 key,不是 1 个**

```
"Sobre Nós"      class: page-header__title    ← 页面大标题
"Sobre"                                        ← 导航项(chrome 已签 header.about = "Sobre")
"Sobre a Tejoy"                                ← ?
```
**导航要短,页面标题要完整 —— 它们该不同。**
→ **强行合并 = 用 en 的同形掩盖了两个不同的位置。** 和 `More` 恰好相反:
   `More` 是**一个概念被拆成两个词**;`About Us` 可能是**两个位置被 en 写成了同一个词**。

---

## 我的建议

1. **`Leia mais` / 那 2 组 chrome 可查项:直接落。** 覆盖 128 处,零争议。
2. **`/marine/91` 是否存在 —— dev 确认一句。** 它决定那 13 组是「派生」还是「选词」。
3. **剩下的等 2 的答案。** 在那之前判它们,是在给一个可能不该存在的结构选词。
