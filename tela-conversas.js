/* ---------- CONVERSAS DO WHATSAPP (fábrica e administrador) ---------- */
let conversaAberta = null, filtroConv = "todas";
S.conversas = []; S.mensagens = [];
const naoLidas = () => (S.conversas || []).reduce((a, c) => a + (c.nao_lidas || 0), 0);
const foneBonito = t => { const d = soNumeros(t).replace(/^55/, ""); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t; };
const janela24 = c => !!c.ultima_cliente_em && Date.now() - new Date(c.ultima_cliente_em).getTime() < 23.5 * 3600e3;
const horaCurta = iso => { const d = new Date(iso), h = new Date(); return d.toDateString() === h.toDateString() ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); };
const quem = c => c.tipo === "loja" ? `${esc(nomeLoja(c.loja_id))} (vendedor)` : esc(c.nome || foneBonito(c.telefone));

function abaConversas() {
  let L = (S.conversas || []).slice();
  if (filtroConv === "esperando") L = L.filter(c => c.modo === "atendente");
  if (filtroConv === "lojas") L = L.filter(c => c.tipo === "loja");
  const esperando = (S.conversas || []).filter(c => c.modo === "atendente").length;
  const c = conversaAberta && (S.conversas || []).find(x => x.id === conversaAberta);
  const lista = `<div class="conv-lista ${c ? "tem-aberta" : ""}">
    <div class="pills" style="margin-bottom:10px"><button class="${filtroConv === "todas" ? "on" : ""}" data-fconv="todas">Todas</button><button class="${filtroConv === "esperando" ? "on" : ""}" data-fconv="esperando">Esperando você${esperando ? ` (${esperando})` : ""}</button><button class="${filtroConv === "lojas" ? "on" : ""}" data-fconv="lojas">Lojas</button></div>
    ${L.length ? L.map(x => `<button class="conv-item ${x.id === conversaAberta ? "sel" : ""}" data-conv="${x.id}">
      <span class="conv-av ${x.tipo}">${x.tipo === "loja" ? ICON.loja : esc((x.nome || "?").trim()[0] || "?").toUpperCase()}</span>
      <span class="conv-tx"><b>${quem(x)}</b><small>${x.modo === "atendente" ? `<span class="tag urg">Esperando você</span>` : `<span class="tag">Robô atendendo</span>`} ${foneBonito(x.telefone)}</small></span>
      <span class="conv-dir"><small>${horaCurta(x.ultima_msg_em)}</small>${x.nao_lidas ? `<i>${x.nao_lidas}</i>` : ""}</span></button>`).join("")
    : `<div class="empty">${(S.conversas || []).length ? "Nenhuma conversa neste filtro." : "Ainda não chegou nenhuma mensagem no WhatsApp. Quando um cliente ou uma loja escrever, a conversa aparece aqui."}</div>`}
  </div>`;
  return `${api.modo === "demo" ? `<div class="aviso" style="margin-bottom:12px"><b>Modo demonstração:</b> o WhatsApp só funciona com o banco de verdade.</div>` : ""}
   <div class="conv-wrap">${lista}<div class="conv-thread ${c ? "" : "vazia"}" id="thread">${c ? threadHtml(c) : `<p class="sub">Escolha uma conversa para ver as mensagens.</p>`}</div></div>`;
}
function threadHtml(c) {
  const msgs = S.mensagens.filter(m => m.conversa_id === c.id);
  const peds = [...new Set(msgs.map(m => m.pedido_id).filter(Boolean))];
  const aberta = janela24(c);
  return `<div class="conv-topo"><button class="link conv-voltar" id="cvoltar">← Conversas</button>
     <div style="min-width:0"><b>${quem(c)}</b><div class="sub">${foneBonito(c.telefone)}${peds.length ? ` · pedido${peds.length > 1 ? "s" : ""} ${peds.map(nro).join(", ")}` : ""}</div></div>
     ${c.modo === "atendente" ? `<button class="soft mini" data-modo="robo">Devolver ao robô</button>` : `<button class="soft mini" data-modo="atendente">Assumir conversa</button>`}</div>
   <div class="conv-msgs" id="cmsgs">${msgs.length ? msgs.map(msgHtml).join("") : `<p class="sub" style="text-align:center">Carregando mensagens…</p>`}</div>
   <form class="conv-resp" id="cresp">${aberta
      ? `<textarea id="ctexto" rows="2" placeholder="Escreva a resposta… (o robô para de responder enquanto você atende)"></textarea><button class="primary mini" type="submit" id="cenviar">Enviar</button>`
      : `<p class="sub" style="margin:0">Faz mais de 24 horas que esta pessoa não escreve. Pelas regras do WhatsApp, você só pode responder depois que ela mandar uma nova mensagem.</p>`}</form>`;
}
function msgHtml(m) {
  if (m.autor === "sistema" && m.direcao === "saida" && !m.wa_id && !m.pedido_id && m.situacao === "ok") return `<div class="msg-sis">${esc(m.texto)} · ${horaCurta(m.criado_em)}</div>`;
  const lado = m.direcao === "entrada" ? "in" : "out";
  const rotulo = { robo: "Robô", atendente: "Equipe", sistema: "Aviso automático", contato: "" }[m.autor];
  const st = m.direcao === "saida" ? ({ simulada: "simulada", enviada: "✓", entregue: "✓✓", lida: "✓✓ lida", falhou: "⚠ não enviada" }[m.situacao] || "") : "";
  return `<div class="msg ${lado} ${m.autor}">
    ${rotulo ? `<small class="msg-quem">${rotulo}</small>` : ""}
    ${m.midia_path ? `<img data-foto="${esc(m.midia_path)}" alt="Foto recebida" class="msg-img">` : ""}
    ${m.texto ? `<div class="msg-tx">${esc(m.texto).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</div>` : ""}
    <small class="msg-hora">${m.pedido_id ? `${nro(m.pedido_id)} · ` : ""}${horaCurta(m.criado_em)} ${st}${m.erro && m.situacao === "falhou" ? ` · ${esc(m.erro)}` : ""}</small></div>`;
}
async function abrirConversa(id) {
  conversaAberta = id; S.mensagens = [];
  desenhar();
  try {
    S.mensagens = await api.mensagens(id);
    const c = S.conversas.find(x => x.id === id);
    if (c && c.nao_lidas) { c.nao_lidas = 0; api.waAcao("lida", { conversa_id: id }).catch(() => { }); }
  } catch (e) { erroTela(e); }
  desenhar();
}
function ligarConversas() {
  $$("[data-fconv]").forEach(b => b.onclick = () => { filtroConv = b.dataset.fconv; desenhar(); });
  $$("[data-conv]").forEach(b => b.onclick = () => abrirConversa(+b.dataset.conv));
  const box = $("cmsgs"); if (box) box.scrollTop = box.scrollHeight;
  if ($("cvoltar")) $("cvoltar").onclick = () => { conversaAberta = null; desenhar(); };
  $$("[data-modo]").forEach(b => b.onclick = async () => {
    try { await api.waAcao("modo", { conversa_id: conversaAberta, modo: b.dataset.modo }); await recarregar(); desenhar(); toast(b.dataset.modo === "robo" ? "O robô voltou a atender esta conversa." : "Você assumiu a conversa. O robô parou de responder."); } catch (e) { erroTela(e); }
  });
  const f = $("cresp"), t = $("ctexto");
  if (t) {
    t.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } };
    f.onsubmit = async e => {
      e.preventDefault(); const texto = t.value.trim(); if (!texto) return;
      $("cenviar").disabled = true;
      try { const r = await api.waAcao("responder", { conversa_id: conversaAberta, texto }); await recarregar(); desenhar(); if (r && r.situacao === "simulada") toast("Modo simulação: a mensagem foi registrada, mas o WhatsApp ainda não está conectado."); }
      catch (er) { erroTela(er); if ($("cenviar")) $("cenviar").disabled = false; }
    };
  }
}
