// 堵口：admin-worker/ 是 wanew-admin Worker 的源码目录（同仓=render.js 单真源），
// 但 Pages repo根=部署根 → 合 main 后其 wrangler.jsonc/源码会被 wanew.com/admin-worker/* 公开下载
// （22个md泄露同机制）。Pages Functions 优先于静态资产 → 此函数把整个前缀强制 404。
// 不用 _redirects：CF Pages _redirects 对 4xx 支持语义不明（Netlify 410 语法坑同族），函数机制明确。
export function onRequest() {
  return new Response("Not found", { status: 404 });
}
