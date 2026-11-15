/* Regras do Painel de Metas: contas e avisos.
   Arquivo ÚNICO usado em dois lugares:
   - no site (index.html carrega como módulo e guarda em window.MR);
   - no servidor, pela função metas-avisos (cópia em supabase/functions/metas-avisos/regras.js;
     o publicar.sh copia de novo antes de publicar — edite só ESTE arquivo).
   Contas: falta = meta − realizado · meta diária = falta ÷ dias de venda restantes ·
   projeção = realizado ÷ dias fechados × dias de venda do mês · ritmo ideal = dias fechados ÷ dias de venda.
   Cor: verde no ideal ou acima · amarelo até X pontos abaixo · vermelho mais que isso (X ajustável). */
export const CFG = { amarelo_pts: 10, risco_mult: 1.5, acima_pts: 15, acima_proj: 1.2, queda_fator: .5, deseq_pts: 20, fora_media_mult: 4, silencio_dias: 5, proj_loja: .85, proj_rede: .9, reta_final_dias: 5, repetir_dias: 7 };
export const SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const R = n => "R$ " + Math.round(n || 0).toLocaleString("pt-BR");
export const P = x => Math.round((x || 0) * 100) + "%";
export const addDias = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const dow = d => new Date(d + "T12:00:00Z").getUTCDay();
export const data = d => d ? `${SEM[dow(d)]} ${d.slice(8)}/${d.slice(5, 7)}` : "—";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeMes = m => { const t = `${MESES[+m.slice(5, 7) - 1]} de ${m.slice(0, 4)}`; return t[0].toUpperCase() + t.slice(1); };
export const mesMais = (m, k) => { const a = +m.slice(0, 4), b = +m.slice(5, 7) - 1 + k, y = a + Math.floor(b / 12), mm = ((b % 12) + 12) % 12; return `${y}-${String(mm + 1).padStart(2, "0")}-01`; };
export function diasMes(m) { const r = []; let d = m; while (d.slice(0, 7) === m.slice(0, 7)) { r.push(d); d = addDias(d, 1); } return r; }
export const ehRede = ctx => ["dona", "admin"].includes(ctx.papel);

/* d = dados crus do banco (metasMes); ctx = { hoje, papel, lojaId, lojas:[{id,nome,ativa}] } */
export function montar(mes, d, ctx) {
  const hj = ctx.hoje, dias = diasMes(mes);
  const cfg = { ...CFG, ...Object.fromEntries((d.config || []).map(c => [c.chave, Number(c.valor)])) };
  const calG = new Map(d.cal.map(c => [c.dia, c.aberto]));
  const abertoG = x => calG.has(x) ? calG.get(x) : dow(x) !== 0;
  const fechPorId = new Map(d.fech.map(f => [f.id, f]));
  const minhas = ctx.papel === "loja" ? ctx.lojas.filter(l => l.id === ctx.lojaId) : ctx.lojas.filter(l => l.ativa || d.fech.some(f => f.loja_id === l.id));
  const lojas = minhas.map(l => {
    const calL = new Map(d.calLoja.filter(c => c.loja_id === l.id).map(c => [c.dia, c.aberto]));
    const diasV = dias.filter(x => calL.has(x) ? calL.get(x) : abertoG(x));
    const ml = d.metasLoja.find(m => m.loja_id === l.id);
    const fech = new Map(d.fech.filter(f => f.loja_id === l.id).map(f => [f.dia, f]));
    const vend = d.vendedores.filter(v => v.loja_id === l.id).map(v => {
      const mv = d.metasVend.find(m => m.vendedor_id === v.id), val = new Map();
      d.lanc.filter(x => x.vendedor_id === v.id).forEach(x => val.set(x.dia, { a: Number(x.assistencia), v: Number(x.vendas) }));
      return { id: v.id, nome: v.nome, ordem: v.ordem, ativo: v.ativo, meta: mv ? { a: Number(mv.assistencia), v: Number(mv.vendas) } : null, val };
    }).filter(v => v.ativo || v.val.size).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
    const fechados = diasV.filter(x => (fech.get(x) || {}).status === "fechado");
    // loja sem vendedor ativo ainda não usa as metas: não cobra fechamento
    const pend = vend.some(v => v.ativo) ? diasV.filter(x => x < hj && (fech.get(x) || {}).status !== "fechado") : [];
    const corr = d.corr.filter(c => (fechPorId.get(c.fechamento_id) || {}).loja_id === l.id).map(c => ({ ...c, dia: fechPorId.get(c.fechamento_id).dia }));
    return { id: l.id, nome: l.nome, meta: ml ? { a: Number(ml.assistencia), v: Number(ml.vendas) } : null, diasV, N: diasV.length, fech, fechados, n: fechados.length, pend, vend, corr, hojeVenda: diasV.includes(hj) };
  });
  return { mes, hj, dias, diasG: dias.filter(abertoG), calG, cfg, lojas, vistos: new Map((d.vistos || []).map(v => [v.chave, v])), proximoTemMetas: d.proximoTemMetas, raw: d };
}

/* ---------- contas ---------- */
export function cor(D, pct, ideal, meta) { if (!meta) return ""; const c = D.cfg; return pct >= ideal - 1e-9 ? "g" : (ideal - pct) <= c.amarelo_pts / 100 + 1e-9 ? "a" : "r"; }
export function conta(D, meta, real, n, N) {
  const pct = meta ? real / meta : 0, ideal = N ? n / N : 0, falta = Math.max(0, meta - real), rest = Math.max(0, N - n);
  return { meta, real, pct, ideal, falta, rest, n, N, diaria: rest ? falta / rest : falta, proj: n ? real / n * N : 0, projPct: meta && n ? real / n * N / meta : 0, cor: cor(D, pct, ideal, meta) };
}
export const soma = (v, k) => { let s = 0; v.val.forEach(x => s += x[k]); return s; };
export function contaVend(D, v, l) {
  const ra = soma(v, "a"), rv = soma(v, "v"), m = v.meta;
  return { tot: conta(D, m ? m.a + m.v : 0, ra + rv, l.n, l.N), a: conta(D, m ? m.a : 0, ra, l.n, l.N), v: conta(D, m ? m.v : 0, rv, l.n, l.N) };
}
export function contaLoja(D, l) {
  let ra = 0, rv = 0; l.vend.forEach(v => { ra += soma(v, "a"); rv += soma(v, "v"); });
  const m = l.meta || { a: 0, v: 0 };
  return { tot: conta(D, m.a + m.v, ra + rv, l.n, l.N), a: conta(D, m.a, ra, l.n, l.N), v: conta(D, m.v, rv, l.n, l.N) };
}
export function contaRede(D) {
  let meta = 0, real = 0, proj = 0, diaria = 0, iw = 0, ma = 0, mv = 0, ra = 0, rv = 0;
  D.lojas.filter(l => l.meta).forEach(l => { const c = contaLoja(D, l); meta += c.tot.meta; real += c.tot.real; proj += c.tot.proj; diaria += c.tot.diaria; iw += c.tot.ideal * c.tot.meta; ma += c.a.meta; mv += c.v.meta; ra += c.a.real; rv += c.v.real; });
  const ideal = meta ? iw / meta : 0, mk = (m, r) => ({ meta: m, real: r, pct: m ? r / m : 0, ideal, cor: cor(D, m ? r / m : 0, ideal, m) });
  return { tot: { ...mk(meta, real), falta: Math.max(0, meta - real), proj, projPct: meta ? proj / meta : 0, diaria, rest: D.diasG.filter(x => x >= D.hj).length }, a: mk(ma, ra), v: mk(mv, rv) };
}
export const totDia = (l, dia) => l.vend.reduce((s, v) => { const x = v.val.get(dia); return s + (x ? x.a + x.v : 0); }, 0);

/* ---------- avisos (sem filtrar "visto"; ver visiveis) ---------- */
export function avisos(D, ctx) {
  const c = D.cfg, L = [], mes = D.mes;
  const add = (nivel, chave, titulo, texto, alvo, g = 0) => L.push({ nivel, chave, titulo, texto, alvo, g });
  D.lojas.forEach(l => {
    const cl = contaLoja(D, l), n = l.n, ritmo = n > c.silencio_dias, al = { loja: l.id };
    if (l.pend.length === 1) add("a", `pend-${l.id}-${l.pend[0]}`, `${l.nome}: fechamento pendente`, `Não entregou o fechamento de ${data(l.pend[0])}. Pendente não quer dizer que não vendeu.`, al, 1);
    if (l.pend.length >= 2) add("r", `pend-${l.id}-${l.pend[0]}`, `${l.nome}: ${l.pend.length} dias sem fechamento`, `Faltam: ${l.pend.slice(0, 6).map(data).join(", ")}${l.pend.length > 6 ? "…" : ""}. Pendente não quer dizer que não vendeu.`, al, l.pend.length);
    if (l.meta && n) {
      if (cl.tot.pct >= 1) add("g", `bateu-${l.id}-${mes}`, `${l.nome} bateu a meta!`, `${R(cl.tot.real)} de ${R(cl.tot.meta)}.`, al);
      else if (ritmo && cl.tot.projPct < c.proj_loja) add("r", `proj-${l.id}-${mes}`, `${l.nome}: projeção de ${P(cl.tot.projPct)}`, `No ritmo atual fecha o mês em ${R(cl.tot.proj)}. Precisa vender ${R(cl.tot.diaria)} por dia.`, al, 1 - cl.tot.projPct);
    }
    if (n >= 3) {
      const tots = l.fechados.map(x => totDia(l, x)), ult = l.fechados[n - 1];
      if (tots[n - 1] > 0 && tots[n - 1] === Math.max(...tots)) add("g", `rec-${l.id}-${ult}`, `${l.nome}: melhor dia do mês`, `${data(ult)} fechou em ${R(tots[n - 1])}, recorde do mês.`, al);
    }
    if (n >= 4) l.vend.forEach(v => ["a", "v"].forEach(k => l.fechados.forEach(dia => {
      const x = v.val.get(dia); if (!x) return;
      const outros = l.fechados.filter(o => o !== dia).map(o => (v.val.get(o) || { a: 0, v: 0 })[k]), m = outros.reduce((s, y) => s + y, 0) / outros.length;
      if (m > 0 && x[k] > c.fora_media_mult * m) add("a", `erro-${v.id}-${k}-${dia}`, `${l.nome}: valor fora do normal`, `${v.nome} lançou ${R(x[k])} em ${k === "a" ? "Assistência" : "Vendas"} em ${data(dia)}; a média dele é ${R(m)}. Pode ser erro de digitação.`, { loja: l.id, vend: v.id, dia });
    })));
    const porFech = new Map(); l.corr.forEach(x => { if (!porFech.has(x.fechamento_id)) porFech.set(x.fechamento_id, []); porFech.get(x.fechamento_id).push(x); });
    porFech.forEach((cs, fid) => {
      const ult = cs.reduce((a, b) => a.em > b.em ? a : b), nomeV = id => (l.vend.find(v => v.id === id) || {}).nome || "vendedor";
      add("a", `corr-${fid}-${ult.em}`, `${l.nome}: fechamento corrigido`, `${data(cs[0].dia)}: ${cs.slice(-3).map(x => `${x.campo === "vendas" ? "Vendas" : "Assistência"} de ${nomeV(x.vendedor_id)}: ${R(x.antes)} → ${R(x.depois)}`).join("; ")}.`, { loja: l.id, dia: cs[0].dia });
    });
    l.vend.forEach(v => {
      if (!v.ativo) return;
      if (!v.meta) { if (l.meta) add("a", `semmeta-${v.id}-${mes}`, `${v.nome} (${l.nome}) está sem meta`, `Lança vendas, mas não tem meta cadastrada neste mês.`, { aba: "metas" }); return; }
      if (!n) return;
      const cv = contaVend(D, v, l), t = cv.tot, normal = t.meta / l.N, alvo = { loja: l.id, vend: v.id };
      if (t.pct >= 1) add("g", `vbateu-${v.id}-${mes}`, `${v.nome} (${l.nome}) bateu a meta!`, `${R(t.real)} de ${R(t.meta)}.`, alvo);
      else if (ritmo) {
        if (t.diaria > c.risco_mult * normal) add("r", `risco-${v.id}-${mes}`, `${v.nome} (${l.nome}) em risco`, `Precisa de ${R(t.diaria)} por dia, ${(t.diaria / normal).toFixed(1).replace(".", ",")}× o normal (${R(normal)}). Está em ${P(t.pct)}, ideal ${P(t.ideal)}.`, alvo, t.diaria / normal);
        else if (t.ideal - t.pct > c.amarelo_pts / 100) add("a", `abaixo-${v.id}-${mes}`, `${v.nome} (${l.nome}) abaixo do ritmo`, `Está em ${P(t.pct)}, o ideal hoje é ${P(t.ideal)}. Precisa de ${R(t.diaria)} por dia.`, alvo, t.ideal - t.pct);
        if (t.pct - t.ideal > c.acima_pts / 100 || t.projPct > c.acima_proj) add("g", `acima-${v.id}-${mes}`, `${v.nome} (${l.nome}) muito acima`, `Está em ${P(t.pct)} (ideal ${P(t.ideal)}), projeção de ${P(t.projPct)}.`, alvo);
      }
      if (n >= 10) {
        const dia = x => { const y = v.val.get(x); return y ? y.a + y.v : 0; };
        const ult = l.fechados.slice(-5).reduce((s, x) => s + dia(x), 0) / 5, antes = l.fechados.slice(0, -5).reduce((s, x) => s + dia(x), 0) / (n - 5);
        if (antes > 0 && ult < c.queda_fator * antes) add("a", `queda-${v.id}-${mes}`, `${v.nome} (${l.nome}): queda de ritmo`, `Últimos 5 dias: média de ${R(ult)}/dia. Antes vinha com ${R(antes)}/dia.`, alvo, 1 - ult / antes);
      }
      if (ritmo && cv.a.meta && cv.v.meta && Math.abs(cv.a.pct - cv.v.pct) > c.deseq_pts / 100) add("a", `deseq-${v.id}-${mes}`, `${v.nome} (${l.nome}): categorias desequilibradas`, `Assistência em ${P(cv.a.pct)} e Vendas em ${P(cv.v.pct)} da meta.`, alvo, Math.abs(cv.a.pct - cv.v.pct));
    });
  });
  if (ehRede(ctx) && D.lojas.some(l => l.meta)) {
    const r = contaRede(D), t = r.tot, ritmo = D.lojas.some(l => l.n > c.silencio_dias), go = { aba: "painel" };
    const marco = [1, .75, .5, .25].find(m => t.pct >= m);
    if (marco) add("g", `marco-${mes}-${marco}`, marco === 1 ? "A rede bateu a meta do mês!" : `A rede passou de ${P(marco)} da meta`, `${R(t.real)} de ${R(t.meta)}.`, go);
    if (ritmo && t.pct < 1 && t.projPct < c.proj_rede) add("r", `rede-proj-${mes}`, `Rede: projeção de ${P(t.projPct)}`, `No ritmo atual a rede fecha em ${R(t.proj)} de ${R(t.meta)}.`, go, 1 - t.projPct);
    if (t.rest > 0 && t.rest <= c.reta_final_dias && t.pct < t.ideal) add("r", `reta-${mes}`, `Reta final: faltam ${t.rest} dias de venda`, `A rede está em ${P(t.pct)} e precisa de ${R(t.diaria)} por dia.`, go, c.reta_final_dias - t.rest);
    if (ritmo) [["a", "Assistência"], ["v", "Vendas"]].forEach(([k, nome]) => { if (r[k].meta && r[k].ideal - r[k].pct > c.amarelo_pts / 100) add("a", `cat-${k}-${mes}`, `Rede: ${nome} fraca`, `${nome} em ${P(r[k].pct)} da meta, ideal ${P(r[k].ideal)}.`, go, r[k].ideal - r[k].pct); });
    const restamCal = D.dias.filter(x => x > D.hj).length;
    if (D.mes === D.hj.slice(0, 7) + "-01" && restamCal < 3 && !D.proximoTemMetas) add("a", `metas-prox-${mes}`, `Metas de ${nomeMes(mesMais(mes, 1)).split(" ")[0]} não cadastradas`, "O mês está acabando. Dá para copiar as metas deste mês.", { aba: "metas", mes: mesMais(mes, 1) });
  }
  const ordem = { r: 0, a: 1, g: 2 };
  return L.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}
// tira o que a pessoa já marcou como "visto" (volta se piorar ou depois de X dias)
export function visiveis(L, vistos, cfg, agora = Date.now()) {
  return L.filter(x => { const v = vistos.get(x.chave); return !v || x.g > Number(v.gravidade || 0) + 1e-6 || agora - new Date(v.visto_em).getTime() > cfg.repetir_dias * 864e5; });
}
// gerente vê só os avisos da loja dele
export const doPapel = (L, ctx) => ctx.papel === "loja" ? L.filter(x => x.alvo && x.alvo.loja === ctx.lojaId) : L;

/* ---------- relatório do mês (linhas prontas para tabela e planilha) ---------- */
export function relatorio(D) {
  const linhas = [];
  D.lojas.forEach(l => {
    const c = contaLoja(D, l);
    linhas.push({ tipo: "loja", loja: l.nome, nome: l.nome, metaA: c.a.meta, realA: c.a.real, metaV: c.v.meta, realV: c.v.real, meta: c.tot.meta, real: c.tot.real, pct: c.tot.pct, dias: `${l.n}/${l.N}` });
    l.vend.forEach(v => { const x = contaVend(D, v, l); linhas.push({ tipo: "vend", loja: l.nome, nome: v.nome, metaA: x.a.meta, realA: x.a.real, metaV: x.v.meta, realV: x.v.real, meta: x.tot.meta, real: x.tot.real, pct: x.tot.pct, dias: "" }); });
  });
  const r = contaRede(D);
  return { mes: D.mes, rede: { metaA: r.a.meta, realA: r.a.real, metaV: r.v.meta, realV: r.v.real, meta: r.tot.meta, real: r.tot.real, pct: r.tot.pct }, linhas };
}
