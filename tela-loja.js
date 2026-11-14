/* ---------- LOGIN ---------- */
function telaLogin() {
  $("app").className = "wrap";
  // tela inicial pública: os catálogos em destaque; o login fica escondido na "Área da equipe"
  $("app").innerHTML = `<div class="login inicio">
   <section class="portal"><em>PORTAL</em><span class="logo" role="img" aria-label="Cell Store"></span></section>
   <button type="button" class="cat-entrada" id="bcatpub"><span class="fan" aria-hidden="true"><img src="estampas/mini/PET-001.webp?r=2" alt=""><img src="estampas/mini/FLO-001.webp?r=2" alt=""><img src="estampas/mini/LUX-002.webp?r=2" alt=""></span><span class="tx"><span class="tag">Capinhas</span><b>Catálogo de estampas</b><small id="ncat">Estampas para personalizar</small></span><span class="seta">›</span></button>
   <a class="cat-entrada fones" href="aparelhos/"><span class="fan" aria-hidden="true"><img src="aparelhos/fotos/redmi-note-15-1.webp" alt=""><img src="aparelhos/fotos/iphone-17-pro-1.webp" alt=""><img src="aparelhos/fotos/realme-14t-5g-1.webp" alt=""></span><span class="tx"><span class="tag">Celulares</span><b>Catálogo de aparelhos</b><small>Fichas e pedido pelo WhatsApp</small></span><span class="seta">›</span></a>
   <button type="button" class="cat-entrada sos" id="bsos"><span class="fan" aria-hidden="true"><img src="sos-celular.webp" alt=""><span class="sos-selo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg></span></span><span class="tx"><span class="tag">Conserto</span><b>SOS Celular</b><small>Buscamos, consertamos e devolvemos. Grátis.</small></span><span class="seta">›</span></button>
   <div class="inicio-rodape">${botaoInstalar("equipe-btn")}<button type="button" class="equipe-btn" id="bequipe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Área da equipe</button></div>
  </div>`;
  document.title = "Portal Cell Store";
  $("bcatpub").onclick = () => catalogoPublico();
  $("bequipe").onclick = abrirLogin;
  $("bsos").onclick = abrirSos;
  api.contarEstampas().then(n => { if (n && $("ncat")) $("ncat").textContent = `${n.toLocaleString("pt-BR")} estampas para personalizar`; }).catch(() => { });
}

/* ---------- janela de login da equipe (lojas, fábrica, logística) ---------- */
function abrirLogin() {
  modal(`<div class="cat-topo"><h2>Área da equipe</h2><button class="cat-x" id="lfechar" aria-label="Fechar">×</button></div>
   <p class="hint" style="margin:-6px 0 0">Lojas Cell Store, fábrica e logística.</p>
   <form id="flogin" novalidate style="display:grid;gap:16px">
    <label class="f" id="ucampo"><span>Usuário</span><select id="usuario" disabled><option value="">Carregando…</option></select></label>
    <label class="f"><span>Senha</span><input id="senha" type="password" autocomplete="current-password" inputmode="numeric"></label>
    <div class="err" id="err" hidden></div>
    <button class="btn primary" type="submit" id="bentrar">Entrar</button>
   </form>
   ${api.modo === "demo" ? `<div class="aviso"><b>Modo demonstração.</b> Os dados ficam só neste navegador. Usuários de teste: <b>loja01</b> a <b>loja07</b> e <b>lojaon</b> (senha 1234), <b>fabrica</b>, <b>logistica</b> e <b>admin</b> (senha igual ao usuário).</div>` : ""}`, null, "box-login");
  $("lfechar").onclick = fecharModal;
  const erro = m => { const x = $("err"); x.textContent = m; x.hidden = false; };
  // lista de quem pode entrar; se não carregar (sem internet), volta a ser campo de texto
  (async () => {
    const campo = $("ucampo");
    try {
      const L = await api.logins();
      const grupos = [["loja", "Lojas"], ["fabrica", "Fábrica"], ["logistica", "Logística"], ["admin", "Administração"]];
      const ultimo = ls.get("ultimo-usuario") || "";
      if (!$("usuario")) return;
      campo.innerHTML = `<span>Quem está entrando?</span><select id="usuario"><option value="">Escolha na lista</option>${grupos.map(([p, n]) => { const g = L.filter(x => x.papel === p); return g.length ? `<optgroup label="${n}">${g.map(x => `<option value="${esc(x.usuario)}" ${x.usuario === ultimo ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</optgroup>` : ""; }).join("")}</select>`;
    } catch (e) {
      if (campo) campo.innerHTML = `<span>Usuário</span><input id="usuario" autocomplete="username" autocapitalize="none" placeholder="Ex.: loja03">`;
    }
    const sinc = () => { const v = $("usuario").value; $("senha").inputMode = v === "admin" ? "text" : "numeric"; };
    $("usuario").onchange = () => { sinc(); if ($("usuario").value) $("senha").focus(); }; sinc();
    if ($("usuario").value) $("senha").focus();
  })();
  $("flogin").onsubmit = async e => {
    e.preventDefault();
    const u = $("usuario").value.trim(), s = $("senha").value;
    if (!u) return erro("Escolha quem está entrando.");
    if (!s) return erro("Digite a senha.");
    ls.set("ultimo-usuario", u);
    $("bentrar").disabled = true; $("bentrar").textContent = "Entrando…";
    try { S.perfil = await api.entrar(u, s); fecharModal(); await iniciarSessao(); }
    catch (er) { $("senha").value = ""; erro(er.message); $("bentrar").disabled = false; $("bentrar").textContent = "Entrar"; }
  };
}

/* ---------- LOJA: início ---------- */
let abaLoja = "andamento", buscaLoja = "", tela = "inicio";
function telaLoja() {
  if (tela === "novo") return renderPasso();
  if (tela === "enviado") return renderEnviado();
  const meus = S.pedidos.filter(p => p.loja_id === S.perfil.loja_id || p.retirada_loja_id === S.perfil.loja_id);
  const q = semAcento(buscaLoja).trim(), qn = soNumeros(buscaLoja);
  const bate = p => !q || semAcento(p.cliente).includes(q) || (qn.length >= 3 && soNumeros(p.whats).includes(qn)) || (qn && String(p.id) === qn);
  const and = meus.filter(p => ABERTOS.includes(p.status) && bate(p)).sort((a, b) => (a.status === "na_loja" ? -1 : 0) - (b.status === "na_loja" ? -1 : 0) || a.entrega.localeCompare(b.entrega));
  const fin = meus.filter(p => !ABERTOS.includes(p.status) && bate(p)).sort((a, b) => b.id - a.id);
  const chegando = S.romaneios.filter(r => r.loja_id === S.perfil.loja_id && !r.recebido_em);
  const naLoja = meus.filter(p => p.status === "na_loja").length;
  const lista = abaLoja === "andamento" ? and : fin;
  const zap = CONFIG.whatsappFabrica ? waLink(CONFIG.whatsappFabrica, `Olá, aqui é da ${S.perfil.nome}. `) : "";
  $("app").innerHTML = `
   <div class="hero">
    <button class="btn primary bigbtn" id="novo">${ICON.mais} Fazer novo pedido</button>
    ${zap ? `<a class="wpp" href="${zap}" target="_blank" rel="noopener">${ICON.chat}<span>Falar com a fábrica<small>pelo WhatsApp</small></span></a>` : `<button class="wpp" id="wpp">${ICON.chat}<span>Falar com a fábrica<small>pelo WhatsApp · em breve</small></span></button>`}
    ${botaoInstalar("soft mini instalar-loja")}
    <div class="atalhos">
     <div class="atalho-col"><button type="button" class="atalho" id="atcat"><span class="fan" aria-hidden="true"><img src="estampas/mini/PET-001.webp?r=2" alt=""><img src="estampas/mini/FLO-001.webp?r=2" alt=""><img src="estampas/mini/LUX-002.webp?r=2" alt=""></span><b>Catálogo de estampas</b></button><button type="button" class="copiar-link" data-copiar-link="estampas">${ICON_COPIAR_LINK}Copiar link</button></div>
     <div class="atalho-col"><a class="atalho fones" href="aparelhos/"><span class="fan" aria-hidden="true"><img src="aparelhos/fotos/redmi-note-15-1.webp" alt=""><img src="aparelhos/fotos/iphone-17-pro-1.webp" alt=""><img src="aparelhos/fotos/realme-14t-5g-1.webp" alt=""></span><b>Catálogo de aparelhos</b></a><button type="button" class="copiar-link" data-copiar-link="aparelhos">${ICON_COPIAR_LINK}Copiar link</button></div>
    </div>
    ${chegando.map(r => { const n = S.pedidos.filter(p => p.romaneio_id === r.id).length; return `<div class="chegando"><b>Remessa ${nro(r.id)} a caminho: ${n} pedido${n > 1 ? "s" : ""}</b><span class="sub">Quando chegar, confira as capinhas e toque em recebi.</span><button class="btn primary" data-receber="${r.id}" style="padding:12px">Conferi e recebi</button></div>`; }).join("")}
    ${naLoja ? `<div class="card" style="border-color:var(--s-loja)"><b style="color:var(--s-loja)">${naLoja} pedido${naLoja > 1 ? "s" : ""} ${lojaEhOnline(S.perfil.loja_id) ? "já na loja de retirada" : "na loja"} esperando o cliente.</b><span class="sub">Use o botão “Avisar cliente” em cada pedido.</span></div>` : ""}
   </div>
   <h2>Seus pedidos</h2>
   <div class="busca" style="margin-top:12px"><label for="bl" hidden>Buscar</label>${ICON.lupa}<input id="bl" type="search" placeholder="Buscar por nome ou telefone do cliente" value="${esc(buscaLoja)}"></div>
   <div class="tabs"><button data-aba="andamento" class="${abaLoja === "andamento" ? "on" : ""}">Em andamento (${and.length})</button><button data-aba="fin" class="${abaLoja === "fin" ? "on" : ""}">Finalizados (${fin.length})</button></div>
   <div class="list">${lista.length ? lista.map(cardLoja).join("") : `<div class="empty">${q ? "Nenhum pedido encontrado com essa busca." : abaLoja === "andamento" ? "Nenhum pedido em andamento. Toque em <b>Fazer novo pedido</b> para começar." : "Os pedidos entregues aparecem aqui."}</div>`}</div>`;
  $("novo").onclick = () => { novoPedido(); tela = "novo"; desenhar(); scrollTo(0, 0); };
  $("atcat").onclick = () => catalogoPublico();
  if ($("wpp")) $("wpp").onclick = () => toast("Em breve: este botão abre a conversa com a fábrica no WhatsApp.");
  const bl = $("bl"); bl.oninput = () => { buscaLoja = bl.value; const pos = bl.selectionStart; desenhar(); const n = $("bl"); n.focus(); n.setSelectionRange(pos, pos); };
  $$("[data-aba]").forEach(b => b.onclick = () => { abaLoja = b.dataset.aba; desenhar(); });
  $$("[data-edit]").forEach(b => b.onclick = () => { editarPedido(+b.dataset.edit); scrollTo(0, 0); });
  $$("[data-cancel]").forEach(b => b.onclick = () => confirmar(`Cancelar o pedido ${nro(b.dataset.cancel)}?`, "A fábrica deixa de produzir esta capinha.", "Cancelar pedido", () => acao(() => api.mudarStatus([+b.dataset.cancel], "cancelado"), "Pedido cancelado")));
  $$("[data-entregue]").forEach(b => b.onclick = () => acao(() => api.mudarStatus([+b.dataset.entregue], "entregue"), "Pedido entregue ao cliente"));
  $$("[data-receber]").forEach(b => b.onclick = () => acao(() => api.receberRomaneio(+b.dataset.receber), "Remessa recebida"));
  carregarFotos($("app"));
}
function cardLoja(p) {
  const [nome, cor] = ST[p.status], idx = FLUXO.indexOf(p.status);
  const deOutra = p.loja_id !== S.perfil.loja_id;            // pedido da loja online que o cliente retira aqui
  const ondeBusca = p.retirada_loja_id ? nomeLoja(p.retirada_loja_id) : S.perfil.nome;
  const aviso = p.whats ? waLink(p.whats, `Oi${p.cliente ? " " + p.cliente.split(" ")[0] : ""}! Sua capinha personalizada já chegou na ${ondeBusca}. Pode passar lá para buscar quando quiser! 😊`) : "";
  return `<article class="card ${p.urgente && ABERTOS.includes(p.status) ? "urg" : ""}" style="--c:var(${cor})">
   <div class="hd"><span class="num">${nro(p.id)}</span>${p.urgente ? `<span class="tag urg">Urgente</span>` : ""}${p.exemplo ? `<span class="tag">exemplo</span>` : ""}${deOutra ? `<span class="tag on">Pedido da ${esc(nomeLoja(p.loja_id))} · retirada aqui</span>` : `<span class="right">${brl(p.valor_total)}</span>`}</div>
   <div class="row-media">${miniatura(p)}<div><div class="what">${descr(p)}</div>
   <div class="sub">${p.produto !== "popsocket" ? `<b>${esc(p.celular)}</b> · ` : ""}Cliente <b>${esc(p.cliente) || "—"}</b> · Entrega <b>${fmtD(p.entrega)}</b>${!deOutra && p.retirada_loja_id ? ` · Retira na <b>${esc(nomeLoja(p.retirada_loja_id))}</b>` : ""}</div></div></div>
   ${linhaLisa(p)}
   <div class="stline">${nome}</div>
   ${p.status !== "cancelado" ? `<div class="track">${FLUXO.map((s, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("")}</div>` : ""}
   <div class="acts">
    ${p.status === "recebido" && !deOutra ? `<button class="edit" data-edit="${p.id}">${ICON.lapis} Editar</button><button class="link" data-cancel="${p.id}">Cancelar pedido</button>` : ""}
    ${["producao", "pronto"].includes(p.status) && !deOutra ? `<span class="sub">Já está em produção. Para mudar algo, fale com a fábrica.</span>` : ""}
    ${p.status === "na_loja" ? `${aviso ? `<a class="wbtn" href="${aviso}" target="_blank" rel="noopener">${ICON.chat} Avisar cliente</a>` : ""}${p.retirada_loja_id && !deOutra ? `<span class="sub">A ${esc(nomeLoja(p.retirada_loja_id))} entrega ao cliente.</span>` : `<button class="edit" data-entregue="${p.id}">${ICON.ok} Entregue ao cliente</button>`}` : ""}
   </div>
  </article>`;
}
async function acao(fn, msg) { try { await fn(); await recarregar(); msg && toast(msg); } catch (e) { erroTela(e); } }
function confirmar(titulo, texto, botao, fn) {
  modal(`<h2>${titulo}</h2><p class="lead">${texto}</p><div class="nav" style="margin-top:4px"><button class="btn soft" id="mn">Voltar</button><button class="btn primary" id="ms">${botao}</button></div>`, () => {
    $("mn").onclick = fecharModal; $("ms").onclick = () => { fecharModal(); fn(); };
  });
}

/* ---------- LOJA: assistente de pedido ---------- */
let w, passo, ultimo = null, enviando = false;
const PASSOS = ["O que o cliente quer?", "Qual personalização?", "Detalhes da capinha", "Cliente e entrega", "Confira e envie"];
function novoPedido() { w = { produto: null, pers: null, celular: "", codigo: "", texto_nome: "", foto: null, foto_path: null, foto_whats: false, vendedor: ls.get("vend-" + S.perfil.id) || "", cliente: "", whats: "", qtd: 1, entrega: addDias(hoje(), 3), urgente: false, obs: "", origem: null, compra: null, retirada: null }; passo = 1; }
function editarPedido(id) {
  const p = S.pedidos.find(x => x.id === id); if (!p || p.status !== "recebido") return;
  w = { id, produto: p.produto, pers: p.pers, celular: p.celular, codigo: p.codigo || "", texto_nome: p.texto_nome || "", foto: null, foto_path: p.foto_path, foto_whats: p.foto_whats, vendedor: p.vendedor, cliente: p.cliente, whats: p.whats, qtd: p.qtd, entrega: p.entrega, urgente: p.urgente, obs: p.obs, origem: p.origem_lisa, compra: p.compra ? { cor: p.compra.cor, precisa_ate: p.compra.precisa_ate } : null, retirada: p.retirada_loja_id || null };
  passo = 1; tela = "novo"; desenhar();
}
function blocoCat(titulo) {
  return `<div class="f"><span>${titulo}</span>
   <div class="codrow"><input id="codigo" value="${esc(w.codigo)}" placeholder="Digite o código (ex.: FLO-005)" autocomplete="off" autocapitalize="characters"><button type="button" class="soft vercat" id="vercat">${ICON.cat}<span>Ver catálogo</span></button></div>
   <div id="catmsg" class="catsel">${msgCat()}</div></div>`;
}

/* ---------- janela do catálogo: coleções com miniaturas → estampas da coleção ---------- */
// nome que aparece para cada coleção: vem do banco (Administração → Catálogo → "Nome no catálogo"), pelo prefixo do código
function nomeColecao(pre, temaPasta) {
  const t = S.temas.find(x => x.prefixo === pre);
  return (t && (t.nome_exibicao || t.nome)) || temaPasta || pre;
}
let catTema = null, catBusca = "";
// coleções agrupadas pelo prefixo do código (assim "Pais" junta PAI-001 a PAI-020, mesmo vindo de duas pastas)
function colecoesCatalogo() {
  const m = new Map();
  for (const c of S.catalogo.values()) {
    if (!c.ativo) continue;
    const pre = c.codigo.split("-")[0];
    if (!m.has(pre)) m.set(pre, { id: pre, pre, tema: c.tema, itens: [] });
    m.get(pre).itens.push(c);
  }
  const L = [...m.values()];
  L.forEach(t => {
    t.itens.sort((a, b) => a.codigo.localeCompare(b.codigo)); t.nome = nomeColecao(t.pre, t.tema);
    const tm = S.temas.find(x => x.prefixo === t.pre), escolhidas = ((tm && tm.capa) || []).map(c => t.itens.find(i => i.codigo === c)).filter(Boolean);
    t.capa = [...escolhidas, ...t.itens.filter(i => !escolhidas.includes(i))].slice(0, 3);
  });
  return L.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
// manter = true volta para a mesma coleção (ex.: depois de ver uma estampa); senão abre nas coleções
function abrirCatalogo(aoEscolher, manter) {
  const L = colecoesCatalogo(), porId = new Map(L.map(t => [t.id, t]));
  const itens = L.flatMap(t => t.itens);
  const atual = acharCat(w && w.codigo);
  if (!manter) { catTema = atual ? atual.codigo.split("-")[0] : null; catBusca = ""; }
  if (!porId.has(catTema)) catTema = null;
  modal(`<div class="cat-topo"><button type="button" class="cat-voltar" id="catvoltar" hidden>‹ Coleções</button><h2 id="cattit">Catálogo de estampas</h2><button class="cat-x" id="catfechar" aria-label="Fechar">×</button></div>
    <div class="busca">${ICON.lupa}<input id="catq" type="search" placeholder="Já sabe o código? Busque aqui (ex.: PET-012)" value="${esc(catBusca)}" autocomplete="off"></div>
    <div class="cat-corpo" id="catcorpo"></div>`, () => {
    const ehAdmin = papel() === "admin";
    const estampa = (c, comTema, capa) => `<div class="cat-cel"><button type="button" class="cat-item ${atual && atual.codigo === c.codigo ? "sel" : ""}" data-ccod="${esc(c.codigo)}"><img src="${imgDrive(c.arquivo_id, 300)}" alt="" loading="lazy"><b>${esc(c.codigo)}</b>${comTema ? `<small>${esc(nomeColecao(c.codigo.split("-")[0], c.tema))}</small>` : ""}</button>${capa ? `<button type="button" class="cat-estrela ${capa.includes(c) ? "on" : ""}" data-capa="${esc(c.codigo)}" title="Usar na capa da coleção" aria-label="Usar ${esc(c.codigo)} na capa">★</button>` : ""}</div>`;
    const desenharCat = () => {
      const q = semAcento(catBusca).trim(), qc = normCod(catBusca), corpo = $("catcorpo");
      let html, tit = "Catálogo de estampas";
      if (q) {
        const R = itens.filter(c => normCod(c.codigo).startsWith(qc) || semAcento(c.tema).includes(q) || semAcento(nomeColecao(c.codigo.split("-")[0], c.tema)).includes(q)).slice(0, 150);
        tit = "Busca";
        html = R.length ? `<div class="cat-grade">${R.map(c => estampa(c, true)).join("")}</div>` : `<p class="cat-vazio">Nada encontrado. Apague a busca para ver as coleções.</p>`;
      } else if (catTema) {
        const t = porId.get(catTema); tit = t.nome;
        html = `<p class="cat-sub"><span class="cat-pre">${esc(t.pre)}</span> ${t.itens.length} estampas · toque para escolher</p>${ehAdmin ? `<p class="hint" style="margin:-6px 0 10px">★ Administrador: toque na estrela para escolher as 3 estampas da capa desta coleção.</p>` : ""}<div class="cat-grade">${t.itens.map(c => estampa(c, false, ehAdmin ? t.capa : null)).join("")}</div>`;
      } else {
        const top = (S.maisPedidas || []).map(m => acharCat(m.codigo)).filter(Boolean);
        html = (top.length >= 3 ? `<div class="cat-top"><h3>🔥 Mais pedidas</h3><div class="cat-faixa">${top.map(c => estampa(c, true)).join("")}</div></div>` : "") + `<p class="cat-sub">${L.length} coleções · ${itens.length.toLocaleString("pt-BR")} estampas · toque numa coleção</p><div class="cat-cols">${L.map(t => `<button type="button" class="cat-col" data-ctema="${esc(t.id)}"><span class="fan">${t.capa.map(c => `<img src="${imgDrive(c.arquivo_id, 130)}" alt="" loading="lazy">`).join("")}</span><span class="tx"><b>${esc(t.nome)}</b><small><span class="cat-pre">${esc(t.pre)}</span> ${t.itens.length} estampas</small></span></button>`).join("")}</div>`;
      }
      $("cattit").textContent = tit;
      $("catvoltar").hidden = !catTema || !!q;
      corpo.innerHTML = html; corpo.scrollTop = 0;
      $$("[data-ctema]").forEach(b => b.onclick = () => { catTema = b.dataset.ctema; desenharCat(); });
      $$("[data-ccod]").forEach(b => b.onclick = () => { fecharModal(); aoEscolher(b.dataset.ccod); });
      $$("[data-capa]").forEach(b => b.onclick = async () => {
        const t = porId.get(catTema), c = t.itens.find(i => i.codigo === b.dataset.capa);
        let capa = t.capa.map(x => x.codigo);
        capa = capa.includes(c.codigo) ? capa.filter(x => x !== c.codigo) : [c.codigo, ...capa].slice(0, 3);
        try { await api.salvarCapa(t.pre, capa); const tm = S.temas.find(x => x.prefixo === t.pre); if (tm) tm.capa = capa; Object.assign(t, colecoesCatalogo().find(x => x.id === t.id)); toast("Capa da coleção atualizada."); desenharCat(); }
        catch (e) { erroTela(e); }
      });
    };
    $("catfechar").onclick = fecharModal;
    $("catvoltar").onclick = () => { catTema = null; desenharCat(); };
    const q = $("catq"); q.oninput = () => { catBusca = q.value; desenharCat(); };
    desenharCat();
  }, "box-cat");
}
const ICON_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { }
  try { const x = document.createElement("textarea"); x.value = t; x.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(x); x.select(); const ok = document.execCommand("copy"); x.remove(); return ok; } catch (e) { return false; }
}
/* catálogo aberto na tela de entrada (sem login): lê as estampas ativas direto do banco (mesma fonte da área da equipe) */
let carregandoCatalogo = null;
async function garantirCatalogo() {
  if (S.catalogo.size) return;
  if (!carregandoCatalogo) carregandoCatalogo = (async () => {
    const [itens, temas] = await Promise.all([api.catalogo(), api.temasCatalogo()]);
    S.temas = temas; S.catalogo = new Map(); itens.forEach(c => S.catalogo.set(normCod(c.codigo), c));
  })().finally(() => { carregandoCatalogo = null; });
  return carregandoCatalogo;
}
async function catalogoPublico(manter) {
  if (!S.maisPedidas) api.maisPedidas().then(r => { S.maisPedidas = r || []; }).catch(() => { S.maisPedidas = []; });
  if (!S.catalogo.size) {
    toast("Abrindo o catálogo…", 1500);
    try { await garantirCatalogo(); } catch (e) { return erroTela(new Error("Não consegui abrir o catálogo. Confira a internet e tente de novo.")); }
  }
  abrirCatalogo(cod => {
    const c = acharCat(cod); if (!c) return;
    const nome = nomeColecao(c.codigo.split("-")[0], c.tema);
    modal(`<div class="cat-topo"><button type="button" class="cat-voltar" id="vvoltar">‹ ${esc(nome)}</button><h2>${esc(c.codigo)}</h2><button class="cat-x" id="vfechar" aria-label="Fechar">×</button></div>
      <img class="cat-grande" src="${imgDrive(c.arquivo_id, 600)}" alt="Estampa ${esc(c.codigo)}">
      <p class="hint" style="text-align:center;margin:0">Para pedir, informe o código:</p>
      <div class="cod-copiar"><span class="cod" id="vcod">${esc(c.codigo)}</span><button type="button" class="primary" id="vcopiar">${ICON_COPIAR}<span>Copiar</span></button></div>
      ${papel() === "loja" ? `<button type="button" class="btn soft" id="vpedir">${ICON.mais} Fazer pedido com esta estampa</button>` : ""}`, () => {
      if ($("vpedir")) $("vpedir").onclick = () => { fecharModal(); setTimeout(() => { novoPedido(); w.codigo = c.codigo; tela = "novo"; desenhar(); scrollTo(0, 0); }, 80); }; // espera o "voltar" da janela antes de abrir o pedido
      $("vfechar").onclick = fecharModal; $("vvoltar").onclick = () => catalogoPublico(true);
      $("vcopiar").onclick = async () => {
        if (await copiarTexto(c.codigo)) { $("vcopiar").classList.add("ok"); $("vcopiar").innerHTML = `${ICON_OK}<span>Copiado</span>`; toast(`Código ${c.codigo} copiado`); }
        else { const r = document.createRange(); r.selectNodeContents($("vcod")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selecionei o código: é só copiar"); }
      };
    }, "box-ver");
  }, manter === true);
}
function msgCat() {
  const c = acharCat(w.codigo);
  if (c && c.ativo) return `<img src="${imgDrive(c.arquivo_id)}" alt="Estampa ${esc(c.codigo)}"><div><b style="color:var(--ok)">${ICON.ok.replace("<svg", '<svg width="18" height="18" style="vertical-align:-3px"')} Estampa encontrada</b><div style="font-size:20px;font-weight:800;margin-top:4px">${esc(c.codigo)}</div><div class="sub">${esc(c.tema)}</div></div>`;
  if (c && !c.ativo) return `<div class="sub" style="color:var(--urg);font-weight:600">Essa estampa saiu do catálogo. Escolha outra.</div>`;
  if (w.codigo) return `<div class="sub" style="color:var(--urg);font-weight:600">Código não encontrado. Confira as letras e os números.</div>`;
  return "";
}
function blocoLisa() {
  const c = w.compra || {};
  let x = `<div class="f"><span>Capinha lisa para imprimir</span><div class="choices two">
    <button type="button" class="choice ${w.origem === "loja" ? "sel" : ""}" data-orig="loja">${ICON.loja}<b>Enviando da loja</b><small>A loja tem a capinha e manda para a fábrica</small></button>
    <button type="button" class="choice ${w.origem === "logistica" ? "sel" : ""}" data-orig="logistica">${ICON.caixa}<b>Encomendar com a logística</b><small>A logística compra e entrega na fábrica</small></button></div></div>`;
  if (w.origem === "logistica") {
    x += `<div class="extra"><div class="sub">A logística vai comprar: <b>${w.qtd}× ${esc(w.celular)} · ${w.produto === "aveludada" ? "Aveludada" : "Transparente"}</b></div>`;
    if (w.produto === "aveludada") x += `<div class="f"><span>Cor da capinha</span><div class="pills" id="pcores">${CORES.map(o => `<button type="button" class="${c.cor === o ? "on" : ""}">${o}</button>`).join("")}</div><input id="corLisa" value="${esc(c.cor || "")}" placeholder="Ou digite outra cor"></div>`;
    x += `<label class="f"><span>Precisa chegar na fábrica até</span><input type="date" id="precisaAte" value="${c.precisa_ate || ""}" min="${hoje()}"></label></div>`;
  }
  return x;
}
function renderPasso() {
  let corpo = "";
  if (passo === 1) corpo = `<div class="choices">${[["transparente", ICON.capa], ["aveludada", ICON.veludo], ["popsocket", ICON.pop]].map(([k, ic]) => `<button class="choice ${w.produto === k ? "sel" : ""}" data-prod="${k}">${ic}<b>${PROD[k]}</b></button>`).join("")}</div>`;
  if (passo === 2) corpo = `<div class="choices">${[["foto", ICON.foto], ["nome", ICON.nome], ["catalogo", ICON.cat]].map(([k, ic]) => `<button class="choice ${w.pers === k ? "sel" : ""}" data-pers="${k}">${ic}<b>${PERS[k]}</b><span>${brl(precoUnit(w.produto, k))}</span></button>`).join("")}</div>`;
  if (passo === 3) {
    corpo = `<div class="form">`;
    if (w.produto !== "popsocket") corpo += `<div class="f"><span>Modelo do celular</span><input id="celular" value="${esc(w.celular)}" placeholder="Digite e escolha na lista" autocomplete="off"><div class="sugest" id="sugest"></div><span class="hint" id="celmsg">${w.celular && !modeloValido(w.celular) ? "Escolha um modelo da lista. Se ele não aparecer, fale com a fábrica." : ""}</span></div>`;
    if (w.pers === "foto") {
      const prev = w.foto ? w.foto.previa : null;
      corpo += `<div class="f"><span>Foto do cliente</span>${w.foto_whats ? "" : `<label class="drop" for="foto">${prev || w.foto_path ? `${prev ? `<img src="${prev}" alt="Foto escolhida">` : `<img data-foto="${esc(w.foto_path)}" alt="Foto do pedido">`}<b style="color:var(--accent)">Trocar foto</b>` : `${ICON.foto}<b style="color:var(--fg)">Toque para escolher a foto</b><span>Da galeria do celular</span>`}<input type="file" id="foto" accept="image/*"></label>`}
        ${w.foto && w.foto.alerta ? `<div class="aviso"><b>Essa foto é pequena (${w.foto.lado}px)</b> e pode sair pixelada na capinha. Se puder, peça ao cliente a foto original, sem ser print.</div>` : ""}
        <label class="toggle" for="fotoWhats"><input type="checkbox" id="fotoWhats" ${w.foto_whats ? "checked" : ""}> O cliente vai mandar a foto pelo WhatsApp</label></div>`;
    }
    if (w.pers === "nome") corpo += `<label class="f"><span>Nome que vai na capinha</span><input id="texto" value="${esc(w.texto_nome)}" placeholder="Ex.: Maria Eduarda"></label>` + blocoCat("Modelo no catálogo");
    if (w.pers === "catalogo") corpo += blocoCat("Estampa do catálogo");
    corpo += `</div>`;
  }
  if (passo === 4) {
    corpo = `<div class="form">
     <label class="f"><span>Seu nome (vendedor)</span><input id="vendedor" value="${esc(w.vendedor)}" placeholder="Quem está fazendo o pedido"></label>
     <div class="row"><label class="f"><span>Nome do cliente</span><input id="cliente" value="${esc(w.cliente)}"></label>
     <label class="f"><span>WhatsApp do cliente <em>(para avisar quando chegar)</em></span><input id="whats" inputmode="tel" value="${esc(w.whats)}" placeholder="(11) 90000-0000"></label></div>
     ${lojaEhOnline(S.perfil.loja_id) ? `<div class="f"><span>Cliente vai retirar em</span><div class="pills" id="retiradas">${lojasFisicas().map(l => `<button type="button" data-ret="${l.id}" class="${w.retirada === l.id ? "on" : ""}">${esc(l.nome)}</button>`).join("")}</div><span class="hint">A capinha vai para esta loja, e o cliente busca lá.</span></div>` : ""}
     <div class="f"><span>Quantidade</span><div class="qty"><button type="button" id="menos" aria-label="Diminuir">−</button><b id="q">${w.qtd}</b><button type="button" id="mais" aria-label="Aumentar">+</button></div></div>
     <label class="f"><span>Entregar na loja até</span><input type="date" id="entrega" value="${w.entrega}" min="${hoje()}"></label>
     <label class="toggle" for="urgente"><input type="checkbox" id="urgente" ${w.urgente ? "checked" : ""} style="accent-color:var(--urg)"> É urgente</label>
     ${w.produto !== "popsocket" ? blocoLisa() : ""}
     <label class="f"><span>Observações <em>(opcional)</em></span><textarea id="obs" rows="3" placeholder="Algo que a fábrica precisa saber">${esc(w.obs)}</textarea></label>
    </div>`;
  }
  if (passo === 5) {
    const c = acharCat(w.codigo), unit = precoUnit(w.produto, w.pers);
    const L = [["Produto", PROD[w.produto]], ["Personalização", PERS[w.pers]], w.produto !== "popsocket" && ["Celular", esc(w.celular)],
      w.pers === "nome" && ["Nome", `“${esc(w.texto_nome)}”`], w.pers !== "foto" && c && ["Estampa", `${esc(c.codigo)} · ${esc(c.tema)}`],
      w.pers === "foto" && ["Foto", w.foto_whats && !w.foto && !w.foto_path ? "Cliente vai mandar pelo WhatsApp" : (w.foto && w.foto.alerta ? "Anexada (pode sair pixelada)" : "Anexada")],
      ["Quantidade", w.qtd], ["Cliente", esc(w.cliente) || "—"], lojaEhOnline(S.perfil.loja_id) && ["Retirada", esc(nomeLoja(w.retirada))], ["Entrega", fmtD(w.entrega) + (w.urgente ? ` · <span style="color:var(--urg)">urgente</span>` : "")],
      w.produto !== "popsocket" && ["Capinha lisa", w.origem === "logistica" ? `Logística · ${esc(w.produto === "aveludada" ? w.compra.cor : "Transparente")} · chegar até ${fmtD(w.compra.precisa_ate)}` : "Enviando da loja"],
      ["Vendedor", esc(w.vendedor)], w.obs && ["Obs.", esc(w.obs)]].filter(Boolean);
    const img = w.foto ? w.foto.previa : null;
    corpo = `${img ? `<img src="${img}" alt="Foto do pedido" style="max-height:180px;border-radius:12px;margin-top:16px">` : w.pers === "foto" && w.foto_path ? `<img data-foto="${esc(w.foto_path)}" alt="Foto do pedido" style="max-height:180px;border-radius:12px;margin-top:16px">` : w.pers !== "foto" && c ? `<img src="${imgDrive(c.arquivo_id)}" alt="" style="height:160px;margin-top:16px;border-radius:10px">` : ""}
     <div class="review">${L.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>
     <div class="total"><span class="sub">${w.qtd} × ${brl(unit)}</span><b>${brl(unit * w.qtd)}</b></div>`;
  }
  const auto = passo <= 2 && !(w.id && (passo === 1 ? w.produto : w.pers));
  $("app").innerHTML = `
   <div class="stepnum">Passo ${passo} de 5</div>
   <div class="prog">${PASSOS.map((_, i) => `<i class="${i < passo ? "on" : ""}"></i>`).join("")}</div>
   ${w.id ? `<div class="editbar">Editando o pedido <b>${nro(w.id)}</b>. Toque em Continuar para manter o que já está escolhido.</div>` : ""}
   <h1 style="margin-top:10px">${w.id && passo === 5 ? "Confira as alterações" : PASSOS[passo - 1]}</h1>
   ${corpo}
   <div class="nav">
    <button class="btn soft" id="voltar">${passo === 1 ? (w.id ? "Cancelar edição" : "Cancelar") : "Voltar"}</button>
    ${auto ? "" : `<button class="btn primary" id="seguir">${passo === 5 ? (w.id ? "Salvar alterações" : "Enviar pedido") : "Continuar"}</button>`}
   </div>`;
  ligarPasso(); carregarFotos($("app"));
}
function ligarPasso() {
  $("voltar").onclick = () => { guardar(); if (passo === 1) tela = "inicio"; else passo--; desenhar(); scrollTo(0, 0); };
  $$("[data-prod]").forEach(b => b.onclick = () => { w.produto = b.dataset.prod; if (w.produto === "popsocket") { w.celular = ""; w.origem = null; w.compra = null; } passo = 2; desenhar(); });
  $$("[data-pers]").forEach(b => b.onclick = () => { if (w.pers !== b.dataset.pers) { w.codigo = ""; w.texto_nome = ""; w.foto = null; w.foto_path = null; w.foto_whats = false; } w.pers = b.dataset.pers; passo = 3; desenhar(); });
  const fi = $("foto"); if (fi) fi.onchange = async () => { if (!fi.files[0]) return; try { guardar(); w.foto = await prepararFoto(fi.files[0]); desenhar(); } catch (e) { erroTela(e); } };
  const fw = $("fotoWhats"); if (fw) fw.onchange = () => { guardar(); w.foto_whats = fw.checked; if (fw.checked) { w.foto = null; w.foto_path = null; } desenhar(); };
  const ci = $("codigo"); if (ci) ci.oninput = () => { w.codigo = ci.value.trim(); $("catmsg").innerHTML = msgCat(); };
  const vc = $("vercat"); if (vc) vc.onclick = () => abrirCatalogo(cod => { w.codigo = cod; const c = $("codigo"); if (c) c.value = cod; $("catmsg").innerHTML = msgCat(); toast(`Estampa ${cod} escolhida`); });
  const cel = $("celular");
  if (cel) {
    const sug = () => {
      const q = semAcento(cel.value).trim(); const box = $("sugest");
      if (!q || modeloValido(cel.value)) { box.innerHTML = ""; return; }
      const L = S.modelos.filter(m => m.ativo && semAcento(m.nome).replace(/\s/g, "").includes(q.replace(/\s/g, ""))).slice(0, 6);
      box.innerHTML = L.length ? L.map(m => `<button type="button" data-mod="${esc(m.nome)}">${esc(m.nome)}</button>`).join("") : `<button type="button" disabled>Nenhum modelo encontrado. Fale com a fábrica.</button>`;
      $$("[data-mod]").forEach(b => b.onclick = () => { cel.value = b.dataset.mod; w.celular = b.dataset.mod; box.innerHTML = ""; $("celmsg").textContent = ""; });
    };
    cel.oninput = () => { w.celular = cel.value; $("celmsg").textContent = ""; sug(); };
  }
  if (passo === 4) {
    $("menos").onclick = () => { w.qtd = Math.max(1, w.qtd - 1); $("q").textContent = w.qtd; };
    $("mais").onclick = () => { w.qtd = Math.min(50, w.qtd + 1); $("q").textContent = w.qtd; };
    $$("[data-ret]").forEach(b => b.onclick = () => { guardar(); w.retirada = b.dataset.ret; desenhar(); });
    $("entrega").onchange = () => { guardar(); desenhar(); };
    $$("[data-orig]").forEach(b => b.onclick = () => { guardar(); w.origem = b.dataset.orig; if (w.origem === "logistica") { w.compra = w.compra || {}; if (!w.compra.precisa_ate) { const d = addDias(w.entrega, -1); w.compra.precisa_ate = d < hoje() ? hoje() : d; } } desenhar(); });
    $$("#pcores button").forEach(b => b.onclick = () => { guardar(); w.compra.cor = b.textContent; desenhar(); });
  }
  const s = $("seguir"); if (s) s.onclick = () => { guardar(); const falta = validar(); if (falta) { toast(falta); return; } if (passo === 5) return enviar(); passo++; desenhar(); scrollTo(0, 0); };
}
function guardar() {
  const v = id => $(id) ? $(id).value.trim() : null;
  if (v("celular") !== null) { const m = modeloValido(v("celular")); w.celular = m ? m.nome : v("celular"); }
  if (v("codigo") !== null) w.codigo = v("codigo");
  if (v("texto") !== null) w.texto_nome = v("texto");
  ["vendedor", "cliente", "whats", "entrega", "obs"].forEach(k => { if (v(k) !== null) w[k] = v(k); });
  if ($("urgente")) w.urgente = $("urgente").checked;
  if (w.compra) { if (v("corLisa") !== null) w.compra.cor = v("corLisa"); if (v("precisaAte") !== null) w.compra.precisa_ate = v("precisaAte"); }
}
function validar() {
  if (passo === 3) {
    if (w.produto !== "popsocket" && !modeloValido(w.celular)) return "Escolha o modelo do celular na lista.";
    if (w.pers === "foto" && !w.foto && !w.foto_path && !w.foto_whats) return "Escolha a foto ou marque que o cliente vai mandar pelo WhatsApp.";
    if (w.pers === "nome" && !w.texto_nome) return "Digite o nome que vai na capinha.";
    if (w.pers !== "foto") { const c = acharCat(w.codigo); if (!w.codigo) return "Digite o código da estampa."; if (!c || !c.ativo) return "Esse código não está no catálogo. Confira e digite de novo."; w.codigo = c.codigo; }
  }
  if (passo === 4) {
    if (!w.vendedor) return "Digite seu nome de vendedor.";
    if (lojaEhOnline(S.perfil.loja_id) && !w.retirada) return "Escolha em qual loja o cliente vai retirar.";
    if (!w.entrega) return "Escolha a data de entrega.";
    if (w.entrega < hoje() && !w.id) return "A data de entrega já passou.";
    if (w.produto !== "popsocket") {
      if (!w.origem) return "Escolha de onde vem a capinha lisa: da loja ou da logística.";
      if (w.origem === "logistica" && w.produto === "aveludada" && !w.compra.cor) return "Escolha a cor da capinha aveludada.";
      if (w.origem === "logistica" && !w.compra.precisa_ate) return "Informe até quando a capinha precisa chegar na fábrica.";
    }
  }
  return null;
}
async function enviar() {
  if (enviando) return; enviando = true;
  const b = $("seguir"); b.disabled = true; b.textContent = "Enviando…";
  const c = acharCat(w.codigo);
  const dados = {
    vendedor: w.vendedor, cliente: w.cliente, whats: w.whats, produto: w.produto, celular: w.produto === "popsocket" ? "" : w.celular, pers: w.pers,
    codigo: w.pers === "foto" ? null : c.codigo, arquivo_id: w.pers === "foto" ? null : c.arquivo_id, texto_nome: w.pers === "nome" ? w.texto_nome : null,
    foto_whats: w.pers === "foto" && w.foto_whats && !w.foto, foto_alerta: !!(w.foto && w.foto.alerta) || (!w.foto && !!w.foto_path && (S.pedidos.find(p => p.id === w.id) || {}).foto_alerta === true),
    qtd: w.qtd, entrega: w.entrega, urgente: w.urgente, obs: w.obs, origem_lisa: w.produto === "popsocket" ? null : w.origem,
    retirada_loja_id: lojaEhOnline(S.perfil.loja_id) ? w.retirada : null
  };
  const compra = w.produto !== "popsocket" && w.origem === "logistica" ? { cor: w.produto === "aveludada" ? w.compra.cor : "Transparente", precisa_ate: w.compra.precisa_ate } : null;
  const foto = w.pers !== "foto" ? null : (w.foto ? { blob: w.foto.blob, previa: w.foto.previa } : (w.foto_path && !w.foto_whats ? "manter" : null));
  try {
    ultimo = await api.salvarPedido({ id: w.id, dados, compra, foto: foto === "manter" ? undefined : foto });
    ls.set("vend-" + S.perfil.id, w.vendedor);
    await recarregar(true); tela = "enviado"; desenhar(); scrollTo(0, 0);
  } catch (e) { erroTela(e); b.disabled = false; b.textContent = w.id ? "Salvar alterações" : "Enviar pedido"; }
  finally { enviando = false; }
}
function renderEnviado() {
  $("app").innerHTML = `<div class="done"><div class="ok">${ICON.ok}</div><h1>Pedido ${nro(ultimo.id)} ${w.id ? "atualizado" : "enviado"}</h1><p class="lead">${w.id ? "A fábrica vai ver o pedido marcado como editado." : "A fábrica já recebeu. Você acompanha o andamento na tela inicial."}</p>
   <div style="display:grid;gap:10px;width:100%;max-width:360px;margin-top:10px"><button class="btn primary" id="outro">Fazer outro pedido</button><button class="btn soft" id="ini">Ver meus pedidos</button></div></div>`;
  $("outro").onclick = () => { novoPedido(); tela = "novo"; desenhar(); };
  $("ini").onclick = () => { tela = "inicio"; desenhar(); };
}
