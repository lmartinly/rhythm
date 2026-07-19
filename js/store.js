// Rhythm · data layer (localStorage, no backend)

import { uid, dateKey } from './util.js';
import { buildSeed } from './seed.js';

const KEY = 'rhythm.v1';

const VERSION = 3;

/* v1 stored emoji icons; v2 uses Lucide names and adds product/notes/days. */
const EMOJI_TO_ICON = {
  '🫧': 'droplets', '🧖‍♀️': 'wand-sparkles', '💧': 'droplet', '🌸': 'flower-2',
  '🪞': 'sparkles', '💅': 'hand-heart', '🧴': 'milk', '🛁': 'bath', '🌞': 'sun',
  '🌙': 'moon', '🚿': 'shower-head', '🐚': 'flower', '🌅': 'sun', '✨': 'sparkles',
  '🏃‍♀️': 'activity', '🧘‍♀️': 'wind', '🏋️': 'dumbbell', '🚶‍♀️': 'footprints',
  '🚴‍♀️': 'bike', '🩰': 'person-standing', '⛰️': 'footprints', '🌿': 'leaf',
  '🧺': 'washing-machine', '🧹': 'brush-cleaning', '🫙': 'refrigerator',
  '🍽️': 'utensils', '🛏️': 'bed-double', '🪴': 'sprout', '🕯️': 'lamp',
  '🧽': 'spray-can', '🍳': 'cooking-pot', '🛋️': 'sofa', '🧼': 'droplets',
  '💊': 'pill', '🩺': 'stethoscope', '🦷': 'smile', '😴': 'alarm-clock',
  '📖': 'book-open', '☕': 'coffee', '🍋': 'salad', '📓': 'notebook-pen', '🪥': 'smile',
};

const CATEGORY_ICON = { beauty: 'sparkles', fitness: 'dumbbell', home: 'sofa', health: 'heart-pulse' };

function migrateIcon(iconValue, fallback) {
  if (typeof iconValue === 'string' && /^[a-z0-9-]+$/.test(iconValue)) return iconValue; // already a name
  return EMOJI_TO_ICON[iconValue] || fallback;
}

function migrate(data) {
  if (data.version === 1) {
    for (const it of Object.values(data.items || {})) {
      it.icon = migrateIcon(it.icon, CATEGORY_ICON[it.category] || 'sparkles');
      if (it.product == null) it.product = '';
      if (it.notes == null) it.notes = '';
    }
    for (const r of Object.values(data.routines || {})) {
      r.icon = migrateIcon(r.icon, CATEGORY_ICON[r.category] || 'sparkles');
      if (!Array.isArray(r.days)) r.days = [];
    }
    for (const rm of Object.values(data.rooms || {})) {
      rm.icon = migrateIcon(rm.icon, 'sofa');
    }
    for (const c of data.cleaning || []) {
      for (const rm of c.rooms || []) rm.icon = migrateIcon(rm.icon, 'sofa');
    }
    for (const c of data.completions || []) {
      c.icon = migrateIcon(c.icon, 'sparkles');
      for (const s of c.itemStates || []) s.icon = migrateIcon(s.icon, 'sparkles');
    }
    data.version = 2;
  }
  if (data.version === 2) {
    // planned-ahead entries land in v3
    if (!Array.isArray(data.planned)) data.planned = [];
    // v2 seeded example products as if they were the user's own — clear them
    const EX_PRODUCT = 'Beauty of Joseon Glow Serum';
    const EX_NOTES = 'Retinol, azelaic acid — whatever the current active is.';
    for (const it of Object.values(data.items || {})) {
      if (it.product === EX_PRODUCT) it.product = '';
      if (it.notes === EX_NOTES) it.notes = '';
    }
    for (const c of data.completions || []) {
      for (const s of c.itemStates || []) {
        if (s.product === EX_PRODUCT) s.product = '';
      }
    }
    data.version = 3;
  }
  return data;
}

function blankState() {
  const seed = buildSeed();
  return {
    version: VERSION,
    settings: { theme: 'system', driveClientId: '' },
    items: seed.items,
    routines: seed.routines,
    rooms: seed.rooms,
    logs: [],          // { id, ts, dateKey, itemId, source: {type, refId?, completionId?} }
    completions: [],   // routine completion snapshots
    cleaning: [],      // cleaning session snapshots
    today: { dateKey: dateKey(), entries: [] },
    planned: [],   // { id, dateKey, type: 'item'|'routine'|'cleaning', refId?, roomIds? }
    pinned: seed.pinned,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const data = JSON.parse(raw);
    if (!data || ![1, 2, VERSION].includes(data.version)) return blankState();
    return migrate(data);
  } catch {
    return blankState();
  }
}

const listeners = new Set();

export const store = {
  state: load(),

  save() {
    localStorage.setItem(KEY, JSON.stringify(this.state));
    for (const fn of listeners) fn();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /* ── today (resets each day, nothing auto-added) ── */

  ensureToday() {
    const today = dateKey();
    let dirty = false;
    if (this.state.today.dateKey !== today) {
      this.state.today = { dateKey: today, entries: [] };
      dirty = true;
    }
    // planned things whose day has come move into Today — quietly, no overdue labels
    const due = (this.state.planned || []).filter((p) => p.dateKey <= today);
    if (due.length) {
      for (const p of due) {
        if (p.type === 'cleaning') {
          this.state.today.entries.push({ id: uid(), type: 'cleaning', roomIds: p.roomIds || [], done: false });
        } else {
          const ref = p.type === 'item' ? this.state.items[p.refId] : this.state.routines[p.refId];
          if (ref) this.state.today.entries.push({ id: uid(), type: p.type, refId: p.refId, done: false });
        }
      }
      this.state.planned = this.state.planned.filter((p) => p.dateKey > today);
      dirty = true;
    }
    if (dirty) this.save();
  },

  addToToday(type, refId) {
    this.ensureToday();
    const entries = this.state.today.entries;
    if (entries.some((e) => e.type === type && e.refId === refId && !e.done)) return;
    entries.push({ id: uid(), type, refId, done: false });
    this.save();
  },

  removeFromToday(entryId) {
    const t = this.state.today;
    t.entries = t.entries.filter((e) => e.id !== entryId);
    this.save();
  },

  /* ── logging items ── */

  logItem(itemId, source = { type: 'quick' }, dk = null) {
    // dk lets you log for another day; the timestamp lands at midday
    const ts = dk ? new Date(`${dk}T12:00:00`).getTime() : Date.now();
    const log = { id: uid(), ts, dateKey: dk || dateKey(), itemId, source };
    this.state.logs.push(log);
    this.save();
    return log;
  },

  deleteLog(logId) {
    this.state.logs = this.state.logs.filter((l) => l.id !== logId);
    this.save();
  },

  deleteCompletion(completionId) {
    this.state.completions = this.state.completions.filter((c) => c.id !== completionId);
    this.state.logs = this.state.logs.filter((l) => l.source?.completionId !== completionId);
    for (const e of this.state.today.entries) {
      if (e.completionId === completionId) { e.done = false; delete e.completionId; }
    }
    this.save();
  },

  deleteCleaningSession(id) {
    this.state.cleaning = this.state.cleaning.filter((c) => c.id !== id);
    for (const e of this.state.today.entries) {
      if (e.cleaningId === id) { e.done = false; delete e.cleaningId; }
    }
    this.save();
  },

  /* ── planning ahead ── */

  addPlanned(dk, type, { refId = null, roomIds = null } = {}) {
    const dup = (this.state.planned || []).some((p) =>
      p.dateKey === dk && p.type === type && p.refId === refId);
    if (dup && type !== 'cleaning') return null;
    const p = { id: uid(), dateKey: dk, type, refId, roomIds };
    this.state.planned.push(p);
    this.save();
    return p;
  },

  removePlanned(id) {
    this.state.planned = this.state.planned.filter((p) => p.id !== id);
    this.save();
  },

  plannedOn(dk) {
    return (this.state.planned || []).filter((p) => p.dateKey === dk);
  },

  upcomingPlanned(limit = 3) {
    return [...(this.state.planned || [])]
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(0, limit);
  },

  plannedDays(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const set = new Set();
    for (const p of this.state.planned || []) {
      if (p.dateKey.startsWith(prefix)) set.add(p.dateKey);
    }
    return set;
  },

  removeLog(logId) {
    this.state.logs = this.state.logs.filter((l) => l.id !== logId);
    this.save();
  },

  toggleTodayItem(entry) {
    if (entry.type !== 'item') return;
    if (!entry.done) {
      const log = this.logItem(entry.refId, { type: 'today' });
      entry.done = true;
      entry.logId = log.id;
    } else {
      if (entry.logId) this.state.logs = this.state.logs.filter((l) => l.id !== entry.logId);
      entry.done = false;
      entry.logId = null;
    }
    this.save();
  },

  /* ── routines ── */

  completeRoutine(routineId, checkedIds, todayEntryId = null) {
    const r = this.state.routines[routineId];
    if (!r) return;
    const completionId = uid();
    const ts = Date.now();
    const dk = dateKey();
    const itemStates = r.itemIds
      .filter((id) => this.state.items[id])
      .map((id) => {
        const it = this.state.items[id];
        return { itemId: id, name: it.name, icon: it.icon, product: it.product || '', checked: checkedIds.includes(id) };
      });
    this.state.completions.push({
      id: completionId, ts, dateKey: dk,
      routineId, name: r.name, icon: r.icon, category: r.category, itemStates,
    });
    for (const id of checkedIds) {
      if (!this.state.items[id]) continue;
      this.state.logs.push({
        id: uid(), ts, dateKey: dk, itemId: id,
        source: { type: 'routine', refId: routineId, completionId },
      });
    }
    if (todayEntryId) {
      const entry = this.state.today.entries.find((e) => e.id === todayEntryId);
      if (entry) { entry.done = true; entry.completionId = completionId; }
    }
    this.save();
    return completionId;
  },

  /* ── cleaning sessions ── */

  saveCleaningSession(roomsSnapshot, todayEntryId = null) {
    const session = {
      id: uid(), ts: Date.now(), dateKey: dateKey(),
      rooms: roomsSnapshot, // [{name, icon, tasks:[{name, done}]}]
    };
    this.state.cleaning.push(session);
    if (todayEntryId) {
      const entry = this.state.today.entries.find((e) => e.id === todayEntryId);
      if (entry) { entry.done = true; entry.cleaningId = session.id; }
    }
    this.save();
    return session;
  },

  /* ── CRUD: items / routines / rooms ── */

  upsertItem(item) {
    const id = item.id || uid();
    const prev = this.state.items[id] || { createdAt: Date.now(), archived: false };
    this.state.items[id] = { ...prev, ...item, id };
    this.save();
    return id;
  },

  upsertRoutine(routine) {
    const id = routine.id || uid();
    const prev = this.state.routines[id] || { createdAt: Date.now(), archived: false };
    this.state.routines[id] = { ...prev, ...routine, id };
    this.save();
    return id;
  },

  upsertRoom(room) {
    const id = room.id || uid();
    const prev = this.state.rooms[id] || {};
    this.state.rooms[id] = { ...prev, ...room, id };
    this.save();
    return id;
  },

  duplicateItem(id) {
    const it = this.state.items[id];
    if (!it) return;
    return this.upsertItem({ ...it, id: null, name: `${it.name} copy`, createdAt: Date.now() });
  },

  duplicateRoutine(id) {
    const r = this.state.routines[id];
    if (!r) return;
    return this.upsertRoutine({ ...r, id: null, name: `${r.name} copy`, itemIds: [...r.itemIds], createdAt: Date.now() });
  },

  duplicateRoom(id) {
    const rm = this.state.rooms[id];
    if (!rm) return;
    return this.upsertRoom({ ...rm, id: null, name: `${rm.name} copy`, tasks: [...rm.tasks] });
  },

  setArchived(kind, id, archived) {
    const obj = this.state[kind][id];
    if (obj) { obj.archived = archived; this.save(); }
  },

  deleteItem(id) {
    delete this.state.items[id];
    for (const r of Object.values(this.state.routines)) {
      r.itemIds = r.itemIds.filter((x) => x !== id);
    }
    this.state.pinned = this.state.pinned.filter((x) => x !== id);
    this.state.today.entries = this.state.today.entries.filter(
      (e) => !(e.type === 'item' && e.refId === id)
    );
    this.state.logs = this.state.logs.filter((l) => l.itemId !== id);
    this.save();
  },

  deleteRoutine(id) {
    delete this.state.routines[id];
    this.state.today.entries = this.state.today.entries.filter(
      (e) => !(e.type === 'routine' && e.refId === id && !e.done)
    );
    this.save();
  },

  deleteRoom(id) {
    delete this.state.rooms[id];
    this.save();
  },

  togglePinned(itemId) {
    const p = this.state.pinned;
    const i = p.indexOf(itemId);
    if (i >= 0) p.splice(i, 1); else p.push(itemId);
    this.save();
  },

  /* ── queries ── */

  activeItems() {
    return Object.values(this.state.items)
      .filter((i) => !i.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  activeRoutines() {
    return Object.values(this.state.routines)
      .filter((r) => !r.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  roomList() {
    return Object.values(this.state.rooms).sort((a, b) => a.name.localeCompare(b.name));
  },

  /* ── weekly rotation ── */

  /** Routines that belong on the dashboard today: unscheduled ones plus
      whatever the rotation says tonight. Scheduled ones come first. */
  routinesForDay(code) {
    const all = this.activeRoutines();
    const daily = all
      .filter((r) => !r.days?.length || r.days.length === 7)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return [
      ...all.filter((r) => r.days?.length && r.days.length < 7 && r.days.includes(code)),
      ...daily,
    ];
  },

  /** Scheduled routines only, ordered Monday→Sunday for the week view. */
  weeklyRotation() {
    const order = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    return this.activeRoutines()
      .filter((r) => r.days?.length && r.days.length < 7)
      .sort((a, b) => order.indexOf(a.days[0]) - order.indexOf(b.days[0]) || a.name.localeCompare(b.name));
  },

  routineDoneOn(routineId, dk) {
    return this.state.completions.some((c) => c.routineId === routineId && c.dateKey === dk);
  },

  itemHistory(itemId) {
    return this.state.logs.filter((l) => l.itemId === itemId).sort((a, b) => b.ts - a.ts);
  },

  lastDone(itemId) {
    let last = null;
    for (const l of this.state.logs) {
      if (l.itemId === itemId && (!last || l.ts > last.ts)) last = l;
    }
    return last;
  },

  logCount(itemId) {
    return this.state.logs.reduce((n, l) => n + (l.itemId === itemId ? 1 : 0), 0);
  },

  /** Everything that happened on a given day, newest first. */
  activitiesOn(dk) {
    const out = [];
    for (const c of this.state.completions) {
      if (c.dateKey === dk) out.push({ kind: 'completion', ts: c.ts, data: c });
    }
    for (const s of this.state.cleaning) {
      if (s.dateKey === dk) out.push({ kind: 'cleaning', ts: s.ts, data: s });
    }
    for (const l of this.state.logs) {
      if (l.dateKey === dk && l.source.type !== 'routine') {
        out.push({ kind: 'log', ts: l.ts, data: l });
      }
    }
    return out.sort((a, b) => b.ts - a.ts);
  },

  recentActivity(limit = 6) {
    const out = [];
    for (const c of this.state.completions) out.push({ kind: 'completion', ts: c.ts, data: c });
    for (const s of this.state.cleaning) out.push({ kind: 'cleaning', ts: s.ts, data: s });
    for (const l of this.state.logs) {
      if (l.source.type !== 'routine') out.push({ kind: 'log', ts: l.ts, data: l });
    }
    return out.sort((a, b) => b.ts - a.ts).slice(0, limit);
  },

  /** Map of dateKey -> Set of category classes, for calendar dots. */
  monthDots(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const map = {};
    const add = (dk, cat) => {
      if (!dk.startsWith(prefix) || !cat) return;
      (map[dk] ||= new Set()).add(cat);
    };
    for (const l of this.state.logs) {
      const it = this.state.items[l.itemId];
      add(l.dateKey, it && it.category);
    }
    for (const s of this.state.cleaning) add(s.dateKey, 'home');
    return map;
  },

  /* ── backup ── */

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || ![1, 2, VERSION].includes(data.version) || !data.items || !data.logs) {
      throw new Error('This file is not a Rhythm backup.');
    }
    this.state = migrate(data);
    this.save();
  },
};

store.ensureToday();
