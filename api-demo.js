/* ---------- MODO DEMONSTRAÇÃO ----------
   Simula o servidor no próprio navegador, com as mesmas regras do banco
   (preço vem da tabela, loja só vê os seus pedidos, logística sem dados do cliente).
   Usuários de teste: loja01…loja07 e lojaon (senha 1234), fabrica (fabrica),
   logistica (logistica), admin (admin). */
function criarApiDemo() {
  const KEY = "cellstore-sistema-demo-v2";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  let db = (() => { try { const r = ls.get(KEY); if (r) return JSON.parse(r); } catch (e) { } return null; })() || semente();
  const gravar = () => { if (!ls.set(KEY, JSON.stringify(db))) console.warn("demo: não salvou no navegador"); };
  const ouvintes = [];
  const avisar = () => { gravar(); ouvintes.forEach(f => setTimeout(f, 0)); };
  addEventListener("storage", e => { if (e.key === KEY) { try { db = JSON.parse(e.newValue); ouvintes.forEach(f => f()); } catch (er) { } } });

  function semente() {
    const nomes = ["Loja ON", "Loja 01", "Loja 02", "Loja 03", "Loja 04", "Loja 05", "Loja 06", "Loja 07"];
    const lojas = nomes.map((n, i) => ({ id: "L" + i, nome: n, ativa: true, ordem: i }));
    const usuarios = [
      ...lojas.map(l => ({ id: uid(), usuario: l.nome === "Loja ON" ? "lojaon" : "loja" + l.nome.slice(-2), senha: "1234", nome: l.nome, papel: "loja", loja_id: l.id, ativo: true })),
      { id: uid(), usuario: "fabrica", senha: "fabrica", nome: "Fábrica", papel: "fabrica", loja_id: null, ativo: true },
      { id: uid(), usuario: "logistica", senha: "logistica", nome: "Logística", papel: "logistica", loja_id: null, ativo: true },
      { id: uid(), usuario: "admin", senha: "admin", nome: "Administrador", papel: "admin", loja_id: null, ativo: true }];
    const modelos = ["iPhone 11", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 15 Pro Max", "iPhone 16", "Galaxy A03", "Galaxy A05s", "Galaxy A15", "Galaxy A25", "Galaxy A55", "Galaxy S24", "Moto G24", "Moto G54", "Moto G84", "Redmi 13C", "Redmi Note 13"]
      .map((n, i) => ({ id: i + 1, nome: n, marca: n.split(" ")[0], ativo: true }));
    const cat = window.DEMO_CATALOGO;
    const temas = cat.temas.map((n, i) => ({ pasta_id: "T" + i, nome: n, prefixo: cat.prefixos[i], ativo: true, ordem: i }));
    const t = hoje();
    const base = { vendedor: "", cliente: "", whats: "", celular: "", codigo: null, arquivo_id: null, texto_nome: null, foto_path: null, foto_whats: false, foto_alerta: false, qtd: 1, urgente: false, obs: "", visto_fabrica: true, editado: false, origem_lisa: "loja", romaneio_id: null, criado_em: new Date().toISOString() };
    const ex = [
      { loja_id: "L3", vendedor: "Juliana", cliente: "Ana Paula", whats: "(11) 98877-1122", produto: "aveludada", celular: "iPhone 15", pers: "foto", foto_whats: true, data_pedido: addDias(t, -1), entrega: addDias(t, 2), status: "producao", obs: "Foto do casal, centralizar os rostos", origem_lisa: "logistica", producao_em: new Date().toISOString() },
      { loja_id: "L1", vendedor: "Marcos", cliente: "Rafael", whats: "(11) 97766-3344", produto: "transparente", celular: "Galaxy A55", pers: "nome", codigo: "FLO-004", texto_nome: "RAFA 10", data_pedido: t, entrega: addDias(t, 3), status: "recebido", visto_fabrica: false },
      { loja_id: "L6", vendedor: "Bia", cliente: "Dona Cida", produto: "transparente", celular: "Moto G84", pers: "catalogo", codigo: "FLO-007", qtd: 2, data_pedido: t, entrega: addDias(t, 1), status: "recebido", urgente: true, visto_fabrica: false, origem_lisa: "logistica" },
      { loja_id: "L3", vendedor: "Juliana", cliente: "Lucas", whats: "(11) 95544-0099", produto: "popsocket", pers: "nome", codigo: "PET-005", texto_nome: "Lucas", data_pedido: addDias(t, -3), entrega: t, status: "pronto", origem_lisa: null, pronto_em: new Date().toISOString() }];
    const pedidos = ex.map((e, i) => {
      const p = { ...base, ...e, id: i + 1, exemplo: true };
      const it = cat.itens.find(x => normCod(x[0]) === normCod(p.codigo)); if (it) { p.codigo = it[0]; p.arquivo_id = it[1]; }
      p.valor_unit = p.produto === "popsocket" ? 20 : { foto: 45, nome: 35, catalogo: 30 }[p.pers]; p.valor_total = p.valor_unit * p.qtd;
      return p;
    });
    const compras = [{ pedido_id: 1, cor: "Vermelha", precisa_ate: addDias(t, 1), status: "comprado", visto: true, pedido_em: addDias(t, -1) },
    { pedido_id: 3, cor: "Transparente", precisa_ate: t, status: "pendente", visto: false, pedido_em: t }];
    return { seq: pedidos.length, seqRom: 0, lojas, usuarios, modelos, temas, precos: { foto: 45, nome: 35, catalogo: 30, popsocket: 20 }, pedidos, compras, romaneios: [], fotos: {}, sessao: null };
  }

  // ---- metas (demonstração): vendedores, metas e fechamentos de exemplo do mês atual ----
  function sementeMetas() {
    let sd = 20261114; const rnd = () => { sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const PL = [[["Camila", 1.05, 1], ["Diego", .95, 1.02]], [["Juliana", 1.02, 1.1], ["Rafael", .8, .7]], [["Patrícia", 1.4, .8], ["Marcos", 1, 1]], [["Fernanda", 1.35, 1.4], ["Lucas", .9, .95]],
      [["Aline", 1, 1.08], ["Gustavo", .85, .9], ["Thiago", .25, .3, 1]], [["Bruna", 1.1, 1], ["Felipe", .3, .35]], [["Larissa", 1, 1.05], ["Rodrigo", .95, .9]], [["Vanessa", 1, .95], ["Eduardo", 1.05, 1]]];
    const atraso = { L5: 1, L7: 2 }, mes = hoje().slice(0, 7) + "-01";
    const ant = (() => { const [a, b] = mes.split("-").map(Number), d = new Date(a, b - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; })();
    const m = { vendedores: [], metasLoja: [], metasVend: [], cal: [], calLoja: [], fech: [], valores: [], corr: [], vistos: [],
      config: [["amarelo_pts", 10, "Até quantos pontos abaixo do ritmo ideal fica amarelo (acima disso, vermelho)"], ["risco_mult", 1.5, "Vendedor em risco: meta diária restante maior que X vezes a normal"], ["acima_pts", 15, "Vendedor muito acima: pontos acima do ritmo ideal"], ["acima_proj", 1.2, "Vendedor muito acima: projeção acima de X (1,2 = 120%)"], ["queda_fator", .5, "Queda de ritmo: média dos últimos 5 dias abaixo de X vezes a média anterior"], ["deseq_pts", 20, "Desequilíbrio: diferença em pontos entre Assistência e Vendas"], ["fora_media_mult", 4, "Possível erro de digitação: lançamento maior que X vezes a média"], ["silencio_dias", 5, "Sem alertas de ritmo nos primeiros X dias do mês"], ["proj_loja", .85, "Loja em vermelho: projeção abaixo de X"], ["proj_rede", .9, "Rede em vermelho: projeção abaixo de X"], ["reta_final_dias", 5, "Reta final: faltando X dias de venda"], ["repetir_dias", 7, "Aviso visto volta depois de X dias (ou antes, se piorar)"]].map(([chave, valor, descricao]) => ({ chave, valor, descricao })) };
    const dias = []; for (let d = mes; d < hoje(); d = addDias(d, 1)) if (new Date(d + "T12:00:00").getDay() !== 0) dias.push(d);
    PL.forEach((vs, li) => {
      const loja_id = "L" + li;
      [mes, ant].forEach(x => m.metasLoja.push({ mes: x, loja_id, assistencia: 40000, vendas: 80000 }));
      const meus = dias.slice(0, Math.max(0, dias.length - (atraso[loja_id] || 0)));
      vs.forEach(([nome, fa, fv, semMeta], i) => {
        const v = { id: "V" + li + i, loja_id, nome, ordem: i, ativo: true }; m.vendedores.push(v);
        if (!semMeta) [mes, ant].forEach(x => m.metasVend.push({ mes: x, vendedor_id: v.id, assistencia: 20000, vendas: 40000 }));
        meus.forEach((dia, k) => {
          const queda = nome === "Eduardo" && k >= meus.length - 5 ? .3 : 1;
          const a = Math.round(20000 / 26 * fa * (.5 + rnd()) * queda / 10) * 10; let vv = Math.round(40000 / 26 * fv * (.5 + rnd()) * queda / 10) * 10;
          if (nome === "Rodrigo" && k === meus.length - 3) vv *= 9;
          m.valores.push({ fid: loja_id + dia, vendedor_id: v.id, assistencia: a, vendas: vv });
        });
      });
      meus.forEach(dia => m.fech.push({ id: loja_id + dia, loja_id, dia, status: "fechado", fechado_em: dia + "T21:00:00Z", reaberto_em: null }));
      if (li === 3 && meus.length > 3) {
        const f = m.fech.find(x => x.id === loja_id + meus[meus.length - 3]); f.reaberto_em = new Date().toISOString();
        const val = m.valores.find(x => x.fid === f.id && x.vendedor_id === "V31");
        m.corr.push({ fechamento_id: f.id, vendedor_id: "V31", campo: "vendas", antes: val.vendas + 900, depois: val.vendas, em: new Date().toISOString() });
      }
    });
    return m;
  }
  if (!db.metas) db.metas = sementeMetas();
  if (!db.usuarios.some(u => u.papel === "dona")) db.usuarios.push({ id: uid(), usuario: "dona", senha: "dona", nome: "Dona da rede", papel: "dona", loja_id: null, ativo: true });
  const eu = () => db.usuarios.find(u => u.id === db.sessao && u.ativo) || null;
  const exigir = (...papeis) => { const u = eu(); if (!u) throw new Error("Faça login novamente."); if (papeis.length && !papeis.includes(u.papel)) throw new Error("Você não tem acesso a isso."); return u; };
  const perfil = u => u && ({ id: u.id, usuario: u.usuario, nome: u.nome, papel: u.papel, loja_id: u.loja_id });
  const comCompra = p => ({ ...p, compra: db.compras.find(c => c.pedido_id === p.id) || null });
  const agora = () => new Date().toISOString();
  const marcaEtapa = (p, s) => { const k = { producao: "producao_em", pronto: "pronto_em", enviado: "enviado_em", na_loja: "na_loja_em", entregue: "entregue_em" }[s]; if (k) p[k] = agora(); };

  return {
    modo: "demo",
    async sessao() { return perfil(eu()); },
    async logins() { const o = { loja: 0, fabrica: 1, logistica: 2, dona: 3, admin: 4 }; return db.usuarios.filter(u => u.ativo).sort((a, b) => o[a.papel] - o[b.papel] || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })).map(u => ({ usuario: u.usuario, nome: u.nome, papel: u.papel })); },
    async entrar(usuario, senha) {
      const u = db.usuarios.find(x => x.usuario === String(usuario).trim().toLowerCase());
      if (!u || u.senha !== senha) throw new Error("Usuário ou senha incorretos.");
      if (!u.ativo) throw new Error("Este acesso está desativado. Fale com a fábrica.");
      db.sessao = u.id; gravar(); return perfil(u);
    },
    async sair() { db.sessao = null; gravar(); },
    async base() { exigir(); return { lojas: db.lojas, precos: db.precos, modelos: db.modelos, temas: db.temas }; },
    async temasCatalogo() { return db.temas; },
    async maisPedidas() { return []; },
    async modelosPublicos() { return db.modelos; },
    async enviarFotoSos() { return ""; },
    async salvarCapa() { throw new Error("No modo demonstração a capa não é salva."); },
    async contarEstampas() { return window.DEMO_CATALOGO.itens.length; },
    async catalogo() {
      const c = window.DEMO_CATALOGO; // catálogo é público (vitrine), como no servidor
      return c.itens.map(([codigo, arquivo_id, t]) => ({ codigo, arquivo_id, tema: c.temas[t], pasta_id: "T" + t, ativo: true }));
    },
    async pedidos() {
      const u = exigir("loja", "fabrica", "admin");
      return db.pedidos.filter(p => u.papel !== "loja" || p.loja_id === u.loja_id).map(comCompra);
    },
    async salvarPedido({ id, dados, compra, foto }) {
      const u = exigir("loja", "fabrica", "admin");
      let p;
      if (id) {
        p = db.pedidos.find(x => x.id === id);
        if (!p || (u.papel === "loja" && p.loja_id !== u.loja_id)) throw new Error("Pedido não encontrado.");
        if (u.papel === "loja" && p.status !== "recebido") throw new Error("Este pedido já entrou em produção. Fale com a fábrica para mudar.");
        Object.assign(p, dados, { editado: true, visto_fabrica: false });
      } else {
        p = { ...dados, id: ++db.seq, loja_id: u.papel === "loja" ? u.loja_id : dados.loja_id, status: "recebido", visto_fabrica: false, editado: false, romaneio_id: null, data_pedido: hoje(), criado_em: agora() };
        db.pedidos.push(p);
      }
      if (foto && foto.blob) {
        const path = `${p.loja_id}/${uid()}.jpg`;
        db.fotos[path] = foto.previa; p.foto_path = path;
      } else if (foto === null) p.foto_path = null;
      if (p.produto === "popsocket") { p.origem_lisa = null; p.celular = ""; }
      p.valor_unit = p.produto === "popsocket" ? db.precos.popsocket : db.precos[p.pers];
      p.valor_total = p.valor_unit * p.qtd;
      const c = db.compras.findIndex(x => x.pedido_id === p.id);
      if (compra) {
        const antigo = c >= 0 ? db.compras[c] : null;
        const novo = { pedido_id: p.id, cor: compra.cor, precisa_ate: compra.precisa_ate, status: antigo ? antigo.status : "pendente", pedido_em: antigo ? antigo.pedido_em : hoje(), visto: false };
        c >= 0 ? db.compras[c] = novo : db.compras.push(novo);
      } else if (c >= 0) db.compras.splice(c, 1);
      avisar(); return comCompra(p);
    },
    async mudarStatus(ids, status) {
      const u = exigir("loja", "fabrica", "admin");
      for (const id of ids) {
        const p = db.pedidos.find(x => x.id === id); if (!p) continue;
        if (u.papel === "loja") {
          const ok = p.loja_id === u.loja_id && ((p.status === "enviado" && status === "na_loja") || (p.status === "na_loja" && status === "entregue") || (p.status === "recebido" && status === "cancelado"));
          if (!ok) throw new Error("A loja não pode mudar o pedido para este status.");
        }
        if (p.status !== status) { p.status = status; marcaEtapa(p, status); }
        if (u.papel !== "loja") p.visto_fabrica = true;
      }
      avisar();
    },
    async vistoFabrica(id) { exigir("fabrica", "admin"); const p = db.pedidos.find(x => x.id === id); if (p) { p.visto_fabrica = true; avisar(); } },
    async comprasLogistica() {
      exigir("logistica", "fabrica", "admin");
      return db.compras.map(c => { const p = db.pedidos.find(x => x.id === c.pedido_id) || {}; return { ...c, produto: p.produto, celular: p.celular, qtd: p.qtd, urgente: p.urgente, status_pedido: p.status, loja: (db.lojas.find(l => l.id === p.loja_id) || {}).nome, exemplo: p.exemplo }; });
    },
    async mudarCompra(ids, status) { exigir("logistica", "fabrica", "admin"); ids.forEach(id => { const c = db.compras.find(x => x.pedido_id === id); if (c) { c.status = status; c.visto = true; } }); avisar(); },
    async vistoCompra(id) { exigir("logistica", "fabrica", "admin"); const c = db.compras.find(x => x.pedido_id === id); if (c) { c.visto = true; avisar(); } },
    async romaneios() { const u = exigir("loja", "fabrica", "admin"); return db.romaneios.filter(r => u.papel !== "loja" || r.loja_id === u.loja_id); },
    async criarRomaneio(loja_id, ids) {
      exigir("fabrica", "admin");
      const r = { id: ++db.seqRom, loja_id, criado_em: agora(), recebido_em: null };
      db.romaneios.push(r);
      ids.forEach(id => { const p = db.pedidos.find(x => x.id === id); if (p) { p.status = "enviado"; p.romaneio_id = r.id; marcaEtapa(p, "enviado"); p.visto_fabrica = true; } });
      avisar(); return r;
    },
    async receberRomaneio(id) {
      const u = exigir("loja", "fabrica", "admin");
      const r = db.romaneios.find(x => x.id === id); if (!r || (u.papel === "loja" && r.loja_id !== u.loja_id)) throw new Error("Romaneio não encontrado.");
      r.recebido_em = agora();
      db.pedidos.filter(p => p.romaneio_id === id && p.status === "enviado").forEach(p => { p.status = "na_loja"; marcaEtapa(p, "na_loja"); });
      avisar();
    },
    async conversas() { exigir("fabrica", "admin"); return []; },
    async mensagens() { return []; },
    async waAcao() { throw new Error("No modo demonstração o WhatsApp não está ligado."); },
    async fotoUrl(path) { exigir(); const f = db.fotos[path]; if (!f) throw new Error("Foto não encontrada."); return f; },
    ouvir(f) { ouvintes.push(f); },
    // administração
    async usuarios(acao, d = {}) {
      const u = exigir("admin");
      if (acao === "listar") return db.usuarios.map(x => ({ id: x.id, usuario: x.usuario, nome: x.nome, papel: x.papel, loja_id: x.loja_id, ativo: x.ativo }));
      if (acao === "criar") {
        const usuario = semAcento(d.usuario).replace(/[^a-z0-9._-]/g, "");
        if (usuario.length < 3) throw new Error("O usuário precisa ter pelo menos 3 letras ou números.");
        if (db.usuarios.some(x => x.usuario === usuario)) throw new Error("Já existe um usuário com esse nome.");
        if (String(d.senha || "").length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        if (d.papel === "loja" && !d.loja_id) throw new Error("Escolha a loja deste usuário.");
        db.usuarios.push({ id: uid(), usuario, senha: d.senha, nome: d.nome || usuario, papel: d.papel, loja_id: d.papel === "loja" ? d.loja_id : null, ativo: true });
      }
      if (acao === "senha") { if (String(d.senha || "").length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres."); db.usuarios.find(x => x.id === d.id).senha = d.senha; }
      if (acao === "ativo") { if (d.id === u.id && !d.ativo) throw new Error("Você não pode desativar o seu próprio acesso."); db.usuarios.find(x => x.id === d.id).ativo = !!d.ativo; }
      avisar(); return { ok: true };
    },
    async salvarPreco(chave, valor) { exigir("admin"); db.precos[chave] = Number(valor); avisar(); },
    async salvarModelo(m) {
      exigir("admin");
      if (m.id) Object.assign(db.modelos.find(x => x.id === m.id), m);
      else { if (db.modelos.some(x => semAcento(x.nome) === semAcento(m.nome))) throw new Error("Esse modelo já está na lista."); db.modelos.push({ id: Math.max(0, ...db.modelos.map(x => x.id)) + 1, nome: m.nome.trim(), marca: m.marca || "", ativo: true }); }
      avisar();
    },
    async salvarLoja(l) {
      exigir("admin");
      if (l.id) Object.assign(db.lojas.find(x => x.id === l.id), l);
      else { if (db.lojas.some(x => semAcento(x.nome) === semAcento(l.nome))) throw new Error("Já existe uma loja com esse nome."); db.lojas.push({ id: "L" + uid().slice(0, 6), nome: l.nome.trim(), ativa: true, ordem: db.lojas.length }); }
      avisar();
    },
    async salvarTema(t) { exigir("admin"); Object.assign(db.temas.find(x => x.pasta_id === t.pasta_id), t); avisar(); },
    async aparelhos() { exigir("admin"); return []; },
    async salvarAparelho() { exigir("admin"); throw new Error("No modo demonstração os aparelhos não são salvos."); },
    async enviarFotoAparelho() { throw new Error("No modo demonstração não há onde guardar fotos."); },
    async inscreverPush() { throw new Error("No modo demonstração não há avisos no celular."); },
    async testePush() { },
    async usoEspaco() { exigir("admin"); return { banco_bytes: 9e6, fotos_bytes: 0, fotos_qtd: 0, backups_bytes: 0, ultimo_backup: null, fotos_para_limpar: 0 }; },
    async manutencao() { exigir("admin"); throw new Error("No modo demonstração não há servidor para limpar ou copiar."); },
    async sincronizarCatalogo() { exigir("admin"); await new Promise(r => setTimeout(r, 600)); return { temas: db.temas.length, estampas: window.DEMO_CATALOGO.itens.length, novas: 0, removidas: 0, demo: true }; },
    // metas: mesmas regras do banco (metas.sql)
    async metasMes(mes) {
      const u = exigir("loja", "dona", "admin"), M = db.metas, fim = addDias(mtMesMais(mes, 1), -1), noMes = d => d >= mes && d <= fim;
      const vejo = l => u.papel !== "loja" || l === u.loja_id, vendLoja = id => (M.vendedores.find(v => v.id === id) || {}).loja_id;
      const fech = M.fech.filter(f => noMes(f.dia) && vejo(f.loja_id)), ids = new Set(fech.map(f => f.id));
      return { vendedores: M.vendedores.filter(v => vejo(v.loja_id)), metasLoja: M.metasLoja.filter(x => x.mes === mes && vejo(x.loja_id)), metasVend: M.metasVend.filter(x => x.mes === mes && vejo(vendLoja(x.vendedor_id))),
        cal: M.cal.filter(c => noMes(c.dia)), calLoja: M.calLoja.filter(c => noMes(c.dia) && vejo(c.loja_id)), fech,
        lanc: M.valores.filter(x => ids.has(x.fid)).map(x => { const f = fech.find(y => y.id === x.fid); return { loja_id: f.loja_id, dia: f.dia, status: f.status, vendedor_id: x.vendedor_id, assistencia: x.assistencia, vendas: x.vendas }; }),
        corr: M.corr.filter(c => ids.has(c.fechamento_id)), config: M.config, vistos: M.vistos.filter(v => v.perfil_id === u.id), proximoTemMetas: M.metasLoja.some(x => x.mes === mtMesMais(mes, 1)) };
    },
    async fecharDia(loja, dia, valores) {
      const u = exigir("loja", "dona", "admin"), rede = u.papel !== "loja", M = db.metas;
      if (!rede && loja !== u.loja_id) throw new Error("Só dá para lançar o fechamento da sua loja.");
      if (dia > hoje()) throw new Error("Esse dia ainda não chegou.");
      let f = M.fech.find(x => x.loja_id === loja && x.dia === dia);
      if (f && f.status === "fechado" && !rede) throw new Error("Esse dia já está fechado. Só a dona pode reabrir.");
      const jaFechado = f && (f.status === "fechado" || f.reaberto_em);
      if (!f) { f = { id: loja + dia, loja_id: loja, dia, status: "aberto", fechado_em: null, reaberto_em: null }; M.fech.push(f); }
      for (const x of valores) {
        if ((M.vendedores.find(v => v.id === x.vendedor_id) || {}).loja_id !== loja) throw new Error("Vendedor não é desta loja.");
        let val = M.valores.find(y => y.fid === f.id && y.vendedor_id === x.vendedor_id);
        if (jaFechado) ["assistencia", "vendas"].forEach(k => { const antes = val ? val[k] : 0; if (antes !== x[k]) M.corr.push({ fechamento_id: f.id, vendedor_id: x.vendedor_id, campo: k, antes, depois: x[k], em: new Date().toISOString() }); });
        if (!val) { val = { fid: f.id, vendedor_id: x.vendedor_id }; M.valores.push(val); }
        val.assistencia = x.assistencia; val.vendas = x.vendas;
      }
      f.status = "fechado"; f.fechado_em = new Date().toISOString(); avisar(); return f.id;
    },
    async reabrirDia(loja, dia) { exigir("dona", "admin"); const f = db.metas.fech.find(x => x.loja_id === loja && x.dia === dia && x.status === "fechado"); if (!f) throw new Error("Esse dia não está fechado."); f.status = "aberto"; f.reaberto_em = new Date().toISOString(); avisar(); },
    async copiarMetas(de, para) {
      exigir("dona", "admin"); const M = db.metas; let n = 0;
      M.metasLoja.filter(x => x.mes === de).forEach(x => { if (!M.metasLoja.some(y => y.mes === para && y.loja_id === x.loja_id)) { M.metasLoja.push({ ...x, mes: para }); n++; } });
      M.metasVend.filter(x => x.mes === de && (M.vendedores.find(v => v.id === x.vendedor_id) || {}).ativo).forEach(x => { if (!M.metasVend.some(y => y.mes === para && y.vendedor_id === x.vendedor_id)) { M.metasVend.push({ ...x, mes: para }); n++; } });
      avisar(); return n;
    },
    async salvarVendedor(v) { exigir("dona", "admin"); const M = db.metas; if (v.id) Object.assign(M.vendedores.find(x => x.id === v.id), v); else M.vendedores.push({ id: "V" + uid().slice(0, 8), ativo: true, ordem: 0, ...v }); avisar(); },
    async salvarMetaLoja(mes, loja_id, a, v) { exigir("dona", "admin"); const M = db.metas, x = M.metasLoja.find(y => y.mes === mes && y.loja_id === loja_id); if (x) { x.assistencia = a; x.vendas = v; } else M.metasLoja.push({ mes, loja_id, assistencia: a, vendas: v }); avisar(); },
    async salvarMetaVendedor(mes, vendedor_id, m) { exigir("dona", "admin"); const M = db.metas; M.metasVend = M.metasVend.filter(y => !(y.mes === mes && y.vendedor_id === vendedor_id)); if (m) M.metasVend.push({ mes, vendedor_id, assistencia: m.a, vendas: m.v }); avisar(); },
    async salvarCalendario(dia, aberto) { exigir("dona", "admin"); const M = db.metas; M.cal = M.cal.filter(c => c.dia !== dia); M.cal.push({ dia, aberto }); avisar(); },
    async salvarConfigMetas(chave, valor) { exigir("dona", "admin"); db.metas.config.find(c => c.chave === chave).valor = valor; avisar(); },
    async marcarVisto(chave, gravidade) { const u = exigir("loja", "dona", "admin"), M = db.metas; M.vistos = M.vistos.filter(v => !(v.perfil_id === u.id && v.chave === chave)); M.vistos.push({ perfil_id: u.id, chave, gravidade, visto_em: new Date().toISOString() }); gravar(); },
    async zerarDemo() { db = semente(); db.metas = sementeMetas(); db.usuarios.push({ id: uid(), usuario: "dona", senha: "dona", nome: "Dona da rede", papel: "dona", loja_id: null, ativo: true }); db.sessao = null; gravar(); }
  };
}
