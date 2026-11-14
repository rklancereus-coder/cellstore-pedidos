/* ---------- ADMINISTRAÇÃO: usuários, lojas, preços, modelos e catálogo ---------- */
let secAdmin = "usuarios", usuariosCache = null;
const PAPEL_NOME = { loja: "Loja", fabrica: "Fábrica", logistica: "Logística", admin: "Administrador" };

async function telaAdmin() {
  const secs = [["usuarios", "Usuários e senhas"], ["lojas", "Lojas"], ["precos", "Preços"], ["modelos", "Modelos de celular"], ["catalogo", "Catálogo"], ["manutencao", "Espaço e cópias"]];
  let corpo = "";
  try {
    if (secAdmin === "usuarios") { if (!usuariosCache) usuariosCache = await api.usuarios("listar"); corpo = secUsuarios(); }
    if (secAdmin === "lojas") corpo = secLojas();
    if (secAdmin === "precos") corpo = secPrecos();
    if (secAdmin === "modelos") corpo = secModelos();
    if (secAdmin === "catalogo") corpo = secCatalogo();
    if (secAdmin === "manutencao") corpo = secManutencao(await api.usoEspaco());
  } catch (e) { corpo = `<div class="aviso"><b>Não consegui carregar.</b> ${esc(e.message)}</div>`; }
  if (!$("admin")) return;
  $("admin").innerHTML = `<div class="pills" style="margin-bottom:18px">${secs.map(([k, n]) => `<button class="${secAdmin === k ? "on" : ""}" data-sec="${k}">${n}</button>`).join("")}</div>${corpo}`;
  $$("[data-sec]").forEach(b => b.onclick = () => { secAdmin = b.dataset.sec; telaAdmin(); });
  ligarAdmin();
}
const optLojas = sel => S.lojas.filter(l => l.ativa).map(l => `<option value="${l.id}" ${sel === l.id ? "selected" : ""}>${esc(l.nome)}</option>`).join("");

function secUsuarios() {
  const U = usuariosCache.slice().sort((a, b) => a.papel.localeCompare(b.papel) || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  return `<section class="admin-sec"><h2>Novo acesso</h2>
   <form class="card" id="fuser" novalidate>
    <div class="row"><label class="f"><span>Tipo de acesso</span><select id="upapel">${Object.entries(PAPEL_NOME).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
    <label class="f" id="uljw"><span>Loja</span><select id="uloja"><option value="">Escolha a loja</option>${optLojas()}</select></label></div>
    <div class="row"><label class="f"><span>Usuário (para entrar)</span><input id="uusuario" placeholder="Ex.: loja03" autocapitalize="none"></label>
    <label class="f"><span>Nome que aparece</span><input id="unome" placeholder="Ex.: Loja 03 · Centro"></label></div>
    <label class="f"><span>Senha inicial <em>(mínimo 6 caracteres; passe para a pessoa em particular)</em></span><input id="usenha" type="text" autocomplete="new-password"></label>
    <button class="btn primary" type="submit" id="ucriar">Criar acesso</button>
   </form></section>
   <section class="admin-sec"><h2>Acessos (${U.length})</h2>
    ${U.map(u => `<div class="linha"><span class="grow"><b>${esc(u.nome)}</b><br><span class="sub">${esc(u.usuario)} · ${PAPEL_NOME[u.papel]}${u.loja_id ? " · " + esc(nomeLoja(u.loja_id)) : ""}</span></span>
      ${u.ativo ? `<span class="tag" style="background:var(--ok-soft);color:var(--ok)">Ativo</span>` : `<span class="tag urg">Desativado</span>`}
      <button class="soft mini" data-senha="${u.id}">Trocar senha</button>
      ${u.id !== S.perfil.id ? `<button class="link" data-ativo="${u.id}" data-v="${u.ativo ? 0 : 1}">${u.ativo ? "Desativar" : "Reativar"}</button>` : ""}</div>`).join("")}
   </section>`;
}
function secLojas() {
  return `<section class="admin-sec"><h2>Lojas</h2><p class="lead" style="margin:0">Lojas desativadas somem das listas, mas os pedidos antigos continuam no fechamento. O WhatsApp da loja serve para o robô reconhecer o vendedor quando ele escrever para a fábrica.</p>
   ${S.lojas.map(l => `<div class="linha"><div class="grow"><input value="${esc(l.nome)}" data-lnome="${l.id}" aria-label="Nome da loja"></div>
     <input value="${esc(l.whatsapp || "")}" data-lzap="${l.id}" placeholder="WhatsApp da loja" inputmode="tel" style="width:170px" aria-label="WhatsApp da ${esc(l.nome)}">
     ${l.ativa ? "" : `<span class="tag urg">Desativada</span>`}<button class="soft mini" data-lsalvar="${l.id}">Salvar</button><button class="link" data-lativa="${l.id}" data-v="${l.ativa ? 0 : 1}">${l.ativa ? "Desativar" : "Reativar"}</button></div>`).join("")}
   <form class="linha" id="fnovaloja"><div class="grow"><input id="novaloja" placeholder="Nome da nova loja"></div><button class="primary mini" type="submit">Adicionar loja</button></form>
   <p class="hint">Depois de criar a loja, crie o acesso dela em “Usuários e senhas”.</p></section>`;
}
function secPrecos() {
  const P = [["foto", "Capinha com foto"], ["nome", "Capinha com nome"], ["catalogo", "Capinha do catálogo"], ["popsocket", "PopSocket"]];
  return `<section class="admin-sec"><h2>Tabela de preços</h2><p class="lead" style="margin:0">Vale para os pedidos novos. Pedidos já feitos mantêm o preço do dia em que foram feitos.</p>
   ${P.map(([k, n]) => `<div class="linha"><span class="grow"><b>${n}</b></span><span>R$</span><input type="number" min="0" step="0.5" value="${S.precos[k] ?? 0}" data-preco="${k}" style="width:110px" aria-label="Preço ${n}"><button class="soft mini" data-psalvar="${k}">Salvar</button></div>`).join("")}</section>`;
}
function secModelos() {
  const M = S.modelos.slice().sort((a, b) => a.marca.localeCompare(b.marca) || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  return `<section class="admin-sec"><h2>Modelos de celular (${M.filter(m => m.ativo).length} ativos)</h2><p class="lead" style="margin:0">As lojas só conseguem escolher modelos desta lista. Desative o que a fábrica não atende mais.</p>
   <form class="linha" id="fmodelo"><div class="grow"><input id="mnome" placeholder="Novo modelo (ex.: Galaxy A26)"></div><input id="mmarca" placeholder="Marca" style="width:130px"><button class="primary mini" type="submit">Adicionar</button></form>
   ${M.map(m => `<div class="linha"><span class="grow"><b>${esc(m.nome)}</b> <span class="sub">${esc(m.marca)}</span></span>${m.ativo ? "" : `<span class="tag urg">Fora da lista</span>`}<button class="link" data-mativo="${m.id}" data-v="${m.ativo ? 0 : 1}">${m.ativo ? "Tirar da lista" : "Voltar para a lista"}</button></div>`).join("")}</section>`;
}
function secCatalogo() {
  const porTema = {}; for (const c of S.catalogo.values()) if (c.ativo) porTema[c.pasta_id] = (porTema[c.pasta_id] || 0) + 1;
  const total = Object.values(porTema).reduce((a, b) => a + b, 0);
  return `<section class="admin-sec"><h2>Catálogo (${total} estampas)</h2>
   <div class="card"><p class="lead" style="margin:0">O catálogo vem da pasta do Google Drive. Subiu ou apagou estampas lá? Toque em atualizar. Cada estampa tem um código no formato da planilha (3 letras da coleção + número, ex.: FLO-005). Estampas novas entram no fim da coleção, e um código nunca muda depois de criado.</p>
   <div class="acts"><button class="primary" id="sync">Atualizar catálogo agora</button><a class="link" href="${esc(CONFIG.pastaCatalogoDrive)}" target="_blank" rel="noopener">Abrir pasta no Drive</a></div><div id="syncmsg" class="sub"></div></div>
   <h3 style="margin-top:8px">Temas e prefixos</h3><p class="hint">Mudar o prefixo só vale para estampas novas daquela coleção.</p>
   ${S.temas.map(t => `<div class="linha"><span class="grow"><b>${esc(t.nome)}</b> <span class="sub">${porTema[t.pasta_id] || 0} estampas</span></span><input value="${esc(t.prefixo)}" data-tpref="${t.pasta_id}" style="width:90px;text-transform:uppercase" aria-label="Prefixo ${esc(t.nome)}"><button class="soft mini" data-tsalvar="${t.pasta_id}">Salvar</button></div>`).join("")}</section>`;
}

// espaço usado (plano gratuito: 500 MB de banco e 1 GB de arquivos) e cópias de segurança
function secManutencao(u) {
  const mb = b => (b / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " MB";
  const barra = (usado, total, nome, extra) => { const pc = Math.min(100, usado / total * 100); return `<div class="barra-uso"><div class="hd"><b>${nome}</b><span class="right">${mb(usado)} de ${mb(total)}</span></div><i style="--pc:${pc.toFixed(1)}%" class="${pc > 80 ? "alto" : ""}"></i>${extra ? `<span class="sub">${extra}</span>` : ""}</div>`; };
  const arquivos = u.fotos_bytes + u.backups_bytes;
  const ult = u.ultimo_backup ? new Date(u.ultimo_backup).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nenhuma ainda";
  return `<section class="admin-sec"><h2>Espaço usado</h2>
   <div class="card">${barra(u.banco_bytes, 500 * 1048576, "Banco de dados", "Pedidos, catálogo, conversas.")}
   ${barra(arquivos, 1024 * 1048576, "Fotos e cópias", `${u.fotos_qtd} fotos de pedidos (${mb(u.fotos_bytes)}) e cópias de segurança (${mb(u.backups_bytes)}).`)}
   ${arquivos / (1024 * 1048576) > .8 ? `<div class="aviso"><b>Espaço quase cheio.</b> Toque em "Limpar fotos antigas" ou fale comigo para ajustar.</div>` : ""}</div></section>
   <section class="admin-sec"><h2>Limpeza automática das fotos</h2>
   <div class="card"><p class="lead" style="margin:0">Todo domingo de madrugada o sistema apaga as fotos de pedidos <b>entregues ou cancelados há mais de 60 dias</b>. O pedido continua no histórico e no fechamento; só a foto sai.</p>
   <div class="acts"><button class="soft mini" id="mlimpar">Limpar fotos antigas agora</button><span class="sub">${u.fotos_para_limpar} foto(s) prontas para sair</span></div></div></section>
   <section class="admin-sec"><h2>Cópia de segurança</h2>
   <div class="card"><p class="lead" style="margin:0">Todo domingo de madrugada o sistema guarda uma cópia de todo o banco (pedidos, lojas, acessos, catálogo, conversas). Ficam as 8 últimas. Para ter uma cópia fora do servidor, baixe de vez em quando e guarde no seu Google Drive.</p>
   <p class="sub" style="margin:0">Última cópia: <b>${ult}</b></p>
   <div class="acts"><button class="primary" id="mbaixar">Baixar última cópia</button><button class="soft mini" id="mbackup">Fazer cópia agora</button></div></div></section>`;
}

function ligarAdmin() {
  const recarregarAdmin = async (msg) => { await recarregar(true); msg && toast(msg); telaAdmin(); };
  const tenta = async (fn, msg) => { try { await fn(); await recarregarAdmin(msg); } catch (e) { erroTela(e); } };
  const up = $("upapel"); if (up) { const sinc = () => $("uljw").hidden = up.value !== "loja"; up.onchange = sinc; sinc(); }
  const fu = $("fuser"); if (fu) fu.onsubmit = async e => {
    e.preventDefault(); const b = $("ucriar"); b.disabled = true;
    try {
      await api.usuarios("criar", { papel: $("upapel").value, loja_id: $("uloja").value || null, usuario: $("uusuario").value, nome: $("unome").value || $("uusuario").value, senha: $("usenha").value });
      usuariosCache = null; toast("Acesso criado. Passe o usuário e a senha para a pessoa."); telaAdmin();
    } catch (er) { erroTela(er); b.disabled = false; }
  };
  $$("[data-senha]").forEach(b => b.onclick = () => {
    const u = usuariosCache.find(x => x.id === b.dataset.senha);
    modal(`<h2>Nova senha para ${esc(u.nome)}</h2><label class="f"><span>Nova senha <em>(mínimo 6 caracteres)</em></span><input id="nsenha" type="text" autocomplete="new-password"></label><div class="nav"><button class="btn soft" onclick="fecharModal()">Voltar</button><button class="btn primary" id="nsalvar">Salvar senha</button></div>`, () => {
      $("nsenha").focus();
      $("nsalvar").onclick = async () => { try { await api.usuarios("senha", { id: u.id, senha: $("nsenha").value }); fecharModal(); toast("Senha trocada."); } catch (e) { erroTela(e); } };
    });
  });
  $$("[data-ativo]").forEach(b => b.onclick = async () => { try { await api.usuarios("ativo", { id: b.dataset.ativo, ativo: b.dataset.v === "1" }); usuariosCache = null; toast(b.dataset.v === "1" ? "Acesso reativado." : "Acesso desativado."); telaAdmin(); } catch (e) { erroTela(e); } });
  $$("[data-lsalvar]").forEach(b => b.onclick = () => { const l = S.lojas.find(x => x.id === b.dataset.lsalvar); const nome = $$(`[data-lnome="${l.id}"]`)[0].value.trim(); if (!nome) return toast("Digite o nome da loja."); const whatsapp = $$(`[data-lzap="${l.id}"]`)[0].value.trim(); if (whatsapp && soNumeros(whatsapp).length < 10) return toast("Digite o WhatsApp com DDD, ex.: (51) 99999-0000."); tenta(() => api.salvarLoja({ ...l, nome, whatsapp }), "Loja salva."); });
  $$("[data-lativa]").forEach(b => b.onclick = () => { const l = S.lojas.find(x => x.id === b.dataset.lativa); tenta(() => api.salvarLoja({ ...l, ativa: b.dataset.v === "1" }), b.dataset.v === "1" ? "Loja reativada." : "Loja desativada."); });
  const fl = $("fnovaloja"); if (fl) fl.onsubmit = e => { e.preventDefault(); const n = $("novaloja").value.trim(); if (!n) return toast("Digite o nome da loja."); tenta(() => api.salvarLoja({ nome: n }), "Loja adicionada."); };
  $$("[data-psalvar]").forEach(b => b.onclick = () => { const k = b.dataset.psalvar, v = $$(`[data-preco="${k}"]`)[0].value; if (v === "" || +v < 0) return toast("Digite um valor válido."); tenta(() => api.salvarPreco(k, v), "Preço salvo. Vale para os próximos pedidos."); });
  const fm = $("fmodelo"); if (fm) fm.onsubmit = e => { e.preventDefault(); const n = $("mnome").value.trim(); if (!n) return toast("Digite o nome do modelo."); tenta(() => api.salvarModelo({ nome: n, marca: $("mmarca").value.trim() }), "Modelo adicionado."); };
  $$("[data-mativo]").forEach(b => b.onclick = () => { const m = S.modelos.find(x => x.id === +b.dataset.mativo); tenta(() => api.salvarModelo({ ...m, ativo: b.dataset.v === "1" })); });
  $$("[data-tsalvar]").forEach(b => b.onclick = () => { const t = S.temas.find(x => x.pasta_id === b.dataset.tsalvar); const p = $$(`[data-tpref="${t.pasta_id}"]`)[0].value.toUpperCase().replace(/[^A-Z]/g, ""); if (p.length !== 3) return toast("Use 3 letras."); if (S.temas.some(x => x.prefixo === p && x.pasta_id !== t.pasta_id)) return toast("Outro tema já usa esse prefixo."); tenta(() => api.salvarTema({ ...t, prefixo: p }), "Prefixo salvo."); });
  const acaoM = (id, acao, txt, fim) => { const b = $(id); if (b) b.onclick = async () => { const t = b.textContent; b.disabled = true; b.textContent = txt; try { const r = await api.manutencao(acao); await fim(r); } catch (e) { erroTela(e); } b.disabled = false; b.textContent = t; }; };
  acaoM("mlimpar", "limpar", "Limpando…", async r => { toast(r.fotos_apagadas ? `${r.fotos_apagadas} foto(s) antigas apagadas.` : "Nenhuma foto antiga para apagar."); telaAdmin(); });
  acaoM("mbackup", "backup", "Copiando…", async () => { toast("Cópia de segurança feita."); telaAdmin(); });
  acaoM("mbaixar", "baixar", "Preparando…", async r => { const a = document.createElement("a"); a.href = r.url; a.download = r.nome; document.body.appendChild(a); a.click(); a.remove(); toast("Baixando " + r.nome); });
  const sy = $("sync"); if (sy) sy.onclick = async () => {
    sy.disabled = true; sy.textContent = "Lendo o Drive… pode levar 1 minuto"; $("syncmsg").textContent = "";
    try { const r = await api.sincronizarCatalogo(); await recarregar(true); toast("Catálogo atualizado."); telaAdmin(); setTimeout(() => { if ($("syncmsg")) $("syncmsg").textContent = `${r.estampas} estampas em ${r.temas} temas · ${r.novas} novas · ${r.removidas} saíram${r.demo ? " (modo demonstração: nada foi lido do Drive)" : ""}.`; }, 50); }
    catch (e) { erroTela(e); sy.disabled = false; sy.textContent = "Atualizar catálogo agora"; }
  };
}
