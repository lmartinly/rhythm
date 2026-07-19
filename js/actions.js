// Rhythm · shared flows used across views

import { el, icon, iconChip, ICONS, CATEGORIES, relTime, timeOf, shortDate, daysLabel, dateKey, addDays, planLabel } from './util.js';
import { store } from './store.js';
import {
  openSheet, toast, confirmSheet, textField, textArea,
  iconField, daysField, categoryField, ringButton, openMenu, openDateSheet,
} from './ui.js';

/* ── helpers ── */

/** Subtle iOS-style disclosure chevron. */
export const chev = () => icon('chevron-right', { size: 16, sw: 2, cls: 'chev' });

export function itemRow(item, { sub = null, trail = null, onclick = null, category = null } = {}) {
  const cat = category || item.category || 'home';
  return el(onclick ? 'button.row' : 'div.row', { onclick }, [
    iconChip(item.icon, cat),
    el('div.body', {}, [
      el('div.title', {}, item.name),
      sub != null ? el('div.sub', {}, sub) : null,
    ]),
    el('div.trail', {}, [].concat(trail || []).filter(Boolean)),
  ]);
}

/** Sheet title with an identity chip next to the text. */
export const sheetTitle = (iconName, text, category = 'beauty') =>
  el('span.sheet-title-ic', {}, [iconChip(iconName, category, 'sm'), text]);

const lastDoneText = (itemId) => {
  const last = store.lastDone(itemId);
  return last ? `Last done ${relTime(last.ts)}` : 'Not logged yet';
};

/** Reference-first subtitle: the current product if set, else last-done. */
const refSub = (item) => item.product || lastDoneText(item.id);

/* ── quick log a single item ── */

export function quickLog(itemId) {
  const item = store.state.items[itemId];
  if (!item) return;
  store.logItem(itemId, { type: 'quick' });
  toast(`${item.name} · saved`);
}

/* ── routine run sheet (also the reference view of what's inside) ── */

export function openRoutineRun(routineId, { todayEntryId = null } = {}) {
  const r = store.state.routines[routineId];
  if (!r) return;
  const items = r.itemIds.map((id) => store.state.items[id]).filter(Boolean);

  // From Today → tick as you go, progress persists on the entry.
  // From My Routines / Library → quick log: everything pre-checked, uncheck skips.
  const entry = todayEntryId
    ? store.state.today.entries.find((e) => e.id === todayEntryId)
    : null;
  const tickMode = !!entry && !entry.done;
  if (tickMode && !Array.isArray(entry.checked)) entry.checked = [];
  const checked = tickMode
    ? new Set(entry.checked.filter((id) => r.itemIds.includes(id)))
    : new Set(items.map((i) => i.id));
  const persist = () => {
    if (tickMode) { entry.checked = [...checked]; store.save(); }
  };

  const list = el('div');
  const doneBtn = el('button.btn.full', {}, 'Complete routine');

  const renderList = () => {
    list.replaceChildren();
    if (!items.length) {
      list.append(el('div.empty', {}, [
        el('span.hand', {}, 'Nothing inside yet'),
        'Add items to this routine from the Library.',
      ]));
    }
    for (const item of items) {
      const on = checked.has(item.id);
      const toggle = () => {
        if (checked.has(item.id)) checked.delete(item.id); else checked.add(item.id);
        persist();
        renderList();
      };
      const row = itemRow(item, {
        sub: refSub(item),
        trail: ringButton(on, toggle),
        onclick: toggle,
      });
      if (tickMode) { if (on) row.classList.add('done'); }
      else if (!on) row.style.opacity = '0.55';
      list.append(row);
    }
    doneBtn.disabled = items.length === 0;
    doneBtn.textContent = checked.size === items.length
      ? 'Complete routine'
      : `Complete ${checked.size} of ${items.length}`;
  };
  renderList();

  const menuBtn = el('button.icon-btn', {
    'aria-label': 'Routine options',
    onclick: (e) => {
      const actions = libraryMenuActions('routines', r).map((a) => ({
        ...a,
        onclick: () => { sheet.close(); a.onclick(); },
      }));
      openMenu(e.currentTarget, actions);
    },
  }, [icon(ICONS.dots, { size: 18 })]);

  const sheet = openSheet({
    title: sheetTitle(r.icon, r.name, r.category),
    headExtra: menuBtn,
    body: [
      el('p.muted', { style: { margin: '0 2px 10px' } },
        tickMode
          ? 'Tick as you go — close any time, your progress waits in Today.'
          : 'Uncheck anything you skipped this time.'),
      el('div.card', { style: { padding: '8px 12px' } }, [list]),
    ],
    foot: doneBtn,
  });

  doneBtn.addEventListener('click', () => {
    store.completeRoutine(routineId, [...checked], todayEntryId);
    sheet.close();
    toast(`${r.name} · completed`);
  });
}

/* ── add to today picker ── */

export function openAddToToday({ date = null } = {}) {
  const search = el('input.input', { placeholder: 'Search…', type: 'search' });
  const list = el('div');
  const today = dateKey();
  let targetDk = date || today;
  const fixedDate = !!date;

  const alreadyChosen = (type, refId) => targetDk === today
    ? store.state.today.entries.some((e) => e.type === type && e.refId === refId && !e.done)
    : store.state.planned.some((p) => p.dateKey === targetDk && p.type === type && p.refId === refId);

  const choose = (type, ref) => {
    if (alreadyChosen(type, ref.id)) return;
    if (targetDk === today) {
      store.addToToday(type, ref.id);
      toast(`${ref.name} · added to today`, ICONS.plus);
    } else {
      store.addPlanned(targetDk, type, { refId: ref.id });
      toast(`${ref.name} · planned for ${planLabel(targetDk)}`, ICONS.cal);
    }
    render();
  };

  // Today / Tomorrow / any day
  const daySeg = el('div.seg', { style: { marginBottom: '12px' } });
  const paintSeg = () => {
    daySeg.replaceChildren();
    const opts = [
      ['Today', () => { targetDk = today; paintSeg(); render(); }, targetDk === today],
      ['Tomorrow', () => { targetDk = addDays(today, 1); paintSeg(); render(); }, targetDk === addDays(today, 1)],
      [targetDk !== today && targetDk !== addDays(today, 1) ? planLabel(targetDk) : 'Pick a day…',
        async () => {
          const dk = await openDateSheet({ title: 'Plan for a day' });
          if (dk) { targetDk = dk; paintSeg(); render(); }
        },
        targetDk !== today && targetDk !== addDays(today, 1)],
    ];
    for (const [label, fn, on] of opts) {
      daySeg.append(el('button' + (on ? '.on' : ''), { onclick: fn }, label));
    }
  };
  if (!fixedDate) paintSeg();

  const render = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();

    const routines = store.activeRoutines().filter((r) => r.name.toLowerCase().includes(q));
    const items = store.activeItems().filter((i) => i.name.toLowerCase().includes(q));

    const section = (label, rows) => {
      if (!rows.length) return;
      list.append(el('div.section-title', { style: { marginTop: '14px' } }, label));
      const card = el('div.card', { style: { padding: '6px 12px' } });
      rows.forEach((r) => card.append(r));
      list.append(card);
    };

    // Home Cleaning is plannable too — it opens the room picker for the chosen day
    if (!q || 'home cleaning'.includes(q)) {
      const card = el('div.card', { style: { padding: '6px 12px', marginBottom: '2px' } });
      card.append(itemRow(
        { name: 'Home Cleaning', icon: ICONS.broom },
        {
          category: 'home',
          sub: targetDk === today ? 'Pick rooms, add to today' : `Pick rooms for ${planLabel(targetDk)}`,
          trail: chev(),
          onclick: () => startCleaningFlow({ planDk: targetDk === today ? null : targetDk }),
        }
      ));
      list.append(card);
    }

    section('Routines', routines.map((r) => {
      const chosen = alreadyChosen('routine', r.id);
      return itemRow(r, {
        sub: `${r.itemIds.length} item${r.itemIds.length === 1 ? '' : 's'} · ${daysLabel(r.days)}`,
        trail: icon(chosen ? ICONS.check : ICONS.plus, { size: 18 }),
        onclick: () => choose('routine', r),
      });
    }));

    section('Items', items.map((i) => {
      const chosen = alreadyChosen('item', i.id);
      return itemRow(i, {
        sub: refSub(i),
        trail: icon(chosen ? ICONS.check : ICONS.plus, { size: 18 }),
        onclick: () => choose('item', i),
      });
    }));

    if (!routines.length && !items.length) {
      list.append(el('div.empty', {}, 'Nothing matches that yet.'));
    }
  };

  search.addEventListener('input', render);
  render();

  openSheet({
    title: fixedDate ? `Plan for ${planLabel(targetDk)}` : 'Choose',
    body: [fixedDate ? null : daySeg, search, list],
  });
}

/* ── item editor ── */

export function openItemEditor(item = null, onSaved = null) {
  const name = textField('Name', item ? item.name : '', 'e.g. Serum');
  const product = textField('Current product', item ? item.product || '' : '', 'e.g. Beauty of Joseon Glow Serum');
  const notes = textArea('Notes', item ? item.notes || '' : '', 'Anything worth remembering — how to use it, repurchase links…');
  const category = categoryField('Category', item ? item.category : 'beauty');
  const icn = iconField('Icon', item ? item.icon : 'sparkles');
  const save = el('button.btn.full', {}, item ? 'Save changes' : 'Create item');

  const sheet = openSheet({
    title: item ? 'Edit item' : 'New item',
    body: [
      name.field, product.field,
      el('p.field-hint', {}, 'Items stay generic — swap the product any time without touching your routines.'),
      notes.field, category.field, icn.field,
    ],
    foot: save,
  });
  setTimeout(() => name.input.focus(), 350);

  save.addEventListener('click', () => {
    if (!name.value) { name.input.focus(); return; }
    const id = store.upsertItem({
      id: item ? item.id : null,
      name: name.value, product: product.value, notes: notes.value,
      icon: icn.value, category: category.value,
    });
    sheet.close();
    toast(item ? 'Item saved' : `${name.value} · created`);
    if (onSaved) onSaved(id);
  });
}

/* ── routine editor ── */

export function openRoutineEditor(routine = null, onSaved = null) {
  const name = textField('Name', routine ? routine.name : '', 'e.g. Monday PM');
  const days = daysField('Days of the week', routine ? routine.days || [] : []);
  const category = categoryField('Category', routine ? routine.category : 'beauty');
  const icn = iconField('Icon', routine ? routine.icon : 'moon');
  const selected = new Set(routine ? routine.itemIds : []);

  const itemsWrap = el('div.card', { style: { padding: '6px 12px' } });
  const renderItems = () => {
    itemsWrap.replaceChildren();
    for (const it of store.activeItems()) {
      const toggle = () => {
        if (selected.has(it.id)) selected.delete(it.id); else selected.add(it.id);
        renderItems();
      };
      itemsWrap.append(itemRow(it, {
        sub: it.product || null,
        trail: ringButton(selected.has(it.id), toggle),
        onclick: toggle,
      }));
    }
    itemsWrap.append(el('button.row', {
      onclick: () => openItemEditor(null, (id) => { selected.add(id); renderItems(); }),
    }, [
      el('span.icn-chip.chip-md.t-plain', {}, [icon(ICONS.plus, { size: 18 })]),
      el('div.body', {}, [el('div.title', { style: { color: 'var(--rose)' } }, 'New item')]),
    ]));
  };
  renderItems();

  const save = el('button.btn.full', {}, routine ? 'Save changes' : 'Create routine');
  const sheet = openSheet({
    title: routine ? 'Edit routine' : 'New routine',
    body: [
      name.field, days.field, category.field, icn.field,
      el('div.field', {}, [el('label', {}, 'Items inside'), itemsWrap]),
    ],
    foot: save,
  });

  save.addEventListener('click', () => {
    if (!name.value) { name.input.focus(); return; }
    // preserve original ordering for existing items, append newly added
    const order = routine ? routine.itemIds.filter((id) => selected.has(id)) : [];
    for (const id of selected) if (!order.includes(id)) order.push(id);
    const id = store.upsertRoutine({
      id: routine ? routine.id : null,
      name: name.value, icon: icn.value, category: category.value,
      itemIds: order, days: days.value,
    });
    sheet.close();
    toast(routine ? 'Routine saved' : `${name.value} · created`);
    if (onSaved) onSaved(id);
  });
}

/* ── room template editor ── */

export function openRoomEditor(room = null) {
  const name = textField('Room name', room ? room.name : '', 'e.g. Balcony');
  const icn = iconField('Icon', room ? room.icon : 'sofa');
  const tasks = room ? [...room.tasks] : [];

  const listWrap = el('div.card', { style: { padding: '10px 14px' } });
  const newTask = el('input.input', { placeholder: 'Add a task…', style: { marginTop: '10px' } });

  const renderTasks = () => {
    listWrap.replaceChildren();
    if (!tasks.length) listWrap.append(el('p.muted', {}, 'No tasks yet.'));
    tasks.forEach((t, i) => {
      listWrap.append(el('div.row', {}, [
        el('div.body', {}, [el('div.title', { style: { fontWeight: '450' } }, t)]),
        el('button.icon-btn', {
          'aria-label': `Remove ${t}`,
          onclick: () => { tasks.splice(i, 1); renderTasks(); },
        }, [icon(ICONS.x, { size: 16 })]),
      ]));
    });
  };
  renderTasks();

  newTask.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && newTask.value.trim()) {
      tasks.push(newTask.value.trim());
      newTask.value = '';
      renderTasks();
    }
  });

  const save = el('button.btn.full', {}, room ? 'Save room' : 'Create room');
  const sheet = openSheet({
    title: room ? 'Edit room' : 'New room',
    body: [
      name.field, icn.field,
      el('div.field', {}, [el('label', {}, 'Default tasks'), listWrap, newTask]),
    ],
    foot: save,
  });

  save.addEventListener('click', () => {
    if (newTask.value.trim()) tasks.push(newTask.value.trim());
    if (!name.value) { name.input.focus(); return; }
    store.upsertRoom({ id: room ? room.id : null, name: name.value, icon: icn.value, tasks });
    sheet.close();
    toast('Room saved');
  });
}

/* ── item detail page (product, notes, history) ── */

export function openItemDetail(itemId) {
  const item = store.state.items[itemId];
  if (!item) return;
  const history = store.itemHistory(itemId);
  const cat = CATEGORIES[item.category];

  const body = [
    el('div.detail-head', {}, [
      iconChip(item.icon, item.category, 'lg'),
      el('div', {}, [
        el(`span.badge.${cat.cls}`, {}, cat.name),
        el('p.muted', { style: { marginTop: '5px' } }, lastDoneText(itemId)),
      ]),
    ]),

    // The item is the generic slot; the product is what currently fills it.
    el('button.card.product-card', { onclick: () => openItemEditor(item) }, [
      el('div.body', {}, [
        el('p.card-label', {}, 'Current product'),
        el('div.title' + (item.product ? '' : '.placeholder'), {},
          item.product || 'Add your current product'),
        item.notes ? el('div.sub.notes', {}, item.notes) : null,
      ]),
      chev(),
    ]),

    el('div', { style: { display: 'flex', gap: '10px', margin: '14px 0 6px' } }, [
      el('button.btn', { style: { flex: '1' }, onclick: () => { quickLog(itemId); } }, 'Log it now'),
      el('button.btn.quiet', { style: { flex: '1' }, onclick: () => openItemEditor(item) }, 'Edit'),
    ]),
    el('button.link', {
      style: { margin: '0 0 14px' },
      onclick: async () => {
        const dk = await openDateSheet({ title: 'Log for which day?', mode: 'past' });
        if (!dk) return;
        store.logItem(itemId, { type: 'quick' }, dk);
        toast(`${item.name} · logged for ${shortDate(dk)}`);
        detailSheet.close();
        setTimeout(() => openItemDetail(itemId), 340);
      },
    }, 'Log for another day…'),
  ];

  if (history.length) {
    body.push(el('div.section-title', {}, `History · ${history.length}`));
    const byMonth = new Map();
    for (const log of history.slice(0, 200)) {
      const month = log.dateKey.slice(0, 7);
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(log);
    }
    for (const [month, logs] of byMonth) {
      body.push(el('div.month-label', {}, monthLabel(`${month}-01`)));
      const card = el('div.card', { style: { padding: '6px 14px' } });
      for (const log of logs) {
        const via = log.source.type === 'routine' && store.state.routines[log.source.refId]
          ? ` · via ${store.state.routines[log.source.refId].name}`
          : '';
        const row = el('div.row', {}, [
          el('div.body', {}, [
            el('div.title', { style: { fontWeight: '450' } }, shortDate(log.dateKey)),
            el('div.sub', {}, `${timeOf(log.ts)}${via}`),
          ]),
          el('button.icon-btn', {
            'aria-label': 'Delete this entry',
            onclick: async () => {
              const ok = await confirmSheet({ title: 'Delete this entry?', message: 'Just this one log — nothing else.' });
              if (ok) { store.deleteLog(log.id); row.remove(); toast('Deleted', ICONS.trash); }
            },
          }, [icon(ICONS.x, { size: 15 })]),
        ]);
        card.append(row);
      }
      body.push(card);
    }
  } else {
    body.push(el('div.empty', {}, [
      el('span.hand', {}, 'No history yet'),
      'Whenever you log this, it will be remembered here.',
    ]));
  }

  const detailSheet = openSheet({ title: item.name, body });
}

function monthLabel(dk) {
  const d = new Date(Number(dk.slice(0, 4)), Number(dk.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

/* ── snapshots (read-only, opened from calendar/history) ── */

export function openCompletionSnapshot(completion) {
  const cat = completion.category || 'beauty';
  const rows = completion.itemStates.map((s) =>
    el('div.row', { style: s.checked ? {} : { opacity: '0.45' } }, [
      iconChip(s.icon, cat),
      el('div.body', {}, [
        el('div.title', {}, s.name),
        s.product ? el('div.sub', {}, s.product) : null,
      ]),
      el('div.trail', {}, [
        s.checked
          ? el('span.ring.on', { style: { display: 'grid' } }, [icon(ICONS.check, { size: 15, sw: 2.4 })])
          : el('span.ring'),
      ]),
    ])
  );
  const s = openSheet({
    title: sheetTitle(completion.icon, completion.name, cat),
    body: [
      el('p.muted', { style: { margin: '0 2px 10px' } },
        `Completed ${shortDate(completion.dateKey)} at ${timeOf(completion.ts)}`),
      el('div.card', { style: { padding: '8px 12px' } }, rows),
      el('button.link.danger-link', {
        onclick: async () => {
          const ok = await confirmSheet({
            title: 'Delete this record?',
            message: 'The routine itself stays — only this completion and its item logs are removed.',
          });
          if (ok) { store.deleteCompletion(completion.id); s.close(); toast('Deleted', ICONS.trash); }
        },
      }, 'Delete this record'),
    ],
  });
}

export function openCleaningSnapshot(session) {
  const body = [
    el('p.muted', { style: { margin: '0 2px 10px' } },
      `Cleaned ${shortDate(session.dateKey)} at ${timeOf(session.ts)}`),
  ];
  for (const room of session.rooms) {
    body.push(el('div.section-title.with-ic', {}, [icon(room.icon, { size: 15 }), room.name]));
    const card = el('div.card', { style: { padding: '8px 14px' } });
    for (const t of room.tasks) {
      card.append(el('div.row', { style: t.done ? {} : { opacity: '0.45' } }, [
        el('div.body', {}, [el('div.title', { style: { fontWeight: '450' } }, t.name)]),
        el('div.trail', {}, [
          t.done
            ? el('span.ring.on', { style: { display: 'grid' } }, [icon(ICONS.check, { size: 15, sw: 2.4 })])
            : el('span.ring'),
        ]),
      ]));
    }
    body.push(card);
  }
  body.push(el('button.link.danger-link', {
    onclick: async () => {
      const ok = await confirmSheet({
        title: 'Delete this session?',
        message: 'Your room templates stay — only this record is removed.',
      });
      if (ok) { store.deleteCleaningSession(session.id); s.close(); toast('Deleted', ICONS.trash); }
    },
  }, 'Delete this session'));
  const s = openSheet({ title: sheetTitle(ICONS.broom, 'Home Cleaning', 'home'), body });
}

/* ── Home Cleaning flow (pick rooms → temporary session checklist) ── */

export function startCleaningFlow({ planDk = null, todayEntryId = null, preselect = null } = {}) {
  const rooms = store.roomList();
  if (!rooms.length) {
    toast('Add a room template first', null);
    openRoomEditor();
    return;
  }
  const picked = new Set(preselect || []);
  const list = el('div.card', { style: { padding: '6px 12px' } });
  const begin = el('button.btn.full', { disabled: true },
    planDk ? `Plan for ${planLabel(planDk)}`
      : todayEntryId ? 'Build my checklist'
      : 'Add to Today');
  const planLater = planDk ? null : el('button.btn.quiet.full', {
    style: { marginTop: '10px' },
    onclick: async () => {
      if (!picked.size) { toast('Pick a room first', null); return; }
      const dk = await openDateSheet({ title: 'Clean on which day?' });
      if (!dk) return;
      store.addPlanned(dk, 'cleaning', { roomIds: [...picked] });
      sheet.close();
      toast(`Home Cleaning · planned for ${planLabel(dk)}`, ICONS.cal);
    },
  }, 'Plan for another day');

  const render = () => {
    list.replaceChildren();
    for (const room of rooms) {
      list.append(itemRow(room, {
        category: 'home',
        sub: `${room.tasks.length} task${room.tasks.length === 1 ? '' : 's'}`,
        trail: ringButton(picked.has(room.id), () => { togglePick(room.id); }),
        onclick: () => togglePick(room.id),
      }));
    }
    begin.disabled = picked.size === 0;
  };
  const togglePick = (id) => {
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    render();
  };
  render();

  const sheet = openSheet({
    title: sheetTitle(ICONS.broom, 'Home Cleaning', 'home'),
    body: [
      el('p.muted', { style: { margin: '0 2px 10px' } },
        planDk ? `Which rooms for ${planLabel(planDk)}?` : 'Which rooms are we doing today?'),
      list,
    ],
    foot: [begin, planLater].filter(Boolean),
  });

  begin.addEventListener('click', () => {
    sheet.close();
    if (planDk) {
      store.addPlanned(planDk, 'cleaning', { roomIds: [...picked] });
      toast(`Home Cleaning · planned for ${planLabel(planDk)}`, ICONS.cal);
      return;
    }
    if (todayEntryId) {
      // re-picking rooms for an existing Today entry
      const entry = store.state.today.entries.find((e) => e.id === todayEntryId);
      if (!entry) return;
      entry.roomIds = [...picked];
      entry.session = store.sessionFromRooms(entry.roomIds);
      store.save();
      setTimeout(() => openCleaningSession(entry.session, { todayEntryId }), 340);
      return;
    }
    // the checklist lives in Today now — tick it off whenever you like
    store.addCleaningToToday([...picked]);
    toast('Home Cleaning · added to today', ICONS.plus);
  });
}

/** Open the checklist that lives inside a Today entry — progress persists. */
export function startPlannedCleaning(entry) {
  if (!entry.session || !entry.session.length) {
    const ids = (entry.roomIds || []).filter((id) => store.state.rooms[id]);
    if (!ids.length) {
      startCleaningFlow({ todayEntryId: entry.id });
      return;
    }
    entry.session = store.sessionFromRooms(ids);
    store.save();
  }
  openCleaningSession(entry.session, { todayEntryId: entry.id });
}

function openCleaningSession(sessionRooms, { todayEntryId = null } = {}) {
  const body = el('div');
  const finish = el('button.btn.full', {}, 'Finish session');
  const persist = () => { if (todayEntryId) store.save(); };

  const render = () => {
    body.replaceChildren();
    for (const room of sessionRooms) {
      body.append(el('div.section-title.with-ic', {}, [icon(room.icon, { size: 15 }), room.name]));
      const card = el('div.card', { style: { padding: '8px 14px' } });
      room.tasks.forEach((t, i) => {
        const row = el('button.row' + (t.done ? '.done' : ''), {
          onclick: () => { t.done = !t.done; persist(); render(); },
        }, [
          el('div.body', {}, [el('div.title', { style: { fontWeight: '450' } }, t.name)]),
          el('div.trail', {}, [
            el('span.ring' + (t.done ? '.on' : ''), { style: { display: 'grid' } },
              t.done ? [icon(ICONS.check, { size: 15, sw: 2.4 })] : []),
            el('button.icon-btn', {
              'aria-label': `Remove ${t.name}`,
              onclick: (e) => { e.stopPropagation(); room.tasks.splice(i, 1); persist(); render(); },
            }, [icon(ICONS.x, { size: 16 })]),
          ]),
        ]);
        card.append(row);
      });
      const add = el('input.input', {
        placeholder: 'Add a task for this session…',
        style: { marginTop: '8px', fontSize: '14px' },
      });
      add.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && add.value.trim()) {
          room.tasks.push({ name: add.value.trim(), done: false });
          persist();
          render();
        }
      });
      card.append(add);
      body.append(card);
    }
    const done = sessionRooms.reduce((n, r) => n + r.tasks.filter((t) => t.done).length, 0);
    const total = sessionRooms.reduce((n, r) => n + r.tasks.length, 0);
    finish.textContent = done ? `Finish session · ${done} of ${total} done` : 'Finish session';
  };
  render();

  const sheet = openSheet({
    title: 'Today we clean',
    body: [
      el('p.muted', { style: { margin: '0 2px 4px' } },
        todayEntryId
          ? 'Tick as you go — close any time, your progress waits in Today.'
          : 'Changes here are for this session only — your templates stay put.'),
      body,
    ],
    foot: finish,
  });

  finish.addEventListener('click', () => {
    const anyTasks = sessionRooms.some((r) => r.tasks.length);
    if (!anyTasks) { sheet.close(); return; }
    store.saveCleaningSession(sessionRooms, todayEntryId);
    sheet.close();
    toast('Cleaning session saved');
  });
}

/* ── archive/delete menus (shared by library) ── */

export function libraryMenuActions(kind, obj) {
  const actions = [];
  if (kind === 'items') {
    actions.push({ label: 'Edit', icon: ICONS.edit, onclick: () => openItemEditor(obj) });
    actions.push({ label: 'Duplicate', icon: ICONS.copy, onclick: () => { store.duplicateItem(obj.id); toast('Duplicated'); } });
    actions.push({ label: 'Archive', icon: ICONS.archive, onclick: () => { store.setArchived('items', obj.id, true); toast('Archived'); } });
    actions.push({
      label: 'Delete', icon: ICONS.trash, danger: true,
      onclick: async () => {
        const ok = await confirmSheet({
          title: `Delete ${obj.name}?`,
          message: 'This removes the item and its whole history. Archiving keeps the history safe instead.',
        });
        if (ok) { store.deleteItem(obj.id); toast('Deleted', ICONS.trash); }
      },
    });
  } else if (kind === 'routines') {
    actions.push({ label: 'Edit', icon: ICONS.edit, onclick: () => openRoutineEditor(obj) });
    actions.push({ label: 'Duplicate', icon: ICONS.copy, onclick: () => { store.duplicateRoutine(obj.id); toast('Duplicated'); } });
    actions.push({ label: 'Archive', icon: ICONS.archive, onclick: () => { store.setArchived('routines', obj.id, true); toast('Archived'); } });
    actions.push({
      label: 'Delete', icon: ICONS.trash, danger: true,
      onclick: async () => {
        const ok = await confirmSheet({
          title: `Delete ${obj.name}?`,
          message: 'The items inside keep their own history — only the routine goes away.',
        });
        if (ok) { store.deleteRoutine(obj.id); toast('Deleted', ICONS.trash); }
      },
    });
  } else if (kind === 'rooms') {
    actions.push({ label: 'Edit', icon: ICONS.edit, onclick: () => openRoomEditor(obj) });
    actions.push({ label: 'Duplicate', icon: ICONS.copy, onclick: () => { store.duplicateRoom(obj.id); toast('Duplicated'); } });
    actions.push({
      label: 'Delete', icon: ICONS.trash, danger: true,
      onclick: async () => {
        const ok = await confirmSheet({
          title: `Delete ${obj.name}?`,
          message: 'Past cleaning sessions stay in your history.',
        });
        if (ok) { store.deleteRoom(obj.id); toast('Deleted', ICONS.trash); }
      },
    });
  }
  return actions;
}
