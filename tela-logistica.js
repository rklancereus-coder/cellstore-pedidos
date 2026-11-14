/* ---------- LOGÍSTICA: só o que interessa para comprar (sem cliente e sem preço) ---------- */
let abaLog = "pedidos", filtroLog = "pendente";
const PROXC = { pendente: ["comprado", "Marcar como comprada"], comprado: ["entregue", "Entregue na fábrica"] };
const matLisa = c => c.produto === "aveludada" ? "Aveludada" : "Transparente";

function telaLogistica() {
  const C = S.compras, ativa = c => c.status_pedido !== "cancelado";
  const n = s => C.filter(c => c.status === s && ativa(c)).length;
  const novos = C.filter(c => !c.visto && ativa(c)).length;
  let html = `<div class="tabs" style="margin-top:0"><button data-lg="pedidos" class="${abaLog === "pedidos" ? "on" : ""}">Pedidos de compra${novos ? ` · ${novos} novo${novos > 1 ? "s" : ""}` : ""}</button><button data-lg="lista" class="${abaLog === "lista" ? "on" : ""}">Lista de compra</button></div>`;
  if (abaLog === "pedidos") {
    let L = filtroLog === "todos" ? C : C.filter(c => c.status === filtroLog);
    L = L.slice().sort((a, b) => (a.visto - b.visto) || (b.urgente - a.urgente) || a.precisa_ate.localeCompare(b.precisa_ate) || a.pedido_id - b.pedido_id);
    html += `<div class="kpis">${[["pendente", "Aguardando compra", n("pendente")], ["comprado", "Compradas", n("comprado")], ["entregue", "Na fábrica", n("entregue")], ["todos", "Todas", C.length]].map(([k, t, v]) => `<button class="kpi ${filtroLog === k ? "sel" : ""}" data-fl="${k}"><b>${v}</b><span>${t}</span></button>`).join("")}</div>
    <div class="list" style="margin-top:14px">${L.length ? L.slice(0, 300).map(cardLog).join("") : `<div class="empty">Nada aqui. Quando uma loja escolher <b>Encomendar com a logística</b> num pedido, ele aparece nesta tela.</div>`}</div>`;
  } else {
    const G = {};
    C.filter(c => c.status === "pendente" && ativa(c)).forEach(c => {
      const cor = c.produto === "aveludada" ? c.cor : "Transparente";
      const k = [semAcento(c.celular), matLisa(c), semAcento(cor)].join("|");
      const g = G[k] || (G[k] = { cel: c.celular, mat: matLisa(c), cor, qtd: 0, ate: c.precisa_ate, lojas: new Set(), ids: [] });
      g.qtd += c.qtd; g.ids.push(c.pedido_id); g.lojas.add(c.loja); if (c.precisa_ate < g.ate) g.ate = c.precisa_ate;
    });
    const R = Object.values(G).sort((a, b) => a.ate.localeCompare(b.ate));
    html += `<p class="lead" style="margin:0 0 12px">Tudo que falta comprar, somado por modelo e cor. Quando comprar, toque em <b>Comprei</b> e todos os pedidos daquela linha mudam juntos.</p>
    ${R.length ? `<div class="tblwrap"><table><thead><tr><th>Modelo</th><th class="l">Capinha</th><th class="l">Cor</th><th>Qtd</th><th>Até</th><th class="l">Lojas</th><th></th></tr></thead><tbody>${R.map(g => `<tr><td><b>${esc(g.cel)}</b></td><td class="l">${g.mat}</td><td class="l">${esc(g.cor)}</td><td><b>${g.qtd}</b></td><td${g.ate < hoje() ? ' style="color:var(--urg);font-weight:700"' : ""}>${fmtD(g.ate)}</td><td class="l">${[...g.lojas].map(esc).join(", ")}</td><td><button class="edit" data-buy="${g.ids.join(",")}">${ICON.ok} Comprei</button></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3">Total para comprar</td><td>${R.reduce((a, g) => a + g.qtd, 0)}</td><td colspan="3"></td></tr></tfoot></table></div>` : `<div class="empty">Nenhuma capinha esperando compra.</div>`}`;
  }
  $("app").innerHTML = html;
  $$("[data-lg]").forEach(b => b.onclick = () => { abaLog = b.dataset.lg; desenhar(); });
  $$("[data-fl]").forEach(b => b.onclick = () => { filtroLog = b.dataset.fl; desenhar(); });
  $$("[data-cav]").forEach(b => b.onclick = () => acao(() => api.mudarCompra([+b.dataset.cav], b.dataset.to), `${nro(b.dataset.cav)}: ${CST[b.dataset.to][0]}`));
  $$("[data-cset]").forEach(s => s.onchange = () => { if (s.value) acao(() => api.mudarCompra([+s.dataset.cset], s.value), `${nro(s.dataset.cset)}: ${CST[s.value][0]}`); });
  $$("[data-cok]").forEach(b => b.onclick = () => acao(() => api.vistoCompra(+b.dataset.cok)));
  $$("[data-buy]").forEach(b => b.onclick = () => { const ids = b.dataset.buy.split(",").map(Number); acao(() => api.mudarCompra(ids, "comprado"), `${ids.length} pedido${ids.length > 1 ? "s" : ""}: comprada`); });
}
function cardLog(c) {
  const [nome, cor] = CST[c.status], canc = c.status_pedido === "cancelado";
  const atraso = c.status !== "entregue" && !canc && c.precisa_ate < hoje(), prox = !canc && PROXC[c.status];
  return `<article class="card ${c.urgente && !canc ? "urg" : ""}">
   <div class="hd"><b>${esc(c.loja)}</b><span class="num">${nro(c.pedido_id)}</span>${!c.visto && !canc ? `<span class="tag new">Novo</span>` : ""}${c.urgente && !canc ? `<span class="tag urg">Urgente</span>` : ""}${atraso ? `<span class="tag urg">Atrasado</span>` : ""}${canc ? `<span class="tag urg">Pedido cancelado, não comprar</span>` : ""}${c.exemplo ? `<span class="tag">exemplo</span>` : ""}</div>
   <div class="what" style="font-size:20px">${c.qtd}× ${esc(c.celular)}</div>
   <div class="sub">Capinha <b>${matLisa(c)}</b> · Cor <b>${esc(c.produto === "aveludada" ? c.cor : "Transparente")}</b></div>
   <div class="sub">Chegar na fábrica até <b${atraso ? ' style="color:var(--urg)"' : ""}>${fmtD(c.precisa_ate)}</b> · Pedido em <b>${fmtD(c.pedido_em)}</b></div>
   <div class="acts"><span class="stline" style="--c:var(${cor});margin-right:auto">${nome}</span>
    ${prox ? `<button class="primary" data-cav="${c.pedido_id}" data-to="${prox[0]}">${prox[1]} →</button>` : ""}
    ${!c.visto && !canc ? `<button class="soft mini" data-cok="${c.pedido_id}">Marcar como visto</button>` : ""}
    <select data-cset="${c.pedido_id}" aria-label="Mudar situação">${["", "pendente", "comprado", "entregue"].map(s => `<option value="${s}">${s ? CST[s][0] : "Outra situação…"}</option>`).join("")}</select>
   </div></article>`;
}
