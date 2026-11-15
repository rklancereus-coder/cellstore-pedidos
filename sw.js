/* Portal Cell Store: service worker (app instalável).
   - Páginas, scripts e estilos: tenta a internet primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada.
   - Imagens das estampas e dos aparelhos: usa a cópia guardada (abre rápido e gasta menos dados).
   - Banco de dados (Supabase) e versao.json: nunca guarda, sempre vai na internet.
   - Avisos (push) de pedido novo: mostra a notificação e abre o app ao tocar. */
const PAGINAS = "clube-paginas-v1", IMAGENS = "clube-imagens-v5", EXTERNOS = "clube-externos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  const manter = [PAGINAS, IMAGENS, EXTERNOS];
  for (const k of await caches.keys()) if (!manter.includes(k)) await caches.delete(k);
  await limparVersoes();
  await self.clients.claim();
})()));

// Cada publicação gera arquivos com "?v=NOVA_VERSAO"; as cópias das versões antigas são apagadas
// (roda ao atualizar o app e, no máximo 1 vez por hora, quando a página abre com internet).
let ultimaLimpeza = 0;
async function limparVersoes() {
  try {
    const v = String((await (await fetch("versao.json", { cache: "no-store" })).json()).v);
    const c = await caches.open(PAGINAS);
    for (const r of await c.keys()) {
      const q = new URL(r.url).searchParams.get("v");
      if (q && q !== v) await c.delete(r);
    }
    ultimaLimpeza = Date.now();
  } catch (e) { } // sem internet: tenta na próxima vez
}

// Teto de imagens guardadas no celular: passando de MAX_IMAGENS, apaga as mais antigas.
const MAX_IMAGENS = 400;
let guardadasDesdeConferencia = 0;
async function limitarImagens() {
  const c = await caches.open(IMAGENS), k = await c.keys();
  for (let i = 0; i < k.length - MAX_IMAGENS; i++) await c.delete(k[i]);
}

async function redePrimeiro(req) {
  const cache = await caches.open(PAGINAS);
  try {
    const r = await fetch(req);
    if (r.ok) cache.put(req, r.clone());
    if (req.mode === "navigate" && Date.now() - ultimaLimpeza > 3600e3) limparVersoes();
    return r;
  } catch (e) {
    const c = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (c) return c;
    throw e;
  }
}
async function guardadoPrimeiro(req, nome) {
  const cache = await caches.open(nome);
  const c = await cache.match(req);
  if (c) return c;
  const r = await fetch(req);
  if (r.ok || r.type === "opaque") {
    const guardando = cache.put(req, r.clone()); // não segura a imagem esperando gravar
    if (nome === IMAGENS && ++guardadasDesdeConferencia >= 25) { guardadasDesdeConferencia = 0; guardando.then(limitarImagens).catch(() => { }); }
  }
  return r;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname.endsWith("/versao.json")) return; // sempre da internet
    if (/\/(estampas|aparelhos\/fotos)\//.test(u.pathname) || /\.(png|jpe?g|webp)$/.test(u.pathname)) return e.respondWith(guardadoPrimeiro(req, IMAGENS));
    return e.respondWith(redePrimeiro(req));
  }
  // fontes do Google, biblioteca do Supabase e fotos novas dos aparelhos (depósito público)
  if (/fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$/.test(u.hostname) || u.pathname.includes("/storage/v1/object/public/aparelhos/"))
    return e.respondWith(guardadoPrimeiro(req, EXTERNOS));
});

// ---------- avisos de pedido novo ----------
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { corpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Portal Cell Store", {
    body: d.corpo || "Tem novidade nos pedidos.",
    icon: "icone-192.png", badge: "favicon.png",
    tag: d.tag || "pedido", renotify: true,
    data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const alvo = new URL(e.notification.data && e.notification.data.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) if (c.url.startsWith(self.registration.scope)) { await c.focus(); return; }
    await self.clients.openWindow(alvo);
  })());
});
