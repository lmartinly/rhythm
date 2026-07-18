// Rhythm · Settings

import { el, icon, ICONS } from '../util.js';
import { store } from '../store.js';
import { toast, confirmSheet, openSheet } from '../ui.js';
import { itemRow } from '../actions.js';
import { applyTheme } from '../theme.js';
import { driveBackup, driveRestore } from '../drive.js';

export function render(root) {
  root.append(el('header.page-head', {}, [
    el('h1', {}, 'Settings'),
    el('span.hand', {}, 'quiet, like everything else here'),
  ]));

  /* ── appearance ── */

  root.append(el('div.section-title', {}, 'Appearance'));
  const seg = el('div.seg');
  for (const [key, label] of [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]) {
    seg.append(el('button' + (store.state.settings.theme === key ? '.on' : ''), {
      onclick: () => {
        store.state.settings.theme = key;
        store.save();
        applyTheme();
        repaint(root);
      },
    }, label));
  }
  root.append(el('div.card', {}, [seg]));

  /* ── backup ── */

  root.append(el('div.section-title', {}, 'Backup'));
  const backupCard = el('div.card', { style: { padding: '6px 16px' } });

  backupCard.append(settingRow('Export data', 'Download everything as a JSON file', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = el('a', {
      href: URL.createObjectURL(blob),
      download: `rhythm-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    toast('Backup downloaded');
  }));

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    const ok = await confirmSheet({
      title: 'Replace everything?',
      message: 'Importing replaces your current items, routines and history with the backup file.',
      confirmLabel: 'Import', danger: false,
    });
    if (!ok) { fileInput.value = ''; return; }
    try {
      store.importJSON(text);
      applyTheme();
      toast('Backup restored');
    } catch (err) {
      toast(err.message || 'That file could not be read', ICONS.x);
    }
    fileInput.value = '';
  });
  root.append(fileInput);

  backupCard.append(settingRow('Import data', 'Restore from a JSON backup', () => fileInput.click()));
  root.append(backupCard);

  /* ── google drive ── */

  root.append(el('div.section-title', {}, 'Google Drive'));
  const driveCard = el('div.card', { style: { padding: '6px 16px' } });
  const hasClient = !!store.state.settings.driveClientId;

  driveCard.append(settingRow(
    hasClient ? 'Back up to Drive' : 'Set up Drive backup',
    hasClient ? 'Saves rhythm-backup.json to your Drive' : 'One-time setup with your own key',
    async () => {
      if (!store.state.settings.driveClientId) { openDriveSetup(); return; }
      try {
        toast('Backing up…', null);
        await driveBackup();
        toast('Saved to Google Drive');
      } catch (err) {
        toast(err.message || 'Backup failed', ICONS.x);
      }
    }
  ));

  if (hasClient) {
    driveCard.append(settingRow('Restore from Drive', 'Load your latest Drive backup', async () => {
      const ok = await confirmSheet({
        title: 'Restore from Drive?',
        message: 'This replaces your current data with the latest Drive backup.',
        confirmLabel: 'Restore', danger: false,
      });
      if (!ok) return;
      try {
        await driveRestore();
        applyTheme();
        toast('Restored from Drive');
      } catch (err) {
        toast(err.message || 'Restore failed', ICONS.x);
      }
    }));
    driveCard.append(settingRow('Drive settings', 'Change or remove your key', openDriveSetup));
  }
  root.append(driveCard);

  /* ── archive ── */

  const archivedItems = Object.values(store.state.items).filter((i) => i.archived);
  const archivedRoutines = Object.values(store.state.routines).filter((r) => r.archived);
  root.append(el('div.section-title', {}, 'Archive'));

  if (!archivedItems.length && !archivedRoutines.length) {
    root.append(el('div.card', {}, [el('p.muted', {}, 'Nothing archived. Archiving hides something without losing its history.')]));
  } else {
    const card = el('div.card', { style: { padding: '6px 12px' } });
    const rowFor = (kind, obj) => itemRow(obj, {
      sub: kind === 'items' ? 'Item' : 'Routine',
      trail: [
        el('button.icon-btn', {
          'aria-label': `Restore ${obj.name}`,
          onclick: () => { store.setArchived(kind, obj.id, false); toast('Restored'); },
        }, [icon(ICONS.restore, { size: 17 })]),
        el('button.icon-btn', {
          'aria-label': `Delete ${obj.name}`,
          style: { color: 'var(--terracotta)' },
          onclick: async () => {
            const ok = await confirmSheet({
              title: `Delete ${obj.name}?`,
              message: kind === 'items'
                ? 'This removes the item and its whole history.'
                : 'The items inside keep their own history.',
            });
            if (!ok) return;
            if (kind === 'items') store.deleteItem(obj.id); else store.deleteRoutine(obj.id);
            toast('Deleted', ICONS.trash);
          },
        }, [icon(ICONS.trash, { size: 17 })]),
      ],
    });
    for (const it of archivedItems) card.append(rowFor('items', it));
    for (const r of archivedRoutines) card.append(rowFor('routines', r));
    root.append(card);
  }

  /* ── about ── */

  root.append(el('div.section-title', {}, 'About'));
  root.append(el('div.card', {}, [
    el('p', { style: { fontFamily: 'var(--font-head)', fontWeight: '700', fontSize: '17px' } }, 'Rhythm'),
    el('p.muted', { style: { marginTop: '4px' } },
      'A personal life tracker. It remembers what you did and when — nothing more, and never with pressure.'),
    el('p.muted', { style: { marginTop: '10px', fontSize: '12px' } }, 'Version 1.0 · your data never leaves this device unless you back it up.'),
  ]));
}

function settingRow(title, sub, onclick) {
  return el('button.set-row', { onclick }, [
    el('div.body', {}, [el('div.title', {}, title), el('div.sub', {}, sub)]),
    icon('chevron-right', { size: 16, sw: 2, cls: 'chev' }),
  ]);
}

function openDriveSetup() {
  const input = el('input.input', {
    placeholder: 'xxxxxxxx.apps.googleusercontent.com',
    value: store.state.settings.driveClientId || '',
    autocomplete: 'off',
  });
  const save = el('button.btn.full', {}, 'Save');
  const sheet = openSheet({
    title: 'Google Drive setup',
    body: [
      el('p.muted', { style: { marginBottom: '12px', fontSize: '14px' } },
        'Rhythm talks to Drive directly from your phone — no server in between. Create a free OAuth Client ID in Google Cloud Console (steps are in the README) and paste it here once.'),
      el('div.field', {}, [el('label', {}, 'OAuth Client ID'), input]),
      el('button.btn.ghost', {
        onclick: () => {
          store.state.settings.driveClientId = '';
          store.save();
          sheet.close();
          toast('Drive backup turned off');
        },
      }, 'Remove key'),
    ],
    foot: save,
  });
  save.addEventListener('click', () => {
    store.state.settings.driveClientId = input.value.trim();
    store.save();
    sheet.close();
    toast(store.state.settings.driveClientId ? 'Drive backup ready' : 'Drive backup turned off');
  });
}

function repaint(root) {
  root.replaceChildren();
  render(root);
}
