// Rhythm · Calendar

import { el, icon, ICONS, dateKey, monthName, timeOf, CATEGORIES } from '../util.js';
import { store } from '../store.js';
import { itemRow, openItemDetail, openCompletionSnapshot, openCleaningSnapshot } from '../actions.js';

let view = null;      // {year, month}
let selected = null;  // dateKey

export function render(root) {
  const now = new Date();
  if (!view) view = { year: now.getFullYear(), month: now.getMonth() };
  if (!selected) selected = dateKey();

  root.append(el('header.page-head', {}, [
    el('h1', {}, 'Calendar'),
    el('span.hand', {}, 'everything you did, remembered'),
  ]));

  /* ── month header ── */

  const head = el('div.cal-head', {}, [
    el('button.icon-btn', {
      'aria-label': 'Previous month',
      onclick: () => { shiftMonth(-1); repaint(root); },
    }, [icon(ICONS.chevL, { size: 19 })]),
    el('h2', {}, `${monthName(view.month)} ${view.year}`),
    el('button.icon-btn', {
      'aria-label': 'Next month',
      onclick: () => { shiftMonth(1); repaint(root); },
    }, [icon(ICONS.chevR, { size: 19 })]),
  ]);
  root.append(head);

  /* ── grid ── */

  const grid = el('div.cal-grid');
  for (const d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
    grid.append(el('div.cal-dow', {}, d));
  }

  const first = new Date(view.year, view.month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const daysInPrev = new Date(view.year, view.month, 0).getDate();
  const dots = store.monthDots(view.year, view.month);
  const todayKey = dateKey();

  const cell = (day, otherOffset = 0) => {
    const d = new Date(view.year, view.month + otherOffset, day);
    const dk = dateKey(d);
    const btn = el('button.cal-day' + (otherOffset ? '.other' : ''), {
      'aria-label': dk,
      onclick: () => {
        if (otherOffset) shiftMonth(otherOffset);
        selected = dk;
        repaint(root);
      },
    }, [String(day)]);
    if (dk === todayKey) btn.classList.add('today');
    if (dk === selected && !otherOffset) btn.classList.add('sel');
    const dotWrap = el('div.cal-dots');
    if (!otherOffset && dots[dk]) {
      for (const cat of [...dots[dk]].slice(0, 4)) {
        dotWrap.append(el(`span.dot.${CATEGORIES[cat] ? CATEGORIES[cat].cls : 'c-home'}`));
      }
    }
    btn.append(dotWrap);
    return btn;
  };

  for (let i = startOffset; i > 0; i--) grid.append(cell(daysInPrev - i + 1, -1));
  for (let day = 1; day <= daysInMonth; day++) grid.append(cell(day));
  const used = startOffset + daysInMonth;
  const tail = (7 - (used % 7)) % 7;
  for (let day = 1; day <= tail; day++) grid.append(cell(day, 1));

  root.append(el('div.card', { style: { padding: '14px 10px 10px' } }, [grid]));

  /* ── selected day ── */

  const d = new Date(Number(selected.slice(0, 4)), Number(selected.slice(5, 7)) - 1, Number(selected.slice(8)));
  const label = selected === todayKey
    ? 'Today'
    : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  root.append(el('div.section-title', {}, label));

  const acts = store.activitiesOn(selected);
  if (!acts.length) {
    root.append(el('div.card', {}, [el('div.empty', {}, [
      el('span.hand', {}, 'A quiet day'),
      'Nothing was logged — and that\u2019s perfectly fine.',
    ])]));
    return;
  }

  const card = el('div.card', { style: { padding: '8px 14px' } });
  for (const a of acts) {
    if (a.kind === 'completion') {
      const done = a.data.itemStates.filter((x) => x.checked).length;
      card.append(itemRow(
        { name: a.data.name, icon: a.data.icon, category: a.data.category },
        {
          sub: `Routine · ${done} of ${a.data.itemStates.length} · ${timeOf(a.ts)}`,
          trail: icon('chevron-right', { size: 16, sw: 2, cls: 'chev' }),
          onclick: () => openCompletionSnapshot(a.data),
        }
      ));
    } else if (a.kind === 'cleaning') {
      card.append(itemRow(
        { name: 'Home Cleaning', icon: ICONS.broom, category: 'home' },
        {
          sub: `${a.data.rooms.map((r) => r.name).join(', ')} · ${timeOf(a.ts)}`,
          trail: icon('chevron-right', { size: 16, sw: 2, cls: 'chev' }),
          onclick: () => openCleaningSnapshot(a.data),
        }
      ));
    } else {
      const item = store.state.items[a.data.itemId];
      if (!item) continue;
      card.append(itemRow(item, {
        sub: timeOf(a.ts),
        onclick: () => openItemDetail(item.id),
      }));
    }
  }
  root.append(card);
}

function shiftMonth(delta) {
  let m = view.month + delta;
  let y = view.year;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  view = { year: y, month: m };
}

function repaint(root) {
  root.replaceChildren();
  render(root);
}
