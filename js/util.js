// Rhythm · shared utilities

import { ICON_PATHS } from './icons.js';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Tiny DOM builder. el('div.card', {onclick}, [children|string]) */
export function el(spec, attrs = {}, children = []) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else if (k in node && k !== 'list' && typeof v !== 'string') {
      node[k] = v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/* ── icons (Lucide, https://lucide.dev · ISC) ── */

/** Render a Lucide icon by name. icon('sparkles', {size:20, cls:'chev'}) */
export function icon(name, { size = 20, cls = '', sw = 1.8 } = {}) {
  const path = ICON_PATHS[name] || ICON_PATHS.sparkles;
  const wrap = document.createElement('span');
  wrap.style.display = 'contents';
  wrap.innerHTML =
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${path}</svg>`;
  return wrap.firstElementChild;
}

/** Soft tinted circle chip holding an icon — the item/routine identity mark. */
export function iconChip(name, category = 'beauty', size = 'md') {
  return el(`span.icn-chip.chip-${size}.t-${category}`, {}, [
    icon(name, { size: size === 'lg' ? 24 : size === 'sm' ? 16 : 19 }),
  ]);
}

/** Internal aliases for UI chrome icons. */
export const ICONS = {
  check: 'check', plus: 'plus', x: 'x',
  chevL: 'chevron-left', chevR: 'chevron-right', dots: 'ellipsis',
  edit: 'pencil', copy: 'copy', archive: 'archive', trash: 'trash-2',
  pin: 'star', restore: 'rotate-ccw', search: 'search', done: 'circle-check',
  home: 'house', cal: 'calendar-days', quick: 'circle-plus',
  lib: 'library-big', gear: 'sliders-horizontal',
  sparkle: 'sparkles', broom: 'brush-cleaning',
};

/* ── categories ── */

export const CATEGORIES = {
  beauty: { name: 'Beauty', cls: 'c-beauty', icon: 'sparkles' },
  fitness: { name: 'Fitness', cls: 'c-fitness', icon: 'dumbbell' },
  home: { name: 'Home', cls: 'c-home', icon: 'sofa' },
  health: { name: 'Health', cls: 'c-health', icon: 'heart-pulse' },
};

/** Curated picker set — enough variety to tell things apart at a glance. */
export const ICON_CHOICES = [
  { label: 'Beauty', names: ['sparkles', 'droplet', 'droplets', 'sun', 'moon', 'moon-star', 'flower-2', 'flower', 'wand-sparkles', 'milk', 'hand-heart', 'palette', 'scissors', 'smile', 'shower-head', 'bath'] },
  { label: 'Fitness', names: ['dumbbell', 'activity', 'footprints', 'bike', 'person-standing', 'wind', 'timer'] },
  { label: 'Home', names: ['sofa', 'armchair', 'bed-double', 'lamp', 'washing-machine', 'brush-cleaning', 'spray-can', 'utensils', 'cooking-pot', 'refrigerator', 'shirt', 'sprout', 'trash-2'] },
  { label: 'Health', names: ['heart', 'heart-pulse', 'pill', 'stethoscope', 'glass-water', 'coffee', 'salad', 'leaf', 'book-open', 'notebook-pen', 'music-2', 'alarm-clock', 'star'] },
];

/* ── weekdays (Monday-first) ── */

export const WEEKDAYS = [
  { code: 'MO', letter: 'M', short: 'Mon', name: 'Monday' },
  { code: 'TU', letter: 'T', short: 'Tue', name: 'Tuesday' },
  { code: 'WE', letter: 'W', short: 'Wed', name: 'Wednesday' },
  { code: 'TH', letter: 'T', short: 'Thu', name: 'Thursday' },
  { code: 'FR', letter: 'F', short: 'Fri', name: 'Friday' },
  { code: 'SA', letter: 'S', short: 'Sat', name: 'Saturday' },
  { code: 'SU', letter: 'S', short: 'Sun', name: 'Sunday' },
];

const DAY_BY_GETDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export const dayCode = (d = new Date()) => DAY_BY_GETDAY[d.getDay()];
export const dayShort = (code) => WEEKDAYS.find((w) => w.code === code)?.short || code;

/** 'Mon · Wed · Fri', or 'Every day' when unscheduled. */
export function daysLabel(days) {
  if (!days || !days.length) return 'Every day';
  if (days.length === 7) return 'Every day';
  return WEEKDAYS.filter((w) => days.includes(w.code)).map((w) => w.short).join(' · ');
}

/* ── dates ── */

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const monthName = (m) => MONTHS[m];

export function longDate(d = new Date()) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function shortDate(key) {
  const d = keyToDate(key);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

export function timeOf(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function relTime(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400 && dateKey(new Date(ts)) === dateKey()) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days <= 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(dateKey(new Date(ts)));
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Hello, night owl';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
