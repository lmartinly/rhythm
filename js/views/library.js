// Rhythm · Library — the heart of your system.
// Everything here is yours to rename, reorder, duplicate, archive or delete.

import { el, icon, ICONS, relTime, daysLabel, dayCode } from '../util.js';
import { store } from '../store.js';
import { openMenu } from '../ui.js';
import {
  itemRow, chev, openItemEditor, openRoutineEditor, openRoomEditor,
  openItemDetail, openRoutineRun, startCleaningFlow, libraryMenuActions,
} from '../actions.js';

let tab = 'routines';

export function render(root) {
  root.append(el('header.page-head', {}, [
    el('h1', {}, 'Library'),
    el('span.hand', {}, 'your whole system, in one place'),
  ]));

  const seg = el('div.seg', { style: { marginBottom: '18px' } });
  for (const [key, label] of [['routines', 'Routines'], ['items', 'Items'], ['rooms', 'Cleaning']]) {
    seg.append(el('button' + (tab === key ? '.on' : ''), {
      onclick: () => { tab = key; repaint(root); },
    }, label));
  }
  root.append(seg);

  if (tab === 'items') renderItems(root);
  if (tab === 'routines') renderRoutines(root);
  if (tab === 'rooms') renderRooms(root);
}

function menuTrail(kind, obj) {
  return el('button.icon-btn', {
    'aria-label': 'More options',
    onclick: (e) => {
      e.stopPropagation();
      openMenu(e.currentTarget, libraryMenuActions(kind, obj));
    },
  }, [icon(ICONS.dots, { size: 18 })]);
}

function renderItems(root) {
  root.append(el('button.btn.quiet.full', { onclick: () => openItemEditor() }, [
    icon(ICONS.plus, { size: 17 }), 'New item',
  ]));
  root.append(el('div.spacer'));

  const items = store.activeItems();
  if (!items.length) {
    root.append(el('div.card', {}, [el('div.empty', {}, [
      el('span.hand', {}, 'No items yet'),
      'Items are your generic building blocks — Serum, Cleanser, a walk, the laundry.',
    ])]));
    return;
  }

  const byCat = { beauty: [], fitness: [], home: [], health: [] };
  for (const it of items) (byCat[it.category] || (byCat[it.category] = [])).push(it);

  const labels = { beauty: 'Beauty', fitness: 'Fitness', home: 'Home', health: 'Health' };
  for (const [cat, group] of Object.entries(byCat)) {
    if (!group.length) continue;
    root.append(el('div.section-title', {}, labels[cat] || cat));
    const card = el('div.card', { style: { padding: '6px 12px' } });
    for (const it of group) {
      const last = store.lastDone(it.id);
      const count = store.logCount(it.id);
      // Reference first: the product you're currently using, then the trace.
      const sub = it.product
        || (last ? `Last done ${relTime(last.ts)} · ${count}×` : 'Not logged yet');
      card.append(itemRow(it, {
        sub,
        trail: menuTrail('items', it),
        onclick: () => openItemDetail(it.id),
      }));
    }
    root.append(card);
  }
  root.append(el('p.muted.center', { style: { marginTop: '10px' } },
    'Tap an item to see its product, notes and history.'));
}

function renderRoutines(root) {
  root.append(el('button.btn.quiet.full', { onclick: () => openRoutineEditor() }, [
    icon(ICONS.plus, { size: 17 }), 'New routine',
  ]));
  root.append(el('div.spacer'));

  const routines = store.activeRoutines();
  if (!routines.length) {
    root.append(el('div.card', {}, [el('div.empty', {}, [
      el('span.hand', {}, 'No routines yet'),
      'A routine is simply a collection of items you like doing together.',
    ])]));
    return;
  }

  const contents = (r) => r.itemIds
    .map((id) => store.state.items[id])
    .filter(Boolean)
    .map((i) => i.name)
    .join(' · ');

  const row = (r, { dayChipToday = false } = {}) => itemRow(r, {
    sub: contents(r) || 'Empty — tap ⋯ to edit',
    trail: [
      dayChipToday ? el('span.day-chip.today', {}, 'Today') : null,
      menuTrail('routines', r),
    ],
    onclick: () => openRoutineRun(r.id),
  });

  // Anytime routines
  const daily = routines
    .filter((r) => !r.days?.length || r.days.length === 7)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (daily.length) {
    root.append(el('div.section-title', {}, 'Anytime'));
    const card = el('div.card', { style: { padding: '6px 12px' } });
    daily.forEach((r) => card.append(row(r)));
    root.append(card);
  }

  // Weekly rotation, Monday → Sunday, today highlighted
  const rotation = store.weeklyRotation();
  if (rotation.length) {
    const today = dayCode();
    root.append(el('div.section-title', {}, 'Weekly rotation'));
    const card = el('div.card', { style: { padding: '6px 12px' } });
    for (const r of rotation) {
      const isToday = r.days.includes(today);
      const rw = itemRow(r, {
        sub: `${daysLabel(r.days)} — ${contents(r) || 'empty'}`,
        trail: [
          isToday ? el('span.day-chip.today', {}, 'Today') : null,
          menuTrail('routines', r),
        ],
        onclick: () => openRoutineRun(r.id),
      });
      if (isToday) rw.classList.add('is-today');
      card.append(rw);
    }
    root.append(card);
    root.append(el('p.muted.center', { style: { marginTop: '10px' } },
      'Give a routine days of the week and it appears here — and on the Dashboard on its day.'));
  }

  root.append(el('p.muted.center', { style: { marginTop: '10px' } },
    'Tap a routine to see inside or run it · ⋯ to edit'));
}

function renderRooms(root) {
  root.append(el('button.btn.full', { onclick: startCleaningFlow }, [
    icon(ICONS.broom, { size: 17 }), 'Start Home Cleaning',
  ]));
  root.append(el('div.spacer'));
  root.append(el('button.btn.quiet.full', { onclick: () => openRoomEditor() }, [
    icon(ICONS.plus, { size: 17 }), 'New room template',
  ]));

  const rooms = store.roomList();
  root.append(el('div.section-title', {}, 'Room templates'));
  if (!rooms.length) {
    root.append(el('div.card', {}, [el('div.empty', {}, [
      el('span.hand', {}, 'No rooms yet'),
      'Room templates become your checklist when you start a session.',
    ])]));
    return;
  }

  const card = el('div.card', { style: { padding: '6px 12px' } });
  for (const rm of rooms) {
    card.append(itemRow({ ...rm, category: 'home' }, {
      sub: rm.tasks.join(' · ') || 'No tasks yet',
      trail: menuTrail('rooms', rm),
      onclick: () => openRoomEditor(rm),
    }));
  }
  root.append(card);
  root.append(el('p.muted.center', { style: { marginTop: '10px' } },
    'Sessions copy these — editing a session never changes the template.'));
}

function repaint(root) {
  root.replaceChildren();
  render(root);
}
