#!/usr/bin/env bash
# 迁移 static/img/ 下所有图 → R2 tejoy-images 同 key 路径(方案a:Joe wrangler login 后跑,无密钥经手)
# 用法:bash scripts/r2-migrate.sh   (在 repo 根,Joe 已 wrangler login)
set -euo pipefail
BUCKET="tejoy-images"
ROOT="static/img"
n=0; ok=0; fail=0
while IFS= read -r -d '' f; do
  key="${f#$ROOT/}"
  n=$((n+1))
  if ${WRANGLER:-wrangler} r2 object put "$BUCKET/$key" --file="$f" --remote >/dev/null 2>&1; then
    ok=$((ok+1)); [ $((ok%50)) -eq 0 ] && echo "  …已传 $ok"
  else
    fail=$((fail+1)); echo "  ✗ 失败: $key"
  fi
done < <(find "$ROOT" -type f -print0)
echo "迁移完成:共 $n,成功 $ok,失败 $fail"
