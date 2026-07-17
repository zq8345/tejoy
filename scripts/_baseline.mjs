// 唯一的基线读法。所有探针、验收、抽取都走它 —— 不是靠"记得该用哪个读法"。
//
// ⭐ 【能被你自己改写的东西,不能当证据。】
//
// 我在这条上栽了四次,而且第四次就发生在我刚给抽取器修好它之后:
//   1. 我拿工作区文件"证明" placeholder 的英文是存量 → 总工用 git show 抓的我
//   2. 我拿刚生成的页"证明" pt/faq 的 JSON-LD 也是英文 → 自己抓到
//   3. regen 把英文数字写进 pt/about,抽取器读磁盘、把我的错误输出当原文 → 修了抽取器
//   4. 量那个多余的 author meta 时又读工作区(页刚被我生成过)→ 报 3,真值 5
//
// 前三次我都在"下次记得先 revert / 记得读 HEAD"。第四次证明这条纪律不成立 ——
// 总工:「别靠『记得用哪个读法』,你已经证明了自己记不住。」所以它现在是一个函数,
// 而不是一条我需要在每个新脚本里重新想起来的规矩。
import { execSync } from "child_process";

export const baseline = (p) =>
  execSync(`git show HEAD:"${p}"`, { encoding: "utf8", maxBuffer: 1 << 26 }).replace(/\r\n/g, "\n");

// 存在性也要走基线:工作区里有、HEAD 里没有,是"新页",不是"已有页"
export const baselineExists = (p) => {
  try { execSync(`git cat-file -e HEAD:"${p}"`, { stdio: "pipe" }); return true; } catch { return false; }
};

// 基线上被跟踪的文件清单 —— 别用 fs.readdirSync 去枚举"有哪些页",那数的是工作区
export const baselineFiles = (re) =>
  execSync("git ls-files", { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter((f) => f && (!re || re.test(f)));
