/* ═══════════════════════════════════════════════════════════════
   Controle Financeiro Pessoal — script.js
   ═══════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════════════
// CATEGORIAS
// ══════════════════════════════════════════════════════════════════
const CATEGORIAS = {
  moradia:     { label: "Moradia",      cor: "#6366f1", emoji: "🏠", icone: "home" },
  alimentacao: { label: "Alimentação",  cor: "#f59e0b", emoji: "🍔", icone: "shopping-bag" },
  transporte:  { label: "Transporte",   cor: "#3b82f6", emoji: "🚗", icone: "car" },
  saude:       { label: "Saúde",        cor: "#10b981", emoji: "💊", icone: "heart" },
  bemestar:    { label: "Bem-estar",    cor: "#06b6d4", emoji: "🧘", icone: "activity" },
  assinatura:  { label: "Assinatura",   cor: "#8b5cf6", emoji: "📱", icone: "device-mobile" },
  lazer:       { label: "Lazer",        cor: "#ec4899", emoji: "🎮", icone: "music" },
  educacao:    { label: "Educação",     cor: "#0ea5e9", emoji: "📚", icone: "book" },
  pet:         { label: "Pet",          cor: "#f97316", emoji: "🐾", icone: "paw" },
  outros:      { label: "Outros",       cor: "#94a3b8", emoji: "📦", icone: "receipt" },
};

// ══════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function brl(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" stroke-width="1.6" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    ${ICONS[name] || ICONS["receipt"]}
  </svg>`;
}

async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ══════════════════════════════════════════════════════════════════
// MÁSCARA DE MOEDA BRASILEIRA
// ══════════════════════════════════════════════════════════════════

/**
 * Formata um número como moeda BR sem o símbolo: "1.320,50"
 */
function fmtCurrency(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Lê o valor de um input com máscara e retorna float.
 * "1.320,50" → 1320.50
 */
function parseCurrency(inputOrStr) {
  const raw = typeof inputOrStr === "string" ? inputOrStr : inputOrStr.value;
  return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
}

/**
 * Define o valor formatado em um input com máscara.
 */
function setCurrency(input, value) {
  input.value = value != null && value !== "" ? fmtCurrency(value) : "";
}

/**
 * Aplica a máscara "centavos" em um input:
 * O usuário digita apenas dígitos → o campo formata automaticamente.
 * Ex: digita "3", "2", "0", "0", "0" → "320,00"
 */
function applyCurrencyMask(input) {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(-13); // max 13 dígitos
    if (!digits) { input.value = ""; return; }
    const num = parseInt(digits, 10) / 100;
    input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  input.addEventListener("paste", e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const digits = pasted.replace(/\D/g, "").slice(-13);
    if (!digits) return;
    const num = parseInt(digits, 10) / 100;
    input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  // Seleciona tudo ao focar para facilitar edição
  input.addEventListener("focus", () => input.select());
}

function toast(msg, type = "default") {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ══════════════════════════════════════════════════════════════════
// MÊS
// ══════════════════════════════════════════════════════════════════

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function mesAtualStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

function mesDisplay(mesAno) {
  const [ano, mes] = mesAno.split("-");
  return `${MESES_PT[parseInt(mes) - 1]} ${ano}`;
}

function navegarMes(delta) {
  const [ano, mes] = state.mes.split("-").map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  state.mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  renderMesNav();
  loadAll();
}

function renderMesNav() {
  const el = $("#mes-display");
  if (el) el.textContent = mesDisplay(state.mes);
  const nav = $("#mes-nav");
  if (nav) nav.classList.toggle("mes-atual", state.mes === mesAtualStr());
  const picker = $("#mes-picker");
  if (picker) picker.value = state.mes;
}

function irParaMes(valor) {
  if (!valor) return;
  state.mes = valor;
  renderMesNav();
  loadAll();
}

// ══════════════════════════════════════════════════════════════════
// ICONS MAP (Tabler SVG paths)
// ══════════════════════════════════════════════════════════════════
const ICONS = {
  "receipt": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2"/><path d="M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5m2 0v1.5m0 -9v1.5"/>`,
  "credit-card": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="3" y="5" width="18" height="14" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="7.01" y2="15"/><line x1="11" y1="15" x2="13" y2="15"/>`,
  "shopping-bag": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/>`,
  "home": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="5 12 3 12 12 3 21 12 19 12"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>`,
  "car": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>`,
  "device-mobile": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="11" y1="6" x2="13" y2="6"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
  "wifi": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 18l.01 0"/><path d="M9.172 15.172a4 4 0 0 1 5.656 0"/><path d="M6.343 12.343a8 8 0 0 1 11.314 0"/><path d="M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0"/>`,
  "building-bank": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/>`,
  "heart": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.5 13.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.566"/>`,
  "bolt": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="13 3 13 10 19 10 11 21 11 14 5 14 13 3"/>`,
  "droplet": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.8 11a6 6 0 1 0 10.396 0l-5.197 -8l-5.2 8z"/>`,
  "book": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><line x1="3" y1="6" x2="3" y2="19"/><line x1="12" y1="6" x2="12" y2="19"/><line x1="21" y1="6" x2="21" y2="19"/>`,
  "shirt": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0"/>`,
  "tool": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>`,
  "pig-money": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 11v.01"/><path d="M5.173 8.378a3 3 0 1 1 4.656 -1.377"/><path d="M16 4v3.803a6.019 6.019 0 0 1 2.658 3.197h1.341a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1.342c-.336.95-.907 1.8 -1.658 2.473v2.027a1.5 1.5 0 0 1 -3 0v-.583a6.04 6.04 0 0 1 -1 .083h-4a6.04 6.04 0 0 1 -1 -.083v.583a1.5 1.5 0 0 1 -3 0v-2l0 -.027a6 6 0 0 1 4 -10.473h2.5l4.5 -2z"/>`,
  "chart-bar": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="3" y="12" width="6" height="8" rx="1"/><rect x="9" y="8" width="6" height="12" rx="1"/><rect x="15" y="4" width="6" height="16" rx="1"/><line x1="4" y1="20" x2="18" y2="20"/>`,
  "cash": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="7" y="9" width="14" height="10" rx="2"/><circle cx="14" cy="14" r="2"/><path d="M17 9v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h2"/>`,
  "arrow-down": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="18" y1="13" x2="12" y2="19"/><line x1="6" y1="13" x2="12" y2="19"/>`,
  "arrow-up": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="12" y1="19" x2="12" y2="5"/><line x1="18" y1="11" x2="12" y2="5"/><line x1="6" y1="11" x2="12" y2="5"/>`,
  "plus": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  "pencil": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 20h4l10.5 -10.5a1.5 1.5 0 0 0 -4 -4l-10.5 10.5v4"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>`,
  "trash": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="4" y1="7" x2="20" y2="7"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3h6v3"/>`,
  "check": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/>`,
  "x": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  "download": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><polyline points="7 11 12 16 17 11"/><line x1="12" y1="4" x2="12" y2="16"/>`,
  "upload": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/>`,
  "settings": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><circle cx="12" cy="12" r="3"/>`,
  "stack": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="12 4 4 8 12 12 20 8 12 4"/><polyline points="4 12 12 16 20 12"/><polyline points="4 16 12 20 20 16"/>`,
  "calendar": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="4" y="5" width="16" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="11" y1="15" x2="12" y2="15"/><line x1="12" y1="15" x2="12" y2="18"/>`,
  "chevron-left": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="15 6 9 12 15 18"/>`,
  "chevron-right": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="9 6 15 12 9 18"/>`,
  "activity": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="3 12 6 3 9 15 12 9 15 13 17 11 21 11"/>`,
  "music": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><polyline points="9 17 9 4 19 2 19 14"/>`,
  "paw": `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="14" cy="4" r="1"/><circle cx="17" cy="8" r="1"/><circle cx="7" cy="4" r="1"/><circle cx="4" cy="8" r="1"/><path d="M12 18c-3.6 0 -6.6 -2 -7 -5l-.5 -4c-.1 -1.4 .8 -2 1.5 -2c1 0 2 1 2.5 2.5c1 -.5 2 -.5 3.5 -.5s2.5 0 3.5 .5c.5 -1.5 1.5 -2.5 2.5 -2.5c.7 0 1.6 .6 1.5 2l-.5 4c-.4 3 -3.4 5 -7 5z"/>`,
};

const ICON_LIST = Object.keys(ICONS).filter(k => !["chevron-left","chevron-right","calendar","check","x","plus","pencil","trash","download","upload","arrow-up","arrow-down"].includes(k));

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
let state = {
  mes: mesAtualStr(),
  resumo: {},
  despesas: [],
  bancos: [],
  faturas: [],
  parcelas: [],
  caixa: [],
  config: {},
};

// ══════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════
function navigate(id) {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === id));
  $$(".section").forEach(s => s.classList.toggle("active", s.id === "section-" + id));
  $("#topbar-title").textContent = {
    dashboard: "Dashboard",
    despesas: "Despesas Fixas",
    bancos: "Faturas dos Cartões",
    parcelas: "Parcelas",
    caixa: "A Receber",
    config: "Configurações",
  }[id] || id;
}

// ══════════════════════════════════════════════════════════════════
// LOAD DATA
// ══════════════════════════════════════════════════════════════════
async function loadAll() {
  const mes = state.mes;
  const [resumo, despesas, bancos, faturas, parcelas, caixa, config, historico] = await Promise.all([
    api(`/api/resumo?mes=${mes}`),
    api(`/api/despesas?mes=${mes}`),
    api("/api/bancos"),
    api(`/api/faturas?mes=${mes}`),
    api(`/api/parcelas?mes=${mes}`),
    api(`/api/caixa?mes=${mes}`),
    api("/api/config"),
    api(`/api/historico?mes=${mes}`),
  ]);
  state = { ...state, resumo, despesas, bancos, faturas, parcelas, caixa, config, historico };
  renderDashboard();
  renderDespesas();
  renderFaturas();
  renderParcelas();
  renderCaixa();
  renderConfig();
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function renderDashboard() {
  const r = state.resumo;

  const totalEntradas = r.salario + r.saldo_caixa + r.total_caixa + r.total_parc_receber;

  const entradas = [
    { label: "Salário",           value: r.salario,           editKey: "salario",     inputId: "dash-salario-input" },
    { label: "Dinheiro em caixa", value: r.saldo_caixa,       editKey: "saldo_caixa", inputId: "dash-caixa-input" },
    { label: "A receber",          value: r.total_caixa,       sub: `Recebido: ${brl(r.total_caixa_pago)}` },
    { label: "Parcelas a receber",value: r.total_parc_receber,sub: `Recebido: ${brl(r.total_parc_receber_receb)}` },
  ];

  const saidas = [
    { label: "Faturas cartões",   value: r.total_faturas,       sub: `Pago: ${brl(r.total_faturas_pagas)} · Falta: ${brl(r.total_faturas_falta)}` },
    { label: "Despesas fixas",    value: r.total_despesas_fixas, sub: `Pago: ${brl(r.total_despesas_pagas)} · Falta: ${brl(r.total_despesas_falta)}` },
    { label: "Parcelas a pagar",  value: r.total_parcelas,       sub: `Pago: ${brl(r.total_parcelas_pagas)} · Falta: ${brl(r.total_parcelas_falta)}` },
  ];

  const saldoCls = r.sobra >= 0 ? "positive" : "negative";

  $("#dashboard-cards").innerHTML = `
    <div class="dre-card">

      <div class="dre-col dre-col-entradas">
        <div class="dre-col-title">↓ Entradas</div>
        ${entradas.map(e => e.editKey ? `
          <div class="dre-row">
            <span class="dre-label">${e.label}</span>
            <input type="text" inputmode="decimal" id="${e.inputId}"
                   class="dre-input input-currency" value="${fmtCurrency(e.value)}" placeholder="0,00"/>
          </div>` : `
          <div class="dre-row">
            <span class="dre-label">${e.label}</span>
            <span class="dre-value">${brl(e.value)}</span>
          </div>
          ${e.sub ? `<div class="dre-sub">${e.sub}</div>` : ""}
        `).join("")}
        <div class="dre-row dre-total">
          <span class="dre-label">Total entradas</span>
          <span class="dre-value">${brl(totalEntradas)}</span>
        </div>
      </div>

      <div class="dre-divider"></div>

      <div class="dre-col dre-col-saidas">
        <div class="dre-col-title">↑ Saídas</div>
        ${saidas.map(s => `
          <div class="dre-row">
            <span class="dre-label">${s.label}</span>
            <span class="dre-value">${brl(s.value)}</span>
          </div>
          <div class="dre-sub">${s.sub}</div>
        `).join("")}
        <div class="dre-row dre-total">
          <span class="dre-label">Total saídas</span>
          <span class="dre-value">${brl(r.total_gastos)}</span>
        </div>
        <div class="dre-row dre-pago-row">
          <span class="dre-label">✓ Já pago</span>
          <span class="dre-value dre-pago">${brl(r.total_pago)}</span>
        </div>
      </div>

      <div class="dre-divider"></div>

      <div class="dre-col dre-col-saldo">
        <div class="dre-col-title">Saldo do mês</div>
        <div class="dre-saldo ${saldoCls}">${brl(r.sobra)}</div>
        <div class="dre-saldo-sub">
          <span>Pendente: ${brl(r.total_pendente)}</span>
        </div>
      </div>

    </div>`;

  // Helper: input inline de config
  function bindConfigInput(inputId, chave, label) {
    const el = $("#" + inputId);
    if (!el) return;
    applyCurrencyMask(el);
    let _saved = false;
    el.addEventListener("keydown", async e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      _saved = true;
      const valor = parseCurrency(el);
      await api("/api/config", { method: "POST", body: JSON.stringify({ [chave]: valor }) });
      toast(label + " salvo!", "success");
      await loadAll();
    });
    el.addEventListener("blur", async () => {
      if (!el.isConnected) return; // evita loop: elemento removido do DOM pelo re-render
      if (_saved) { _saved = false; return; }
      const valor = parseCurrency(el);
      const atual = parseFloat(state.config?.[chave]) || 0;
      if (Math.abs(valor - atual) < 0.01) return;
      await api("/api/config", { method: "POST", body: JSON.stringify({ [chave]: valor }) });
      toast(label + " salvo!", "success");
      await loadAll();
    });
  }

  bindConfigInput("dash-salario-input", "salario", "Salário");
  bindConfigInput("dash-caixa-input",   "saldo_caixa", "Caixa");

  // preview despesas (max 4)
  const preview = state.despesas.slice(0, 4);
  if (preview.length) {
    $("#dash-despesas-preview").innerHTML = preview.map(d => {
      const falta = d.valor - d.valor_pago;
      return `<div class="list-item">
        <div class="item-icon">${icon(d.icone || "receipt", 16)}</div>
        <div class="item-info">
          <div class="item-name">${d.nome}</div>
          <div class="item-sub"><span class="badge badge-red">Falta ${brl(falta)}</span></div>
        </div>
        <div class="item-value-main" style="font-size:13px;font-weight:700">${brl(d.valor)}</div>
      </div>`;
    }).join("") + (state.despesas.length > 4 ? `<div style="padding:10px 16px;font-size:12px;color:var(--color-text-muted)">+${state.despesas.length - 4} mais…</div>` : "");
  } else {
    $("#dash-despesas-preview").innerHTML = `<div class="empty-state" style="padding:24px">${icon("receipt",32)}<p>Sem despesas</p></div>`;
  }

  // preview faturas
  const bancosEl = $("#dash-bancos-preview");
  if (state.faturas.length) {
    bancosEl.innerHTML = state.faturas.map(f => `
      <div class="banco-card ${f.pago ? 'banco-pago' : ''}" style="--banco-cor:${f.cor}">
        <div class="banco-nome">${f.nome}</div>
        <div class="banco-saldo">${brl(f.valor)}</div>
        <div class="banco-label-fatura">fatura ${mesDisplay(state.mes)}</div>
        <div class="banco-status" style="margin-top:4px">
          <span class="badge ${f.pago ? 'badge-green' : 'badge-red'}" style="font-size:9px">${f.pago ? '✓ Pago' : '● Pendente'}</span>
        </div>
      </div>`).join("");
  } else {
    bancosEl.innerHTML = `<div class="empty-state" style="padding:24px;grid-column:1/-1">${icon("credit-card",32)}<p>Sem cartões</p></div>`;
  }

  // gráfico histórico
  renderChart(state.historico || []);

  // breakdown por categoria
  renderCategoriasBreakdown(state.despesas || []);
}

// ══════════════════════════════════════════════════════════════════
// GRÁFICO HISTÓRICO
// ══════════════════════════════════════════════════════════════════
let _chartInstance = null;

function renderChart(historico) {
  const canvas = $("#chart-historico");
  if (!canvas || !window.Chart) return;

  const labels   = historico.map(h => mesDisplay(h.mes).replace(/\s\d{4}/, m => " '" + m.trim().slice(2)));
  const entradas = historico.map(h => h.entradas);
  const saidas   = historico.map(h => h.saidas);
  const saldo    = historico.map(h => h.saldo);

  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

  _chartInstance = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Entradas",
          data: entradas,
          backgroundColor: "rgba(16,185,129,0.65)",
          borderRadius: 4,
          order: 2,
        },
        {
          type: "bar",
          label: "Saídas",
          data: saidas,
          backgroundColor: "rgba(239,68,68,0.65)",
          borderRadius: 4,
          order: 2,
        },
        {
          type: "line",
          label: "Saldo",
          data: saldo,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.08)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#6366f1",
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: { label: ctx => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}` },
        },
      },
      scales: {
        y: {
          ticks: { callback: v => "R$ " + Number(v).toLocaleString("pt-BR"), font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// BREAKDOWN POR CATEGORIA
// ══════════════════════════════════════════════════════════════════
function renderCategoriasBreakdown(despesas) {
  const el = $("#dash-categorias");
  if (!el) return;

  const totais = {};
  let totalGeral = 0;
  despesas.forEach(d => {
    const cat = d.categoria || "outros";
    totais[cat] = (totais[cat] || 0) + d.valor;
    totalGeral += d.valor;
  });

  if (!totalGeral) {
    el.innerHTML = `<div class="chart-title">Gastos por Categoria</div>
      <div class="empty-state" style="padding:24px">${icon("chart-bar",32)}<p>Sem despesas</p></div>`;
    return;
  }

  const sorted = Object.entries(totais).sort((a, b) => b[1] - a[1]);

  el.innerHTML = `<div class="chart-title">Gastos por Categoria</div>
    <div class="cat-list">
      ${sorted.map(([cat, total]) => {
        const c = CATEGORIAS[cat] || CATEGORIAS.outros;
        const pct = Math.round((total / totalGeral) * 100);
        return `<div class="cat-row">
          <span class="cat-label">${c.emoji} ${c.label}</span>
          <div class="cat-bar-wrap">
            <div class="cat-bar" style="width:${pct}%;background:${c.cor}"></div>
          </div>
          <span class="cat-value">${brl(total)}</span>
        </div>`;
      }).join("")}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// DESPESAS FIXAS
// ══════════════════════════════════════════════════════════════════
function renderDespesas() {
  const list = state.despesas;
  const container = $("#despesas-list");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">${icon("receipt", 40)}<p>Nenhuma despesa fixa cadastrada</p></div>`;
    return;
  }

  const total = list.reduce((s, d) => s + d.valor, 0);
  const pago  = list.reduce((s, d) => s + d.valor_pago, 0);
  const falta = total - pago;
  $("#despesas-total").textContent = `Total: ${brl(total)} · Pago: ${brl(pago)} · Falta: ${brl(falta)}`;

  container.innerHTML = `<div class="banco-grid">${list.map(d => {
    const isPago = d.valor > 0 && d.valor_pago >= d.valor;
    const pct = d.valor > 0 ? Math.min(100, Math.round((d.valor_pago / d.valor) * 100)) : 0;
    const cor = isPago ? "var(--color-green)" : "var(--color-red)";
    return `
    <div class="banco-card ${isPago ? 'banco-pago' : ''}" style="--banco-cor:${cor}" onclick="openDespesaModal(${d.id})">
      <div class="banco-nome">${icon(d.icone||"receipt",13)} ${d.nome}
        ${d.no_cartao ? `<span class="badge badge-purple" style="margin-left:4px">${icon("credit-card",9)} Cartão</span>` : ""}
      </div>
      <div class="cat-chip" style="background:${(CATEGORIAS[d.categoria||"outros"]||CATEGORIAS.outros).cor}22;color:${(CATEGORIAS[d.categoria||"outros"]||CATEGORIAS.outros).cor}">
        ${(CATEGORIAS[d.categoria||"outros"]||CATEGORIAS.outros).emoji} ${(CATEGORIAS[d.categoria||"outros"]||CATEGORIAS.outros).label}
      </div>
      <div class="banco-saldo">${brl(d.valor)}<span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">/mês</span></div>
      <div class="banco-label-fatura">Pago: ${brl(d.valor_pago)}</div>
      <div class="progress-wrap" style="margin-top:6px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${cor}"></div></div>
      </div>
      <div class="banco-status" style="margin-top:8px">
        <span class="badge ${isPago ? 'badge-green' : 'badge-red'}">${isPago ? '✓ Pago' : '● Pendente'}</span>
      </div>
      <div class="banco-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleDespesaPago(${d.id})" title="${isPago ? 'Desmarcar' : 'Marcar pago'}">${isPago ? icon("x",13) : icon("check",13)}</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteDespesa(${d.id})">${icon("trash",13)}</button>
      </div>
    </div>`;
  }).join("")}</div>`;
}

async function toggleDespesaPago(id) {
  const d = state.despesas.find(x => x.id === id);
  if (!d) return;
  const isPago = d.valor > 0 && d.valor_pago >= d.valor;
  const novoValorPago = isPago ? 0 : d.valor;
  await api(`/api/despesas/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...d, valor_pago: novoValorPago, mes_ano: state.mes }),
  });
  await loadAll();
}

async function deleteDespesa(id) {
  const d = state.despesas.find(x => x.id === id);
  if (!await confirmModal(`Excluir "${d?.nome || "despesa"}"?`, { sub: "Esta ação não pode ser desfeita." })) return;
  await api(`/api/despesas/${id}`, { method: "DELETE" });
  toast("Despesa excluída", "success");
  await loadAll();
}

let _despesaEditId = null;
let _selectedIcon = "receipt";

function openDespesaModal(id = null) {
  _despesaEditId = id;
  const d = id ? state.despesas.find(x => x.id === id) : null;
  $("#modal-despesa-title").textContent = id ? "Editar Despesa" : "Nova Despesa";
  $("#despesa-nome").value = d?.nome || "";
  setCurrency($("#despesa-valor"), d?.valor ?? "");
  setCurrency($("#despesa-valor-pago"), d?.valor_pago ?? "");
  $("#despesa-cartao").checked = d?.no_cartao == 1;
  $("#despesa-categoria").value = d?.categoria || "outros";
  openModal("modal-despesa");
}

async function saveDespesa() {
  const data = {
    nome: $("#despesa-nome").value.trim(),
    icone: (CATEGORIAS[$("#despesa-categoria").value] || CATEGORIAS.outros).icone,
    valor: parseCurrency($("#despesa-valor")),
    valor_pago: parseCurrency($("#despesa-valor-pago")),
    no_cartao: $("#despesa-cartao").checked ? 1 : 0,
    categoria: $("#despesa-categoria").value,
    mes_ano: state.mes,
  };
  if (!data.nome) { toast("Informe o nome", "error"); return; }
  if (_despesaEditId) {
    await api(`/api/despesas/${_despesaEditId}`, { method: "PUT", body: JSON.stringify(data) });
  } else {
    const r = await api("/api/despesas", { method: "POST", body: JSON.stringify(data) });
    // salva o valor_pago inicial para o mês corrente
    if (data.valor_pago > 0) {
      await api(`/api/despesas/${r.id}`, { method: "PUT", body: JSON.stringify(data) });
    }
  }
  closeModal("modal-despesa");
  toast("Despesa salva!", "success");
  await loadAll();
}

// ══════════════════════════════════════════════════════════════════
// FATURAS DOS CARTÕES (por mês)
// ══════════════════════════════════════════════════════════════════
function renderFaturas() {
  const list = state.faturas;
  const container = $("#bancos-grid");

  const total = list.reduce((s, f) => s + f.valor, 0);
  const pago  = list.filter(f => f.pago).reduce((s, f) => s + f.valor, 0);
  const falta = total - pago;
  $("#bancos-total").textContent = `Total: ${brl(total)} · Pago: ${brl(pago)} · Falta: ${brl(falta)}`;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">${icon("credit-card", 40)}<p>Nenhum cartão cadastrado</p></div>`;
    return;
  }

  container.innerHTML = list.map(f => {
    const cor = f.pago ? "var(--color-green)" : f.cor || "var(--color-red)";
    const pct = f.valor > 0 && f.pago ? 100 : 0;
    return `
    <div class="banco-card ${f.pago ? 'banco-pago' : ''}" style="--banco-cor:${cor}" onclick="openFaturaModal(${f.banco_id})">
      <div class="banco-nome">${icon("credit-card",13)} ${f.nome}</div>
      <div class="banco-saldo">${brl(f.valor)}<span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">/mês</span></div>
      <div class="banco-label-fatura">Fatura ${mesDisplay(state.mes)}</div>
      <div class="progress-wrap" style="margin-top:6px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${cor}"></div></div>
      </div>
      <div class="banco-status" style="margin-top:8px">
        <span class="badge ${f.pago ? 'badge-green' : 'badge-red'}">${f.pago ? '✓ Pago' : '● Pendente'}</span>
      </div>
      <div class="banco-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleFaturaPago(${f.banco_id}, ${f.pago ? 0 : 1})" title="${f.pago ? 'Desmarcar' : 'Marcar pago'}">${f.pago ? icon("x",13) : icon("check",13)}</button>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openBancoModal(${f.banco_id})" title="Editar">${icon("pencil",13)}</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteBanco(${f.banco_id})" title="Excluir">${icon("trash",13)}</button>
      </div>
    </div>`;
  }).join("");
}

async function toggleFaturaPago(banco_id, pago) {
  const f = state.faturas.find(x => x.banco_id === banco_id);
  if (!f) return;
  await api(`/api/faturas/${banco_id}`, {
    method: "PUT",
    body: JSON.stringify({ valor: f.valor, pago, mes_ano: state.mes }),
  });
  await loadAll();
}

// Modal para editar fatura do mês
let _faturaEditId = null;

function openFaturaModal(banco_id) {
  _faturaEditId = banco_id;
  const f = state.faturas.find(x => x.banco_id === banco_id);
  const b = state.bancos.find(x => x.id === banco_id);
  $("#modal-fatura-title").textContent = `Fatura — ${b?.nome || ""}`;
  $("#modal-fatura-mes").textContent = mesDisplay(state.mes);
  setCurrency($("#fatura-valor"), f?.valor ?? "");
  $("#fatura-pago").checked = f?.pago == 1;
  openModal("modal-fatura");
}

async function saveFatura() {
  const data = {
    valor: parseCurrency($("#fatura-valor")),
    pago: $("#fatura-pago").checked ? 1 : 0,
    mes_ano: state.mes,
  };
  await api(`/api/faturas/${_faturaEditId}`, { method: "PUT", body: JSON.stringify(data) });
  closeModal("modal-fatura");
  toast("Fatura salva!", "success");
  await loadAll();
}

// Modal para gerenciar cartões (nome + cor)
let _bancoEditId = null;

function openBancoModal(id = null) {
  _bancoEditId = id;
  const b = id ? state.bancos.find(x => x.id === id) : null;
  $("#modal-banco-title").textContent = id ? "Editar Cartão" : "Novo Cartão";
  $("#banco-nome").value = b?.nome || "";
  $("#banco-cor").value = b?.cor || "#6366f1";
  openModal("modal-banco");
}

async function saveBanco() {
  const data = {
    nome: $("#banco-nome").value.trim(),
    cor: $("#banco-cor").value,
  };
  if (!data.nome) { toast("Informe o nome", "error"); return; }
  if (_bancoEditId) {
    await api(`/api/bancos/${_bancoEditId}`, { method: "PUT", body: JSON.stringify(data) });
  } else {
    await api("/api/bancos", { method: "POST", body: JSON.stringify(data) });
  }
  closeModal("modal-banco");
  toast("Cartão salvo!", "success");
  await loadAll();
}

async function deleteBanco(id) {
  const b = state.bancos.find(x => x.id === id);
  if (!await confirmModal(`Excluir cartão "${b?.nome || ""}"?`, { sub: "Todas as faturas mensais serão removidas." })) return;
  await api(`/api/bancos/${id}`, { method: "DELETE" });
  toast("Cartão excluído", "success");
  await loadAll();
}

// ── Botão de gerenciar cartões ─────────────────────────────────────
function openGerenciarCartoes() {
  const list = state.bancos;
  $("#gerenciar-lista").innerHTML = list.length
    ? list.map(b => `
      <div class="list-item">
        <div class="item-icon" style="background:${b.cor}22;color:${b.cor}">${icon("credit-card",16)}</div>
        <div class="item-info"><div class="item-name">${b.nome}</div></div>
        <div class="item-actions" style="opacity:1">
          <button class="btn btn-ghost btn-icon" onclick="closeModal('modal-gerenciar');openBancoModal(${b.id})">${icon("pencil",15)}</button>
          <button class="btn btn-danger btn-icon" onclick="deleteBancoGerenciar(${b.id})">${icon("trash",15)}</button>
        </div>
      </div>`).join("")
    : `<div class="empty-state" style="padding:20px">${icon("credit-card",32)}<p>Nenhum cartão</p></div>`;
  openModal("modal-gerenciar");
}

async function deleteBancoGerenciar(id) {
  const b = state.bancos.find(x => x.id === id);
  if (!await confirmModal(`Excluir cartão "${b?.nome || ""}"?`, { sub: "Todas as faturas mensais serão removidas." })) return;
  await api(`/api/bancos/${id}`, { method: "DELETE" });
  toast("Cartão excluído", "success");
  await loadAll();
  openGerenciarCartoes();
}

// ══════════════════════════════════════════════════════════════════
// PARCELAS GRANDES
// ══════════════════════════════════════════════════════════════════
function renderParcelas() {
  const list = state.parcelas;
  const container = $("#parcelas-list");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">${icon("stack", 40)}<p>Nenhuma parcela cadastrada</p></div>`;
    return;
  }

  const totalPagar   = list.filter(p => p.tipo !== "receber").reduce((s, p) => s + p.valor_parcela, 0);
  const totalReceber = list.filter(p => p.tipo === "receber").reduce((s, p) => s + p.valor_parcela, 0);
  $("#parcelas-total").textContent = `A pagar: ${brl(totalPagar)} · A receber: ${brl(totalReceber)}`;

  container.innerHTML = `<div class="banco-grid">${list.map(p => {
    const isReceber = p.tipo === "receber";
    const cor = p.pago ? "var(--color-green)" : isReceber ? "var(--color-blue)" : "var(--color-yellow)";
    const pct = Math.round((p.parcela_atual / p.total_parcelas) * 100);
    const restantes = p.total_parcelas - p.parcela_atual;
    return `
    <div class="banco-card ${p.pago ? 'banco-pago' : ''}" style="--banco-cor:${cor}" onclick="openParcelaModal(${p.id})">
      <div class="banco-nome">${icon(p.icone||"stack",13)} ${p.nome}</div>
      <div class="banco-saldo">${brl(p.valor_parcela)}<span style="font-size:11px;font-weight:400;color:var(--color-text-muted)">/mês</span></div>
      <div class="banco-label-fatura">Parcela ${p.parcela_atual}/${p.total_parcelas} · ${restantes > 0 ? `faltam ${restantes}x` : "última"}</div>
      <div class="progress-wrap" style="margin-top:6px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${cor}"></div></div>
      </div>
      <div class="banco-status" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge ${isReceber ? 'badge-blue' : 'badge-purple'}">${isReceber ? '↓ Receber' : '↑ Pagar'}</span>
        <span class="badge ${p.pago ? 'badge-green' : 'badge-red'}">${p.pago ? '✓ Pago' : '● Pendente'}</span>
      </div>
      <div class="banco-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleParcelaPago(${p.id}, ${p.pago ? 0 : 1})" title="${p.pago ? 'Desmarcar' : 'Marcar pago'}">${p.pago ? icon("x",13) : icon("check",13)}</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteParcela(${p.id})">${icon("trash",13)}</button>
      </div>
    </div>`;
  }).join("")}</div>`;
}

let _parcelaEditId = null;
let _selectedParcelaIcon = "credit-card";
let _parcelaTipo = "pagar";

function setParcelaTipo(tipo) {
  _parcelaTipo = tipo;
  $$("[data-tipo]", $("#parcela-tipo-toggle")).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tipo === tipo);
  });
  // ajusta cor do toggle conforme tipo
  $("#parcela-tipo-toggle").dataset.tipo = tipo;
}

function openParcelaModal(id = null) {
  _parcelaEditId = id;
  const p = id ? state.parcelas.find(x => x.id === id) : null;
  $("#modal-parcela-title").textContent = id ? "Editar Parcela" : "Nova Parcela";
  $("#parcela-nome").value = p?.nome || "";
  setCurrency($("#parcela-valor"), p?.valor_parcela ?? "");
  $("#parcela-inicio").value = p?.mes_inicio || state.mes;
  $("#parcela-total").value = p?.total_parcelas || 1;
  $("#parcela-cartao").checked = p?.no_cartao == 1;
  setParcelaTipo(p?.tipo || "pagar");
  _selectedParcelaIcon = p?.icone || "credit-card";
  renderIconPicker("parcela-icon-picker", _selectedParcelaIcon, (ic) => { _selectedParcelaIcon = ic; });
  openModal("modal-parcela");
}

async function saveParcela() {
  const data = {
    nome: $("#parcela-nome").value.trim(),
    icone: _selectedParcelaIcon,
    valor_parcela: parseCurrency($("#parcela-valor")),
    mes_inicio: $("#parcela-inicio").value || state.mes,
    total_parcelas: parseInt($("#parcela-total").value) || 1,
    no_cartao: $("#parcela-cartao").checked ? 1 : 0,
    tipo: _parcelaTipo,
  };
  if (!data.nome) { toast("Informe o nome", "error"); return; }
  if (_parcelaEditId) {
    await api(`/api/parcelas/${_parcelaEditId}`, { method: "PUT", body: JSON.stringify(data) });
  } else {
    await api("/api/parcelas", { method: "POST", body: JSON.stringify(data) });
  }
  closeModal("modal-parcela");
  toast("Parcela salva!", "success");
  await loadAll();
}

async function toggleParcelaPago(id, pago) {
  await api(`/api/parcelas/${id}/pago`, {
    method: "PUT",
    body: JSON.stringify({ pago, mes_ano: state.mes }),
  });
  await loadAll();
}

async function deleteParcela(id) {
  const p = state.parcelas.find(x => x.id === id);
  if (!await confirmModal(`Excluir "${p?.nome || "parcela"}"?`, { sub: "Esta ação não pode ser desfeita." })) return;
  await api(`/api/parcelas/${id}`, { method: "DELETE" });
  toast("Parcela excluída", "success");
  await loadAll();
}

// ══════════════════════════════════════════════════════════════════
// CAIXA OUTROS (filtrado por mês)
// ══════════════════════════════════════════════════════════════════
function renderCaixa() {
  const list = state.caixa;
  const container = $("#caixa-list");
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">${icon("shopping-bag", 40)}<p>Nenhum item em ${mesDisplay(state.mes)}</p></div>`;
    return;
  }

  const total    = list.reduce((s, c) => s + c.valor, 0);
  const recebido = list.filter(c => c.pago).reduce((s, c) => s + c.valor, 0);
  const aReceber = total - recebido;
  $("#caixa-total").textContent = `Total: ${brl(total)} · Recebido: ${brl(recebido)} · A receber: ${brl(aReceber)}`;

  container.innerHTML = `<div class="banco-grid">${list.map(c => {
    const cor = c.pago ? "var(--color-green)" : "var(--color-blue)";
    return `
    <div class="banco-card ${c.pago ? 'banco-pago' : ''}" style="--banco-cor:${cor}" onclick="openCaixaModal(${c.id})">
      <div class="banco-nome">${icon(c.icone||"shopping-bag",13)} ${c.nome}</div>
      <div class="banco-saldo">${brl(c.valor)}</div>
      <div class="banco-label-fatura">${mesDisplay(state.mes)}</div>
      <div class="banco-status" style="margin-top:8px">
        <span class="badge ${c.pago ? 'badge-green' : 'badge-yellow'}">${c.pago ? '✓ Recebido' : '● A receber'}</span>
      </div>
      <div class="banco-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleCaixaPago(${c.id}, ${c.pago ? 0 : 1})" title="${c.pago ? 'Desmarcar' : 'Marcar recebido'}">${c.pago ? icon("x",13) : icon("check",13)}</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteCaixa(${c.id})">${icon("trash",13)}</button>
      </div>
    </div>`;
  }).join("")}</div>`;
}

async function toggleCaixaPago(id, pago) {
  const c = state.caixa.find(x => x.id === id);
  if (!c) return;
  await api(`/api/caixa/${id}`, { method: "PUT", body: JSON.stringify({ ...c, pago }) });
  await loadAll();
}

let _caixaEditId = null;
let _selectedCaixaIcon = "shopping-bag";

function openCaixaModal(id = null) {
  _caixaEditId = id;
  const c = id ? state.caixa.find(x => x.id === id) : null;
  $("#modal-caixa-title").textContent = id ? "Editar Item" : "Novo Item";
  $("#caixa-nome").value = c?.nome || "";
  setCurrency($("#caixa-valor"), c?.valor ?? "");
  $("#caixa-pago").checked = c?.pago == 1;
  _selectedCaixaIcon = c?.icone || "shopping-bag";
  renderIconPicker("caixa-icon-picker", _selectedCaixaIcon, (ic) => { _selectedCaixaIcon = ic; });
  openModal("modal-caixa");
}

async function saveCaixa() {
  const data = {
    nome: $("#caixa-nome").value.trim(),
    icone: _selectedCaixaIcon,
    valor: parseCurrency($("#caixa-valor")),
    pago: $("#caixa-pago").checked ? 1 : 0,
    mes_ano: state.mes,
  };
  if (!data.nome) { toast("Informe o nome", "error"); return; }
  if (_caixaEditId) {
    await api(`/api/caixa/${_caixaEditId}`, { method: "PUT", body: JSON.stringify(data) });
  } else {
    await api(`/api/caixa?mes=${state.mes}`, { method: "POST", body: JSON.stringify(data) });
  }
  closeModal("modal-caixa");
  toast("Item salvo!", "success");
  await loadAll();
}

async function deleteCaixa(id) {
  const c = state.caixa.find(x => x.id === id);
  if (!await confirmModal(`Excluir "${c?.nome || "item"}"?`, { sub: "Esta ação não pode ser desfeita." })) return;
  await api(`/api/caixa/${id}`, { method: "DELETE" });
  toast("Item excluído", "success");
  await loadAll();
}

// ══════════════════════════════════════════════════════════════════
// CONFIG / SALÁRIO
// ══════════════════════════════════════════════════════════════════
function renderConfig() {
  setCurrency($("#config-salario"), state.config.salario ?? "");
}

async function saveConfig() {
  const salario = parseCurrency($("#config-salario"));
  await api("/api/config", { method: "POST", body: JSON.stringify({ salario }) });
  toast("Configurações salvas!", "success");
  await loadAll();
}


// ══════════════════════════════════════════════════════════════════
// BACKUP / RESTORE
// ══════════════════════════════════════════════════════════════════
async function downloadBackup() {
  const r = await fetch("/api/backup");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_financas_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Backup baixado!", "success");
}

async function uploadBackup() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    if (!await confirmModal("Restaurar backup?", { warn: true, okLabel: "Restaurar", sub: "Todos os dados atuais serão substituídos." })) return;
    await api("/api/restore", { method: "POST", body: JSON.stringify(data) });
    toast("Backup restaurado!", "success");
    await loadAll();
  };
  input.click();
}

// ══════════════════════════════════════════════════════════════════
// ICON PICKER
// ══════════════════════════════════════════════════════════════════
function renderIconPicker(containerId, selected, onChange) {
  const container = $(`#${containerId}`);
  container.innerHTML = ICON_LIST.map(name => `
    <button class="icon-option ${name === selected ? 'selected' : ''}" data-icon="${name}" title="${name}">
      ${icon(name, 16)}
    </button>
  `).join("");

  container.querySelectorAll(".icon-option").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".icon-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      onChange(btn.dataset.icon);
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════
function openModal(id) { $(`#${id}`).classList.add("open"); }
function closeModal(id) { $(`#${id}`).classList.remove("open"); }

// Fecha ao clicar no backdrop APENAS se o mousedown também foi no backdrop.
// Evita fechar quando o usuário arrasta de dentro do modal para fora.
let _backdropMousedownTarget = null;

document.addEventListener("mousedown", e => {
  _backdropMousedownTarget = e.target;
});

document.addEventListener("click", e => {
  if (
    e.target.classList.contains("modal-backdrop") &&
    e.target.id !== "modal-confirm" &&
    _backdropMousedownTarget === e.target          // só fecha se começou no backdrop
  ) {
    e.target.classList.remove("open");
  }
});

// ── Modal de confirmação customizado ──────────────────────────────
// Uso: const ok = await confirmModal("Excluir esta despesa?")
// Opções: { sub: "subtítulo", okLabel: "Excluir", icon: SVG_STRING }
function confirmModal(message, opts = {}) {
  return new Promise(resolve => {
    const TRASH_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7v-3h6v3"/></svg>`;
    const WARN_ICON  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536a1.914 1.914 0 0 0-3.274 0z"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    $("#confirm-icon").innerHTML = opts.icon || (opts.warn ? WARN_ICON : TRASH_ICON);
    $("#confirm-icon").style.background = opts.warn ? "var(--color-yellow-bg)" : "var(--color-red-bg)";
    $("#confirm-icon").style.color = opts.warn ? "var(--color-yellow)" : "var(--color-red)";
    $("#confirm-message").textContent = message;
    $("#confirm-sub").textContent = opts.sub || "";
    $("#confirm-sub").style.display = opts.sub ? "block" : "none";
    $("#confirm-ok").textContent = opts.okLabel || "Excluir";
    $("#confirm-ok").className = opts.warn
      ? "btn btn-primary" : "btn btn-danger-solid";
    $("#confirm-ok").style.minWidth = "100px";

    openModal("modal-confirm");

    const ok = $("#confirm-ok");
    const cancel = $("#confirm-cancel");

    function cleanup(result) {
      ok.replaceWith(ok.cloneNode(true));       // remove listeners antigos
      cancel.replaceWith(cancel.cloneNode(true));
      closeModal("modal-confirm");
      // Re-bind para o próximo uso
      bindConfirmButtons();
      resolve(result);
    }

    ok.addEventListener("click", () => cleanup(true),  { once: true });
    cancel.addEventListener("click", () => cleanup(false), { once: true });
  });
}

function bindConfirmButtons() {
  // Re-attachment happens inside cleanup — nothing needed here
}

// ══════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  navigate("dashboard");
  renderMesNav();
  loadAll();

  // Aplica máscara de moeda em todos os inputs monetários
  $$(".input-currency").forEach(applyCurrencyMask);

  $$(".nav-item[data-section]").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.section));
  });
});
