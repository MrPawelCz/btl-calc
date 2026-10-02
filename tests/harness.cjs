const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const root = join(__dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
// The page's own scripts in document order: translations first, then the calculator.
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
  .map(([, src]) => src.split(/[?#]/)[0])
  .map(file => ({ file, source: readFileSync(join(root, file), 'utf8') }));
assert.ok(scripts.length > 0, 'The page must load the calculator script');

const decode = text => text
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const camel = name => name.replace(/-([a-z0-9])/g, (match, char) => char.toUpperCase());

// Text the page shows before any script runs, by translation key. `leaf` is false when
// the element holds more than text, which a translation would overwrite.
const staticTexts = [...html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([^<]*)/gi)]
  .map(match => ({
    key: match[2],
    text: decode(match[3]),
    leaf: html.startsWith(`</${match[1]}>`, match.index + match[0].length),
  }));

// This intentionally runs the scripts loaded by the page, not a copy of their maths.
// Only the DOM/storage APIs needed for boot and rendering are stubbed.
function calculator({ savedState, rawStorage, hash = '', lang } = {}) {
  const elements = new Map();
  const all = [];
  const radios = [];
  const options = [];

  function element(tagName, attributes = '', text = '') {
    const attr = name => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    const classes = new Set();
    const listeners = new Map();
    const changed = new Map();
    const dataset = {};
    for (const [, name, value] of attributes.matchAll(/\bdata-([a-z0-9-]+)(?:="([^"]*)")?/g)) {
      dataset[camel(name)] = decode(value ?? '');
    }
    let value = attr('value') ?? '';
    return {
      tagName: tagName.toUpperCase(),
      type: attr('type') ?? '',
      get value() { return value; },
      set value(next) { value = String(next); },
      checked: /\bchecked\b/.test(attributes),
      dataset,
      style: {},
      children: [],
      textContent: decode(text),
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
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(callback);
      },
      dispatchEvent(event) {
        event.target ??= this;
        event.currentTarget ??= this;
        for (const callback of listeners.get(event.type) ?? []) callback(event);
      },
      querySelectorAll() { return []; },
      appendChild(child) { this.children.push(child); },
      setAttribute(name, next) { changed.set(name, String(next)); },
      getAttribute(name) { return changed.get(name) ?? attr(name) ?? null; },
    };
  }

  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>([^<]*)/gi)) {
    const [, tagName, attributes, text] = match;
    const node = element(tagName, attributes, text);
    all.push(node);
    const id = attributes.match(/\bid="([^"]*)"/)?.[1];
    if (id) elements.set(id, node);
    if (/\bname="strategy"/.test(attributes)) radios.push(node);
    if (/\bdata-strategy="/.test(attributes)) options.push(node);
  }
  const documentElement = all.find(node => node.tagName === 'HTML');
  documentElement.lang = documentElement.getAttribute('lang');

  const storage = new Map();
  if (rawStorage !== undefined) storage.set('btlcalc:v1', rawStorage);
  else if (savedState !== undefined) storage.set('btlcalc:v1', JSON.stringify(savedState));
  if (lang !== undefined) storage.set('btlcalc:lang', lang);
  const context = vm.createContext({
    document: {
      documentElement,
      title: html.match(/<title>([^<]*)<\/title>/)[1],
      getElementById(id) { return elements.get(id) ?? null; },
      querySelector(selector) {
        assert.equal(selector, 'input[name="strategy"]:checked');
        return radios.find(radio => radio.checked) ?? null;
      },
      querySelectorAll(selector) {
        if (selector === 'input[name="strategy"]') return radios;
        if (selector === '.strategy-opt') return options;
        const dataAttribute = selector.match(/^\[data-([a-z0-9-]+)\]$/)?.[1];
        if (dataAttribute) return all.filter(node => camel(dataAttribute) in node.dataset);
        throw new Error(`Unexpected document selector: ${selector}`);
      },
      createElement: element,
    },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    location: { hash, origin: 'https://calculator.example', pathname: '/' },
    window: { addEventListener() {} },
    btoa,
    atob,
    setTimeout,
    clearTimeout,
  });
  for (const { file, source } of scripts) vm.runInContext(source, context, { filename: file });

  const node = id => {
    assert.ok(elements.has(id), `Expected an actual HTML element with id="${id}"`);
    return elements.get(id);
  };
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
    text(id) { return node(id).textContent.replace(/ /g, ' '); },
    value(id) { return node(id).value; },
    attr(id, name) { return node(id).getAttribute(name); },
    html(id) { return elements.get(id).innerHTML; },
    hasClass(id, name) { return elements.get(id).classList.contains(name); },
    hidden(id) { return elements.get(id).hidden; },
    tax(price, buyerType, nonResident = false) {
      return context.calcStampDuty(price, buyerType, nonResident);
    },
    saved() { return JSON.parse(storage.get('btlcalc:v1')); },
    stored(key) { return storage.get(key) ?? null; },
    shareHash() { return '#d=' + vm.runInContext('encodeShareState()', context); },
    addExtraCost(label, amount) {
      context.extraLabel = label;
      context.extraAmount = amount;
      vm.runInContext('addExtraCost(extraLabel, extraAmount)', context);
    },
    input(id, value) {
      node(id).value = value;
      node(id).dispatchEvent({ type: 'input' });
    },
    click(id) { node(id).dispatchEvent({ type: 'click' }); },
    // Language-dependent page state
    language() { return documentElement.lang; },
    title() { return context.document.title; },
    translated() {
      return all.filter(item => 'i18n' in item.dataset)
        .map(item => ({ key: item.dataset.i18n, text: item.textContent }));
    },
    printSummary() {
      vm.runInContext('buildPrintSummary()', context);
      return node('printSummary').innerHTML.replace(/ /g, ' ');
    },
    dictionary() { return vm.runInContext('I18N', context); },
  };
}

module.exports = { calculator, html, scripts, staticTexts };
