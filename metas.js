/* ---------- PAINEL DE METAS E FECHAMENTOS ----------
   Gerente (papel loja): painel da própria loja + "Lançar o dia" (fechar_dia; depois de fechado só a dona reabre).
   Dona (papel dona) e administrador: visão das lojas, metas/vendedores/calendário, reabrir e corrigir dias.
   Contas: falta = meta − realizado · meta diária = falta ÷ dias de venda restantes ·
   projeção = realizado ÷ dias fechados × dias de venda do mês · ritmo ideal = dias fechados ÷ dias de venda.
   Cor: verde no ideal ou acima · amarelo até X pontos abaixo · vermelho mais que isso (X ajustável). */
const MT = { mes: hoje().slice(0, 7) + "-01", dados: null, carregando: null, aba: "painel", lojaAberta: null, rasc: {} };
// as contas e regras dos avisos ficam em metas-regras.js (o mesmo arquivo roda no servidor): aqui são atalhos
const mtR = n => MR.R(n), mtP = x => MR.P(x), mtDow = d => MR.dow(d), mtData = d => MR.data(d), mtNomeMes = m => MR.nomeMes(m), mtMesMais = (m, k) => MR.mesMais(m, k);
const mtNum = s => { const t = String(s ?? "").replace(/[^\d,.]/g, ""); const x = parseFloat(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/\.(?=\d{3}(\D|$))/g, "")); return isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : 0; };
const mtFmtCampo = n => n ? Number(n).toLocaleString("pt-BR") : "";
const mtEhRede = () => ["dona", "admin"].includes(papel());
const mtCtx = () => ({ hoje: hoje(), papel: papel(), lojaId: S.perfil && S.perfil.loja_id, lojas: S.lojas });

/* ---------- dados ---------- */
async function mtCarregar() {
  const mes = MT.mes;
  const p = api.metasMes(mes); MT.carregando = p;
  try { const d = await p; if (mes === MT.mes) MT.dados = MR.montar(mes, d, mtCtx()); }
  finally { if (MT.carregando === p) MT.carregando = null; }
}
async function mtRecarregarSeAberto() { if (MT.dados && window.MR) { try { await mtCarregar(); } catch (e) { console.warn("metas", e); } } }
const mtLojaPor = id => MT.dados.lojas.find(l => l.id === id);
const mtContaVend = (v, l) => MR.contaVend(MT.dados, v, l), mtContaLoja = l => MR.contaLoja(MT.dados, l), mtContaRede = () => MR.contaRede(MT.dados), mtTotDia = (l, dia) => MR.totDia(l, dia);
const mtAvisos = () => MR.visiveis(MR.avisos(MT.dados, mtCtx()), MT.dados.vistos, MT.dados.cfg);
const mtAvisosDoPapel = () => { const L = mtAvisos(); return papel() === "loja" ? L.filter(x => x.alvo && x.alvo.loja === S.perfil.loja_id) : L; };

/* ---------- peças de tela ---------- */
const MT_COR = { g: "No ritmo", a: "Atenção", r: "Abaixo" };
const mtChip = c => c ? `<span class="cor ${c}">${MT_COR[c]}</span>` : `<span class="cor p">Sem meta</span>`;
const mtBar = (c, cls = "") => `<div class="mbar ${c.cor} ${cls}" role="img" aria-label="${mtP(c.pct)} da meta; ritmo ideal ${mtP(c.ideal)}"><i style="width:${Math.min(100, c.pct * 100)}%"></i>${c.meta ? `<b style="left:${Math.min(100, c.ideal * 100)}%"></b>` : ""}</div>`;
const mtCorProj = p => p >= 1 ? "g" : p >= .9 ? "a" : "r";

function mtCardVend(v, l) {
  const cv = mtContaVend(v, l), t = cv.tot;
  if (!v.meta) return `<div class="vend"><div class="cab"><h3>${esc(v.nome)}</h3><span class="cor p">Sem meta</span></div>
    <div class="pe"><span>Vendeu <b>${mtR(t.real)}</b></span><span>Assist. ${mtR(cv.a.real)} · Vendas ${mtR(cv.v.real)}</span></div></div>`;
  const cat = (nome, c) => `<div class="cat"><div class="l"><span style="color:var(--fg)">${nome}</span><span class="txt-${c.cor}">${mtP(c.pct)}</span></div>${mtBar(c, "fina")}</div>`;
  return `<div class="vend ${t.cor}" id="mtv-${v.id}"><div class="cab"><h3>${esc(v.nome)}</h3>${mtChip(t.cor)}<span class="pct txt-${t.cor}">${mtP(t.pct)}</span></div>
    ${mtBar(t)}<div class="mini2">${cat("Assistência", cv.a)}${cat("Vendas", cv.v)}</div>
    <div class="pe"><span>Vendeu <b>${mtR(t.real)}</b> de ${mtR(t.meta)}</span><span>Precisa <b>${mtR(t.diaria)}/dia</b></span><span>Projeção <b class="txt-${mtCorProj(t.projPct)}">${mtP(t.projPct)}</b></span></div></div>`;
}
function mtDiasLoja(l) {
  const rede = mtEhRede(), hj = MT.dados.hj;
  const cel = l.diasV.map(dia => {
    const f = l.fech.get(dia), corr = f && (f.reaberto_em || l.corr.some(c => c.fechamento_id === f.id));
    let cls = "", tit = mtData(dia);
    if (f && f.status === "fechado") { cls = corr ? "re" : "f"; tit += corr ? " · corrigido" : " · fechado"; }
    else if (dia < hj) { cls = "p"; tit += f ? " · reaberto, falta lançar de novo" : " · fechamento pendente"; }
    else if (dia === hj) { cls = "h"; tit += " · hoje"; }
    const n = +dia.slice(8);
    if (rede && dia <= hj) return `<button class="${cls}" data-mt="dia" data-dia="${dia}" title="${tit} · toque para ver ou corrigir" style="${cls === "f" ? "background:var(--g-soft);color:var(--g)" : cls === "re" ? "background:var(--a-soft);color:var(--a)" : cls === "p" ? "background:var(--r-soft);color:var(--r)" : "background:var(--accent-soft);color:var(--accent)"}">${n}</button>`;
    return `<div class="${cls}" title="${tit}">${n}</div>`;
  }).join("");
  return `<div class="dias">${cel || `<span class="hint">Nenhum dia de venda neste mês.</span>`}</div>
  <div class="leg-dias"><span style="--c:var(--g-soft)">Fechado</span><span style="--c:var(--a-soft)">Corrigido</span><span style="--c:var(--r-soft)">Pendente</span><span style="--c:var(--accent-soft)">Hoje</span><span style="--c:var(--sunk)">A vir</span></div>
  <p class="hint" style="margin:0">${rede ? "Toque num dia para lançar, corrigir ou reabrir para o gerente." : "Dia fechado não muda mais. Se precisar corrigir, peça à dona para reabrir."}</p>`;
}
function mtListaAvisos(L, max) {
  if (!L.length) return `<p class="vazio">Nenhum aviso agora.</p>`;
  return `<div class="avisos">${(max ? L.slice(0, max) : L).map((x, i) => `<div class="av ${x.nivel}"><span class="ic"></span><div><b>${esc(x.titulo)}</b><p>${esc(x.texto)}</p></div>
    <div class="acoes">${x.alvo && (x.alvo.loja || x.alvo.aba) && !(papel() === "loja" && x.alvo.aba) ? `<button class="mini soft" data-mt="ir" data-i="${i}">Ver</button>` : ""}<button class="mini link" data-mt="visto" data-i="${i}">Visto</button></div></div>`).join("")}</div>
    ${max && L.length > max ? `<button class="link" data-mt="aba" data-aba="avisos">Ver todos os ${L.length} avisos</button>` : ""}`;
}
function mtPainelLoja(l) {
  const c = mtContaLoja(l), t = c.tot, rede = mtEhRede();
  const cat = (nome, x) => `<div class="cat"><div class="l"><span style="color:var(--fg)">${nome} <span>${mtR(x.real)} de ${mtR(x.meta)}</span></span><span class="txt-${x.cor}" style="font-weight:800">${mtP(x.pct)}</span></div>${mtBar(x)}</div>`;
  const avL = mtAvisos().filter(x => x.alvo && x.alvo.loja === l.id);
  MT.listaAtual = avL;
  const semMeta = !l.meta;
  return `${rede ? `<button class="link voltar" data-mt="voltar">‹ Todas as lojas</button>` : ""}
  <div class="mhero">
    <div class="topo"><span>${esc(l.nome)} · ${mtNomeMes(MT.mes)} · ${l.n} de ${l.N} dias fechados</span>${l.pend.length ? `<span class="cor r">Fechamento pendente${l.pend.length > 1 ? ` (${l.pend.length} dias)` : ""}</span>` : mtChip(t.cor)}</div>
    <div class="valor"><b>${mtR(t.real)}</b><span>${semMeta ? "sem meta cadastrada" : `de ${mtR(t.meta)}`}</span>${semMeta ? "" : `<em class="txt-${t.cor}">${mtP(t.pct)}</em>`}</div>
    ${semMeta ? "" : `${mtBar(t)}<div class="legenda"><span>Marca na barra = ritmo ideal de hoje: ${mtP(t.ideal)}</span><span>Falta ${mtR(t.falta)}</span></div>
    <div class="nums">
      <div><small>Meta diária</small><b>${mtR(t.diaria)}</b><span>por dia nos ${t.rest} dias que faltam</span></div>
      <div><small>Projeção</small><b class="txt-${mtCorProj(t.projPct)}">${t.n ? mtR(t.proj) : "—"}</b><span>${t.n ? `${mtP(t.projPct)} da meta no ritmo atual` : "aparece no 1º dia fechado"}</span></div>
      <div><small>Dias de venda</small><b>${l.n} de ${l.N}</b><span>fechados</span></div>
    </div>`}
  </div>
  ${avL.length ? `<section class="sec"><h2>Avisos da loja <small>${avL.length}</small></h2>${mtListaAvisos(avL, 3)}</section>` : ""}
  ${semMeta ? "" : `<section class="sec"><h2>Por categoria</h2><div class="painel cats">${cat("Assistência", c.a)}${cat("Vendas", c.v)}</div></section>`}
  <section class="sec"><h2>Vendedores</h2>${l.vend.length ? `<div class="vends">${l.vend.map(v => mtCardVend(v, l)).join("")}</div>` : `<p class="vazio">${rede ? "Nenhum vendedor cadastrado. Cadastre em Metas e vendedores." : "A dona ainda não cadastrou os vendedores desta loja."}</p>`}</section>
  <section class="sec"><h2>Fechamentos do mês</h2><div class="painel">${mtDiasLoja(l)}</div></section>`;
}

/* ---------- gerente: lançar o dia ---------- */
function mtDiaParaLancar(l) {
  const D = MT.dados;
  if (l.pend.length) return l.pend[0];
  if (l.hojeVenda && (l.fech.get(D.hj) || {}).status !== "fechado") return D.hj;
  return null;
}
function mtLancar(l) {
  const D = MT.dados;
  if (MT.mes !== D.hj.slice(0, 7) + "-01" && !l.pend.length) return `<p class="vazio">Para lançar, volte para o mês atual.</p>`;
  if (!l.vend.some(v => v.ativo)) return `<p class="vazio">A dona ainda não cadastrou os vendedores desta loja. Sem eles não dá para lançar o fechamento.</p>`;
  const dia = mtDiaParaLancar(l), ultimo = l.fechados[l.n - 1];
  const fim = ultimo ? `<div class="fechado"><span>Último dia fechado: <b>${mtData(ultimo)}</b> · ${mtR(mtTotDia(l, ultimo))}</span><span class="hint">Fechado não muda mais (só a dona reabre).</span></div>` : "";
  if (!dia) return `<div class="lanc"><div><h1>Tudo em dia</h1><p class="lead">${l.hojeVenda ? "O fechamento de hoje já foi entregue." : "Hoje não é dia de venda no calendário."}</p></div>${fim}</div>`;
  const atrasado = dia < D.hj, f = l.fech.get(dia);
  const r = ((MT.rasc[l.id] ||= {})[dia] ||= Object.fromEntries(l.vend.filter(v => v.ativo || v.val.has(dia)).map(v => { const x = v.val.get(dia); return [v.id, x ? { a: mtFmtCampo(x.a), v: mtFmtCampo(x.v) } : {}]; })));
  const vs = l.vend.filter(v => r[v.id]);
  const tot = vs.reduce((s, v) => s + mtNum(r[v.id].a) + mtNum(r[v.id].v), 0);
  return `<div class="lanc">
    <div><h1>${atrasado ? "Fechamento pendente" : "Fechamento de hoje"}</h1><p class="lead">${mtData(dia)} · ${esc(l.nome)}${atrasado ? ` · <b class="txt-r">atrasado</b>` : ""}</p></div>
    ${f && f.status === "aberto" ? `<div class="aviso"><b>A dona reabriu este dia.</b> Confira os valores e feche de novo.</div>` : atrasado ? `<div class="aviso"><b>Esse dia ainda não foi fechado.</b> Lance os valores dele primeiro; depois aparece o próximo${l.pend.length > 1 ? ` (faltam ${l.pend.length} dias)` : ""}.</div>` : ""}
    ${vs.map(v => `<div class="lv"><h3>${esc(v.nome)} <span id="mtsub-${v.id}">${mtR(mtNum(r[v.id].a) + mtNum(r[v.id].v))}</span></h3>
      <div class="row"><label class="f"><span>Assistência</span><div class="din"><input id="mta-${v.id}" inputmode="decimal" placeholder="0" data-mtv="${v.id}" data-k="a" data-dia="${dia}" value="${esc(r[v.id].a || "")}"></div></label>
      <label class="f"><span>Vendas</span><div class="din"><input id="mtb-${v.id}" inputmode="decimal" placeholder="0" data-mtv="${v.id}" data-k="v" data-dia="${dia}" value="${esc(r[v.id].v || "")}"></div></label></div></div>`).join("")}
    <div class="tot-dia"><span>Total do dia</span><span id="mttot">${mtR(tot)}</span></div>
    <button class="btn primary" data-mt="fechar" data-dia="${dia}">Fechar o dia</button>
    ${fim}</div>`;
}
function mtConfirmarFechar(l, dia, r, depois) {
  const vals = l.vend.filter(v => r[v.id]).map(v => ({ v, a: mtNum(r[v.id].a), vv: mtNum(r[v.id].v) }));
  const tot = vals.reduce((s, x) => s + x.a + x.vv, 0), estranhos = [], m = MT.dados.cfg.fora_media_mult;
  vals.forEach(({ v, a, vv }) => [["a", a, "Assistência"], ["v", vv, "Vendas"]].forEach(([k, val, nome]) => {
    const outros = l.fechados.filter(x => x !== dia).map(x => (v.val.get(x) || { a: 0, v: 0 })[k]), med = outros.length ? outros.reduce((s, y) => s + y, 0) / outros.length : 0;
    if (outros.length >= 3 && med && val > m * med) estranhos.push(`${esc(v.nome)}: ${mtR(val)} em ${nome} é ${Math.round(val / med)}× a média (${mtR(med)}).`);
  }));
  const rede = mtEhRede();
  modal(`<h2>Fechar ${mtData(dia)}?</h2>
    <div class="painel" style="gap:6px">${vals.map(x => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:15px"><span>${esc(x.v.nome)}</span><b>${mtR(x.a)} + ${mtR(x.vv)}</b></div>`).join("")}
    <div style="display:flex;justify-content:space-between;font-weight:800;border-top:1px solid var(--line);padding-top:6px"><span>Total</span><span>${mtR(tot)}</span></div></div>
    ${!tot ? `<div class="aviso"><b>Tudo zerado.</b> A loja não vendeu nada neste dia?</div>` : ""}
    ${estranhos.length ? `<div class="aviso"><b>Confira esses valores:</b><br>${estranhos.join("<br>")}</div>` : ""}
    <p class="hint" style="margin:0">${rede ? "As mudanças num dia já fechado ficam registradas." : "Depois de fechado, só a dona pode reabrir."}</p>
    <div class="nav" style="margin-top:4px"><button class="btn soft" id="mtno">Voltar e corrigir</button><button class="btn primary" id="mtok">${!tot ? "Fechar com zero" : "Fechar o dia"}</button></div>`, () => {
    $("mtno").onclick = fecharModal;
    $("mtok").onclick = async () => {
      $("mtok").disabled = true;
      try {
        await api.fecharDia(l.id, dia, vals.map(x => ({ vendedor_id: x.v.id, assistencia: x.a, vendas: x.vv })));
        if (MT.rasc[l.id]) delete MT.rasc[l.id][dia];
        fecharModal(); toast(`${mtData(dia)} fechado`); await mtCarregar(); if (depois) depois(); desenhar();
      } catch (e) { $("mtok").disabled = false; erroTela(e); }
    };
  });
}
/* dona: ver/lançar/corrigir um dia de qualquer loja */
function mtDiaRede(l, dia) {
  const f = l.fech.get(dia), fechado = f && f.status === "fechado";
  const vs = l.vend.filter(v => v.ativo || v.val.has(dia));
  if (!vs.length) return toast("Cadastre os vendedores desta loja primeiro (Metas e vendedores).", 4000);
  const r = {}; vs.forEach(v => { const x = v.val.get(dia); r[v.id] = x ? { a: mtFmtCampo(x.a), v: mtFmtCampo(x.v) } : {}; });
  modal(`<h2>${esc(l.nome)} · ${mtData(dia)}</h2>
    <p class="hint" style="margin:0">${fechado ? "Dia fechado. Ao salvar uma mudança, ela fica registrada e o gerente vê o aviso de correção." : f ? "Dia reaberto: o gerente pode lançar de novo, ou você lança aqui." : "Dia ainda não lançado pela loja."}</p>
    ${vs.map(v => `<div class="row"><label class="f"><span>${esc(v.nome)} · Assist.</span><div class="din"><input inputmode="decimal" id="mtra-${v.id}" value="${esc(r[v.id].a || "")}" placeholder="0"></div></label>
    <label class="f"><span>Vendas</span><div class="din"><input inputmode="decimal" id="mtrv-${v.id}" value="${esc(r[v.id].v || "")}" placeholder="0"></div></label></div>`).join("")}
    <button class="btn primary" id="mtsalvar">${fechado ? "Salvar correção" : "Lançar e fechar o dia"}</button>
    ${fechado ? `<button class="btn soft" id="mtreabrir">Reabrir para o gerente lançar de novo</button>` : ""}
    <button class="btn soft" id="mtcanc">Cancelar</button>`, () => {
    $("mtcanc").onclick = fecharModal;
    $("mtsalvar").onclick = async () => {
      const vals = vs.map(v => ({ vendedor_id: v.id, assistencia: mtNum($("mtra-" + v.id).value), vendas: mtNum($("mtrv-" + v.id).value) }));
      $("mtsalvar").disabled = true;
      try { await api.fecharDia(l.id, dia, vals); fecharModal(); toast(fechado ? "Correção salva" : "Dia lançado e fechado"); await mtCarregar(); desenhar(); }
      catch (e) { $("mtsalvar").disabled = false; erroTela(e); }
    };
    if ($("mtreabrir")) $("mtreabrir").onclick = async () => {
      try { await api.reabrirDia(l.id, dia); fecharModal(); toast("Dia reaberto: o gerente já pode lançar de novo"); await mtCarregar(); desenhar(); } catch (e) { erroTela(e); }
    };
  });
}

/* ---------- dona: visão das lojas ---------- */
function mtGrafico() {
  const D = MT.dados, N = D.diasG.length, r = mtContaRede().tot, W = 600, H = 250, ml = 52, mr = 12, mt = 12, mb = 28;
  if (!N || !r.meta) return `<p class="hint">Cadastre as metas para ver o gráfico.</p>`;
  const meta = r.meta, ymax = Math.max(meta, r.proj, r.real) * 1.05;
  const x = i => ml + (W - ml - mr) * i / N, y = v => mt + (H - mt - mb) * (1 - v / ymax);
  const comMeta = D.lojas.filter(l => l.meta);
  const ate = D.diasG.filter(d => d < D.hj || (d === D.hj && comMeta.some(l => (l.fech.get(d) || {}).status === "fechado"))).length;
  const acum = [0]; for (let i = 1; i <= ate; i++) { const d = D.diasG[i - 1], ant = D.diasG[i - 2] || "0000"; acum.push(acum[i - 1] + comMeta.reduce((s, l) => s + l.vend.reduce((t, v) => { let z = 0; v.val.forEach((val, dia) => { if (dia <= d && dia > ant) z += val.a + val.v; }); return t + z; }, 0), 0)); }
  const pts = acum.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, .25, .5, .75, 1].map(f => `<line class="eixo" x1="${ml}" x2="${W - mr}" y1="${y(meta * f)}" y2="${y(meta * f)}"/><text x="${ml - 6}" y="${y(meta * f) + 4}" text-anchor="end">${Math.round(meta * f / 1000)}k</text>`).join("");
  const xl = [1, ate, N].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(i => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${+D.diasG[i - 1].slice(8)}/${D.diasG[i - 1].slice(5, 7)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Realizado acumulado da rede ${mtR(acum[ate])} contra o ritmo ideal; projeção ${mtR(r.proj)}">
    ${ticks}${xl}<polygon class="area" points="${x(0)},${y(0)} ${pts} ${x(ate)},${y(0)}"/>
    <line class="ideal" x1="${x(0)}" y1="${y(0)}" x2="${x(N)}" y2="${y(meta)}"/>
    ${ate ? `<line class="proj" x1="${x(ate)}" y1="${y(acum[ate])}" x2="${x(N)}" y2="${y(r.proj)}"/><circle cx="${x(ate)}" cy="${y(acum[ate])}" r="5" fill="var(--accent)"/>` : ""}
    <polyline class="real" points="${pts}"/></svg>
  <div class="leg-dias"><span style="--c:var(--accent)">Realizado</span><span style="--c:var(--muted)">Ritmo ideal (tracejado)</span><span style="--c:var(--accent-soft)">Projeção (pontilhado)</span></div>`;
}
function mtRede() {
  const D = MT.dados, r = mtContaRede(), t = r.tot;
  if (!D.lojas.some(l => l.meta)) return `<p class="vazio" style="margin-top:16px">Nenhuma meta cadastrada em ${mtNomeMes(MT.mes)}. Comece por <button class="link" data-mt="aba" data-aba="metas" style="padding:0;color:var(--accent)">Metas e vendedores</button>.</p>`;
  const pend = D.lojas.filter(l => l.pend.length);
  const rank = D.lojas.flatMap(l => l.vend.filter(v => v.meta && v.ativo).map(v => ({ l, v, c: mtContaVend(v, l).tot }))).sort((a, b) => b.c.pct - a.c.pct);
  MT.rank = rank;
  return `<section class="sec" style="margin-top:12px"><div class="kpis2">
    <div><small>Realizado</small><b>${mtR(t.real)}</b><span>de ${mtR(t.meta)}</span></div>
    <div><small>% da meta</small><b class="txt-${t.cor}">${mtP(t.pct)}</b><span>${mtChip(t.cor)}</span></div>
    <div><small>Falta</small><b>${mtR(t.falta)}</b><span>em ${t.rest} dias de venda</span></div>
    <div><small>Meta diária</small><b>${mtR(t.diaria)}</b><span>para a rede toda</span></div>
    <div><small>Projeção</small><b class="txt-${mtCorProj(t.projPct)}">${mtP(t.projPct)}</b><span>${mtR(t.proj)}</span></div>
  </div>
  <div class="painel" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${[["Assistência", r.a], ["Vendas", r.v]].map(([nome, x]) => `<div class="cat"><div class="l"><span style="color:var(--fg)">${nome} <span>${mtR(x.real)} de ${mtR(x.meta)}</span></span><span class="txt-${x.cor}" style="font-weight:800">${mtP(x.pct)}</span></div>${mtBar(x)}</div>`).join("")}</div>
  ${pend.length ? `<div class="aviso"><b>Fechamento pendente:</b> ${pend.map(l => `${esc(l.nome)} (${l.pend.length} ${l.pend.length > 1 ? "dias" : "dia"})`).join(", ")}. Os números dessas lojas vão só até o último dia fechado. Pendente não quer dizer que não vendeu.</div>` : ""}
  </section>
  <section class="sec"><h2>Lojas <small>toque para ver o painel da loja</small></h2><div class="lojas">${D.lojas.map(l => {
    const c = mtContaLoja(l).tot;
    return `<button class="mloja ${l.pend.length ? "pend" : c.cor}" data-mt="loja" data-loja="${l.id}"><div class="cab"><h3>${esc(l.nome)}</h3>${l.pend.length ? `<span class="cor p">Pendente</span>` : mtChip(c.cor)}</div>
      ${l.meta ? `<span class="pct txt-${c.cor}">${mtP(c.pct)}</span>${mtBar(c, "fina")}<small>${mtR(c.real)} de ${mtR(c.meta)}</small><small>${mtR(c.diaria)}/dia · projeção ${c.n ? mtP(c.projPct) : "—"}</small>` : `<small>${mtR(c.real)} · sem meta</small>`}</button>`;
  }).join("")}</div></section>
  <section class="sec dois">
    <div class="painel graf"><h3>Realizado × ideal (rede)</h3>${mtGrafico()}</div>
    <div class="painel"><h3>Ranking de vendedores</h3>${rank.length ? `<ol class="rank">${rank.map((x, i) => `<li data-mt="rank" data-i="${i}"><span>${esc(x.v.nome)} <small>${esc(x.l.nome)}</small></span><b class="txt-${x.c.cor}">${mtP(x.c.pct)}</b><span class="cor ${x.c.cor}" style="padding:4px"></span></li>`).join("")}</ol>` : `<p class="hint">Sem vendedores com meta.</p>`}</div>
  </section>
  <section class="sec"><button class="btn soft" data-mt="relatorio">📄 Relatório de ${mtNomeMes(MT.mes).toLowerCase()} (tabela e planilha)</button></section>`;
}
// relatório do mês: tabela por loja e vendedor, para imprimir ou baixar como planilha (Excel abre o CSV)
function mtRelatorio() {
  const rel = MR.relatorio(MT.dados), r = rel.rede, pct = x => x.meta ? mtP(x.pct) : "—";
  const lin = x => `<tr style="${x.tipo === "loja" ? "font-weight:800;border-top:2px solid var(--line)" : ""}"><td style="${x.tipo === "vend" ? "padding-left:18px" : ""}">${esc(x.nome)}</td><td>${mtR(x.realA)}<br><small class="hint">${x.metaA ? "de " + mtR(x.metaA) : ""}</small></td><td>${mtR(x.realV)}<br><small class="hint">${x.metaV ? "de " + mtR(x.metaV) : ""}</small></td><td>${mtR(x.real)}<br><small class="hint">${x.meta ? "de " + mtR(x.meta) : "sem meta"}</small></td><td><b>${pct(x)}</b></td></tr>`;
  modal(`<div class="mt" style="display:grid;gap:12px"><h2>Relatório · ${mtNomeMes(rel.mes)}</h2>
    <div class="kpis2" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><small>Rede</small><b>${pct(r)}</b><span>${mtR(r.real)} de ${mtR(r.meta)}</span></div><div><small>Assistência</small><b>${mtR(r.realA)}</b><span>de ${mtR(r.metaA)}</span></div><div><small>Vendas</small><b>${mtR(r.realV)}</b><span>de ${mtR(r.metaV)}</span></div></div>
    <div class="rolar"><table class="tab-metas"><thead><tr><th></th><th>Assistência</th><th>Vendas</th><th>Total</th><th>%</th></tr></thead><tbody>${rel.linhas.map(lin).join("")}</tbody></table></div>
    <p class="hint" style="margin:0">Números de agora: se um dia for corrigido depois, o relatório muda junto.</p>
    <div class="nav"><button class="btn soft" id="mtcsv">Baixar planilha</button><button class="btn soft" id="mtimp">Imprimir</button></div>
    <button class="btn primary" id="mtfec">Fechar</button></div>`, () => {
    $("mtfec").onclick = fecharModal;
    $("mtimp").onclick = () => window.print();
    $("mtcsv").onclick = () => {
      const n = v => String(Math.round(v * 100) / 100).replace(".", ",");
      const cab = ["Loja", "Nome", "Tipo", "Assistência meta", "Assistência realizado", "Vendas meta", "Vendas realizado", "Meta total", "Realizado total", "% da meta", "Dias fechados"];
      const rows = rel.linhas.map(x => [x.loja, x.nome, x.tipo === "loja" ? "Loja" : "Vendedor", n(x.metaA), n(x.realA), n(x.metaV), n(x.realV), n(x.meta), n(x.real), x.meta ? n(x.pct * 100) : "", x.dias]);
      rows.push(["Rede", "Rede", "Total", n(r.metaA), n(r.realA), n(r.metaV), n(r.realV), n(r.meta), n(r.real), r.meta ? n(r.pct * 100) : "", ""]);
      const csv = "\ufeff" + [cab, ...rows].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `metas-${rel.mes.slice(0, 7)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  }, "box-cat");
}
// abre a tela certa a partir de um link/notificação (#metas, #metas-avisos, #metas-relatorio)
function mtAbrirPorLink() {
  const h = MT.link; if (!h || !S.perfil) return;
  MT.link = null;
  const p = papel(); if (!["loja", "dona", "admin"].includes(p)) return;
  MT.lojaAberta = null; MT.aba = h === "#metas-avisos" ? "avisos" : "painel";
  if (h === "#metas-relatorio" && p !== "loja") { const [a, b] = hoje().split("-").map(Number), d = new Date(a, b - 2, 1); MT.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; MT.abrirRelatorio = true; }
  if (p === "loja") tela = "metas"; else if (p === "admin") abaFab = "metas";
  desenhar(); scrollTo(0, 0);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.abrir && String(e.data.abrir).startsWith("#metas")) { MT.link = e.data.abrir; mtAbrirPorLink(); } });

/* ---------- dona: metas, vendedores, calendário, limites ---------- */
function mtTelaMetas() {
  const D = MT.dados, cfgDesc = new Map((D.raw.config || []).map(c => [c.chave, c.descricao]));
  const linhas = D.lojas.map(l => {
    const ativos = l.vend.filter(v => v.ativo);
    const sa = ativos.reduce((s, v) => s + (v.meta ? v.meta.a : 0), 0), sv = ativos.reduce((s, v) => s + (v.meta ? v.meta.v : 0), 0);
    const ok = !l.meta || (sa === l.meta.a && sv === l.meta.v);
    return `<tr><td class="n">${esc(l.nome)}</td><td><input inputmode="decimal" data-mtml="${l.id}" data-k="a" placeholder="—" value="${l.meta ? mtFmtCampo(l.meta.a) : ""}"></td><td><input inputmode="decimal" data-mtml="${l.id}" data-k="v" placeholder="—" value="${l.meta ? mtFmtCampo(l.meta.v) : ""}"></td><td class="soma">${l.meta ? mtR(l.meta.a + l.meta.v) : "—"}</td></tr>
    ${ativos.map(v => `<tr><td class="sub"><input data-mtvn="${v.id}" value="${esc(v.nome)}" style="max-width:150px;font-weight:600" aria-label="Nome do vendedor"> <button class="link" data-mt="sair-vend" data-v="${v.id}" title="Saiu da loja" style="padding:4px">×</button></td><td><input inputmode="decimal" placeholder="sem meta" data-mtmv="${v.id}" data-k="a" value="${v.meta ? mtFmtCampo(v.meta.a) : ""}"></td><td><input inputmode="decimal" placeholder="sem meta" data-mtmv="${v.id}" data-k="v" value="${v.meta ? mtFmtCampo(v.meta.v) : ""}"></td><td class="soma">${v.meta ? mtR(v.meta.a + v.meta.v) : "—"}</td></tr>`).join("")}
    <tr><td class="sub" colspan="4"><span style="display:flex;gap:6px;align-items:center"><input id="mtnovo-${l.id}" placeholder="Nome do vendedor novo" style="max-width:200px"><button class="mini soft" data-mt="novo-vend" data-loja="${l.id}">+ Vendedor</button></span></td></tr>
    ${ok ? "" : `<tr><td colspan="4"><span class="hint txt-a">Soma dos vendedores: Assist. ${mtR(sa)} · Vendas ${mtR(sv)}, diferente da meta da loja.</span></td></tr>`}`;
  }).join("");
  const pad = mtDow(D.dias[0]);
  const lims = ["amarelo_pts", "risco_mult", "acima_pts", "acima_proj", "queda_fator", "deseq_pts", "fora_media_mult", "silencio_dias", "proj_loja", "proj_rede", "reta_final_dias", "repetir_dias"];
  return `<section class="sec" style="margin-top:12px"><h2>Metas de ${mtNomeMes(MT.mes)}</h2>
  <p class="hint" style="margin:0">Meta da loja e de cada vendedor, em Assistência e Vendas. Vendedor sem valor fica "sem meta". Para tirar um vendedor que saiu, toque no ×: os lançamentos dele continuam no histórico.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini primary" data-mt="copiar">Copiar metas de ${mtNomeMes(mtMesMais(MT.mes, -1)).split(" ")[0]}</button></div>
  <div class="painel rolar"><table class="tab-metas"><thead><tr><th></th><th>Assistência</th><th>Vendas</th><th>Total</th></tr></thead><tbody>${linhas}</tbody></table></div></section>
  <section class="sec"><h2>Dias de venda <small>${D.diasG.length} dias · toque para abrir/fechar um dia na rede</small></h2>
  <div class="painel"><div class="cal">${MR.SEM.map(s => `<span class="ds">${s}</span>`).join("")}${"<span></span>".repeat(pad)}${D.dias.map(d => { const ab = D.calG.has(d) ? D.calG.get(d) : mtDow(d) !== 0; return `<button class="${ab ? "on" : ""}" data-mt="cal" data-dia="${d}" title="${ab ? "Loja abre" : "Fechado"}">${+d.slice(8)}</button>`; }).join("")}</div>
  <p class="hint" style="margin:0">Sem marcação, vale segunda a sábado. A meta diária e a projeção usam só os dias abertos.</p></div></section>
  <section class="sec"><h2>Limites dos avisos</h2><div class="painel lim">${lims.map(k => `<span>${esc(cfgDesc.get(k) || k)}</span><input inputmode="decimal" data-mtcfg="${k}" value="${String(D.cfg[k]).replace(".", ",")}">`).join("")}</div></section>`;
}

/* ---------- desenho ---------- */
function mtRender() {
  const alvo = $("mtbox") || $("app");
  if (!window.MR) { alvo.innerHTML = `<div class="mt"><p class="carregando" style="margin-top:10vh">Carregando metas…</p></div>`; addEventListener("mr-pronto", () => desenhar(), { once: true }); return; }
  if (!MT.dados || MT.dados.mes !== MT.mes) {
    alvo.innerHTML = `<div class="mt"><p class="carregando" style="margin-top:10vh">Carregando metas…</p></div>`;
    if (!MT.carregando) mtCarregar().then(desenhar).catch(e => { const a = $("mtbox") || $("app"); if (a.querySelector(".mt")) a.innerHTML = `<div class="mt"><p class="vazio">Não consegui carregar as metas. ${esc(e.message)}</p><button class="btn soft" data-mt="tentar">Tentar de novo</button></div>`; });
    return;
  }
  const rede = mtEhRede(), loja = papel() === "loja" ? mtLojaPor(S.perfil.loja_id) : null;
  if (!rede && !loja) { alvo.innerHTML = `<div class="mt"><p class="vazio">Sem acesso às metas.</p></div>`; return; }
  const L = mtAvisosDoPapel(), urg = L.some(x => x.nivel === "r");
  const abas = rede ? [["painel", "Visão geral"], ["metas", "Metas e vendedores"], ["avisos", `Avisos${L.length ? ` (${L.length})` : ""}`]]
    : [["painel", "Painel"], ["lancar", "Lançar o dia"], ["avisos", `Avisos${L.length ? ` (${L.length})` : ""}`]];
  if (!abas.some(a => a[0] === MT.aba)) MT.aba = "painel";
  let corpo;
  if (MT.aba === "avisos") { MT.listaAtual = L; corpo = `<section class="sec" style="margin-top:12px"><p class="hint" style="margin:0">Do mais importante para o menos. ${rede ? "O gerente vê os avisos da loja dele." : "Avisos da sua loja."} "Visto" tira da lista; o aviso só volta se piorar ou depois de ${MT.dados.cfg.repetir_dias} dias.</p>${mtListaAvisos(L)}</section>`; }
  else if (rede && MT.aba === "metas") corpo = mtTelaMetas();
  else if (rede) corpo = MT.lojaAberta && mtLojaPor(MT.lojaAberta) ? mtPainelLoja(mtLojaPor(MT.lojaAberta)) : mtRede();
  else if (MT.aba === "lancar") corpo = mtLancar(loja);
  else corpo = mtPainelLoja(loja);
  alvo.innerHTML = `<div class="mt">${papel() !== "admin" ? faixaAvisos() : ""}
    <div class="mtopo">${papel() === "loja" ? `<button class="link" data-mt="sair" style="margin-left:-10px">‹ Pedidos</button>` : ""}
      <h1 style="font-size:22px">${rede ? "Metas da rede" : "Metas da loja"}</h1>
      <span class="mes"><button class="link" data-mt="mes" data-k="-1" aria-label="Mês anterior">‹</button><b>${mtNomeMes(MT.mes)}</b><button class="link" data-mt="mes" data-k="1" aria-label="Próximo mês">›</button></span>
      <button class="msino" data-mt="aba" data-aba="avisos" aria-label="Avisos"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>${L.length ? `<span class="${urg ? "urg" : ""}">${L.length}</span>` : ""}</button></div>
    <div class="tabs">${abas.map(([k, t]) => `<button class="${MT.aba === k ? "on" : ""}" data-mt="aba" data-aba="${k}">${t}</button>`).join("")}</div>
    ${corpo}</div>`;
  if ($("bavisos")) $("bavisos").onclick = ativarAvisos;
  if (MT.abrirRelatorio && rede) { MT.abrirRelatorio = false; mtRelatorio(); }
}
// cartão de entrada na tela da loja
function mtEntradaLoja() {
  return `<button class="entrada-metas" id="mtentrar"><span class="ico">📈</span><span><b>Metas e fechamento do dia</b><small>Lance o fechamento e acompanhe a meta da loja</small></span><span class="seta">›</span></button>`;
}

/* ---------- cliques e digitação ---------- */
document.addEventListener("click", async e => {
  if (e.target.closest("#mtentrar")) { MT.aba = "painel"; tela = "metas"; desenhar(); scrollTo(0, 0); return; }
  const b = e.target.closest(".mt [data-mt]"); if (!b) return;
  const a = b.dataset.mt, D = MT.dados;
  const vaiPara = (aba, loja) => { MT.aba = aba; MT.lojaAberta = loja || null; desenhar(); scrollTo(0, 0); };
  try {
    if (a === "tentar") return desenhar();
    if (a === "relatorio") return mtRelatorio();
    if (a === "sair") return history.back();
    if (a === "aba") return vaiPara(b.dataset.aba);
    if (a === "mes") { MT.mes = mtMesMais(MT.mes, +b.dataset.k); MT.lojaAberta = null; return desenhar(); }
    if (a === "loja") return vaiPara("painel", b.dataset.loja);
    if (a === "voltar") return vaiPara("painel");
    if (a === "rank") { const x = MT.rank[+b.dataset.i]; vaiPara("painel", x.l.id); setTimeout(() => { const el = $("mtv-" + x.v.id); if (el) el.scrollIntoView({ block: "center" }); }, 0); return; }
    if (a === "ir") {
      const x = MT.listaAtual[+b.dataset.i], al = x.alvo;
      if (al.mes) MT.mes = al.mes;
      if (al.aba) return vaiPara(al.aba);
      vaiPara("painel", mtEhRede() ? al.loja : null);
      if (al.vend) setTimeout(() => { const el = $("mtv-" + al.vend); if (el) el.scrollIntoView({ block: "center" }); }, 0);
      return;
    }
    if (a === "visto") { const x = MT.listaAtual[+b.dataset.i]; await api.marcarVisto(x.chave, x.g); D.vistos.set(x.chave, { chave: x.chave, gravidade: x.g, visto_em: new Date().toISOString() }); return desenhar(); }
    if (a === "dia") return mtDiaRede(mtLojaPor(MT.lojaAberta), b.dataset.dia);
    if (a === "fechar") { const l = mtLojaPor(S.perfil.loja_id), dia = b.dataset.dia; return mtConfirmarFechar(l, dia, MT.rasc[l.id][dia], () => { MT.aba = mtDiaParaLancar(mtLojaPor(l.id)) ? "lancar" : "painel"; }); }
    if (a === "copiar") { const n = await api.copiarMetas(mtMesMais(MT.mes, -1), MT.mes); toast(n ? `${n} metas copiadas` : "Nada para copiar (ou já estava tudo cadastrado)"); await mtCarregar(); return desenhar(); }
    if (a === "cal") { const d = b.dataset.dia, ab = D.calG.has(d) ? D.calG.get(d) : mtDow(d) !== 0; await api.salvarCalendario(d, !ab); await mtCarregar(); return desenhar(); }
    if (a === "novo-vend") { const i = $("mtnovo-" + b.dataset.loja), nome = i.value.trim(); if (!nome) return i.focus(); await api.salvarVendedor({ loja_id: b.dataset.loja, nome, ordem: mtLojaPor(b.dataset.loja).vend.length }); toast(`${nome} cadastrado`); await mtCarregar(); return desenhar(); }
    if (a === "sair-vend") {
      const v = D.lojas.flatMap(l => l.vend).find(x => x.id === b.dataset.v);
      return confirmar(`${esc(v.nome)} saiu da loja?`, "Some da lista de lançamento e das metas. O que ele já vendeu continua no histórico.", "Tirar da lista", async () => { try { await api.salvarVendedor({ id: v.id, ativo: false }); await mtCarregar(); desenhar(); } catch (er) { erroTela(er); } });
    }
  } catch (er) { erroTela(er); }
});
document.addEventListener("input", e => {
  const i = e.target; if (!i.dataset || !i.dataset.mtv || !MT.dados) return;
  const l = mtLojaPor(S.perfil.loja_id), r = MT.rasc[l.id][i.dataset.dia], x = (r[i.dataset.mtv] ||= {});
  x[i.dataset.k] = i.value;
  $("mtsub-" + i.dataset.mtv).textContent = mtR(mtNum(x.a) + mtNum(x.v));
  $("mttot").textContent = mtR(Object.values(r).reduce((s, y) => s + mtNum(y.a) + mtNum(y.v), 0));
});
document.addEventListener("change", async e => {
  const i = e.target; if (!i.closest || !i.closest(".mt") || !MT.dados) return;
  const D = MT.dados;
  try {
    if (i.dataset.mtml) {
      const l = mtLojaPor(i.dataset.mtml), m = { ...(l.meta || { a: 0, v: 0 }) }; m[i.dataset.k] = mtNum(i.value);
      await api.salvarMetaLoja(MT.mes, l.id, m.a, m.v);
    } else if (i.dataset.mtmv) {
      const v = D.lojas.flatMap(l => l.vend).find(x => x.id === i.dataset.mtmv), m = { ...(v.meta || { a: 0, v: 0 }) }; m[i.dataset.k] = mtNum(i.value);
      await api.salvarMetaVendedor(MT.mes, v.id, m.a || m.v ? m : null);
    } else if (i.dataset.mtvn) {
      const nome = i.value.trim(); if (!nome) return desenhar();
      await api.salvarVendedor({ id: i.dataset.mtvn, nome });
    } else if (i.dataset.mtcfg) {
      const val = Number(String(i.value).replace(",", ".")); if (!isFinite(val) || val < 0) { toast("Valor inválido"); return desenhar(); }
      await api.salvarConfigMetas(i.dataset.mtcfg, val);
    } else return;
    toast("Salvo"); await mtCarregar(); desenhar();
  } catch (er) { erroTela(er); }
});
