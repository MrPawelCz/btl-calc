const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// The example's exact £30.525 monthly cashflow lands just below the half-penny
// in binary floating point. Preserve the existing formatter's £30.52 output.
const EXAMPLE_CASHFLOW = '£30.52';

// This intentionally runs the shipped inline script, not a copy of its maths.
// Only the DOM/storage APIs needed for boot and rendering are stubbed.
function calculator() {
  const elements = new Map();
  const radios = [];
  const options = [];

  function element(tagName, attributes = '') {
    const attr = name => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    const classes = new Set();
    let value = attr('value') ?? '';
    return {
      tagName: tagName.toUpperCase(),
      type: attr('type') ?? '',
      get value() { return value; },
      set value(next) { value = String(next); },
      checked: /\bchecked\b/.test(attributes),
      dataset: {
        ...(/\bdata-num\b/.test(attributes) ? { num: '' } : {}),
        ...(attr('data-strategy') ? { strategy: attr('data-strategy') } : {}),
      },
      style: {},
      textContent: '',
      innerHTML: '',
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        toggle(name, enabled) {
          if (enabled ?? !classes.has(name)) classes.add(name);
          else classes.delete(name);
        },
        contains(name) { return classes.has(name); },
      },
      closest() { return this; },
      addEventListener() {},
      querySelectorAll() { return []; },
      appendChild() {},
    };
  }

  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const [, tagName, attributes] = match;
    const node = element(tagName, attributes);
    const id = attributes.match(/\bid="([^"]*)"/)?.[1];
    if (id) elements.set(id, node);
    if (/\bname="strategy"/.test(attributes)) radios.push(node);
    if (/\bdata-strategy="/.test(attributes)) options.push(node);
  }

  const storage = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) { return elements.get(id) ?? null; },
      querySelector(selector) {
        assert.equal(selector, 'input[name="strategy"]:checked');
        return radios.find(radio => radio.checked) ?? null;
      },
      querySelectorAll(selector) {
        if (selector === 'input[name="strategy"]') return radios;
        if (selector === '.strategy-opt') return options;
        throw new Error(`Unexpected document selector: ${selector}`);
      },
      createElement: element,
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    location: { hash: '' },
    window: { addEventListener() {} },
  });
  vm.runInContext(script, context, { filename: 'index.html' });

  return {
    example(overrides = {}) {
      context.overrides = overrides;
      vm.runInContext('applyValues({ ...EXAMPLE, ...overrides })', context);
    },
    clean(overrides = {}) {
      context.overrides = overrides;
      vm.runInContext(`applyValues({
        ...DEFAULTS,
        ...Object.fromEntries(FIELDS.map(field => [field, 0])),
        buyerType: 'main', strategy: 'brrr', ...overrides,
      })`, context);
    },
    text(id) {
      assert.ok(elements.has(id), `Expected an actual HTML element with id="${id}"`);
      return elements.get(id).textContent.replace(/\u00a0/g, ' ');
    },
    html(id) { return elements.get(id).innerHTML; },
    hasClass(id, name) { return elements.get(id).classList.contains(name); },
    hidden(id) { return elements.get(id).hidden; },
  };
}

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
  assert.equal(app.text('rTotalCost'), '£176 700');
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
  assert.equal(app.text('rTotalCost'), '£181 579');
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
  ['empty input', 0, 0, '£0'],
  ['all cash recovered', 90000, 120000, '£0'],
  ['more cash recovered than invested', 80000, 120000, '£-10 000'],
]) {
  test(`ROE is N/A for ${label}, including all six rate scenarios`, () => {
    const app = calculator();
    app.clean({ price, duv, ltv: 75, rate: 5, rent: 1000 });
    assert.equal(app.text('rCashNeeded'), cashLeft);
    assert.equal(app.text('kRoe'), 'N/A');
    assert.equal(app.hasClass('kRoeBox', 'bad'), false);
    const rows = [...app.html('scenariosBody').matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
    assert.equal(rows.length, 6);
    for (const [, row] of rows) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
      assert.equal(cells.at(-1)[1], 'N/A');
    }
  });
}

for (const [price, expected, exactTax] of [
  [300000, '£0 (0.00%)', '0.00'],
  [500000, '£10 000 (2.00%)', '10000.00'],
  [500001, '£15 000 (3.00%)', '15000.05'],
  [625000, '£21 250 (3.40%)', '21250.00'],
]) {
  test(`first-time buyer SDLT at £${price} uses the £500,000 relief cap`, () => {
    const app = calculator();
    app.clean({ strategy: 'cash', buyerType: 'ftb', price });
    assert.equal(app.text('rSdt'), expected);
    assert.ok(app.text('sdtBreakdown').includes(`TOTAL: £${exactTax} (`));
    assert.match(app.text('sdtBreakdown'), price > 500000 ? /Standard bands/ : /First-time buyer relief/);
  });
}

test('first-time buyers above the cap retain the non-resident surcharge after fallback', () => {
  const app = calculator();
  app.clean({ strategy: 'cash', price: 500001, buyerType: 'ftb', nonResident: true });
  assert.ok(app.text('sdtBreakdown').includes('TOTAL: £25000.07 ('));
});

for (const [buyerType, nonResident, expected] of [
  ['main', false, '£15 000 (3.00%)'],
  ['additional', false, '£40 000 (8.00%)'],
  ['company', false, '£40 000 (8.00%)'],
  ['main', true, '£25 000 (5.00%)'],
  ['additional', true, '£50 000 (10.00%)'],
  ['company', true, '£50 000 (10.00%)'],
  ['ftb', true, '£20 000 (4.00%)'],
]) {
  test(`SDLT preserves ${buyerType} rates${nonResident ? ' with the non-resident surcharge' : ''}`, () => {
    const app = calculator();
    app.clean({ strategy: 'cash', price: 500000, buyerType, nonResident });
    assert.equal(app.text('rSdt'), expected);
  });
}
