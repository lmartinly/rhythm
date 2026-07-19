// Rhythm · Dashboard — the front door to your own routines

import { el, icon, ICONS, longDate, greeting, relTime, dayCode, dayShort, planLabel } from '../util.js';
import { store } from '../store.js';
import { toast } from '../ui.js';
import {
  itemRow, chev, openAddToToday, openRoutineRun, startPlannedCleaning,
  openCompletionSnapshot, openCleaningSnapshot, startCleaningFlow, openItemDetail,
} from '../actions.js';

export function render(root) {
  store.ensureToday();
  const s = store.state;
  const today = dayCode();

  root.append(el('header.page-head', {}, [
    el('h1', {}, greeting()),
    el('span.hand', {}, longDate()),
  ]));

  /* ── Today · only what you chose ── */

  root.append(el('div.section-title', {}, [
    'Today',
    el('button.link', { onclick: openAddToToday }, '+ Choose'),
  ]));

  const todayCard = el('div.card', { style: { padding: '10px 14px' } });
  const entries = s.today.entries;

  if (!entries.length) {
    todayCard.style.padding = '18px';
    todayCard.append(el('div.empty', {}, [
      el('span.hand', {}, 'Today is a blank page'),
      'Pick whatever feels right — nothing is added for you.',
      el('div.spacer'),
      el('button.btn.quiet', { onclick: openAddToToday }, 'Choose for today'),
    ]));
  }

  const ordered = [...entries].sort((a, b) => Number(a.done) - Number(b.done));
  for (const entry of ordered) {
    let ref, sub = null;
    if (entry.type === 'cleaning') {
      const names = (entry.roomIds || []).map((id) => s.rooms[id]?.name).filter(Boolean);
      ref = { name: 'Home Cleaning', icon: ICONS.broom, category: 'home' };
      sub = names.length ? names.join(', ') : 'Pick rooms when you start';
      const sess = entry.session || [];
      const total = sess.reduce((n, r) => n + r.tasks.length, 0);
      const ticked = sess.reduce((n, r) => n + r.tasks.filter((t) => t.done).length, 0);
      if (total && !entry.done) sub += ` · ${ticked}/${total}`;
    } else {
      ref = entry.type === 'item' ? s.items[entry.refId] : s.routines[entry.refId];
      if (!ref) continue;
      if (entry.type === 'routine') {
        const total = ref.itemIds.length;
        const ticked = (entry.checked || []).filter((id) => ref.itemIds.includes(id)).length;
        sub = `${total} item${total === 1 ? '' : 's'}`;
        if (ticked && !entry.done) sub += ` · ${ticked}/${total}`;
      }
    }

    const trail = [];
    if (entry.done) {
      trail.push(el('span.ring.on', { style: { display: 'grid' } }, [icon(ICONS.check, { size: 15, sw: 2.4 })]));
    } else {
      trail.push(el('span.ring', { style: { display: 'grid' } }));
      trail.push(el('button.icon-btn', {
        'aria-label': `Remove ${ref.name} from today`,
        onclick: (e) => { e.stopPropagation(); store.removeFromToday(entry.id); },
      }, [icon(ICONS.x, { size: 16 })]));
    }

    const row = itemRow(ref, {
      sub,
      trail,
      onclick: () => {
        if (entry.type === 'cleaning') {
          if (!entry.done) startPlannedCleaning(entry);
          else if (entry.cleaningId) {
            const c = s.cleaning.find((x) => x.id === entry.cleaningId);
            if (c) openCleaningSnapshot(c);
          }
        } else if (entry.type === 'item') {
          store.toggleTodayItem(entry);
          if (entry.done) toast(`${ref.name} · done`);
        } else if (!entry.done) {
          openRoutineRun(ref.id, { todayEntryId: entry.id });
        } else if (entry.completionId) {
          const c = s.completions.find((x) => x.id === entry.completionId);
          if (c) openCompletionSnapshot(c);
        }
      },
    });
    if (entry.done) row.classList.add('done');
    todayCard.append(row);
  }
  root.append(todayCard);

  const upcoming = store.upcomingPlanned(3);
  if (upcoming.length) {
    const up = el('div.upcoming');
    for (const p of upcoming) {
      let label;
      if (p.type === 'cleaning') {
        const names = (p.roomIds || []).map((id) => s.rooms[id]?.name).filter(Boolean).join(', ');
        label = `Home Cleaning${names ? ` — ${names}` : ''}`;
      } else {
        const ref = p.type === 'item' ? s.items[p.refId] : s.routines[p.refId];
        if (!ref) { store.removePlanned(p.id); continue; }
        label = ref.name;
      }
      up.append(el('div.up-row', {}, [
        el('span.up-when', {}, planLabel(p.dateKey)),
        el('span.up-name', {}, label),
        el('button.icon-btn', {
          'aria-label': 'Remove plan',
          onclick: () => { store.removePlanned(p.id); toast('Plan removed', null); },
        }, [icon(ICONS.x, { size: 14 })]),
      ]));
    }
    if (up.children.length) root.append(up);
  }

  /* ── My Routines · scheduled-for-today first, then the daily ones ── */

  root.append(el('div.section-title', {}, [
    'My Routines',
    el('button.link', { onclick: () => { location.hash = '#/library'; } }, 'Library'),
  ]));

  const routinesCard = el('div.card', { style: { padding: '10px 14px' } });
  const forToday = store.routinesForDay(today);

  for (const r of forToday) {
    const scheduled = r.days?.length && r.days.length < 7;
    const doneToday = store.routineDoneOn(r.id, s.today.dateKey);
    const trail = [];
    if (scheduled) trail.push(el('span.day-chip.today', {}, `Today · ${dayShort(today)}`));
    if (doneToday) trail.push(icon(ICONS.done, { size: 17, cls: 'done-mark' }));
    trail.push(chev());

    routinesCard.append(itemRow(r, {
      sub: `${r.itemIds.length} item${r.itemIds.length === 1 ? '' : 's'}`,
      trail,
      onclick: () => openRoutineRun(r.id),
    }));
  }

  // Home Cleaning lives here too — it opens its own room-picker flow.
  routinesCard.append(itemRow(
    { name: 'Home Cleaning', icon: ICONS.broom },
    {
      category: 'home',
      sub: 'Pick rooms, add to today',
      trail: chev(),
      onclick: startCleaningFlow,
    }
  ));

  root.append(routinesCard);

  /* ── Recent activity ── */

  const recent = store.recentActivity(6);
  root.append(el('div.section-title', {}, 'Recent activity'));
  if (!recent.length) {
    root.append(el('div.card', {}, [el('div.empty', {}, [
      el('span.hand', {}, 'Nothing here yet'),
      'Your latest moments will gather here, gently.',
    ])]));
    return;
  }

  const card = el('div.card', { style: { padding: '8px 14px' } });
  for (const a of recent) {
    if (a.kind === 'log') {
      const item = s.items[a.data.itemId];
      if (!item) continue;
      card.append(itemRow(item, {
        sub: relTime(a.ts),
        onclick: () => openItemDetail(item.id),
      }));
    } else if (a.kind === 'completion') {
      card.append(itemRow(
        { name: a.data.name, icon: a.data.icon, category: a.data.category },
        {
          sub: `Routine · ${relTime(a.ts)}`,
          onclick: () => openCompletionSnapshot(a.data),
        }
      ));
    } else if (a.kind === 'cleaning') {
      const roomNames = a.data.rooms.map((r) => r.name).join(', ');
      card.append(itemRow(
        { name: 'Home Cleaning', icon: ICONS.broom, category: 'home' },
        { sub: `${roomNames} · ${relTime(a.ts)}`, onclick: () => openCleaningSnapshot(a.data) }
      ));
    }
  }
  root.append(card);
}
