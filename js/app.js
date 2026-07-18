// Rhythm · app shell: navigation, routing, refresh, service worker

import { el, icon, ICONS } from './util.js';
import { store } from './store.js';
import { applyTheme } from './theme.js';
import * as dashboard from './views/dashboard.js';
import * as calendar from './views/calendar.js';
import * as quickadd from './views/quickadd.js';
import * as library from './views/library.js';
import * as settings from './views/settings.js';

const ROUTES = {
  '#/dashboard': { view: dashboard, label: 'Today', icon: ICONS.home },
  '#/calendar': { view: calendar, label: 'Calendar', icon: ICONS.cal },
  '#/quick': { view: quickadd, label: 'Quick add', icon: ICONS.quick },
  '#/library': { view: library, label: 'Library', icon: ICONS.lib },
  '#/settings': { view: settings, label: 'Settings', icon: ICONS.gear },
};

const app = document.getElementById('app');
const nav = document.getElementById('nav');

function currentRoute() {
  return ROUTES[location.hash] ? location.hash : '#/dashboard';
}

function buildNav() {
  nav.replaceChildren();
  for (const [hash, route] of Object.entries(ROUTES)) {
    nav.append(el('button.nav-btn', {
      dataset: { hash },
      'aria-label': route.label,
      onclick: () => { location.hash = hash; },
    }, [icon(route.icon, { size: 22, sw: 1.7 }), route.label]));
  }
}

function paintNav() {
  const active = currentRoute();
  for (const btn of nav.children) {
    btn.classList.toggle('active', btn.dataset.hash === active);
  }
}

function renderView() {
  store.ensureToday();
  app.replaceChildren();
  ROUTES[currentRoute()].view.render(app);
  paintNav();
}

// re-render the current view whenever data changes (debounced to one frame)
let refreshQueued = false;
store.subscribe(() => {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    renderView();
  });
});

window.addEventListener('hashchange', renderView);

// midnight rollover: reset Today if the app stayed open past midnight
setInterval(() => store.ensureToday(), 60_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) store.ensureToday();
});

applyTheme();
buildNav();
if (!ROUTES[location.hash]) history.replaceState(null, '', '#/dashboard');
renderView();

// service worker (relative path → works from a GitHub Pages subdirectory)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
