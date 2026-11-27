/* =============================================================================
   FINANCE 3D — Gerenciador financeiro pessoal
   -----------------------------------------------------------------------------
   script.js · organização:
     1. Utilitários (datas, moeda, DOM)
     2. Constantes e categorias
     3. Store (LocalStorage, normalização, backup)
     4. Motor financeiro (cálculos de contas, empréstimos, cartões, projeções)
     5. Ícones (subconjunto embutido do Lucide — funciona offline)
     6. UI base (toasts, modais, confirmação, formulários)
     7. Motion (GSAP + ScrollTrigger + SplitText + Lenis, com reduced-motion)
     8. Gráficos (Chart.js)
     9. Views (dashboard, contas, entradas, empréstimos, cartões, calendário,
        relatórios, inteligência, ajustes)
    10. Formulários de cadastro
    11. Ações, busca, exportações e inicialização
   ========================================================================== */
(() => {
  'use strict';

  /* ===========================================================================
     1. UTILITÁRIOS
     ======================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const sum = (arr, fn = (x) => x) => round2(arr.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mq = (q) => window.matchMedia(q).matches;

  /* ---- Datas (sempre ISO AAAA-MM-DD internamente, exibidas como DD/MM/AAAA) ---- */
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toISO(new Date());
  const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
  const isYM = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  const ymOf = (iso) => iso.slice(0, 7);
  const ymNow = () => today().slice(0, 7);
  const ymAdd = (ym, n) => {
    const t = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + n;
    return `${Math.floor(t / 12)}-${pad(((t % 12) + 12) % 12 + 1)}`;
  };
  const ymDiff = (from, to) => (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
  const daysInYM = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const dateIn = (ym, day) => `${ym}-${pad(clamp(Number(day) || 1, 1, daysInYM(ym)))}`;
  const addMonthsISO = (iso, n) => dateIn(ymAdd(ymOf(iso), n), Number(iso.slice(8, 10)));
  const addDaysISO = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
  const endOfYM = (ym) => dateIn(ym, 31);
  const fmtDate = (iso) => (isISO(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
  const fmtDM = (iso) => (isISO(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
  const ymLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
  const ymShort = (ym) => `${MONTHS_SHORT[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
  const parseBRDate = (s) => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim());
    if (!m) return '';
    const iso = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return isISO(iso) ? iso : '';
  };
  const relDays = (iso, t = today()) => {
    const d = daysBetween(t, iso);
    if (d === 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d === -1) return 'ontem';
    return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
  };

  /* ---- Moeda (R$) ---- */
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const NUM2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const MASK = 'R$ •••••';
  let HIDE = false;

  const money = (v, opts = {}) => {
    if (HIDE && !opts.force) return MASK;
    const n = round2(v || 0);
    const s = BRL.format(Object.is(n, -0) ? 0 : n);
    return opts.sign && n > 0 ? `+${s}` : s;
  };
  const moneyCompact = (v) => {
    if (HIDE) return '•••';
    const n = Math.abs(v) < 10000 ? BRL.format(Math.round(v)).replace(/,00$/, '') : `R$ ${COMPACT.format(v)}`;
    return n;
  };
  const pct = (v, digits = 0) => (v == null || !isFinite(v) ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`);
  const moneyInput = (v) => (v === '' || v == null || !isFinite(v) ? '' : NUM2.format(v));

  /** Converte "1.234,56", "1234.56", "R$ 99,90" em número. */
  const parseMoney = (input) => {
    if (typeof input === 'number') return isFinite(input) ? round2(input) : NaN;
    let s = String(input ?? '').replace(/[R$\s ]/g, '').trim();
    if (!s) return NaN;
    const neg = s.startsWith('-');
    s = s.replace(/^[-+]/, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? round2(neg ? -n : n) : NaN;
  };

  /* ===========================================================================
     2. CONSTANTES E CATEGORIAS
     ======================================================================== */
  const BILL_CATS = [
    { id: 'aluguel', label: 'Aluguel', icon: 'House', color: '#7d9bff' },
    { id: 'energia', label: 'Energia elétrica', icon: 'Zap', color: '#f5c542' },
    { id: 'agua', label: 'Água', icon: 'Droplets', color: '#45c6ea' },
    { id: 'internet', label: 'Internet', icon: 'Wifi', color: '#a48bff' },
    { id: 'condominio', label: 'Condomínio', icon: 'Building2', color: '#b4bccb' },
    { id: 'gas', label: 'Gás', icon: 'Flame', color: '#ff9a5c' },
    { id: 'mercado', label: 'Mercado', icon: 'ShoppingCart', color: '#3fd68a' },
    { id: 'limpeza', label: 'Limpeza', icon: 'Sparkles', color: '#6fe3d2' },
    { id: 'telefone', label: 'Telefone / celular', icon: 'Smartphone', color: '#8fb3ff' },
    { id: 'transporte', label: 'Transporte', icon: 'Car', color: '#ffb86b' },
    { id: 'saude', label: 'Saúde', icon: 'HeartPulse', color: '#ff7b8a' },
    { id: 'educacao', label: 'Educação', icon: 'GraduationCap', color: '#c3a6ff' },
    { id: 'assinaturas', label: 'Assinaturas', icon: 'Tv', color: '#7fd1ff' },
    { id: 'lazer', label: 'Lazer', icon: 'Plane', color: '#ffd36b' },
    { id: 'outros', label: 'Outras despesas', icon: 'Receipt', color: '#9aa4b6' },
  ];
  const SPECIAL_CATS = [
    { id: 'emprestimos', label: 'Empréstimos e dívidas', icon: 'Landmark', color: '#9887ef' },
    { id: 'cartao', label: 'Cartão de crédito', icon: 'CreditCard', color: '#e76624' },
  ];
  const INCOME_CATS = [
    { id: 'salario', label: 'Salário', icon: 'Briefcase', color: '#3fd68a' },
    { id: 'extra', label: 'Renda extra', icon: 'Sparkles', color: '#6fe3d2' },
    { id: 'trabalhos', label: 'Trabalhos adicionais', icon: 'Wrench', color: '#8fb3ff' },
    { id: 'diversos', label: 'Recebimentos diversos', icon: 'HandCoins', color: '#f5c542' },
    { id: 'outros', label: 'Outros', icon: 'CircleDollarSign', color: '#b4bccb' },
  ];
  const METHODS = [
    { id: 'pix', label: 'Pix' },
    { id: 'boleto', label: 'Boleto' },
    { id: 'debito_auto', label: 'Débito automático' },
    { id: 'cartao_credito', label: 'Cartão de crédito' },
    { id: 'cartao_debito', label: 'Cartão de débito' },
    { id: 'dinheiro', label: 'Dinheiro' },
    { id: 'transferencia', label: 'Transferência' },
  ];
  const LOAN_TYPES = [
    { id: 'pessoal', label: 'Empréstimo pessoal' },
    { id: 'consignado', label: 'Consignado' },
    { id: 'financiamento', label: 'Financiamento' },
    { id: 'divida', label: 'Dívida / acordo' },
    { id: 'particular', label: 'Empréstimo particular' },
    { id: 'outro', label: 'Outro' },
  ];
  const CARD_BRANDS = [
    { id: 'visa', label: 'Visa' }, { id: 'master', label: 'Mastercard' }, { id: 'elo', label: 'Elo' },
    { id: 'amex', label: 'Amex' }, { id: 'hiper', label: 'Hipercard' }, { id: 'outro', label: 'Outro' },
  ];
  const CARD_COLORS = [
    { id: 'grafite', label: 'Grafite', c1: '#3a4252', c2: '#141821' },
    { id: 'onix', label: 'Ônix', c1: '#22252d', c2: '#050608' },
    { id: 'esmeralda', label: 'Esmeralda', c1: '#1f8f5c', c2: '#0b3324' },
    { id: 'safira', label: 'Safira', c1: '#2f5fd0', c2: '#0e1f4f' },
    { id: 'ametista', label: 'Ametista', c1: '#7354d6', c2: '#26174f' },
    { id: 'rubi', label: 'Rubi', c1: '#c23a4b', c2: '#45111b' },
    { id: 'dourado', label: 'Dourado', c1: '#b8913a', c2: '#3f2f0e' },
    { id: 'prata', label: 'Prata', c1: '#9aa3b4', c2: '#3b414e' },
  ];
  /* Cores de séries dos gráficos — validadas (CVD/contraste) sobre a superfície escura #121722 */
  const SERIES = {
    income: '#22b965',
    expense: '#b52b38',
    balance: '#338ced',
    debt: '#9887ef',
    kinds: { casa: '#00a888', cartoes: '#e76624', emprestimos: '#9887ef' },
  };
  const KIND_LABEL = { casa: 'Contas da casa', cartoes: 'Cartões de crédito', emprestimos: 'Empréstimos' };

  const catMap = (list) => Object.fromEntries(list.map((c) => [c.id, c]));
  const BILL_CAT = catMap([...BILL_CATS, ...SPECIAL_CATS]);
  const INCOME_CAT = catMap(INCOME_CATS);
  const METHOD = catMap(METHODS);
  const LOAN_TYPE = catMap(LOAN_TYPES);
  const BRAND = catMap(CARD_BRANDS);
  const COLOR = catMap(CARD_COLORS);
  const billCat = (id) => BILL_CAT[id] || BILL_CAT.outros;
  const incomeCat = (id) => INCOME_CAT[id] || INCOME_CAT.outros;

  /* ===========================================================================
     3. STORE — LocalStorage com normalização e validação
     ======================================================================== */
  const STORE_KEY = 'finance3d:data:v1';
  const SNAPSHOT_KEY = 'finance3d:before-restore';

  const DEFAULT_STATE = () => ({
    app: 'finance3d',
    version: 1,
    createdAt: today(),
    settings: {
      name: '',
      openingBalance: 0,
      savingsGoal: 20,
      hideValues: false,
      motion: 'auto',
      alertDays: 5,
      onboarded: false,
    },
    bills: [],
    incomes: [],
    loans: [],
    cards: [],
    purchases: [],
    invoicePayments: [],
  });

  const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
  const num = (v, def = 0) => { const n = parseMoney(v); return isFinite(n) ? n : def; };
  const int = (v, def = 0) => { const n = parseInt(v, 10); return isFinite(n) ? n : def; };
  const arr = (v) => (Array.isArray(v) ? v : []);
  const idOk = (v) => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : uid());

  const normBill = (b) => {
    if (!b || !isISO(b.dueDate)) return null;
    const paid = !!b.paid;
    return {
      id: idOk(b.id), name: str(b.name, 80) || 'Conta', amount: Math.abs(num(b.amount)),
      dueDate: b.dueDate, category: BILL_CAT[b.category] && !['emprestimos', 'cartao'].includes(b.category) ? b.category : 'outros',
      paid, paidDate: paid ? (isISO(b.paidDate) ? b.paidDate : b.dueDate) : '',
      method: METHOD[b.method] ? b.method : '', notes: str(b.notes, 500), seriesId: str(b.seriesId, 40),
      demo: !!b.demo, createdAt: isISO(b.createdAt) ? b.createdAt : today(),
    };
  };
  const normIncome = (i) => {
    if (!i || !isISO(i.date)) return null;
    return {
      id: idOk(i.id), description: str(i.description, 80) || 'Entrada', amount: Math.abs(num(i.amount)),
      date: i.date, category: INCOME_CAT[i.category] ? i.category : 'outros', received: i.received !== false,
      notes: str(i.notes, 500), seriesId: str(i.seriesId, 40), demo: !!i.demo,
      createdAt: isISO(i.createdAt) ? i.createdAt : today(),
    };
  };
  const normLoan = (l) => {
    if (!l || !isISO(l.firstDueDate)) return null;
    const total = clamp(int(l.totalInstallments, 1), 1, 600);
    const rate = l.interestRate === null || l.interestRate === '' || l.interestRate === undefined ? null : num(l.interestRate, null);
    const override = l.balanceOverride === null || l.balanceOverride === '' || l.balanceOverride === undefined ? null : num(l.balanceOverride, null);
    return {
      id: idOk(l.id), creditor: str(l.creditor, 80) || 'Credor', type: LOAN_TYPE[l.type] ? l.type : 'pessoal',
      originalAmount: Math.abs(num(l.originalAmount)), totalInstallments: total,
      installmentValue: Math.abs(num(l.installmentValue)), paidInstallments: clamp(int(l.paidInstallments, 0), 0, total),
      firstDueDate: l.firstDueDate, interestRate: rate != null && rate >= 0 ? rate : null,
      balanceOverride: override != null && override >= 0 ? override : null,
      balanceOverridePaid: int(l.balanceOverridePaid, -1), notes: str(l.notes, 500),
      payments: arr(l.payments).filter((p) => p && isISO(p.date)).map((p) => ({ id: idOk(p.id), date: p.date, amount: Math.abs(num(p.amount)), n: int(p.n, 0) })),
      demo: !!l.demo, createdAt: isISO(l.createdAt) ? l.createdAt : today(),
    };
  };
  const normCard = (c) => {
    if (!c) return null;
    return {
      id: idOk(c.id), name: str(c.name, 40) || 'Cartão', brand: BRAND[c.brand] ? c.brand : 'outro',
      limit: Math.abs(num(c.limit)), closingDay: clamp(int(c.closingDay, 1), 1, 31), dueDay: clamp(int(c.dueDay, 10), 1, 31),
      color: COLOR[c.color] ? c.color : 'grafite', startYm: isYM(c.startYm) ? c.startYm : ymNow(),
      demo: !!c.demo, createdAt: isISO(c.createdAt) ? c.createdAt : today(),
    };
  };
  const normPurchase = (p) => {
    if (!p || !isISO(p.date) || typeof p.cardId !== 'string') return null;
    return {
      id: idOk(p.id), cardId: p.cardId, description: str(p.description, 80) || 'Compra', amount: Math.abs(num(p.amount)),
      installments: clamp(int(p.installments, 1), 1, 72), date: p.date,
      category: BILL_CAT[p.category] && !['emprestimos', 'cartao'].includes(p.category) ? p.category : 'outros',
      notes: str(p.notes, 500), demo: !!p.demo, createdAt: isISO(p.createdAt) ? p.createdAt : today(),
    };
  };
  const normInvoicePayment = (p) => {
    if (!p || !isYM(p.ym) || !isISO(p.date) || typeof p.cardId !== 'string') return null;
    return { id: idOk(p.id), cardId: p.cardId, ym: p.ym, amount: Math.abs(num(p.amount)), date: p.date, demo: !!p.demo };
  };

  /** Normaliza qualquer objeto (inclusive backups importados) para o formato atual. */
  const normalize = (raw) => {
    const base = DEFAULT_STATE();
    if (!raw || typeof raw !== 'object') return base;
    const src = raw.data && typeof raw.data === 'object' && !raw.bills ? raw.data : raw;
    const st = src.settings || {};
    const s = base;
    s.createdAt = isISO(src.createdAt) ? src.createdAt : base.createdAt;
    s.settings = {
      name: str(st.name, 40),
      openingBalance: num(st.openingBalance, 0),
      savingsGoal: clamp(int(st.savingsGoal, 20), 0, 90),
      hideValues: !!st.hideValues,
      motion: ['auto', 'reduced', 'full'].includes(st.motion) ? st.motion : 'auto',
      alertDays: clamp(int(st.alertDays, 5), 1, 30),
      onboarded: !!st.onboarded,
    };
    s.bills = arr(src.bills).map(normBill).filter(Boolean);
    s.incomes = arr(src.incomes).map(normIncome).filter(Boolean);
    s.loans = arr(src.loans).map(normLoan).filter(Boolean);
    s.cards = arr(src.cards).map(normCard).filter(Boolean);
    const cardIds = new Set(s.cards.map((c) => c.id));
    s.purchases = arr(src.purchases).map(normPurchase).filter((p) => p && cardIds.has(p.cardId));
    s.invoicePayments = arr(src.invoicePayments).map(normInvoicePayment).filter((p) => p && cardIds.has(p.cardId));
    return s;
  };

  const Store = {
    state: DEFAULT_STATE(),
    persistent: true,
    lastSaved: null,
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        this.state = raw ? normalize(JSON.parse(raw)) : DEFAULT_STATE();
      } catch (err) {
        console.warn('[Finance 3D] Não foi possível ler os dados salvos:', err);
        this.state = DEFAULT_STATE();
        this.persistent = this.canPersist();
      }
      HIDE = this.state.settings.hideValues;
      Fin.invalidate();
    },
    canPersist() {
      try { localStorage.setItem('finance3d:probe', '1'); localStorage.removeItem('finance3d:probe'); return true; } catch { return false; }
    },
    save() {
      Fin.invalidate();
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
        this.persistent = true;
        this.lastSaved = new Date();
      } catch (err) {
        this.persistent = false;
        console.error('[Finance 3D] Falha ao salvar:', err);
        toast('Não foi possível salvar no navegador. Exporte um backup para não perder dados.', { type: 'error', duration: 7000 });
      }
      UI.updateSaveState();
    },
    /** Aplica uma mutação, salva e atualiza a interface. */
    commit(mutator, { refresh = true } = {}) {
      mutator(this.state);
      this.save();
      if (refresh) App.refresh();
    },
    get hasData() {
      const s = this.state;
      return s.bills.length + s.incomes.length + s.loans.length + s.cards.length > 0;
    },
    get hasDemo() {
      const s = this.state;
      return [s.bills, s.incomes, s.loans, s.cards].some((list) => list.some((x) => x.demo));
    },
  };
  const S = () => Store.state;

  /* ===========================================================================
     4. MOTOR FINANCEIRO
     ======================================================================== */
  /** Taxa mensal implícita (bisseção) para PV, PMT e n parcelas. */
  const impliedRate = (pv, pmt, n) => {
    if (!(pv > 0 && pmt > 0 && n > 0) || pmt * n <= pv + 0.005) return 0;
    let lo = 0, hi = 1;
    const f = (i) => pv * i / (1 - Math.pow(1 + i, -n)) - pmt;
    for (let k = 0; k < 120; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  };
  /** Parcela pela Tabela Price. iPct em % ao mês. */
  const calcPMT = (pv, iPct, n) => {
    if (!(pv > 0 && n > 0)) return 0;
    const i = (Number(iPct) || 0) / 100;
    if (i === 0) return round2(pv / n);
    return round2(pv * i / (1 - Math.pow(1 + i, -n)));
  };
  /** Valor presente de r parcelas restantes. */
  const presentValue = (pmt, i, r) => (i > 0 ? pmt * (1 - Math.pow(1 + i, -r)) / i : pmt * r);

  const Fin = {
    _cache: new Map(),
    invalidate() { this._cache.clear(); },
    memo(key, fn) {
      if (!this._cache.has(key)) this._cache.set(key, fn());
      return this._cache.get(key);
    },

    billStatus: (b, t = today()) => (b.paid ? 'paid' : b.dueDate < t ? 'late' : 'pending'),

    /* ---------- Empréstimos ---------- */
    loanDue: (l, n) => addMonthsISO(l.firstDueDate, n - 1),
    loanInfo(l, t = today()) {
      return this.memo(`loan:${l.id}:${t}`, () => {
        const total = l.totalInstallments;
        const paid = Math.min(l.paidInstallments, total);
        const remaining = total - paid;
        const pmt = l.installmentValue;
        const paidAmount = round2(paid * pmt);
        const remainingAmount = round2(remaining * pmt);
        const committed = round2(total * pmt);
        const nextDue = remaining > 0 ? this.loanDue(l, paid + 1) : null;
        const endDate = this.loanDue(l, total);
        let lateCount = 0;
        for (let n = paid + 1; n <= total; n++) { if (this.loanDue(l, n) < t) lateCount++; else break; }
        let rate = null, rateSource = null;
        if (l.interestRate != null && l.interestRate > 0) { rate = l.interestRate / 100; rateSource = 'informada'; }
        else if (l.interestRate === 0) { rate = 0; rateSource = 'informada'; }
        else {
          const ir = impliedRate(l.originalAmount, pmt, total);
          if (ir > 0) { rate = ir; rateSource = 'implícita'; }
        }
        let balance = remainingAmount, balanceSource = 'nominal';
        if (l.balanceOverride != null && l.balanceOverridePaid === paid) { balance = l.balanceOverride; balanceSource = 'informado'; }
        else if (rate > 0 && remaining > 0) { balance = round2(presentValue(pmt, rate, remaining)); balanceSource = rateSource === 'informada' ? 'calculado' : 'estimado'; }
        return {
          total, paid, remaining, pmt, paidAmount, remainingAmount, committed,
          pct: total ? paid / total : 0, nextDue, endDate, lateCount,
          rate, rateSource, balance: round2(balance), balanceSource,
          interestTotal: round2(committed - l.originalAmount),
          status: remaining === 0 ? 'done' : lateCount > 0 ? 'late' : 'active',
        };
      });
    },

    /* ---------- Cartões ---------- */
    /** Mês (AAAA-MM) de vencimento da fatura em que cai uma compra feita em `iso`. */
    invoiceYmFor(card, iso) {
      const ym = ymOf(iso);
      const day = Number(iso.slice(8, 10));
      const closeDay = Math.min(card.closingDay, daysInYM(ym));
      const closeYm = day >= closeDay ? ymAdd(ym, 1) : ym;
      return card.dueDay > card.closingDay ? closeYm : ymAdd(closeYm, 1);
    },
    closingDate: (card, dueYm) => dateIn(card.dueDay > card.closingDay ? dueYm : ymAdd(dueYm, -1), card.closingDay),
    invoiceDueDate: (card, dueYm) => dateIn(dueYm, card.dueDay),
    /** Divide a compra em parcelas (centavos exatos — resto na 1ª parcela). */
    purchaseParts(p, card) {
      const first = this.invoiceYmFor(card, p.date);
      const cents = Math.round(p.amount * 100);
      const base = Math.floor(cents / p.installments);
      const rest = cents - base * p.installments;
      return Array.from({ length: p.installments }, (_, k) => ({ n: k + 1, ym: ymAdd(first, k), amount: (base + (k === 0 ? rest : 0)) / 100 }));
    },
    /** Mapa ym -> fatura com itens, valor e status. */
    invoices(card, t = today()) {
      return this.memo(`inv:${card.id}:${t}`, () => {
        const map = new Map();
        const get = (ym) => {
          if (!map.has(ym)) map.set(ym, { ym, amount: 0, items: [] });
          return map.get(ym);
        };
        S().purchases.filter((p) => p.cardId === card.id).forEach((p) => {
          this.purchaseParts(p, card).forEach((part) => {
            const inv = get(part.ym);
            inv.amount = round2(inv.amount + part.amount);
            inv.items.push({ p, part });
          });
        });
        const openYm = this.invoiceYmFor(card, t);
        get(openYm);
        map.forEach((inv) => this.decorateInvoice(card, inv, t, openYm));
        return map;
      });
    },
    decorateInvoice(card, inv, t, openYm) {
      inv.dueDate = this.invoiceDueDate(card, inv.ym);
      inv.closingDate = this.closingDate(card, inv.ym);
      inv.payment = S().invoicePayments.find((p) => p.cardId === card.id && p.ym === inv.ym) || null;
      if (inv.ym < card.startYm) inv.status = 'settled';
      else if (inv.payment) inv.status = 'paid';
      else if (inv.closingDate > t) inv.status = inv.ym === openYm ? 'open' : 'future';
      else if (inv.dueDate >= t) inv.status = 'closed';
      else inv.status = 'late';
      return inv;
    },
    invoice(card, ym, t = today()) {
      const map = this.invoices(card, t);
      if (map.has(ym)) return map.get(ym);
      return this.decorateInvoice(card, { ym, amount: 0, items: [] }, t, this.invoiceYmFor(card, t));
    },
    cardInfo(card, t = today()) {
      return this.memo(`card:${card.id}:${t}`, () => {
        const map = this.invoices(card, t);
        const openYm = this.invoiceYmFor(card, t);
        const list = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym));
        const unpaid = list.filter((i) => ['open', 'future', 'closed', 'late'].includes(i.status));
        const outstanding = sum(unpaid, (i) => i.amount);
        const open = this.invoice(card, openYm, t);
        const toPay = list.filter((i) => ['closed', 'late'].includes(i.status) && i.amount > 0);
        return {
          openYm, open, toPay, outstanding,
          available: round2(card.limit - outstanding),
          usage: card.limit > 0 ? outstanding / card.limit : 0,
          late: list.filter((i) => i.status === 'late' && i.amount > 0),
          list,
        };
      });
    },

    /* ---------- Obrigações e entradas por mês ---------- */
    obligations(ym, t = today()) {
      return this.memo(`obl:${ym}:${t}`, () => {
        const out = [];
        S().bills.forEach((b) => {
          if (ymOf(b.dueDate) !== ym) return;
          out.push({ kind: 'bill', group: 'casa', key: `b:${b.id}`, id: b.id, name: b.name, sub: billCat(b.category).label, category: b.category, amount: b.amount, dueDate: b.dueDate, status: this.billStatus(b, t), paidDate: b.paidDate, ref: b });
        });
        S().loans.forEach((l) => {
          const n = ymDiff(ymOf(l.firstDueDate), ym) + 1;
          if (n < 1 || n > l.totalInstallments) return;
          const due = this.loanDue(l, n);
          const status = n <= l.paidInstallments ? 'paid' : due < t ? 'late' : 'pending';
          out.push({ kind: 'loan', group: 'emprestimos', key: `l:${l.id}:${n}`, id: l.id, n, name: l.creditor, sub: `Parcela ${n}/${l.totalInstallments}`, category: 'emprestimos', amount: l.installmentValue, dueDate: due, status, ref: l });
        });
        S().cards.forEach((c) => {
          const inv = this.invoice(c, ym, t);
          if (inv.amount <= 0 || inv.status === 'settled') return;
          const status = inv.status === 'paid' ? 'paid' : inv.status === 'late' ? 'late' : 'pending';
          out.push({ kind: 'invoice', group: 'cartoes', key: `i:${c.id}:${ym}`, id: c.id, ym, name: `Fatura ${c.name}`, sub: inv.status === 'open' ? 'Fatura aberta' : inv.status === 'future' ? 'Fatura futura' : 'Fatura fechada', category: 'cartao', amount: inv.amount, dueDate: inv.dueDate, status, invStatus: inv.status, items: inv.items, ref: c });
        });
        return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.amount - a.amount);
      });
    },
    incomes: (ym) => S().incomes.filter((i) => ymOf(i.date) === ym).sort((a, b) => a.date.localeCompare(b.date)),

    month(ym, t = today()) {
      return this.memo(`month:${ym}:${t}`, () => {
        const obs = this.obligations(ym, t);
        const inc = this.incomes(ym);
        const received = sum(inc.filter((i) => i.received), (i) => i.amount);
        const expected = sum(inc.filter((i) => !i.received), (i) => i.amount);
        const income = round2(received + expected);
        const total = sum(obs, (o) => o.amount);
        const by = (st) => sum(obs.filter((o) => o.status === st), (o) => o.amount);
        const groups = { casa: 0, cartoes: 0, emprestimos: 0 };
        obs.forEach((o) => { groups[o.group] = round2(groups[o.group] + o.amount); });
        return {
          ym, obs, inc, received, expected, income, total,
          paid: by('paid'), pending: by('pending'), late: by('late'),
          groups, result: round2(income - total),
          committed: income > 0 ? total / income : null,
        };
      });
    },
    /** Despesas por categoria (faturas distribuídas pelas categorias das compras). */
    categories(yms, t = today()) {
      const map = new Map();
      const add = (cat, v) => map.set(cat, round2((map.get(cat) || 0) + v));
      yms.forEach((ym) => this.obligations(ym, t).forEach((o) => {
        if (o.kind === 'bill') add(o.category, o.amount);
        else if (o.kind === 'loan') add('emprestimos', o.amount);
        else o.items.forEach((it) => add(it.p.category, it.part.amount));
      }));
      return [...map.entries()].map(([id, value]) => ({ id, value, cat: billCat(id) })).sort((a, b) => b.value - a.value);
    },

    /* ---------- Caixa e saldo ---------- */
    movements() {
      return this.memo('movements', () => {
        const s = S();
        const list = [];
        s.incomes.forEach((i) => i.received && list.push({ date: i.date, amount: i.amount }));
        s.bills.forEach((b) => b.paid && list.push({ date: b.paidDate || b.dueDate, amount: -b.amount }));
        s.loans.forEach((l) => l.payments.forEach((p) => list.push({ date: p.date, amount: -p.amount })));
        s.invoicePayments.forEach((p) => list.push({ date: p.date, amount: -p.amount }));
        return list;
      });
    },
    balanceNow() { return round2(S().settings.openingBalance + sum(this.movements(), (m) => m.amount)); },
    balanceAt(iso) { return round2(S().settings.openingBalance + sum(this.movements().filter((m) => m.date <= iso), (m) => m.amount)); },

    /** Todas as obrigações em aberto com vencimento até `iso` (inclui atrasadas de qualquer mês). */
    pendingUntil(iso, t = today()) {
      return this.memo(`pend:${iso}:${t}`, () => {
        const out = [];
        S().bills.forEach((b) => {
          if (!b.paid && b.dueDate <= iso) out.push({ kind: 'bill', key: `b:${b.id}`, id: b.id, name: b.name, sub: billCat(b.category).label, category: b.category, amount: b.amount, dueDate: b.dueDate, status: this.billStatus(b, t), ref: b });
        });
        S().loans.forEach((l) => {
          for (let n = l.paidInstallments + 1; n <= l.totalInstallments; n++) {
            const due = this.loanDue(l, n);
            if (due > iso) break;
            out.push({ kind: 'loan', key: `l:${l.id}:${n}`, id: l.id, n, name: l.creditor, sub: `Parcela ${n}/${l.totalInstallments}`, category: 'emprestimos', amount: l.installmentValue, dueDate: due, status: due < t ? 'late' : 'pending', ref: l });
          }
        });
        S().cards.forEach((c) => {
          this.invoices(c, t).forEach((inv) => {
            if (inv.amount > 0 && ['open', 'future', 'closed', 'late'].includes(inv.status) && inv.dueDate <= iso) {
              out.push({ kind: 'invoice', key: `i:${c.id}:${inv.ym}`, id: c.id, ym: inv.ym, name: `Fatura ${c.name}`, sub: `Vence ${fmtDate(inv.dueDate)}`, category: 'cartao', amount: inv.amount, dueDate: inv.dueDate, status: inv.status === 'late' ? 'late' : 'pending', invStatus: inv.status, ref: c });
            }
          });
        });
        return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      });
    },
    expectedUntil(iso) { return S().incomes.filter((i) => !i.received && i.date <= iso); },
    /** Saldo previsto ao fim do mês: saldo atual + a receber − a pagar (até o fim do mês). */
    projectedEnd(ym, t = today()) {
      const end = endOfYM(ym);
      const toReceive = sum(this.expectedUntil(end), (i) => i.amount);
      const toPay = sum(this.pendingUntil(end, t), (o) => o.amount);
      return { value: round2(this.balanceNow() + toReceive - toPay), toReceive, toPay };
    },
    late(t = today()) { return this.pendingUntil(addDaysISO(t, -1), t).filter((o) => o.status === 'late'); },
    upcoming(days, t = today()) { return this.pendingUntil(addDaysISO(t, days), t).filter((o) => o.dueDate >= t); },

    debts(t = today()) {
      const loans = S().loans.map((l) => this.loanInfo(l, t));
      const loansRemaining = sum(loans, (i) => i.remainingAmount);
      const cardsOutstanding = sum(S().cards.map((c) => this.cardInfo(c, t)), (i) => i.outstanding);
      const lateBills = sum(S().bills.filter((b) => this.billStatus(b, t) === 'late'), (b) => b.amount);
      return {
        loansRemaining, cardsOutstanding, lateBills,
        total: round2(loansRemaining + cardsOutstanding + lateBills),
        activeLoans: loans.filter((i) => i.status !== 'done').length,
        monthlyLoans: sum(S().loans.filter((l) => l.paidInstallments < l.totalInstallments), (l) => l.installmentValue),
      };
    },
    /** Dívida restante ao fim de um mês (empréstimos + cartões). */
    debtAt(ym, t = today()) {
      const end = endOfYM(ym);
      let total = 0;
      S().loans.forEach((l) => {
        if (addMonthsISO(l.firstDueDate, -1) > end) return;
        for (let n = 1; n <= l.totalInstallments; n++) {
          const due = this.loanDue(l, n);
          if (due > end || n > l.paidInstallments) total += l.installmentValue;
        }
      });
      S().cards.forEach((c) => {
        this.invoices(c, t).forEach((inv) => {
          if (inv.status === 'settled') return;
          if (inv.dueDate > end || inv.status !== 'paid') {
            inv.items.forEach((it) => { if (it.p.date <= end) total += it.part.amount; });
          }
        });
      });
      return round2(total);
    },

    /** Série mensal para gráficos e relatórios. */
    series(fromYm, toYm, t = today()) {
      const cur = ymOf(t);
      const rows = [];
      for (let ym = fromYm; ym <= toYm; ym = ymAdd(ym, 1)) {
        const m = this.month(ym, t);
        const balance = ym < cur ? this.balanceAt(endOfYM(ym)) : this.projectedEnd(ym, t).value;
        rows.push({ ym, m, income: m.income, received: m.received, total: m.total, result: m.result, committed: m.committed, balance, projected: ym >= cur, debt: this.debtAt(ym, t) });
        if (rows.length > 120) break;
      }
      return rows;
    },

    /** Projeção dos próximos meses com estimativas baseadas na média recente. */
    projection(months = 6, t = today()) {
      const cur = ymOf(t);
      const past = [1, 2, 3].map((k) => this.month(ymAdd(cur, -k), t));
      const withIncome = past.filter((m) => m.received > 0);
      const avgIncome = withIncome.length ? sum(withIncome, (m) => m.received) / withIncome.length : 0;
      const withBills = past.filter((m) => m.groups.casa > 0);
      const avgBills = withBills.length ? sum(withBills, (m) => m.groups.casa) / withBills.length : 0;
      let bal = this.balanceNow();
      const rows = [];
      for (let k = 0; k < months; k++) {
        const ym = ymAdd(cur, k);
        const m = this.month(ym, t);
        let income, out, estIncome = false, estBills = false;
        if (k === 0) {
          const pj = this.projectedEnd(ym, t);
          income = pj.toReceive; out = pj.toPay;
        } else {
          income = sum(m.inc.filter((i) => !i.received), (i) => i.amount);
          if (m.income === 0 && avgIncome > 0) { income = round2(avgIncome); estIncome = true; }
          out = sum(m.obs.filter((o) => o.status !== 'paid'), (o) => o.amount);
          if (m.groups.casa === 0 && avgBills > 0) { out = round2(out + avgBills); estBills = true; }
        }
        bal = round2(bal + income - out);
        rows.push({ ym, income: round2(income), out: round2(out), result: round2(income - out), balance: bal, estIncome, estBills });
      }
      return { rows, avgIncome: round2(avgIncome), avgBills: round2(avgBills) };
    },

    /** Painel de inteligência: alertas, saúde financeira e recomendações. */
    insights(ym, t = today()) {
      return this.memo(`ins:${ym}:${t}`, () => {
        const s = S();
        const cur = ymOf(t);
        const m = this.month(ym, t);
        const late = this.late(t);
        const upcoming = this.upcoming(s.settings.alertDays, t);
        const debts = this.debts(t);
        const committed = m.committed;
        const goal = s.settings.savingsGoal / 100;
        const savingsTarget = round2(m.income * goal);
        const leftover = m.result;
        const needToCut = leftover < 0 ? round2(-leftover) : 0;
        const gapToGoal = round2(Math.max(0, savingsTarget - Math.max(0, leftover)));
        const after = ym >= cur ? this.projectedEnd(ym, t) : null;
        const proj = this.projection(6, t);
        const top = [...m.obs].sort((a, b) => b.amount - a.amount).slice(0, 5);
        const cats = this.categories([ym], t);
        const loanShare = m.income > 0 ? debts.monthlyLoans / m.income : null;
        const cards = s.cards.map((c) => ({ c, info: this.cardInfo(c, t) }));
        const alerts = [];
        const push = (level, iconName, title, text, route) => alerts.push({ level, icon: iconName, title, text, route });
        const mName = ymLabel(ym);

        if (m.total > 0 && m.total > m.income) {
          push('danger', 'TriangleAlert', 'Despesas maiores que as entradas',
            m.income > 0
              ? `Em ${mName}, as despesas (${money(m.total)}) superam as entradas (${money(m.income)}) em ${money(m.total - m.income)}.`
              : `Há ${money(m.total)} em despesas em ${mName} e nenhuma entrada registrada.`, 'inteligencia');
        }
        if (late.length) push('danger', 'CalendarX', `${late.length} ${late.length === 1 ? 'conta atrasada' : 'contas atrasadas'}`, `Total em atraso: ${money(sum(late, (o) => o.amount))}. Regularize para evitar juros e multas.`, 'calendario');
        if (after && after.value < 0) push('danger', 'TrendingDown', 'Saldo previsto negativo', `Após pagar as contas até o fim de ${mName}, o saldo previsto é ${money(after.value)}.`, 'dashboard');
        const dueSoon = upcoming.filter((o) => daysBetween(t, o.dueDate) <= 1);
        if (dueSoon.length) push('warning', 'BellRing', 'Vencendo hoje ou amanhã', dueSoon.slice(0, 3).map((o) => `${o.name} (${money(o.amount)})`).join(' · ') + (dueSoon.length > 3 ? ` e mais ${dueSoon.length - 3}` : ''), 'calendario');
        if (committed != null && committed >= 0.7 && committed <= 1) push('warning', 'Gauge', 'Renda muito comprometida', `${pct(committed)} da renda de ${mName} já está destinada a obrigações. O ideal é ficar abaixo de 70%.`, 'inteligencia');
        if (loanShare != null && loanShare > 0.3) push('warning', 'Landmark', 'Parcelas de empréstimos acima de 30% da renda', `As parcelas somam ${money(debts.monthlyLoans)} por mês (${pct(loanShare)} da renda).`, 'emprestimos');
        cards.forEach(({ c, info }) => {
          if (c.limit > 0 && info.usage >= 0.8) push('warning', 'CreditCard', `Limite do ${c.name} quase no fim`, `${pct(info.usage)} do limite utilizado. Disponível: ${money(info.available)}.`, 'cartoes');
        });
        const negMonth = proj.rows.find((r, i) => i > 0 && r.balance < 0);
        if (negMonth) push('warning', 'ChartLine', 'Projeção indica saldo negativo', `Mantido o ritmo atual, o saldo pode ficar negativo em ${ymLabel(negMonth.ym)} (${money(negMonth.balance)}).`, 'inteligencia');
        if (m.income === 0 && ym >= cur && Store.hasData) push('info', 'Info', 'Nenhuma entrada registrada', `Cadastre seus recebimentos de ${mName} para que os cálculos de sobra e comprometimento fiquem precisos.`, 'entradas');
        if (!alerts.some((a) => a.level === 'danger') && m.income > 0 && leftover > 0) {
          push('success', 'CircleCheck', 'Mês no azul', `Depois de todas as obrigações de ${mName}, sobram ${money(leftover)} (${pct(leftover / m.income)} da renda).`, 'inteligencia');
        }

        // Pontuação de saúde financeira (0–100)
        let score = null;
        if (m.income > 0 || m.total > 0 || debts.total > 0) {
          let sc = 0;
          if (committed == null) sc += 10;
          else if (committed <= 0.5) sc += 35;
          else if (committed <= 0.7) sc += 25;
          else if (committed <= 0.9) sc += 15;
          else if (committed <= 1) sc += 8;
          sc += Math.max(0, 25 - late.length * 8);
          const rate = m.income > 0 ? leftover / m.income : -1;
          sc += rate >= 0.2 ? 20 : rate >= 0.1 ? 14 : rate >= 0 ? 8 : 0;
          const annual = m.income * 12;
          const dti = debts.total === 0 ? 0 : annual > 0 ? debts.total / annual : 9;
          sc += dti <= 0.3 ? 20 : dti <= 0.6 ? 14 : dti <= 1 ? 8 : 3;
          score = clamp(Math.round(sc), 0, 100);
        }
        const scoreLabel = score == null ? 'Sem dados' : score >= 80 ? 'Excelente' : score >= 60 ? 'Boa' : score >= 40 ? 'Atenção' : 'Crítica';
        const order = { danger: 0, warning: 1, info: 2, success: 3 };
        alerts.sort((a, b) => order[a.level] - order[b.level]);
        return { m, late, upcoming, debts, committed, savingsTarget, leftover, needToCut, gapToGoal, after, proj, top, cats, loanShare, cards, alerts, score, scoreLabel, goal };
      });
    },
  };

  /* ===========================================================================
     5. ÍCONES — subconjunto do Lucide (ISC License · lucide.dev) embutido
        para o app funcionar offline. Se a biblioteca completa estiver na
        página (window.lucide), ícones extras também são resolvidos.
     ======================================================================== */
  const ICON_DATA = /*@ICONS*/{"Activity":[["path",{"d":"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"}]],"ArrowDown":[["path",{"d":"M12 5v14"}],["path",{"d":"m19 12-7 7-7-7"}]],"ArrowDownRight":[["path",{"d":"m7 7 10 10"}],["path",{"d":"M17 7v10H7"}]],"ArrowLeft":[["path",{"d":"m12 19-7-7 7-7"}],["path",{"d":"M19 12H5"}]],"ArrowRight":[["path",{"d":"M5 12h14"}],["path",{"d":"m12 5 7 7-7 7"}]],"ArrowUp":[["path",{"d":"m5 12 7-7 7 7"}],["path",{"d":"M12 19V5"}]],"ArrowUpRight":[["path",{"d":"M7 7h10v10"}],["path",{"d":"M7 17 17 7"}]],"BanknoteArrowDown":[["path",{"d":"M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"}],["path",{"d":"m16 19 3 3 3-3"}],["path",{"d":"M18 12h.01"}],["path",{"d":"M19 16v6"}],["path",{"d":"M6 12h.01"}],["circle",{"cx":"12","cy":"12","r":"2"}]],"BanknoteArrowUp":[["path",{"d":"M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"}],["path",{"d":"M18 12h.01"}],["path",{"d":"M19 22v-6"}],["path",{"d":"m22 19-3-3-3 3"}],["path",{"d":"M6 12h.01"}],["circle",{"cx":"12","cy":"12","r":"2"}]],"Bell":[["path",{"d":"M10.268 21a2 2 0 0 0 3.464 0"}],["path",{"d":"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}]],"BellRing":[["path",{"d":"M10.268 21a2 2 0 0 0 3.464 0"}],["path",{"d":"M22 8c0-2.3-.8-4.3-2-6"}],["path",{"d":"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}],["path",{"d":"M4 2C2.8 3.7 2 5.7 2 8"}]],"Brain":[["path",{"d":"M12 18V5"}],["path",{"d":"M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4"}],["path",{"d":"M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294"}],["path",{"d":"M17.996 5.125a4 4 0 012.526 5.77"}],["path",{"d":"M18 18a4 4 0 002-7.465"}],["path",{"d":"M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517"}],["path",{"d":"M6 18a4 4 0 01-2-7.465"}],["path",{"d":"M6.004 5.125a4 4 0 00-2.526 5.77"}]],"Briefcase":[["path",{"d":"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}],["rect",{"width":"20","height":"14","x":"2","y":"6","rx":"2"}]],"Building2":[["path",{"d":"M10 12h4"}],["path",{"d":"M10 8h4"}],["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"}],["path",{"d":"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"}]],"Calculator":[["rect",{"width":"16","height":"20","x":"4","y":"2","rx":"2"}],["line",{"x1":"8","x2":"16","y1":"6","y2":"6"}],["line",{"x1":"16","x2":"16","y1":"14","y2":"18"}],["path",{"d":"M16 10h.01"}],["path",{"d":"M12 10h.01"}],["path",{"d":"M8 10h.01"}],["path",{"d":"M12 14h.01"}],["path",{"d":"M8 14h.01"}],["path",{"d":"M12 18h.01"}],["path",{"d":"M8 18h.01"}]],"CalendarCheck":[["path",{"d":"M8 2v3"}],["path",{"d":"M16 2v3"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M3 9h18"}],["path",{"d":"m9 15 2 2 4-4"}]],"CalendarClock":[["path",{"d":"M16 14v2.2l1.6 1"}],["path",{"d":"M16 2v3"}],["path",{"d":"M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338"}],["path",{"d":"M3 9h5.859"}],["path",{"d":"M8 2v3"}],["circle",{"cx":"16","cy":"16","r":"6"}]],"CalendarDays":[["path",{"d":"M8 2v3"}],["path",{"d":"M16 2v3"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M3 9h18"}],["path",{"d":"M8 13h.01"}],["path",{"d":"M12 13h.01"}],["path",{"d":"M16 13h.01"}],["path",{"d":"M8 17h.01"}],["path",{"d":"M12 17h.01"}],["path",{"d":"M16 17h.01"}]],"CalendarRange":[["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M16 2v3"}],["path",{"d":"M3 9h18"}],["path",{"d":"M8 2v3"}],["path",{"d":"M17 13h-6"}],["path",{"d":"M13 17H7"}],["path",{"d":"M7 13h.01"}],["path",{"d":"M17 17h.01"}]],"CalendarX":[["path",{"d":"M8 2v3"}],["path",{"d":"M16 2v3"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"M3 9h18"}],["path",{"d":"m14 13-4 4"}],["path",{"d":"m10 13 4 4"}]],"Car":[["path",{"d":"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],["circle",{"cx":"7","cy":"17","r":"2"}],["path",{"d":"M9 17h6"}],["circle",{"cx":"17","cy":"17","r":"2"}]],"ChartBar":[["path",{"d":"M3 3v16a2 2 0 0 0 2 2h16"}],["path",{"d":"M7 16h8"}],["path",{"d":"M7 11h12"}],["path",{"d":"M7 6h3"}]],"ChartColumn":[["path",{"d":"M3 3v16a2 2 0 0 0 2 2h16"}],["path",{"d":"M18 17V9"}],["path",{"d":"M13 17V5"}],["path",{"d":"M8 17v-3"}]],"ChartLine":[["path",{"d":"M3 3v16a2 2 0 0 0 2 2h16"}],["path",{"d":"m19 9-5 5-4-4-3 3"}]],"ChartPie":[["path",{"d":"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"}],["path",{"d":"M21.21 15.89A10 10 0 1 1 8 2.83"}]],"Check":[["path",{"d":"M20 6 9 17l-5-5"}]],"ChevronDown":[["path",{"d":"m6 9 6 6 6-6"}]],"ChevronLeft":[["path",{"d":"m15 18-6-6 6-6"}]],"ChevronRight":[["path",{"d":"m9 18 6-6-6-6"}]],"CircleAlert":[["circle",{"cx":"12","cy":"12","r":"10"}],["line",{"x1":"12","x2":"12","y1":"8","y2":"12"}],["line",{"x1":"12","x2":"12.01","y1":"16","y2":"16"}]],"CircleCheck":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"m16 9-5.5 5.5L8 12"}]],"CircleDollarSign":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{"d":"M12 18V6"}]],"CircleHelp":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{"d":"M12 17h.01"}]],"Clock":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 6v6l4 2"}]],"Coins":[["path",{"d":"M13.744 17.736a6 6 0 1 1-7.48-7.48"}],["path",{"d":"M15 6h1v4"}],["path",{"d":"m6.134 14.768.866-.5 2 3.464"}],["circle",{"cx":"16","cy":"8","r":"6"}]],"CopyPlus":[["line",{"x1":"15","x2":"15","y1":"12","y2":"18"}],["line",{"x1":"12","x2":"18","y1":"15","y2":"15"}],["rect",{"width":"14","height":"14","x":"8","y":"8","rx":"2","ry":"2"}],["path",{"d":"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]],"CreditCard":[["rect",{"width":"20","height":"14","x":"2","y":"5","rx":"2"}],["line",{"x1":"2","x2":"22","y1":"10","y2":"10"}],["path",{"d":"M6 14h2"}]],"Droplets":[["path",{"d":"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"}],["path",{"d":"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"}]],"Eye":[["path",{"d":"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"}],["circle",{"cx":"12","cy":"12","r":"3"}]],"EyeOff":[["path",{"d":"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"}],["path",{"d":"M14.084 14.158a3 3 0 0 1-4.242-4.242"}],["path",{"d":"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"}],["path",{"d":"m2 2 20 20"}]],"FileDown":[["path",{"d":"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}],["path",{"d":"M14 2v5a1 1 0 0 0 1 1h5"}],["path",{"d":"M12 18v-6"}],["path",{"d":"m9 15 3 3 3-3"}]],"FileJson":[["path",{"d":"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}],["path",{"d":"M14 2v5a1 1 0 0 0 1 1h5"}],["path",{"d":"M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"}],["path",{"d":"M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"}]],"FileSpreadsheet":[["path",{"d":"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}],["path",{"d":"M14 2v5a1 1 0 0 0 1 1h5"}],["path",{"d":"M8 13h2"}],["path",{"d":"M14 13h2"}],["path",{"d":"M8 17h2"}],["path",{"d":"M14 17h2"}]],"FilterX":[["path",{"d":"M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473"}],["path",{"d":"m16.5 3.5 5 5"}],["path",{"d":"m21.5 3.5-5 5"}]],"Flag":[["path",{"d":"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"}]],"Flame":[["path",{"d":"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"}]],"FlaskConical":[["path",{"d":"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"}],["path",{"d":"M6.453 15h11.094"}],["path",{"d":"M8.5 2h7"}]],"Gauge":[["path",{"d":"m12 14 4-4"}],["path",{"d":"M3.34 19a10 10 0 1 1 17.32 0"}]],"GraduationCap":[["path",{"d":"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"}],["path",{"d":"M22 10v6"}],["path",{"d":"M6 12.5V16a6 3 0 0 0 12 0v-3.5"}]],"HandCoins":[["path",{"d":"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"}],["path",{"d":"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{"d":"m2 16 6 6"}],["circle",{"cx":"16","cy":"9","r":"2.9"}],["circle",{"cx":"6","cy":"5","r":"3"}]],"HeartPulse":[["path",{"d":"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"}],["path",{"d":"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"}]],"History":[["path",{"d":"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{"d":"M3 3v5h5"}],["path",{"d":"M12 7v5l4 2"}]],"Hourglass":[["path",{"d":"M5 22h14"}],["path",{"d":"M5 2h14"}],["path",{"d":"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"}],["path",{"d":"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"}]],"House":[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],"Info":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 16v-4"}],["path",{"d":"M12 8h.01"}]],"Landmark":[["path",{"d":"M10 18v-7"}],["path",{"d":"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"}],["path",{"d":"M14 18v-7"}],["path",{"d":"M18 18v-7"}],["path",{"d":"M3 22h18"}],["path",{"d":"M6 18v-7"}]],"LayoutDashboard":[["rect",{"width":"7","height":"9","x":"3","y":"3","rx":"1"}],["rect",{"width":"7","height":"5","x":"14","y":"3","rx":"1"}],["rect",{"width":"7","height":"9","x":"14","y":"12","rx":"1"}],["rect",{"width":"7","height":"5","x":"3","y":"16","rx":"1"}]],"LayoutGrid":[["rect",{"width":"7","height":"7","x":"3","y":"3","rx":"1"}],["rect",{"width":"7","height":"7","x":"14","y":"3","rx":"1"}],["rect",{"width":"7","height":"7","x":"14","y":"14","rx":"1"}],["rect",{"width":"7","height":"7","x":"3","y":"14","rx":"1"}]],"ListChecks":[["path",{"d":"M13 5h8"}],["path",{"d":"M13 12h8"}],["path",{"d":"M13 19h8"}],["path",{"d":"m3 17 2 2 4-4"}],["path",{"d":"m3 7 2 2 4-4"}]],"LocateFixed":[["line",{"x1":"2","x2":"5","y1":"12","y2":"12"}],["line",{"x1":"19","x2":"22","y1":"12","y2":"12"}],["line",{"x1":"12","x2":"12","y1":"2","y2":"5"}],["line",{"x1":"12","x2":"12","y1":"19","y2":"22"}],["circle",{"cx":"12","cy":"12","r":"7"}],["circle",{"cx":"12","cy":"12","r":"3"}]],"Lock":[["rect",{"width":"18","height":"11","x":"3","y":"11","rx":"2","ry":"2"}],["path",{"d":"M7 11V7a5 5 0 0 1 10 0v4"}]],"Menu":[["path",{"d":"M4 5h16"}],["path",{"d":"M4 12h16"}],["path",{"d":"M4 19h16"}]],"Minus":[["path",{"d":"M5 12h14"}]],"Nfc":[["path",{"d":"M6 8.32a7.43 7.43 0 0 1 0 7.36"}],["path",{"d":"M9.46 6.21a11.76 11.76 0 0 1 0 11.58"}],["path",{"d":"M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"}],["path",{"d":"M16.37 2a20.16 20.16 0 0 1 0 20"}]],"Pencil":[["path",{"d":"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"}],["path",{"d":"m15 5 4 4"}]],"Percent":[["line",{"x1":"19","x2":"5","y1":"5","y2":"19"}],["circle",{"cx":"6.5","cy":"6.5","r":"2.5"}],["circle",{"cx":"17.5","cy":"17.5","r":"2.5"}]],"PieChart":[["path",{"d":"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"}],["path",{"d":"M21.21 15.89A10 10 0 1 1 8 2.83"}]],"PiggyBank":[["path",{"d":"M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"}],["path",{"d":"M16 10h.01"}],["path",{"d":"M2 8v1a2 2 0 0 0 2 2h1"}]],"Plane":[["path",{"d":"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"}]],"Plus":[["path",{"d":"M5 12h14"}],["path",{"d":"M12 5v14"}]],"Receipt":[["path",{"d":"M12 17V7"}],["path",{"d":"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"}],["path",{"d":"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"}]],"Rocket":[["path",{"d":"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"}],["path",{"d":"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"}],["path",{"d":"M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"}],["path",{"d":"M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"}]],"Scale":[["path",{"d":"M12 3v18"}],["path",{"d":"m19 8 3 8a5 5 0 0 1-6 0zV7"}],["path",{"d":"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"}],["path",{"d":"m5 8 3 8a5 5 0 0 1-6 0zV7"}],["path",{"d":"M7 21h10"}]],"Scissors":[["circle",{"cx":"6","cy":"6","r":"3"}],["path",{"d":"M8.12 8.12 12 12"}],["path",{"d":"M20 4 8.12 15.88"}],["circle",{"cx":"6","cy":"18","r":"3"}],["path",{"d":"M14.8 14.8 20 20"}]],"Search":[["path",{"d":"m21 21-4.34-4.34"}],["circle",{"cx":"11","cy":"11","r":"8"}]],"SearchX":[["path",{"d":"m13.5 8.5-5 5"}],["path",{"d":"m8.5 8.5 5 5"}],["circle",{"cx":"11","cy":"11","r":"8"}],["path",{"d":"m21 21-4.3-4.3"}]],"Settings":[["path",{"d":"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{"cx":"12","cy":"12","r":"3"}]],"ShieldCheck":[["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{"d":"m9 12 2 2 4-4"}]],"ShoppingBag":[["path",{"d":"M16 10a4 4 0 0 1-8 0"}],["path",{"d":"M3.103 6.034h17.794"}],["path",{"d":"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"}]],"ShoppingCart":[["path",{"d":"m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"}],["path",{"d":"M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"}],["circle",{"cx":"18","cy":"20","r":"2"}],["circle",{"cx":"8","cy":"20","r":"2"}]],"SlidersHorizontal":[["path",{"d":"M10 5H3"}],["path",{"d":"M12 19H3"}],["path",{"d":"M14 3v4"}],["path",{"d":"M16 17v4"}],["path",{"d":"M21 12h-9"}],["path",{"d":"M21 19h-5"}],["path",{"d":"M21 5h-7"}],["path",{"d":"M8 10v4"}],["path",{"d":"M8 12H3"}]],"Smartphone":[["rect",{"width":"14","height":"20","x":"5","y":"2","rx":"2","ry":"2"}],["path",{"d":"M12 18h.01"}]],"Sparkles":[["path",{"d":"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{"d":"M20 2v4"}],["path",{"d":"M22 4h-4"}],["circle",{"cx":"4","cy":"20","r":"2"}]],"SquarePen":[["path",{"d":"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{"d":"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"}]],"StickyNote":[["path",{"d":"M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"}],["path",{"d":"M15 3v5a1 1 0 0 0 1 1h5"}]],"Table":[["path",{"d":"M12 3v18"}],["rect",{"width":"18","height":"18","x":"3","y":"3","rx":"2"}],["path",{"d":"M3 9h18"}],["path",{"d":"M3 15h18"}]],"Trash2":[["path",{"d":"M10 11v6"}],["path",{"d":"M14 11v6"}],["path",{"d":"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"}],["path",{"d":"M3 6h18"}],["path",{"d":"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}]],"TrendingDown":[["path",{"d":"M16 17h6v-6"}],["path",{"d":"m22 17-8.5-8.5-5 5L2 7"}]],"TrendingUp":[["path",{"d":"M16 7h6v6"}],["path",{"d":"m22 7-8.5 8.5-5-5L2 17"}]],"TriangleAlert":[["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]],"Trophy":[["path",{"d":"M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"}],["path",{"d":"M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"}],["path",{"d":"M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"}],["path",{"d":"M4 22h16"}],["path",{"d":"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"}],["path",{"d":"M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"}]],"Tv":[["path",{"d":"m17 2-5 5-5-5"}],["rect",{"width":"20","height":"15","x":"2","y":"7","rx":"2"}]],"Undo2":[["path",{"d":"M9 14 4 9l5-5"}],["path",{"d":"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"}]],"Upload":[["path",{"d":"M12 3v12"}],["path",{"d":"m17 8-5-5-5 5"}],["path",{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}]],"Wallet":[["path",{"d":"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"}],["path",{"d":"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"}]],"Wifi":[["path",{"d":"M12 20h.01"}],["path",{"d":"M2 8.82a15 15 0 0 1 20 0"}],["path",{"d":"M5 12.859a10 10 0 0 1 14 0"}],["path",{"d":"M8.5 16.429a5 5 0 0 1 7 0"}]],"Wrench":[["path",{"d":"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"}]],"X":[["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]],"Zap":[["path",{"d":"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"}]]}/*@END*/;
  const iconCache = new Map();
  const icon = (name, cls = '') => {
    const key = `${name}|${cls}`;
    if (iconCache.has(key)) return iconCache.get(key);
    let node = ICON_DATA[name];
    if (!node && window.lucide && window.lucide.icons) node = window.lucide.icons[name];
    const inner = node ? node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('') : '<circle cx="12" cy="12" r="1"/>';
    const svg = `<svg class="ico${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
    iconCache.set(key, svg);
    return svg;
  };
  const hydrateIcons = (root = document) => {
    $$('i[data-icon]', root).forEach((el) => { el.outerHTML = icon(el.dataset.icon, el.className); });
  };

  /* ===========================================================================
     6. UI BASE
     ======================================================================== */
  const UI = {
    updateSaveState() {
      const el = $('#saveStateText');
      if (!el) return;
      const box = $('#saveState');
      if (!Store.persistent) {
        el.textContent = 'Sem permissão de armazenamento';
        box.classList.add('is-error');
        return;
      }
      box.classList.remove('is-error');
      const d = Store.lastSaved;
      el.textContent = d ? `Salvo às ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : 'Dados salvos neste navegador';
      if (d) { box.classList.remove('is-pulse'); void box.offsetWidth; box.classList.add('is-pulse'); }
    },
  };

  /* ---------- Toasts ---------- */
  const toast = (message, { type = 'success', action = null, duration = 4200 } = {}) => {
    const root = $('#toast-root');
    if (!root) return { close() {} };
    const icons = { success: 'CircleCheck', error: 'CircleAlert', warning: 'TriangleAlert', info: 'Info' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.style.setProperty('--dur', `${duration}ms`);
    el.innerHTML = `<span class="toast-icon">${icon(icons[type] || 'Info')}</span><p></p>${action ? '<button class="toast-action" type="button"></button>' : ''}<button class="toast-close" type="button" aria-label="Fechar aviso">${icon('X')}</button><i class="toast-progress"></i>`;
    el.querySelector('p').textContent = message;
    let timer;
    const close = () => {
      if (el._closing) return;
      el._closing = true;
      clearTimeout(timer);
      Motion.toastOut(el).then(() => el.remove());
    };
    if (action) {
      const b = el.querySelector('.toast-action');
      b.textContent = action.label;
      b.addEventListener('click', () => { action.fn(); close(); });
    }
    el.querySelector('.toast-close').addEventListener('click', close);
    root.appendChild(el);
    const all = $$('.toast', root).filter((t) => !t._closing);
    if (all.length > 3) all.slice(0, all.length - 3).forEach((t) => t.querySelector('.toast-close').click());
    Motion.toastIn(el);
    timer = setTimeout(close, duration);
    return { close };
  };

  /* ---------- Modais (pilha, foco, ESC) ---------- */
  const Modal = {
    stack: [],
    open({ title, subtitle = '', iconName = '', body = '', footer = '', size = 'md', className = '', onClose = null, tone = '' }) {
      const wrap = document.createElement('div');
      const titleId = `mt-${uid()}`;
      wrap.className = `modal ${className}`;
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('aria-labelledby', titleId);
      wrap.innerHTML = `
        <div class="modal-backdrop" data-modal-close></div>
        <div class="modal-panel modal-panel--${size}" data-lenis-prevent>
          <span class="modal-grip" aria-hidden="true"></span>
          <header class="modal-head">
            ${iconName ? `<span class="modal-icon ${tone ? `tone-${tone}` : ''}">${icon(iconName)}</span>` : ''}
            <div class="modal-titles"><h2 id="${titleId}">${esc(title)}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
            <button class="btn-icon modal-x" type="button" data-modal-close aria-label="Fechar">${icon('X')}</button>
          </header>
          <div class="modal-body">${body}</div>
          ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
        </div>`;
      $('#modal-root').appendChild(wrap);
      const entry = { el: wrap, onClose, prevFocus: document.activeElement, closing: false };
      this.stack.push(entry);
      document.body.classList.add('has-modal');
      Motion.lenisStop();
      wrap.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) this.close(entry); });
      Motion.modalIn(wrap);
      if (mq('(pointer: fine)')) {
        setTimeout(() => {
          const f = wrap.querySelector('[autofocus], .modal-body input:not([type=hidden]):not([type=radio]):not(.date-native), .modal-body select, .modal-body textarea, .modal-foot .btn-primary, .modal-foot .btn');
          if (f) f.focus({ preventScroll: true });
        }, 80);
      }
      return entry;
    },
    async close(entry = this.stack[this.stack.length - 1]) {
      if (!entry || entry.closing) return;
      entry.closing = true;
      this.stack = this.stack.filter((e) => e !== entry);
      await Motion.modalOut(entry.el);
      entry.el.remove();
      if (!this.stack.length) {
        document.body.classList.remove('has-modal');
        Motion.lenisStart();
      }
      if (entry.onClose) entry.onClose();
      if (!this.stack.length && entry.prevFocus && document.contains(entry.prevFocus)) entry.prevFocus.focus({ preventScroll: true });
    },
    top() { return this.stack[this.stack.length - 1]; },
  };

  const confirmDialog = ({ title, message, confirmLabel = 'Confirmar', danger = false, iconName = 'CircleHelp', requireText = '' }) => new Promise((resolve) => {
    let result = false;
    const body = `<p class="confirm-text">${message}</p>${requireText ? `<div class="field"><label class="field-label" for="confirmTxt">Digite <b>${esc(requireText)}</b> para confirmar</label><div class="input"><input id="confirmTxt" type="text" autocomplete="off"></div></div>` : ''}`;
    const footer = `<button class="btn btn-ghost" type="button" data-modal-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm ${requireText ? 'disabled' : ''}>${esc(confirmLabel)}</button>`;
    const entry = Modal.open({ title, body, footer, size: 'sm', iconName, tone: danger ? 'danger' : 'info', onClose: () => resolve(result) });
    const btn = $('[data-confirm]', entry.el);
    if (requireText) {
      const input = $('#confirmTxt', entry.el);
      input.addEventListener('input', () => { btn.disabled = input.value.trim().toUpperCase() !== requireText.toUpperCase(); });
    }
    btn.addEventListener('click', () => { result = true; Modal.close(entry); });
  });

  /* ---------- Construtor de formulários ---------- */
  const fieldHTML = (f, v) => {
    const id = `f-${f.name}-${uid()}`;
    const req = f.required ? '<b class="req" aria-hidden="true">*</b>' : '';
    const hint = f.hint ? `<small class="field-hint">${f.hint}</small>` : '';
    const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
    let control;
    let labelTag = 'label';
    switch (f.type) {
      case 'money':
        control = `<div class="input input--money"><span class="input-prefix">R$</span><input id="${id}" name="${f.name}" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(v == null || v === '' ? '' : moneyInput(v))}" data-money></div>`;
        break;
      case 'date':
        control = `<div class="input input--date"><input id="${id}" name="${f.name}" type="text" inputmode="numeric" autocomplete="off" placeholder="DD/MM/AAAA" maxlength="10" value="${esc(v ? fmtDate(v) : '')}" data-date><span class="input-btn" aria-hidden="true">${icon('CalendarDays')}</span><input type="date" class="date-native" tabindex="-1" aria-label="Abrir calendário" value="${esc(v || '')}"></div>`;
        break;
      case 'select':
        control = `<div class="input input--select"><select id="${id}" name="${f.name}">${f.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${icon('ChevronDown')}</div>`;
        break;
      case 'number':
        control = `<div class="input ${f.suffix ? 'input--suffix' : ''}"><input id="${id}" name="${f.name}" type="number" inputmode="${f.step && f.step < 1 ? 'decimal' : 'numeric'}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}" value="${esc(v ?? '')}" ${ph}>${f.suffix ? `<span class="input-suffix">${f.suffix}</span>` : ''}</div>`;
        break;
      case 'textarea':
        control = `<div class="input input--area"><textarea id="${id}" name="${f.name}" rows="2" maxlength="500" ${ph}>${esc(v ?? '')}</textarea></div>`;
        break;
      case 'segmented':
        labelTag = 'span';
        control = `<div class="segmented segmented--field" role="radiogroup" aria-label="${esc(f.label)}">${f.options.map((o) => `<label class="seg"><input type="radio" name="${f.name}" value="${esc(o.value)}" ${String(o.value) === String(v) ? 'checked' : ''}><span>${o.icon ? icon(o.icon) : ''}${esc(o.label)}</span></label>`).join('')}</div>`;
        break;
      case 'swatches':
        labelTag = 'span';
        control = `<div class="swatches" role="radiogroup" aria-label="${esc(f.label)}">${CARD_COLORS.map((c) => `<label class="swatch" style="--c1:${c.c1};--c2:${c.c2}" title="${c.label}"><input type="radio" name="${f.name}" value="${c.id}" ${c.id === v ? 'checked' : ''} aria-label="${c.label}"><span></span></label>`).join('')}</div>`;
        break;
      default:
        control = `<div class="input"><input id="${id}" name="${f.name}" type="text" maxlength="${f.max || 80}" autocomplete="off" value="${esc(v ?? '')}" ${ph}${f.list ? ` list="${f.list}"` : ''}></div>`;
    }
    const forAttr = labelTag === 'label' ? ` for="${id}"` : '';
    return `<div class="field field--${f.width || 'full'}" data-field="${f.name}"><${labelTag} class="field-label"${forAttr}>${esc(f.label)}${req}</${labelTag}>${control}${hint}<small class="field-error" role="alert"></small></div>`;
  };

  const readForm = (form, fields) => {
    const values = {};
    const errors = {};
    fields.forEach((f) => {
      const wrap = form.querySelector(`[data-field="${f.name}"]`);
      if (!wrap || wrap.hidden) { values[f.name] = ['money', 'number'].includes(f.type) ? null : ''; return; }
      let v;
      if (f.type === 'segmented' || f.type === 'swatches') v = (form.querySelector(`input[name="${f.name}"]:checked`) || {}).value || '';
      else v = form.elements[f.name] ? form.elements[f.name].value : '';
      if (f.type === 'money') {
        v = String(v).trim() === '' ? null : parseMoney(v);
        if (v != null && !isFinite(v)) errors[f.name] = 'Valor inválido';
        else if (v != null && v < 0) errors[f.name] = 'Use valores positivos';
      } else if (f.type === 'date') {
        const raw = String(v).trim();
        v = raw ? parseBRDate(raw) : '';
        if (raw && !v) errors[f.name] = 'Data inválida — use DD/MM/AAAA';
      } else if (f.type === 'number') {
        v = String(v).trim() === '' ? null : Number(String(v).replace(',', '.'));
        if (v != null && !isFinite(v)) errors[f.name] = 'Número inválido';
        else if (v != null) {
          if (f.integer && !Number.isInteger(v)) errors[f.name] = 'Use um número inteiro';
          else if (f.min != null && v < f.min) errors[f.name] = `O mínimo é ${f.min}`;
          else if (f.max != null && v > f.max) errors[f.name] = `O máximo é ${f.max}`;
        }
      } else v = String(v).trim();
      if (f.required && !errors[f.name]) {
        if (f.type === 'money' && !(v > 0)) errors[f.name] = 'Informe um valor maior que zero';
        else if (v === '' || v == null) errors[f.name] = 'Campo obrigatório';
      }
      values[f.name] = v;
    });
    return { values, errors };
  };

  const showErrors = (form, errors) => {
    $$('.field', form).forEach((w) => { w.classList.remove('has-error'); const e = $('.field-error', w); if (e) e.textContent = ''; });
    const keys = Object.keys(errors);
    keys.forEach((k) => {
      const w = form.querySelector(`[data-field="${k}"]`);
      if (!w) return;
      w.classList.add('has-error');
      $('.field-error', w).textContent = errors[k];
    });
    if (keys.length) {
      const first = form.querySelector(`[data-field="${keys[0]}"]`);
      const input = first && first.querySelector('input:not(.date-native), select, textarea');
      if (input) input.focus();
      Motion.shake(first);
    }
    return keys.length === 0;
  };

  /**
   * Abre um formulário em modal.
   * fields: descritores; values: valores iniciais; onSubmit(values) -> true | {field: erro}
   */
  const openForm = ({ title, subtitle = '', iconName = 'SquarePen', fields, values = {}, submitLabel = 'Salvar', onSubmit, extraTop = '', extraBottom = '', onChange = null, deleteAction = null }) => {
    const body = `<form class="form" novalidate>${extraTop}<div class="form-grid">${fields.map((f) => fieldHTML(f, values[f.name])).join('')}</div>${extraBottom}<button type="submit" hidden></button></form>`;
    const footer = `${deleteAction ? `<button class="btn btn-ghost btn-ghost--danger" type="button" data-form-delete>${icon('Trash2')}<span>Excluir</span></button><span class="grow"></span>` : ''}<button class="btn btn-ghost" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="button" data-form-submit>${icon('Check')}<span>${esc(submitLabel)}</span></button>`;
    const entry = Modal.open({ title, subtitle, iconName, body, footer, size: 'lg' });
    const form = $('form', entry.el);
    const sync = () => {
      const { values: cur } = readForm(form, fields.map((f) => ({ ...f, required: false })));
      fields.forEach((f) => {
        if (!f.showIf) return;
        const w = form.querySelector(`[data-field="${f.name}"]`);
        if (w) w.hidden = !f.showIf(cur);
      });
      if (onChange) onChange(cur, form);
    };
    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    sync();
    const submit = () => {
      const { values: v, errors } = readForm(form, fields);
      if (!showErrors(form, errors)) return;
      const res = onSubmit(v, form);
      if (res === true) Modal.close(entry);
      else if (res && typeof res === 'object') showErrors(form, res);
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    $('[data-form-submit]', entry.el).addEventListener('click', submit);
    if (deleteAction) $('[data-form-delete]', entry.el).addEventListener('click', async () => { if (await deleteAction()) Modal.close(entry); });
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); submit(); }
    });
    return { entry, form };
  };

  /* ---------- Máscaras de entrada (delegadas) ---------- */
  const bindInputMasks = () => {
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches('[data-date]')) {
        const digits = t.value.replace(/\D/g, '').slice(0, 8);
        let out = digits;
        if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        if (out !== t.value) t.value = out;
        const native = t.parentElement.querySelector('.date-native');
        if (native) native.value = parseBRDate(out) || '';
      } else if (t.matches('[data-money]')) {
        const clean = t.value.replace(/[^\d.,]/g, '');
        if (clean !== t.value) t.value = clean;
      }
    });
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('.date-native')) {
        const text = t.parentElement.querySelector('[data-date]');
        if (text) {
          text.value = t.value ? fmtDate(t.value) : '';
          text.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t.matches && t.matches('.date-native') && typeof t.showPicker === 'function') {
        try { t.showPicker(); } catch { /* alguns navegadores abrem sozinhos */ }
      }
    });
    document.addEventListener('focusout', (e) => {
      const t = e.target;
      if (t.matches && t.matches('[data-money]') && t.value.trim()) {
        const v = parseMoney(t.value);
        if (isFinite(v)) t.value = moneyInput(Math.abs(v));
      }
    });
  };

  /* ===========================================================================
     7. MOTION — GSAP (sequências), ScrollTrigger (rolagem), SplitText
        (tipografia), Lenis (rolagem suave). Tudo opcional e com fallback.
     ======================================================================== */
  const Motion = {
    gsap: null,
    enabled: false,
    lenis: null,
    ctx: null,
    titleSplit: null,
    fine: false,
    init() {
      this.gsap = window.gsap || null;
      if (this.gsap) {
        if (window.ScrollTrigger) this.gsap.registerPlugin(window.ScrollTrigger);
        if (window.SplitText) this.gsap.registerPlugin(window.SplitText);
        this.gsap.defaults({ ease: 'expo.out' });
      }
      const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
      const pf = window.matchMedia('(pointer: fine)');
      const onChange = () => this.apply();
      if (rm.addEventListener) { rm.addEventListener('change', onChange); pf.addEventListener('change', onChange); }
      this.apply();
      this.bindPointerFX();
    },
    get reducedPref() {
      const pref = S().settings.motion;
      if (pref === 'reduced') return true;
      if (pref === 'full') return false;
      return mq('(prefers-reduced-motion: reduce)');
    },
    apply() {
      this.enabled = !!this.gsap && !this.reducedPref;
      this.fine = mq('(pointer: fine)') && mq('(hover: hover)');
      document.documentElement.classList.toggle('motion-off', !this.enabled);
      document.documentElement.classList.toggle('pointer-fine', this.fine);
      this.setupLenis();
      if (window.Chart) Object.assign(window.Chart.defaults.animation, { duration: this.enabled ? 900 : 0, easing: 'easeOutQuart' });
    },
    setupLenis() {
      const want = this.enabled && !!window.Lenis && this.fine;
      if (want && !this.lenis) {
        this.lenis = new window.Lenis({
          lerp: 0.11,
          smoothWheel: true,
          allowNestedScroll: true,
          prevent: (node) => !!(node && node.closest && node.closest('[data-lenis-prevent], .modal, .menu-pop, .month-pop, .search-results')),
        });
        if (window.ScrollTrigger) this.lenis.on('scroll', window.ScrollTrigger.update);
        this._raf = (time) => { if (this.lenis) this.lenis.raf(time * 1000); };
        this.gsap.ticker.add(this._raf);
        this.gsap.ticker.lagSmoothing(0);
        if (document.body.classList.contains('has-modal')) this.lenis.stop();
      } else if (!want && this.lenis) {
        this.gsap.ticker.remove(this._raf);
        this.lenis.destroy();
        this.lenis = null;
      }
    },
    lenisStop() { if (this.lenis) this.lenis.stop(); },
    lenisStart() { if (this.lenis) this.lenis.start(); },
    scrollTop() {
      if (this.lenis) this.lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    },

    /* ---- Abertura cinematográfica ---- */
    intro(onReveal) {
      const pre = $('#preloader');
      const finish = () => { if (pre) pre.remove(); document.body.classList.remove('is-loading'); };
      if (!this.enabled || !pre) { finish(); onReveal(); return; }
      const g = this.gsap;
      let seen = false;
      try { seen = sessionStorage.getItem('f3d:intro') === '1'; sessionStorage.setItem('f3d:intro', '1'); } catch { /* ignora */ }
      const tl = g.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('.preloader-logo path', { y: -26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.09, duration: 0.7, ease: 'back.out(1.8)' })
        .fromTo('.preloader-word > *', { yPercent: 110 }, { yPercent: 0, stagger: 0.07, duration: 0.6 }, '-=0.35')
        .fromTo('.preloader-bar i', { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, '-=0.3')
        .to('.preloader-inner', { scale: 0.94, autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
        .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.75, ease: 'expo.inOut' }, '-=0.15')
        .add(() => { finish(); onReveal(); }, '-=0.45')
        .fromTo('.sidebar', { x: -48, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, clearProps: 'transform,opacity,visibility' }, '<')
        .fromTo('.topbar', { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, clearProps: 'transform,opacity,visibility' }, '<0.08')
        .fromTo('.bottom-nav', { yPercent: 120 }, { yPercent: 0, duration: 0.8, clearProps: 'transform' }, '<');
      if (seen) tl.timeScale(1.8);
    },

    /* ---- Tipografia cinética do título ---- */
    title(el, text) {
      if (this.titleSplit) { this.titleSplit.revert(); this.titleSplit = null; }
      el.textContent = text;
      if (!this.enabled || !window.SplitText) return;
      const split = window.SplitText.create(el, { type: 'chars,words', mask: 'words' });
      this.titleSplit = split;
      this.gsap.fromTo(split.chars, { yPercent: 115, rotate: 6 }, {
        yPercent: 0, rotate: 0, duration: 0.8, stagger: 0.018, ease: 'expo.out',
        onComplete: () => { if (this.titleSplit === split) { split.revert(); this.titleSplit = null; } },
      });
    },

    /* ---- Transições de página ---- */
    leaveView(view) {
      if (!this.enabled || !view.firstElementChild) return Promise.resolve();
      return new Promise((resolve) => {
        this.gsap.to(view.children, { autoAlpha: 0, y: -14, scale: 0.985, duration: 0.22, ease: 'power2.in', onComplete: resolve });
      });
    },
    revertView() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
    },
    enterView(view, mode = 'enter') {
      if (!this.enabled) { this.staticFinish(view); return; }
      const g = this.gsap;
      const run = () => {
        if (mode === 'list') {
          const rows = $$('[data-row]', view).slice(0, 16);
          if (rows.length) g.fromTo(rows, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.025, clearProps: 'transform,opacity,visibility' });
          const em = $$('.empty', view);
          if (em.length) g.fromTo(em, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.5, clearProps: 'transform,opacity,visibility' });
        }
        if (mode === 'enter') {
          g.fromTo(view.children, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none', clearProps: 'opacity,visibility,transform' });
          const items = $$('[data-anim]', view);
          const vh = window.innerHeight;
          const above = items.filter((el) => el.getBoundingClientRect().top < vh * 1.05);
          const below = items.filter((el) => !above.includes(el));
          if (above.length) {
            g.fromTo(above,
              { autoAlpha: 0, y: 34, rotationX: -12, transformPerspective: 1100, transformOrigin: '50% 0%' },
              { autoAlpha: 1, y: 0, rotationX: 0, duration: 1, stagger: 0.06, delay: 0.05, clearProps: 'transform,opacity,visibility' });
          }
          if (below.length && window.ScrollTrigger) {
            g.set(below, { autoAlpha: 0, y: 40, rotationX: -10, transformPerspective: 1100, transformOrigin: '50% 0%' });
            window.ScrollTrigger.batch(below, {
              start: 'top 92%',
              once: true,
              onEnter: (batch) => g.to(batch, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.95, stagger: 0.08, clearProps: 'transform,opacity,visibility' }),
            });
          }
          const rows = $$('[data-row]', view).slice(0, 14);
          if (rows.length) g.fromTo(rows, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.035, delay: 0.2, clearProps: 'transform,opacity,visibility' });
          $$('[data-clip]', view).forEach((el) => {
            g.fromTo(el, { clipPath: 'inset(0% 100% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.2, ease: 'expo.inOut', delay: 0.15, clearProps: 'clipPath' });
          });
          $$('[data-parallax]', view).forEach((el) => {
            if (!window.ScrollTrigger) return;
            g.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
          });
        }
        $$('[data-bar]', view).forEach((el) => {
          g.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'power3.out', delay: mode === 'enter' ? 0.3 : 0 });
        });
        $$('[data-vbar]', view).forEach((el, i) => {
          g.fromTo(el, { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'power3.out', delay: (mode === 'enter' ? 0.3 : 0) + i * 0.04 });
        });
        $$('[data-gauge]', view).forEach((el) => {
          const len = Number(el.dataset.len);
          const off = Number(el.dataset.gauge);
          g.fromTo(el, { strokeDashoffset: len }, { strokeDashoffset: off, duration: 1.6, ease: 'power3.out', delay: 0.25 });
        });
        $$('[data-count]', view).forEach((el) => this.count(el));
      };
      const isRoot = view.id === 'view';
      if (isRoot || !this.ctx) {
        if (isRoot) this.revertView();
        this.ctx = g.context(run, view);
      } else this.ctx.add(run);
      if (window.ScrollTrigger && isRoot) requestAnimationFrame(() => window.ScrollTrigger.refresh());
    },
    staticFinish() { /* sem animação: o HTML já contém os valores finais */ },

    /* ---- Contadores numéricos ---- */
    prevValues: new Map(),
    count(el) {
      const to = Number(el.dataset.count);
      const key = el.dataset.key;
      const from = key && this.prevValues.has(key) ? this.prevValues.get(key) : 0;
      if (key) this.prevValues.set(key, to);
      if (HIDE || !isFinite(to) || from === to) return;
      const fmt = el.dataset.fmt === 'pct' ? (v) => pct(v) : el.dataset.fmt === 'int' ? (v) => String(Math.round(v)) : (v) => money(v);
      const obj = { v: from };
      this.gsap.to(obj, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(obj.v); }, onComplete: () => { el.textContent = fmt(to); } });
    },

    /* ---- Modais e toasts ---- */
    modalIn(wrap) {
      if (!this.enabled) return;
      const panel = $('.modal-panel', wrap);
      const sheet = mq('(max-width: 720px)');
      this.gsap.fromTo($('.modal-backdrop', wrap), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
      if (sheet) this.gsap.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' });
      else this.gsap.fromTo(panel, { autoAlpha: 0, y: 30, scale: 0.96, rotationX: 10, transformPerspective: 1200 }, { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 0.6, ease: 'expo.out' });
      const fields = $$('.field, .form-preview, .confirm-text, .menu-item', wrap).slice(0, 16);
      if (fields.length) this.gsap.fromTo(fields, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.025, delay: 0.12, clearProps: 'transform,opacity,visibility' });
    },
    modalOut(wrap) {
      if (!this.enabled) return Promise.resolve();
      const panel = $('.modal-panel', wrap);
      const sheet = mq('(max-width: 720px)');
      return new Promise((resolve) => {
        this.gsap.to($('.modal-backdrop', wrap), { autoAlpha: 0, duration: 0.25 });
        this.gsap.to(panel, sheet ? { yPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: resolve } : { autoAlpha: 0, y: 16, scale: 0.97, duration: 0.22, ease: 'power2.in', onComplete: resolve });
      });
    },
    toastIn(el) {
      if (!this.enabled) return;
      this.gsap.fromTo(el, { autoAlpha: 0, y: 24, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)' });
    },
    toastOut(el) {
      if (!this.enabled) return Promise.resolve();
      return new Promise((resolve) => this.gsap.to(el, { autoAlpha: 0, x: 40, duration: 0.25, ease: 'power2.in', onComplete: resolve }));
    },
    shake(el) {
      if (!this.enabled || !el) return;
      this.gsap.fromTo(el, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.42, ease: 'power1.inOut' });
    },
    pop(el) {
      if (!this.enabled || !el) return;
      this.gsap.fromTo(el, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(2.5)' });
    },
    menuIn(el) {
      if (!this.enabled) return;
      this.gsap.fromTo(el, { autoAlpha: 0, y: -8, scale: 0.97, transformOrigin: '100% 0%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4 });
      this.gsap.fromTo($$('.menu-item, .mp-month', el), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.02, clearProps: 'transform,opacity,visibility' });
    },

    /* ---- Indicadores de navegação ---- */
    moveIndicator(ind, target, axis = 'y') {
      if (!ind || !target) { if (ind) ind.style.opacity = '0'; return; }
      const parent = ind.parentElement.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const props = axis === 'y'
        ? { y: r.top - parent.top, height: r.height, opacity: 1 }
        : { x: r.left - parent.left + r.width / 2 - 22, opacity: 1 };
      if (this.enabled) this.gsap.to(ind, { ...props, duration: 0.6, ease: 'expo.out' });
      else {
        ind.style.opacity = '1';
        if (axis === 'y') { ind.style.transform = `translateY(${props.y}px)`; ind.style.height = `${props.height}px`; }
        else ind.style.transform = `translateX(${props.x}px)`;
      }
    },

    /* ---- Microinterações: profundidade (tilt), botões magnéticos, luz ---- */
    bindPointerFX() {
      const spot = $('#spotlight');
      let spotX, spotY, current = null;
      const tilts = new WeakMap();
      const mags = new WeakMap();
      document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (spot && this.enabled && this.fine) {
          if (!spotX) {
            spotX = this.gsap.quickTo(spot, 'x', { duration: 0.9, ease: 'power3.out' });
            spotY = this.gsap.quickTo(spot, 'y', { duration: 0.9, ease: 'power3.out' });
          }
          spotX(e.clientX); spotY(e.clientY);
          spot.classList.add('is-on');
        }
        const lit = e.target.closest && e.target.closest('.card, .ccard, .kpi, .loan');
        if (lit) {
          const r = lit.getBoundingClientRect();
          lit.style.setProperty('--mx', `${e.clientX - r.left}px`);
          lit.style.setProperty('--my', `${e.clientY - r.top}px`);
        }
        if (!this.enabled || !this.fine) return;
        const t = e.target.closest && e.target.closest('[data-tilt]');
        if (current && current !== t) this.resetTilt(current, tilts);
        current = t;
        if (t) {
          let q = tilts.get(t);
          if (!q) {
            q = { rx: this.gsap.quickTo(t, 'rotationX', { duration: 0.6, ease: 'power3.out' }), ry: this.gsap.quickTo(t, 'rotationY', { duration: 0.6, ease: 'power3.out' }) };
            this.gsap.set(t, { transformPerspective: 900 });
            tilts.set(t, q);
          }
          const r = t.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          const max = Number(t.dataset.tilt) || 5;
          q.rx(-py * max);
          q.ry(px * max);
        }
        const m = e.target.closest && e.target.closest('.btn-magnetic');
        if (m) {
          let q = mags.get(m);
          if (!q) {
            q = { x: this.gsap.quickTo(m, 'x', { duration: 0.5, ease: 'power3.out' }), y: this.gsap.quickTo(m, 'y', { duration: 0.5, ease: 'power3.out' }) };
            mags.set(m, q);
            m.addEventListener('pointerleave', () => this.gsap.to(m, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' }));
          }
          const r = m.getBoundingClientRect();
          q.x((e.clientX - r.left - r.width / 2) * 0.28);
          q.y((e.clientY - r.top - r.height / 2) * 0.38);
        }
      }, { passive: true });
      document.addEventListener('pointerleave', () => { if (spot) spot.classList.remove('is-on'); });
      document.addEventListener('pointerout', (e) => {
        if (!current) return;
        if (!e.relatedTarget || !current.contains(e.relatedTarget)) {
          const leaving = e.target.closest && e.target.closest('[data-tilt]');
          if (leaving === current) { this.resetTilt(current, tilts); current = null; }
        }
      });
    },
    resetTilt(el, tilts) {
      const q = tilts.get(el);
      if (q) { q.rx(0); q.ry(0); }
    },
  };

  /* ===========================================================================
     8. GRÁFICOS (Chart.js)
     ======================================================================== */
  const hexA = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const SURFACE = '#121722';

  const refLinePlugin = {
    id: 'refLine',
    afterDatasetsDraw(chart, _args, opts) {
      if (!opts || opts.value == null || !chart.scales.y) return;
      const y = chart.scales.y.getPixelForValue(opts.value);
      const { left, right, top, bottom } = chart.chartArea;
      if (y < top || y > bottom) return;
      const c = chart.ctx;
      c.save();
      c.strokeStyle = opts.color || 'rgba(255,255,255,0.35)';
      c.lineWidth = 1;
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#c3cbd8';
      c.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
      c.textAlign = 'right';
      c.fillText(opts.label || '', right, y - 6);
      c.restore();
    },
  };

  const Charts = {
    reg: new Map(),
    ok: () => typeof window.Chart !== 'undefined',
    setup() {
      if (!this.ok()) return;
      const C = window.Chart;
      C.defaults.font.family = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
      C.defaults.font.size = 12;
      C.defaults.color = '#8d97aa';
      C.defaults.borderColor = 'rgba(255,255,255,0.06)';
      C.defaults.maintainAspectRatio = false;
      C.defaults.responsive = true;
      C.defaults.plugins.legend.display = false;
      Object.assign(C.defaults.plugins.tooltip, {
        backgroundColor: 'rgba(9, 12, 19, 0.95)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
        titleColor: '#8d97aa', bodyColor: '#eef2f8', padding: 12, cornerRadius: 12, boxPadding: 6,
        titleFont: { weight: '600', size: 11 }, bodyFont: { weight: '700', size: 13 }, usePointStyle: true, caretSize: 6,
      });
      Object.assign(C.defaults.animation, { duration: Motion.enabled ? 900 : 0, easing: 'easeOutQuart' });
    },
    make(id, config) {
      const canvas = document.getElementById(id);
      if (!canvas) return null;
      const old = this.reg.get(id);
      if (old) { old.destroy(); this.reg.delete(id); }
      if (!this.ok()) {
        const box = canvas.closest('.chart-box');
        if (box) box.innerHTML = `<div class="chart-fallback">${icon('ChartColumn')}<p>Os gráficos precisam de conexão para carregar o Chart.js. Os valores continuam disponíveis em “Ver tabela”.</p></div>`;
        return null;
      }
      const ch = new window.Chart(canvas, config);
      this.reg.set(id, ch);
      return ch;
    },
    destroyAll() { this.reg.forEach((c) => c.destroy()); this.reg.clear(); },
    x: () => ({ grid: { display: false }, border: { color: '#2a3140' }, ticks: { color: '#8d97aa', font: { weight: '600' }, maxRotation: 0, autoSkipPadding: 8 } }),
    y: (fmt = moneyCompact, opts = {}) => ({
      beginAtZero: true,
      grid: { color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)'), drawTicks: false },
      border: { display: false },
      ticks: { padding: 10, maxTicksLimit: 6, callback: (v) => fmt(v), font: { variant: 'tabular-nums' } },
      ...opts,
    }),
    tip: (ctx) => ` ${money(ctx.parsed.y ?? ctx.parsed.x ?? ctx.parsed)}  ${ctx.dataset.label}`,
    wash(color) {
      return (ctx) => {
        const { chart } = ctx;
        const area = chart.chartArea;
        if (!area) return hexA(color, 0.1);
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, hexA(color, 0.22));
        g.addColorStop(1, hexA(color, 0));
        return g;
      };
    },
    bars(rows) {
      const bar = (label, data, color) => ({
        label, data, backgroundColor: color, hoverBackgroundColor: hexA(color, 0.82),
        borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'start', maxBarThickness: 24, categoryPercentage: 0.62, barPercentage: 0.86,
      });
      return {
        type: 'bar',
        data: {
          labels: rows.map((r) => ymShort(r.ym)),
          datasets: [bar('Entradas', rows.map((r) => r.income), SERIES.income), bar('Saídas', rows.map((r) => r.total), SERIES.expense)],
        },
        options: {
          interaction: { mode: 'index', intersect: false },
          scales: { x: this.x(), y: this.y() },
          plugins: { tooltip: { callbacks: { label: this.tip } } },
        },
      };
    },
    line(rows, { label, color, key, dashFrom = null, beginAtZero = false }) {
      return {
        type: 'line',
        data: {
          labels: rows.map((r) => ymShort(r.ym)),
          datasets: [{
            label, data: rows.map((r) => r[key]), borderColor: color, borderWidth: 2, tension: 0.35,
            pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: color, pointBorderColor: SURFACE, pointBorderWidth: 2, pointHitRadius: 14,
            fill: 'origin', backgroundColor: this.wash(color), borderCapStyle: 'round', borderJoinStyle: 'round',
            segment: { borderDash: (ctx) => (dashFrom != null && ctx.p1DataIndex > dashFrom ? [5, 5] : undefined) },
          }],
        },
        options: {
          interaction: { mode: 'index', intersect: false },
          scales: { x: this.x(), y: this.y(moneyCompact, { beginAtZero }) },
          plugins: { tooltip: { callbacks: { label: this.tip, afterLabel: (ctx) => (dashFrom != null && ctx.dataIndex > dashFrom ? ' (projeção)' : '') } } },
        },
      };
    },
    donut(items) {
      const total = sum(items, (i) => i.value);
      return {
        type: 'doughnut',
        data: { labels: items.map((i) => i.label), datasets: [{ data: items.map((i) => i.value), backgroundColor: items.map((i) => i.color), borderWidth: 0, spacing: 2, borderRadius: 4, hoverOffset: 6 }] },
        options: { cutout: '76%', layout: { padding: 6 }, plugins: { tooltip: { callbacks: { label: (ctx) => ` ${money(ctx.parsed)} · ${pct(total ? ctx.parsed / total : 0)}  ${ctx.label}` } } } },
      };
    },
    hbars(cats) {
      return {
        type: 'bar',
        data: { labels: cats.map((c) => c.cat.label), datasets: [{ label: 'Despesas', data: cats.map((c) => c.value), backgroundColor: SERIES.expense, hoverBackgroundColor: hexA(SERIES.expense, 0.82), borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'start', maxBarThickness: 18 }] },
        options: {
          indexAxis: 'y',
          scales: { x: this.y(), y: { grid: { display: false }, border: { color: '#2a3140' }, ticks: { color: '#c3cbd8', font: { weight: '600' } } } },
          plugins: { tooltip: { callbacks: { label: (ctx) => ` ${money(ctx.parsed.x)}  Despesas` } } },
        },
      };
    },
    commitBars(rows) {
      return {
        type: 'bar',
        data: { labels: rows.map((r) => ymShort(r.ym)), datasets: [{ label: 'Renda comprometida', data: rows.map((r) => (r.committed == null ? null : Math.round(r.committed * 1000) / 10)), backgroundColor: SERIES.balance, hoverBackgroundColor: hexA(SERIES.balance, 0.82), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'start', maxBarThickness: 24 }] },
        options: {
          scales: { x: this.x(), y: this.y((v) => `${v}%`, { suggestedMax: 110 }) },
          plugins: {
            tooltip: { callbacks: { label: (ctx) => ` ${String(ctx.parsed.y).replace('.', ',')}% da renda` } },
            refLine: { value: 100, label: '100% da renda', color: 'rgba(255,90,103,0.7)' },
          },
        },
        plugins: [refLinePlugin],
      };
    },
  };

  /* ===========================================================================
     9. VIEWS — componentes compartilhados
     ======================================================================== */
  const STATUS = {
    paid: ['Pago', 'paid', 'CircleCheck'],
    pending: ['Pendente', 'pending', 'Clock'],
    late: ['Atrasado', 'late', 'CircleAlert'],
    received: ['Recebido', 'paid', 'CircleCheck'],
    expected: ['Previsto', 'info', 'Hourglass'],
    open: ['Aberta', 'info', 'Clock'],
    future: ['Futura', 'muted', 'CalendarClock'],
    closed: ['Fechada', 'pending', 'Lock'],
    done: ['Quitado', 'paid', 'Trophy'],
    active: ['Em dia', 'info', 'Activity'],
    settled: ['Anterior', 'muted', 'History'],
  };
  const badge = (status, label) => {
    const [l, tone, ic] = STATUS[status] || STATUS.pending;
    return `<span class="badge badge--${tone}">${icon(ic)}${esc(label || l)}</span>`;
  };
  const deltaHTML = (cur, prev, upIsGood = true) => {
    if (!(prev > 0)) return '';
    const d = (cur - prev) / prev;
    if (Math.abs(d) < 0.005) return `<span class="delta delta--flat">${icon('Minus')}estável vs mês anterior</span>`;
    const good = upIsGood ? d > 0 : d < 0;
    return `<span class="delta ${good ? 'delta--good' : 'delta--bad'}">${icon(d > 0 ? 'ArrowUpRight' : 'ArrowDownRight')}${pct(Math.abs(d))} vs mês anterior</span>`;
  };
  const p3d = (ratio, tone = 'green', extra = '') => {
    const r = clamp(Number(ratio) || 0, 0, 1);
    return `<div class="p3d p3d--${tone} ${extra}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(r * 100)}"><div class="p3d-track"></div><div class="p3d-fill" data-bar style="width:${(r * 100).toFixed(2)}%"><i class="p3d-gloss"></i></div></div>`;
  };
  const kpi = ({ label, value, key, iconName, tone = 'neutral', sub = '', fmt = 'money', extra = '', cls = '' }) => `
    <article class="card kpi kpi--${tone} ${cls}" data-anim data-tilt="6">
      <div class="kpi-top"><span class="kpi-icon">${icon(iconName)}</span><span class="kpi-label">${label}</span></div>
      ${fmt === 'text'
        ? `<div class="kpi-value kpi-value--text">${esc(value)}</div>`
        : `<div class="kpi-value" data-count="${value}" data-key="${key}" data-fmt="${fmt}">${fmt === 'money' ? money(value) : pct(value)}</div>`}
      <div class="kpi-sub">${sub}</div>${extra}
    </article>`;
  const empty = ({ iconName, title, text, action = '' }) => `
    <div class="empty" data-anim>
      <div class="empty-orb"><span>${icon(iconName)}</span></div>
      <h3>${title}</h3><p>${text}</p>${action}
    </div>`;
  const catChip = (cat) => `<span class="chip-icon" style="--c:${cat.color}">${icon(cat.icon)}</span>`;
  const obIcon = (o) => {
    if (o.kind === 'loan') return catChip(BILL_CAT.emprestimos);
    if (o.kind === 'invoice') return catChip(BILL_CAT.cartao);
    return catChip(billCat(o.category));
  };
  const payBtn = (o, label = 'Pagar') => `<button class="btn btn-sm btn-soft" type="button" data-action="pay-ob" data-kind="${o.kind}" data-id="${esc(o.id)}" ${o.n ? `data-n="${o.n}"` : ''} ${o.ym ? `data-ym="${o.ym}"` : ''}>${icon('Check')}<span>${label}</span></button>`;
  const obRow = (o, { action = true } = {}) => `
    <li class="ob-row ob-row--${o.status}" data-row>
      ${obIcon(o)}
      <div class="ob-main"><b>${esc(o.name)}</b><small>${esc(o.sub || '')} · ${fmtDate(o.dueDate)} <em>${o.status === 'paid' ? 'pago' : relDays(o.dueDate)}</em></small></div>
      <b class="ob-amount">${money(o.amount)}</b>
      ${action && o.status !== 'paid' ? payBtn(o) : badge(o.status)}
    </li>`;
  const segmented = (name, options, value, extra = '') => `<div class="segmented segmented--sm ${extra}" role="group">${options.map((o) => `<button type="button" class="${String(o.value) === String(value) ? 'is-active' : ''}" aria-pressed="${String(o.value) === String(value)}" data-action="filter-seg" data-filter="${name}" data-value="${esc(o.value)}">${o.icon ? icon(o.icon) : ''}<span>${esc(o.label)}</span></button>`).join('')}</div>`;
  const searchBox = (name, value, placeholder) => `<label class="input input--search">${icon('Search')}<input type="search" value="${esc(value)}" placeholder="${esc(placeholder)}" data-filter-input="${name}" aria-label="${esc(placeholder)}"></label>`;
  const selectBox = (name, options, value, label) => `<label class="input input--select input--compact"><select data-filter-input="${name}" aria-label="${esc(label)}">${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${icon('ChevronDown')}</label>`;
  const tableView = (headers, rows, caption = 'Ver tabela') => `
    <details class="table-view"><summary>${icon('Table')}<span>${caption}</span></summary>
      <div class="table-scroll" data-lenis-prevent><table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </details>`;
  const legend = (items, shape = 'rect') => `<ul class="legend">${items.map((i) => `<li><i class="lg-${shape}" style="--c:${i.color}"></i><span>${esc(i.label)}</span></li>`).join('')}</ul>`;

  /* ===========================================================================
     VIEW: DASHBOARD
     ======================================================================== */
  const viewDashboard = () => {
    const t = today();
    const ym = App.ym;
    const cur = ymOf(t);
    const ins = Fin.insights(ym, t);
    const m = ins.m;
    const prev = Fin.month(ymAdd(ym, -1), t);
    const bal = Fin.balanceNow();
    const balDelta = round2(bal - Fin.balanceAt(endOfYM(ymAdd(cur, -1))));
    const isPast = ym < cur;
    const after = ins.after;
    const afterVal = isPast ? m.result : after.value;
    const debts = ins.debts;
    const lateSum = sum(ins.late, (o) => o.amount);
    const upSum = sum(ins.upcoming, (o) => o.amount);
    const s = S().settings;
    const score = ins.score;
    const gaugeLen = 157.08;
    const gaugeOff = score == null ? gaugeLen : gaugeLen * (1 - score / 100);
    const scoreTone = score == null ? 'muted' : score >= 80 ? 'green' : score >= 60 ? 'blue' : score >= 40 ? 'yellow' : 'red';
    const cats = ins.cats.slice(0, 6);
    const catMax = cats.length ? cats[0].value : 1;
    const kinds = ['casa', 'cartoes', 'emprestimos'].map((k) => ({ key: k, label: KIND_LABEL[k], value: m.groups[k], color: SERIES.kinds[k] }));
    const list = [...ins.late, ...ins.upcoming.filter((o) => o.status !== 'late')].slice(0, 6);
    const welcome = !Store.hasData && !s.onboarded;

    return `
    <div class="page page--dash">
      ${welcome ? `
      <section class="card welcome" data-anim>
        <div class="welcome-art" aria-hidden="true">
          <div class="cube"><i class="cube-top"></i><i class="cube-left"></i><i class="cube-right"></i></div>
        </div>
        <div class="welcome-copy">
          <span class="eyebrow">Bem-vindo(a) ao Finance 3D</span>
          <h2>Sua vida financeira, organizada em camadas.</h2>
          <p>Os dados ficam salvos somente neste navegador, sem servidor. Comece informando seu saldo atual e cadastrando suas contas — ou explore o sistema com dados de exemplo que podem ser removidos a qualquer momento.</p>
          <div class="welcome-actions">
            <button class="btn btn-primary btn-magnetic" type="button" data-action="onboard-start">${icon('Rocket')}<span>Informar saldo e começar</span></button>
            <button class="btn btn-ghost" type="button" data-action="load-demo">${icon('Sparkles')}<span>Explorar com exemplo</span></button>
            <button class="btn btn-ghost" type="button" data-action="restore">${icon('Upload')}<span>Restaurar backup</span></button>
          </div>
          <ol class="welcome-steps">
            <li><b>1</b>Saldo atual</li><li><b>2</b>Contas da casa</li><li><b>3</b>Entradas</li><li><b>4</b>Empréstimos e cartões</li>
          </ol>
        </div>
      </section>` : ''}
      ${Store.hasDemo ? `<div class="demo-banner" data-anim>${icon('FlaskConical')}<p><b>Dados de exemplo ativos.</b> Eles servem apenas para demonstração e não representam suas finanças.</p><button class="btn btn-sm btn-ghost" type="button" data-action="remove-demo">${icon('Trash2')}<span>Remover exemplos</span></button></div>` : ''}

      <div class="grid grid--hero">
        <article class="card hero" data-anim data-tilt="3">
          <div class="hero-glow" data-parallax aria-hidden="true"></div>
          <div class="hero-head">
            <span class="hero-label">${icon('Wallet')}Saldo disponível hoje</span>
            <button class="btn btn-sm btn-ghost" type="button" data-action="adjust-balance">${icon('SlidersHorizontal')}<span>Ajustar saldo</span></button>
          </div>
          <div class="hero-value ${bal < 0 ? 'is-neg' : ''}" data-count="${bal}" data-key="dash-bal">${money(bal)}</div>
          <div class="hero-meta">
            <span class="delta ${balDelta >= 0 ? 'delta--good' : 'delta--bad'}">${icon(balDelta >= 0 ? 'ArrowUpRight' : 'ArrowDownRight')}${money(balDelta, { sign: true })} desde o início do mês</span>
          </div>
          <div class="hero-split">
            <div><small>Entradas · ${ymShort(ym)}</small><b class="tone-pos">${money(m.income)}</b></div>
            <div><small>Saídas · ${ymShort(ym)}</small><b class="tone-neg">${money(m.total)}</b></div>
            <div><small>Resultado do mês</small><b class="${m.result >= 0 ? 'tone-pos' : 'tone-neg'}">${money(m.result, { sign: true })}</b></div>
          </div>
        </article>

        <article class="card kpi kpi--after ${afterVal < 0 ? 'kpi--red' : 'kpi--green'}" data-anim data-tilt="5">
          <div class="kpi-top"><span class="kpi-icon">${icon('PiggyBank')}</span><span class="kpi-label">${isPast ? `Resultado de ${ymLabel(ym)}` : 'Disponível após pagar todas as contas'}</span></div>
          <div class="kpi-value kpi-value--lg ${afterVal < 0 ? 'is-neg' : ''}" data-count="${afterVal}" data-key="dash-after">${money(afterVal)}</div>
          <div class="kpi-sub">${isPast
            ? 'Entradas menos saídas registradas no mês.'
            : `Até ${fmtDate(endOfYM(ym))}: saldo ${money(bal)} <span class="tone-pos">+ ${money(after.toReceive)}</span> a receber <span class="tone-neg">− ${money(after.toPay)}</span> a pagar.`}</div>
          ${!isPast ? `<div class="after-bar">${p3d(bal + after.toReceive > 0 ? clamp(after.toPay / (bal + after.toReceive), 0, 1) : (after.toPay > 0 ? 1 : 0), afterVal < 0 ? 'red' : 'yellow', 'p3d--thin')}<small>${pct(bal + after.toReceive > 0 ? after.toPay / (bal + after.toReceive) : 0)} do disponível vai para contas</small></div>` : ''}
        </article>

        <article class="card health" data-anim data-tilt="5">
          <div class="kpi-top"><span class="kpi-icon">${icon('Gauge')}</span><span class="kpi-label">Saúde financeira</span></div>
          <div class="gauge gauge--${scoreTone}">
            <svg viewBox="0 0 120 68" aria-hidden="true">
              <path class="gauge-track" d="M10 60 A50 50 0 0 1 110 60"/>
              <path class="gauge-fill" d="M10 60 A50 50 0 0 1 110 60" stroke-dasharray="${gaugeLen}" stroke-dashoffset="${gaugeOff}" data-gauge="${gaugeOff}" data-len="${gaugeLen}"/>
            </svg>
            <div class="gauge-value"><b data-count="${score ?? 0}" data-key="dash-score" data-fmt="int">${score ?? '—'}</b><span>${ins.scoreLabel}</span></div>
          </div>
          <div class="kpi-sub">Renda comprometida, atrasos, sobra e endividamento. <a href="#/inteligencia" class="link">Ver análise</a></div>
        </article>
      </div>

      <div class="grid grid--kpis">
        ${kpi({ label: 'Recebido no mês', value: m.received, key: 'k-rec', iconName: 'BanknoteArrowUp', tone: 'green', sub: `${m.expected > 0 ? `+ ${money(m.expected)} previsto` : 'Entradas confirmadas'} ${deltaHTML(m.received, prev.received, true)}` })}
        ${kpi({ label: 'Despesas do mês', value: m.total, key: 'k-exp', iconName: 'BanknoteArrowDown', tone: 'red', sub: `Pago ${money(m.paid)} · falta ${money(round2(m.pending + m.late))} ${deltaHTML(m.total, prev.total, false)}` })}
        ${kpi({ label: 'Total de dívidas', value: debts.total, key: 'k-debt', iconName: 'Scale', tone: 'violet', sub: `Empréstimos ${money(debts.loansRemaining)} · cartões ${money(debts.cardsOutstanding)}${debts.lateBills ? ` · atrasadas ${money(debts.lateBills)}` : ''}` })}
        ${kpi({ label: 'Empréstimos pendentes', value: debts.loansRemaining, key: 'k-loans', iconName: 'Landmark', tone: 'blue', sub: `${debts.activeLoans} ${debts.activeLoans === 1 ? 'contrato ativo' : 'contratos ativos'} · ${money(debts.monthlyLoans)}/mês` })}
        ${kpi({ label: `Vencendo em ${s.alertDays} dias`, value: upSum, key: 'k-up', iconName: 'CalendarClock', tone: 'yellow', sub: ins.upcoming.length ? `${ins.upcoming.length} ${ins.upcoming.length === 1 ? 'conta próxima' : 'contas próximas'} do vencimento` : 'Nenhuma conta próxima' })}
        ${kpi({ label: 'Contas atrasadas', value: lateSum, key: 'k-late', iconName: 'CalendarX', tone: ins.late.length ? 'red' : 'muted', sub: ins.late.length ? `${ins.late.length} ${ins.late.length === 1 ? 'item em atraso' : 'itens em atraso'}` : 'Tudo em dia', cls: ins.late.length ? 'kpi--alert' : '' })}
      </div>

      <div class="grid grid--main">
        <article class="card chart-card span-8" data-anim>
          <div class="card-head">
            <div><h3>Fluxo financeiro</h3><p>6 meses até ${ymLabel(ym)}</p></div>
            ${segmented('dash.chart', [{ value: 'flow', label: 'Entradas × Saídas' }, { value: 'balance', label: 'Evolução do saldo' }], App.f.dash.chart)}
          </div>
          <div id="dashChartWrap">${dashChartBlock()}</div>
        </article>

        <article class="card span-4 cat-card" data-anim>
          <div class="card-head"><div><h3>Para onde vai o dinheiro</h3><p>${ymLabel(ym)}</p></div></div>
          ${m.total > 0 ? `
          <div class="donut">
            <div class="chart-box chart-box--donut"><canvas id="chKinds" role="img" aria-label="Despesas por tipo em ${ymLabel(ym)}"></canvas></div>
            <div class="donut-center"><small>Total</small><b>${money(m.total)}</b></div>
          </div>
          <ul class="kind-list">${kinds.map((k) => `<li><i class="lg-rect" style="--c:${k.color}"></i><span>${k.label}</span><b>${money(k.value)}</b><em>${pct(m.total ? k.value / m.total : 0)}</em></li>`).join('')}</ul>
          <h4 class="mini-title">Maiores categorias</h4>
          <ul class="cat-bars">${cats.map((c) => `<li>${catChip(c.cat)}<div><span>${esc(c.cat.label)}</span><div class="cat-track"><i data-bar style="width:${(c.value / catMax * 100).toFixed(1)}%"></i></div></div><b>${money(c.value)}</b></li>`).join('')}</ul>`
          : `<div class="empty empty--sm">${icon('ChartPie')}<p>Sem despesas em ${ymLabel(ym)}.</p><button class="btn btn-sm btn-soft" type="button" data-action="new-bill">${icon('Plus')}<span>Adicionar conta</span></button></div>`}
        </article>
      </div>

      <div class="grid grid--two">
        <article class="card" data-anim>
          <div class="card-head">
            <div><h3>Próximos vencimentos</h3><p>Atrasadas e próximos ${s.alertDays} dias</p></div>
            <a class="btn btn-sm btn-ghost" href="#/calendario">${icon('CalendarDays')}<span>Calendário</span></a>
          </div>
          ${list.length ? `<ul class="ob-list">${list.map((o) => obRow(o)).join('')}</ul>` : `<div class="empty empty--sm">${icon('CalendarCheck')}<p>Nenhuma conta atrasada ou vencendo nos próximos ${s.alertDays} dias.</p></div>`}
        </article>
        <article class="card" data-anim>
          <div class="card-head">
            <div><h3>Alertas inteligentes</h3><p>Análise automática de ${ymLabel(ym)}</p></div>
            <a class="btn btn-sm btn-ghost" href="#/inteligencia">${icon('Brain')}<span>Inteligência</span></a>
          </div>
          ${ins.alerts.length ? `<ul class="alert-list">${ins.alerts.slice(0, 4).map(alertRow).join('')}</ul>` : `<div class="empty empty--sm">${icon('Sparkles')}<p>Cadastre entradas e contas para receber análises automáticas.</p></div>`}
        </article>
      </div>
    </div>`;
  };

  const alertRow = (a) => `
    <li class="alert alert--${a.level}" data-row>
      <span class="alert-icon">${icon(a.icon)}</span>
      <div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div>
      ${a.route ? `<a class="alert-go" href="#/${a.route}" aria-label="Abrir">${icon('ChevronRight')}</a>` : ''}
    </li>`;

  const dashRows = () => Fin.series(ymAdd(App.ym, -5), App.ym);
  const dashChartBlock = () => {
    const rows = dashRows();
    const curIdx = rows.findIndex((r) => r.projected);
    if (App.f.dash.chart === 'balance') {
      return `
        <p class="chart-note">${icon('Info')}Saldo ao fim de cada mês. ${curIdx >= 0 ? 'A linha tracejada é a projeção (saldo + a receber − a pagar).' : ''}</p>
        <div class="chart-box" data-clip><canvas id="chDash" role="img" aria-label="Evolução do saldo nos últimos 6 meses"></canvas></div>
        ${tableView(['Mês', 'Saldo ao fim do mês'], rows.map((r) => [ymLabel(r.ym) + (r.projected ? ' (projeção)' : ''), money(r.balance)]))}`;
    }
    return `
      ${legend([{ label: 'Entradas', color: SERIES.income }, { label: 'Saídas', color: SERIES.expense }])}
      <div class="chart-box" data-clip><canvas id="chDash" role="img" aria-label="Entradas e saídas nos últimos 6 meses"></canvas></div>
      ${tableView(['Mês', 'Entradas', 'Saídas', 'Resultado'], rows.map((r) => [ymLabel(r.ym), money(r.income), money(r.total), money(r.result, { sign: true })]))}`;
  };
  const mountDashChart = () => {
    const rows = dashRows();
    if (App.f.dash.chart === 'balance') {
      const firstProj = rows.findIndex((r) => r.projected);
      Charts.make('chDash', Charts.line(rows, { label: 'Saldo', color: SERIES.balance, key: 'balance', dashFrom: firstProj > 0 ? firstProj - 1 : firstProj === 0 ? -1 : null }));
    } else Charts.make('chDash', Charts.bars(rows));
  };
  const mountDashboard = () => {
    mountDashChart();
    const m = Fin.month(App.ym);
    if (m.total > 0) {
      const kinds = ['casa', 'cartoes', 'emprestimos'].map((k) => ({ label: KIND_LABEL[k], value: m.groups[k], color: SERIES.kinds[k] })).filter((k) => k.value > 0);
      Charts.make('chKinds', Charts.donut(kinds));
    }
  };

  /* ===========================================================================
     VIEW: CONTAS DA CASA
     ======================================================================== */
  const billFiltersActive = () => { const f = App.f.bills; return f.q || f.cat !== 'all' || f.status !== 'all'; };
  const viewBills = () => {
    const ym = App.ym;
    const t = today();
    const list = S().bills.filter((b) => ymOf(b.dueDate) === ym);
    const total = sum(list, (b) => b.amount);
    const by = (st) => list.filter((b) => Fin.billStatus(b, t) === st);
    const paid = sum(by('paid'), (b) => b.amount);
    const pending = sum(by('pending'), (b) => b.amount);
    const late = sum(by('late'), (b) => b.amount);
    const allLate = S().bills.filter((b) => Fin.billStatus(b, t) === 'late' && ymOf(b.dueDate) !== ym);
    const f = App.f.bills;
    return `
    <div class="page">
      <div class="view-head" data-anim>
        <p class="view-desc">Aluguel, energia, água, internet, condomínio, gás, mercado, limpeza e outras despesas da casa em <b>${ymLabel(ym)}</b>.</p>
        <div class="view-actions">
          <button class="btn btn-ghost" type="button" data-action="export-bills">${icon('FileSpreadsheet')}<span>Exportar CSV</span></button>
          <button class="btn btn-primary btn-magnetic" type="button" data-action="new-bill">${icon('Plus')}<span>Nova conta</span></button>
        </div>
      </div>
      <div class="grid grid--stats">
        ${kpi({ label: 'Total do mês', value: total, key: 'b-total', iconName: 'Receipt', tone: 'neutral', sub: `${list.length} ${list.length === 1 ? 'conta' : 'contas'}` })}
        ${kpi({ label: 'Pago', value: paid, key: 'b-paid', iconName: 'CircleCheck', tone: 'green', sub: `${by('paid').length} quitadas` })}
        ${kpi({ label: 'Pendente', value: pending, key: 'b-pend', iconName: 'Clock', tone: 'yellow', sub: `${by('pending').length} a vencer` })}
        ${kpi({ label: 'Atrasado', value: late, key: 'b-late', iconName: 'CircleAlert', tone: late > 0 ? 'red' : 'muted', sub: `${by('late').length} em atraso${allLate.length ? ` · +${allLate.length} de outros meses` : ''}` })}
      </div>
      <div class="card progress-card" data-anim>
        <div class="progress-head"><span>Progresso de pagamento de ${ymLabel(ym)}</span><b>${pct(total ? paid / total : 0)}</b></div>
        ${p3d(total ? paid / total : 0, late > 0 ? 'yellow' : 'green')}
      </div>
      <div class="toolbar" data-anim>
        ${searchBox('bills.q', f.q, 'Pesquisar conta, observação…')}
        ${selectBox('bills.cat', [{ value: 'all', label: 'Todas as categorias' }, ...BILL_CATS.map((c) => ({ value: c.id, label: c.label }))], f.cat, 'Categoria')}
        ${segmented('bills.status', [{ value: 'all', label: 'Todas' }, { value: 'pending', label: 'Pendentes' }, { value: 'paid', label: 'Pagas' }, { value: 'late', label: 'Atrasadas' }], f.status)}
        ${segmented('bills.scope', [{ value: 'month', label: ymShort(ym) }, { value: 'all', label: 'Todos os meses' }], f.scope)}
      </div>
      <div id="billList" class="list-wrap">${billList()}</div>
    </div>`;
  };
  const filterBills = () => {
    const f = App.f.bills;
    const t = today();
    const q = norm(f.q);
    return S().bills.filter((b) => {
      if (f.scope === 'month' && ymOf(b.dueDate) !== App.ym) return false;
      if (f.cat !== 'all' && b.category !== f.cat) return false;
      if (f.status !== 'all' && Fin.billStatus(b, t) !== f.status) return false;
      if (q && !norm(`${b.name} ${b.notes} ${billCat(b.category).label} ${(METHOD[b.method] || {}).label || ''} ${fmtDate(b.dueDate)}`).includes(q)) return false;
      return true;
    }).sort((a, b) => (f.scope === 'all' ? b.dueDate.slice(0, 7).localeCompare(a.dueDate.slice(0, 7)) || a.dueDate.localeCompare(b.dueDate) : a.dueDate.localeCompare(b.dueDate)));
  };
  const billRow = (b) => {
    const t = today();
    const st = Fin.billStatus(b, t);
    const cat = billCat(b.category);
    const when = st === 'paid' ? `pago em ${fmtDate(b.paidDate)}` : relDays(b.dueDate, t);
    return `
    <div class="row row--${st}" data-row>
      <button class="check ${b.paid ? 'is-on' : ''}" type="button" data-action="toggle-bill" data-id="${b.id}" aria-pressed="${b.paid}" aria-label="${b.paid ? 'Marcar como pendente' : 'Marcar como paga'}: ${esc(b.name)}">${icon('Check')}</button>
      ${catChip(cat)}
      <div class="row-main"><b>${esc(b.name)}</b><small>${esc(cat.label)}${b.method ? ` · ${esc(METHOD[b.method].label)}` : ''}${b.notes ? ` · ${esc(b.notes)}` : ''}</small></div>
      <div class="row-date"><span>${fmtDate(b.dueDate)}</span><small>${when}</small></div>
      <div class="row-status">${badge(st)}</div>
      <div class="row-amount">${money(b.amount)}</div>
      <div class="row-actions">
        <button class="btn-icon btn-icon--sm" type="button" data-action="edit-bill" data-id="${b.id}" aria-label="Editar ${esc(b.name)}" title="Editar">${icon('Pencil')}</button>
        <button class="btn-icon btn-icon--sm" type="button" data-action="dup-bill" data-id="${b.id}" aria-label="Copiar ${esc(b.name)} para o próximo mês" title="Copiar para o próximo mês">${icon('CopyPlus')}</button>
        <button class="btn-icon btn-icon--sm btn-icon--danger" type="button" data-action="del-bill" data-id="${b.id}" aria-label="Excluir ${esc(b.name)}" title="Excluir">${icon('Trash2')}</button>
      </div>
    </div>`;
  };
  const billList = () => {
    const list = filterBills();
    if (!list.length) {
      if (billFiltersActive()) return empty({ iconName: 'SearchX', title: 'Nenhuma conta encontrada', text: 'Ajuste a pesquisa ou os filtros para ver outros resultados.', action: `<button class="btn btn-soft" type="button" data-action="clear-filters" data-scope="bills">${icon('FilterX')}<span>Limpar filtros</span></button>` });
      return empty({ iconName: 'House', title: App.f.bills.scope === 'month' ? `Nenhuma conta em ${ymLabel(App.ym)}` : 'Nenhuma conta cadastrada', text: 'Cadastre aluguel, energia, água, internet e outras despesas da casa. Use “repetir” para criar as contas dos próximos meses de uma vez.', action: `<button class="btn btn-primary" type="button" data-action="new-bill">${icon('Plus')}<span>Cadastrar conta</span></button>` });
    }
    if (App.f.bills.scope === 'all') {
      const groups = new Map();
      list.forEach((b) => { const k = ymOf(b.dueDate); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); });
      return [...groups.entries()].map(([k, items]) => `<div class="list-group"><div class="list-group-head"><span>${ymLabel(k)}</span><b>${money(sum(items, (b) => b.amount))}</b></div><div class="list">${items.map(billRow).join('')}</div></div>`).join('');
    }
    return `<div class="list">${list.map(billRow).join('')}</div><div class="list-foot"><span>${list.length} ${list.length === 1 ? 'conta' : 'contas'}</span><b>${money(sum(list, (b) => b.amount))}</b></div>`;
  };

  /* ===========================================================================
     VIEW: ENTRADAS
     ======================================================================== */
  const viewIncomes = () => {
    const ym = App.ym;
    const m = Fin.month(ym);
    const prev = Fin.month(ymAdd(ym, -1));
    const last3 = [1, 2, 3].map((k) => Fin.month(ymAdd(ym, -k)).received);
    const has3 = last3.filter((v) => v > 0);
    const avg = has3.length ? sum(has3) / has3.length : 0;
    const byCat = INCOME_CATS.map((c) => ({ c, v: sum(m.inc.filter((i) => i.category === c.id), (i) => i.amount) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const f = App.f.incomes;
    return `
    <div class="page">
      <div class="view-head" data-anim>
        <p class="view-desc">Salário, renda extra, trabalhos adicionais e outros recebimentos de <b>${ymLabel(ym)}</b>. O dashboard é atualizado automaticamente.</p>
        <div class="view-actions">
          <button class="btn btn-ghost" type="button" data-action="export-incomes">${icon('FileSpreadsheet')}<span>Exportar CSV</span></button>
          <button class="btn btn-primary btn-magnetic" type="button" data-action="new-income">${icon('Plus')}<span>Nova entrada</span></button>
        </div>
      </div>
      <div class="grid grid--stats">
        ${kpi({ label: 'Recebido', value: m.received, key: 'i-rec', iconName: 'CircleCheck', tone: 'green', sub: `${m.inc.filter((i) => i.received).length} recebimentos ${deltaHTML(m.received, prev.received, true)}` })}
        ${kpi({ label: 'Previsto a receber', value: m.expected, key: 'i-exp', iconName: 'Hourglass', tone: 'blue', sub: `${m.inc.filter((i) => !i.received).length} aguardando confirmação` })}
        ${kpi({ label: 'Total do mês', value: m.income, key: 'i-total', iconName: 'BanknoteArrowUp', tone: 'neutral', sub: 'Recebido + previsto' })}
        ${kpi({ label: 'Média dos últimos 3 meses', value: round2(avg), key: 'i-avg', iconName: 'ChartLine', tone: 'violet', sub: has3.length ? `Baseada em ${has3.length} ${has3.length === 1 ? 'mês' : 'meses'}` : 'Sem histórico ainda' })}
      </div>
      ${byCat.length ? `<div class="card income-mix" data-anim>
        <div class="progress-head"><span>Composição das entradas de ${ymLabel(ym)}</span><b>${money(m.income)}</b></div>
        <div class="seg-bar" role="img" aria-label="Composição das entradas">${byCat.map((x) => `<i style="--c:${x.c.color};flex:${x.v}" title="${esc(x.c.label)}: ${money(x.v)}"></i>`).join('')}</div>
        <ul class="legend legend--wrap">${byCat.map((x) => `<li><i class="lg-rect" style="--c:${x.c.color}"></i><span>${esc(x.c.label)}</span><b>${money(x.v)}</b><em>${pct(x.v / m.income)}</em></li>`).join('')}</ul>
      </div>` : ''}
      <div class="toolbar" data-anim>
        ${searchBox('incomes.q', f.q, 'Pesquisar entrada…')}
        ${selectBox('incomes.cat', [{ value: 'all', label: 'Todas as categorias' }, ...INCOME_CATS.map((c) => ({ value: c.id, label: c.label }))], f.cat, 'Categoria')}
        ${segmented('incomes.status', [{ value: 'all', label: 'Todas' }, { value: 'received', label: 'Recebidas' }, { value: 'expected', label: 'Previstas' }], f.status)}
        ${segmented('incomes.scope', [{ value: 'month', label: ymShort(ym) }, { value: 'all', label: 'Todos os meses' }], f.scope)}
      </div>
      <div id="incomeList" class="list-wrap">${incomeList()}</div>
    </div>`;
  };
  const filterIncomes = () => {
    const f = App.f.incomes;
    const q = norm(f.q);
    return S().incomes.filter((i) => {
      if (f.scope === 'month' && ymOf(i.date) !== App.ym) return false;
      if (f.cat !== 'all' && i.category !== f.cat) return false;
      if (f.status === 'received' && !i.received) return false;
      if (f.status === 'expected' && i.received) return false;
      if (q && !norm(`${i.description} ${i.notes} ${incomeCat(i.category).label} ${fmtDate(i.date)}`).includes(q)) return false;
      return true;
    }).sort((a, b) => (f.scope === 'all' ? b.date.slice(0, 7).localeCompare(a.date.slice(0, 7)) || a.date.localeCompare(b.date) : a.date.localeCompare(b.date)));
  };
  const incomeRow = (i) => {
    const cat = incomeCat(i.category);
    return `
    <div class="row row--${i.received ? 'paid' : 'expected'}" data-row>
      <button class="check ${i.received ? 'is-on' : ''}" type="button" data-action="toggle-income" data-id="${i.id}" aria-pressed="${i.received}" aria-label="${i.received ? 'Marcar como previsto' : 'Confirmar recebimento'}: ${esc(i.description)}">${icon('Check')}</button>
      ${catChip(cat)}
      <div class="row-main"><b>${esc(i.description)}</b><small>${esc(cat.label)}${i.notes ? ` · ${esc(i.notes)}` : ''}</small></div>
      <div class="row-date"><span>${fmtDate(i.date)}</span><small>${i.received ? 'recebido' : relDays(i.date)}</small></div>
      <div class="row-status">${badge(i.received ? 'received' : 'expected')}</div>
      <div class="row-amount tone-pos">${money(i.amount, { sign: true })}</div>
      <div class="row-actions">
        <button class="btn-icon btn-icon--sm" type="button" data-action="edit-income" data-id="${i.id}" aria-label="Editar ${esc(i.description)}" title="Editar">${icon('Pencil')}</button>
        <button class="btn-icon btn-icon--sm" type="button" data-action="dup-income" data-id="${i.id}" aria-label="Copiar ${esc(i.description)} para o próximo mês" title="Copiar para o próximo mês">${icon('CopyPlus')}</button>
        <button class="btn-icon btn-icon--sm btn-icon--danger" type="button" data-action="del-income" data-id="${i.id}" aria-label="Excluir ${esc(i.description)}" title="Excluir">${icon('Trash2')}</button>
      </div>
    </div>`;
  };
  const incomeList = () => {
    const list = filterIncomes();
    const f = App.f.incomes;
    if (!list.length) {
      if (f.q || f.cat !== 'all' || f.status !== 'all') return empty({ iconName: 'SearchX', title: 'Nenhuma entrada encontrada', text: 'Ajuste a pesquisa ou os filtros.', action: `<button class="btn btn-soft" type="button" data-action="clear-filters" data-scope="incomes">${icon('FilterX')}<span>Limpar filtros</span></button>` });
      return empty({ iconName: 'BanknoteArrowUp', title: f.scope === 'month' ? `Nenhuma entrada em ${ymLabel(App.ym)}` : 'Nenhuma entrada cadastrada', text: 'Registre salário, renda extra e outros recebimentos. Entradas previstas aparecem no calendário até você confirmar o recebimento.', action: `<button class="btn btn-primary" type="button" data-action="new-income">${icon('Plus')}<span>Registrar entrada</span></button>` });
    }
    if (f.scope === 'all') {
      const groups = new Map();
      list.forEach((i) => { const k = ymOf(i.date); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
      return [...groups.entries()].map(([k, items]) => `<div class="list-group"><div class="list-group-head"><span>${ymLabel(k)}</span><b>${money(sum(items, (i) => i.amount))}</b></div><div class="list">${items.map(incomeRow).join('')}</div></div>`).join('');
    }
    return `<div class="list">${list.map(incomeRow).join('')}</div><div class="list-foot"><span>${list.length} ${list.length === 1 ? 'entrada' : 'entradas'}</span><b>${money(sum(list, (i) => i.amount))}</b></div>`;
  };

  /* ===========================================================================
     VIEW: EMPRÉSTIMOS E DÍVIDAS
     ======================================================================== */
  const rateText = (i) => (i.rate == null ? '' : `${(i.rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.m.${i.rateSource === 'implícita' ? ' (implícita)' : ''}`);
  const BAL_SRC = { informado: 'informado pelo credor', calculado: 'com desconto dos juros', estimado: 'estimado para quitação', nominal: 'sem desconto de juros' };

  const loanCard = ({ l, i }) => {
    const tone = i.status === 'done' ? 'green' : i.status === 'late' ? 'red' : 'violet';
    const lastPay = l.payments.length ? l.payments[l.payments.length - 1] : null;
    const canUndo = lastPay && lastPay.n === l.paidInstallments;
    const t = today();
    const monthsLeft = i.remaining;
    const schedule = Array.from({ length: i.total }, (_, k) => {
      const n = k + 1;
      const due = Fin.loanDue(l, n);
      const st = n <= i.paid ? 'paid' : due < t ? 'late' : 'pending';
      return `<tr class="${n === i.paid + 1 ? 'is-next' : ''}"><td>${n}/${i.total}</td><td>${fmtDate(due)}</td><td class="num">${money(i.pmt)}</td><td>${badge(st)}</td></tr>`;
    }).join('');
    return `
    <article class="card loan loan--${i.status}" data-anim data-tilt="3">
      <header class="loan-head">
        ${catChip(BILL_CAT.emprestimos)}
        <div class="loan-title"><b>${esc(l.creditor)}</b><small>${esc(LOAN_TYPE[l.type].label)}${i.rate != null ? ` · ${rateText(i)}` : ''}</small></div>
        ${badge(i.status, i.status === 'late' ? `${i.lateCount} em atraso` : undefined)}
      </header>
      <div class="loan-progress">
        <div class="loan-progress-top"><b data-count="${i.pct}" data-fmt="pct" data-key="lp-${l.id}">${pct(i.pct)}</b><span>quitado</span><em>${i.paid} de ${i.total} parcelas</em></div>
        ${p3d(i.pct, tone, 'p3d--lg')}
        <div class="loan-progress-foot"><span>${money(i.paidAmount)} pagos</span><span>${money(i.remainingAmount)} restantes</span></div>
      </div>
      <dl class="metrics">
        <div><dt>Valor original</dt><dd>${money(l.originalAmount)}</dd></div>
        <div><dt>Valor da parcela</dt><dd>${money(i.pmt)}</dd></div>
        <div><dt>Parcelas restantes</dt><dd>${i.remaining}</dd></div>
        <div><dt>Total comprometido</dt><dd>${money(i.committed)}</dd></div>
        <div><dt>Juros no contrato</dt><dd>${i.interestTotal > 0 ? money(i.interestTotal) : '—'}</dd></div>
        <div><dt>Saldo devedor <span class="hint">${esc(BAL_SRC[i.balanceSource])}</span></dt><dd>${money(i.balance)}</dd></div>
        <div><dt>Próximo vencimento</dt><dd>${i.nextDue ? `${fmtDate(i.nextDue)} <small>${relDays(i.nextDue)}</small>` : '—'}</dd></div>
        <div><dt>Previsão de término</dt><dd>${fmtDate(i.endDate)} ${monthsLeft > 0 ? `<small>${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'}</small>` : ''}</dd></div>
      </dl>
      ${l.notes ? `<p class="loan-notes">${icon('StickyNote')}${esc(l.notes)}</p>` : ''}
      <details class="schedule"><summary>${icon('ListChecks')}<span>Cronograma de parcelas</span></summary>
        <div class="table-scroll table-scroll--tall" data-lenis-prevent><table class="data-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th></tr></thead><tbody>${schedule}</tbody></table></div>
      </details>
      <footer class="loan-foot">
        ${i.remaining > 0 ? `<button class="btn btn-sm btn-primary" type="button" data-action="pay-loan" data-id="${l.id}">${icon('Check')}<span>Pagar parcela ${i.paid + 1}</span></button>` : `<span class="done-tag">${icon('Trophy')}Dívida quitada</span>`}
        ${canUndo ? `<button class="btn btn-sm btn-ghost" type="button" data-action="undo-loan" data-id="${l.id}">${icon('Undo2')}<span>Desfazer</span></button>` : ''}
        <span class="grow"></span>
        <button class="btn-icon btn-icon--sm" type="button" data-action="edit-loan" data-id="${l.id}" aria-label="Editar ${esc(l.creditor)}" title="Editar">${icon('Pencil')}</button>
        <button class="btn-icon btn-icon--sm btn-icon--danger" type="button" data-action="del-loan" data-id="${l.id}" aria-label="Excluir ${esc(l.creditor)}" title="Excluir">${icon('Trash2')}</button>
      </footer>
    </article>`;
  };

  const viewLoans = () => {
    const t = today();
    const infos = S().loans.map((l) => ({ l, i: Fin.loanInfo(l, t) }));
    const active = infos.filter((x) => x.i.status !== 'done');
    const paidAmt = sum(infos, (x) => x.i.paidAmount);
    const remaining = sum(infos, (x) => x.i.remainingAmount);
    const committed = sum(infos, (x) => x.i.committed);
    const monthly = sum(active, (x) => x.i.pmt);
    const balance = sum(active, (x) => x.i.balance);
    const lastEnd = active.map((x) => x.i.endDate).sort().pop();
    const f = App.f.loans;
    const shown = infos.filter((x) => (f.status === 'all' ? true : f.status === 'done' ? x.i.status === 'done' : x.i.status !== 'done'))
      .sort((a, b) => (a.i.nextDue || '9999').localeCompare(b.i.nextDue || '9999'));
    const income = Fin.month(ymNow()).income;
    return `
    <div class="page">
      <div class="view-head" data-anim>
        <p class="view-desc">Empréstimos, financiamentos e dívidas com cálculo automático de quitação, juros e previsão de término.</p>
        <div class="view-actions">
          <button class="btn btn-ghost" type="button" data-action="export-loans">${icon('FileSpreadsheet')}<span>Exportar CSV</span></button>
          <button class="btn btn-primary btn-magnetic" type="button" data-action="new-loan">${icon('Plus')}<span>Novo empréstimo</span></button>
        </div>
      </div>
      <div class="grid grid--stats">
        ${kpi({ label: 'Já pago', value: paidAmt, key: 'l-paid', iconName: 'CircleCheck', tone: 'green', sub: `de ${money(committed)} comprometidos` })}
        ${kpi({ label: 'Falta pagar', value: remaining, key: 'l-rem', iconName: 'Hourglass', tone: 'red', sub: `Saldo devedor atualizado ${money(balance)}` })}
        ${kpi({ label: 'Parcelas por mês', value: monthly, key: 'l-month', iconName: 'CalendarClock', tone: 'violet', sub: income > 0 ? `${pct(monthly / income)} da renda deste mês` : `${active.length} ${active.length === 1 ? 'contrato ativo' : 'contratos ativos'}` })}
        ${kpi({ label: 'Livre de dívidas em', value: lastEnd ? ymLabel(ymOf(lastEnd)) : '—', key: 'l-end', iconName: 'Flag', tone: 'blue', fmt: 'text', sub: lastEnd ? `Última parcela em ${fmtDate(lastEnd)}` : 'Nenhum empréstimo ativo' })}
      </div>
      ${infos.length ? `<div class="card progress-card" data-anim>
        <div class="progress-head"><span>Quitação geral dos empréstimos</span><b>${pct(committed ? paidAmt / committed : 0)}</b></div>
        ${p3d(committed ? paidAmt / committed : 0, 'violet', 'p3d--lg')}
      </div>` : ''}
      <div class="toolbar" data-anim>
        ${segmented('loans.status', [{ value: 'active', label: 'Ativos' }, { value: 'done', label: 'Quitados' }, { value: 'all', label: 'Todos' }], f.status)}
      </div>
      ${shown.length ? `<div class="grid grid--loans">${shown.map(loanCard).join('')}</div>`
        : infos.length ? empty({ iconName: 'Landmark', title: 'Nada por aqui', text: f.status === 'done' ? 'Nenhum empréstimo quitado ainda.' : 'Nenhum empréstimo ativo — parabéns!' })
          : empty({ iconName: 'Landmark', title: 'Nenhum empréstimo cadastrado', text: 'Cadastre empréstimos, financiamentos ou dívidas. O sistema calcula quanto já foi pago, quanto falta, o percentual quitado e a previsão de término.', action: `<button class="btn btn-primary" type="button" data-action="new-loan">${icon('Plus')}<span>Cadastrar empréstimo</span></button>` })}
    </div>`;
  };

  /* ===========================================================================
     VIEW: CARTÕES DE CRÉDITO
     ======================================================================== */
  const cardVisual = (c, info, selected) => {
    const col = COLOR[c.color] || COLOR.grafite;
    return `
    <button class="ccard ${selected ? 'is-selected' : ''}" type="button" data-action="select-card" data-id="${c.id}" style="--c1:${col.c1};--c2:${col.c2}" data-tilt="10" aria-pressed="${selected}" aria-label="Cartão ${esc(c.name)}">
      <span class="ccard-shine" aria-hidden="true"></span>
      <span class="ccard-top"><span class="ccard-chip" aria-hidden="true"></span>${icon('Nfc', 'ccard-nfc')}<span class="ccard-brand">${esc(BRAND[c.brand].label)}</span></span>
      <span class="ccard-name">${esc(c.name)}</span>
      <span class="ccard-row"><span><small>Disponível</small><b>${money(info.available)}</b></span><span><small>Fatura atual</small><b>${money(info.open.amount)}</b></span></span>
      <span class="ccard-usage" aria-hidden="true"><i style="width:${(clamp(info.usage, 0, 1) * 100).toFixed(1)}%"></i></span>
      <span class="ccard-foot"><span>Fecha dia ${c.closingDay}</span><span>Vence dia ${c.dueDay}</span></span>
    </button>`;
  };
  const invStatusLabel = { open: 'Aberta', future: 'Futura', closed: 'Fechada', late: 'Vencida', paid: 'Paga', settled: 'Anterior' };

  const viewCards = () => {
    const cards = S().cards;
    const t = today();
    if (!cards.length) {
      return `<div class="page">
        <div class="view-head" data-anim><p class="view-desc">Acompanhe limites, faturas e compras parceladas dos seus cartões.</p>
          <div class="view-actions"><button class="btn btn-primary btn-magnetic" type="button" data-action="new-card">${icon('Plus')}<span>Novo cartão</span></button></div></div>
        ${empty({ iconName: 'CreditCard', title: 'Nenhum cartão cadastrado', text: 'Cadastre seus cartões com limite, dia de fechamento e vencimento. Depois registre as compras — à vista ou parceladas — e acompanhe as faturas futuras.', action: `<button class="btn btn-primary" type="button" data-action="new-card">${icon('Plus')}<span>Cadastrar cartão</span></button>` })}
      </div>`;
    }
    const sel = cards.find((c) => c.id === App.f.cards.sel) || cards[0];
    App.f.cards.sel = sel.id;
    const info = Fin.cardInfo(sel, t);
    const allInfo = cards.map((c) => Fin.cardInfo(c, t));
    const totalLimit = sum(cards, (c) => c.limit);
    const totalOut = sum(allInfo, (i) => i.outstanding);
    const toPaySum = sum(info.toPay, (i) => i.amount);
    const invList = info.list.filter((i) => i.status !== 'settled' && (i.ym >= ymAdd(info.openYm, -1) || ['closed', 'late'].includes(i.status) || (i.status === 'paid' && i.ym >= ymAdd(info.openYm, -3))) && i.ym <= ymAdd(info.openYm, 6));
    const invSelYm = invList.some((i) => i.ym === App.f.cards.inv) ? App.f.cards.inv : (info.toPay[0] ? info.toPay[0].ym : info.openYm);
    const invSel = Fin.invoice(sel, invSelYm, t);
    const purchases = S().purchases.filter((p) => p.cardId === sel.id).sort((a, b) => b.date.localeCompare(a.date));
    const usageTone = info.usage >= 0.8 ? 'red' : info.usage >= 0.5 ? 'yellow' : 'green';
    return `
    <div class="page">
      <div class="view-head" data-anim>
        <p class="view-desc">${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'} · limite total ${money(totalLimit)} · comprometido ${money(totalOut)}</p>
        <div class="view-actions">
          <button class="btn btn-ghost" type="button" data-action="new-card">${icon('Plus')}<span>Novo cartão</span></button>
          <button class="btn btn-primary btn-magnetic" type="button" data-action="new-purchase" data-card="${sel.id}">${icon('ShoppingBag')}<span>Nova compra</span></button>
        </div>
      </div>
      <div class="cards-rail" data-anim>
        ${cards.map((c, k) => cardVisual(c, allInfo[k], c.id === sel.id)).join('')}
        <button class="ccard ccard--add" type="button" data-action="new-card">${icon('Plus')}<span>Adicionar cartão</span></button>
      </div>
      <div class="grid grid--stats">
        ${kpi({ label: 'Limite total', value: sel.limit, key: `c-lim-${sel.id}`, iconName: 'CreditCard', tone: 'neutral', sub: `${esc(sel.name)} · ${esc(BRAND[sel.brand].label)}`, extra: `<div class="kpi-actions"><button class="btn btn-sm btn-ghost" type="button" data-action="edit-card" data-id="${sel.id}">${icon('Pencil')}<span>Editar</span></button><button class="btn btn-sm btn-ghost btn-ghost--danger" type="button" data-action="del-card" data-id="${sel.id}">${icon('Trash2')}<span>Excluir</span></button></div>` })}
        ${kpi({ label: 'Limite disponível', value: info.available, key: `c-av-${sel.id}`, iconName: 'Wallet', tone: info.available < 0 ? 'red' : 'green', sub: `${pct(info.usage)} utilizado`, extra: p3d(info.usage, usageTone, 'p3d--thin') })}
        ${kpi({ label: 'Fatura atual (aberta)', value: info.open.amount, key: `c-open-${sel.id}`, iconName: 'Receipt', tone: 'blue', sub: `Fecha ${fmtDate(info.open.closingDate)} · vence ${fmtDate(info.open.dueDate)}` })}
        ${kpi({ label: 'Fatura a pagar', value: toPaySum, key: `c-pay-${sel.id}`, iconName: info.late.length ? 'CircleAlert' : 'CalendarCheck', tone: info.late.length ? 'red' : toPaySum > 0 ? 'yellow' : 'muted', sub: info.toPay.length ? info.toPay.map((i) => `${ymShort(i.ym)} vence ${fmtDM(i.dueDate)}`).join(' · ') : 'Nenhuma fatura fechada em aberto' })}
      </div>
      <div class="grid grid--split">
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Faturas</h3><p>Fechadas, atual e próximas parcelas</p></div></div>
          <ul class="inv-list">
            ${invList.map((inv) => `
              <li class="inv ${inv.ym === invSelYm ? 'is-selected' : ''} inv--${inv.status}">
                <button class="inv-main" type="button" data-action="select-invoice" data-ym="${inv.ym}" aria-pressed="${inv.ym === invSelYm}">
                  <span class="inv-month"><b>${MONTHS_SHORT[Number(inv.ym.slice(5, 7)) - 1]}</b><small>${inv.ym.slice(0, 4)}</small></span>
                  <span class="inv-info"><b>${money(inv.amount)}</b><small>Vence ${fmtDate(inv.dueDate)}${inv.payment ? ` · paga em ${fmtDate(inv.payment.date)}` : ''}</small></span>
                  <span class="badge badge--${({ open: 'info', future: 'muted', closed: 'pending', late: 'late', paid: 'paid' })[inv.status]}">${invStatusLabel[inv.status]}</span>
                </button>
                ${['closed', 'late', 'open'].includes(inv.status) && inv.amount > 0 ? `<button class="btn btn-sm ${inv.status === 'open' ? 'btn-ghost' : 'btn-soft'}" type="button" data-action="pay-invoice" data-id="${sel.id}" data-ym="${inv.ym}">${icon('Check')}<span>Pagar</span></button>` : ''}
                ${inv.status === 'paid' ? `<button class="btn-icon btn-icon--sm" type="button" data-action="undo-invoice" data-id="${sel.id}" data-ym="${inv.ym}" aria-label="Desfazer pagamento da fatura" title="Desfazer pagamento">${icon('Undo2')}</button>` : ''}
              </li>`).join('')}
          </ul>
          <div class="inv-detail">
            <h4 class="mini-title">Itens da fatura de ${ymLabel(invSelYm)} <span>${money(invSel.amount)}</span></h4>
            ${invSel.items.length ? `<ul class="inv-items">${invSel.items.map(({ p, part }) => `<li>${catChip(billCat(p.category))}<div><b>${esc(p.description)}</b><small>${fmtDate(p.date)}${p.installments > 1 ? ` · parcela ${part.n}/${p.installments}` : ' · à vista'}</small></div><span>${money(part.amount)}</span></li>`).join('')}</ul>` : `<p class="muted-text">Nenhum lançamento nesta fatura.</p>`}
          </div>
        </article>
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Compras e parcelamentos</h3><p>${purchases.length} ${purchases.length === 1 ? 'compra' : 'compras'} no ${esc(sel.name)}</p></div>
            <button class="btn btn-sm btn-soft" type="button" data-action="new-purchase" data-card="${sel.id}">${icon('Plus')}<span>Compra</span></button></div>
          ${purchases.length ? `<ul class="purchase-list">${purchases.map((p) => {
            const parts = Fin.purchaseParts(p, sel);
            const invs = parts.map((pt) => Fin.invoice(sel, pt.ym, t));
            const done = invs.filter((iv) => ['paid', 'settled'].includes(iv.status)).length;
            const rest = sum(parts.filter((_, k) => !['paid', 'settled'].includes(invs[k].status)), (pt) => pt.amount);
            const curIdx = parts.findIndex((pt) => pt.ym === info.openYm);
            return `<li class="purchase" data-row>
              ${catChip(billCat(p.category))}
              <div class="purchase-main"><b>${esc(p.description)}</b><small>${fmtDate(p.date)} · ${p.installments > 1 ? `${p.installments}x de ${money(parts[parts.length - 1].amount)}` : 'à vista'}${curIdx >= 0 ? ` · fatura atual: ${curIdx + 1}/${p.installments}` : ''}</small>
                ${p.installments > 1 ? `<div class="purchase-progress">${p3d(done / p.installments, 'blue', 'p3d--thin')}<span>${done}/${p.installments} pagas · restam ${money(rest)}</span></div>` : ''}
              </div>
              <b class="purchase-amount">${money(p.amount)}</b>
              <div class="row-actions">
                <button class="btn-icon btn-icon--sm" type="button" data-action="edit-purchase" data-id="${p.id}" aria-label="Editar compra ${esc(p.description)}" title="Editar">${icon('Pencil')}</button>
                <button class="btn-icon btn-icon--sm btn-icon--danger" type="button" data-action="del-purchase" data-id="${p.id}" aria-label="Excluir compra ${esc(p.description)}" title="Excluir">${icon('Trash2')}</button>
              </div>
            </li>`;
          }).join('')}</ul>` : `<div class="empty empty--sm">${icon('ShoppingBag')}<p>Nenhuma compra registrada neste cartão.</p></div>`}
        </article>
      </div>
    </div>`;
  };

  /* ===========================================================================
     VIEW: CALENDÁRIO FINANCEIRO
     ======================================================================== */
  const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const EV_LABEL = { paid: 'Conta paga', pending: 'Conta pendente', late: 'Atrasada', loan: 'Parcela de empréstimo', card: 'Fatura de cartão', income: 'Recebido', expected: 'Recebimento previsto' };
  const calEvents = (ym) => {
    const t = today();
    const map = new Map();
    const add = (d, e) => { if (!map.has(d)) map.set(d, []); map.get(d).push(e); };
    Fin.obligations(ym, t).forEach((o) => {
      let type = o.status;
      if (o.kind === 'loan') type = o.status === 'late' ? 'late' : 'loan';
      if (o.kind === 'invoice') type = o.status === 'late' ? 'late' : 'card';
      add(o.dueDate, { ...o, type, done: o.status === 'paid' });
    });
    Fin.incomes(ym).forEach((i) => add(i.date, { kind: 'income', id: i.id, name: i.description, sub: incomeCat(i.category).label, amount: i.amount, dueDate: i.date, status: i.received ? 'received' : 'expected', type: i.received ? 'income' : 'expected', done: i.received, ref: i }));
    return map;
  };
  const evIcon = (e) => (e.kind === 'income' ? catChip(incomeCat(e.ref.category)) : obIcon(e));
  const evRow = (e) => {
    let action = '';
    if (e.kind === 'income') action = e.status === 'expected' ? `<button class="btn btn-sm btn-soft" type="button" data-action="toggle-income" data-id="${e.id}">${icon('Check')}<span>Confirmar</span></button>` : badge('received');
    else action = e.status === 'paid' ? badge('paid') : payBtn(e);
    return `<li class="ev-row ev-row--${e.type} ${e.done ? 'is-done' : ''}" data-row>
      <i class="ev-dot ev--${e.type}" aria-hidden="true"></i>${evIcon(e)}
      <div class="ob-main"><b>${esc(e.name)}</b><small>${esc(e.sub || '')} · ${EV_LABEL[e.type]}</small></div>
      <div class="ev-end"><b class="ob-amount ${e.kind === 'income' ? 'tone-pos' : ''}">${e.kind === 'income' ? money(e.amount, { sign: true }) : money(e.amount)}</b>${action}</div>
    </li>`;
  };
  const viewCalendar = () => {
    const ym = App.ym;
    const t = today();
    const events = calEvents(ym);
    const first = parseISO(`${ym}-01`);
    const offset = first.getDay();
    const days = daysInYM(ym);
    const cells = Math.ceil((offset + days) / 7) * 7;
    let sel = App.f.cal.day && ymOf(App.f.cal.day) === ym ? App.f.cal.day : null;
    if (!sel) sel = ymOf(t) === ym ? t : ([...events.keys()].sort()[0] || `${ym}-01`);
    App.f.cal.day = sel;
    const grid = [];
    for (let k = 0; k < cells; k++) {
      const dayN = k - offset + 1;
      if (dayN < 1 || dayN > days) { grid.push('<div class="cal-cell is-out" aria-hidden="true"></div>'); continue; }
      const iso = `${ym}-${pad(dayN)}`;
      const ev = events.get(iso) || [];
      const total = sum(ev.filter((e) => e.kind !== 'income'), (e) => e.amount);
      const label = `${dayN} de ${MONTHS[Number(ym.slice(5, 7)) - 1]}${ev.length ? `, ${ev.length} ${ev.length === 1 ? 'evento' : 'eventos'}` : ''}`;
      grid.push(`<button class="cal-cell ${iso === t ? 'is-today' : ''} ${iso === sel ? 'is-selected' : ''} ${ev.some((e) => e.type === 'late') ? 'has-late' : ''}" type="button" data-action="cal-day" data-date="${iso}" aria-label="${label}" aria-pressed="${iso === sel}">
        <span class="cal-num">${dayN}</span>
        ${ev.length ? `<span class="cal-events">${ev.slice(0, 3).map((e) => `<i class="ev ev--${e.type} ${e.done ? 'is-done' : ''}"><span>${esc(e.name)}</span></i>`).join('')}${ev.length > 3 ? `<em>+${ev.length - 3}</em>` : ''}</span>
        <span class="cal-dots">${ev.slice(0, 4).map((e) => `<i class="ev-dot ev--${e.type}"></i>`).join('')}</span>` : ''}
        ${total > 0 ? `<span class="cal-total">${moneyCompact(total)}</span>` : ''}
      </button>`);
    }
    const selEv = events.get(sel) || [];
    const all = [...events.values()].flat();
    const tot = (fn) => sum(all.filter(fn), (e) => e.amount);
    const sd = parseISO(sel);
    return `
    <div class="page">
      <div class="view-head" data-anim>
        <p class="view-desc">Vencimentos, parcelas, faturas e recebimentos de <b>${ymLabel(ym)}</b>. Toque em um dia para ver os detalhes.</p>
        <div class="view-actions"><button class="btn btn-ghost" type="button" data-action="month-today">${icon('LocateFixed')}<span>Hoje</span></button><button class="btn btn-primary btn-magnetic" type="button" data-action="new-bill" data-date="${sel}">${icon('Plus')}<span>Conta neste dia</span></button></div>
      </div>
      <div class="cal-layout">
        <article class="card cal-card" data-anim>
          <ul class="legend legend--wrap cal-legend">${Object.entries(EV_LABEL).map(([k, v]) => `<li><i class="ev-dot ev--${k}"></i><span>${v}</span></li>`).join('')}</ul>
          <div class="cal-grid" role="grid" aria-label="Calendário de ${ymLabel(ym)}">
            ${WEEKDAYS.map((w) => `<div class="cal-wd" role="columnheader">${w}</div>`).join('')}
            ${grid.join('')}
          </div>
        </article>
        <aside class="cal-side">
          <article class="card" data-anim>
            <div class="card-head"><div><h3>${WEEKDAYS_LONG[sd.getDay()]}, ${sd.getDate()} de ${MONTHS[sd.getMonth()].toLowerCase()}</h3><p>${fmtDate(sel)} · ${sel === t ? 'hoje' : relDays(sel, t)}</p></div></div>
            ${selEv.length ? `<ul class="ob-list">${selEv.map(evRow).join('')}</ul>` : `<div class="empty empty--sm">${icon('CalendarCheck')}<p>Nenhum evento financeiro neste dia.</p></div>`}
          </article>
          <article class="card" data-anim>
            <div class="card-head"><div><h3>Resumo de ${ymLabel(ym)}</h3><p>${all.length} eventos no mês</p></div></div>
            <dl class="cal-summary">
              <div><dt><i class="ev-dot ev--late"></i>Atrasado</dt><dd>${money(tot((e) => e.type === 'late'))}</dd></div>
              <div><dt><i class="ev-dot ev--pending"></i>A pagar</dt><dd>${money(tot((e) => e.kind !== 'income' && e.status === 'pending'))}</dd></div>
              <div><dt><i class="ev-dot ev--paid"></i>Pago</dt><dd>${money(tot((e) => e.kind !== 'income' && e.status === 'paid'))}</dd></div>
              <div><dt><i class="ev-dot ev--expected"></i>A receber</dt><dd>${money(tot((e) => e.type === 'expected'))}</dd></div>
              <div><dt><i class="ev-dot ev--income"></i>Recebido</dt><dd>${money(tot((e) => e.type === 'income'))}</dd></div>
            </dl>
          </article>
        </aside>
      </div>
    </div>`;
  };

  /* ===========================================================================
     VIEW: RELATÓRIOS E ANÁLISES
     ======================================================================== */
  const reportRange = () => {
    const f = App.f.rep;
    const end = App.ym;
    if (f.range === 'year') return { from: `${end.slice(0, 4)}-01`, to: `${end.slice(0, 4)}-12` };
    if (f.range === 'custom') {
      let from = isYM(f.from) ? f.from : ymAdd(end, -5);
      let to = isYM(f.to) ? f.to : end;
      if (from > to) [from, to] = [to, from];
      if (ymDiff(from, to) > 47) from = ymAdd(to, -47);
      return { from, to };
    }
    const n = Number(f.range) || 6;
    return { from: ymAdd(end, -(n - 1)), to: end };
  };
  const viewReports = () => {
    const { from, to } = reportRange();
    const rows = Fin.series(from, to);
    const yms = rows.map((r) => r.ym);
    const totIn = sum(rows, (r) => r.income);
    const totOut = sum(rows, (r) => r.total);
    const cats = Fin.categories(yms);
    const kinds = ['casa', 'cartoes', 'emprestimos'].map((k) => ({ key: k, label: KIND_LABEL[k], value: sum(rows, (r) => r.m.groups[k]), color: SERIES.kinds[k] }));
    const mSel = Fin.month(App.ym);
    const f = App.f.rep;
    const cur = ymNow();
    const opts = [];
    for (let ym = ymAdd(cur, -36); ym <= ymAdd(cur, 12); ym = ymAdd(ym, 1)) opts.push({ value: ym, label: ymLabel(ym) });
    const top = cats[0];
    return `
    <div class="page">
      <div class="filter-row" data-anim>
        ${segmented('rep.range', [{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }, { value: 'year', label: `Ano ${App.ym.slice(0, 4)}` }, { value: 'custom', label: 'Personalizado' }], f.range)}
        ${f.range === 'custom' ? `<div class="range-custom">${selectBox('rep.from', opts, from, 'De')}<span>até</span>${selectBox('rep.to', opts, to, 'Até')}</div>` : ''}
        <span class="grow"></span>
        <button class="btn btn-ghost" type="button" data-action="export-report">${icon('FileSpreadsheet')}<span>Histórico CSV</span></button>
        <button class="btn btn-ghost" type="button" data-action="export-transactions">${icon('FileDown')}<span>Lançamentos CSV</span></button>
      </div>
      <p class="range-note" data-anim>${icon('CalendarRange')}Período: <b>${ymLabel(from)}</b> a <b>${ymLabel(to)}</b> · ${rows.length} ${rows.length === 1 ? 'mês' : 'meses'}</p>
      <div class="grid grid--kpis">
        ${kpi({ label: `Gasto em ${ymLabel(App.ym)}`, value: mSel.total, key: 'r-mout', iconName: 'BanknoteArrowDown', tone: 'red', sub: `Pago ${money(mSel.paid)}` })}
        ${kpi({ label: `Recebido em ${ymLabel(App.ym)}`, value: mSel.income, key: 'r-min', iconName: 'BanknoteArrowUp', tone: 'green', sub: mSel.expected > 0 ? `${money(mSel.expected)} ainda previsto` : 'Tudo confirmado' })}
        ${kpi({ label: 'Total recebido no período', value: totIn, key: 'r-in', iconName: 'TrendingUp', tone: 'green', sub: `Média ${money(rows.length ? totIn / rows.length : 0)}/mês` })}
        ${kpi({ label: 'Total gasto no período', value: totOut, key: 'r-out', iconName: 'TrendingDown', tone: 'red', sub: `Média ${money(rows.length ? totOut / rows.length : 0)}/mês` })}
        ${kpi({ label: 'Renda comprometida', value: totIn > 0 ? totOut / totIn : 0, key: 'r-comm', iconName: 'Gauge', tone: totIn > 0 && totOut / totIn > 0.9 ? 'red' : 'yellow', fmt: 'pct', sub: totIn > 0 ? 'Saídas ÷ entradas no período' : 'Sem entradas no período' })}
        ${kpi({ label: 'Maior categoria', value: top ? top.cat.label : '—', key: 'r-top', iconName: top ? top.cat.icon : 'ChartPie', tone: 'violet', fmt: 'text', sub: top ? `${money(top.value)} · ${pct(totOut ? top.value / totOut : 0)} das despesas` : 'Sem despesas no período' })}
      </div>
      <div class="grid grid--main">
        <article class="card chart-card span-8" data-anim>
          <div class="card-head"><div><h3>Comparação entre meses</h3><p>Entradas × saídas por mês</p></div></div>
          ${legend([{ label: 'Entradas', color: SERIES.income }, { label: 'Saídas', color: SERIES.expense }])}
          <div class="chart-box" data-clip><canvas id="chRepFlow" role="img" aria-label="Entradas e saídas por mês"></canvas></div>
        </article>
        <article class="card span-4 cat-card" data-anim>
          <div class="card-head"><div><h3>Por tipo de despesa</h3><p>Total do período</p></div></div>
          ${totOut > 0 ? `<div class="donut"><div class="chart-box chart-box--donut"><canvas id="chRepKinds" role="img" aria-label="Despesas por tipo no período"></canvas></div><div class="donut-center"><small>Total</small><b>${money(totOut)}</b></div></div>
          <ul class="kind-list">${kinds.map((k) => `<li><i class="lg-rect" style="--c:${k.color}"></i><span>${k.label}</span><b>${money(k.value)}</b><em>${pct(totOut ? k.value / totOut : 0)}</em></li>`).join('')}</ul>` : `<div class="empty empty--sm">${icon('ChartPie')}<p>Sem despesas no período.</p></div>`}
        </article>
      </div>
      <div class="grid grid--two">
        <article class="card chart-card" data-anim>
          <div class="card-head"><div><h3>Despesas por categoria</h3><p>Faturas de cartão distribuídas pelas categorias das compras</p></div></div>
          ${cats.length ? `<div class="chart-box" style="height:${Math.max(220, cats.length * 34 + 40)}px"><canvas id="chRepCats" role="img" aria-label="Despesas por categoria"></canvas></div>
          ${tableView(['Categoria', 'Valor', '% do total'], cats.map((c) => [esc(c.cat.label), money(c.value), pct(totOut ? c.value / totOut : 0, 1)]))}` : `<div class="empty empty--sm">${icon('ChartBar')}<p>Sem despesas no período.</p></div>`}
        </article>
        <article class="card chart-card" data-anim>
          <div class="card-head"><div><h3>Percentual da renda comprometida</h3><p>Saídas do mês ÷ entradas do mês</p></div></div>
          <div class="chart-box"><canvas id="chRepCommit" role="img" aria-label="Percentual da renda comprometida por mês"></canvas></div>
          ${tableView(['Mês', 'Comprometido'], rows.map((r) => [ymLabel(r.ym), r.committed == null ? 'sem entradas' : pct(r.committed, 1)]))}
        </article>
      </div>
      <div class="grid grid--two">
        <article class="card chart-card" data-anim>
          <div class="card-head"><div><h3>Evolução das dívidas</h3><p>Empréstimos + cartões restantes ao fim de cada mês</p></div></div>
          <div class="chart-box"><canvas id="chRepDebt" role="img" aria-label="Evolução das dívidas"></canvas></div>
          ${tableView(['Mês', 'Dívida restante'], rows.map((r) => [ymLabel(r.ym), money(r.debt)]))}
        </article>
        <article class="card chart-card" data-anim>
          <div class="card-head"><div><h3>Evolução do saldo</h3><p>Real até o mês passado · projeção a partir do mês atual</p></div></div>
          <div class="chart-box"><canvas id="chRepBal" role="img" aria-label="Evolução do saldo"></canvas></div>
          ${tableView(['Mês', 'Saldo'], rows.map((r) => [ymLabel(r.ym) + (r.projected ? ' (projeção)' : ''), money(r.balance)]))}
        </article>
      </div>
      <article class="card" data-anim>
        <div class="card-head"><div><h3>Histórico financeiro</h3><p>Resumo mês a mês com comparação ao mês anterior</p></div>
          <button class="btn btn-sm btn-ghost" type="button" data-action="export-report">${icon('FileSpreadsheet')}<span>CSV</span></button></div>
        <div class="table-scroll" data-lenis-prevent>
          <table class="data-table data-table--history">
            <thead><tr><th>Mês</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Δ saídas</th><th class="num">Resultado</th><th class="num">Renda compr.</th><th class="num">Saldo fim do mês</th><th class="num">Dívida restante</th></tr></thead>
            <tbody>${rows.map((r, k) => {
              const p = k > 0 ? rows[k - 1] : Fin.series(ymAdd(r.ym, -1), ymAdd(r.ym, -1))[0];
              const d = p && p.total > 0 ? (r.total - p.total) / p.total : null;
              return `<tr><td>${ymLabel(r.ym)}${r.projected ? ' <small class="muted-text">proj.</small>' : ''}</td><td class="num tone-pos">${money(r.income)}</td><td class="num tone-neg">${money(r.total)}</td><td class="num">${d == null ? '—' : `<span class="delta ${d > 0 ? 'delta--bad' : 'delta--good'}">${icon(d > 0 ? 'ArrowUpRight' : 'ArrowDownRight')}${pct(Math.abs(d))}</span>`}</td><td class="num ${r.result >= 0 ? 'tone-pos' : 'tone-neg'}">${money(r.result, { sign: true })}</td><td class="num">${r.committed == null ? '—' : pct(r.committed)}</td><td class="num">${money(r.balance)}</td><td class="num">${money(r.debt)}</td></tr>`;
            }).join('')}</tbody>
            <tfoot><tr><td>Total</td><td class="num">${money(totIn)}</td><td class="num">${money(totOut)}</td><td></td><td class="num">${money(totIn - totOut, { sign: true })}</td><td class="num">${totIn > 0 ? pct(totOut / totIn) : '—'}</td><td></td><td></td></tr></tfoot>
          </table>
        </div>
      </article>
    </div>`;
  };
  const mountReports = () => {
    const { from, to } = reportRange();
    const rows = Fin.series(from, to);
    const cur = ymNow();
    Charts.make('chRepFlow', Charts.bars(rows));
    const kinds = ['casa', 'cartoes', 'emprestimos'].map((k) => ({ label: KIND_LABEL[k], value: sum(rows, (r) => r.m.groups[k]), color: SERIES.kinds[k] })).filter((k) => k.value > 0);
    if (kinds.length) Charts.make('chRepKinds', Charts.donut(kinds));
    const cats = Fin.categories(rows.map((r) => r.ym));
    if (cats.length) Charts.make('chRepCats', Charts.hbars(cats));
    Charts.make('chRepCommit', Charts.commitBars(rows));
    Charts.make('chRepDebt', Charts.line(rows, { label: 'Dívida restante', color: SERIES.debt, key: 'debt', beginAtZero: true }));
    const fp = rows.findIndex((r) => r.ym >= cur);
    Charts.make('chRepBal', Charts.line(rows, { label: 'Saldo', color: SERIES.balance, key: 'balance', dashFrom: fp > 0 ? fp - 1 : fp === 0 ? -1 : null }));
  };

  /* ===========================================================================
     VIEW: INTELIGÊNCIA FINANCEIRA
     ======================================================================== */
  const viewInsights = () => {
    const t = today();
    const ym = App.ym;
    const ins = Fin.insights(ym, t);
    const m = ins.m;
    const s = S().settings;
    const c = ins.committed;
    const cTone = c == null ? 'muted' : c <= 0.7 ? 'green' : c <= 1 ? 'yellow' : 'red';
    const gaugeLen = 157.08;
    const score = ins.score;
    const gaugeOff = score == null ? gaugeLen : gaugeLen * (1 - score / 100);
    const scoreTone = score == null ? 'muted' : score >= 80 ? 'green' : score >= 60 ? 'blue' : score >= 40 ? 'yellow' : 'red';
    const avgOut3 = (() => { const v = [1, 2, 3].map((k) => Fin.month(ymAdd(ymOf(t), -k), t).total).filter((x) => x > 0); return v.length ? sum(v) / v.length : m.total; })();
    const reserve = round2(avgOut3 * 6);
    const rate = m.income > 0 ? ins.leftover / m.income : null;
    const dtiMonths = m.income > 0 ? ins.debts.total / m.income : null;
    const factors = [
      { ok: c != null && c <= 0.7, label: 'Renda comprometida', value: c == null ? 'sem entradas' : pct(c), hint: 'ideal abaixo de 70%' },
      { ok: ins.late.length === 0, label: 'Contas em atraso', value: String(ins.late.length), hint: 'ideal: nenhuma' },
      { ok: rate != null && rate >= ins.goal, label: 'Taxa de sobra', value: rate == null ? '—' : pct(rate), hint: `meta de ${pct(ins.goal)}` },
      { ok: dtiMonths != null ? dtiMonths <= 3.6 : ins.debts.total === 0, label: 'Endividamento', value: dtiMonths == null ? money(ins.debts.total) : `${dtiMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× a renda mensal`, hint: 'ideal até 30% da renda anual' },
    ];
    const tips = [];
    if (ins.late.length) tips.push({ icon: 'CalendarX', text: `Priorize ${ins.late.length === 1 ? 'a conta em atraso' : `as ${ins.late.length} contas em atraso`} (${money(sum(ins.late, (o) => o.amount))}) para evitar juros, multas e negativação.` });
    if (ins.needToCut > 0) tips.push({ icon: 'Scissors', text: `Para fechar ${ymLabel(ym)} no zero, é preciso reduzir despesas ou aumentar a renda em ${money(ins.needToCut)}.` });
    S().loans.forEach((l) => { const i = Fin.loanInfo(l, t); if (i.status !== 'done' && i.rate != null && i.rate > 0.03) tips.push({ icon: 'Landmark', text: `O empréstimo com ${l.creditor} tem taxa de ${rateText(i)}. Avalie portabilidade ou renegociação — quitar antecipadamente hoje custaria ${money(i.balance)}.` }); });
    ins.cards.forEach(({ c: card, info }) => { if (card.limit > 0 && info.usage >= 0.6) tips.push({ icon: 'CreditCard', text: `O ${card.name} está com ${pct(info.usage)} do limite comprometido. Evite novos parcelamentos até liberar limite.` }); });
    if (m.income > 0) tips.push({ icon: 'PieChart', text: `Referência 50/30/20 para sua renda de ${money(m.income)}: até ${money(m.income * 0.5)} em necessidades, ${money(m.income * 0.3)} em desejos e ${money(m.income * 0.2)} para poupar/investir.` });
    if (reserve > 0) tips.push({ icon: 'ShieldCheck', text: `Reserva de emergência recomendada: ${money(reserve)} (6 meses das suas despesas médias de ${money(avgOut3)}).` });
    if (ins.leftover > 0 && !ins.late.length) tips.push({ icon: 'PiggyBank', text: `Você pode direcionar ${money(Math.min(ins.leftover, Math.max(ins.savingsTarget, ins.leftover * 0.5)))} da sobra de ${ymLabel(ym)} para a reserva ou investimentos.` });
    const proj = ins.proj.rows;
    const anyEst = proj.some((r) => r.estIncome || r.estBills);
    const topMax = ins.top.length ? ins.top[0].amount : 1;
    return `
    <div class="page">
      <div class="grid grid--ins">
        <article class="card health health--lg" data-anim data-tilt="4">
          <div class="kpi-top"><span class="kpi-icon">${icon('Gauge')}</span><span class="kpi-label">Saúde financeira · ${ymLabel(ym)}</span></div>
          <div class="gauge gauge--${scoreTone} gauge--lg">
            <svg viewBox="0 0 120 68" aria-hidden="true"><path class="gauge-track" d="M10 60 A50 50 0 0 1 110 60"/><path class="gauge-fill" d="M10 60 A50 50 0 0 1 110 60" stroke-dasharray="${gaugeLen}" stroke-dashoffset="${gaugeOff}" data-gauge="${gaugeOff}" data-len="${gaugeLen}"/></svg>
            <div class="gauge-value"><b data-count="${score ?? 0}" data-key="ins-score" data-fmt="int">${score ?? '—'}</b><span>${ins.scoreLabel}</span></div>
          </div>
          <ul class="factor-list">${factors.map((x) => `<li class="${x.ok ? 'is-ok' : 'is-warn'}">${icon(x.ok ? 'CircleCheck' : 'CircleAlert')}<span>${x.label}<small>${x.hint}</small></span><b>${x.value}</b></li>`).join('')}</ul>
        </article>
        <div class="ins-stack">
          <article class="card ins-big" data-anim>
            <div class="kpi-top"><span class="kpi-icon kpi-icon--${cTone}">${icon('Percent')}</span><span class="kpi-label">Quanto da renda está comprometida</span></div>
            <div class="ins-value"><b data-count="${c ?? 0}" data-fmt="pct" data-key="ins-c">${c == null ? '—' : pct(c)}</b><span>${c == null ? 'Cadastre entradas para calcular' : `${money(m.total)} de ${money(m.income)}`}</span></div>
            <div class="meter">${p3d(c == null ? 0 : Math.min(c, 1.2) / 1.2, cTone === 'muted' ? 'blue' : cTone, 'p3d--lg')}<div class="meter-ticks"><span style="left:${(0.5 / 1.2 * 100).toFixed(2)}%">50%</span><span style="left:${(0.7 / 1.2 * 100).toFixed(2)}%">70%</span><span style="left:${(1 / 1.2 * 100).toFixed(2)}%">100%</span></div></div>
          </article>
          <div class="grid grid--three">
            <article class="card kpi ${ins.leftover >= 0 ? 'kpi--green' : 'kpi--red'}" data-anim data-tilt="6">
              <div class="kpi-top"><span class="kpi-icon">${icon('Coins')}</span><span class="kpi-label">Sobra após todas as obrigações</span></div>
              <div class="kpi-value" data-count="${ins.leftover}" data-key="ins-left">${money(ins.leftover)}</div>
              <div class="kpi-sub">Entradas ${money(m.income)} − saídas ${money(m.total)}</div>
            </article>
            <article class="card kpi ${ins.needToCut > 0 ? 'kpi--red' : ins.gapToGoal > 0 ? 'kpi--yellow' : 'kpi--green'}" data-anim data-tilt="6">
              <div class="kpi-top"><span class="kpi-icon">${icon('PiggyBank')}</span><span class="kpi-label">Quanto preciso economizar</span></div>
              <div class="kpi-value" data-count="${ins.needToCut > 0 ? ins.needToCut : ins.gapToGoal}" data-key="ins-save">${money(ins.needToCut > 0 ? ins.needToCut : ins.gapToGoal)}</div>
              <div class="kpi-sub">${ins.needToCut > 0 ? 'para não fechar o mês no vermelho' : ins.gapToGoal > 0 ? `para atingir a meta de poupar ${s.savingsGoal}% (${money(ins.savingsTarget)})` : m.income > 0 ? `Meta de ${s.savingsGoal}% atingida 🎯` : 'Cadastre entradas para calcular'}</div>
            </article>
            <article class="card kpi ${ins.after && ins.after.value < 0 ? 'kpi--red' : 'kpi--blue'}" data-anim data-tilt="6">
              <div class="kpi-top"><span class="kpi-icon">${icon('Wallet')}</span><span class="kpi-label">${ins.after ? 'Saldo previsto no fim do mês' : 'Resultado do mês'}</span></div>
              <div class="kpi-value" data-count="${ins.after ? ins.after.value : m.result}" data-key="ins-after">${money(ins.after ? ins.after.value : m.result)}</div>
              <div class="kpi-sub">${ins.after ? `Saldo atual + ${money(ins.after.toReceive)} − ${money(ins.after.toPay)}` : 'Mês encerrado'}</div>
            </article>
          </div>
        </div>
      </div>

      <article class="card" data-anim>
        <div class="card-head"><div><h3>Alertas inteligentes</h3><p>${ins.alerts.length ? `${ins.alerts.length} ${ins.alerts.length === 1 ? 'ponto de atenção' : 'pontos de atenção'}` : 'Tudo sob controle'}</p></div></div>
        ${ins.alerts.length ? `<ul class="alert-list alert-list--grid">${ins.alerts.map(alertRow).join('')}</ul>` : `<div class="empty empty--sm">${icon('ShieldCheck')}<p>Nenhum alerta para ${ymLabel(ym)}.</p></div>`}
      </article>

      <div class="grid grid--two">
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Maiores despesas</h3><p>${ymLabel(ym)}</p></div></div>
          ${ins.top.length ? `<ol class="top-list">${ins.top.map((o, k) => `<li data-row><span class="top-rank">${k + 1}</span>${obIcon(o)}<div><b>${esc(o.name)}</b><div class="cat-track"><i data-bar style="width:${(o.amount / topMax * 100).toFixed(1)}%"></i></div></div><span class="top-val"><b>${money(o.amount)}</b><small>${pct(m.total ? o.amount / m.total : 0)} das saídas</small></span></li>`).join('')}</ol>` : `<div class="empty empty--sm">${icon('Receipt')}<p>Sem despesas no mês.</p></div>`}
        </article>
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Contas próximas do vencimento</h3><p>Atrasadas e próximos ${s.alertDays} dias</p></div></div>
          ${ins.late.length + ins.upcoming.length ? `<ul class="ob-list">${[...ins.late, ...ins.upcoming.filter((o) => o.status !== 'late')].slice(0, 8).map((o) => obRow(o)).join('')}</ul>` : `<div class="empty empty--sm">${icon('CalendarCheck')}<p>Nada vencendo nos próximos ${s.alertDays} dias.</p></div>`}
        </article>
      </div>

      <article class="card chart-card" data-anim>
        <div class="card-head"><div><h3>Projeção financeira · próximos 6 meses</h3><p>Saldo atual + entradas previstas − obrigações registradas${anyEst ? ' (com estimativas)' : ''}</p></div></div>
        ${anyEst ? `<p class="chart-note">${icon('Info')}Meses sem lançamentos usam a média dos últimos 3 meses (entradas ${money(ins.proj.avgIncome)} · contas da casa ${money(ins.proj.avgBills)}). Pontos marcados com * são estimados.</p>` : ''}
        <div class="chart-box"><canvas id="chProj" role="img" aria-label="Projeção do saldo para os próximos 6 meses"></canvas></div>
        <div class="table-scroll" data-lenis-prevent>
          <table class="data-table"><thead><tr><th>Mês</th><th class="num">Entradas previstas</th><th class="num">Obrigações</th><th class="num">Resultado</th><th class="num">Saldo previsto</th></tr></thead>
          <tbody>${proj.map((r) => `<tr><td>${ymLabel(r.ym)}${r.estIncome || r.estBills ? ' *' : ''}</td><td class="num tone-pos">${money(r.income)}${r.estIncome ? '*' : ''}</td><td class="num tone-neg">${money(r.out)}${r.estBills ? '*' : ''}</td><td class="num ${r.result >= 0 ? 'tone-pos' : 'tone-neg'}">${money(r.result, { sign: true })}</td><td class="num ${r.balance < 0 ? 'tone-neg' : ''}"><b>${money(r.balance)}</b></td></tr>`).join('')}</tbody></table>
        </div>
      </article>

      ${tips.length ? `<article class="card" data-anim>
        <div class="card-head"><div><h3>Recomendações</h3><p>Geradas a partir dos seus dados</p></div></div>
        <ul class="tip-list">${tips.map((x) => `<li data-row><span class="tip-icon">${icon(x.icon)}</span><p>${esc(x.text)}</p></li>`).join('')}</ul>
      </article>` : ''}
    </div>`;
  };
  const mountInsights = () => {
    const rows = Fin.projection(6).rows;
    Charts.make('chProj', Charts.line(rows.map((r) => ({ ...r, ym: r.ym })), { label: 'Saldo previsto', color: SERIES.balance, key: 'balance', dashFrom: -1 }));
  };

  /* ===========================================================================
     VIEW: AJUSTES
     ======================================================================== */
  const viewSettings = () => {
    const s = S();
    const st = s.settings;
    let bytes = 0;
    try { bytes = new Blob([localStorage.getItem(STORE_KEY) || '']).size; } catch { bytes = 0; }
    const counts = [
      ['Contas', s.bills.length], ['Entradas', s.incomes.length], ['Empréstimos', s.loans.length],
      ['Cartões', s.cards.length], ['Compras', s.purchases.length], ['Pagamentos de fatura', s.invoicePayments.length],
    ];
    return `
    <div class="page">
      <div class="grid grid--two">
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Perfil e saldo</h3><p>Usado nos cálculos do saldo disponível</p></div></div>
          <form class="form" data-settings="profile" novalidate>
            <div class="form-grid">
              ${fieldHTML({ name: 'name', label: 'Como podemos te chamar?', placeholder: 'Seu nome (opcional)', width: 'full', max: 40 }, st.name)}
              ${fieldHTML({ name: 'openingBalance', type: 'money', label: 'Saldo inicial', hint: 'Valor em conta antes dos lançamentos registrados no app.', width: 'half' }, st.openingBalance)}
              <div class="field field--half"><span class="field-label">Saldo disponível hoje</span><div class="setting-balance"><b>${money(Fin.balanceNow())}</b><button class="btn btn-sm btn-soft" type="button" data-action="adjust-balance">${icon('SlidersHorizontal')}<span>Ajustar</span></button></div></div>
            </div>
            <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('Check')}<span>Salvar perfil</span></button></div>
          </form>
        </article>
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Preferências</h3><p>Aplicadas automaticamente</p></div></div>
          <form class="form" data-settings="prefs" novalidate>
            <div class="form-grid">
              ${fieldHTML({ name: 'savingsGoal', type: 'number', label: 'Meta de economia', suffix: '% da renda', min: 0, max: 90, integer: true, width: 'half' }, st.savingsGoal)}
              ${fieldHTML({ name: 'alertDays', type: 'number', label: 'Alertar vencimentos com', suffix: 'dias', min: 1, max: 30, integer: true, width: 'half' }, st.alertDays)}
              ${fieldHTML({ name: 'motion', type: 'select', label: 'Animações', width: 'half', options: [{ value: 'auto', label: 'Automático (segue o sistema)' }, { value: 'full', label: 'Completas' }, { value: 'reduced', label: 'Reduzidas' }] }, st.motion)}
              ${fieldHTML({ name: 'hideValues', type: 'segmented', label: 'Valores financeiros', width: 'half', options: [{ value: 'show', label: 'Exibir', icon: 'Eye' }, { value: 'hide', label: 'Ocultar', icon: 'EyeOff' }] }, st.hideValues ? 'hide' : 'show')}
            </div>
          </form>
        </article>
      </div>
      <div class="grid grid--two">
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Backup e exportação</h3><p>Seus dados nunca saem deste dispositivo sem a sua ação</p></div></div>
          <div class="action-grid">
            <button class="action-tile" type="button" data-action="backup">${icon('FileJson')}<b>Fazer backup (JSON)</b><small>Baixa um arquivo com todos os dados</small></button>
            <button class="action-tile" type="button" data-action="restore">${icon('Upload')}<b>Restaurar backup</b><small>Substitui os dados atuais por um backup</small></button>
            <button class="action-tile" type="button" data-action="export-transactions-all">${icon('FileSpreadsheet')}<b>Exportar tudo (CSV)</b><small>Todos os lançamentos para planilhas</small></button>
            <button class="action-tile" type="button" data-action="export-report">${icon('ChartColumn')}<b>Relatório mensal (CSV)</b><small>Histórico dos últimos 6 meses</small></button>
          </div>
          ${(() => { try { return localStorage.getItem(SNAPSHOT_KEY) ? `<button class="btn btn-sm btn-ghost undo-restore" type="button" data-action="undo-restore">${icon('History')}<span>Voltar aos dados anteriores à última restauração</span></button>` : ''; } catch { return ''; } })()}
        </article>
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Armazenamento</h3><p>LocalStorage do navegador · ${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB</p></div></div>
          <dl class="storage-list">${counts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          <div class="demo-box">
            <div><b>Dados de exemplo</b><small>${Store.hasDemo ? 'Exemplos ativos — remova quando quiser.' : 'Carregue exemplos para conhecer o sistema. Eles ficam marcados e podem ser removidos.'}</small></div>
            ${Store.hasDemo ? `<button class="btn btn-sm btn-ghost" type="button" data-action="remove-demo">${icon('Trash2')}<span>Remover exemplos</span></button>` : `<button class="btn btn-sm btn-soft" type="button" data-action="load-demo">${icon('Sparkles')}<span>Carregar exemplos</span></button>`}
          </div>
        </article>
      </div>
      <div class="grid grid--two">
        <article class="card" data-anim>
          <div class="card-head"><div><h3>Atalhos e privacidade</h3><p>Finance 3D · versão 1.0</p></div></div>
          <ul class="shortcut-list">
            <li><kbd>Ctrl</kbd> + <kbd>K</kbd><span>Pesquisar</span></li>
            <li><kbd>N</kbd><span>Novo registro</span></li>
            <li><kbd>←</kbd> <kbd>→</kbd><span>Mês anterior / próximo (com Alt)</span></li>
            <li><kbd>Esc</kbd><span>Fechar janelas</span></li>
          </ul>
          <p class="muted-text">Tudo fica salvo no LocalStorage deste navegador. Limpar os dados do navegador apaga as informações — faça backups periódicos.</p>
        </article>
        <article class="card card--danger" data-anim>
          <div class="card-head"><div><h3>Zona de perigo</h3><p>Ações irreversíveis</p></div></div>
          <p class="muted-text">Apaga todas as contas, entradas, empréstimos, cartões e configurações deste navegador. Recomendamos fazer um backup antes.</p>
          <button class="btn btn-danger" type="button" data-action="wipe">${icon('Trash2')}<span>Apagar todos os dados</span></button>
        </article>
      </div>
    </div>`;
  };
  const mountSettings = (view) => {
    const profile = $('form[data-settings="profile"]', view);
    profile.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = [{ name: 'name' }, { name: 'openingBalance', type: 'money' }];
      const { values, errors } = readForm(profile, fields);
      if (!showErrors(profile, errors)) return;
      Store.commit((s) => { s.settings.name = str(values.name, 40); s.settings.openingBalance = values.openingBalance ?? 0; s.settings.onboarded = true; });
      toast('Perfil salvo.');
    });
    const prefs = $('form[data-settings="prefs"]', view);
    prefs.addEventListener('change', () => {
      const fields = [{ name: 'savingsGoal', type: 'number', min: 0, max: 90, integer: true }, { name: 'alertDays', type: 'number', min: 1, max: 30, integer: true }, { name: 'motion', type: 'select' }, { name: 'hideValues', type: 'segmented' }];
      const { values, errors } = readForm(prefs, fields);
      if (!showErrors(prefs, errors)) return;
      const motionChanged = values.motion !== S().settings.motion;
      Store.commit((s) => {
        if (values.savingsGoal != null) s.settings.savingsGoal = values.savingsGoal;
        if (values.alertDays != null) s.settings.alertDays = values.alertDays;
        s.settings.motion = values.motion;
        s.settings.hideValues = values.hideValues === 'hide';
      }, { refresh: false });
      HIDE = S().settings.hideValues;
      if (motionChanged) { Motion.apply(); Charts.setup(); }
      App.syncChrome();
      App.refresh();
      toast('Preferências salvas.', { duration: 2200 });
    });
  };

  /* ===========================================================================
     10. FORMULÁRIOS DE CADASTRO
     ======================================================================== */
  const defaultDate = (ym = App.ym) => (ym === ymNow() ? today() : dateIn(ym, Number(today().slice(8, 10))));
  const catOptions = BILL_CATS.map((c) => ({ value: c.id, label: c.label }));
  const datalist = (id, values) => `<datalist id="${id}">${[...new Set(values)].slice(0, 60).map((v) => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  const jumpAction = (ym) => (ym !== App.ym ? { label: `Ver ${ymShort(ym)}`, fn: () => App.setMonth(ym) } : null);

  /* ---- Conta da casa ---- */
  const billForm = (bill = null, preset = {}) => {
    const isEdit = !!bill;
    const future = isEdit && bill.seriesId ? S().bills.filter((b) => b.seriesId === bill.seriesId && b.id !== bill.id && b.dueDate > bill.dueDate) : [];
    const v = isEdit
      ? { ...bill, status: bill.paid ? 'paid' : 'pending', paidDate: bill.paidDate || today(), apply: 'one' }
      : { name: '', category: preset.category || 'aluguel', amount: null, dueDate: preset.date || defaultDate(), method: 'pix', status: 'pending', paidDate: today(), repeat: 0, notes: '' };
    const fields = [
      { name: 'name', label: 'Nome da conta', placeholder: 'Ex.: Aluguel do apartamento', width: 'half', max: 80, list: 'dlBillNames' },
      { name: 'category', type: 'select', label: 'Categoria', options: catOptions, width: 'half' },
      { name: 'amount', type: 'money', label: 'Valor', required: true, width: 'third' },
      { name: 'dueDate', type: 'date', label: 'Data de vencimento', required: true, width: 'third' },
      { name: 'method', type: 'select', label: 'Forma de pagamento', options: [{ value: '', label: 'Não informada' }, ...METHODS.map((m) => ({ value: m.id, label: m.label }))], width: 'third' },
      { name: 'status', type: 'segmented', label: 'Status', width: 'half', options: [{ value: 'pending', label: 'Pendente', icon: 'Clock' }, { value: 'paid', label: 'Pago', icon: 'CircleCheck' }], hint: '“Atrasado” é aplicado automaticamente quando o vencimento passa.' },
      { name: 'paidDate', type: 'date', label: 'Data do pagamento', width: 'half', showIf: (x) => x.status === 'paid' },
      !isEdit && { name: 'repeat', type: 'number', label: 'Repetir nos próximos meses', min: 0, max: 24, integer: true, suffix: 'meses', width: 'half', hint: 'Cria cópias pendentes nos meses seguintes (ex.: aluguel, internet).' },
      future.length && { name: 'apply', type: 'segmented', label: 'Aplicar alterações', width: 'half', options: [{ value: 'one', label: 'Só nesta' }, { value: 'next', label: `Nesta e nas próximas ${future.length}` }], hint: 'Nome, categoria, valor, forma de pagamento e observações.' },
      { name: 'notes', type: 'textarea', label: 'Observações', placeholder: 'Opcional — ex.: código de barras, referência', width: 'full' },
    ].filter(Boolean);
    openForm({
      title: isEdit ? 'Editar conta' : 'Nova conta da casa',
      subtitle: isEdit ? esc(bill.name) : 'Despesas domésticas com vencimento e status',
      iconName: 'House',
      fields,
      values: v,
      extraBottom: datalist('dlBillNames', S().bills.map((b) => b.name)),
      onChange: (cur, form) => {
        const input = form.elements.name;
        if (input) input.placeholder = `Ex.: ${billCat(cur.category).label}`;
      },
      deleteAction: isEdit ? async () => { removeBill(bill.id); return true; } : null,
      onSubmit: (x) => {
        const rec = {
          name: x.name || billCat(x.category).label, category: x.category, amount: x.amount, dueDate: x.dueDate,
          method: x.method, paid: x.status === 'paid', paidDate: x.status === 'paid' ? (x.paidDate || today()) : '', notes: x.notes,
        };
        if (isEdit) {
          Store.commit((s) => {
            const b = s.bills.find((y) => y.id === bill.id);
            if (!b) return;
            Object.assign(b, normBill({ ...b, ...rec }));
            if (x.apply === 'next') {
              s.bills.filter((y) => y.seriesId === bill.seriesId && y.dueDate > bill.dueDate).forEach((y) => {
                Object.assign(y, { name: rec.name, category: rec.category, amount: rec.amount, method: rec.method, notes: rec.notes });
              });
            }
          });
          toast(x.apply === 'next' ? 'Conta e próximas da série atualizadas.' : 'Conta atualizada.', { action: jumpAction(ymOf(rec.dueDate)) });
        } else {
          const n = x.repeat || 0;
          const seriesId = n > 0 ? uid() : '';
          Store.commit((s) => {
            for (let k = 0; k <= n; k++) {
              s.bills.push(normBill({ ...rec, id: uid(), dueDate: addMonthsISO(rec.dueDate, k), paid: k === 0 && rec.paid, paidDate: k === 0 ? rec.paidDate : '', seriesId }));
            }
            s.settings.onboarded = true;
          });
          toast(n ? `Conta criada para ${n + 1} meses.` : 'Conta cadastrada.', { action: jumpAction(ymOf(rec.dueDate)) });
        }
        return true;
      },
    });
  };

  /* ---- Entrada ---- */
  const incomeForm = (inc = null) => {
    const isEdit = !!inc;
    const d = defaultDate();
    const v = isEdit
      ? { ...inc, status: inc.received ? 'received' : 'expected' }
      : { description: '', category: 'salario', amount: null, date: d, status: d <= today() ? 'received' : 'expected', repeat: 0, notes: '' };
    const fields = [
      { name: 'description', label: 'Descrição', placeholder: 'Ex.: Salário empresa X', width: 'half', max: 80, list: 'dlIncomeNames' },
      { name: 'category', type: 'select', label: 'Categoria', options: INCOME_CATS.map((c) => ({ value: c.id, label: c.label })), width: 'half' },
      { name: 'amount', type: 'money', label: 'Valor', required: true, width: 'half' },
      { name: 'date', type: 'date', label: 'Data', required: true, width: 'half' },
      { name: 'status', type: 'segmented', label: 'Situação', width: 'half', options: [{ value: 'received', label: 'Recebido', icon: 'CircleCheck' }, { value: 'expected', label: 'Previsto', icon: 'Hourglass' }] },
      !isEdit && { name: 'repeat', type: 'number', label: 'Repetir nos próximos meses', min: 0, max: 24, integer: true, suffix: 'meses', width: 'half', hint: 'Ideal para salário fixo — as próximas entram como previstas.' },
      { name: 'notes', type: 'textarea', label: 'Observações', placeholder: 'Opcional', width: 'full' },
    ].filter(Boolean);
    openForm({
      title: isEdit ? 'Editar entrada' : 'Nova entrada',
      subtitle: 'Dinheiro recebido ou previsto',
      iconName: 'BanknoteArrowUp',
      fields,
      values: v,
      extraBottom: datalist('dlIncomeNames', S().incomes.map((i) => i.description)),
      deleteAction: isEdit ? async () => { removeIncome(inc.id); return true; } : null,
      onSubmit: (x) => {
        const rec = { description: x.description || incomeCat(x.category).label, category: x.category, amount: x.amount, date: x.date, received: x.status === 'received', notes: x.notes };
        if (isEdit) {
          Store.commit((s) => { const i = s.incomes.find((y) => y.id === inc.id); if (i) Object.assign(i, normIncome({ ...i, ...rec })); });
          toast('Entrada atualizada.', { action: jumpAction(ymOf(rec.date)) });
        } else {
          const n = x.repeat || 0;
          const seriesId = n > 0 ? uid() : '';
          Store.commit((s) => {
            for (let k = 0; k <= n; k++) s.incomes.push(normIncome({ ...rec, id: uid(), date: addMonthsISO(rec.date, k), received: k === 0 ? rec.received : false, seriesId }));
            s.settings.onboarded = true;
          });
          toast(n ? `Entrada registrada para ${n + 1} meses.` : 'Entrada registrada.', { action: jumpAction(ymOf(rec.date)) });
        }
        return true;
      },
    });
  };

  /* ---- Empréstimo ---- */
  const previewLoanInfo = (l) => {
    const t = today();
    const info = Fin.loanInfo({ ...l, id: '__preview' }, t);
    Fin._cache.delete(`loan:__preview:${t}`);
    return info;
  };
  const loanForm = (loan = null) => {
    const isEdit = !!loan;
    const v = isEdit
      ? {
        ...loan,
        nextDue: loan.paidInstallments < loan.totalInstallments ? Fin.loanDue(loan, loan.paidInstallments + 1) : Fin.loanDue(loan, loan.totalInstallments),
        balanceOverride: loan.balanceOverride != null && loan.balanceOverridePaid === loan.paidInstallments ? loan.balanceOverride : null,
      }
      : { creditor: '', type: 'pessoal', originalAmount: null, interestRate: null, totalInstallments: 12, installmentValue: null, paidInstallments: 0, nextDue: defaultDate(), balanceOverride: null, notes: '' };
    const fields = [
      { name: 'creditor', label: 'Banco ou credor', required: true, placeholder: 'Ex.: Banco, financeira, loja', width: 'half', max: 80 },
      { name: 'type', type: 'select', label: 'Tipo', options: LOAN_TYPES.map((x) => ({ value: x.id, label: x.label })), width: 'half' },
      { name: 'originalAmount', type: 'money', label: 'Valor original do empréstimo', required: true, width: 'half' },
      { name: 'interestRate', type: 'number', label: 'Taxa de juros (opcional)', step: 0.01, min: 0, max: 100, suffix: '% a.m.', width: 'half', placeholder: '0,00' },
      { name: 'totalInstallments', type: 'number', label: 'Total de parcelas', required: true, min: 1, max: 600, integer: true, width: 'third' },
      { name: 'installmentValue', type: 'money', label: 'Valor de cada parcela', width: 'third', hint: 'Vazio + taxa informada = cálculo automático (Price).' },
      { name: 'paidInstallments', type: 'number', label: 'Parcelas já pagas', min: 0, max: 600, integer: true, width: 'third' },
      { name: 'nextDue', type: 'date', label: 'Vencimento da próxima parcela', required: true, width: 'half', hint: 'Se já quitado, informe o vencimento da última.' },
      { name: 'balanceOverride', type: 'money', label: 'Saldo devedor informado (opcional)', width: 'half', hint: 'Valor de quitação informado pelo credor. Se vazio, é calculado.' },
      { name: 'notes', type: 'textarea', label: 'Observações', placeholder: 'Opcional — número do contrato, garantias…', width: 'full' },
    ];
    const build = (x) => {
      const total = clamp(Math.round(x.totalInstallments || 1), 1, 600);
      const paid = clamp(Math.round(x.paidInstallments || 0), 0, total);
      const pmt = x.installmentValue > 0 ? x.installmentValue : (x.interestRate != null && x.originalAmount > 0 ? calcPMT(x.originalAmount, x.interestRate, total) : 0);
      const ref = x.nextDue || today();
      const firstDueDate = paid < total ? addMonthsISO(ref, -paid) : addMonthsISO(ref, -(total - 1));
      return {
        creditor: x.creditor, type: x.type, originalAmount: x.originalAmount || 0, totalInstallments: total, installmentValue: pmt,
        paidInstallments: paid, firstDueDate, interestRate: x.interestRate, balanceOverride: x.balanceOverride, balanceOverridePaid: paid, notes: x.notes,
      };
    };
    openForm({
      title: isEdit ? 'Editar empréstimo' : 'Novo empréstimo ou dívida',
      subtitle: 'Cálculo automático de quitação, juros e término',
      iconName: 'Landmark',
      fields,
      values: v,
      extraBottom: '<div class="form-preview" data-preview aria-live="polite"></div>',
      onChange: (x, form) => {
        const box = $('[data-preview]', form);
        if (!box) return;
        const l = build(x);
        if (!(l.originalAmount > 0) || !(l.installmentValue > 0)) {
          box.innerHTML = `<p class="muted-text">${icon('Calculator')}Informe o valor original e a parcela (ou a taxa de juros) para ver os cálculos.</p>`;
          return;
        }
        const i = previewLoanInfo({ ...l, payments: [], balanceOverride: l.balanceOverride ?? null, interestRate: l.interestRate ?? null });
        box.innerHTML = `
          <div class="preview-head">${icon('Calculator')}<b>Cálculo automático</b>${!(x.installmentValue > 0) ? '<span class="badge badge--info">parcela calculada</span>' : ''}</div>
          <dl class="metrics metrics--compact">
            <div><dt>Parcela</dt><dd>${money(i.pmt)}</dd></div>
            <div><dt>Já pago</dt><dd>${money(i.paidAmount)}</dd></div>
            <div><dt>Falta pagar</dt><dd>${money(i.remainingAmount)}</dd></div>
            <div><dt>Quitado</dt><dd>${pct(i.pct, 1)}</dd></div>
            <div><dt>Total comprometido</dt><dd>${money(i.committed)}</dd></div>
            <div><dt>Juros no contrato</dt><dd>${i.interestTotal > 0 ? money(i.interestTotal) : '—'}</dd></div>
            <div><dt>Taxa</dt><dd>${i.rate == null ? '—' : rateText(i)}</dd></div>
            <div><dt>Término previsto</dt><dd>${fmtDate(i.endDate)}</dd></div>
          </dl>
          ${p3d(i.pct, 'violet', 'p3d--thin')}`;
      },
      deleteAction: isEdit ? async () => removeLoan(loan.id) : null,
      onSubmit: (x) => {
        const errors = {};
        if ((x.paidInstallments || 0) > x.totalInstallments) errors.paidInstallments = 'Não pode ser maior que o total de parcelas';
        if (!(x.installmentValue > 0) && x.interestRate == null) errors.installmentValue = 'Informe a parcela ou a taxa de juros';
        if (Object.keys(errors).length) return errors;
        const rec = build(x);
        if (isEdit) {
          Store.commit((s) => {
            const l = s.loans.find((y) => y.id === loan.id);
            if (l) Object.assign(l, normLoan({ ...l, ...rec, payments: l.payments.filter((p) => p.n <= rec.paidInstallments) }));
          });
          toast('Empréstimo atualizado.');
        } else {
          Store.commit((s) => { s.loans.push(normLoan({ ...rec, id: uid(), payments: [] })); s.settings.onboarded = true; });
          toast('Empréstimo cadastrado.');
        }
        return true;
      },
    });
  };

  /* ---- Cartão ---- */
  const cardStartYm = (card, t = today()) => {
    const openYm = Fin.invoiceYmFor(card, t);
    const prev = ymAdd(openYm, -1);
    return Fin.invoiceDueDate(card, prev) >= t ? prev : openYm;
  };
  const cardForm = (card = null) => {
    const isEdit = !!card;
    const v = isEdit ? { ...card } : { name: '', brand: 'visa', limit: null, closingDay: 3, dueDay: 10, color: 'ametista' };
    const fields = [
      { name: 'name', label: 'Nome do cartão', required: true, placeholder: 'Ex.: Cartão do banco', width: 'half', max: 40 },
      { name: 'brand', type: 'select', label: 'Bandeira', options: CARD_BRANDS.map((b) => ({ value: b.id, label: b.label })), width: 'half' },
      { name: 'limit', type: 'money', label: 'Limite total', required: true, width: 'third' },
      { name: 'closingDay', type: 'number', label: 'Dia de fechamento', required: true, min: 1, max: 31, integer: true, width: 'third' },
      { name: 'dueDay', type: 'number', label: 'Dia de vencimento', required: true, min: 1, max: 31, integer: true, width: 'third' },
      { name: 'color', type: 'swatches', label: 'Cor do cartão', width: 'full' },
    ];
    openForm({
      title: isEdit ? 'Editar cartão' : 'Novo cartão de crédito',
      subtitle: 'Limite, fechamento e vencimento da fatura',
      iconName: 'CreditCard',
      fields,
      values: v,
      extraTop: '<div class="card-preview" data-card-preview aria-hidden="true"></div>',
      onChange: (x, form) => {
        const box = $('[data-card-preview]', form);
        if (!box) return;
        const fake = normCard({ ...x, id: 'preview', name: x.name || 'Seu cartão', closingDay: x.closingDay || 1, dueDay: x.dueDay || 10 });
        const info = isEdit ? Fin.cardInfo(card) : { available: x.limit || 0, open: { amount: 0 }, usage: 0 };
        box.innerHTML = cardVisual(fake, { ...info, available: round2((x.limit || 0) - (isEdit ? info.outstanding : 0)), usage: x.limit > 0 && isEdit ? info.outstanding / x.limit : 0 }, true).replace('data-action="select-card"', 'tabindex="-1"');
      },
      deleteAction: isEdit ? async () => removeCard(card.id) : null,
      onSubmit: (x) => {
        if (x.closingDay === x.dueDay) return { dueDay: 'O vencimento deve ser diferente do fechamento' };
        const rec = { name: x.name, brand: x.brand, limit: x.limit, closingDay: x.closingDay, dueDay: x.dueDay, color: x.color || 'grafite' };
        if (isEdit) {
          Store.commit((s) => { const c = s.cards.find((y) => y.id === card.id); if (c) Object.assign(c, normCard({ ...c, ...rec })); });
          toast('Cartão atualizado.');
        } else {
          const c = normCard({ ...rec, id: uid() });
          c.startYm = cardStartYm(c);
          App.f.cards.sel = c.id;
          Store.commit((s) => { s.cards.push(c); s.settings.onboarded = true; });
          toast('Cartão cadastrado. Agora registre as compras.', { action: { label: 'Nova compra', fn: () => purchaseForm(null, c.id) } });
        }
        return true;
      },
    });
  };

  /* ---- Compra no cartão ---- */
  const purchaseForm = (p = null, cardId = null) => {
    const cards = S().cards;
    if (!cards.length) {
      toast('Cadastre um cartão antes de registrar compras.', { type: 'info', action: { label: 'Novo cartão', fn: () => cardForm() } });
      return;
    }
    const isEdit = !!p;
    const v = isEdit ? { ...p } : { cardId: cardId || App.f.cards.sel || cards[0].id, description: '', amount: null, installments: 1, date: today(), category: 'outros', notes: '' };
    const fields = [
      { name: 'cardId', type: 'select', label: 'Cartão', options: cards.map((c) => ({ value: c.id, label: c.name })), width: 'half' },
      { name: 'description', label: 'Descrição', required: true, placeholder: 'Ex.: Geladeira nova', width: 'half', max: 80 },
      { name: 'amount', type: 'money', label: 'Valor total da compra', required: true, width: 'third' },
      { name: 'installments', type: 'number', label: 'Parcelas', required: true, min: 1, max: 72, integer: true, suffix: 'x', width: 'third' },
      { name: 'date', type: 'date', label: 'Data da compra', required: true, width: 'third' },
      { name: 'category', type: 'select', label: 'Categoria', options: catOptions, width: 'half' },
      { name: 'notes', type: 'textarea', label: 'Observações', placeholder: 'Opcional', width: 'half' },
    ];
    openForm({
      title: isEdit ? 'Editar compra' : 'Nova compra no cartão',
      subtitle: 'À vista ou parcelada — as parcelas entram nas faturas futuras',
      iconName: 'ShoppingBag',
      fields,
      values: v,
      extraBottom: '<div class="form-preview" data-preview aria-live="polite"></div>',
      onChange: (x, form) => {
        const box = $('[data-preview]', form);
        const card = cards.find((c) => c.id === x.cardId);
        if (!box || !card) return;
        if (!(x.amount > 0) || !x.date || !(x.installments >= 1)) { box.innerHTML = `<p class="muted-text">${icon('Calculator')}Informe valor, parcelas e data para ver em quais faturas a compra entra.</p>`; return; }
        const n = clamp(Math.round(x.installments), 1, 72);
        const parts = Fin.purchaseParts({ amount: x.amount, installments: n, date: x.date }, card);
        const info = Fin.cardInfo(card);
        const avail = round2(info.available + (isEdit && p.cardId === card.id ? sum(Fin.purchaseParts(p, card).filter((pt) => !['paid', 'settled'].includes(Fin.invoice(card, pt.ym).status)), (pt) => pt.amount) : 0));
        const newDebt = sum(parts.filter((pt) => !['paid', 'settled'].includes(Fin.invoice(card, pt.ym).status)), (pt) => pt.amount);
        box.innerHTML = `
          <div class="preview-head">${icon('Receipt')}<b>${n > 1 ? `${n}x de ${money(parts[n - 1].amount)}${parts[0].amount !== parts[n - 1].amount ? ` (1ª de ${money(parts[0].amount)})` : ''}` : 'Pagamento à vista'}</b></div>
          <p class="muted-text">1ª parcela na fatura de <b>${ymLabel(parts[0].ym)}</b> (vence ${fmtDate(Fin.invoiceDueDate(card, parts[0].ym))})${n > 1 ? ` · última em ${ymLabel(parts[n - 1].ym)}` : ''}.</p>
          ${newDebt > avail ? `<p class="form-warn">${icon('TriangleAlert')}Esta compra ultrapassa o limite disponível (${money(avail)}).</p>` : `<p class="muted-text">Limite disponível após a compra: <b>${money(avail - newDebt)}</b></p>`}`;
      },
      deleteAction: isEdit ? async () => { removePurchase(p.id); return true; } : null,
      onSubmit: (x) => {
        const rec = { cardId: x.cardId, description: x.description, amount: x.amount, installments: x.installments, date: x.date, category: x.category, notes: x.notes };
        App.f.cards.sel = x.cardId;
        if (isEdit) {
          Store.commit((s) => { const y = s.purchases.find((z) => z.id === p.id); if (y) Object.assign(y, normPurchase({ ...y, ...rec })); });
          toast('Compra atualizada.');
        } else {
          Store.commit((s) => { s.purchases.push(normPurchase({ ...rec, id: uid() })); });
          toast(x.installments > 1 ? `Compra parcelada em ${x.installments}x registrada.` : 'Compra registrada.');
        }
        return true;
      },
    });
  };

  /* ---- Saldo ---- */
  const adjustBalance = (onboarding = false) => {
    const fields = [
      onboarding && { name: 'name', label: 'Como podemos te chamar? (opcional)', placeholder: 'Seu nome', width: 'full', max: 40 },
      { name: 'balance', type: 'money', label: onboarding ? 'Quanto você tem disponível hoje?' : 'Saldo real disponível hoje', width: 'full', hint: 'Some conta corrente, carteira e o que estiver livre para uso. Pode ser negativo: digite “-” antes do valor.' },
    ].filter(Boolean);
    const cur = Fin.balanceNow();
    openForm({
      title: onboarding ? 'Vamos começar' : 'Ajustar saldo disponível',
      subtitle: onboarding ? 'Informe seu saldo atual — você pode alterar depois em Ajustes' : `Saldo calculado hoje: ${money(cur, { force: true })}`,
      iconName: onboarding ? 'Rocket' : 'SlidersHorizontal',
      fields,
      values: { balance: onboarding ? null : cur, name: S().settings.name },
      submitLabel: onboarding ? 'Começar' : 'Ajustar saldo',
      onSubmit: (x) => {
        const target = x.balance == null ? 0 : x.balance;
        const movements = sum(Fin.movements(), (m) => m.amount);
        Store.commit((s) => {
          s.settings.openingBalance = round2(target - movements);
          if (onboarding) { s.settings.name = str(x.name, 40); s.settings.onboarded = true; }
        });
        toast(onboarding ? 'Tudo pronto! Agora cadastre suas contas da casa.' : `Saldo ajustado para ${money(target, { force: true })}.`, onboarding ? { action: { label: 'Nova conta', fn: () => billForm() } } : {});
        return true;
      },
    });
    // permite valores negativos neste campo
    setTimeout(() => {
      const inp = $('.modal [name="balance"]');
      if (inp) {
        inp.addEventListener('input', () => { const neg = inp.value.trim().startsWith('-'); const c = inp.value.replace(/[^\d.,]/g, ''); inp.value = (neg ? '-' : '') + c; }, true);
        inp.addEventListener('blur', () => { const v = parseMoney(inp.value); if (isFinite(v)) inp.value = (v < 0 ? '-' : '') + moneyInput(Math.abs(v)); });
      }
    }, 0);
  };

  /* ===========================================================================
     11. AÇÕES
     ======================================================================== */
  const findBy = (list, id) => S()[list].find((x) => x.id === id);
  const restoreAt = (list, idx, items) => Store.commit((s) => { s[list].splice(Math.min(idx, s[list].length), 0, ...items); });

  const removeBill = (id) => {
    const s = S();
    const idx = s.bills.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const item = s.bills[idx];
    Store.commit((st) => { st.bills.splice(idx, 1); });
    toast(`“${item.name}” excluída.`, { type: 'info', duration: 6500, action: { label: 'Desfazer', fn: () => restoreAt('bills', idx, [item]) } });
  };
  const removeIncome = (id) => {
    const s = S();
    const idx = s.incomes.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const item = s.incomes[idx];
    Store.commit((st) => { st.incomes.splice(idx, 1); });
    toast(`“${item.description}” excluída.`, { type: 'info', duration: 6500, action: { label: 'Desfazer', fn: () => restoreAt('incomes', idx, [item]) } });
  };
  const removePurchase = (id) => {
    const s = S();
    const idx = s.purchases.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const item = s.purchases[idx];
    Store.commit((st) => { st.purchases.splice(idx, 1); });
    toast(`Compra “${item.description}” excluída.`, { type: 'info', duration: 6500, action: { label: 'Desfazer', fn: () => restoreAt('purchases', idx, [item]) } });
  };
  const removeLoan = async (id) => {
    const l = findBy('loans', id);
    if (!l) return false;
    const ok = await confirmDialog({ title: 'Excluir empréstimo?', message: `O empréstimo com <b>${esc(l.creditor)}</b> e o histórico de ${l.payments.length} pagamento(s) registrados serão removidos. Os pagamentos deixam de contar no saldo.`, confirmLabel: 'Excluir', danger: true, iconName: 'Trash2' });
    if (!ok) return false;
    const idx = S().loans.indexOf(l);
    Store.commit((s) => { s.loans.splice(idx, 1); });
    toast('Empréstimo excluído.', { type: 'info', duration: 6500, action: { label: 'Desfazer', fn: () => restoreAt('loans', idx, [l]) } });
    return true;
  };
  const removeCard = async (id) => {
    const c = findBy('cards', id);
    if (!c) return false;
    const purchases = S().purchases.filter((p) => p.cardId === id);
    const pays = S().invoicePayments.filter((p) => p.cardId === id);
    const ok = await confirmDialog({ title: 'Excluir cartão?', message: `O cartão <b>${esc(c.name)}</b>, ${purchases.length} compra(s) e ${pays.length} pagamento(s) de fatura serão removidos.`, confirmLabel: 'Excluir cartão', danger: true, iconName: 'Trash2' });
    if (!ok) return false;
    const idx = S().cards.indexOf(c);
    Store.commit((s) => {
      s.cards.splice(idx, 1);
      s.purchases = s.purchases.filter((p) => p.cardId !== id);
      s.invoicePayments = s.invoicePayments.filter((p) => p.cardId !== id);
    });
    toast('Cartão excluído.', { type: 'info', duration: 6500, action: { label: 'Desfazer', fn: () => Store.commit((s) => { s.cards.splice(Math.min(idx, s.cards.length), 0, c); s.purchases.push(...purchases); s.invoicePayments.push(...pays); }) } });
    return true;
  };

  const setBillPaid = (id, paid) => {
    const b = findBy('bills', id);
    if (!b) return;
    const prev = { paid: b.paid, paidDate: b.paidDate };
    Store.commit(() => { b.paid = paid; b.paidDate = paid ? today() : ''; });
    toast(paid ? `“${b.name}” marcada como paga.` : `“${b.name}” voltou para pendente.`, { action: { label: 'Desfazer', fn: () => Store.commit(() => { Object.assign(b, prev); }) } });
  };
  const toggleIncome = (id) => {
    const i = findBy('incomes', id);
    if (!i) return;
    const prev = i.received;
    Store.commit(() => { i.received = !i.received; });
    toast(i.received ? `Recebimento de ${money(i.amount)} confirmado.` : 'Entrada marcada como prevista.', { action: { label: 'Desfazer', fn: () => Store.commit(() => { i.received = prev; }) } });
  };
  const payLoan = (id) => {
    const l = findBy('loans', id);
    if (!l || l.paidInstallments >= l.totalInstallments) return;
    const n = l.paidInstallments + 1;
    Store.commit(() => {
      l.paidInstallments = n;
      l.payments.push({ id: uid(), date: today(), amount: l.installmentValue, n });
    });
    const done = n === l.totalInstallments;
    toast(done ? `Parabéns! Empréstimo com ${l.creditor} quitado. 🎉` : `Parcela ${n}/${l.totalInstallments} de ${l.creditor} paga.`, { action: { label: 'Desfazer', fn: () => undoLoan(id, true) } });
  };
  const undoLoan = (id, silent = false) => {
    const l = findBy('loans', id);
    if (!l) return;
    const last = l.payments[l.payments.length - 1];
    if (!last || last.n !== l.paidInstallments) return;
    Store.commit(() => { l.payments.pop(); l.paidInstallments -= 1; });
    if (!silent) toast(`Pagamento da parcela ${last.n} desfeito.`, { type: 'info' });
  };
  const payInvoice = (cardId, ym) => {
    const c = findBy('cards', cardId);
    if (!c) return;
    const inv = Fin.invoice(c, ym);
    if (inv.payment || inv.amount <= 0) return;
    const pay = { id: uid(), cardId, ym, amount: inv.amount, date: today() };
    Store.commit((s) => { s.invoicePayments.push(pay); });
    toast(`Fatura de ${ymLabel(ym)} do ${c.name} paga (${money(inv.amount)}).`, { action: { label: 'Desfazer', fn: () => Store.commit((s) => { s.invoicePayments = s.invoicePayments.filter((p) => p.id !== pay.id); }) } });
  };
  const undoInvoice = (cardId, ym) => {
    const pay = S().invoicePayments.find((p) => p.cardId === cardId && p.ym === ym);
    if (!pay) return;
    Store.commit((s) => { s.invoicePayments = s.invoicePayments.filter((p) => p !== pay); });
    toast('Pagamento da fatura desfeito.', { type: 'info', action: { label: 'Refazer', fn: () => Store.commit((s) => { s.invoicePayments.push(pay); }) } });
  };
  const duplicateNext = (list, id) => {
    const x = findBy(list, id);
    if (!x) return;
    const dateKey = list === 'bills' ? 'dueDate' : 'date';
    const copy = list === 'bills'
      ? normBill({ ...x, id: uid(), dueDate: addMonthsISO(x.dueDate, 1), paid: false, paidDate: '' })
      : normIncome({ ...x, id: uid(), date: addMonthsISO(x.date, 1), received: false });
    Store.commit((s) => { s[list].push(copy); });
    toast(`Copiado para ${ymLabel(ymOf(copy[dateKey]))}.`, { action: { label: 'Ver', fn: () => App.setMonth(ymOf(copy[dateKey])) } });
  };

  /* ---- Exportações ---- */
  const csvText = (v) => { const s = String(v ?? ''); return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; };
  const csvCell = (v) => { const s = String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csvNum = (v) => round2(v || 0).toFixed(2).replace('.', ',');
  const download = (filename, content, mime) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const downloadCSV = (filename, headers, rows) => {
    const body = [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    download(filename, `﻿${body}`, 'text/csv;charset=utf-8');
    toast(`Arquivo ${filename} gerado.`, { type: 'success', duration: 3000 });
  };
  const STATUS_TXT = { paid: 'Pago', pending: 'Pendente', late: 'Atrasado' };
  const transactions = (yms) => {
    const rows = [];
    yms.forEach((ym) => {
      Fin.incomes(ym).forEach((i) => rows.push([fmtDate(i.date), 'Entrada', 'Entrada', csvText(i.description), incomeCat(i.category).label, csvNum(i.amount), i.received ? 'Recebido' : 'Previsto']));
      Fin.obligations(ym).forEach((o) => rows.push([fmtDate(o.dueDate), 'Saída', ({ bill: 'Conta da casa', loan: 'Empréstimo', invoice: 'Fatura de cartão' })[o.kind], csvText(o.kind === 'loan' ? `${o.name} — ${o.sub}` : o.name), billCat(o.category).label, csvNum(o.amount), STATUS_TXT[o.status]]));
    });
    return rows;
  };
  const dataRange = () => {
    const s = S();
    const dates = [...s.bills.map((b) => b.dueDate), ...s.incomes.map((i) => i.date), ...s.loans.flatMap((l) => [l.firstDueDate, Fin.loanDue(l, l.totalInstallments)]), ...s.purchases.map((p) => p.date)];
    if (!dates.length) return [ymNow()];
    dates.sort();
    let from = ymOf(dates[0]);
    let to = ymOf(dates[dates.length - 1]);
    if (ymDiff(from, to) > 120) from = ymAdd(to, -120);
    const out = [];
    for (let ym = from; ym <= to; ym = ymAdd(ym, 1)) out.push(ym);
    return out;
  };
  const exporters = {
    bills: () => downloadCSV(`contas_${App.f.bills.scope === 'month' ? App.ym : 'todas'}.csv`, ['Nome', 'Categoria', 'Valor (R$)', 'Vencimento', 'Status', 'Forma de pagamento', 'Data do pagamento', 'Observações'],
      filterBills().map((b) => [csvText(b.name), billCat(b.category).label, csvNum(b.amount), fmtDate(b.dueDate), STATUS_TXT[Fin.billStatus(b)], b.method ? METHOD[b.method].label : '', b.paidDate ? fmtDate(b.paidDate) : '', csvText(b.notes)])),
    incomes: () => downloadCSV(`entradas_${App.f.incomes.scope === 'month' ? App.ym : 'todas'}.csv`, ['Descrição', 'Categoria', 'Valor (R$)', 'Data', 'Situação', 'Observações'],
      filterIncomes().map((i) => [csvText(i.description), incomeCat(i.category).label, csvNum(i.amount), fmtDate(i.date), i.received ? 'Recebido' : 'Previsto', csvText(i.notes)])),
    loans: () => downloadCSV('emprestimos.csv', ['Credor', 'Tipo', 'Valor original', 'Parcelas', 'Valor da parcela', 'Pagas', 'Restantes', 'Já pago', 'Falta pagar', '% quitado', 'Total comprometido', 'Taxa (% a.m.)', 'Saldo devedor', 'Próximo vencimento', 'Término previsto'],
      S().loans.map((l) => { const i = Fin.loanInfo(l); return [csvText(l.creditor), LOAN_TYPE[l.type].label, csvNum(l.originalAmount), i.total, csvNum(i.pmt), i.paid, i.remaining, csvNum(i.paidAmount), csvNum(i.remainingAmount), (i.pct * 100).toFixed(1).replace('.', ','), csvNum(i.committed), i.rate == null ? '' : (i.rate * 100).toFixed(2).replace('.', ','), csvNum(i.balance), i.nextDue ? fmtDate(i.nextDue) : '', fmtDate(i.endDate)]; })),
    report: () => {
      const { from, to } = App.route === 'relatorios' ? reportRange() : { from: ymAdd(App.ym, -5), to: App.ym };
      const rows = Fin.series(from, to);
      downloadCSV(`relatorio_${from}_a_${to}.csv`, ['Mês', 'Entradas', 'Recebido', 'Saídas', 'Resultado', 'Renda comprometida (%)', 'Saldo fim do mês', 'Projeção', 'Dívida restante', 'Contas da casa', 'Cartões', 'Empréstimos'],
        rows.map((r) => [ymLabel(r.ym), csvNum(r.income), csvNum(r.received), csvNum(r.total), csvNum(r.result), r.committed == null ? '' : (r.committed * 100).toFixed(1).replace('.', ','), csvNum(r.balance), r.projected ? 'Sim' : 'Não', csvNum(r.debt), csvNum(r.m.groups.casa), csvNum(r.m.groups.cartoes), csvNum(r.m.groups.emprestimos)]));
    },
    transactions: () => {
      const { from, to } = reportRange();
      const yms = [];
      for (let ym = from; ym <= to; ym = ymAdd(ym, 1)) yms.push(ym);
      downloadCSV(`lancamentos_${from}_a_${to}.csv`, ['Data', 'Tipo', 'Origem', 'Descrição', 'Categoria', 'Valor (R$)', 'Status'], transactions(yms));
    },
    all: () => downloadCSV(`finance3d_lancamentos_${today()}.csv`, ['Data', 'Tipo', 'Origem', 'Descrição', 'Categoria', 'Valor (R$)', 'Status'], transactions(dataRange())),
  };

  /* ---- Backup e restauração ---- */
  const backup = () => {
    const payload = { app: 'finance3d', version: 1, exportedAt: new Date().toISOString(), data: S() };
    download(`finance3d-backup-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup gerado. Guarde o arquivo em local seguro.');
  };
  const restoreFromFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Arquivo muito grande para um backup do Finance 3D.', { type: 'error' }); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      let parsed;
      try { parsed = JSON.parse(String(reader.result)); } catch { toast('Arquivo inválido: não é um JSON válido.', { type: 'error' }); return; }
      const src = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      const looksValid = src && typeof src === 'object' && ['bills', 'incomes', 'loans', 'cards'].some((k) => Array.isArray(src[k]));
      if (!looksValid) { toast('Este arquivo não parece ser um backup do Finance 3D.', { type: 'error' }); return; }
      const next = normalize(parsed);
      const ok = await confirmDialog({
        title: 'Restaurar backup?',
        message: `O backup contém <b>${next.bills.length}</b> contas, <b>${next.incomes.length}</b> entradas, <b>${next.loans.length}</b> empréstimos, <b>${next.cards.length}</b> cartões e <b>${next.purchases.length}</b> compras.<br><br>Os dados atuais serão substituídos. Uma cópia deles fica guardada para você poder voltar atrás.`,
        confirmLabel: 'Restaurar', iconName: 'Upload',
      });
      if (!ok) return;
      try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(S())); } catch { /* sem espaço para a cópia */ }
      Store.state = next;
      Store.state.settings.onboarded = true;
      HIDE = Store.state.settings.hideValues;
      Store.save();
      Motion.apply();
      App.refresh();
      toast('Backup restaurado com sucesso.', { action: { label: 'Desfazer', fn: undoRestore } });
    };
    reader.onerror = () => toast('Não foi possível ler o arquivo.', { type: 'error' });
    reader.readAsText(file);
  };
  const undoRestore = () => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) { toast('Não há cópia anterior disponível.', { type: 'info' }); return; }
      Store.state = normalize(JSON.parse(raw));
      HIDE = Store.state.settings.hideValues;
      localStorage.removeItem(SNAPSHOT_KEY);
      Store.save();
      App.refresh();
      toast('Dados anteriores restaurados.');
    } catch { toast('Não foi possível voltar aos dados anteriores.', { type: 'error' }); }
  };
  const wipe = async () => {
    const ok = await confirmDialog({ title: 'Apagar todos os dados?', message: 'Esta ação remove <b>todas</b> as informações deste navegador e não pode ser desfeita.', confirmLabel: 'Apagar tudo', danger: true, iconName: 'TriangleAlert', requireText: 'APAGAR' });
    if (!ok) return;
    try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(SNAPSHOT_KEY); } catch { /* ignora */ }
    Store.state = DEFAULT_STATE();
    HIDE = false;
    Motion.prevValues.clear();
    Store.save();
    Motion.apply();
    App.f.cards.sel = null;
    location.hash = '#/dashboard';
    App.refresh();
    toast('Todos os dados foram apagados.', { type: 'info' });
  };

  /* ---- Dados de exemplo (marcados com demo: true, removíveis) ---- */
  const loadDemo = () => {
    if (Store.hasDemo) { toast('Os dados de exemplo já estão carregados.', { type: 'info' }); return; }
    const t = today();
    const cur = ymOf(t);
    const D = (o) => ({ ...o, id: uid(), demo: true });
    const s = S();
    const start = dateIn(ymAdd(cur, -3), 1);
    // Entradas
    s.incomes.push(normIncome(D({ description: 'Saldo anterior (exemplo)', category: 'outros', amount: 6000, date: start, received: true })));
    for (let k = -3; k <= 1; k++) {
      const ym = ymAdd(cur, k);
      const sal = dateIn(ym, 5);
      s.incomes.push(normIncome(D({ description: 'Salário', category: 'salario', amount: 6200, date: sal, received: sal <= t })));
      if (k >= -1) { const d = dateIn(ym, 27); s.incomes.push(normIncome(D({ description: 'Aulas particulares', category: 'trabalhos', amount: 450, date: d, received: d <= t }))); }
    }
    [[-2, 18, 900], [0, 22, 900]].forEach(([k, d, v]) => { const date = dateIn(ymAdd(cur, k), d); s.incomes.push(normIncome(D({ description: 'Projeto freelance', category: 'extra', amount: v, date, received: date <= t }))); });
    s.incomes.push(normIncome(D({ description: 'Venda de itens usados', category: 'diversos', amount: 320, date: dateIn(ymAdd(cur, -1), 11), received: true })));
    // Contas da casa
    const defs = [
      ['Aluguel', 'aluguel', 1850, 5, 'boleto'], ['Condomínio', 'condominio', 480, 8, 'boleto'],
      ['Energia elétrica', 'energia', [212.4, 198.7, 236.9, 221.35, 205.8], 12, 'debito_auto'], ['Água e esgoto', 'agua', [96.3, 88.9, 102.15, 91.4, 94.7], 15, 'debito_auto'],
      ['Internet fibra', 'internet', 119.9, 20, 'pix'], ['Gás de cozinha', 'gas', 125, 18, 'pix'],
      ['Supermercado do mês', 'mercado', [1080, 965.4, 1132.9, 1010.25, 990], 25, 'cartao_debito'], ['Produtos de limpeza', 'limpeza', 86.5, 22, 'pix'],
    ];
    for (let k = -3; k <= 1; k++) {
      const ym = ymAdd(cur, k);
      defs.forEach(([name, category, amount, day, method]) => {
        if (category === 'gas' && k % 2 !== 0) return;
        const due = dateIn(ym, day);
        const leaveLate = k === 0 && category === 'energia';
        const paid = due < t && !leaveLate;
        s.bills.push(normBill(D({ name, category, amount: Array.isArray(amount) ? amount[k + 3] : amount, dueDate: due, method, paid, paidDate: paid ? due : '', seriesId: `demo-${category}` })));
      });
    }
    // Empréstimos
    const mkLoan = (o) => {
      const l = normLoan(D({ ...o, payments: [] }));
      let paid = 0;
      for (let n = 1; n <= l.totalInstallments; n++) if (Fin.loanDue(l, n) < t) paid = n;
      l.paidInstallments = paid;
      for (let n = 1; n <= paid; n++) { const due = Fin.loanDue(l, n); if (due >= start) l.payments.push({ id: uid(), date: due, amount: l.installmentValue, n }); }
      s.loans.push(l);
    };
    mkLoan({ creditor: 'Banco Horizonte', type: 'pessoal', originalAmount: 12000, totalInstallments: 24, installmentValue: calcPMT(12000, 2.49, 24), interestRate: 2.49, firstDueDate: dateIn(ymAdd(cur, -9), 10) });
    mkLoan({ creditor: 'Financeira Atlas', type: 'financiamento', originalAmount: 38000, totalInstallments: 48, installmentValue: 1189.9, interestRate: null, firstDueDate: dateIn(ymAdd(cur, -20), 16), notes: 'Financiamento do carro' });
    mkLoan({ creditor: 'Acordo Loja Lar & Cia', type: 'divida', originalAmount: 3000, totalInstallments: 6, installmentValue: 500, interestRate: 0, firstDueDate: dateIn(ymAdd(cur, -6), 28) });
    // Cartões
    const c1 = normCard(D({ name: 'Cartão Platinum', brand: 'visa', limit: 8000, closingDay: 3, dueDay: 10, color: 'ametista', startYm: ymAdd(cur, -2) }));
    const c2 = normCard(D({ name: 'Cartão Black', brand: 'master', limit: 15000, closingDay: 26, dueDay: 6, color: 'onix', startYm: ymAdd(cur, -2) }));
    s.cards.push(c1, c2);
    const buy = (card, description, amount, installments, date, category) => s.purchases.push(normPurchase(D({ cardId: card.id, description, amount, installments, date, category })));
    buy(c1, 'Notebook para trabalho', 4299, 10, addDaysISO(t, -95), 'educacao');
    for (let k = -3; k <= 0; k++) buy(c1, 'Assinatura de streaming', 55.9, 1, dateIn(ymAdd(cur, k), 7), 'assinaturas');
    buy(c1, 'Farmácia', 138.6, 1, addDaysISO(t, -6), 'saude');
    buy(c1, 'Restaurante', 214.3, 1, addDaysISO(t, -12), 'lazer');
    buy(c2, 'Passagens aéreas', 2340, 6, addDaysISO(t, -40), 'lazer');
    buy(c2, 'Pneus do carro', 1560, 4, addDaysISO(t, -70), 'transporte');
    buy(c2, 'Supermercado', 412.75, 1, addDaysISO(t, -3), 'mercado');
    buy(c2, 'Combustível', 250, 1, addDaysISO(t, -9), 'transporte');
    Fin.invalidate();
    [c1, c2].forEach((c) => {
      Fin.invoices(c, t).forEach((inv) => {
        if (inv.ym >= c.startYm && inv.amount > 0 && inv.dueDate < t) s.invoicePayments.push({ id: uid(), cardId: c.id, ym: inv.ym, amount: inv.amount, date: inv.dueDate, demo: true });
      });
    });
    s.settings.onboarded = true;
    Store.save();
    App.refresh();
    toast('Dados de exemplo carregados. Remova-os quando quiser em Ajustes.', { type: 'info', duration: 6000, action: { label: 'Remover', fn: removeDemo } });
  };
  const removeDemo = () => {
    Store.commit((s) => {
      ['bills', 'incomes', 'loans', 'cards', 'purchases', 'invoicePayments'].forEach((k) => { s[k] = s[k].filter((x) => !x.demo); });
      const ids = new Set(s.cards.map((c) => c.id));
      s.purchases = s.purchases.filter((p) => ids.has(p.cardId));
      s.invoicePayments = s.invoicePayments.filter((p) => ids.has(p.cardId));
    });
    App.f.cards.sel = null;
    Motion.prevValues.clear();
    toast('Dados de exemplo removidos.', { type: 'info' });
  };

  /* ---- Busca global ---- */
  const Search = {
    active: -1,
    results: [],
    items() {
      const s = S();
      const out = [];
      s.bills.forEach((b) => out.push({ type: 'Conta', icon: billCat(b.category).icon, title: b.name, sub: `${billCat(b.category).label} · vence ${fmtDate(b.dueDate)}`, amount: b.amount, text: `${b.name} ${b.notes} ${billCat(b.category).label}`, route: 'contas', ym: ymOf(b.dueDate), open: () => billForm(findBy('bills', b.id)) }));
      s.incomes.forEach((i) => out.push({ type: 'Entrada', icon: incomeCat(i.category).icon, title: i.description, sub: `${incomeCat(i.category).label} · ${fmtDate(i.date)}`, amount: i.amount, text: `${i.description} ${i.notes} ${incomeCat(i.category).label}`, route: 'entradas', ym: ymOf(i.date), open: () => incomeForm(findBy('incomes', i.id)) }));
      s.loans.forEach((l) => out.push({ type: 'Empréstimo', icon: 'Landmark', title: l.creditor, sub: `${LOAN_TYPE[l.type].label} · ${l.paidInstallments}/${l.totalInstallments} parcelas`, amount: l.originalAmount, text: `${l.creditor} ${l.notes} ${LOAN_TYPE[l.type].label}`, route: 'emprestimos', open: () => loanForm(findBy('loans', l.id)) }));
      s.cards.forEach((c) => out.push({ type: 'Cartão', icon: 'CreditCard', title: c.name, sub: `Limite ${money(c.limit)} · vence dia ${c.dueDay}`, amount: null, text: `${c.name} ${BRAND[c.brand].label}`, route: 'cartoes', open: () => { App.f.cards.sel = c.id; App.refresh(); } }));
      s.purchases.forEach((p) => { const c = findBy('cards', p.cardId); out.push({ type: 'Compra', icon: 'ShoppingBag', title: p.description, sub: `${c ? c.name : ''} · ${fmtDate(p.date)} · ${p.installments}x`, amount: p.amount, text: `${p.description} ${p.notes} ${billCat(p.category).label}`, route: 'cartoes', open: () => { App.f.cards.sel = p.cardId; App.refresh(); purchaseForm(findBy('purchases', p.id)); } }); });
      return out;
    },
    run(q) {
      const box = $('#searchResults');
      const nq = norm(q.trim());
      if (!nq) { this.close(); return; }
      this.results = this.items().filter((it) => norm(it.text).includes(nq)).slice(0, 8);
      this.active = this.results.length ? 0 : -1;
      box.innerHTML = this.results.length
        ? `<p class="sr-head">${this.results.length} resultado(s)</p>${this.results.map((r, k) => `<button type="button" class="sr-item ${k === 0 ? 'is-active' : ''}" role="option" data-sr="${k}">${icon(r.icon)}<span><b>${esc(r.title)}</b><small>${esc(r.type)} · ${esc(r.sub)}</small></span>${r.amount != null ? `<em>${money(r.amount)}</em>` : ''}</button>`).join('')}`
        : `<p class="sr-empty">${icon('SearchX')}Nada encontrado para “${esc(q.trim())}”.</p>`;
      box.hidden = false;
      $('#search').classList.add('has-results');
    },
    move(d) {
      if (!this.results.length) return;
      this.active = (this.active + d + this.results.length) % this.results.length;
      $$('.sr-item', $('#searchResults')).forEach((el, k) => el.classList.toggle('is-active', k === this.active));
    },
    pick(k = this.active) {
      const r = this.results[k];
      if (!r) return;
      this.close(true);
      if (r.ym && r.ym !== App.ym) { App.ym = r.ym; App.f.cal.day = null; }
      const after = () => setTimeout(r.open, 120);
      if (App.route !== r.route) { location.hash = `#/${r.route}`; setTimeout(after, 380); } else { App.refresh(); after(); }
    },
    close(clear = false) {
      const box = $('#searchResults');
      box.hidden = true;
      $('#search').classList.remove('has-results');
      if (clear) { $('#searchInput').value = ''; $('#search').classList.remove('is-open'); }
      this.results = [];
    },
  };

  /* ---- Menus: novo registro, mais opções, seletor de mês ---- */
  const QUICK = [
    { action: 'new-bill', icon: 'House', label: 'Conta da casa', sub: 'Aluguel, energia, água…' },
    { action: 'new-income', icon: 'BanknoteArrowUp', label: 'Entrada', sub: 'Salário, renda extra…' },
    { action: 'new-loan', icon: 'Landmark', label: 'Empréstimo ou dívida', sub: 'Parcelas e juros' },
    { action: 'new-purchase', icon: 'ShoppingBag', label: 'Compra no cartão', sub: 'À vista ou parcelada' },
    { action: 'new-card', icon: 'CreditCard', label: 'Cartão de crédito', sub: 'Limite e fatura' },
  ];
  const Menu = {
    el: null,
    close() { if (this.el) { this.el.remove(); this.el = null; } },
    quick(anchor) {
      const items = QUICK.map((q) => `<button type="button" class="menu-item" data-action="${q.action}">${icon(q.icon)}<span><b>${q.label}</b><small>${q.sub}</small></span></button>`).join('');
      if (mq('(max-width: 899px)') || !anchor || !anchor.closest('.quick-add')) {
        Modal.open({ title: 'Adicionar', subtitle: 'O que você quer registrar?', iconName: 'Plus', body: `<div class="menu-grid">${items}</div>`, size: 'sm', className: 'modal--menu' });
        return;
      }
      if (this.el) { this.close(); return; }
      const el = document.createElement('div');
      el.className = 'menu-pop';
      el.setAttribute('role', 'menu');
      el.innerHTML = items;
      anchor.closest('.quick-add').appendChild(el);
      this.el = el;
      Motion.menuIn(el);
    },
    more() {
      const routes = Object.entries(App.views).map(([id, v]) => `<a class="menu-tile ${App.route === id ? 'is-active' : ''}" href="#/${id}" data-modal-close>${icon(v.icon)}<span>${v.title}</span></a>`).join('');
      Modal.open({ title: 'Menu', subtitle: 'Todas as seções do Finance 3D', iconName: 'LayoutGrid', body: `<nav class="menu-tiles">${routes}</nav><div class="menu-extra"><button class="btn btn-ghost" type="button" data-action="toggle-hide" data-modal-close>${icon(HIDE ? 'Eye' : 'EyeOff')}<span>${HIDE ? 'Mostrar valores' : 'Ocultar valores'}</span></button><button class="btn btn-ghost" type="button" data-action="backup" data-modal-close>${icon('FileJson')}<span>Backup</span></button></div>`, size: 'sm', className: 'modal--menu' });
    },
  };
  const MonthPop = {
    year: null,
    get el() { return $('#monthPop'); },
    open() {
      this.year = Number(App.ym.slice(0, 4));
      this.render();
      this.el.hidden = false;
      $('#monthCurrent').setAttribute('aria-expanded', 'true');
      Motion.menuIn(this.el);
    },
    close() {
      if (!this.el || this.el.hidden) return;
      this.el.hidden = true;
      $('#monthCurrent').setAttribute('aria-expanded', 'false');
    },
    render() {
      const cur = ymNow();
      this.el.innerHTML = `
        <div class="mp-head"><button class="btn-icon btn-icon--sm" type="button" data-action="mp-year" data-dir="-1" aria-label="Ano anterior">${icon('ChevronLeft')}</button><b>${this.year}</b><button class="btn-icon btn-icon--sm" type="button" data-action="mp-year" data-dir="1" aria-label="Próximo ano">${icon('ChevronRight')}</button></div>
        <div class="mp-grid">${MONTHS_SHORT.map((m, i) => { const ym = `${this.year}-${pad(i + 1)}`; return `<button type="button" class="mp-month ${ym === App.ym ? 'is-selected' : ''} ${ym === cur ? 'is-current' : ''}" data-action="mp-pick" data-ym="${ym}">${m}</button>`; }).join('')}</div>
        <button class="btn btn-sm btn-ghost mp-today" type="button" data-action="month-today">${icon('LocateFixed')}<span>Mês atual</span></button>`;
    },
  };

  const ACTIONS = {
    'month-prev': () => App.setMonth(ymAdd(App.ym, -1), -1),
    'month-next': () => App.setMonth(ymAdd(App.ym, 1), 1),
    'month-toggle': () => (MonthPop.el.hidden ? MonthPop.open() : MonthPop.close()),
    'month-today': () => { MonthPop.close(); App.setMonth(ymNow()); },
    'mp-year': (el) => { MonthPop.year += Number(el.dataset.dir); MonthPop.render(); },
    'mp-pick': (el) => { MonthPop.close(); App.setMonth(el.dataset.ym); },
    'toggle-hide': () => {
      Store.commit((s) => { s.settings.hideValues = !s.settings.hideValues; }, { refresh: false });
      HIDE = S().settings.hideValues;
      App.refresh();
      toast(HIDE ? 'Valores ocultos.' : 'Valores visíveis.', { type: 'info', duration: 1800 });
    },
    'quick-add': (el) => Menu.quick(el),
    'more-menu': () => Menu.more(),
    go: (el) => { location.hash = `#/${el.dataset.route}`; },
    'search-open': () => { $('#search').classList.add('is-open'); $('#searchInput').focus(); },
    'filter-seg': (el) => setFilter(el.dataset.filter, el.dataset.value, el),
    'clear-filters': (el) => {
      const sc = el.dataset.scope;
      Object.assign(App.f[sc], { q: '', cat: 'all', status: 'all' });
      App.refresh();
    },
    'new-bill': (el) => billForm(null, { date: el.dataset.date }),
    'edit-bill': (el) => { const b = findBy('bills', el.dataset.id); if (b) billForm(b); },
    'dup-bill': (el) => duplicateNext('bills', el.dataset.id),
    'del-bill': (el) => removeBill(el.dataset.id),
    'toggle-bill': (el) => { const b = findBy('bills', el.dataset.id); if (b) { Motion.pop(el); setBillPaid(b.id, !b.paid); } },
    'new-income': () => incomeForm(),
    'edit-income': (el) => { const i = findBy('incomes', el.dataset.id); if (i) incomeForm(i); },
    'dup-income': (el) => duplicateNext('incomes', el.dataset.id),
    'del-income': (el) => removeIncome(el.dataset.id),
    'toggle-income': (el) => { Motion.pop(el); toggleIncome(el.dataset.id); },
    'new-loan': () => loanForm(),
    'edit-loan': (el) => { const l = findBy('loans', el.dataset.id); if (l) loanForm(l); },
    'del-loan': (el) => removeLoan(el.dataset.id),
    'pay-loan': (el) => payLoan(el.dataset.id),
    'undo-loan': (el) => undoLoan(el.dataset.id),
    'new-card': () => cardForm(),
    'edit-card': (el) => { const c = findBy('cards', el.dataset.id); if (c) cardForm(c); },
    'del-card': (el) => removeCard(el.dataset.id),
    'select-card': (el) => { if (App.f.cards.sel === el.dataset.id) return; App.f.cards.sel = el.dataset.id; App.f.cards.inv = null; App.refresh(); },
    'select-invoice': (el) => { App.f.cards.inv = el.dataset.ym; App.refresh(); },
    'pay-invoice': (el) => payInvoice(el.dataset.id, el.dataset.ym),
    'undo-invoice': (el) => undoInvoice(el.dataset.id, el.dataset.ym),
    'new-purchase': (el) => purchaseForm(null, el.dataset.card),
    'edit-purchase': (el) => { const p = findBy('purchases', el.dataset.id); if (p) purchaseForm(p); },
    'del-purchase': (el) => removePurchase(el.dataset.id),
    'pay-ob': (el) => {
      const { kind, id, ym } = el.dataset;
      Motion.pop(el);
      if (kind === 'bill') setBillPaid(id, true);
      else if (kind === 'loan') payLoan(id);
      else if (kind === 'invoice') payInvoice(id, ym);
    },
    'cal-day': (el) => {
      App.f.cal.day = el.dataset.date;
      App.refresh();
      if (mq('(max-width: 1099px)')) { const side = $('.cal-side'); if (side) side.scrollIntoView({ behavior: Motion.enabled ? 'smooth' : 'auto', block: 'start' }); }
    },
    'adjust-balance': () => adjustBalance(false),
    'onboard-start': () => adjustBalance(true),
    'load-demo': () => loadDemo(),
    'remove-demo': async () => {
      const ok = await confirmDialog({ title: 'Remover dados de exemplo?', message: 'Todos os registros de exemplo serão removidos. Seus próprios registros não serão afetados.', confirmLabel: 'Remover exemplos', iconName: 'Trash2' });
      if (ok) removeDemo();
    },
    backup: () => backup(),
    restore: () => { const inp = $('#restoreInput'); inp.value = ''; inp.click(); },
    'undo-restore': () => undoRestore(),
    wipe: () => wipe(),
    'export-bills': () => exporters.bills(),
    'export-incomes': () => exporters.incomes(),
    'export-loans': () => exporters.loans(),
    'export-report': () => exporters.report(),
    'export-transactions': () => exporters.transactions(),
    'export-transactions-all': () => exporters.all(),
  };

  /* ---- Filtros (renderização parcial para não perder o foco) ---- */
  const PARTIAL = {
    bills: () => { const box = $('#billList'); if (box) { box.innerHTML = billList(); Motion.enterView(box, 'list'); } },
    incomes: () => { const box = $('#incomeList'); if (box) { box.innerHTML = incomeList(); Motion.enterView(box, 'list'); } },
    dash: () => { const box = $('#dashChartWrap'); if (box) { Charts.destroyAll(); box.innerHTML = dashChartBlock(); mountDashboard(); } },
  };
  const setFilter = (path, value, el) => {
    const [scope, key] = path.split('.');
    if (!App.f[scope]) return;
    App.f[scope][key] = value;
    if (el) {
      const group = el.closest('.segmented');
      if (group) $$('button', group).forEach((b) => { const on = b === el; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    }
    if (PARTIAL[scope] && key !== 'scope') PARTIAL[scope]();
    else App.refresh();
  };

  /* ===========================================================================
     APP — roteamento, cromo da interface e eventos
     ======================================================================== */
  const App = {
    route: null,
    ym: ymNow(),
    token: 0,
    f: {
      dash: { chart: 'flow' },
      bills: { q: '', cat: 'all', status: 'all', scope: 'month' },
      incomes: { q: '', cat: 'all', status: 'all', scope: 'month' },
      loans: { status: 'active' },
      cards: { sel: null, inv: null },
      cal: { day: null },
      rep: { range: '6', from: null, to: null },
    },
    views: {
      dashboard: { title: 'Visão geral', icon: 'LayoutDashboard', eyebrow: () => greeting(), render: viewDashboard, mount: mountDashboard },
      contas: { title: 'Contas da casa', icon: 'House', eyebrow: 'Despesas domésticas', render: viewBills },
      entradas: { title: 'Entradas', icon: 'BanknoteArrowUp', eyebrow: 'Controle de recebimentos', render: viewIncomes },
      emprestimos: { title: 'Empréstimos', icon: 'Landmark', eyebrow: 'Empréstimos e dívidas', render: viewLoans },
      cartoes: { title: 'Cartões', icon: 'CreditCard', eyebrow: 'Cartões de crédito', render: viewCards },
      calendario: { title: 'Calendário', icon: 'CalendarDays', eyebrow: 'Calendário financeiro', render: viewCalendar },
      relatorios: { title: 'Relatórios', icon: 'ChartColumn', eyebrow: 'Relatórios e análises', render: viewReports, mount: mountReports },
      inteligencia: { title: 'Inteligência', icon: 'Brain', eyebrow: 'Análise financeira automática', render: viewInsights, mount: mountInsights },
      ajustes: { title: 'Ajustes', icon: 'Settings', eyebrow: 'Preferências, backup e dados', render: viewSettings, mount: mountSettings },
    },
    routeFromHash() {
      const r = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
      return this.views[r] ? r : 'dashboard';
    },
    async show(route, { first = false } = {}) {
      const token = ++this.token;
      const view = $('#view');
      const changing = this.route !== route;
      MonthPop.close(); Menu.close(); Search.close();
      if (changing && this.route && !first) await Motion.leaveView(view);
      if (token !== this.token) return;
      this.route = route;
      const v = this.views[route];
      Motion.title($('#viewTitle'), v.title);
      document.title = `${v.title} · Finance 3D`;
      this.syncNav();
      this.syncChrome();
      if (changing) Motion.scrollTop();
      this.render(changing || first ? 'enter' : 'update');
    },
    render(mode = 'update') {
      const view = $('#view');
      const v = this.views[this.route];
      if (!v) return;
      Motion.revertView();
      Charts.destroyAll();
      view.innerHTML = v.render();
      if (v.mount) v.mount(view);
      Motion.enterView(view, mode);
    },
    refresh() {
      this.syncChrome();
      if (this.route) this.render('update');
    },
    setMonth(ym, dir = 0) {
      if (!isYM(ym)) return;
      const d = dir || Math.sign(ymDiff(this.ym, ym));
      this.ym = ym;
      this.f.cal.day = null;
      this.f.cards.inv = null;
      this.refresh();
      if (Motion.enabled && d) Motion.gsap.fromTo('#view > .page', { x: d * 28, autoAlpha: 0.35 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
    },
    syncChrome() {
      const t = today();
      const v = this.views[this.route];
      if (v) $('#viewEyebrow').textContent = typeof v.eyebrow === 'function' ? v.eyebrow() : v.eyebrow;
      $('#monthLabel').textContent = ymLabel(this.ym);
      $('#monthCurrent').classList.toggle('is-off', this.ym !== ymOf(t));
      const hb = $('#hideBtn');
      hb.innerHTML = icon(HIDE ? 'EyeOff' : 'Eye');
      hb.setAttribute('aria-pressed', String(HIDE));
      hb.setAttribute('aria-label', HIDE ? 'Mostrar valores' : 'Ocultar valores');
      hb.title = HIDE ? 'Mostrar valores' : 'Ocultar valores';
      document.body.classList.toggle('values-hidden', HIDE);
      const late = Fin.late(t);
      const lateBills = late.filter((o) => o.kind === 'bill').length;
      const ins = Fin.insights(ymOf(t), t);
      const alerts = ins.alerts.filter((a) => a.level === 'danger' || a.level === 'warning').length;
      $$('[data-badge="contas"]').forEach((b) => { b.hidden = !lateBills; b.textContent = lateBills; });
      $$('[data-badge="alertas"]').forEach((b) => { b.hidden = !alerts; b.textContent = alerts; });
      const dot = $('#bellDot');
      dot.hidden = !alerts;
      $('.btn-bell').setAttribute('aria-label', alerts ? `Alertas: ${alerts}` : 'Alertas');
      UI.updateSaveState();
    },
    syncNav() {
      const r = this.route;
      $$('.nav-link').forEach((a) => { const on = a.dataset.route === r; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      $$('#bottomNav [data-route]').forEach((a) => { const on = a.dataset.route === r; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      const inMore = !$(`#bottomNav [data-route="${r}"]`);
      const more = $('#bottomNav [data-action="more-menu"]');
      if (more) more.classList.toggle('is-active', inMore);
      Motion.moveIndicator($('#navIndicator'), $(`.nav-link[data-route="${r}"]`), 'y');
      Motion.moveIndicator($('#bnIndicator'), inMore ? more : $(`#bottomNav [data-route="${r}"]`), 'x');
    },
  };
  const greeting = () => {
    const h = new Date().getHours();
    const g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const name = S().settings.name;
    return name ? `${g}, ${name}` : g;
  };

  /* ---- Eventos globais (delegação) ---- */
  const bindEvents = () => {
    document.addEventListener('click', (e) => {
      const sr = e.target.closest('[data-sr]');
      if (sr) { Search.pick(Number(sr.dataset.sr)); return; }
      const el = e.target.closest('[data-action]');
      if (!e.target.closest('.month-picker')) MonthPop.close();
      if (!e.target.closest('.quick-add')) Menu.close();
      if (!e.target.closest('.search') && !e.target.closest('[data-action="search-open"]')) Search.close($('#search').classList.contains('is-open'));
      if (!el) return;
      const fn = ACTIONS[el.dataset.action];
      if (!fn) return;
      if (el.tagName === 'A') e.preventDefault();
      if (el.closest('.menu-pop')) Menu.close();
      if (el.closest('.modal--menu') && !el.hasAttribute('data-modal-close')) Modal.close(Modal.stack.find((m) => m.el.contains(el)));
      fn(el, e);
    });
    const onFilterInput = debounce((el) => setFilter(el.dataset.filterInput, el.value), 140);
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el.matches('[data-filter-input]') && el.tagName === 'INPUT') onFilterInput(el);
      if (el.id === 'searchInput') Search.run(el.value);
    });
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('select[data-filter-input]')) setFilter(el.dataset.filterInput, el.value);
      if (el.id === 'restoreInput') restoreFromFile(el.files && el.files[0]);
    });
    $('#searchInput').addEventListener('focus', (e) => { if (e.target.value.trim()) Search.run(e.target.value); });
    $('#searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); Search.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); Search.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); Search.pick(); }
      else if (e.key === 'Escape') { Search.close(true); e.target.blur(); }
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (mq('(max-width: 1359px)')) $('#search').classList.add('is-open');
        $('#searchInput').focus();
        $('#searchInput').select();
        return;
      }
      if (e.key === 'Escape') {
        if (!MonthPop.el.hidden) { MonthPop.close(); return; }
        if (Menu.el) { Menu.close(); return; }
        if ($('#search').classList.contains('is-open')) { Search.close(true); return; }
        if (Modal.top()) { Modal.close(); return; }
      }
      if (e.key === 'Tab' && Modal.top()) {
        const panel = $('.modal-panel', Modal.top().el);
        const f = $$('button:not([disabled]), [href], input:not([type=hidden]):not(.date-native), select, textarea, [tabindex]:not([tabindex="-1"])', panel).filter((x) => x.offsetParent !== null);
        if (f.length) {
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        }
      }
      if (typing || Modal.top() || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() === 'n' && !e.altKey) { e.preventDefault(); Menu.quick($('.quick-add .btn')); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); ACTIONS['month-prev'](); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); ACTIONS['month-next'](); }
    });
    window.addEventListener('hashchange', () => App.show(App.routeFromHash()));
    window.addEventListener('storage', (e) => {
      if (e.key !== STORE_KEY) return;
      Store.load();
      App.refresh();
      toast('Dados atualizados a partir de outra aba.', { type: 'info', duration: 2600 });
    });
    window.addEventListener('resize', debounce(() => App.syncNav(), 160));
    let day = today();
    setInterval(() => {
      if (today() !== day) { day = today(); Fin.invalidate(); App.refresh(); }
    }, 60000);
  };

  /* ---- Inicialização ---- */
  const init = () => {
    Store.load();
    hydrateIcons();
    bindInputMasks();
    Motion.init();
    Charts.setup();
    bindEvents();
    App.syncChrome();
    Motion.intro(() => App.show(App.routeFromHash(), { first: true }));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        App.syncNav();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    }
    window.addEventListener('load', () => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
    if (!Store.persistent) toast('Este navegador bloqueou o armazenamento local. Os dados não serão salvos após fechar a página.', { type: 'warning', duration: 9000 });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
