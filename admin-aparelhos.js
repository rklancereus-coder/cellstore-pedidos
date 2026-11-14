/* ---------- ADMINISTRAÇÃO → Aparelhos (catálogo de celulares) ----------
   Os aparelhos ficam no banco; o site /aparelhos lê daqui. Fotos novas vão para o depósito público "aparelhos". */
let aparelhosCache = null;
const AP_CORES = [["", "Neutro"], ["pink", "Rosa"], ["cyan", "Ciano"], ["blue", "Azul"], ["purple", "Roxo"], ["green", "Verde"], ["gold", "Dourado"], ["silver", "Prata"], ["black", "Preto"]];
const apFoto = src => !src ? "" : /^https?:/.test(src) ? src : "aparelhos/" + src;
const apPreco = v => v == null || v === "" ? "" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lerPreco = t => { t = String(t || "").trim(); if (!t) return null; const n = Number(t.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) && n >= 0 ? n : NaN; };

async function secAparelhos() {
  if (!aparelhosCache) aparelhosCache = await api.aparelhos();
  const L = aparelhosCache, ativos = L.filter(a => a.ativo).length;
  return `<section class="admin-sec"><h2>Aparelhos (${ativos} no catálogo${L.length > ativos ? ` · ${L.length - ativos} escondidos` : ""})</h2>
   <p class="lead" style="margin:0">É o que aparece em <a href="aparelhos/" target="_blank" rel="noopener">Catálogo de aparelhos</a>. Preço vazio mostra "Sob consulta". Tirou de linha ou vendeu o último? Desmarque <b>No catálogo</b>: ele some do site, mas continua salvo aqui.</p>
   <div class="acts"><button class="primary" id="apnovo">${ICON.mais} Novo aparelho</button></div>
   <div class="ap-lista">${L.map((a, i) => `<div class="ap-linha ${a.ativo ? "" : "off"}">
     <img src="${esc(apFoto(a.img))}" alt="" loading="lazy">
     <div class="ap-tx"><b>${esc(a.nome)}</b><span class="sub">${esc(a.marca)}${a.tag ? ` · ${a.tag === "5g" ? "5G" : "Novo"}` : ""}${a.categoria === "basico" ? " · Básico" : ""}</span>
      <div class="ap-flags"><label><input type="checkbox" data-apflag="ativo" data-id="${a.id}" ${a.ativo ? "checked" : ""}> No catálogo</label><label><input type="checkbox" data-apflag="popular" data-id="${a.id}" ${a.popular ? "checked" : ""}> Mais procurado</label><label><input type="checkbox" data-apflag="ultimas" data-id="${a.id}" ${a.ultimas ? "checked" : ""}> Últimas unidades</label></div></div>
     <div class="ap-preco"><span>R$</span><input inputmode="decimal" placeholder="Sob consulta" value="${apPreco(a.preco)}" data-appreco="${a.id}" aria-label="Preço do ${esc(a.nome)}"></div>
     <div class="ap-acoes"><button class="soft mini" data-apedit="${a.id}">Editar</button><span><button class="link" data-apsobe="${i}" aria-label="Subir" ${i ? "" : "disabled"}>↑</button><button class="link" data-apdesce="${i}" aria-label="Descer" ${i < L.length - 1 ? "" : "disabled"}>↓</button></span></div>
    </div>`).join("")}</div></section>`;
}

function ligarAparelhos() {
  const salvar = async (a, msg) => { try { await api.salvarAparelho(a); aparelhosCache = null; msg && toast(msg); telaAdmin(); } catch (e) { erroTela(e); } };
  const ap = id => aparelhosCache.find(x => x.id === +id);
  const bn = $("apnovo"); if (bn) bn.onclick = () => editarAparelho(null);
  $$("[data-apedit]").forEach(b => b.onclick = () => editarAparelho(ap(b.dataset.apedit)));
  $$("[data-apflag]").forEach(c => c.onchange = () => { const a = ap(c.dataset.id); salvar({ id: a.id, [c.dataset.apflag]: c.checked }, "Salvo."); });
  $$("[data-appreco]").forEach(inp => inp.onchange = () => {
    const a = ap(inp.dataset.appreco), v = lerPreco(inp.value);
    if (Number.isNaN(v)) { inp.value = apPreco(a.preco); return toast("Digite só o valor, ex.: 1.299,90"); }
    salvar({ id: a.id, preco: v }, v == null ? "Preço tirado: aparece \"Sob consulta\"." : "Preço salvo.");
  });
  const trocar = async (i, j) => { const L = aparelhosCache; const a = L[i], b = L[j]; if (!a || !b) return; try { await api.salvarAparelho({ id: a.id, ordem: b.ordem }); await api.salvarAparelho({ id: b.id, ordem: a.ordem }); aparelhosCache = null; telaAdmin(); } catch (e) { erroTela(e); } };
  $$("[data-apsobe]").forEach(b => b.onclick = () => trocar(+b.dataset.apsobe, +b.dataset.apsobe - 1));
  $$("[data-apdesce]").forEach(b => b.onclick = () => trocar(+b.dataset.apdesce, +b.dataset.apdesce + 1));
}

// reduz a foto (até 900 px, WebP) antes de enviar: o site fica leve no 4G
function prepararFotoAparelho(file) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : falha(new Error("Não consegui ler a foto.")), "image/webp", .86);
    };
    img.onerror = () => falha(new Error("Esse arquivo não parece uma foto."));
    img.src = url;
  });
}

function editarAparelho(a) {
  const novo = !a;
  const d = a ? { ...a, fotos: [...(a.fotos || [])], ficha: (a.ficha || []).map(x => [...x]) } : { marca: "", nome: "", categoria: "smartphone", tag: "", cor: "", img: "", fotos: [], preco: null, destaque: "", ficha: [], popular: false, ultimas: false, ativo: true };
  const fichaTexto = d.ficha.map(([k, v]) => `${k}: ${v}`).join("\n");
  modal(`<div class="cat-topo"><h2>${novo ? "Novo aparelho" : esc(d.nome)}</h2><button class="cat-x" id="apx" aria-label="Fechar">×</button></div>
   <div class="row"><label class="f"><span>Marca</span><input id="apmarca" value="${esc(d.marca)}" placeholder="Ex.: Samsung"></label><label class="f"><span>Nome do aparelho</span><input id="apnome" value="${esc(d.nome)}" placeholder="Ex.: Galaxy A07"></label></div>
   <div class="row"><label class="f"><span>Tipo</span><select id="apcat"><option value="smartphone" ${d.categoria === "smartphone" ? "selected" : ""}>Smartphone</option><option value="basico" ${d.categoria === "basico" ? "selected" : ""}>Celular básico</option></select></label>
    <label class="f"><span>Selo</span><select id="aptag"><option value="">Nenhum</option><option value="5g" ${d.tag === "5g" ? "selected" : ""}>5G</option><option value="novo" ${d.tag === "novo" ? "selected" : ""}>Novo</option></select></label></div>
   <div class="row"><label class="f"><span>Preço <em>(vazio = Sob consulta)</em></span><input id="appreco" inputmode="decimal" value="${apPreco(d.preco)}" placeholder="Ex.: 1.299,90"></label>
    <label class="f"><span>Cor do fundo do cartão</span><select id="apcor">${AP_CORES.map(([v, n]) => `<option value="${v}" ${d.cor === v ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
   <label class="f"><span>Frase de destaque</span><input id="apdest" value="${esc(d.destaque)}" placeholder="Ex.: Bateria gigante e tela de 120 Hz."></label>
   <label class="f"><span>Ficha técnica <em>(uma por linha, "Item: valor"; as 4 primeiras viram o resumo do cartão)</em></span><textarea id="apficha" rows="7" placeholder="Tela: 6,7&quot; · 120 Hz&#10;Bateria: 5000 mAh">${esc(fichaTexto)}</textarea></label>
   <div class="f"><span>Foto principal</span><div class="ap-fotos" id="apimg"></div></div>
   <div class="f"><span>Fotos extras <em>(galeria do aparelho)</em></span><div class="ap-fotos" id="apgal"></div></div>
   <div class="err" id="aperr" hidden></div>
   <div class="nav"><button class="btn soft" id="apvoltar">Voltar</button><button class="btn primary" id="apsalvar">${novo ? "Cadastrar aparelho" : "Salvar"}</button></div>`, () => {
    const enviar = async (input, ao) => {
      const f = input.files && input.files[0]; if (!f) return;
      try { toast("Enviando foto…", 2000); const blob = await prepararFotoAparelho(f); ao(await api.enviarFotoAparelho(blob)); }
      catch (e) { erroTela(e); }
      input.value = "";
    };
    const desenharFotos = () => {
      $("apimg").innerHTML = `${d.img ? `<figure><img src="${esc(apFoto(d.img))}" alt=""></figure>` : ""}<label class="ap-add">${d.img ? "Trocar foto" : "+ Escolher foto"}<input type="file" accept="image/*" id="apimgf" hidden></label>`;
      $("apgal").innerHTML = d.fotos.map((u, i) => `<figure><img src="${esc(apFoto(u))}" alt=""><button type="button" data-aptira="${i}" aria-label="Tirar foto">×</button></figure>`).join("") + `<label class="ap-add">+ Adicionar<input type="file" accept="image/*" id="apgalf" hidden></label>`;
      $("apimgf").onchange = e => enviar(e.target, u => { d.img = u; desenharFotos(); });
      $("apgalf").onchange = e => enviar(e.target, u => { d.fotos.push(u); desenharFotos(); });
      $$("[data-aptira]").forEach(b => b.onclick = () => { d.fotos.splice(+b.dataset.aptira, 1); desenharFotos(); });
    };
    desenharFotos();
    $("apx").onclick = $("apvoltar").onclick = fecharModal;
    $("apsalvar").onclick = async () => {
      const erro = m => { $("aperr").textContent = m; $("aperr").hidden = false; };
      const preco = lerPreco($("appreco").value);
      if (!$("apnome").value.trim()) return erro("Digite o nome do aparelho.");
      if (Number.isNaN(preco)) return erro("Preço inválido. Digite só o valor, ex.: 1.299,90 (ou deixe vazio).");
      if (!d.img) return erro("Escolha a foto principal.");
      const ficha = $("apficha").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ""]; });
      const dados = { marca: $("apmarca").value.trim(), nome: $("apnome").value.trim(), categoria: $("apcat").value, tag: $("aptag").value, cor: $("apcor").value, destaque: $("apdest").value.trim(), preco, ficha, img: d.img, fotos: d.fotos };
      if (novo) dados.ordem = Math.max(0, ...aparelhosCache.map(x => x.ordem)) + 10; else dados.id = d.id;
      const b = $("apsalvar"); b.disabled = true; b.textContent = "Salvando…";
      try { await api.salvarAparelho(dados); aparelhosCache = null; fecharModal(); toast(novo ? "Aparelho cadastrado. Já aparece no catálogo." : "Aparelho salvo."); telaAdmin(); }
      catch (e) { erro(e.message); b.disabled = false; b.textContent = novo ? "Cadastrar aparelho" : "Salvar"; }
    };
  }, "box-ap");
}
