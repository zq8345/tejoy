#!/usr/bin/env bash
# 官网域名迁移置换脚本 —— tejoy.com → wanew.com（品牌统一）
# 用法: bash scripts/domain-swap.sh
#
# 本脚本记录并可复现两批置换（下次换域名照抄改 OLD/NEW 即可）：
#   W1（已发）：358 *.html + sitemap.xml + robots.txt 里的 https://tejoy.com → https://wanew.com
#   W1b（本批）：真源与数据层 —— functions/_lib/render.js + functions/api/admin/[[path]].js
#                + data/products/*.json + 首页/en/es/pt author meta
#
# ⭐ 铁律（为什么这么切）：
#   - 只替换 **https://tejoy.com** 这个精确串：前缀锁死 → 天然不碰 https://img.tejoy.com（图床CDN，独立子域）
#     和 xxx@tejoy.com（邮箱）。这两类是**另一体系**，另案迁移，本脚本绝不动。
#   - author meta content="tejoy.com" 是裸域名（无 https://），单独一条规则处理。
#   - 品牌词 "tejoy"（如 "- tejoy Products"）、资产文件名（tejoy-company-wall.png、tejoy-logo-black.png）
#     **不动**——只换域名不换视觉/文件名。精确串替换天然不误伤它们。
#   - wanew.com = 同一 CF Pages 项目（双域并行），故 /static/* 资源域名换过去同源同文件、不 404。
set -e
cd "$(git rev-parse --show-toplevel)"
OLD='https://tejoy\.com'      # sed 正则：\. 匹配字面点
NEW='https://wanew.com'

swap() { for f in "$@"; do [ -f "$f" ] && sed -i "s|${OLD}|${NEW}|g" "$f"; done; }

echo "== W1b-1: 真源生成器 render.js + admin 注释 =="
swap functions/_lib/render.js functions/api/admin/[[path]].js

echo "== W1b-2: 数据层 data/products/*.json（图片 img.tejoy.com 异串保留）=="
swap data/products/*.json

echo "== W1b-3: author meta 裸域名（4 页）=="
for f in index.html es/index.html pt/index.html data/templates/home.html; do
  [ -f "$f" ] && sed -i 's|content="tejoy\.com"|content="wanew.com"|g' "$f"
done

echo "完成。校验："
echo -n "  functions/ 剩 https://tejoy.com（应0）: " && grep -roh "https://tejoy\.com" functions/ 2>/dev/null | wc -l
echo -n "  data/products/ 剩 https://tejoy.com（应0）: " && grep -roh "https://tejoy\.com" data/products/ 2>/dev/null | wc -l
echo -n "  data/products/ img.tejoy.com（应24，保留）: " && grep -roh "img\.tejoy\.com" data/products/ 2>/dev/null | wc -l
echo -n "  author meta 剩 content=\"tejoy.com\"（应0）: " && grep -rl 'content="tejoy\.com"' . --include="*.html" 2>/dev/null | wc -l
