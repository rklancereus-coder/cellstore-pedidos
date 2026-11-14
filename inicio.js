/* ---------- partida do sistema ---------- */
const api = (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase) ? criarApiSupabase(CONFIG) : criarApiDemo();

function desenhar() {
  $("top").hidden = !S.perfil;
  if (!S.perfil) return telaLogin();
  const p = S.perfil.papel;
  $("app").className = "wrap" + (p === "loja" ? "" : " wide");
  $("brand").innerHTML = `<span class="logo" role="img" aria-label="Cell Store"></span><span class="sep"></span><span style="min-width:0"><b>${esc(S.perfil.nome)}</b><small>${{ loja: "Pedidos de capinhas", fabrica: "Pedidos de todas as lojas", admin: "Fábrica · administrador", logistica: "Compra de capinhas lisas" }[p]}${api.modo === "demo" ? ` <span class="demo-tag">demo</span>` : ""}</small></span>`;
  const novos = p === "logistica" ? S.compras.filter(c => !c.visto && c.status_pedido !== "cancelado").length : p !== "loja" ? S.pedidos.filter(x => !x.visto_fabrica && ABERTOS.includes(x.status)).length : 0;
  document.title = (novos ? `(${novos}) ` : "") + "Cell Store Pedidos";
  if (p === "loja") { if (tela !== "inicio") marcarTelaNoHistorico(); return telaLoja(); }
  if (p === "logistica") return telaLogistica();
  return telaFabrica();
}

let idsConhecidos = null;
async function recarregar(tudo) {
  const p = papel(); if (!p) return;
  if (tudo) {
    const b = await api.base();
    S.lojas = b.lojas; S.precos = b.precos; S.modelos = b.modelos; S.temas = b.temas;
    if (p !== "logistica") { S.catalogo = new Map(); (await api.catalogo()).forEach(c => S.catalogo.set(normCod(c.codigo), c)); }
  }
  if (p === "logistica") S.compras = await api.comprasLogistica();
  else { [S.pedidos, S.romaneios] = await Promise.all([api.pedidos(), api.romaneios()]); }
  if (eFabrica()) await recarregarConversas();
  avisarNovos();
}
async function recarregarConversas() {
  const antes = (S.conversas || []).reduce((a, c) => a + c.nao_lidas, 0);
  try { S.conversas = await api.conversas(); } catch (e) { S.conversas = []; }
  const agora = S.conversas.reduce((a, c) => a + c.nao_lidas, 0);
  if (idsConhecidos && agora > antes) { toast("Mensagem nova no WhatsApp esperando você", 4000); bip(); }
  if (conversaAberta) { try { S.mensagens = await api.mensagens(conversaAberta); } catch (e) { } }
}
// aplica só o que mudou (pedido por pedido), sem baixar a lista inteira de novo
async function aplicarMudancas(lista) {
  if (!lista || !api.pedido) return recarregar();
  const p = papel(); if (!p) return;
  const tabs = new Set(lista.map(e => e.tabela));
  const ids = [...new Set(lista.filter(e => (e.tabela === "pedidos" || e.tabela === "compras") && e.id).map(e => e.id))];
  if (ids.length > 25) return recarregar(); // muita coisa de uma vez (ex.: romaneio grande): mais rápido baixar tudo
  for (const id of ids) {
    if (p === "logistica") {
      const c = await api.compraLogistica(id);
      S.compras = S.compras.filter(x => x.pedido_id !== id); if (c) S.compras.push(c);
    } else {
      const x = await api.pedido(id), i = S.pedidos.findIndex(y => y.id === id);
      if (x && i >= 0) S.pedidos[i] = x; else if (x) S.pedidos.unshift(x); else if (i >= 0) S.pedidos.splice(i, 1);
    }
  }
  if (p !== "logistica") S.pedidos.sort((a, b) => b.id - a.id);
  if (tabs.has("romaneios") && p !== "logistica") S.romaneios = await api.romaneios();
  if (eFabrica() && (tabs.has("wa_conversas") || tabs.has("wa_mensagens"))) await recarregarConversas();
  avisarNovos();
}
// aviso de pedido novo para a fábrica e a logística
function avisarNovos() {
  const p = papel(); if (!p) return;
  const ids = p === "logistica" ? S.compras.map(c => c.pedido_id) : S.pedidos.map(x => x.id);
  if (idsConhecidos && p !== "loja") {
    const novos = ids.filter(id => !idsConhecidos.has(id));
    if (novos.length) { toast(novos.length > 1 ? `${novos.length} pedidos novos chegaram` : `Pedido novo: ${nro(novos[0])}`, 4000); bip(); }
  }
  idsConhecidos = new Set(ids);
}
function bip() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .18); } catch (e) { } }

async function iniciarSessao() {
  idsConhecidos = null; tela = "inicio";
  $("app").innerHTML = `<p class="carregando">Carregando pedidos…</p>`;
  try { await recarregar(true); } catch (e) { erroTela(e); }
  desenhar();
}
let ouvindo = false;
function ouvirMudancas() {
  if (ouvindo) return; ouvindo = true;
  api.ouvir(async lista => {
    if (!S.perfil) return;
    if (tela === "novo" && papel() === "loja") { try { await aplicarMudancas(lista); } catch (e) { } return; } // não atrapalha quem está preenchendo
    const foco = document.activeElement && document.activeElement.id;
    if (!$("modal").hidden) { try { await aplicarMudancas(lista); } catch (e) { } return; }
    const rascunho = $("ctexto") ? $("ctexto").value : null; // resposta sendo digitada nas Conversas
    try { await aplicarMudancas(lista); desenhar(); if (rascunho && $("ctexto")) $("ctexto").value = rascunho; if (foco && $(foco)) $(foco).focus(); } catch (e) { }
  });
}

$("sair").onclick = async () => { await api.sair(); S.perfil = null; idsConhecidos = null; usuariosCache = null; desenhar(); };

(async () => {
  try { S.perfil = await api.sessao(); } catch (e) { S.perfil = null; }
  ouvirMudancas();
  if (S.perfil) await iniciarSessao(); else desenhar();
})();

/* ---------- versão nova publicada: recarrega sozinho (sem precisar de Ctrl+F5) ---------- */
async function conferirVersao() {
  try {
    const r = await fetch("versao.json?x=" + Date.now(), { cache: "no-store" });
    const { v } = await r.json();
    if (!v || !window.VERSAO || v === window.VERSAO) return;
    if ((tela === "novo" && papel() === "loja") || !$("modal").hidden) return; // não interrompe quem está preenchendo
    if (ls.get("versao-tentada") === v) return; // já tentou esta versão: evita ficar recarregando em volta
    ls.set("versao-tentada", v);
    location.replace(location.pathname + "?v=" + v);
  } catch (e) { }
}
conferirVersao();
document.addEventListener("visibilitychange", () => { if (!document.hidden) conferirVersao(); });
setInterval(conferirVersao, 20 * 60 * 1000);

// "voltar" do celular dentro do pedido: volta um passo (ou para o início), sem sair do site
function voltarTela() {
  if (!S.perfil || papel() !== "loja" || tela === "inicio") return;
  if (tela === "novo" && $("voltar")) { $("voltar").click(); }
  else { tela = "inicio"; desenhar(); }
  if (tela !== "inicio") marcarTelaNoHistorico();
}
