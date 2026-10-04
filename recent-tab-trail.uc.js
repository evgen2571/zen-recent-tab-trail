// SPDX-License-Identifier: MIT
(() => {
  const KEY = '__recentTabTrail';
  const RANK = 'data-rtt-rank';
  const PROMINENCE = '--rtt-prominence';
  const PRESET_COLORS = {
    purple: '#8b5cf6', blue: '#3b82f6', cyan: '#06b6d4',
    green: '#22c55e', orange: '#f97316', red: '#ef4444', pink: '#ec4899',
  };
  const PREFIX = 'recent-tab-trail.';
  const root = document.documentElement;
  const browser = window.gBrowser;
  if (!browser) return;

  window[KEY]?.destroy();
  let history = [];
  let marked = new Set();
  let destroyed = false;
  let queued = false;
  let started = false;
  let workspaceManager;
  let startupObserver;
  const creationAccess = new WeakMap();
  const events = [
    'TabSelect', 'TabOpen', 'TabClose', 'TabShow', 'TabHide',
    'TabPinned', 'TabUnpinned', 'TabMove',
    'TabAddedToEssentials', 'TabRemovedFromEssentials',
    'SSTabRestoring', 'SSTabRestored', 'TabGroupCollapse', 'TabGroupExpand',
    'TabGrouped', 'TabUngrouped', 'TabGroupUpdate',
    'ZenFolderAnimationFinished', 'ZenFolderChangedWorkspace',
    'ZenWorkspacesUIUpdate', 'AfterWorkspacesSessionRestore',
  ];

  function allTabs() {
    // gBrowser.tabs is active-space-only in Zen. This collection also includes
    // Essentials and real tabs inside folders in other spaces, in this window.
    return Array.from(window.gZenWorkspaces?.allStoredTabs ?? browser.tabs)
      .filter(tab => tab.ownerDocument.defaultView === window && tab.isConnected && !tab.closing);
  }

  function hasNativeVisit(tab, restoring = false) {
    // Native lastAccessed is initialized at creation, even for background tabs.
    // A pre-startup timestamp is retained session data; _lastSeenActive is set
    // by Firefox when actually activated. Neither requires loading the browser.
    return Number.isFinite(tab.lastAccessed) && tab.lastAccessed > 0 &&
      ((tab.lastAccessed < browser.tabContainer.startupTime) ||
        (Number.isFinite(tab._lastSeenActive) && tab._lastSeenActive > 0) ||
        // SessionStore overwrites the TabOpen creation timestamp with saved
        // lastAccessed before SSTabRestoring, including same-session restores.
        (restoring && creationAccess.has(tab) && creationAccess.get(tab) !== tab.lastAccessed));
  }

  function seed(tabs, restoring = false) {
    const known = new Set(history);
    const additions = tabs.filter(tab => !known.has(tab) && hasNativeVisit(tab, restoring))
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
    for (const tab of additions) {
      const index = history.findIndex(other => other.lastAccessed < tab.lastAccessed);
      history.splice(index < 0 ? history.length : index, 0, tab);
    }
  }

  function visit(tab) {
    if (!tab || tab.ownerDocument.defaultView !== window || tab.closing) return;
    const index = history.indexOf(tab);
    if (index >= 0) history.splice(index, 1);
    history.unshift(tab);
  }

  function choice(name, choices, fallback) {
    const value = Services.prefs.getStringPref(PREFIX + name, fallback);
    return choices.includes(value) ? value : fallback;
  }

  function recentCount() {
    const value = Services.prefs.getStringPref(PREFIX + 'count', '5').trim();
    const number = Number(value);
    return value && Number.isFinite(number) ? Math.min(20, Math.max(1, Math.round(number))) : 5;
  }

  function clearRank(tab) {
    tab.removeAttribute(RANK);
    tab.style.removeProperty(PROMINENCE);
  }

  function refresh() {
    if (destroyed) return;
    const tabs = new Set(allTabs());
    history = history.filter(tab => tabs.has(tab));
    const count = recentCount();
    const mode = choice('workspace', ['current', 'global'], 'current');
    const includePinned = Services.prefs.getBoolPref(PREFIX + 'include-pinned', true);
    const includeEssentials = Services.prefs.getBoolPref(PREFIX + 'include-essentials', true);
    root.setAttribute('data-rtt-style', choice('style', ['both', 'bar', 'outline', 'background', 'fill'], 'both'));
    root.setAttribute('data-rtt-strength', choice('strength', ['subtle', 'normal', 'strong'], 'normal'));
    const colorSource = choice('color-source', ['theme', ...Object.keys(PRESET_COLORS), 'custom'], 'theme');
    const color = Services.prefs.getStringPref(PREFIX + 'custom-color', '#7c6cff').trim();
    // CSS.supports accepts unresolved variables and CSS-wide keywords too;
    // those are not standalone colors and could invalidate the shared accent.
    const custom = colorSource === 'custom' && window.CSS?.supports('color', color) &&
      !/\b(?:var|env)\s*\(|^(?:inherit|initial|unset|revert|revert-layer)$/i.test(color);
    const accent = PRESET_COLORS[colorSource] ?? (custom ? color : null);
    root.setAttribute('data-rtt-color-source', accent ? colorSource : 'theme');
    if (accent) root.style.setProperty('--rtt-custom-accent', accent);
    else root.style.removeProperty('--rtt-custom-accent');
    for (const tab of marked) clearRank(tab);
    marked.clear();
    const activeWorkspace = window.gZenWorkspaces?.activeWorkspace;
    for (const tab of history) {
      const essential = tab.hasAttribute('zen-essential');
      const space = tab.getAttribute('zen-workspace-id');
      if (tab === browser.selectedTab || tab.selected || tab.hidden || tab.visible === false ||
          tab.hasAttribute('zen-empty-tab') || tab.hasAttribute('glance-id') ||
          (essential ? !includeEssentials : tab.pinned && !includePinned) ||
          (mode === 'current' && activeWorkspace && space && space !== activeWorkspace && !essential)) {
        continue;
      }
      const rank = marked.size + 1;
      tab.setAttribute(RANK, String(rank));
      // Age alone determines strength: 65% at rank 1, approaching a 4% floor.
      tab.style.setProperty(PROMINENCE, `${4 + 61 * 0.72 ** (rank - 1)}%`);
      marked.add(tab);
      if (marked.size === count) break;
    }
  }

  function schedule() {
    if (destroyed || queued) return;
    queued = true;
    // Coalesce same-turn browser events. No timer, polling, or DOM observation.
    queueMicrotask(() => {
      queued = false;
      refresh();
    });
  }

  function onEvent(event) {
    const tab = event.target;
    if (event.type === 'TabSelect') {
      if (tab.ownerDocument.defaultView !== window) return;
      visit(tab);
    } else if (event.type === 'TabOpen') {
      creationAccess.set(tab, tab.lastAccessed);
      seed([tab]);
    } else if (event.type === 'TabClose') {
      clearRank(tab);
      marked.delete(tab);
      history = history.filter(other => other !== tab);
    } else if (event.type === 'SSTabRestoring' || event.type === 'SSTabRestored') {
      seed([tab], true);
    } else if (event.type === 'AfterWorkspacesSessionRestore') {
      seed(allTabs());
      attachWorkspaceListener();
    }
    schedule();
  }

  const prefObserver = { observe: schedule };
  function attachWorkspaceListener() {
    const manager = window.gZenWorkspaces;
    if (manager === workspaceManager || !manager?.addChangeListeners) return;
    workspaceManager?.removeChangeListeners(schedule);
    workspaceManager = manager;
    // Called after Zen completes async workspace selection/layout, not mid-switch.
    workspaceManager.addChangeListeners(schedule);
  }

  function start() {
    if (destroyed || started) return;
    started = true;
    seed(allTabs());
    visit(browser.selectedTab);
    for (const type of events) window.addEventListener(type, onEvent, true);
    Services.prefs.addObserver(PREFIX, prefObserver);
    attachWorkspaceListener();
    refresh();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (startupObserver) Services.obs.removeObserver(startupObserver, 'browser-delayed-startup-finished');
    if (started) {
      for (const type of events) window.removeEventListener(type, onEvent, true);
      Services.prefs.removeObserver(PREFIX, prefObserver);
      workspaceManager?.removeChangeListeners(schedule);
    }
    window.removeEventListener('unload', destroy);
    for (const tab of marked) clearRank(tab);
    marked.clear();
    history = [];
    root.removeAttribute('data-rtt-style');
    root.removeAttribute('data-rtt-strength');
    root.removeAttribute('data-rtt-color-source');
    root.style.removeProperty('--rtt-custom-accent');
    if (window[KEY]?.destroy === destroy) delete window[KEY];
  }

  window[KEY] = { destroy };
  window.addUnloadListener?.(destroy);
  window.addEventListener('unload', destroy, { once: true });
  if (window.gBrowserInit?.delayedStartupFinished) {
    start();
  } else {
    startupObserver = {
      observe(subject) {
        if (subject !== window) return;
        Services.obs.removeObserver(startupObserver, 'browser-delayed-startup-finished');
        startupObserver = null;
        start();
      },
    };
    Services.obs.addObserver(startupObserver, 'browser-delayed-startup-finished');
  }
})();
