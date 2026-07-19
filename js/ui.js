// Rhythm · UI primitives (sheets, toasts, menus, form fields)

import { el, icon, ICONS, CATEGORIES, ICON_CHOICES, WEEKDAYS, dateKey, addDays } from './util.js';

/* ── bottom sheet ── */

export function openSheet({ title, headExtra = null, body, foot = null, onClose = null }) {
  const backdrop = el('div.backdrop');
  const sheet = el('div.sheet', { role: 'dialog', 'aria-modal': 'true' });

  const close = () => {
    backdrop.classList.remove('in');
    sheet.classList.remove('in');
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 320);
    if (onClose) onClose();
  };

  backdrop.addEventListener('click', close);
  sheet.append(el('div.sheet-grab'));

  if (title) {
    const head = el('div.sheet-head', {}, [el('h2', {}, title)]);
    if (headExtra) head.append(headExtra);
    head.append(el('button.icon-btn', { 'aria-label': 'Close', onclick: close }, [icon(ICONS.x, { size: 18 })]));
    sheet.append(head);
  }

  const bodyEl = el('div.sheet-body');
  bodyEl.append(...[].concat(body).filter(Boolean));
  sheet.append(bodyEl);

  if (foot) sheet.append(el('div.sheet-foot', {}, [].concat(foot)));

  document.body.append(backdrop, sheet);
  requestAnimationFrame(() => {
    backdrop.classList.add('in');
    sheet.classList.add('in');
  });

  return { close, body: bodyEl, sheet };
}

/* ── toast ── */

let toastHolder = null;

export function toast(msg, icnName = ICONS.check) {
  if (!toastHolder) {
    toastHolder = el('div', { id: 'toast-holder' });
    document.body.append(toastHolder);
  }
  const t = el('div.toast', {}, [icnName ? icon(icnName, { size: 15, sw: 2.2 }) : null, msg]);
  toastHolder.append(t);
  setTimeout(() => t.classList.add('out'), 1800);
  setTimeout(() => t.remove(), 2100);
}

/* ── confirm dialog (as a small sheet) ── */

export function confirmSheet({ title, message, confirmLabel = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const s = openSheet({
      title,
      body: el('p.muted', { style: { padding: '2px 2px 6px', fontSize: '14.5px' } }, message),
      foot: [
        el('div', { style: { display: 'flex', gap: '10px' } }, [
          el('button.btn.quiet', { style: { flex: '1' }, onclick: () => { answered = true; resolve(false); s.close(); } }, 'Keep it'),
          el('button.btn', {
            style: { flex: '1', background: danger ? 'var(--terracotta)' : 'var(--rose)' },
            onclick: () => { answered = true; resolve(true); s.close(); },
          }, confirmLabel),
        ]),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

/* ── date sheet (native picker + a quick shortcut) ── */

/** Resolves with a dateKey, or null if dismissed.
    mode 'future' → planning ahead · mode 'past' → logging for another day. */
export function openDateSheet({ title = 'Pick a day', mode = 'future' } = {}) {
  return new Promise((resolve) => {
    const today = dateKey();
    const quickDk = mode === 'future' ? addDays(today, 1) : addDays(today, -1);
    const input = el('input.input', { type: 'date' });
    if (mode === 'future') { input.min = today; input.value = addDays(today, 1); }
    else { input.max = today; input.value = today; }

    let answered = false;
    const finish = (dk) => { answered = true; resolve(dk); s.close(); };

    const confirm = el('button.btn.full', { onclick: () => {
      if (input.value) finish(input.value);
    } }, 'Confirm');

    const quickLabel = new Date(`${quickDk}T12:00:00`)
      .toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    const s = openSheet({
      title,
      body: [
        el('button.btn.quiet.full', { onclick: () => finish(quickDk) },
          `${mode === 'future' ? 'Tomorrow' : 'Yesterday'} · ${quickLabel}`),
        el('div.spacer'),
        el('div.field', {}, [el('label', {}, 'Or any day'), input]),
      ],
      foot: confirm,
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

/* ── context menu ── */

export function openMenu(anchor, actions) {
  const rect = anchor.getBoundingClientRect();
  const menu = el('div.menu', { role: 'menu' });
  const backdrop = el('div', { style: { position: 'fixed', inset: '0', zIndex: '61' } });
  const close = () => { menu.remove(); backdrop.remove(); };
  backdrop.addEventListener('click', close);

  for (const a of actions) {
    menu.append(el(`button${a.danger ? '.danger' : ''}`, {
      onclick: () => { close(); a.onclick(); },
    }, [a.icon ? icon(a.icon, { size: 17 }) : null, a.label]));
  }

  document.body.append(backdrop, menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = Math.min(rect.right - mw, window.innerWidth - mw - 10);
  let y = rect.bottom + 6;
  if (y + mh > window.innerHeight - 10) y = rect.top - mh - 6;
  menu.style.left = `${Math.max(10, x)}px`;
  menu.style.top = `${Math.max(10, y)}px`;
  return close;
}

/* ── form fields ── */

export function textField(label, value = '', placeholder = '') {
  const input = el('input.input', { value, placeholder, type: 'text', autocomplete: 'off' });
  const field = el('div.field', {}, [el('label', {}, label), input]);
  return { field, input, get value() { return input.value.trim(); } };
}

export function iconField(label, value = 'sparkles') {
  let current = value;
  const buttons = new Map();
  const paint = () => {
    for (const [name, b] of buttons) b.classList.toggle('on', name === current);
  };
  const wrap = el('div.icon-pick');
  for (const group of ICON_CHOICES) {
    const grid = el('div.icon-grid');
    for (const name of group.names) {
      if (buttons.has(name)) continue;
      const b = el('button', {
        type: 'button', 'aria-label': name,
        onclick: () => { current = name; paint(); },
      }, [icon(name, { size: 19 })]);
      buttons.set(name, b);
      grid.append(b);
    }
    wrap.append(el('p.icon-group-label', {}, group.label), grid);
  }
  paint();
  const field = el('div.field', {}, [el('label', {}, label), wrap]);
  return { field, get value() { return current; } };
}

/** Weekday toggles for routines. Empty selection = every day. */
export function daysField(label, value = []) {
  const current = new Set(value);
  const hint = el('p.days-hint');
  const paintHint = () => {
    hint.textContent = current.size === 0 || current.size === 7
      ? 'Shows every day'
      : 'Shows only on the selected days — perfect for weekly rotations';
  };
  const wrap = el('div.days-pick');
  for (const w of WEEKDAYS) {
    const b = el('button', { type: 'button', 'aria-label': w.name, onclick: () => {
      current.has(w.code) ? current.delete(w.code) : current.add(w.code);
      b.classList.toggle('on', current.has(w.code));
      paintHint();
    } }, w.letter);
    if (current.has(w.code)) b.classList.add('on');
    wrap.append(b);
  }
  paintHint();
  const field = el('div.field', {}, [el('label', {}, label), wrap, hint]);
  return { field, get value() { return current.size === 7 ? [] : [...current]; } };
}

export function textArea(label, value = '', placeholder = '') {
  const input = el('textarea.input.area', { placeholder, rows: 3 });
  input.value = value;
  const field = el('div.field', {}, [el('label', {}, label), input]);
  return { field, input, get value() { return input.value.trim(); } };
}

export function categoryField(label, value = 'beauty') {
  let current = value;
  const wrap = el('div.cat-picker');
  const buttons = new Map();
  const paint = () => {
    for (const [k, b] of buttons) b.classList.toggle('on', k === current);
  };
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const b = el('button', { type: 'button', onclick: () => { current = key; paint(); } }, [
      el(`span.dot.${cat.cls}`), cat.name,
    ]);
    buttons.set(key, b);
    wrap.append(b);
  }
  paint();
  const field = el('div.field', {}, [el('label', {}, label), wrap]);
  return { field, get value() { return current; } };
}

export function ringButton(on, onToggle) {
  const ring = el('button.ring', { type: 'button', 'aria-pressed': String(on) }, [icon(ICONS.check, { size: 15, sw: 2.4 })]);
  if (on) ring.classList.add('on');
  ring.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle();
  });
  return ring;
}
