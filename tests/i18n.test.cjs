const assert = require('node:assert/strict');
const test = require('node:test');
const { calculator, html, scripts, staticTexts } = require('./harness.cjs');

const dictionary = calculator().dictionary();
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

test('English and Polish dictionaries cover the same keys with real text', () => {
  assert.deepEqual(Object.keys(dictionary.pl).sort(), Object.keys(dictionary.en).sort());
  for (const lang of ['en', 'pl']) {
    for (const [key, text] of Object.entries(dictionary[lang])) {
      assert.equal(typeof text, 'string', `${lang} ${key}`);
      assert.ok(text.trim() !== '', `${lang} ${key} must not be empty`);
    }
  }
});

test('both languages use the same placeholders in every text', () => {
  for (const key of Object.keys(dictionary.en)) {
    assert.deepEqual(placeholders(dictionary.pl[key]), placeholders(dictionary.en[key]), key);
  }
});

test('the page as written matches the English dictionary for every translatable text', () => {
  assert.ok(staticTexts.length > 100, 'The page marks its texts for translation');
  assert.equal(staticTexts.length, html.match(/\bdata-i18n="/g).length);
  for (const { key, text, leaf } of staticTexts) {
    assert.ok(key in dictionary.en, `Unknown translation key "${key}" in index.html`);
    assert.equal(text, dictionary.en[key], `index.html text for "${key}"`);
    assert.ok(leaf, `Element for "${key}" must contain text only`);
  }
  for (const [, key] of html.matchAll(/\bdata-i18n-[a-z-]+="([^"]+)"/g)) {
    assert.ok(key in dictionary.en, `Unknown attribute translation key "${key}"`);
  }
});

test('every translation key used by the calculator exists', () => {
  const source = scripts.find(script => script.file === 'calculator.js').source;
  const keys = [...source.matchAll(/\b(?:t|notifyUser)\('([^']+)'\s*[,)]/g)].map(([, key]) => key);
  assert.ok(keys.length > 60, 'The calculator renders its texts through the dictionary');
  for (const key of keys) assert.ok(key in dictionary.en, `Unknown translation key "${key}" in calculator.js`);
  for (const key of ['print.strategy.cash', 'print.strategy.btl', 'print.strategy.brrr',
    'buyer.additional', 'buyer.company', 'buyer.main']) {
    assert.ok(key in dictionary.en, key);
  }
});

test('English is the default language', () => {
  const app = calculator();
  app.example();
  assert.equal(app.language(), 'en');
  assert.equal(app.title(), 'BTL Calculator — Your property, in numbers');
  assert.equal(app.attr('langEn', 'aria-pressed'), 'true');
  assert.equal(app.attr('langPl', 'aria-pressed'), 'false');
  assert.equal(app.stored('btlcalc:lang'), null);
  for (const { key, text } of app.translated()) assert.equal(text, dictionary.en[key], key);
  assert.equal(app.text('rCashNeededLabel'), 'Cash left in deal');
  assert.equal(app.text('rCashflow'), '£30.52');
  assert.equal(app.text('kRoe'), '0.88%');
});

test('switching to Polish translates the page, the results and the number format', () => {
  const app = calculator();
  app.example();
  app.click('langPl');
  assert.equal(app.language(), 'pl');
  assert.equal(app.title(), 'Kalkulator BTL — Twoja nieruchomość w liczbach');
  assert.equal(app.attr('langEn', 'aria-pressed'), 'false');
  assert.equal(app.attr('langPl', 'aria-pressed'), 'true');
  assert.equal(app.stored('btlcalc:lang'), 'pl');
  for (const { key, text } of app.translated()) assert.equal(text, dictionary.pl[key], key);
  assert.equal(app.text('dealHeading'), 'Twoja nieruchomość');
  assert.equal(app.text('loadExample'), 'Wczytaj przykład');
  assert.equal(app.text('rCashNeededLabel'), 'Gotówka w inwestycji');
  assert.equal(app.text('rCompareCashLabel'), 'Gotówka w inwestycji');
  assert.equal(app.text('rCompareSummary'), 'Jak w ofercie: £165 950 · ROE 15,05% · yield 8,84%');
  assert.equal(app.text('strategyHint'), dictionary.pl['strategy.brrr.description']);
  assert.equal(app.text('dealStatus'), dictionary.pl['status.stress']);
  // Same figures, Polish decimal comma
  assert.equal(app.text('rCashflow'), '£30,52');
  assert.equal(app.text('rCashNeeded'), '£41 695');
  assert.equal(app.text('kRoe'), '0,88%');
  assert.equal(app.text('rSdt'), '£6 950 (5,15%)');
  assert.equal(app.text('sdtHint'), 'efektywnie 5,15% ceny zakupu');
  assert.equal(app.text('acquisitionCostsSummary'), '£19 200 z SDLT');
  assert.match(app.text('sdtBreakdown'), /^Stawki standardowe:/);
  assert.match(app.text('sdtBreakdown'), /RAZEM: £6 950,00 \(efektywnie 5,15%\)$/);
  assert.match(app.html('scenariosBody'), /<strong>5,5% · obecna<\/strong>/);
  assert.match(app.html('scenariosBody'), /<strong>7,5% · \+2 pp<\/strong>/);
});

test('switching back to English restores every text', () => {
  const app = calculator();
  app.example();
  const english = { status: app.text('dealStatus'), breakdown: app.text('sdtBreakdown'), rows: app.html('scenariosBody') };
  app.click('langPl');
  app.click('langEn');
  assert.equal(app.language(), 'en');
  assert.equal(app.stored('btlcalc:lang'), 'en');
  for (const { key, text } of app.translated()) assert.equal(text, dictionary.en[key], key);
  assert.equal(app.text('dealStatus'), english.status);
  assert.equal(app.text('sdtBreakdown'), english.breakdown);
  assert.equal(app.html('scenariosBody'), english.rows);
  assert.equal(app.text('rCashflow'), '£30.52');
});

test('a saved Polish preference is applied on load', () => {
  const app = calculator({ lang: 'pl' });
  assert.equal(app.language(), 'pl');
  assert.equal(app.attr('langPl', 'aria-pressed'), 'true');
  assert.equal(app.text('resultsHeading'), 'Inwestycja w skrócie');
  assert.equal(app.text('dealStatus'), dictionary.pl['status.start']);
  assert.equal(app.text('kRoe'), 'n/d');
});

test('an unknown saved language falls back to English', () => {
  const app = calculator({ lang: 'de' });
  assert.equal(app.language(), 'en');
  assert.equal(app.text('resultsHeading'), 'The deal at a glance');
});

test('language changes neither the saved deal nor the share link', () => {
  const english = calculator();
  english.example({ insurance: 25.5, exitFee: 777.2, firstMortgageEnabled: true });
  english.addExtraCost('EPC', 125.75);
  const polish = calculator({ lang: 'pl' });
  polish.example({ insurance: 25.5, exitFee: 777.2, firstMortgageEnabled: true });
  polish.addExtraCost('EPC', 125.75);
  assert.deepEqual(polish.saved(), english.saved());
  assert.equal(polish.shareHash(), english.shareHash());
  const restored = calculator({ lang: 'pl', hash: english.shareHash() });
  assert.deepEqual(restored.saved(), english.saved());
  assert.equal(restored.text('rCashNeeded'), english.text('rCashNeeded'));
});

test('typed amounts follow the decimal separator of the language', () => {
  const app = calculator();
  app.example({ insurance: 25.5, price: 135000 });
  assert.equal(app.value('insurance'), '25.5');
  assert.equal(app.value('price'), '135 000');
  app.click('langPl');
  assert.equal(app.value('insurance'), '25,5');
  assert.equal(app.value('price'), '135 000');
  assert.equal(app.value('stampDuty'), '6 950');
  assert.equal(app.saved().insurance, 25.5);
  app.input('rent', '1 050,75');
  assert.equal(app.saved().rent, 1050.75);
  assert.equal(app.text('rRent'), '£1 050,75 / mc');
  app.click('langEn');
  assert.equal(app.value('insurance'), '25.5');
  assert.equal(app.saved().insurance, 25.5);
  assert.equal(app.text('rRent'), '£1 050.75 / m');
});

test('notices and the print summary follow the language', () => {
  const app = calculator({ hash: '#d=%not-base64' });
  app.example();
  assert.equal(app.text('actionStatus'), dictionary.en['notice.badLink']);
  app.click('langPl');
  assert.equal(app.text('actionStatus'), dictionary.pl['notice.badLink']);
  const summary = app.printSummary();
  assert.match(summary, /<h3>Kalkulator BTL - v[\d.]+<\/h3>/);
  assert.match(summary, /<dt>Strategia<\/dt><dd>BRRR \(kup, wyremontuj, wynajmij, refinansuj\)<\/dd>/);
  assert.match(summary, /<dt>Rodzaj kupującego<\/dt><dd>Spółka Ltd \/ SPV · działalność najmu<\/dd>/);
  assert.match(summary, /<dt>Cena zakupu<\/dt><dd>£135 000<\/dd>/);
  assert.match(summary, /<dt>Kredyt<\/dt><dd>75% LTV, 5,5% interest-only<\/dd>/);
  app.click('langEn');
  const english = app.printSummary();
  assert.match(english, /<h3>BTL Calculator - v[\d.]+<\/h3>/);
  assert.match(english, /<dt>Value after refurb \(DUV\)<\/dt><dd>£182 000<\/dd>/);
  assert.match(english, /<dt>Mortgage<\/dt><dd>75% LTV @ 5.5% interest-only<\/dd>/);
});
