const assert = require('node:assert/strict');
const test = require('node:test');
const { calculator } = require('./harness.cjs');

// The example's exact £30.525 monthly cashflow lands just below the half-penny
// in binary floating point. Preserve the existing formatter's £30.52 output.
const EXAMPLE_CASHFLOW = '£30.52';

test('default BRRRR example separates funding before refinance from cash left', () => {
  const app = calculator();
  app.example();
  assert.equal(app.text('rSdt'), '£6 950 (5.15%)');
  assert.equal(app.text('rTotalCost'), '£178 195');
  assert.equal(app.text('rInitialCash'), '£178 195');
  assert.equal(app.text('rRefinanceCash'), '£136 500');
  assert.equal(app.text('rMortgage'), '£136 500');
  assert.equal(app.text('rCashNeeded'), '£41 695');
  assert.equal(app.hidden('rInitialCashRow'), false);
  assert.equal(app.hidden('rRefinanceCashRow'), false);
  assert.equal(app.text('rCashflow'), EXAMPLE_CASHFLOW);
  assert.equal(app.text('kRoe'), '0.88%');
});

test('cash strategy ignores both mortgage events and their fees', () => {
  const app = calculator();
  app.example({ strategy: 'cash', firstMortgageEnabled: true });
  assert.equal(app.text('rTotalCost'), '£175 200');
  assert.equal(app.text('rMortgage'), '£0');
  assert.equal(app.text('rCashNeeded'), '£175 200');
  assert.equal(app.hidden('rInitialCashRow'), true);
  assert.equal(app.hidden('rRefinanceCashRow'), true);
  assert.equal(app.text('rMortgagePay'), '£0.00');
  assert.equal(app.text('rCashflow'), '£656.15');
  assert.equal(app.text('kRoe'), '4.49%');
});

test('standard BTL uses purchase price and ignores the first-mortgage toggle', () => {
  const app = calculator();
  app.example({ strategy: 'btl', firstMortgageEnabled: true });
  assert.equal(app.text('rTotalCost'), '£178 195');
  assert.equal(app.text('rMortgage'), '£101 250');
  assert.equal(app.text('rCashNeeded'), '£76 945');
  assert.equal(app.hidden('rInitialCashRow'), true);
  assert.equal(app.hidden('rRefinanceCashRow'), true);
  assert.equal(app.text('rMortgagePay'), '£464.06');
  assert.equal(app.text('rCashflow'), '£192.09');
  assert.equal(app.text('kRoe'), '3.00%');
});

test('BRRRR first mortgage with a cash arrangement fee is fully repaid', () => {
  const app = calculator();
  app.example({ firstMortgageEnabled: true });
  // Exact unrounded initial funding is £81,796.25; cash left is £46,546.25.
  assert.equal(app.text('rTotalCost'), '£183 046');
  assert.equal(app.text('rInitialCash'), '£81 796');
  assert.equal(app.text('rRefinanceCash'), '£35 250');
  assert.equal(app.text('rCashNeeded'), '£46 546');
  assert.equal(app.text('rCashflow'), EXAMPLE_CASHFLOW);
  assert.equal(app.text('kRoe'), '0.79%');
});

test('BRRRR capitalised first arrangement fee is settled on refinance', () => {
  const app = calculator();
  app.example({ firstMortgageEnabled: true, firstCapitaliseArrangement: true });
  // £102,745 first debt includes £1,495 fee; initial cash £80,328.6583,
  // refinance proceeds £33,755, and remaining investment £46,573.6583.
  assert.equal(app.text('rTotalCost'), '£183 074');
  assert.equal(app.text('rInitialCash'), '£80 329');
  assert.equal(app.text('rRefinanceCash'), '£33 755');
  assert.equal(app.text('rCashNeeded'), '£46 574');
  assert.equal(app.text('rMortgage'), '£136 500');
  assert.equal(app.text('rCashflow'), EXAMPLE_CASHFLOW);
  assert.equal(app.text('kRoe'), '0.79%');
});

test('capitalised final arrangement fee increases debt, not refinance cash', () => {
  const app = calculator();
  app.example({ capitaliseArrangement: true });
  assert.equal(app.text('rTotalCost'), '£178 195');
  assert.equal(app.text('rInitialCash'), '£176 700');
  assert.equal(app.text('rRefinanceCash'), '£136 500');
  assert.equal(app.text('rMortgage'), '£137 995 (incl. £1 495 arrangement)');
  assert.equal(app.text('rCashNeeded'), '£40 200');
  assert.equal(app.text('rMortgagePay'), '£632.48');
  assert.equal(app.text('rCashflow'), '£23.67');
});

test('capitalising both fees repays first debt without treating the final fee as cash', () => {
  const app = calculator();
  app.example({
    firstMortgageEnabled: true,
    firstCapitaliseArrangement: true,
    capitaliseArrangement: true,
  });
  assert.equal(app.text('rTotalCost'), '£183 074');
  assert.equal(app.text('rInitialCash'), '£78 834');
  assert.equal(app.text('rRefinanceCash'), '£33 755');
  assert.equal(app.text('rCashNeeded'), '£45 079');
  assert.equal(app.text('rCashflow'), '£23.67');
});

test('fee-free first mortgage changes initial funding, not remaining equity', () => {
  const app = calculator();
  app.clean({
    price: 100000, duv: 120000, rent: 1000, ltv: 75, rate: 5,
    firstMortgageEnabled: true, firstLtv: 75,
  });
  assert.equal(app.text('rTotalCost'), '£100 000');
  assert.equal(app.text('rInitialCash'), '£25 000');
  assert.equal(app.text('rRefinanceCash'), '£15 000');
  assert.equal(app.text('rCashNeeded'), '£10 000');
  assert.equal(app.text('rCashflow'), '£625.00');
  assert.equal(app.text('kRoe'), '75.00%');
});

test('a refinance shortfall increases cash required instead of masquerading as a release', () => {
  const app = calculator();
  app.clean({
    price: 100000, duv: 80000, ltv: 75, rate: 5, rent: 1000,
    firstMortgageEnabled: true, firstLtv: 90,
  });
  assert.equal(app.text('rInitialCash'), '£10 000');
  assert.equal(app.text('rRefinanceCash'), '£-30 000');
  assert.equal(app.text('rCashNeeded'), '£40 000');
  assert.equal(app.text('rCashflow'), '£750.00');
  assert.equal(app.text('kRoe'), '22.50%');
});

for (const [label, price, duv, cashLeft] of [
  ['empty input', 0, 0, '—'],
  ['all cash recovered', 90000, 120000, '£0'],
  ['more cash recovered than invested', 80000, 120000, '£-10 000'],
]) {
  test(`ROE is N/A for ${label}, with stress only when deal inputs are complete`, () => {
    const app = calculator();
    app.clean({ price, duv, ltv: 75, rate: 5, rent: 1000 });
    assert.equal(app.text('rCashNeeded'), cashLeft);
    assert.equal(app.text('kRoe'), 'N/A');
    assert.equal(app.hasClass('kRoeBox', 'bad'), false);
    const rows = [...app.html('scenariosBody').matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, price > 0 ? 3 : 0);
    for (const [, row] of rows) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
      assert.equal(cells.at(-1)[1], 'N/A');
    }
  });
}

for (const [price, exactTax, shownTax] of [
  [300000, '0.00', '£0.00'],
  [500000, '10000.00', '£10 000.00'],
  [500001, '15000.05', '£15 000.05'],
  [625000, '21250.00', '£21 250.00'],
]) {
  test(`generic SDLT engine: first-time buyer at £${price} uses the £500,000 relief cap`, () => {
    const app = calculator();
    const tax = app.tax(price, 'ftb');
    assert.equal(tax.total.toFixed(2), exactTax);
    assert.ok(tax.breakdown.replace(/\u00a0/g, ' ').includes(`TOTAL: ${shownTax} (`));
    assert.match(tax.breakdown, price > 500000 ? /Standard bands/ : /First-time buyer relief/);
  });
}

test('generic SDLT engine: first-time buyers above the cap retain the non-resident surcharge', () => {
  const app = calculator();
  const tax = app.tax(500001, 'ftb', true);
  assert.equal(tax.total.toFixed(2), '25000.07');
  assert.ok(tax.breakdown.replace(/\u00a0/g, ' ').includes('TOTAL: £25 000.07 ('));
});

for (const [buyerType, nonResident, expected] of [
  ['main', false, '£15 000 (3.00%)'],
  ['additional', false, '£40 000 (8.00%)'],
  ['company', false, '£40 000 (8.00%)'],
  ['main', true, '£25 000 (5.00%)'],
  ['additional', true, '£50 000 (10.00%)'],
  ['company', true, '£50 000 (10.00%)'],
]) {
  test(`SDLT preserves ${buyerType} rates${nonResident ? ' with the non-resident surcharge' : ''}`, () => {
    const app = calculator();
    app.clean({ strategy: 'cash', price: 500000, buyerType, nonResident });
    assert.equal(app.text('rSdt'), expected);
  });
}

test('generic SDLT engine preserves eligible FTB non-resident rates', () => {
  assert.equal(calculator().tax(500000, 'ftb', true).total, 20000);
});

test('saved intentional zeros survive reload instead of becoming default fees', () => {
  const source = calculator();
  source.clean({ price: 100000, duv: 120000, ltv: 75, rent: 1000 });
  const saved = source.saved();
  const restored = calculator({ savedState: saved });
  assert.deepEqual(restored.saved(), saved);
  assert.equal(restored.text('rTotalCost'), '£100 000');
  assert.equal(restored.text('rCashNeeded'), '£10 000');
  assert.equal(restored.text('rCashflow'), '£1 000.00');
});

test('shared state overrides saved state and roundtrips inputs, flags and extra costs', () => {
  const source = calculator();
  source.example({
    firstMortgageEnabled: true, firstCapitaliseArrangement: true,
    capitaliseArrangement: true, nonResident: true, rate: 6.25,
    fixedPeriod: '10', firstFixedPeriod: '3', strategy: 'brrr',
    insurance: 0, structuralSurvey: 0, companyCosts: 0,
    holdingCosts: 333, exitFee: 777.2,
  });
  source.addExtraCost("Owner's EPC & gas – Łódź 🔑", 325.75);
  const restored = calculator({
    savedState: { price: 999999, strategy: 'cash' },
    hash: source.shareHash(),
  });
  assert.deepEqual(restored.saved(), source.saved());
  for (const id of ['rTotalCost', 'rInitialCash', 'rRefinanceCash', 'rCashNeeded', 'rCashflow', 'kRoe']) {
    assert.equal(restored.text(id), source.text(id), `Shared result ${id}`);
  }
});

test('extra labels containing share delimiters and HTML characters roundtrip verbatim', () => {
  const source = calculator();
  source.example();
  source.addExtraCost('Survey ~ gas || EPC: "approved" <roof> 50% £', 150.25);
  const restored = calculator({ hash: source.shareHash() });
  assert.deepEqual(restored.saved()._extraCosts, source.saved()._extraCosts);
  assert.equal(restored.text('rTotalCost'), source.text('rTotalCost'));
});

// Deliberately freeze the original v2 positional schema here. Reading FIELDS
// from the application would hide accidental reordering when new fields append.
test('original v2 links preserve every numeric position when new fields are added', () => {
  const legacyNumbers = {
    price: 140000, refurb: 22000, legal: 3001, sourcing: 4002, pmFee: 5003,
    structuralSurvey: 1004, duv: 190000, ltv: 70, rate: 4.75,
    arrangementFee: 1496, bookingFee: 151, valuationFee: 352, brokerFee: 503,
    mortgageLegalFee: 504, refurbMonths: 6, firstLtv: 65, firstRate: 6.25,
    firstArrangementFee: 1501, firstBookingFee: 152, firstValuationFee: 353,
    firstBrokerFee: 505, firstMortgageLegalFee: 506, rent: 1100, mgmt: 11,
    insurance: 27, maintenance: 6, voids: 9, companyCosts: 86, otherCosts: 12,
  };
  const payload = `v2~${Object.values(legacyNumbers).join('|')}~0|3|1|3~7~EPC:125.5~r`;
  const restored = calculator({ hash: '#d=' + Buffer.from(payload).toString('base64url') });
  const saved = restored.saved();
  for (const [field, value] of Object.entries(legacyNumbers)) {
    assert.equal(Number(saved[field]), value, `Legacy field ${field}`);
  }
  assert.equal(saved.strategy, 'brrr');
  assert.equal(saved.fixedPeriod, '10');
  assert.equal(saved.firstFixedPeriod, '3');
  assert.equal(saved.buyerType, 'company');
  assert.equal(saved.capitaliseArrangement, true);
  assert.equal(saved.firstMortgageEnabled, true);
  assert.equal(saved.firstCapitaliseArrangement, true);
  assert.equal(saved.nonResident, false);
  assert.deepEqual(saved._extraCosts, [{ label: 'EPC', amount: 125.5 }]);
  assert.equal(Number(saved.holdingCosts), 0);
  assert.equal(Number(saved.exitFee), 0);
});

test('legacy JSON share links and brrrEnabled state still load', () => {
  const legacy = {
    price: 100000, duv: 120000, rent: 1000, insurance: 0,
    buyerType: 'main', brrrEnabled: false,
    _extraCosts: [{ label: "Owner's EPC", amount: 99 }],
  };
  const restored = calculator({ hash: '#data=' + Buffer.from(JSON.stringify(legacy)).toString('base64') });
  assert.equal(restored.saved().strategy, 'btl');
  assert.equal(restored.saved().price, 100000);
  assert.equal(restored.saved().insurance, 0);
  assert.deepEqual(restored.saved()._extraCosts, legacy._extraCosts);
  assert.equal(restored.hidden('rInitialCashRow'), true);
});

for (const [label, hash] of [
  ['invalid base64', '#d=%not-base64'],
  ['unknown version', '#d=' + Buffer.from('v99~100000').toString('base64url')],
  ['malformed select escape', '#d=' + Buffer.from('v2~~%ZZ').toString('base64url')],
  ['malformed extra-label escape', '#d=' + Buffer.from('v2~~~0~%ZZ:100').toString('base64url')],
  ['invalid legacy JSON', '#data=' + Buffer.from('{broken').toString('base64')],
]) {
  test(`corrupt shared URL (${label}) safely falls back to saved inputs`, () => {
    const source = calculator();
    source.example({ rent: 1150 });
    const restored = calculator({ hash, savedState: source.saved() });
    assert.deepEqual(restored.saved(), source.saved());
    assert.equal(restored.text('rCashflow'), source.text('rCashflow'));
  });
}

test('corrupt saved JSON falls back to defaults and permits live editing', () => {
  const restored = calculator({ rawStorage: '{not valid JSON' });
  const defaults = calculator();
  assert.deepEqual(restored.saved(), defaults.saved());
  restored.input('price', '125 000');
  assert.equal(restored.saved().price, 125000);
  assert.equal(restored.text('rSdt'), '£6 250 (5.00%)');
});

for (const strategy of ['cash', 'btl', 'brrr']) {
  test(`${strategy} counts pre-let holding costs once, outside ongoing monthly cashflow`, () => {
    const baseline = calculator();
    baseline.clean({ strategy, price: 100000, duv: 120000, ltv: 75, rent: 1000 });
    const app = calculator();
    app.clean({ strategy, price: 100000, duv: 120000, ltv: 75, rent: 1000, holdingCosts: 1800 });
    assert.equal(app.text('rTotalCost'), '£101 800');
    const cashNeeded = { cash: '£101 800', btl: '£26 800', brrr: '£11 800' };
    assert.equal(app.text('rCashNeeded'), cashNeeded[strategy]);
    assert.equal(app.text('rCashflow'), baseline.text('rCashflow'));
    assert.equal(app.text('rMortgage'), baseline.text('rMortgage'));
  });
}

test('BRRRR first-finance exit fee increases project and cash costs without increasing debt', () => {
  const app = calculator();
  app.clean({
    price: 100000, duv: 120000, ltv: 75, rent: 1000,
    firstMortgageEnabled: true, firstLtv: 75, holdingCosts: 1800, exitFee: 2500,
  });
  assert.equal(app.text('rTotalCost'), '£104 300');
  assert.equal(app.text('rInitialCash'), '£29 300');
  assert.equal(app.text('rRefinanceCash'), '£15 000');
  assert.equal(app.text('rCashNeeded'), '£14 300');
  assert.equal(app.text('rMortgage'), '£90 000');
  assert.equal(app.text('rCashflow'), '£1 000.00');
});

for (const strategy of ['cash', 'btl', 'brrr']) {
  test(`${strategy} ignores first-finance exit fee when no first finance is active`, () => {
    const app = calculator();
    app.clean({
      strategy, price: 100000, duv: 120000, ltv: 75,
      firstMortgageEnabled: strategy !== 'brrr', firstLtv: 75, exitFee: 2500,
    });
    assert.equal(app.text('rTotalCost'), '£100 000');
  });
}

for (const buyerType of ['main', 'additional', 'company']) {
  test(`${buyerType} SDLT surcharges start at £40,000, not one penny below`, () => {
    const app = calculator();
    assert.equal(app.tax(39999.99, buyerType, true).total, 0);
    assert.equal(app.tax(40000, buyerType, true).total, buyerType === 'main' ? 800 : 2800);
    assert.equal(app.tax(40000, buyerType, false).total, buyerType === 'main' ? 0 : 2000);
  });
}

test('BTL app migrates legacy first-time-buyer relief to standard bands', () => {
  const app = calculator({ savedState: { buyerType: 'ftb', price: 300000, strategy: 'cash' } });
  assert.equal(app.saved().buyerType, 'main');
  assert.equal(app.text('rSdt'), '£5 000 (1.67%)');
  app.clean({ buyerType: 'ftb', price: 300000, strategy: 'brrr' });
  assert.equal(app.saved().buyerType, 'main');
  assert.equal(app.text('rSdt'), '£5 000 (1.67%)');
  const legacy = calculator({
    hash: '#d=' + Buffer.from('v2~300000~0|2|0|2~0~~c').toString('base64url'),
  });
  assert.equal(legacy.saved().buyerType, 'main');
  assert.equal(legacy.text('rSdt'), '£5 000 (1.67%)');
});

test('non-object saved JSON values safely fall back to defaults', () => {
  const defaults = calculator().saved();
  for (const savedState of [null, [], true, 42, 'not a state']) {
    assert.deepEqual(calculator({ savedState }).saved(), defaults);
  }
});

test('invalid saved numbers, selections and flags cannot poison the calculation', () => {
  const app = calculator({ savedState: {
    price: 'bad input', rate: 'Infinity', ltv: 'NaN', strategy: 'unrecognised',
    buyerType: '<script>', nonResident: 'false', firstMortgageEnabled: 'false',
  } });
  const defaults = calculator();
  assert.deepEqual(app.saved(), defaults.saved());
  assert.equal(app.text('rCashNeeded'), defaults.text('rCashNeeded'));
});

for (const value of ['1 234,56', '1,234.56', '1234,56']) {
  test(`live currency input accepts ${JSON.stringify(value)} without multiplying its value`, () => {
    const app = calculator();
    app.clean({ strategy: 'cash' });
    app.input('price', value);
    assert.equal(app.saved().price, 1234.56);
    assert.equal(app.text('rTotalCost'), '£1 235');
  });
}

test('stress cases use the selected rate and +1 / +2 percentage-point changes', () => {
  const app = calculator();
  app.example({ rate: 5.5 });
  const rows = [...app.html('scenariosBody').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
  assert.equal(rows.length, 3);
  const rateCells = rows.map(([, row]) => row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/)[1]);
  for (let i = 0; i < rateCells.length; i += 1) {
    assert.match(rateCells[i], new RegExp(`${5.5 + i}%`));
  }
});

test('stressed rates are labelled without floating-point noise', () => {
  const app = calculator();
  // 3.89 + 1 is 4.890000000000001 in binary floating point
  app.example({ rate: 3.89 });
  const labels = [...app.html('scenariosBody').matchAll(/<strong>([^<]*)<\/strong>/g)].map(([, label]) => label);
  assert.deepEqual(labels, ['3.89% · current', '4.89% · +1 pp', '5.89% · +2 pp']);
});

test('cashflow cards match the current and +2 pp stress rows to the penny', () => {
  const app = calculator();
  app.example();
  const rows = [...app.html('scenariosBody').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
  assert.equal(rows.length, 3);
  const monthlyCashflows = rows.map(([, row]) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
    return cells[2][1].replace(/\u00a0/g, ' ');
  });
  assert.equal(app.text('rCashflow'), monthlyCashflows[0]);
  assert.equal(app.text('rStressCashflow'), monthlyCashflows[2] + ' / m');
});

test('cash left equals total project cost less final debt regardless of fee capitalisation', () => {
  const money = text => Number(text.match(/^£([\d ,.\-]+)/)[1].replace(/[ ,]/g, ''));
  for (const firstCapitaliseArrangement of [false, true]) {
    for (const capitaliseArrangement of [false, true]) {
      const app = calculator();
      app.example({
        firstMortgageEnabled: true, firstCapitaliseArrangement, capitaliseArrangement,
        holdingCosts: 1600, exitFee: 750,
      });
      const expected = money(app.text('rTotalCost')) - money(app.text('rMortgage'));
      assert.ok(Math.abs(money(app.text('rCashNeeded')) - expected) <= 1,
        `Cost/debt/cash invariant, first fee capitalised=${firstCapitaliseArrangement}, final=${capitaliseArrangement}`);
    }
  }
});

for (const [label, overrides] of [
  ['missing purchase price', { price: 0 }],
  ['missing rent', { rent: 0 }],
  ['missing refinance valuation', { duv: 0 }],
]) {
  test(`${label} suppresses returns and stress estimates until completed`, () => {
    const app = calculator();
    app.example(overrides);
    for (const id of ['rCashflow', 'rCashflowYear', 'rStressCashflow']) {
      assert.equal(app.text(id), '—', `Incomplete deal result ${id}`);
    }
    assert.equal(app.text('kRoe'), 'N/A');
    assert.equal(app.html('scenariosBody'), '');
    if ('duv' in overrides) {
      for (const id of ['rMortgage', 'rMortgagePay', 'rRefinanceCash', 'rCashNeeded']) {
        assert.equal(app.text(id), '—', `Missing valuation result ${id}`);
      }
    }
  });
}

test('a negative custom cost cannot create apparently valid returns or finance figures', () => {
  const app = calculator();
  app.example();
  app.addExtraCost('Pasted invalid cost', -500);
  assert.match(app.text('dealStatus'), /cannot be negative/);
  for (const id of ['rCashflow', 'rTotalCost', 'rInitialCash', 'rRefinanceCash', 'rMortgage', 'rCashNeeded']) {
    assert.equal(app.text(id), '—', `Invalid extra-cost result ${id}`);
  }
  assert.equal(app.text('kRoe'), 'N/A');
  assert.equal(app.html('scenariosBody'), '');
});

test('a first mortgage LTV above 100% masks funding and refinance results', () => {
  const app = calculator();
  app.example({ firstMortgageEnabled: true });
  app.input('firstLtv', '120');
  assert.match(app.text('dealStatus'), /between 0 and 100/);
  for (const id of ['rCashflow', 'rInitialCash', 'rRefinanceCash', 'rMortgage', 'rCashNeeded']) {
    assert.equal(app.text(id), '—', `Invalid first-LTV result ${id}`);
  }
  assert.equal(app.text('kRoe'), 'N/A');
  assert.equal(app.html('scenariosBody'), '');
});

// A sourcing offer keyed into the calculator: £60k purchase, £30k refurb, £97k DUV, £750 rent,
// company buyer, 75% refinance at 4.5%, sourcing and project management fees entered.
const SOURCED_DEAL = '#d=' + Buffer.from(
  'v2~60000|30000|2500|4250|4000||97000||4.5|900|250||700|2500|15|70||2000|20000||||750||||5||||~||2|3~0',
).toString('base64url');
const pounds = text => Number(text.match(/^£([\d ,.\-]+)/)[1].replace(/[ ,]/g, ''));
const FUNDING_LINES = ['rFbPrice', 'rFbRefurb', 'rSdt', 'rFbLegal', 'rFbSourcing', 'rFbPm', 'rFbOther', 'rFbFinance'];

test('funding breakdown itemises the total investment cost of a sourced BRRR deal', () => {
  const app = calculator({ hash: SOURCED_DEAL });
  const expected = {
    rFbPrice: '£60 000', rFbRefurb: '£30 000', rSdt: '£3 000 (5.00%)', rFbLegal: '£2 500',
    rFbSourcing: '£4 250', rFbPm: '£4 000', rFbOther: '£1 000', rFbFinance: '£4 700',
    rTotalCost: '£109 450', rMortgage: '£72 750', rInitialCash: '£109 450', rCashNeeded: '£36 700',
  };
  for (const [id, value] of Object.entries(expected)) assert.equal(app.text(id), value, id);
  for (const id of FUNDING_LINES) assert.equal(app.hasClass(id, 'hidden'), false, `${id} is shown`);
  assert.equal(app.text('rCashflow'), '£217.19');
  assert.equal(app.text('kRoe'), '7.10%');
});

test('funding lines add up to the total investment cost with both loans and capitalised fees', () => {
  for (const firstCapitaliseArrangement of [false, true]) {
    for (const capitaliseArrangement of [false, true]) {
      const app = calculator();
      app.example({
        price: 100000, firstMortgageEnabled: true, firstLtv: 60, firstRate: 6, refurbMonths: 5,
        firstArrangementFee: 1200, arrangementFee: 1500, firstCapitaliseArrangement, capitaliseArrangement,
        holdingCosts: 1600, exitFee: 750,
      });
      app.addExtraCost('EPC', 250);
      const lines = FUNDING_LINES.map(id => pounds(app.text(id)));
      const total = lines.reduce((sum, value) => sum + value, 0);
      assert.ok(Math.abs(total - pounds(app.text('rTotalCost'))) <= 1,
        `Funding lines ${lines.join(' + ')} for capitalised first=${firstCapitaliseArrangement}, final=${capitaliseArrangement}`);
      assert.equal(app.text('rFbOther'), '£2 850');
    }
  }
});

test('empty optional cost lines are hidden in the funding breakdown', () => {
  const app = calculator();
  app.clean({ price: 100000, duv: 120000, ltv: 75, rent: 1000 });
  assert.equal(app.text('rFbPrice'), '£100 000');
  assert.equal(app.text('rSdt'), '£0 (0.00%)');
  for (const id of ['rFbRefurb', 'rFbLegal', 'rFbSourcing', 'rFbPm', 'rFbOther', 'rFbFinance']) {
    assert.equal(app.hasClass(id, 'hidden'), true, `${id} is hidden when empty`);
  }
});

test('incomplete or invalid deals do not show core returns', () => {
  const noRent = calculator();
  noRent.example({ rent: 0 });
  assert.equal(noRent.text('kRoe'), 'N/A');
  assert.equal(noRent.text('rCashflow'), '—');
  const noValue = calculator();
  noValue.example({ duv: 0 });
  assert.equal(noValue.text('rCashNeeded'), '—');
  assert.equal(noValue.text('kRoe'), 'N/A');
  const invalid = calculator();
  invalid.example();
  invalid.addExtraCost('Pasted invalid cost', -500);
  for (const id of ['rTotalCost', 'rCashNeeded', 'rFbOther', 'rFbFinance']) {
    assert.equal(invalid.text(id), '—', id);
  }
  assert.equal(invalid.text('kRoe'), 'N/A');
});
