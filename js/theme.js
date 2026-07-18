// Rhythm · theme handling (System / Light / Dark)

import { store } from './store.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const pref = store.state.settings.theme || 'system';
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#201B18' : '#F7F0E8');
}

media.addEventListener('change', () => {
  if ((store.state.settings.theme || 'system') === 'system') applyTheme();
});
