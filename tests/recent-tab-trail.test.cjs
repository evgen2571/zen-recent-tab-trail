const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Chrome globals cannot run in Node; this boundary fixture models native tab events
// and metadata. Integration tests in Zen must also exercise the actual loader/DOM.
class Element extends EventTarget {
  constructor(attrs = {}) {
    super();
    this.attrs = new Map(Object.entries(attrs));
    this.style = {
      values: new Map(),
      setProperty(k, v) { this.values.set(k, v); },
      getPropertyValue(k) { return this.values.get(k) ?? ""; },
      removeProperty(k) { this.values.delete(k); },
    };
    this.isConnected = true;
    this.hidden = false;
    this.closing = false;
    this.pinned = false;
    this.visible = true;
    this.ownerDocument = { defaultView: null };
  }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.get(k) ?? null; }
  hasAttribute(k) { return this.attrs.has(k); }
  removeAttribute(k) { this.attrs.delete(k); }
}

function fixture(count = 8, startupFinished = true) {
  const window = new EventTarget();
  const root = new Element();
  const tabs = Array.from({ length: count }, () => new Element());
  const values = new Map();
  const observers = new Set();
  const topicObservers = new Set();
  let cleanup;
  const gBrowser = { tabs, selectedTab: tabs[0], tabContainer: { startupTime: 1000 } };
  tabs[0].selected = true;
  tabs.forEach(t => {
    t.ownerDocument.defaultView = window; t.lastAccessed = 1100;
    t.setAttribute('zen-workspace-id', 'one');
  });
  const workspaces = {
    activeWorkspace: 'one', allStoredTabs: tabs,
    callbacks: new Set(),
    addChangeListeners(fn) { this.callbacks.add(fn); },
    removeChangeListeners(fn) { this.callbacks.delete(fn); },
  };
  Object.assign(window, {
    document: { documentElement: root }, gBrowser,
    CSS: { supports: (property, value) => property === "color" &&
      ["#7c6cff", "#ff6b6b", "rgb(120 90 255)", "hsl(260 90% 65%)", "var(--missing)", "inherit"].includes(value) },
    gZenWorkspaces: workspaces,
    gBrowserInit: { delayedStartupFinished: startupFinished },
    addUnloadListener(fn) { cleanup = fn; },
  });
  const Services = {
    prefs: {
      getStringPref: (k, d) => values.get(k) ?? d,
      getBoolPref: (k, d) => values.get(k) ?? d,
      addObserver: (k, o) => observers.add(o),
      removeObserver: (k, o) => observers.delete(o),
    },
    obs: {
      addObserver: o => topicObservers.add(o),
      removeObserver: o => topicObservers.delete(o),
    },
  };
  const context = vm.createContext({ window, document: window.document, Services, queueMicrotask });
  const source = fs.existsSync('recent-tab-trail.uc.js')
    ? fs.readFileSync('recent-tab-trail.uc.js', 'utf8') : '';
  const load = () => vm.runInContext(source, context);
  const emit = (name, target, detail = {}) => {
    const e = new Event(name);
    Object.defineProperties(e, { target: { value: target }, detail: { value: detail } });
    window.dispatchEvent(e);
  };
  let clock = 1200;
  const select = t => {
    const previousTab = gBrowser.selectedTab;
    previousTab.selected = false;
    previousTab.lastAccessed = ++clock;
    t.selected = true;
    t.lastAccessed = clock;
    previousTab._lastSeenActive = clock;
    t._lastSeenActive = clock;
    gBrowser.selectedTab = t;
    emit('TabSelect', t, { previousTab });
  };
  const ranks = () => tabs.map(t => t.getAttribute('data-rtt-rank'));
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };
  return { window, root, tabs, values, observers, topicObservers, workspaces,
    load, emit, select, ranks, flush, cleanup: () => cleanup?.(), gBrowser };
}

test('actual selections produce the requested A B C D then B history without moving tabs', async () => {
  const f = fixture(4); f.load();
  const original = [...f.tabs];
  f.select(f.tabs[1]); f.select(f.tabs[2]); f.select(f.tabs[3]); await f.flush();
  assert.deepEqual(f.ranks(), ['3', '2', '1', null]);
  f.select(f.tabs[1]); await f.flush();
  assert.deepEqual(f.ranks(), ['3', null, '2', '1']);
  assert.deepEqual(f.tabs, original);
});

test('default depth is five and never-selected background tabs stay unranked', async () => {
  const f = fixture(); f.load();
  for (let i = 1; i <= 6; i++) f.select(f.tabs[i]);
  await f.flush();
  assert.deepEqual(f.ranks(), [null, '5', '4', '3', '2', '1', null, null]);
  f.emit('TabOpen', f.tabs[7]); await f.flush();
  assert.equal(f.tabs[7].getAttribute('data-rtt-rank'), null);
});

test('startup seeds persisted recency but excludes fresh creation timestamps', async () => {
  const f = fixture(4);
  f.tabs[1].lastAccessed = 500; f.tabs[2].lastAccessed = 700;
  f.load(); await f.flush();
  assert.deepEqual(f.ranks(), [null, '2', '1', null]);
});

test('late initialization recognizes tabs actually seen in this session', async () => {
  const f = fixture(3); f.tabs[1]._lastSeenActive = 1100;
  f.load(); await f.flush();
  assert.deepEqual(f.ranks(), [null, '1', null]);
});

test('close clears detached markers and compacts ranks', async () => {
  const f = fixture(5); f.load();
  for (let i = 1; i < 5; i++) f.select(f.tabs[i]);
  await f.flush();
  f.tabs[3].closing = true; f.emit('TabClose', f.tabs[3]); await f.flush();
  assert.deepEqual(f.ranks(), ['3', '2', '1', null, null]);
  f.tabs[0].closing = true; f.emit('TabClose', f.tabs[0]); await f.flush();
  assert.deepEqual(f.ranks(), [null, '2', '1', null, null]);
});

test('restore inserts retained metadata without selecting or loading a background tab', async () => {
  const f = fixture(4); f.load(); f.select(f.tabs[1]); await f.flush();
  f.tabs[2].lastAccessed = 600;
  f.emit('SSTabRestoring', f.tabs[2]); await f.flush();
  assert.deepEqual(f.ranks(), ['1', null, '2', null]);
  f.emit('SSTabRestored', f.tabs[3]); await f.flush();
  assert.equal(f.tabs[3].getAttribute('data-rtt-rank'), null);
});

test('restore recognizes a native same-session timestamp replacing the creation timestamp', async () => {
  const f = fixture(4); f.load(); f.select(f.tabs[1]);
  f.emit('TabOpen', f.tabs[2]);
  f.tabs[2].lastAccessed = 1150;
  f.emit('SSTabRestoring', f.tabs[2]); await f.flush();
  assert.deepEqual(f.ranks(), ['1', null, '2', null]);
});

test('converting a visited pinned tab to Essential immediately updates inclusion', async () => {
  const f = fixture(3); f.load(); f.tabs[1].pinned = true;
  f.select(f.tabs[1]); f.select(f.tabs[2]); await f.flush();
  f.values.set('recent-tab-trail.include-essentials', false);
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.ranks()[1], '1');
  f.tabs[1].setAttribute('zen-essential', 'true');
  f.emit('TabAddedToEssentials', f.tabs[1]); await f.flush();
  assert.equal(f.ranks()[1], null);
  f.tabs[1].removeAttribute('zen-essential');
  f.emit('TabRemovedFromEssentials', f.tabs[1]); await f.flush();
  assert.equal(f.ranks()[1], '1');
});

test('workspace rendering filters history then assigns contiguous eligible ranks', async () => {
  const f = fixture(4); f.tabs[1].setAttribute('zen-workspace-id', 'two');
  f.load(); f.select(f.tabs[1]); f.select(f.tabs[2]); f.select(f.tabs[3]); await f.flush();
  assert.deepEqual(f.ranks(), ['2', null, '1', null]);
  f.workspaces.activeWorkspace = 'two';
  for (const fn of f.workspaces.callbacks) fn();
  await f.flush(); assert.equal(f.tabs[1].getAttribute('data-rtt-rank'), '1');
  f.values.set('recent-tab-trail.workspace', 'global');
  for (const o of f.observers) o.observe();
  await f.flush(); assert.deepEqual(f.ranks(), ['3', '2', '1', null]);
});

test('pinned, Essentials, placeholders, hidden and collapsed folder tabs use eligibility', async () => {
  const f = fixture(7); f.load();
  f.tabs[1].pinned = true;
  f.tabs[2].pinned = true; f.tabs[2].setAttribute('zen-essential', 'true');
  f.tabs[3].setAttribute('zen-empty-tab', 'true');
  f.tabs[4].hidden = true; f.tabs[5].visible = false;
  for (let i = 1; i < 7; i++) f.select(f.tabs[i]);
  await f.flush();
  assert.deepEqual(f.ranks(), ['3', '2', '1', null, null, null, null]);
  f.values.set('recent-tab-trail.include-pinned', false);
  for (const o of f.observers) o.observe(); await f.flush();
  assert.deepEqual(f.ranks(), ['2', null, '1', null, null, null, null]);
  f.values.set('recent-tab-trail.include-essentials', false);
  for (const o of f.observers) o.observe(); await f.flush();
  assert.deepEqual(f.ranks(), ['1', null, null, null, null, null, null]);
  f.tabs[5].visible = true; f.emit('ZenFolderAnimationFinished', f.tabs[5]);
  await f.flush(); assert.equal(f.tabs[5].getAttribute('data-rtt-rank'), '1');
});

test('preferences apply live and invalid choices fall back to defaults', async () => {
  const f = fixture(); f.load();
  for (let i = 1; i < 7; i++) f.select(f.tabs[i]);
  f.values.set('recent-tab-trail.count', '3');
  f.values.set('recent-tab-trail.style', 'bar');
  f.values.set('recent-tab-trail.strength', 'strong');
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.ranks().filter(Boolean).length, 3);
  assert.equal(f.root.getAttribute('data-rtt-style'), 'bar');
  assert.equal(f.root.getAttribute('data-rtt-strength'), 'strong');
  f.values.set('recent-tab-trail.count', 'bogus');
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.ranks().filter(Boolean).length, 5);
});

test('duplicate initialization and cleanup remove attributes, listeners and queued work', async () => {
  const f = fixture(3); f.load(); f.select(f.tabs[1]); await f.flush();
  f.load(); f.select(f.tabs[2]); await f.flush();
  assert.deepEqual(f.ranks(), ['2', '1', null]);
  assert.equal(f.observers.size, 1); assert.equal(f.workspaces.callbacks.size, 1);
  f.select(f.tabs[0]); f.cleanup(); await f.flush();
  assert.deepEqual(f.ranks(), [null, null, null]);
  assert.equal(f.root.getAttribute('data-rtt-style'), null);
  assert.equal(f.observers.size, 0); assert.equal(f.workspaces.callbacks.size, 0);
  f.select(f.tabs[1]); await f.flush();
  assert.deepEqual(f.ranks(), [null, null, null]);
});

test('startup waiting can be cancelled and ignores other windows', async () => {
  const f = fixture(3, false); f.load();
  assert.equal(f.topicObservers.size, 1);
  for (const o of f.topicObservers) o.observe({}, 'browser-delayed-startup-finished');
  assert.equal(f.observers.size, 0);
  f.cleanup(); assert.equal(f.topicObservers.size, 0);
  f.load();
  for (const o of f.topicObservers) o.observe(f.window, 'browser-delayed-startup-finished');
  f.select(f.tabs[1]); await f.flush(); assert.equal(f.ranks()[0], '1');
});

test('separate windows and foreign tab events cannot corrupt local ranking', async () => {
  const a = fixture(3), b = fixture(3); a.load(); b.load();
  a.select(a.tabs[1]); b.select(b.tabs[2]);
  a.emit('TabSelect', b.tabs[2]); await a.flush(); await b.flush();
  assert.deepEqual(a.ranks(), ['1', null, null]);
  assert.deepEqual(b.ranks(), ['1', null, null]);
});

// These tests catch dropped choices, stale live state, invalid color insertion,
// and leaked presentation state; the fixture supplies the browser color boundary.
test('all style and intensity choices apply live with safe invalid fallbacks', async () => {
  const f = fixture(3); f.load(); f.select(f.tabs[1]); await f.flush();
  const ranks = f.ranks();
  for (const style of ['both', 'bar', 'outline', 'background', 'fill', 'invalid']) {
    for (const strength of ['subtle', 'normal', 'strong', 'invalid']) {
      f.values.set('recent-tab-trail.style', style);
      f.values.set('recent-tab-trail.strength', strength);
      for (const o of f.observers) o.observe(); await f.flush();
      assert.equal(f.root.getAttribute('data-rtt-style'), style === 'invalid' ? 'both' : style);
      assert.equal(f.root.getAttribute('data-rtt-strength'), strength === 'invalid' ? 'normal' : strength);
      assert.deepEqual(f.ranks(), ranks);
    }
  }
});

test('custom colors validate at the browser boundary and update or fall back live', async () => {
  const f = fixture(3); f.load();
  assert.equal(f.root.getAttribute('data-rtt-color-source'), 'theme');
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '');
  f.values.set('recent-tab-trail.color-source', 'custom');
  for (const color of ['#7c6cff', '#ff6b6b', 'rgb(120 90 255)', 'hsl(260 90% 65%)', 'not-a-color', 'var(--missing)', 'inherit', '']) {
    f.values.set('recent-tab-trail.custom-color', color);
    for (const o of f.observers) o.observe(); await f.flush();
    const valid = ['#7c6cff', '#ff6b6b', 'rgb(120 90 255)', 'hsl(260 90% 65%)'].includes(color);
    assert.equal(f.root.getAttribute('data-rtt-color-source'), valid ? 'custom' : 'theme');
    assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), valid ? color : '');
  }
  f.values.set('recent-tab-trail.custom-color', '  #7c6cff  ');
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '#7c6cff');
  f.values.delete('recent-tab-trail.custom-color');
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '#7c6cff');
  for (const source of ['theme', 'invalid']) {
    f.values.set('recent-tab-trail.color-source', source);
    for (const o of f.observers) o.observe(); await f.flush();
    assert.equal(f.root.getAttribute('data-rtt-color-source'), 'theme');
    assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '');
  }
  f.window.CSS = undefined;
  f.values.set('recent-tab-trail.color-source', 'custom');
  for (const o of f.observers) o.observe(); await f.flush();
  assert.equal(f.root.getAttribute('data-rtt-color-source'), 'theme');
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '');
});

test('unload clears custom presentation even with queued preference updates', async () => {
  const f = fixture(3);
  f.values.set('recent-tab-trail.color-source', 'custom'); f.load();
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '#7c6cff');
  for (const o of f.observers) o.observe();
  f.cleanup(); await f.flush();
  for (const name of ['style', 'strength', 'color-source']) {
    assert.equal(f.root.getAttribute('data-rtt-' + name), null);
  }
  assert.equal(f.root.style.getPropertyValue('--rtt-custom-accent'), '');
  assert.equal(f.observers.size, 0);
});
