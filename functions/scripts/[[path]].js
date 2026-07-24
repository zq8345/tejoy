// 堵口（批4 收尾）：scripts/ 是构建/守护工具源码目录（regen、chrome-sync、各 verify 闸），
// Pages repo根=部署根 → 全部可被 wanew.com/scripts/* 公开下载（admin-worker/ 同机制同教训）。
// Pages Functions 优先于静态资产 → 此函数把整个前缀强制 404。
// 不用 _redirects：CF Pages _redirects 对 4xx 支持语义不明（W3 已实证其规格边界），函数机制明确。
export function onRequest() {
  return new Response("Not found", { status: 404 });
}
