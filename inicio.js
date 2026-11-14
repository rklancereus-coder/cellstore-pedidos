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
  if (p === "loja") return telaLoja();
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
  if (eFabrica()) {
    const antes = (S.conversas || []).reduce((a, c) => a + c.nao_lidas, 0);
    try { S.conversas = await api.conversas(); } catch (e) { S.conversas = []; }
    const agora = S.conversas.reduce((a, c) => a + c.nao_lidas, 0);
    if (idsConhecidos && agora > antes) { toast("Mensagem nova no WhatsApp esperando você", 4000); bip(); }
    if (conversaAberta) { try { S.mensagens = await api.mensagens(conversaAberta); } catch (e) { } }
  }
  // aviso de pedido novo para a fábrica e a logística
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
  api.ouvir(async () => {
    if (!S.perfil) return;
    if (tela === "novo" && papel() === "loja") { try { await recarregar(); } catch (e) { } return; } // não atrapalha quem está preenchendo
    const foco = document.activeElement && document.activeElement.id;
    if (!$("modal").hidden) { try { await recarregar(); } catch (e) { } return; }
    const rascunho = $("ctexto") ? $("ctexto").value : null; // resposta sendo digitada nas Conversas
    try { await recarregar(); desenhar(); if (rascunho && $("ctexto")) $("ctexto").value = rascunho; if (foco && $(foco)) $(foco).focus(); } catch (e) { }
  });
}

$("sair").onclick = async () => { await api.sair(); S.perfil = null; idsConhecidos = null; usuariosCache = null; desenhar(); };

(async () => {
  try { S.perfil = await api.sessao(); } catch (e) { S.perfil = null; }
  ouvirMudancas();
  if (S.perfil) await iniciarSessao(); else desenhar();
})();
