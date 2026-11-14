/* ---------- utilidades e dados compartilhados por todas as telas ---------- */
const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addDias = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const fmtD = d => d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") : "";
const fmtDH = d => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const nro = id => "#" + String(id).padStart(4, "0");
const normCod = s => { const x = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), m = x.match(/^([A-Z]+)0*(\d+)$/); return m ? m[1] + m[2] : x; };
const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const soNumeros = s => String(s || "").replace(/\D/g, "");
const ls = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v); return true } catch (e) { return false } }, del(k) { try { localStorage.removeItem(k) } catch (e) { } } };

function toast(m, ms = 2800) { const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }
function erroTela(e) { console.error(e); toast(e && e.message ? e.message : "Algo deu errado. Tente de novo.", 4500); }
function modal(html, aoAbrir, classe = "") {
  const m = $("modal"); m.innerHTML = `<div class="box ${classe}" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = e => { if (e.target === m) fecharModal(); };
  aoAbrir && aoAbrir(m);
}
function fecharModal() { const m = $("modal"); m.hidden = true; m.innerHTML = ""; }
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("modal").hidden) fecharModal(); });

/* ---------- textos fixos ---------- */
const PROD = { transparente: "Capinha transparente", aveludada: "Capinha aveludada", popsocket: "PopSocket" };
const PERS = { foto: "Com foto", nome: "Com nome", catalogo: "Do catálogo" };
const FLUXO = ["recebido", "producao", "pronto", "enviado", "na_loja", "entregue"];
const ST = {
  recebido: ["Recebido pela fábrica", "--s-rec"], producao: ["Em produção", "--s-prod"], pronto: ["Pronto", "--s-pronto"],
  enviado: ["A caminho da loja", "--s-env"], na_loja: ["Chegou na loja", "--s-loja"], entregue: ["Entregue ao cliente", "--s-ent"],
  cancelado: ["Cancelado", "--s-can"]
};
const PROX = { recebido: "Começar produção", producao: "Marcar como pronto" };
const CST = { pendente: ["Aguardando compra", "--s-rec"], comprado: ["Comprada", "--s-prod"], entregue: ["Na fábrica", "--s-pronto"] };
const CORES = ["Preta", "Vermelha", "Rosa", "Azul", "Lilás", "Verde", "Branca"];
const ABERTOS = ["recebido", "producao", "pronto", "enviado", "na_loja"];
const FOTO_MIN = 900; // lado menor abaixo disso = pode sair pixelada

const ICON = {
  capa: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><rect x="12" y="4" width="24" height="40" rx="6"/><rect x="15" y="8" width="9" height="9" rx="3"/><circle cx="19.5" cy="12.5" r="2"/></svg>',
  veludo: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><rect x="12" y="4" width="24" height="40" rx="6" fill="currentColor" fill-opacity=".18"/><rect x="15" y="8" width="9" height="9" rx="3"/><path d="M16 26c3-2 5 2 8 0s5 2 8 0M16 33c3-2 5 2 8 0s5 2 8 0" stroke-linecap="round"/></svg>',
  pop: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="7"/></svg>',
  foto: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><rect x="5" y="12" width="38" height="28" rx="5"/><path d="M17 12l3-5h8l3 5"/><circle cx="24" cy="26" r="7"/></svg>',
  nome: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 38L16 10l9 28M10.5 28h11"/><path d="M41 38V26a6 6 0 0 0-11 0M30 32a5 5 0 1 0 11 0"/></svg>',
  cat: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><rect x="6" y="6" width="15" height="15" rx="3"/><rect x="27" y="6" width="15" height="15" rx="3"/><rect x="6" y="27" width="15" height="15" rx="3"/><rect x="27" y="27" width="15" height="15" rx="3"/></svg>',
  loja: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M7 18l3-10h28l3 10"/><path d="M7 18c0 3 2.5 5 5.5 5s5.5-2 5.5-5c0 3 2.5 5 6 5s6-2 6-5c0 3 2.5 5 5.5 5s5.5-2 5.5-5"/><path d="M10 23v17h28V23M20 40V30h8v10"/></svg>',
  caixa: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M6 15l18-8 18 8v18l-18 8-18-8z"/><path d="M6 15l18 8 18-8M24 23v18M15 11l18 8"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.6z"/><path d="M9 9.2c.3 2.6 2.3 4.7 5 5.4l1.2-1.3 1.9.9"/></svg>',
  lapis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
};

/* ---------- estado ---------- */
const S = { perfil: null, lojas: [], precos: {}, modelos: [], temas: [], catalogo: new Map(), pedidos: [], compras: [], romaneios: [], fotos: {} };
const nomeLoja = id => (S.lojas.find(l => l.id === id) || {}).nome || "—";
const papel = () => S.perfil && S.perfil.papel;
const eFabrica = () => ["fabrica", "admin"].includes(papel());

// Imagens das estampas: vêm da pasta estampas/ (uma por código, geradas pelo projeto catalogo-capinhas).
// Se o arquivo não existir (estampa nova ainda sem imagem local), cai para a miniatura do Drive.
function urlDrive(arquivoId, w = 400) { return `https://drive.google.com/thumbnail?id=${encodeURIComponent(arquivoId)}&sz=w${w}`; }
let codPorArquivo = null, codPorArquivoTam = -1;
function imgDrive(arquivoId, w = 400) {
  if (!arquivoId) return "";
  if (codPorArquivoTam !== S.catalogo.size) { codPorArquivo = new Map(); for (const c of S.catalogo.values()) codPorArquivo.set(c.arquivo_id, c.codigo); codPorArquivoTam = S.catalogo.size; }
  const cod = codPorArquivo.get(arquivoId);
  return cod ? `estampas/${encodeURIComponent(cod)}.webp?r=2#${encodeURIComponent(arquivoId)}` : urlDrive(arquivoId, w);
}
document.addEventListener("error", e => {
  const i = e.target;
  if (i && i.tagName === "IMG" && i.src.includes("/estampas/") && i.src.includes("#") && !i.dataset.reserva) { i.dataset.reserva = "1"; i.src = urlDrive(decodeURIComponent(i.src.split("#")[1])); }
}, true);
function acharCat(cod) { return S.catalogo.get(normCod(cod)) || null; }
function precoUnit(prod, pers) { return prod === "popsocket" ? (S.precos.popsocket || 0) : (S.precos[pers] || 0); }
function modeloValido(nome) { const n = semAcento(nome).replace(/\s+/g, " ").trim(); return S.modelos.find(m => m.ativo && semAcento(m.nome) === n) || null; }
function waLink(numero, texto) { const n = soNumeros(numero); if (!n) return ""; return `https://wa.me/${n.length <= 11 ? "55" + n : n}?text=${encodeURIComponent(texto)}`; }

function chip(status) { const [n, c] = ST[status]; return `<span class="stline" style="--c:var(${c})">${n}</span>`; }
function descr(p) {
  let x = PERS[p.pers];
  if (p.pers === "nome") x += `: “${esc(p.texto_nome)}” (${esc(p.codigo)})`;
  if (p.pers === "catalogo") x += `: ${esc(p.codigo)}`;
  if (p.pers === "foto" && p.foto_whats && !p.foto_path) x += " (foto pelo WhatsApp)";
  return `${p.qtd > 1 ? p.qtd + "× " : ""}${PROD[p.produto]} · ${x}`;
}
function miniatura(p, cls = "thumb") {
  if (p.foto_path) return `<img class="photo" data-foto="${esc(p.foto_path)}" alt="Foto do cliente">`;
  if (p.arquivo_id) return `<img class="${cls}" src="${imgDrive(p.arquivo_id, 200)}" alt="" loading="lazy">`;
  return "";
}
// fotos ficam em pasta protegida: busca o endereço temporário depois de desenhar
async function carregarFotos(raiz = document) {
  for (const img of raiz.querySelectorAll("img[data-foto]")) {
    const path = img.dataset.foto;
    try { if (!S.fotos[path]) S.fotos[path] = await api.fotoUrl(path); img.src = S.fotos[path]; img.style.cursor = "zoom-in"; img.onclick = () => modal(`<img src="${S.fotos[path]}" alt="Foto do cliente"><button class="btn soft" onclick="fecharModal()">Fechar</button>`); } catch (e) { }
  }
}
function linhaLisa(p) {
  if (p.produto === "popsocket" || !p.origem_lisa) return "";
  if (p.origem_lisa === "loja") return `<div class="lisa">Capinha lisa: <b>enviada pela loja</b></div>`;
  if (!p.compra) return "";
  const [n, c] = CST[p.compra.status];
  return `<div class="lisa" style="--c:var(${c})">Capinha lisa pela logística (${esc(p.produto === "aveludada" ? p.compra.cor : "Transparente")}): <b>${n}</b></div>`;
}
// reduz a foto para envio e mede a qualidade
function prepararFoto(file) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const menor = Math.min(img.naturalWidth, img.naturalHeight);
      const s = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok({ blob: b, previa: c.toDataURL("image/jpeg", .7), alerta: menor < FOTO_MIN, lado: menor }) : falha(new Error("Não consegui ler a foto.")), "image/jpeg", .88);
    };
    img.onerror = () => falha(new Error("Não consegui abrir essa imagem. Tente outra foto."));
    img.src = url;
  });
}
