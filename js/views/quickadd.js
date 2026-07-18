// Rhythm · Quick Add (one-tap logging)

import { el, icon, iconChip, ICONS, relTime } from '../util.js';
import { store } from '../store.js';
import { toast } from '../ui.js';
import { openItemEditor } from '../actions.js';

let query = '';

export function render(root) {
  root.append(el('header.page-head', {}, [
    el('h1', {}, 'Quick add'),
    el('span.hand', {}, 'one tap, and it\u2019s remembered'),
  ]));

  const search = el('input.input', {
    placeholder: 'Search items…', type: 'search', value: query,
    style: { marginBottom: '16px' },
  });
  root.append(search);

  const grid = el('div.tile-grid');
  root.append(grid);

  const paint = () => {
    const q = query.trim().toLowerCase();
    grid.replaceChildren();

    const items = store.activeItems()
      .filter((i) => i.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const la = store.lastDone(a.id), lb = store.lastDone(b.id);
        return (lb ? lb.ts : 0) - (la ? la.ts : 0);
      });

    for (const item of items) {
      const last = store.lastDone(item.id);
      const pinned = store.state.pinned.includes(item.id);
      const tile = el('button.tile', {}, [
        iconChip(item.icon, item.category, 'lg'),
        el('span.name', {}, item.name),
        el('span.when', {}, last ? relTime(last.ts) : '—'),
      ]);
      const pin = el('span.pin' + (pinned ? '.on' : ''), {
        role: 'button', tabindex: '0',
        'aria-label': pinned ? 'Unpin from dashboard' : 'Pin to dashboard',
        onclick: (e) => {
          e.stopPropagation();
          store.togglePinned(item.id);
          toast(pinned ? 'Removed from dashboard' : 'Pinned to dashboard', ICONS.pin);
        },
      }, [icon(ICONS.pin, { size: 14 })]);
      tile.append(pin);
      tile.addEventListener('click', () => {
        tile.classList.add('flash');
        // brief pause so the save animation can play before the grid repaints
        setTimeout(() => {
          store.logItem(item.id, { type: 'quick' });
          toast(`${item.name} · saved`);
        }, 240);
      });
      grid.append(tile);
    }

    grid.append(el('button.tile.new', { onclick: () => openItemEditor() }, [
      el('span.icn-chip.chip-lg.t-plain', {}, [icon(ICONS.plus, { size: 21 })]),
      el('span.name', {}, 'New item'),
    ]));
  };

  search.addEventListener('input', () => { query = search.value; paint(); });
  paint();

  root.append(el('p.muted.center', { style: { marginTop: '22px' } },
    'Tap to log · tap the star to keep it on your dashboard'));
}
