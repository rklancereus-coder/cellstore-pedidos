/* ---------- FÁBRICA (e administrador) ---------- */
let abaFab = "pedidos", filtroFab = { status: "aberto", loja: "todas", busca: "" }, mesSel = hoje().slice(0, 7);
const ABAS_FAB = [["pedidos", "Pedidos"], ["conversas", "Conversas"], ["producao", "Produção do dia"], ["envios", "Envios"], ["numeros", "Números"], ["fechamento", "Fechamento"]];

function telaFabrica() {
  const novos = S.pedidos.filter(p => !p.visto_fabrica && ABERTOS.includes(p.status)).length;
  const abas = [...ABAS_FAB, ...(papel() === "admin" ? [["admin", "Administração"]] : [])];
  let html = faixaAvisos() + `<div class="tabs noprint" style="margin-top:0">${abas.map(([k, n]) => `<button data-fab="${k}" class="${abaFab === k ? "on" : ""}">${n}${k === "pedidos" && novos ? ` · ${novos} novo${novos > 1 ? "s" : ""}` : ""}${k === "conversas" && naoLidas() ? ` · ${naoLidas()}` : ""}</button>`).join("")}</div>`;
  if (abaFab === "pedidos") html += abaPedidos();
  if (abaFab === "conversas") html += abaConversas();
  if (abaFab === "producao") html += abaProducao();
  if (abaFab === "envios") html += abaEnvios();
  if (abaFab === "numeros") html += abaNumeros();
  if (abaFab === "fechamento") html += abaFechamento();
  if (abaFab === "admin") html += `<div id="admin"><p class="carregando" style="margin-top:10vh">Carregando…</p></div>`;
  $("app").innerHTML = html;
  if ($("bavisos")) $("bavisos").onclick = ativarAvisos;
  $$("[data-fab]").forEach(b => b.onclick = () => { abaFab = b.dataset.fab; desenhar(); });
  ligarFabrica();
  if (abaFab === "conversas") ligarConversas();
  carregarFotos($("app"));
  if (abaFab === "admin") telaAdmin();
}

/* ---- Pedidos ---- */
function abaPedidos() {
  const T = S.pedidos, c = s => T.filter(p => p.status === s).length;
  const q = semAcento(filtroFab.busca).trim(), qn = soNumeros(filtroFab.busca);
  let L = T.filter(p => filtroFab.loja === "todas" || p.loja_id === filtroFab.loja);
  L = filtroFab.status === "aberto" ? L.filter(p => ABERTOS.includes(p.status)) : filtroFab.status === "todos" ? L : L.filter(p => p.status === filtroFab.status);
  if (q) L = L.filter(p => semAcento(`${p.cliente} ${p.vendedor} ${p.codigo || ""} ${p.celular} ${p.texto_nome || ""}`).includes(q) || (qn && (String(p.id) === qn || soNumeros(p.whats).includes(qn))));
  L.sort((a, b) => (a.visto_fabrica - b.visto_fabrica) || (b.urgente - a.urgente) || a.entrega.localeCompare(b.entrega) || a.id - b.id);
  const k = [["aberto", "Em aberto", T.filter(p => ABERTOS.includes(p.status)).length], ["recebido", "Recebidos", c("recebido")], ["producao", "Em produção", c("producao")], ["pronto", "Prontos", c("pronto")], ["todos", "Todos", T.length]];
  return `<div class="kpis">${k.map(([s, n, v]) => `<button class="kpi ${filtroFab.status === s ? "sel" : ""}" data-st="${s}"><b>${v}</b><span>${n}</span></button>`).join("")}</div>
   <div class="bar"><select id="floja" aria-label="Filtrar por loja"><option value="todas">Todas as lojas</option>${S.lojas.map(l => `<option value="${l.id}" ${filtroFab.loja === l.id ? "selected" : ""}>${esc(l.nome)}</option>`).join("")}</select>
   <div class="busca">${ICON.lupa}<input id="fbusca" type="search" placeholder="Buscar cliente, código, modelo ou nº" value="${esc(filtroFab.busca)}"></div></div>
   <div class="list">${L.length ? L.slice(0, 300).map(cardFab).join("") : `<div class="empty">Nenhum pedido aqui. Quando uma loja enviar, ele aparece no topo com o selo <b>Novo</b>.</div>`}</div>`;
}
function cardFab(p) {
  const [nome, cor] = ST[p.status];
  const atraso = ["recebido", "producao", "pronto"].includes(p.status) && p.entrega < hoje();
  let det = "";
  if (p.pers === "nome") det = `Nome “<b>${esc(p.texto_nome)}</b>” · modelo <b>${esc(p.codigo)}</b>`;
  if (p.pers === "catalogo") det = `Estampa <b>${esc(p.codigo)}</b>`;
  if (p.pers === "foto") det = p.foto_path ? (p.foto_alerta ? `Foto anexada <span class="tag warn">pode sair pixelada</span>` : "Foto anexada") : `<span class="tag urg">Aguardando foto no WhatsApp</span>`;
  return `<article class="card ${p.urgente && ABERTOS.includes(p.status) ? "urg" : ""}">
   <div class="hd"><b>${esc(nomeLoja(p.loja_id))}</b><span class="num">${nro(p.id)}</span>${!p.visto_fabrica && ABERTOS.includes(p.status) ? `<span class="tag new">${p.editado ? "Editado" : "Novo"}</span>` : p.editado && p.status === "recebido" ? `<span class="tag">Editado</span>` : ""}${p.urgente ? `<span class="tag urg">Urgente</span>` : ""}${atraso ? `<span class="tag urg">Atrasado</span>` : ""}${p.exemplo ? `<span class="tag">exemplo</span>` : ""}<span class="right">${brl(p.valor_total)}</span></div>
   <div class="row-media">${miniatura(p)}<div>
    <div class="what">${p.qtd > 1 ? p.qtd + "× " : ""}${PROD[p.produto]}${p.produto !== "popsocket" ? " · " + esc(p.celular) : ""}</div>
    <div class="sub">${PERS[p.pers]} · ${det}</div>
    ${p.obs ? `<div class="sub">Obs.: ${esc(p.obs)}</div>` : ""}
    <div class="sub">Entrega <b>${fmtD(p.entrega)}</b> · Vendedor <b>${esc(p.vendedor)}</b> · Cliente <b>${esc(p.cliente) || "—"}</b></div>
    ${linhaLisa(p)}</div></div>
   <div class="acts"><span class="stline" style="margin-right:auto;--c:var(${cor})">${nome}</span>
    ${PROX[p.status] ? `<button class="primary" data-av="${p.id}">${PROX[p.status]} →</button>` : ""}
    ${p.status === "pronto" ? `<button class="soft mini" data-ir="envios">Enviar na aba Envios →</button>` : ""}
    ${!p.visto_fabrica && ABERTOS.includes(p.status) ? `<button class="soft mini" data-visto="${p.id}">Marcar como visto</button>` : ""}
    <select data-set="${p.id}" aria-label="Mudar status"><option value="">Outro status…</option>${[...FLUXO, "cancelado"].map(s => `<option value="${s}">${ST[s][0]}</option>`).join("")}</select>
   </div></article>`;
}

/* ---- Produção do dia: o que imprimir, agrupado por material e modelo ---- */
function abaProducao() {
  const L = S.pedidos.filter(p => ["recebido", "producao"].includes(p.status)).sort((a, b) => (b.urgente - a.urgente) || a.entrega.localeCompare(b.entrega));
  if (!L.length) return `<div class="empty">Nada para produzir agora. Os pedidos recebidos aparecem aqui agrupados por material e modelo.</div>`;
  const G = {};
  L.forEach(p => { const k = p.produto === "popsocket" ? "PopSocket" : `${p.produto === "aveludada" ? "Aveludada" : "Transparente"} · ${p.celular}`; (G[k] ||= []).push(p); });
  const grupos = Object.entries(G).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  return `<div class="bar noprint"><span class="sub" style="flex:1">${L.length} pedido${L.length > 1 ? "s" : ""} para produzir · ${L.reduce((a, p) => a + p.qtd, 0)} unidades. Marque os que vão para a impressão agora.</span>
   <button class="soft mini" id="imprimir">Imprimir ficha</button><button class="primary mini" id="iniciarSel">Começar produção dos marcados</button></div>
   <div class="so-imprimir"><h2>Ficha de produção · ${fmtD(hoje())}</h2></div>
   ${grupos.map(([k, ps]) => `<section class="grupo"><h3>${esc(k)} <small>${ps.reduce((a, p) => a + p.qtd, 0)} un.</small></h3>
     ${ps.map(p => `<label class="ficha">${p.status === "recebido" ? `<input type="checkbox" data-sel="${p.id}" checked>` : `<span class="tag" style="background:var(--warn-soft);color:var(--warn)">Em produção</span>`}
       <div class="row-media">${miniatura(p)}<div>
        <div class="big">${p.pers === "foto" ? "FOTO" : esc(p.codigo)}${p.pers === "nome" ? ` · “${esc(p.texto_nome)}”` : ""}${p.qtd > 1 ? ` · ${p.qtd}×` : ""}</div>
        <div class="sub">${esc(nomeLoja(p.loja_id))} · ${nro(p.id)} · entrega <b>${fmtD(p.entrega)}</b>${p.urgente ? ` · <b style="color:var(--urg)">URGENTE</b>` : ""}${p.pers === "foto" && !p.foto_path ? ` · <b style="color:var(--urg)">sem foto ainda</b>` : ""}</div>
        ${p.obs ? `<div class="sub">Obs.: ${esc(p.obs)}</div>` : ""}${p.compra && p.compra.status !== "entregue" ? `<div class="sub" style="color:var(--warn)">Capinha lisa ainda com a logística (${CST[p.compra.status][0].toLowerCase()})</div>` : ""}
       </div></div>${p.status === "producao" ? `<button class="primary mini noprint" data-av="${p.id}">Pronto →</button>` : "<span></span>"}</label>`).join("")}
   </section>`).join("")}`;
}

/* ---- Envios: romaneio por loja ---- */
function abaEnvios() {
  const prontos = S.pedidos.filter(p => p.status === "pronto");
  const porLoja = S.lojas.map(l => ({ l, ps: prontos.filter(p => p.loja_id === l.id) })).filter(x => x.ps.length);
  const roms = S.romaneios.slice().sort((a, b) => b.id - a.id).slice(0, 30);
  return `<h2>Prontos para enviar</h2>
   ${porLoja.length ? porLoja.map(({ l, ps }) => `<section class="card" style="margin-top:12px"><div class="hd"><h3>${esc(l.nome)}</h3><span class="tag">${ps.length} pedido${ps.length > 1 ? "s" : ""}</span></div>
     ${ps.map(p => `<label class="hd" style="gap:10px"><input type="checkbox" data-rom="${l.id}" value="${p.id}" checked style="width:20px;height:20px;accent-color:var(--accent)"><span class="num">${nro(p.id)}</span><span class="sub">${descr(p)}${p.produto !== "popsocket" ? " · " + esc(p.celular) : ""} · ${esc(p.cliente) || "—"}</span></label>`).join("")}
     <button class="btn primary" data-gerar="${l.id}" style="padding:12px">Gerar romaneio e enviar para ${esc(l.nome)}</button></section>`).join("")
    : `<div class="empty" style="margin-top:12px">Nenhum pedido pronto. Quando você marcar pedidos como <b>Pronto</b>, eles aparecem aqui separados por loja.</div>`}
   <h2 style="margin-top:28px">Remessas enviadas</h2>
   <div class="list" style="margin-top:12px">${roms.length ? roms.map(r => { const ps = S.pedidos.filter(p => p.romaneio_id === r.id); return `<div class="linha"><b>${nro(r.id)}</b><span class="grow">${esc(nomeLoja(r.loja_id))} · ${ps.length} pedido${ps.length === 1 ? "" : "s"} · enviado ${fmtDH(r.criado_em)}</span>${r.recebido_em ? `<span class="tag" style="background:var(--ok-soft);color:var(--ok)">Recebido ${fmtDH(r.recebido_em)}</span>` : `<span class="tag warn">Aguardando a loja confirmar</span>`}<button class="soft mini" data-verrom="${r.id}">Ver / imprimir</button></div>`; }).join("") : `<div class="empty">Nenhuma remessa ainda.</div>`}</div>`;
}
function verRomaneio(id) {
  const r = S.romaneios.find(x => x.id === id), ps = S.pedidos.filter(p => p.romaneio_id === id);
  modal(`<h2>Romaneio ${nro(id)} · ${esc(nomeLoja(r.loja_id))}</h2><p class="sub">Enviado ${fmtDH(r.criado_em)}${r.recebido_em ? ` · recebido ${fmtDH(r.recebido_em)}` : ""}</p>
   <div class="tblwrap"><table><thead><tr><th>Pedido</th><th class="l">Produto</th><th class="l">Cliente</th><th>Qtd</th></tr></thead><tbody>${ps.map(p => `<tr><td>${nro(p.id)}</td><td class="l">${PROD[p.produto]}${p.produto !== "popsocket" ? " · " + esc(p.celular) : ""} · ${p.pers === "foto" ? "foto" : esc(p.codigo)}</td><td class="l">${esc(p.cliente) || "—"}</td><td>${p.qtd}</td></tr>`).join("")}</tbody><tfoot><tr><td>Total</td><td></td><td></td><td>${ps.reduce((a, p) => a + p.qtd, 0)}</td></tr></tfoot></table></div>
   <div class="nav"><button class="btn soft" onclick="fecharModal()">Fechar</button><button class="btn primary" onclick="window.print()">Imprimir</button></div>`);
}

/* ---- Números ---- */
function abaNumeros() {
  const meses = mesesDisponiveis();
  const ps = S.pedidos.filter(p => p.data_pedido.startsWith(mesSel) && p.status !== "cancelado");
  const un = ps.reduce((a, p) => a + p.qtd, 0), fat = ps.reduce((a, p) => a + Number(p.valor_total), 0);
  const conta = (f) => { const m = {}; ps.forEach(p => { const k = f(p); if (k) m[k] = (m[k] || 0) + p.qtd; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const estampas = conta(p => p.codigo).slice(0, 10), modelos = conta(p => p.produto === "popsocket" ? null : p.celular).slice(0, 8);
  const lojas = S.lojas.map(l => [l.nome, ps.filter(p => p.loja_id === l.id).reduce((a, p) => a + Number(p.valor_total), 0)]).sort((a, b) => b[1] - a[1]);
  const prontos = ps.filter(p => p.pronto_em && p.criado_em);
  const dias = prontos.length ? prontos.reduce((a, p) => a + (new Date(p.pronto_em) - new Date(p.criado_em)), 0) / prontos.length / 864e5 : null;
  const comPrazo = ps.filter(p => p.enviado_em || (["recebido", "producao", "pronto"].includes(p.status) && p.entrega < hoje()));
  const diaLocal = iso => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const atrasados = comPrazo.filter(p => p.enviado_em ? diaLocal(p.enviado_em) > p.entrega : true).length;
  const maxL = Math.max(1, ...lojas.map(x => x[1])), maxM = Math.max(1, ...modelos.map(x => x[1]));
  const tipos = [["foto", "Com foto"], ["nome", "Com nome"], ["catalogo", "Do catálogo"]].map(([k, n]) => [n, ps.filter(p => p.produto !== "popsocket" && p.pers === k).reduce((a, p) => a + p.qtd, 0)]).concat([["PopSocket", ps.filter(p => p.produto === "popsocket").reduce((a, p) => a + p.qtd, 0)]]);
  const maxT = Math.max(1, ...tipos.map(x => x[1]));
  return `<div class="bar"><select id="mes" aria-label="Mês">${meses.map(m => `<option value="${m}" ${m === mesSel ? "selected" : ""}>${nomeMes(m)}</option>`).join("")}</select><span class="sub">Conta pela data do pedido. Cancelados ficam de fora.</span></div>
   <div class="stats">
    <div class="stat"><span>Faturamento</span><b>${brl(fat)}</b><small>${ps.length} pedidos</small></div>
    <div class="stat"><span>Unidades</span><b>${un}</b><small>ticket médio ${brl(ps.length ? fat / ps.length : 0)}</small></div>
    <div class="stat"><span>Tempo de produção</span><b>${dias == null ? "—" : dias.toFixed(1).replace(".", ",") + " dias"}</b><small>do pedido até ficar pronto</small></div>
    <div class="stat"><span>Atrasos</span><b>${comPrazo.length ? Math.round(atrasados / comPrazo.length * 100) + "%" : "—"}</b><small>${atrasados} de ${comPrazo.length} com prazo vencido</small></div>
   </div>
   <div class="paineis">
    <div class="painel"><h3>Estampas mais pedidas</h3>${estampas.length ? `<div class="top-est">${estampas.map(([c, n], i) => { const it = acharCat(c); return `<figure>${it ? `<img src="${imgDrive(it.arquivo_id, 200)}" alt="" loading="lazy">` : ""}<span>${i + 1}º ${esc(c)}</span><small>${n} un.</small></figure>`; }).join("")}</div>` : `<p class="sub">Sem pedidos com estampa neste mês.</p>`}</div>
    <div class="painel"><h3>Lojas (faturamento)</h3>${lojas.map(([n, v]) => `<div class="barra"><span>${esc(n)}</span><i style="width:${v / maxL * 100}%"></i><em>${brl(v)}</em></div>`).join("")}</div>
    <div class="painel"><h3>Modelos de celular mais pedidos</h3>${modelos.length ? modelos.map(([n, v]) => `<div class="barra"><span>${esc(n)}</span><i style="width:${v / maxM * 100}%"></i><em>${v}</em></div>`).join("") : `<p class="sub">Sem pedidos neste mês.</p>`}</div>
    <div class="painel"><h3>Tipos de personalização</h3>${tipos.map(([n, v]) => `<div class="barra"><span>${n}</span><i style="width:${v / maxT * 100}%"></i><em>${v}</em></div>`).join("")}</div>
   </div>`;
}
const nomeMes = m => new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const mesesDisponiveis = () => [...new Set(S.pedidos.map(p => p.data_pedido.slice(0, 7)).concat(hoje().slice(0, 7)))].sort().reverse();

/* ---- Fechamento do mês (substitui a planilha) ---- */
function abaFechamento() {
  const ps = S.pedidos.filter(p => p.data_pedido.startsWith(mesSel) && p.status !== "cancelado");
  const R = S.lojas.map(l => { const x = ps.filter(p => p.loja_id === l.id), by = k => x.filter(p => p.produto !== "popsocket" && p.pers === k).reduce((a, p) => a + p.qtd, 0); return { l: l.nome, foto: by("foto"), nome: by("nome"), cat: by("catalogo"), pop: x.filter(p => p.produto === "popsocket").reduce((a, p) => a + p.qtd, 0), un: x.reduce((a, p) => a + p.qtd, 0), rs: x.reduce((a, p) => a + Number(p.valor_total), 0) }; });
  const t = k => R.reduce((a, r) => a + r[k], 0);
  return `<div class="bar"><select id="mes" aria-label="Mês">${mesesDisponiveis().map(m => `<option value="${m}" ${m === mesSel ? "selected" : ""}>${nomeMes(m)}</option>`).join("")}</select><span class="sub">Conta pela data do pedido. Cancelados ficam de fora.</span><button class="soft mini" id="imprimir" style="margin-left:auto">Imprimir</button></div>
  <div class="so-imprimir"><h2>Fechamento · ${nomeMes(mesSel)}</h2></div>
  <div class="tblwrap"><table><thead><tr><th>Loja</th><th>Foto</th><th>Nome</th><th>Catálogo</th><th>PopSocket</th><th>Unidades</th><th>Total</th></tr></thead>
  <tbody>${R.map(r => `<tr><td>${esc(r.l)}</td><td>${r.foto}</td><td>${r.nome}</td><td>${r.cat}</td><td>${r.pop}</td><td>${r.un}</td><td>${brl(r.rs)}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td>Total</td><td>${t("foto")}</td><td>${t("nome")}</td><td>${t("cat")}</td><td>${t("pop")}</td><td>${t("un")}</td><td>${brl(t("rs"))}</td></tr></tfoot></table></div>`;
}

function ligarFabrica() {
  $$("[data-st]").forEach(b => b.onclick = () => { filtroFab.status = b.dataset.st; desenhar(); });
  if ($("floja")) $("floja").onchange = e => { filtroFab.loja = e.target.value; desenhar(); };
  const fb = $("fbusca"); if (fb) fb.oninput = () => { filtroFab.busca = fb.value; const pos = fb.selectionStart; desenhar(); const n = $("fbusca"); n.focus(); n.setSelectionRange(pos, pos); };
  if ($("mes")) $("mes").onchange = e => { mesSel = e.target.value; desenhar(); };
  if ($("imprimir")) $("imprimir").onclick = () => window.print();
  $$("[data-av]").forEach(b => b.onclick = ev => { ev.preventDefault(); const p = S.pedidos.find(x => x.id === +b.dataset.av); const prox = FLUXO[FLUXO.indexOf(p.status) + 1]; acao(() => api.mudarStatus([p.id], prox), `${nro(p.id)}: ${ST[prox][0]}`); });
  $$("[data-set]").forEach(s => s.onchange = () => { if (s.value) acao(() => api.mudarStatus([+s.dataset.set], s.value), `${nro(s.dataset.set)}: ${ST[s.value][0]}`); });
  $$("[data-visto]").forEach(b => b.onclick = () => acao(() => api.vistoFabrica(+b.dataset.visto)));
  $$("[data-ir]").forEach(b => b.onclick = () => { abaFab = b.dataset.ir; desenhar(); });
  if ($("iniciarSel")) $("iniciarSel").onclick = () => { const ids = $$("[data-sel]:checked").map(x => +x.dataset.sel); if (!ids.length) return toast("Marque pelo menos um pedido."); acao(() => api.mudarStatus(ids, "producao"), `${ids.length} pedido${ids.length > 1 ? "s" : ""} em produção`); };
  $$("[data-gerar]").forEach(b => b.onclick = () => {
    const loja = b.dataset.gerar, ids = $$(`[data-rom="${loja}"]:checked`).map(x => +x.value);
    if (!ids.length) return toast("Marque pelo menos um pedido.");
    acao(async () => { const r = await api.criarRomaneio(loja, ids); setTimeout(() => verRomaneio(r.id), 50); }, `Romaneio gerado: ${ids.length} pedido${ids.length > 1 ? "s" : ""} a caminho`);
  });
  $$("[data-verrom]").forEach(b => b.onclick = () => verRomaneio(+b.dataset.verrom));
}
