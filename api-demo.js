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

  const eu = () => db.usuarios.find(u => u.id === db.sessao && u.ativo) || null;
  const exigir = (...papeis) => { const u = eu(); if (!u) throw new Error("Faça login novamente."); if (papeis.length && !papeis.includes(u.papel)) throw new Error("Você não tem acesso a isso."); return u; };
  const perfil = u => u && ({ id: u.id, usuario: u.usuario, nome: u.nome, papel: u.papel, loja_id: u.loja_id });
  const comCompra = p => ({ ...p, compra: db.compras.find(c => c.pedido_id === p.id) || null });
  const agora = () => new Date().toISOString();
  const marcaEtapa = (p, s) => { const k = { producao: "producao_em", pronto: "pronto_em", enviado: "enviado_em", na_loja: "na_loja_em", entregue: "entregue_em" }[s]; if (k) p[k] = agora(); };

  return {
    modo: "demo",
    async sessao() { return perfil(eu()); },
    async logins() { const o = { loja: 0, fabrica: 1, logistica: 2, admin: 3 }; return db.usuarios.filter(u => u.ativo).sort((a, b) => o[a.papel] - o[b.papel] || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })).map(u => ({ usuario: u.usuario, nome: u.nome, papel: u.papel })); },
    async entrar(usuario, senha) {
      const u = db.usuarios.find(x => x.usuario === String(usuario).trim().toLowerCase());
      if (!u || u.senha !== senha) throw new Error("Usuário ou senha incorretos.");
      if (!u.ativo) throw new Error("Este acesso está desativado. Fale com a fábrica.");
      db.sessao = u.id; gravar(); return perfil(u);
    },
    async sair() { db.sessao = null; gravar(); },
    async base() { exigir(); return { lojas: db.lojas, precos: db.precos, modelos: db.modelos, temas: db.temas }; },
    async temasCatalogo() { return db.temas; },
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
    async zerarDemo() { db = semente(); db.sessao = null; gravar(); }
  };
}
