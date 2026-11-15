/* ---------- SERVIDOR DE VERDADE (Supabase) ----------
   Mesmas funções do modo demonstração. A segurança fica no banco (schema.sql):
   aqui só pedimos os dados; o banco decide o que cada usuário pode ver e mudar. */
function criarApiSupabase(cfg) {
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const ok = ({ data, error }) => { if (error) throw traduzir(error); return data; };
  function traduzir(e) {
    const m = String(e.message || e);
    if (/Invalid login credentials/i.test(m)) return new Error("Usuário ou senha incorretos.");
    if (/banned|disabled/i.test(m)) return new Error("Este acesso está desativado. Fale com a fábrica.");
    if (/JWT|session/i.test(m)) return new Error("Sua sessão expirou. Entre de novo.");
    if (/row-level security|permission denied/i.test(m)) return new Error("Você não tem permissão para isso.");
    if (/Failed to fetch|NetworkError/i.test(m)) return new Error("Sem conexão com a internet. Tente de novo.");
    return new Error(m);
  }
  async function perfilAtual() {
    const { data } = await sb.auth.getUser();
    if (!data || !data.user) return null;
    const p = ok(await sb.from("perfis").select("id, usuario, nome, papel, loja_id, ativo").eq("id", data.user.id).maybeSingle());
    if (!p || !p.ativo) { await sb.auth.signOut(); return null; }
    return p;
  }
  async function funcao(nome, corpo) {
    const { data, error } = await sb.functions.invoke(nome, { body: corpo });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) { }
      throw new Error(msg);
    }
    if (data && data.erro) throw new Error(data.erro);
    return data;
  }
  const CAMPOS = "*, compra:compras(*)";
  const umaCompra = p => ({ ...p, compra: Array.isArray(p.compra) ? (p.compra[0] || null) : p.compra });

  return {
    modo: "supabase",
    async sessao() { return perfilAtual(); },
    async logins() { return ok(await sb.rpc("logins_ativos")); },
    async entrar(usuario, senha) {
      const u = String(usuario).trim().toLowerCase();
      ok(await sb.auth.signInWithPassword({ email: u.includes("@") ? u : `${u}@${cfg.dominioLogin}`, password: senha }));
      const p = await perfilAtual();
      if (!p) throw new Error("Este acesso está desativado ou sem cadastro. Fale com a fábrica.");
      return p;
    },
    async sair() { await sb.auth.signOut(); },
    async base() {
      const [lojas, precos, modelos, temas] = await Promise.all([
        sb.from("lojas").select("*").order("ordem").order("nome"),
        sb.from("precos").select("*"),
        sb.from("modelos").select("*").order("nome"),
        sb.from("temas").select("*").order("ordem"),
      ]);
      return { lojas: ok(lojas), precos: Object.fromEntries(ok(precos).map(p => [p.chave, Number(p.valor)])), modelos: ok(modelos), temas: ok(temas) };
    },
    async catalogo() {
      const todos = []; let de = 0;
      for (;;) { const lote = ok(await sb.from("catalogo").select("codigo, arquivo_id, tema, pasta_id, ativo").range(de, de + 999)); todos.push(...lote); if (lote.length < 1000) break; de += 1000; }
      return todos;
    },
    // catálogo público (funciona sem login: o banco libera só as estampas e coleções ativas)
    async temasCatalogo() { return ok(await sb.from("temas").select("pasta_id, nome, prefixo, ordem, nome_exibicao, ativo, capa").order("ordem")); },
    // SOS Celular (sem login): lista de modelos e envio da foto do estrago (depósito público "sos")
    async modelosPublicos() { return ok(await sb.from("modelos").select("id, nome, marca, ativo").eq("ativo", true).order("nome")); },
    async enviarFotoSos(blob) {
      const dia = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const path = `${dia}/${crypto.randomUUID()}.jpg`;
      ok(await sb.storage.from("sos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
      return sb.storage.from("sos").getPublicUrl(path).data.publicUrl;
    },
    async maisPedidas() { return ok(await sb.rpc("mais_pedidas", { limite: 12 })); },
    async salvarCapa(prefixo, capa) { ok(await sb.from("temas").update({ capa }).eq("prefixo", prefixo)); },
    async contarEstampas() { const { count, error } = await sb.from("catalogo").select("codigo", { count: "exact", head: true }).eq("ativo", true); if (error) throw traduzir(error); return count; },
    async pedidos() {
      const todos = []; let de = 0;
      const desde = addDias(hoje(), -400); // pedidos dos últimos ~13 meses
      for (;;) { const lote = ok(await sb.from("pedidos").select(CAMPOS).gte("data_pedido", desde).order("id", { ascending: false }).range(de, de + 999)); todos.push(...lote.map(umaCompra)); if (lote.length < 1000) break; de += 1000; }
      return todos;
    },
    async salvarPedido({ id, dados, compra, foto }) {
      const perfil = await perfilAtual();
      const d = { ...dados };
      if (foto && foto.blob) {
        const loja = perfil.papel === "loja" ? perfil.loja_id : d.loja_id;
        const path = `${loja}/${crypto.randomUUID()}.jpg`;
        ok(await sb.storage.from("fotos").upload(path, foto.blob, { contentType: "image/jpeg", upsert: false }));
        d.foto_path = path;
      } else if (foto === null) d.foto_path = null;
      const p = id ? ok(await sb.from("pedidos").update(d).eq("id", id).select("*").single())
                   : ok(await sb.from("pedidos").insert(d).select("*").single());
      if (compra) ok(await sb.from("compras").upsert({ pedido_id: p.id, cor: compra.cor, precisa_ate: compra.precisa_ate }, { onConflict: "pedido_id" }));
      else if (id) ok(await sb.from("compras").delete().eq("pedido_id", p.id));
      return umaCompra(ok(await sb.from("pedidos").select(CAMPOS).eq("id", p.id).single()));
    },
    async mudarStatus(ids, status) {
      const extra = ["fabrica", "admin"].includes(papel()) ? { visto_fabrica: true } : {};
      ok(await sb.from("pedidos").update({ status, ...extra }).in("id", ids));
    },
    async vistoFabrica(id) { ok(await sb.from("pedidos").update({ visto_fabrica: true }).eq("id", id)); },
    async comprasLogistica() { return ok(await sb.from("compras_logistica").select("*")); },
    async mudarCompra(ids, status) { ok(await sb.from("compras").update({ status, visto: true }).in("pedido_id", ids)); },
    async vistoCompra(id) { ok(await sb.from("compras").update({ visto: true }).eq("pedido_id", id)); },
    async romaneios() { return ok(await sb.from("romaneios").select("*").order("id", { ascending: false }).limit(200)); },
    async criarRomaneio(loja_id, ids) {
      const r = ok(await sb.from("romaneios").insert({ loja_id }).select("*").single());
      ok(await sb.from("pedidos").update({ status: "enviado", romaneio_id: r.id, visto_fabrica: true }).in("id", ids));
      return r;
    },
    async receberRomaneio(id) {
      ok(await sb.from("romaneios").update({ recebido_em: new Date().toISOString() }).eq("id", id));
      ok(await sb.from("pedidos").update({ status: "na_loja" }).eq("romaneio_id", id).eq("status", "enviado"));
    },
    // WhatsApp (painel Conversas)
    async conversas() { return ok(await sb.from("wa_conversas").select("*").order("ultima_msg_em", { ascending: false }).limit(200)); },
    async mensagens(conversaId) { return ok(await sb.from("wa_mensagens").select("*").eq("conversa_id", conversaId).order("id", { ascending: true }).limit(400)); },
    async waAcao(acao, dados) { return funcao("whatsapp-enviar", { acao, ...dados }); },
    async fotoUrl(path) { return ok(await sb.storage.from("fotos").createSignedUrl(path, 3600)).signedUrl; },
    // um pedido só (usado para atualizar a lista sem baixar tudo de novo)
    async pedido(id) { const p = ok(await sb.from("pedidos").select(CAMPOS).eq("id", id).maybeSingle()); return p ? umaCompra(p) : null; },
    async compraLogistica(id) { return ok(await sb.from("compras_logistica").select("*").eq("pedido_id", id).maybeSingle()); },
    // avisa o que mudou: f([{ tabela, id }]) com só os itens alterados, ou f(null) quando é preciso recarregar tudo
    // (voltou depois de um tempo fora, ou a conexão caiu e voltou e pode ter perdido avisos)
    ouvir(f) {
      let t, fila = [];
      const chamar = ev => { fila.push(ev); clearTimeout(t); t = setTimeout(() => { const l = fila; fila = []; f(l.includes(null) ? null : l); }, 400); };
      const ev = tabela => pl => {
        const r = pl.new && Object.keys(pl.new).length ? pl.new : (pl.old || {});
        chamar({ tabela, id: tabela === "compras" ? r.pedido_id : r.id });
      };
      let conectou = false;
      sb.channel("mudancas")
        .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, ev("pedidos"))
        .on("postgres_changes", { event: "*", schema: "public", table: "compras" }, ev("compras"))
        .on("postgres_changes", { event: "*", schema: "public", table: "romaneios" }, ev("romaneios"))
        .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversas" }, ev("wa_conversas"))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_mensagens" }, ev("wa_mensagens"))
        .on("postgres_changes", { event: "*", schema: "public", table: "fechamentos" }, ev("fechamentos"))
        .subscribe(st => { if (st === "SUBSCRIBED") { if (conectou) chamar(null); conectou = true; } });
      // voltou para a aba depois de mais de 30 s (celular bloqueado, por exemplo): recarrega tudo uma vez
      let saiu = 0;
      document.addEventListener("visibilitychange", () => { if (document.hidden) saiu = Date.now(); else if (saiu && Date.now() - saiu > 30000) chamar(null); });
    },
    // metas e fechamentos (metas.sql): o banco só entrega o que cada papel pode ver
    async metasMes(mes) {
      const fim = addDias(mtMesMais(mes, 1), -1), prox = mtMesMais(mes, 1);
      const [vendedores, metasLoja, metasVend, cal, calLoja, fech, lanc, corr, config, vistos, proxMetas] = await Promise.all([
        sb.from("vendedores").select("*"),
        sb.from("metas_loja").select("*").eq("mes", mes),
        sb.from("metas_vendedor").select("*").eq("mes", mes),
        sb.from("calendario").select("*").gte("dia", mes).lte("dia", fim),
        sb.from("calendario_loja").select("*").gte("dia", mes).lte("dia", fim),
        sb.from("fechamentos").select("id, loja_id, dia, status, fechado_em, reaberto_em").gte("dia", mes).lte("dia", fim),
        sb.from("metas_lancamentos").select("loja_id, dia, status, vendedor_id, assistencia, vendas").gte("dia", mes).lte("dia", fim).limit(10000),
        sb.from("fechamento_correcoes").select("fechamento_id, vendedor_id, campo, antes, depois, em, fechamentos!inner(dia)").gte("fechamentos.dia", mes).lte("fechamentos.dia", fim),
        sb.from("metas_config").select("*"),
        sb.from("avisos_vistos").select("chave, gravidade, visto_em"),
        sb.from("metas_loja").select("loja_id", { count: "exact", head: true }).eq("mes", prox),
      ]);
      return { vendedores: ok(vendedores), metasLoja: ok(metasLoja), metasVend: ok(metasVend), cal: ok(cal), calLoja: ok(calLoja), fech: ok(fech), lanc: ok(lanc),
        corr: ok(corr).map(({ fechamentos, ...c }) => c), config: ok(config), vistos: ok(vistos), proximoTemMetas: (proxMetas.count || 0) > 0 };
    },
    async fecharDia(loja, dia, valores) { return ok(await sb.rpc("fechar_dia", { p_loja: loja, p_dia: dia, p_valores: valores })); },
    async reabrirDia(loja, dia) { ok(await sb.rpc("reabrir_dia", { p_loja: loja, p_dia: dia })); },
    async copiarMetas(de, para) { return ok(await sb.rpc("copiar_metas", { p_de: de, p_para: para })); },
    async salvarVendedor(v) { const { id, ...d } = v; id ? ok(await sb.from("vendedores").update(d).eq("id", id)) : ok(await sb.from("vendedores").insert(d)); },
    async salvarMetaLoja(mes, loja_id, a, v) { ok(await sb.from("metas_loja").upsert({ mes, loja_id, assistencia: a, vendas: v }, { onConflict: "mes,loja_id" })); },
    async salvarMetaVendedor(mes, vendedor_id, m) {
      if (!m) ok(await sb.from("metas_vendedor").delete().eq("mes", mes).eq("vendedor_id", vendedor_id));
      else ok(await sb.from("metas_vendedor").upsert({ mes, vendedor_id, assistencia: m.a, vendas: m.v }, { onConflict: "mes,vendedor_id" }));
    },
    async salvarCalendario(dia, aberto) { ok(await sb.from("calendario").upsert({ dia, aberto }, { onConflict: "dia" })); },
    async salvarConfigMetas(chave, valor) { ok(await sb.from("metas_config").update({ valor }).eq("chave", chave)); },
    async marcarVisto(chave, gravidade) { ok(await sb.from("avisos_vistos").upsert({ perfil_id: S.perfil.id, chave, gravidade, visto_em: new Date().toISOString() }, { onConflict: "perfil_id,chave" })); },
    // administração (usuários passam pela função do servidor; o resto o banco protege)
    async usuarios(acao, d = {}) { const r = await funcao("admin-usuarios", { acao, ...d }); return acao === "listar" ? r.usuarios : r; },
    async salvarPreco(chave, valor) { ok(await sb.from("precos").update({ valor: Number(valor), atualizado_em: new Date().toISOString() }).eq("chave", chave)); },
    async salvarModelo(m) { m.id ? ok(await sb.from("modelos").update({ nome: m.nome, marca: m.marca, ativo: m.ativo }).eq("id", m.id)) : ok(await sb.from("modelos").insert({ nome: m.nome.trim(), marca: m.marca || "" })); },
    async salvarLoja(l) { l.id ? ok(await sb.from("lojas").update({ nome: l.nome, ativa: l.ativa, whatsapp: l.whatsapp ?? "", online: !!l.online }).eq("id", l.id)) : ok(await sb.from("lojas").insert({ nome: l.nome.trim(), ordem: S.lojas.length })); },
    async salvarTema(t) { ok(await sb.from("temas").update({ prefixo: t.prefixo, ativo: t.ativo, nome_exibicao: t.nome_exibicao || null }).eq("pasta_id", t.pasta_id)); },
    async sincronizarCatalogo() { return funcao("sync-catalogo", {}); },
    // manutenção: espaço usado, limpeza de fotos antigas e cópia de segurança
    // aparelhos (catálogo de celulares): o administrador vê todos, inclusive os escondidos
    async aparelhos() { return ok(await sb.from("aparelhos").select("*").order("ordem").order("id")); },
    async salvarAparelho(a) {
      const { id, ...d } = a;
      return id ? ok(await sb.from("aparelhos").update(d).eq("id", id).select("*").single()) : ok(await sb.from("aparelhos").insert(d).select("*").single());
    },
    async enviarFotoAparelho(blob) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      ok(await sb.storage.from("aparelhos").upload(path, blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" }));
      return sb.storage.from("aparelhos").getPublicUrl(path).data.publicUrl;
    },
    // avisos no celular (push): guarda a inscrição deste aparelho e pede um aviso de teste
    async inscreverPush(d) { ok(await sb.from("push_inscricoes").upsert(d, { onConflict: "endpoint" })); },
    async testePush() { return funcao("avisos-push", { acao: "teste" }); },
    async usoEspaco() { return ok(await sb.rpc("uso_espaco")); },
    async manutencao(acao) { return funcao("manutencao", { acao }); }
  };
}
