const $ = (id) => document.getElementById(id);
const APP_VERSION = 'v2026.10.02.4';

// Strategy: cash | btl | brrr (drives which sections are visible & calc behavior)
function getStrategy() {
  const el = document.querySelector('input[name="strategy"]:checked');
  return el ? el.value : 'btl';
}
function setStrategy(val) {
  const radios = document.querySelectorAll('input[name="strategy"]');
  radios.forEach(r => { r.checked = (r.value === val); });
  document.querySelectorAll('.strategy-opt').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.strategy === val);
  });
}

const FIELDS = [
  'price', 'refurb', 'legal', 'sourcing', 'pmFee', 'structuralSurvey', 'duv',
  'ltv', 'rate',
  'arrangementFee', 'bookingFee', 'valuationFee', 'brokerFee', 'mortgageLegalFee',
  'refurbMonths',
  'firstLtv', 'firstRate',
  'firstArrangementFee', 'firstBookingFee', 'firstValuationFee', 'firstBrokerFee', 'firstMortgageLegalFee',
  'rent', 'mgmt', 'insurance', 'maintenance', 'voids', 'companyCosts', 'otherCosts',
  // Append only: existing v2 share links encode fields by position.
  'holdingCosts', 'exitFee'
];
const SELECTS = ['ltvBase', 'fixedPeriod', 'firstFixedPeriod', 'buyerType'];
const CHECKBOXES = ['capitaliseArrangement', 'firstMortgageEnabled', 'firstCapitaliseArrangement', 'nonResident'];

const DEFAULTS = {
  holdingCosts: 0, exitFee: 0,
  price: 0, refurb: 0, legal: 0, sourcing: 0, pmFee: 0, structuralSurvey: 1000, duv: 0,
  ltv: 75, rate: 5.5,
  arrangementFee: 1495, bookingFee: 150, valuationFee: 350, brokerFee: 500, mortgageLegalFee: 500,
  refurbMonths: 4,
  firstLtv: 75, firstRate: 5.5,
  firstArrangementFee: 1495, firstBookingFee: 150, firstValuationFee: 350, firstBrokerFee: 500, firstMortgageLegalFee: 500,
  rent: 0, mgmt: 10, insurance: 25, maintenance: 5, voids: 8, companyCosts: 85, otherCosts: 0,
  ltvBase: 'duv', fixedPeriod: '5', firstFixedPeriod: '2',
  buyerType: 'additional',
  capitaliseArrangement: false,
  firstMortgageEnabled: false, firstCapitaliseArrangement: false,
  nonResident: false,
  strategy: 'brrr'
};

const EXAMPLE = {
  holdingCosts: 0, exitFee: 0,
  price: 135000, refurb: 21000, legal: 3000, sourcing: 4250, pmFee: 4000, structuralSurvey: 1000, duv: 182000,
  ltv: 75, rate: 5.5,
  arrangementFee: 1495, bookingFee: 150, valuationFee: 350, brokerFee: 500, mortgageLegalFee: 500,
  refurbMonths: 4,
  firstLtv: 75, firstRate: 5.5,
  firstArrangementFee: 1495, firstBookingFee: 150, firstValuationFee: 350, firstBrokerFee: 500, firstMortgageLegalFee: 500,
  rent: 995, mgmt: 10, insurance: 25, maintenance: 5, voids: 8, companyCosts: 85, otherCosts: 0,
  ltvBase: 'duv', fixedPeriod: '5', firstFixedPeriod: '2',
  buyerType: 'company',
  capitaliseArrangement: false,
  firstMortgageEnabled: false, firstCapitaliseArrangement: false,
  nonResident: false,
  strategy: 'brrr'
};

// ===== Compact share-link codec (v2) =====
// Format: '#d=' + base64url( payload )
// payload = parts.join('~') where parts are:
//   0: 'v2' marker
//   1: numeric fields, '|'-separated, '' if equal to DEFAULTS (delta-encoding)
//   2: select fields, '|'-separated as indices into SELECT_OPTS, '' if default
//   3: checkboxes bitmask in base36
//   4: extra costs '||'-separated, each as label encodeURIComponent + ':' + amount
const SELECT_OPTS = {
  ltvBase: ['duv', 'price'],
  fixedPeriod: ['2', '3', '5', '10', '0'],
  firstFixedPeriod: ['2', '3', '5', '10', '0'],
  buyerType: ['additional', 'main', 'ftb', 'company']
};
function b64urlEncode(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}
function trimNum(n) {
  // strip trailing zeros: 5.50 -> 5.5, 100.0 -> 100
  const s = String(n);
  if (s.indexOf('.') < 0) return s;
  return s.replace(/\.?0+$/, '');
}
const STRATEGY_CODE = { cash: 'c', btl: 'b', brrr: 'r' };
const STRATEGY_FROM_CODE = { c: 'cash', b: 'btl', r: 'brrr' };

function encodeShareState() {
  const numParts = FIELDS.map(f => {
    const v = getNum(f);
    return (v === (DEFAULTS[f] || 0)) ? '' : trimNum(v);
  });
  const selParts = SELECTS.map(f => {
    const v = $(f).value;
    if (v === DEFAULTS[f]) return '';
    const opts = SELECT_OPTS[f] || [];
    const idx = opts.indexOf(v);
    return idx >= 0 ? String(idx) : encodeURIComponent(v);
  });
  let mask = 0;
  CHECKBOXES.forEach((f, i) => { if (getBool(f) !== !!DEFAULTS[f]) mask |= (1 << i); });
  const ec = (extraCosts || [])
    .filter(x => (x.label && x.label.trim()) || Number(x.amount) > 0)
    .map(x => encodeURIComponent(x.label || '').replace(/~/g, '%7E') + ':' + trimNum(Number(x.amount) || 0))
    .join('||');
  // Strategy: omit if equal to default ('btl' = '')
  const strat = getStrategy();
  const stratPart = (strat === DEFAULTS.strategy) ? '' : (STRATEGY_CODE[strat] || '');
  const parts = ['v2', numParts.join('|'), selParts.join('|'), mask.toString(36), ec, stratPart];
  // Trim trailing empty parts for shorter URLs
  while (parts.length > 2 && parts[parts.length - 1] === '') parts.pop();
  return b64urlEncode(parts.join('~'));
}
function decodeShareState(payload) {
  try {
  const raw = b64urlDecode(payload);
  const parts = raw.split('~');
  if (parts[0] !== 'v2') return null;
  const state = Object.assign({}, DEFAULTS);
  const nums = (parts[1] || '').split('|');
  FIELDS.forEach((f, i) => {
    const s = nums[i];
    if (s !== undefined && s !== '') state[f] = Number(s);
  });
  const sels = (parts[2] || '').split('|');
  SELECTS.forEach((f, i) => {
    const s = sels[i];
    if (s === undefined || s === '') return;
    const opts = SELECT_OPTS[f] || [];
    const n = Number(s);
    if (Number.isInteger(n) && opts[n] !== undefined) state[f] = opts[n];
    else state[f] = decodeURIComponent(s);
  });
  const mask = parseInt(parts[3] || '0', 36) || 0;
  CHECKBOXES.forEach((f, i) => {
    const differs = !!(mask & (1 << i));
    state[f] = differs ? !DEFAULTS[f] : !!DEFAULTS[f];
  });
  // Strategy (5th part)
  if (parts[5]) {
    state.strategy = STRATEGY_FROM_CODE[parts[5]] || DEFAULTS.strategy;
  }
  // ec
  const ecRaw = parts[4] || '';
  if (ecRaw) {
    state._extraCosts = ecRaw.split('||').map(token => {
      const idx = token.lastIndexOf(':');
      if (idx < 0) return { label: decodeURIComponent(token), amount: 0 };
      return {
        label: decodeURIComponent(token.slice(0, idx)),
        amount: Number(token.slice(idx + 1)) || 0
      };
    });
  } else {
    state._extraCosts = [];
  }
  return state;
  } catch (e) { return null; }
}

// ===== Custom "Other costs" line items =====
let extraCosts = []; // [{ id, label, amount }]
let extraSeq = 0;

function escapeAttr(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function extraCostsTotal() {
  return extraCosts.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

function renderExtraCosts() {
  const list = document.getElementById('extraCostsList');
  if (!list) return;
  list.innerHTML = '';
  extraCosts.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 140px auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--border);';
    row.innerHTML = `
      <input type="text" aria-label="${escapeAttr(t('extra.labelAria'))}" placeholder="${escapeAttr(t('extra.placeholder'))}" data-extra-label="${item.id}" value="${escapeAttr(item.label)}" style="text-align:left;width:100%;">
      <div class="input-wrap"><input type="text" aria-label="${escapeAttr(t('extra.amountAria'))}" inputmode="decimal" data-num data-extra-amount="${item.id}" value="${item.amount ? formatForInput(item.amount, 2) : ''}" style="width:110px;"><span class="unit">£</span></div>
      <button type="button" data-extra-remove="${item.id}" title="${escapeAttr(t('extra.remove'))}" aria-label="${escapeAttr(t('extra.remove'))}" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:4px 8px;border-radius:6px;font-size:0.85rem;cursor:pointer;">✕</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-extra-label]').forEach(el => {
    el.addEventListener('input', e => {
      const id = e.target.getAttribute('data-extra-label');
      const it = extraCosts.find(x => x.id === id);
      if (it) { it.label = e.target.value; saveState(); }
    });
  });
  list.querySelectorAll('[data-extra-amount]').forEach(el => {
    el.addEventListener('input', e => {
      const id = e.target.getAttribute('data-extra-amount');
      const it = extraCosts.find(x => x.id === id);
      if (it) { it.amount = parseNum(e.target.value); compute(); }
    });
    el.addEventListener('blur', e => {
      const v = parseNum(e.target.value);
      e.target.value = v ? formatForInput(v, 2) : '';
    });
    el.addEventListener('keypress', (e) => {
      if (e.key.length === 1 && !/[\d\s.,]/.test(e.key)) e.preventDefault();
    });
  });
  list.querySelectorAll('[data-extra-remove]').forEach(el => {
    el.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-extra-remove');
      extraCosts = extraCosts.filter(x => x.id !== id);
      renderExtraCosts();
      compute();
    });
  });
}

function addExtraCost(label = '', amount = 0) {
  extraSeq += 1;
  extraCosts.push({ id: 'ec' + extraSeq, label, amount });
  renderExtraCosts();
  compute();
}

// Formatowanie z separatorem tysięcy: spacja jako separator (np. 100 000)
const NBSP = '\u00A0'; // non-breaking space - nie dzieli przy łamaniu wierszy
// Polski zapis używa przecinka dziesiętnego; separator tysięcy to spacja w obu językach
const localDecimal = (s) => currentLanguage === 'pl' ? s.replace('.', ',') : s;

const fmt = (n, dp = 0) => {
  if (!isFinite(n)) return '-';
  // Zmieniam standardowy separator na NBSP
  const formatted = n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp, useGrouping: true });
  // en-GB używa przecinków - zamieniam na spacje
  return '£' + localDecimal(formatted.replace(/,/g, NBSP));
};
// Pełne funty, a pensy tylko gdy występują
const fmtMoney = (n) => fmt(n, Number.isInteger(n) ? 0 : 2);
const pct = (n, dp = 2) => {
  if (!isFinite(n)) return '-';
  return localDecimal(n.toFixed(dp)) + '%';
};

// Format liczby do wyświetlenia w polu input (bez £, ze spacjami)
function formatForInput(n, dp = 0) {
  if (!isFinite(n) || n === 0) return '';
  const formatted = Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: dp || 2, useGrouping: true });
  return localDecimal(formatted.replace(/,/g, ' '));
}

// Parse liczby z pola input - usuwa spacje, NBSP, przecinki
function parseNum(str) {
  if (typeof str !== 'string') str = String(str || '');
  let cleaned = str.replace(/[\s\u00A0£]/g, '');
  // Accept 1,234.56 / 1 234,56; a lone comma followed by 1–2 digits is decimal.
  if (!cleaned.includes('.') && /^-?\d+,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(',', '.');
  else cleaned = cleaned.replace(/,/g, '');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : 0;
}

function getNum(id) {
  const el = $(id);
  if (!el) return 0;
  // Dla input[type=number] (ltv, rate, %) parseFloat działa od ręki
  if (el.type === 'number') {
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }
  // Dla input[type=text] z data-num - parsuję ze spacjami
  return parseNum(el.value);
}

// UK SDLT bands 2025/26 (England & NI), source: HMRC. Effective from 1 April 2025.
// Bands are [upperLimit (or Infinity), rate%]
const SDLT_BANDS = {
  standard: [
    [125000, 0],
    [250000, 2],
    [925000, 5],
    [1500000, 10],
    [Infinity, 12],
  ],
  // First-time buyer relief (eligible purchases up to £500k; standard above).
  // GOV.UK residential-property-rates, checked 2026-10-02.
  ftb: [
    [300000, 0],
    [500000, 5],
    [Infinity, null], // sentinel: above £500k FTB relief lost, fall back to standard
  ],
};
const SDLT_HRAD_RATE = 5;     // % surcharge on whole price (additional dwellings)
const SDLT_HRAD_DEMINIMIS = 40000; // HRAD not applied below this purchase price
const SDLT_NONRES_RATE = 2;   // % surcharge on whole price (non-UK resident)

function calcSDLTBands(price, bands) {
  let remaining = price;
  let total = 0;
  let prevCap = 0;
  const lines = [];
  for (const [cap, rate] of bands) {
    if (remaining <= 0) break;
    if (rate === null) {
      // FTB relief lost above this cap - signal caller to recompute as standard
      return { total: null, breakdown: '', fallback: true };
    }
    const sliceCap = (cap === Infinity) ? remaining : Math.min(remaining, cap - prevCap);
    if (sliceCap > 0) {
      const tax = sliceCap * rate / 100;
      total += tax;
      const upperLabel = (cap === Infinity) ? `> ${fmtMoney(prevCap)}` : `${fmtMoney(prevCap)} - ${fmtMoney(cap)}`;
      lines.push(`  ${upperLabel}: ${fmtMoney(sliceCap)} × ${rate}% = ${fmt(tax, 2)}`);
    }
    remaining -= sliceCap;
    prevCap = cap;
  }
  return { total, breakdown: lines.join('\n'), fallback: false };
}

function calcStampDuty(price, buyerType, isNonResident) {
  if (price <= 0) return { total: 0, breakdown: '-' };

  // 1. Standard bands (or FTB relief)
  let baseTable = SDLT_BANDS.standard;
  let baseLabel = t('sdlt.standard');
  if (buyerType === 'ftb' && price <= 500000) {
    baseTable = SDLT_BANDS.ftb;
    baseLabel = t('sdlt.ftb');
  } else if (buyerType === 'ftb') {
    baseLabel = t('sdlt.ftbLostPrice');
  }

  let standard = calcSDLTBands(price, baseTable);
  if (standard.fallback) {
    // FTB above cap - revert to standard
    standard = calcSDLTBands(price, SDLT_BANDS.standard);
    baseLabel = t('sdlt.ftbLost');
  }

  const lines = [`${baseLabel}:`, standard.breakdown];
  let total = standard.total;

  // 2. HRAD surcharge (additional property or Ltd company)
  const appliesHrad = (buyerType === 'additional' || buyerType === 'company') && price >= SDLT_HRAD_DEMINIMIS;
  if (appliesHrad) {
    const hrad = price * SDLT_HRAD_RATE / 100;
    total += hrad;
    lines.push('', t('sdlt.hrad', { rate: SDLT_HRAD_RATE }));
    lines.push(`  ${fmtMoney(price)} × ${SDLT_HRAD_RATE}% = ${fmt(hrad, 2)}`);
  }

  // 3. Non-UK resident surcharge (applies to all buyer types)
  if (isNonResident && price >= 40000) {
    const nonres = price * SDLT_NONRES_RATE / 100;
    total += nonres;
    lines.push('', t('sdlt.nonResident', { rate: SDLT_NONRES_RATE }));
    lines.push(`  ${fmtMoney(price)} × ${SDLT_NONRES_RATE}% = ${fmt(nonres, 2)}`);
  }

  lines.push('', t('sdlt.total', { amount: fmt(total, 2), pct: pct(total / price * 100) }));

  return { total, breakdown: lines.join('\n') };
}

function getBool(id) {
  const el = $(id);
  return el && el.checked;
}

function compute() {
  const price = getNum('price');
  const refurb = getNum('refurb');
  const legal = getNum('legal');
  const sourcing = getNum('sourcing');
  const pmFee = getNum('pmFee');
  const structuralSurvey = getNum('structuralSurvey');
  const duv = getNum('duv');

  const buyerType = $('buyerType') ? $('buyerType').value : 'additional';
  const isNonResident = getBool('nonResident');

  // Strategy: 'cash' | 'btl' | 'brrr'
  const strategy = getStrategy();
  const hasMortgage = (strategy !== 'cash');
  const brrrEnabled = (strategy === 'brrr');

  // LTV base is auto-determined by strategy (BRRR -> DUV, BTL -> Price)
  // Keep the hidden select in sync so it survives roundtrips.
  const effectiveLtvBase = brrrEnabled ? 'duv' : 'price';
  if ($('ltvBase').value !== effectiveLtvBase) $('ltvBase').value = effectiveLtvBase;

  const ltv = hasMortgage ? getNum('ltv') : 0;
  const ltvBase = effectiveLtvBase;
  const rate = hasMortgage ? getNum('rate') : 0;

  // Mortgage costs (zero in cash mode)
  const arrangementFee = hasMortgage ? getNum('arrangementFee') : 0;
  const bookingFee = hasMortgage ? getNum('bookingFee') : 0;
  const valuationFee = hasMortgage ? getNum('valuationFee') : 0;
  const brokerFee = hasMortgage ? getNum('brokerFee') : 0;
  const mortgageLegalFee = hasMortgage ? getNum('mortgageLegalFee') : 0;
  const capitaliseArrangement = hasMortgage && getBool('capitaliseArrangement');

  // BRRR-only parameters
  const refurbMonths = brrrEnabled ? Math.max(0, getNum('refurbMonths')) : 0;
  const firstMortgageEnabled = brrrEnabled && getBool('firstMortgageEnabled');

  // 1st BTL parameters (only when BRRR + firstMortgageEnabled)
  const firstLtv = firstMortgageEnabled ? getNum('firstLtv') : 0;
  const firstRate = firstMortgageEnabled ? getNum('firstRate') : 0;
  const firstArrangementFee = firstMortgageEnabled ? getNum('firstArrangementFee') : 0;
  const firstBookingFee = firstMortgageEnabled ? getNum('firstBookingFee') : 0;
  const firstValuationFee = firstMortgageEnabled ? getNum('firstValuationFee') : 0;
  const firstBrokerFee = firstMortgageEnabled ? getNum('firstBrokerFee') : 0;
  const firstMortgageLegalFee = firstMortgageEnabled ? getNum('firstMortgageLegalFee') : 0;
  const firstCapitaliseArrangement = firstMortgageEnabled && getBool('firstCapitaliseArrangement');
  const holdingCosts = getNum('holdingCosts');
  const exitFee = firstMortgageEnabled ? getNum('exitFee') : 0;

  // Toggle section visibility based on strategy
  const mortgageSectionEl = $('mortgageSection');
  if (mortgageSectionEl) mortgageSectionEl.style.display = hasMortgage ? 'block' : 'none';
  const brrrSectionEl = $('brrrSection');
  if (brrrSectionEl) brrrSectionEl.style.display = brrrEnabled ? 'block' : 'none';
  const firstFieldsEl = $('firstMortgageFields');
  if (firstFieldsEl) firstFieldsEl.style.display = firstMortgageEnabled ? 'block' : 'none';
  const refurbMonthsRowEl = $('refurbMonthsRow');
  if (refurbMonthsRowEl) refurbMonthsRowEl.style.display = firstMortgageEnabled ? 'flex' : 'none';

  // Update mortgage section context hint
  const mortgageContextEl = $('mortgageContext');
  if (mortgageContextEl) {
    if (brrrEnabled) {
      mortgageContextEl.textContent = t('mortgage.context.brrr');
    } else if (hasMortgage) {
      mortgageContextEl.textContent = t('mortgage.context.btl');
    } else {
      mortgageContextEl.textContent = '';
    }
  }

  const rent = getNum('rent');
  const mgmt = getNum('mgmt');
  const insurance = getNum('insurance');
  const maintenance = getNum('maintenance');
  const voids = getNum('voids');
  const otherCosts = getNum('otherCosts');
  const companyCosts = getNum('companyCosts');

  // Stamp Duty
  const sdt = calcStampDuty(price, buyerType, isNonResident);
  $('stampDuty').value = formatForInput(sdt.total, 2);
  const sdtEffective = price > 0 ? (sdt.total / price * 100) : 0;
  $('sdtHint').textContent = t('sdlt.effective', { pct: pct(sdtEffective) });
  $('sdtBreakdown').textContent = sdt.breakdown;

  // FINAL BTL setup costs (sections 2 & 3) - paid out of pocket vs. capitalised
  const mortgageCostsCash = bookingFee + valuationFee + brokerFee + mortgageLegalFee
                         + (capitaliseArrangement ? 0 : arrangementFee);
  const arrangementCapitalised = capitaliseArrangement ? arrangementFee : 0;

  // 1st BTL setup costs (BRRR + 1st mortgage on)
  const firstSetupCash = firstMortgageEnabled
    ? (firstBookingFee + firstValuationFee + firstBrokerFee + firstMortgageLegalFee
       + (firstCapitaliseArrangement ? 0 : firstArrangementFee))
    : 0;
  const firstArrangementCapitalised = firstCapitaliseArrangement ? firstArrangementFee : 0;

  // 1st BTL loan amount (LTV based on Purchase Price; capitalised arrangement adds to base)
  const firstBaseMortgage = firstMortgageEnabled ? (price * firstLtv / 100) : 0;
  const firstMortgageLoan = firstBaseMortgage + firstArrangementCapitalised;

  // Refurb period interest (only if 1st BTL is on, accrues on the 1st loan during refurb months)
  const refurbInterest = (firstMortgageEnabled && firstMortgageLoan > 0 && refurbMonths > 0)
    ? firstMortgageLoan * firstRate / 100 / 12 * refurbMonths
    : 0;

  // Custom "Other costs" line items entered by the user
  const otherExtraTotal = extraCostsTotal();

  // All entered cash costs; refinance fees are assumed funded before loan proceeds.
  const cashCosts = price + refurb + sdt.total + legal + sourcing + pmFee
                  + structuralSurvey + otherExtraTotal
                  + mortgageCostsCash
                  + firstSetupCash + refurbInterest + holdingCosts + exitFee;
  // Economic cost includes fees regardless of funding. Final capitalised fees remain debt.
  const totalCost = cashCosts + firstArrangementCapitalised + arrangementCapitalised;

  // FINAL BTL loan (the one used for Cashflow / Cash-on-cash / Scenarios)
  // - Standard BTL: LTV against Purchase Price (single mortgage event)
  // - BRRR: this is the REMORTGAGE - LTV against DUV, proceeds
  //         repay the 1st BTL and pull deposit back to the investor.
  const ltvBaseValue = ltvBase === 'duv' ? duv : price;
  const baseMortgage = ltvBaseValue * ltv / 100;
  const mortgageLoan = baseMortgage + arrangementCapitalised;
  // Only base principal is cash advanced. Capitalised fees are not cash proceeds.
  const initialCash = brrrEnabled ? cashCosts - firstBaseMortgage : cashCosts - baseMortgage;
  const refinanceCash = brrrEnabled ? baseMortgage - firstMortgageLoan : 0;
  const cashNeeded = initialCash - refinanceCash; // cash left invested, not property equity

  const mortgagePay = mortgageLoan * rate / 100 / 12;

  // Monthly costs
  const mgmtFee = rent * mgmt / 100;
  const maintCost = rent * maintenance / 100;
  const voidsCost = rent * voids / 100;
  // Operating costs (BEZ mortgage) - dla Net Yield
  const opCosts = mgmtFee + insurance + maintCost + voidsCost + companyCosts + otherCosts;
  const monthlyCosts = mortgagePay + opCosts;

  const cashflow = rent - monthlyCosts;
  const cashflowYear = cashflow * 12;
  const noiYear = (rent - opCosts) * 12; // Net Operating Income (rent po kosztach BEZ kredytu)

  // Yields need both a rent and a base to mean anything.
  const yieldText = (income, base) => (rent > 0 && base > 0) ? pct(income / base * 100) : '—';
  const roe = cashNeeded > 0 ? (cashflowYear / cashNeeded * 100) : null;

  // Offer-style view, as sourcing packs usually quote a deal: purchase, refurb,
  // SDLT and legal fees only; rent less interest on the base loan, no other costs.
  const offerCost = price + refurb + sdt.total + legal;
  const offerCash = offerCost - baseMortgage;
  const offerRoe = offerCash > 0
    ? ((rent - baseMortgage * rate / 100 / 12) * 12 / offerCash * 100) : null;

  // Render
  $('rSdt').textContent = `${fmt(sdt.total, 0)} (${pct(sdtEffective)})`;
  $('rTotalCost').textContent = fmt(totalCost, 0);
  $('rMortgage').textContent = fmt(mortgageLoan, 0)
     + (capitaliseArrangement && arrangementFee > 0 ? t('funding.inclArrangement', { amount: fmt(arrangementFee, 0) }) : '');
  $('rCashNeeded').textContent = fmt(cashNeeded, 0);
  $('rInitialCashRow').hidden = !brrrEnabled;
  $('rRefinanceCashRow').hidden = !brrrEnabled;
  $('rInitialCash').textContent = fmt(initialCash, 0);
  $('rRefinanceCash').textContent = fmt(refinanceCash, 0);
  const cashLabel = brrrEnabled ? t('results.cashLeft') : t('results.cashRequired');
  $('rCashNeededLabel').textContent = cashLabel;
  $('rCashPositionHint').textContent = brrrEnabled ? t('cashHint.brrr') : t('cashHint.other');

  // Cost lines behind the total; optional lines disappear when empty.
  const fundingRows = [
    ['rFbRefurb', refurb],
    ['rFbLegal', legal],
    ['rFbSourcing', sourcing],
    ['rFbPm', pmFee],
    ['rFbOther', structuralSurvey + holdingCosts + otherExtraTotal],
    ['rFbFinance', mortgageCostsCash + arrangementCapitalised
                 + firstSetupCash + firstArrangementCapitalised + refurbInterest + exitFee],
  ];
  $('rFbPrice').textContent = fmt(price, 0);
  fundingRows.forEach(([id, val]) => {
    $(id).textContent = fmt(val, 0);
    $(id).closest('.cost-item').classList.toggle('hidden', !(val > 0));
  });

  // Offer comparison: the same deal on the offer-style and the all-in basis
  $('rCompareCashLabel').textContent = cashLabel;
  $('rOfferCost').textContent = fmt(offerCost, 0);
  $('rAllCost').textContent = fmt(totalCost, 0);
  $('rOfferCash').textContent = fmt(offerCash, 0);
  $('rAllCash').textContent = fmt(cashNeeded, 0);
  $('rOfferRoe').textContent = offerRoe === null ? t('na') : pct(offerRoe);
  $('rAllRoe').textContent = roe === null ? t('na') : pct(roe);
  $('rOfferYieldCost').textContent = yieldText(rent * 12, offerCost);
  $('rAllYieldCost').textContent = yieldText(rent * 12, totalCost);
  // The closed section still shows the three figures an offer leads with
  $('rCompareSummary').textContent = t('compare.summary', {
    cost: fmt(offerCost, 0),
    roe: offerRoe === null ? t('na') : pct(offerRoe),
    yield: yieldText(rent * 12, price),
  });

  $('rMonthlyCosts').textContent = fmt(monthlyCosts, 2) + t('unit.perM');
  // Breakdown of total monthly costs
  $('rMortgagePay').textContent = fmt(mortgagePay, 2);
  $('rMgmtFee').textContent = fmt(mgmtFee, 2);
  $('rInsurance').textContent = fmt(insurance, 2);
  $('rMaintCost').textContent = fmt(maintCost, 2);
  $('rVoidsCost').textContent = fmt(voidsCost, 2);
  $('rCompanyCosts').textContent = fmt(companyCosts, 2);
  $('rOtherCosts').textContent = fmt(otherCosts, 2);
  // Hide zero-cost lines to keep breakdown tidy
  const costRows = [
    ['rMortgagePay', mortgagePay],
    ['rMgmtFee', mgmtFee],
    ['rInsurance', insurance],
    ['rMaintCost', maintCost],
    ['rVoidsCost', voidsCost],
    ['rCompanyCosts', companyCosts],
    ['rOtherCosts', otherCosts],
  ];
  costRows.forEach(([id, val]) => {
    const row = $(id).closest('.cost-item');
    if (row) row.classList.toggle('hidden', !(val > 0));
  });
  $('rRent').textContent = fmt(rent, 2) + t('unit.perM');
  $('rCashflow').textContent = fmt(cashflow, 2);
  $('rCashflowYear').textContent = fmt(cashflowYear, 0);

  // Cashflow sign only; colour is not an investment recommendation.
  const cfRow = $('rCashflow').closest('.result-row');
  cfRow.classList.remove('good', 'warn', 'bad');
  if (cashflow > 0) cfRow.classList.add('good');
  else if (cashflow === 0) cfRow.classList.add('warn');
  else cfRow.classList.add('bad');

  $('kYieldDuv').textContent = yieldText(rent * 12, duv);
  $('kYieldPrice').textContent = yieldText(rent * 12, price);
  $('kNetYieldDuv').textContent = yieldText(noiYear, duv);
  $('kNetYieldPrice').textContent = yieldText(noiYear, price);
  $('kRoe').textContent = roe === null ? t('na') : pct(roe);
  $('kRoeHint').textContent = roe !== null ? '' : (brrrEnabled && price > 0
    ? (cashNeeded < 0 ? t('roe.recoveredPlus', { amount: fmt(-cashNeeded, 0) }) : t('roe.recovered'))
    : t('roe.noCash'));

  // Do not rank an investment by an arbitrary cash-on-cash threshold.
  const roeBox = $('kRoeBox');
  roeBox.classList.remove('good', 'warn', 'bad');

  // Scenariusze - wrażliwość na stopę
  const scenarios = [rate, rate + 1, rate + 2].map(r => {
    const mp = mortgageLoan * r / 100 / 12;
    const mc = mp + opCosts;
    const cf = rent - mc;
    const cfy = cf * 12;
    const ro = cashNeeded > 0 ? (cfy / cashNeeded * 100) : null;
    return { r, mp, cf, cfy, ro };
  });
  const tbody = $('scenariosBody');
  tbody.innerHTML = scenarios.map(s => {
    const cfClass = s.cf > 0 ? 'good' : s.cf === 0 ? 'warn' : 'bad';
    const roClass = 'muted';
    const mark = Math.abs(s.r - rate) < 0.01 ? t('stress.current') : t('stress.pp', { n: Math.round(s.r - rate) });
    return `<tr>
      <td><strong>${localDecimal(String(s.r))}% · ${mark}</strong></td>
      <td>${fmt(s.mp, 2)}</td>
      <td style="color: var(--${cfClass})">${fmt(s.cf, 2)}</td>
      <td style="color: var(--${cfClass})">${fmt(s.cfy, 0)}</td>
      <td style="color: var(--${roClass})">${s.ro === null ? t('na') : pct(s.ro)}</td>
    </tr>`;
  }).join('');

  const setText = (id, value) => { if ($(id)) $(id).textContent = value; };
  const proportionateCosts = (mgmt + maintenance + voids) / 100;
  const breakEvenRent = proportionateCosts < 1
    ? (mortgagePay + insurance + companyCosts + otherCosts) / (1 - proportionateCosts) : null;
  const stressedCashflow = scenarios[2].cf;
  setText('rBreakEvenRent', breakEvenRent === null ? t('na') : fmt(breakEvenRent, 0) + t('unit.perM'));
  setText('rStressCashflow', hasMortgage ? fmt(stressedCashflow, 2) + t('unit.perM') : t('stress.noMortgage'));
  setText('strategyHint', brrrEnabled ? t('strategy.brrr.description')
    : hasMortgage ? t('strategy.btl.description') : t('strategy.cash.description'));
  setText('runningCostsSummary', t('running.summary', { amount: fmt(opCosts, 0) }));
  setText('acquisitionCostsSummary', t('purchase.summary', { amount: fmt(sdt.total + legal + sourcing + pmFee + structuralSurvey + otherExtraTotal + holdingCosts, 0) }));
  setText('financeCostsSummary', t('fees.summary', { amount: fmt(mortgageCostsCash + arrangementCapitalised, 0) }));
  setText('scenarioHint', hasMortgage ? t('stress.hint') : t('stress.hintCash'));
  if ($('stressSection')) $('stressSection').hidden = !hasMortgage;
  setText('dealStatus', price <= 0 ? t('status.start')
    : rent <= 0 ? t('status.addRent')
    : brrrEnabled && duv <= 0 ? t('status.addDuv')
    : cashflow < 0 ? t('status.negative')
    : hasMortgage && stressedCashflow < 0 ? t('status.stress')
    : t('status.ok'));
  const missingValue = brrrEnabled && hasMortgage && ltv > 0 && duv <= 0;
  if ($('results')) $('results').classList.toggle('is-empty', price <= 0 || missingValue || rent <= 0);
  if (price <= 0 || missingValue || rent <= 0) {
    ['rCashflow', 'rCashflowYear', 'rStressCashflow'].forEach(id => setText(id, '—'));
    ['kRoe', 'rAllRoe', 'rOfferRoe'].forEach(id => setText(id, t('na')));
    setText('rCompareSummary', t('compare.summaryEmpty'));
    setText('kRoeHint', t('roe.incomplete'));
    cfRow.classList.remove('good', 'warn', 'bad');
    $('scenariosBody').innerHTML = '';
    setText('scenarioHint', t('stress.hintIncomplete'));
  }
  if (price <= 0 || missingValue) {
    ['rCashNeeded', 'rAllCash', 'rOfferCash', 'rBreakEvenRent', 'rRefinanceCash', 'rMortgage', 'rMortgagePay'].forEach(id => setText(id, '—'));
    if (price <= 0) setText('rInitialCash', '—');
  }

  // Do not present a plausible return for out-of-range active financial inputs.
  const badField = FIELDS.find(field => {
    if (!hasMortgage && ['ltv', 'rate', 'arrangementFee', 'bookingFee', 'valuationFee', 'brokerFee', 'mortgageLegalFee'].includes(field)) return false;
    if (!firstMortgageEnabled && (field.startsWith('first') || ['refurbMonths', 'exitFee'].includes(field))) return false;
    const value = getNum(field);
    return value < 0 || !Number.isFinite(value) || (['ltv', 'firstLtv', 'mgmt', 'maintenance', 'voids'].includes(field) && value > 100);
  });
  const badExtraCost = extraCosts.some(item => !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0);
  if (badField || badExtraCost || proportionateCosts >= 1) {
    setText('dealStatus', badField || badExtraCost ? t('status.badInputs') : t('status.badPercentages'));
    ['rCashflow', 'rCashflowYear', 'rCashNeeded', 'rInitialCash', 'rStressCashflow', 'rBreakEvenRent',
      'rTotalCost', 'rRefinanceCash', 'rMortgage', 'rMonthlyCosts', 'rMortgagePay',
      'kYieldDuv', 'kYieldPrice', 'kNetYieldDuv', 'kNetYieldPrice',
      'rOfferCost', 'rAllCost', 'rOfferCash', 'rAllCash', 'rOfferYieldCost', 'rAllYieldCost',
      'rFbPrice', 'rFbRefurb', 'rFbLegal', 'rFbSourcing', 'rFbPm', 'rFbOther', 'rFbFinance'].forEach(id => setText(id, '—'));
    ['kRoe', 'rAllRoe', 'rOfferRoe'].forEach(id => setText(id, t('na')));
    setText('rCompareSummary', t('compare.summaryEmpty'));
    setText('kRoeHint', t('roe.invalid'));
    $('scenariosBody').innerHTML = '';
    cfRow.classList.remove('good', 'warn', 'bad');
  }

  // Persist
  saveState();
}



function setFieldValue(id, raw) {
  const el = $(id);
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = !!raw && raw !== 'false';
  } else if (el.type === 'number' || el.tagName === 'SELECT') {
    el.value = raw;
  } else if (el.dataset && el.dataset.num !== undefined) {
    // Sformatuj ze spacjami
    const num = (typeof raw === 'number') ? raw : parseNum(raw);
    el.value = num === 0 && (raw === '' || raw === 0 || raw === '0') ? '' : formatForInput(num, 2);
  } else {
    el.value = raw;
  }
}

// The last notice is remembered so that it follows a language switch.
let lastNotice = null;
function notifyUser(key, params) {
  lastNotice = { key, params };
  if ($('actionStatus')) $('actionStatus').textContent = t(key, params);
}

function normalizeState(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const state = { ...DEFAULTS };
  FIELDS.forEach(field => {
    if (!(field in raw)) return;
    const number = Number(raw[field]);
    if (Number.isFinite(number) && number >= 0) state[field] = number;
  });
  SELECTS.forEach(field => {
    if (SELECT_OPTS[field].includes(String(raw[field]))) state[field] = String(raw[field]);
  });
  const isTrue = value => value === true || value === 'true' || value === 1 || value === '1';
  CHECKBOXES.forEach(field => { if (field in raw) state[field] = isTrue(raw[field]); });
  const strategy = raw.strategy === undefined && raw.brrrEnabled !== undefined
    ? (isTrue(raw.brrrEnabled) ? 'brrr' : 'btl') : raw.strategy;
  if (['cash', 'btl', 'brrr'].includes(strategy)) state.strategy = strategy;
  // First-home relief requires owner occupation; it is not available for pure BTL.
  if (state.buyerType === 'ftb') state.buyerType = 'main';
  state._extraCosts = Array.isArray(raw._extraCosts) ? raw._extraCosts
    .filter(item => item && typeof item === 'object')
    .map(item => ({ label: String(item.label || ''), amount: Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 ? Number(item.amount) : 0 })) : [];
  return state;
}

function loadState() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem('btlcalc:v1'));
  } catch (e) { state = null; }

  // URL hash override (v2 compact format takes precedence; v1 kept for back-compat)
  if (location.hash.startsWith('#d=')) {
    const decoded = decodeShareState(location.hash.slice(3));
    if (decoded) state = decoded;
    else notifyUser('notice.badLink');
  } else if (location.hash.startsWith('#data=')) {
    try {
      state = JSON.parse(atob(location.hash.slice(6)));
    } catch(e) {}
  }

  if (state && state.buyerType === 'ftb') notifyUser('notice.ftbMigrated');
  state = normalizeState(state);
  setStrategy(state.strategy);
  // Fill defaults for missing keys, never for an intentionally saved zero.
  [...FIELDS, ...SELECTS, ...CHECKBOXES].forEach(field => setFieldValue(field, state[field]));
  extraSeq = 0;
  extraCosts = state._extraCosts.map(item => ({ ...item, id: 'ec' + (++extraSeq) }));
  renderExtraCosts();
}

function applyValues(values) {
  if (values && values.buyerType === 'ftb') values = { ...values, buyerType: 'main' };
  if (values && values.strategy) setStrategy(values.strategy);
  Object.entries(values).forEach(([k, v]) => {
    if (k === 'strategy') return;
    if ($(k)) setFieldValue(k, v);
  });
  compute();
}

// Wire up strategy radios - clicking triggers selection update + recompute
document.querySelectorAll('input[name="strategy"]').forEach(radio => {
  radio.addEventListener('change', () => {
    setStrategy(radio.value);
    compute();
    saveState();
  });
});

// Wire up - dla pól liczbowych ze spacjami formatujemy na blur
[...FIELDS, ...SELECTS, ...CHECKBOXES].forEach(f => {
  const el = $(f);
  if (!el) return;
  el.addEventListener('input', compute);
  el.addEventListener('change', compute);
  // Reformat on blur - wyświetla ładnie ze spacjami
  if (el.dataset && el.dataset.num !== undefined) {
    el.addEventListener('blur', () => {
      const v = parseNum(el.value);
      if (v !== 0 || el.value.trim() !== '') {
        el.value = formatForInput(v, 2);
      }
      compute();
    });
    // Allow only digits, spaces, commas, dots, minus
    el.addEventListener('keypress', (e) => {
      if (e.key.length === 1 && !/[\d\s.,]/.test(e.key)) {
        e.preventDefault();
      }
    });
  }
});

$('addExtraCost').addEventListener('click', () => addExtraCost('', 0));

$('loadExample').addEventListener('click', () => {
  extraCosts = [];
  renderExtraCosts();
  applyValues(EXAMPLE);
});
$('reset').addEventListener('click', () => {
  if (confirm(t('confirm.reset'))) {
    extraCosts = [];
    renderExtraCosts();
    applyValues(DEFAULTS);
    [...FIELDS].forEach(f => {
      if (DEFAULTS[f] === 0) $(f).value = '';
    });
    compute();
  }
});
$('copyShare').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '#d=' + encodeShareState();
  try {
    await navigator.clipboard.writeText(url);
    if ($('shareFallback')) $('shareFallback').hidden = true;
    notifyUser('notice.linkCopied');
  } catch (e) {
    if ($('shareFallback') && $('shareUrl')) {
      $('shareFallback').hidden = false;
      $('shareUrl').value = url;
      $('shareUrl').focus();
      $('shareUrl').select();
    }
    notifyUser('notice.copyBelow');
  }
});

// Build a compact print-only summary of inputs (the form rows are hidden in print)
function buildPrintSummary() {
  const strategy = getStrategy();
  const buyerType = $('buyerType') ? $('buyerType').value : 'additional';
  const duv = getNum('duv');
  const rent = getNum('rent');
  const hasMortgage = (strategy !== 'cash');
  const num = (id) => localDecimal(String(getNum(id)));

  const rows = [
    [t('print.date'), new Date().toLocaleDateString(currentLanguage === 'pl' ? 'pl-PL' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
    [t('print.strategy'), t('print.strategy.' + strategy)],
    [t('field.buyerType'), t('buyer.' + buyerType)],
    [t('print.nonResident'), getBool('nonResident') ? t('print.yesSurcharge') : t('print.no')],
    [t('field.price'), fmtMoney(getNum('price'))],
    [t('funding.refurb'), fmtMoney(getNum('refurb'))],
    [t('field.duv'), duv > 0 ? fmtMoney(duv) : '-'],
    [t('field.rent'), rent > 0 ? fmtMoney(rent) : '-'],
  ];
  if (hasMortgage) {
    rows.push([t('print.mortgage'), t('print.mortgageValue', { ltv: num('ltv'), rate: num('rate') })]);
  } else {
    rows.push([t('print.mortgage'), t('print.noMortgage')]);
  }

  rows.push([t('print.holding'), fmt(getNum('holdingCosts'), 0)]);
  if (strategy === 'brrr' && getBool('firstMortgageEnabled')) {
    rows.push([t('print.purchaseLoan'), t('print.purchaseLoanValue', { ltv: num('firstLtv'), rate: num('firstRate'), months: num('refurbMonths') })]);
    rows.push([t('field.exitFee'), fmt(getNum('exitFee'), 0)]);
  }
  rows.push([t('print.basis'), t('print.basisValue')]);

  const dl = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('printSummary').innerHTML = `
    <h3>${t('app.name')} - ${APP_VERSION}</h3>
    <dl>${dl}</dl>
  `;
}

$('savePdf').addEventListener('click', () => {
  buildPrintSummary();
  // Tiny delay so the DOM updates before the print dialog opens
  setTimeout(() => window.print(), 50);
});
// Also build summary on any print trigger (Ctrl+P), not just our button
window.addEventListener('beforeprint', buildPrintSummary);

function saveState() {
  // Save numeric values, not formatted strings
  const state = {};
  FIELDS.forEach(f => {
    const el = $(f);
    if (!el) return;
    state[f] = (el.type === 'number') ? el.value : getNum(f);
  });
  SELECTS.forEach(f => state[f] = $(f).value);
  CHECKBOXES.forEach(f => state[f] = getBool(f));
  state.strategy = getStrategy();
  state._extraCosts = extraCosts.map(x => ({ label: x.label, amount: x.amount }));
  try {
    localStorage.setItem('btlcalc:v1', JSON.stringify(state));
  } catch (e) {
    notifyUser('notice.noStorage');
  }
}

// ===== Language =====
// Static texts carry data-i18n keys; computed texts are rendered again by compute().
const languageButton = (lang) => $('lang' + lang[0].toUpperCase() + lang.slice(1));

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.title = t('meta.title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)));
  document.querySelectorAll('[data-i18n-content]').forEach(el => el.setAttribute('content', t(el.dataset.i18nContent)));
  LANGUAGES.forEach(lang => {
    const button = languageButton(lang);
    if (button) button.setAttribute('aria-pressed', String(lang === currentLanguage));
  });
}

function setLanguage(lang) {
  if (!LANGUAGES.includes(lang) || lang === currentLanguage) return;
  currentLanguage = lang;
  try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (e) {}
  applyLanguage();
  // The decimal separator follows the language: re-format amounts already in the form
  FIELDS.forEach(f => {
    const el = $(f);
    if (el && el.dataset && el.dataset.num !== undefined && el.value.trim() !== '') {
      el.value = formatForInput(parseNum(el.value), 2);
    }
  });
  renderExtraCosts();
  if (lastNotice) notifyUser(lastNotice.key, lastNotice.params);
  compute();
}

LANGUAGES.forEach(lang => {
  const button = languageButton(lang);
  if (button) button.addEventListener('click', () => setLanguage(lang));
});

loadLanguage();
applyLanguage();
loadState();
compute();
