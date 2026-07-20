#!/usr/bin/env node
// 仓库卫生门 —— 挡住两个已经各撞过两次、且每次都是【静默】的坑。
//
// 这道门存在的理由:这两条都是「靠人记得」的规矩,而两条都已经证明记不住。
// 一条记不住的规矩,要么变成会报红的门,要么就不算规矩。
import fs from "fs";
import { execSync } from "child_process";

const fails = [];

// ① scripts/ 下不许有被 .gitignore 静默吞掉的文件。
//    撞过两次:`_shared.json` 被 `_*.json` 吞(差点整份共享 catalog 没进提交,别人一 build 就炸),
//    `_locale-dirs.mjs` 被 `_*.mjs` 吞(git add 才发现)。两次都是【提交时才知道】,
//    而如果那次 git add 是 `git add -A`,它会一声不响地不在里面。
{
  const files = fs.readdirSync("scripts").filter((f) => /\.(mjs|js|json)$/.test(f)).map((f) => `scripts/${f}`);
  let ignored = [];
  try {
    // check-ignore 命中时 exit 0 并列出被忽略的;一个都没命中时 exit 1 —— 那是【好结果】。
    ignored = execSync(`git check-ignore ${files.map((f) => `"${f}"`).join(" ")}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim().split("\n").filter(Boolean);
  } catch { ignored = []; }
  // 已被跟踪的文件 .gitignore 管不着(scripts/_baseline.mjs 就是这么活下来的)——
  // 它不是隐患。隐患是【没被跟踪 且 被忽略】:那才是会消失的那一类。
  const tracked = new Set(execSync("git ls-files scripts", { encoding: "utf8" }).trim().split("\n"));
  const doomed = ignored.filter((f) => !tracked.has(f));
  if (doomed.length) fails.push(`scripts/ 下有被 .gitignore 忽略且未跟踪的文件(提交会静默漏掉):\n     ${doomed.join("\n     ")}`);
}

// ② 任何"零回归门"的基线不许是 HEAD。
//    总工:「基线必须是**门管不着的东西**,只要基线能被被测对象改写,门就是面镜子。」
//    我把 81 个带英文 chrome 的 pt 页提交后跑 chrome-verify,它读 `git show HEAD:` ——
//    那一刻 HEAD 就是那笔坏提交,门拿它跟自己比,253/253 ✅ exit 0。
//    同形状第三次(verify-b、抽取器、chrome-verify)。基线一律走 scripts/_baseline.mjs(merge-base)。
{
  // ⚠️ 必须先归一 CRLF。JS 正则里 `\r` 是【行终止符】,`.` 不匹配它 —— 于是 `//注释.*$`
  //    在 CRLF 文件上永远匹配不上,注释一行都剥不掉,这道门就对着自己的说明文字报红。
  //    我就是这么先看到一个假阳性的:它指着 chrome-verify 那句"这里原本读 git show HEAD"喊。
  const stripComments = (s) => s.replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");
  const bad = [];
  for (const f of fs.readdirSync("scripts").filter((x) => x.endsWith(".mjs"))) {
    if (f === "_baseline.mjs") continue;                       // 基线读法本身住在这里
    const code = stripComments(fs.readFileSync(`scripts/${f}`, "utf8"));
    if (/git\s+(show|cat-file\s+-e|diff)\s+HEAD/.test(code)) bad.push(`scripts/${f}`);
  }
  if (bad.length) fails.push(`门在拿 HEAD 当基线(提交后它就是在跟自己比,永远不会红):\n     ${bad.join("\n     ")}\n     → 改用 scripts/_baseline.mjs 的 baseline()/baselineJson()`);
}

if (fails.length) { console.log(`🔴 仓库卫生 ${fails.length} 项:`); fails.forEach((f) => console.log(`   ${f}`)); process.exit(1); }
console.log("✅ 仓库卫生:scripts/ 无被忽略的未跟踪文件 · 无门拿 HEAD 当基线");
