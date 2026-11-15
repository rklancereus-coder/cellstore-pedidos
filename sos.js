/* ---------- SOS Celular: pré-atendimento de conserto com busca e entrega grátis ----------
   O cliente (sem login) conta qual é o aparelho e o problema, pode anexar uma foto, diz onde e quando buscar,
   e o pedido de orçamento chega pronto no WhatsApp da Loja ON (atendimento online). */
const SOS = {
  whatsapp: "5551996517306",
  cidades: ["Porto Alegre", "Cachoeirinha", "Gravataí", "Canoas", "São Leopoldo"],
  periodos: [["manha", "Manhã", "9h às 12h"], ["tarde", "Tarde", "12h às 18h"]],
  // marca no banco → [como o cliente chama, exemplo de linha, exemplo para a busca]
  marcas: [["Apple", "iPhone", "iPhone 11 ao 16", "13 Pro"], ["Samsung", "Samsung", "Galaxy A, S, M…", "A15"], ["Motorola", "Motorola", "Moto G, Edge…", "G54"], ["Xiaomi", "Xiaomi", "Redmi, Poco…", "Note 13"]],
  problemas: [
    ["tela", "💥", "Tela quebrada"], ["carrega", "🔌", "Não carrega"], ["bateria", "🔋", "Bateria fraca"], ["liga", "⛔", "Não liga"],
    ["agua", "💧", "Caiu na água"], ["camera", "📷", "Câmera"], ["som", "🔊", "Som ou microfone"], ["outro", "❓", "Outro problema"],
  ],
  // perguntas rápidas por problema (o "toque de atendimento")
  perguntas: {
    tela: [["imagem", "A imagem ainda aparece?"], ["toque", "O toque na tela funciona?"]],
    carrega: [["cabo", "Já testou com outro cabo e carregador?"], ["mexe", "Só carrega se mexer no cabo?"]],
    bateria: [["dia", "A bateria acaba antes do fim do dia?"], ["quente", "O celular esquenta muito?"]],
    liga: [["caiu", "Ele caiu ou molhou antes de parar?"], ["vibra", "Vibra ou acende alguma luz quando liga na tomada?"]],
    agua: [["agora", "Molhou faz menos de um dia?"], ["liga", "Ainda está ligando?"]],
    camera: [["qual", "É a câmera de trás?"], ["mancha", "A foto sai borrada ou com mancha?"]],
    som: [["lig", "O problema é nas ligações?"], ["fone", "Com fone de ouvido funciona?"]],
    outro: [],
  },
};
let sos = null;
const marcaSos = k => { const m = SOS.marcas.find(x => x[0] === k); return m ? [m[1], m[2], m[3]] : [k, "", "nome do modelo"]; };
function novoSos() { sos = { passo: 1, marca: "", modelo: "", naoSei: false, modeloTexto: "", busca: "", problema: "", resp: {}, obs: "", foto: null, fotoUrl: "", enviandoFoto: null, cidade: "", outraCidade: "", bairro: "", periodo: "", nome: "" }; }

async function abrirSos() {
  novoSos();
  if (!S.modelos.length) { try { S.modelos = await api.modelosPublicos(); } catch (e) { } }
  desenharSos();
}
const SOS_PASSOS = ["Qual é o seu celular?", "O que aconteceu?", "Conta um pouco mais", "Foto do estrago", "Onde e quando a gente busca?", "Confira e envie"];

function desenharSos() {
  const p = sos.passo;
  let corpo = "";
  if (p === 1) {
    // primeiro a marca (botões grandes), depois só os modelos dela
    const q = semAcento(sos.busca).trim();
    const L = S.modelos.filter(m => m.ativo !== false && (m.marca || "") === sos.marca && (!q || semAcento(m.nome).includes(q)));
    if (sos.naoSei) corpo = `
      <p class="lead" style="margin:0">Sem problema! Escreva o que souber: ${sos.marca ? `qual ${esc(marcaSos(sos.marca)[0])} é, ` : "marca, "}cor, mais ou menos de quando é.</p>
      <label class="f"><span>Seu celular</span><input id="smodtx" value="${esc(sos.modeloTexto)}" placeholder="${sos.marca ? `Ex.: ${esc(marcaSos(sos.marca)[0])} preto, comprei em 2023` : "Ex.: Samsung azul, comprei em 2023"}"></label>
      <div class="aviso"><b>Dica:</b> o modelo costuma aparecer em <b>Configurações → Sobre o telefone</b>.</div>
      <button type="button" class="link" id="strocar">‹ Escolher a marca de novo</button>`;
    else if (!sos.marca) corpo = `<div class="sos-marcas">${SOS.marcas.map(([k, n, ex]) => `<button type="button" data-smarca="${esc(k)}"><b>${n}</b><small>${ex}</small></button>`).join("")}
      <button type="button" data-smarca="__outra"><b>Outra marca</b><small>LG, Asus, Positivo…</small></button><button type="button" data-smarca="__naosei"><b>Não sei</b><small>A gente descobre junto</small></button></div>`;
    else corpo = `<button type="button" class="link sos-trocar" id="strocar">‹ Trocar a marca</button>
      ${L.length > 8 || q ? `<div class="busca">${ICON.lupa}<input id="sbusca" type="search" placeholder="Procure (ex.: ${esc(marcaSos(sos.marca)[2])})" value="${esc(sos.busca)}" autocomplete="off"></div>` : ""}
      <div class="sos-modelos">${L.length ? L.map(m => `<button type="button" class="${sos.modelo === m.nome ? "on" : ""}" data-smod="${esc(m.nome)}">${esc(m.nome)}</button>`).join("") : `<p class="hint">Não achei esse modelo.</p>`}</div>
      <button type="button" class="btn soft" id="snaosei">Meu modelo não está aqui</button>`;
  }
  if (p === 2) corpo = `<div class="sos-problemas">${SOS.problemas.map(([k, ic, n]) => `<button type="button" class="${sos.problema === k ? "on" : ""}" data-sprob="${k}"><span>${ic}</span>${n}</button>`).join("")}</div>`;
  if (p === 3) {
    const Q = SOS.perguntas[sos.problema] || [];
    corpo = `${sos.problema === "agua" ? `<div class="aviso sos-urgente"><b>Importante agora:</b> desligue o celular e <b>não coloque para carregar</b> até a gente buscar. Não use secador nem arroz.</div>` : ""}
      ${Q.map(([k, t]) => `<div class="f"><span>${t}</span><div class="pills">${["Sim", "Não", "Não sei"].map(v => `<button type="button" class="${sos.resp[k] === v ? "on" : ""}" data-sresp="${k}" data-v="${v}">${v}</button>`).join("")}</div></div>`).join("")}
      <label class="f"><span>${sos.problema === "outro" ? "Conte o que está acontecendo" : "Quer contar mais alguma coisa? <em>(opcional)</em>"}</span><textarea id="sobs" rows="3" placeholder="${sos.problema === "outro" ? "Ex.: o celular reinicia sozinho várias vezes" : "Ex.: caiu do bolso ontem"}">${esc(sos.obs)}</textarea></label>`;
  }
  if (p === 4) corpo = `<p class="lead" style="margin:0">Uma foto ajuda a atendente a passar o orçamento mais rápido. ${sos.problema === "tela" ? "Fotografe a tela de frente." : ""}</p>
      <label class="drop" for="sfoto">${sos.foto ? `<img src="${sos.foto.previa}" alt="Foto do celular">` : `${ICON.foto || "📷"}<b>Tirar ou escolher foto</b><span>Opcional</span>`}<input type="file" id="sfoto" accept="image/*"></label>
      ${sos.foto ? `<button type="button" class="link" id="stira">Tirar a foto</button>` : ""}`;
  if (p === 5) corpo = `<div class="f"><span>Cidade</span><div class="pills">${SOS.cidades.map(c => `<button type="button" class="${sos.cidade === c ? "on" : ""}" data-scid="${esc(c)}">${esc(c)}</button>`).join("")}<button type="button" class="${sos.cidade === "outra" ? "on" : ""}" data-scid="outra">Outra cidade próxima</button></div>
      ${sos.cidade === "outra" ? `<input id="soutra" value="${esc(sos.outraCidade)}" placeholder="Qual cidade?" style="margin-top:6px">` : ""}</div>
      <label class="f"><span>Bairro</span><input id="sbairro" value="${esc(sos.bairro)}" placeholder="Ex.: Centro"></label>
      <div class="f"><span>Melhor horário para buscar</span><div class="sos-periodos">${SOS.periodos.map(([k, n, h]) => `<button type="button" class="${sos.periodo === k ? "on" : ""}" data-sper="${k}"><b>${n}</b><small>${h}</small></button>`).join("")}</div><span class="hint">Buscamos de segunda a sábado, das 9h às 18h. O endereço completo você passa na conversa.</span></div>
      <label class="f"><span>Seu nome</span><input id="snome" value="${esc(sos.nome)}" placeholder="Como podemos te chamar?" autocomplete="given-name"></label>`;
  if (p === 6) {
    const linhas = resumoSos();
    corpo = `<div class="review">${linhas.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>
      ${sos.foto ? `<img src="${sos.foto.previa}" alt="" class="sos-mini">` : ""}
      <div class="sos-passos"><b>Como funciona</b><ol><li>A atendente responde no WhatsApp com o orçamento.</li><li>Nosso motoboy busca o celular na sua casa. <b>Busca grátis.</b></li><li>A gente conserta.</li><li>Devolvemos o celular na sua casa.</li></ol></div>
      <div class="aviso"><b>Antes da busca:</b> faça backup das fotos e conversas, se der. <b>Não mande a senha do celular por aqui.</b></div>`;
  }
  const ultimo = p === 6;
  modal(`<div class="cat-topo">${p > 1 ? `<button type="button" class="cat-voltar" id="svolta">‹ Voltar</button>` : ""}<h2>SOS Celular</h2><button class="cat-x" id="sfechar" aria-label="Fechar">×</button></div>
    <div class="prog">${SOS_PASSOS.map((_, i) => `<i class="${i < p ? "on" : ""}"></i>`).join("")}</div>
    <div class="sos-corpo" id="scorpo"><h3 class="sos-tit">${p === 1 && sos.marca && !sos.naoSei ? `Qual é o seu ${esc(marcaSos(sos.marca)[0])}?` : p === 1 && sos.naoSei ? "Conta pra gente qual é" : SOS_PASSOS[p - 1]}</h3>${corpo}</div>
    <div class="sos-rodape">${ultimo
      ? `<a class="btn primary sos-zap" id="senviar" href="#" target="_blank" rel="noopener">${ICON.chat} Enviar pelo WhatsApp</a>`
      : p === 1 && !sos.naoSei ? "" : `<button type="button" class="btn primary" id="ssegue">${p === 4 && !sos.foto ? "Pular" : "Continuar"}</button>`}</div>`, ligarSos, "box-sos");
}

function resumoSos() {
  const prob = SOS.problemas.find(x => x[0] === sos.problema);
  const Q = (SOS.perguntas[sos.problema] || []).filter(([k]) => sos.resp[k]).map(([k, t]) => [t, sos.resp[k]]);
  return [
    ["Aparelho", esc(sos.naoSei ? sos.modeloTexto : sos.modelo)],
    ["Problema", prob ? prob[2] : "—"],
    ...Q.map(([t, v]) => [esc(t), esc(v)]),
    sos.obs && ["Detalhes", esc(sos.obs)],
    ["Foto", sos.foto ? "Anexada" : "Sem foto"],
    ["Busca em", esc((sos.cidade === "outra" ? sos.outraCidade : sos.cidade) + (sos.bairro ? " · " + sos.bairro : ""))],
    ["Horário", (SOS.periodos.find(x => x[0] === sos.periodo) || ["", "—", ""]).slice(1).join(" · ")],
    ["Nome", esc(sos.nome)],
  ].filter(Boolean);
}
function mensagemSos() {
  const prob = SOS.problemas.find(x => x[0] === sos.problema);
  const per = SOS.periodos.find(x => x[0] === sos.periodo);
  const Q = (SOS.perguntas[sos.problema] || []).filter(([k]) => sos.resp[k]).map(([k, t]) => `• ${t} ${sos.resp[k]}`);
  return [
    "Olá! Vim pelo *SOS Celular* do Portal Cell Store e quero um orçamento de conserto.\n",
    `📱 *Aparelho:* ${sos.naoSei ? sos.modeloTexto + " (não sei o modelo)" : sos.modelo}`,
    `🔧 *Problema:* ${prob ? prob[2] : ""}`,
    ...Q,
    sos.obs ? `📝 *Detalhes:* ${sos.obs}` : "",
    sos.fotoUrl ? `📷 *Foto:* ${sos.fotoUrl}` : sos.foto ? "📷 Vou mandar a foto aqui na conversa" : "📷 Sem foto",
    `📍 *Busca em:* ${sos.cidade === "outra" ? sos.outraCidade : sos.cidade}${sos.bairro ? ", bairro " + sos.bairro : ""}`,
    `🕒 *Melhor horário:* ${per ? `${per[1]} (${per[2]})` : ""}`,
    `🙋 *Nome:* ${sos.nome}`,
  ].filter(l => l !== "").join("\n");
}
// reduz a foto (até 1280 px) e envia para o depósito público "sos"; o link vai na mensagem
function fotoSos(file) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok({ blob: b, previa: c.toDataURL("image/jpeg", .6) }) : falha(new Error("Não consegui ler a foto.")), "image/jpeg", .82);
    };
    img.onerror = () => falha(new Error("Esse arquivo não parece uma foto."));
    img.src = url;
  });
}

// guarda o que está digitado no passo atual (usado também quando o "voltar" do celular sai do passo)
function guardarSos() {
  const v = id => $(id) ? $(id).value.trim() : null;
  if (v("smodtx") !== null) sos.modeloTexto = v("smodtx");
  if (v("sobs") !== null) sos.obs = v("sobs");
  if (v("soutra") !== null) sos.outraCidade = v("soutra");
  if (v("sbairro") !== null) sos.bairro = v("sbairro");
  if (v("snome") !== null) sos.nome = v("snome");
}
function ligarSos() {
  const $v = id => $(id) ? $(id).value.trim() : null;
  const guardar = () => {
    if ($v("smodtx") !== null) sos.modeloTexto = $v("smodtx");
    if ($v("sobs") !== null) sos.obs = $v("sobs");
    if ($v("soutra") !== null) sos.outraCidade = $v("soutra");
    if ($v("sbairro") !== null) sos.bairro = $v("sbairro");
    if ($v("snome") !== null) sos.nome = $v("snome");
  };
  const ir = n => { guardar(); const ant = sos.passo; sos.passo = n; subNivel(() => { guardarSos(); sos.passo = ant; desenharSos(); }); desenharSos(); };
  $("sfechar").onclick = fecharModal;
  if ($("svolta")) $("svolta").onclick = () => history.back();
  // passo 1
  $$("[data-smarca]").forEach(b => b.onclick = () => {
    const k = b.dataset.smarca; sos.busca = ""; sos.modelo = "";
    if (k === "__outra" || k === "__naosei") { sos.marca = ""; sos.naoSei = true; } else { sos.marca = k; sos.naoSei = false; }
    subNivel(() => { guardarSos(); sos.marca = ""; sos.naoSei = false; sos.busca = ""; desenharSos(); });
    desenharSos();
  });
  if ($("strocar")) $("strocar").onclick = () => history.back();
  const sb = $("sbusca"); if (sb) sb.oninput = () => { sos.busca = sb.value; const pos = sb.selectionStart; desenharSos(); const n = $("sbusca"); n.focus(); n.setSelectionRange(pos, pos); };
  $$("[data-smod]").forEach(b => b.onclick = () => { sos.modelo = b.dataset.smod; sos.naoSei = false; ir(2); });
  if ($("snaosei")) $("snaosei").onclick = () => { sos.naoSei = true; subNivel(() => { guardarSos(); sos.naoSei = false; desenharSos(); }); desenharSos(); };
  // passo 2
  $$("[data-sprob]").forEach(b => b.onclick = () => { if (sos.problema !== b.dataset.sprob) sos.resp = {}; sos.problema = b.dataset.sprob; ir(3); });
  // passo 3
  $$("[data-sresp]").forEach(b => b.onclick = () => { guardar(); sos.resp[b.dataset.sresp] = b.dataset.v; desenharSos(); });
  // passo 4: a foto já começa a subir enquanto a pessoa preenche o resto
  const sf = $("sfoto"); if (sf) sf.onchange = async () => {
    const f = sf.files && sf.files[0]; if (!f) return;
    try {
      sos.foto = await fotoSos(f); sos.fotoUrl = ""; desenharSos();
      const atual = sos.foto;
      sos.enviandoFoto = api.enviarFotoSos(atual.blob).then(u => { if (sos.foto === atual) sos.fotoUrl = u; }).catch(() => { if (sos.foto === atual) sos.fotoUrl = ""; });
    } catch (e) { erroTela(e); }
  };
  if ($("stira")) $("stira").onclick = () => { sos.foto = null; sos.fotoUrl = ""; sos.enviandoFoto = null; desenharSos(); };
  // passo 5
  $$("[data-scid]").forEach(b => b.onclick = () => { guardar(); sos.cidade = b.dataset.scid; desenharSos(); if ($("soutra")) $("soutra").focus(); });
  $$("[data-sper]").forEach(b => b.onclick = () => { guardar(); sos.periodo = b.dataset.sper; desenharSos(); });
  // avançar
  const sg = $("ssegue"); if (sg) sg.onclick = () => {
    guardar();
    const p = sos.passo;
    if (p === 1 && !sos.modelo && !(sos.naoSei && sos.modeloTexto)) return toast(sos.naoSei ? "Escreva o que souber do seu celular." : "Escolha a marca e depois o modelo.");
    if (p === 2 && !sos.problema) return toast("Escolha o que aconteceu.");
    if (p === 3 && sos.problema === "outro" && !sos.obs) return toast("Conte rapidinho o que está acontecendo.");
    if (p === 5) {
      if (!sos.cidade || (sos.cidade === "outra" && !sos.outraCidade)) return toast("Escolha a cidade.");
      if (!sos.bairro) return toast("Digite o bairro.");
      if (!sos.periodo) return toast("Escolha o melhor horário.");
      if (!sos.nome) return toast("Digite seu nome.");
    }
    ir(p + 1);
  };
  // enviar: espera a foto terminar de subir e abre o WhatsApp da Loja ON com tudo escrito
  const env = $("senviar"); if (env) {
    const pronto = () => { env.href = `https://wa.me/${SOS.whatsapp}?text=${encodeURIComponent(mensagemSos())}`; env.classList.remove("esperando"); env.innerHTML = `${ICON.chat} Enviar pelo WhatsApp`; };
    if (sos.foto && !sos.fotoUrl && sos.enviandoFoto) {
      env.classList.add("esperando"); env.textContent = "Enviando a foto…";
      sos.enviandoFoto.finally(() => { if (!sos.fotoUrl && sos.foto) toast("Não consegui enviar a foto. Mande ela direto na conversa do WhatsApp.", 5000); pronto(); });
    } else pronto();
    env.onclick = e => { if (env.classList.contains("esperando")) { e.preventDefault(); return; } setTimeout(() => toast("Pronto! Continue a conversa no WhatsApp. 😊", 5000), 300); };
  }
}
