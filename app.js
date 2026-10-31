'use strict';

// KeyQueue: Passwords are parsed and processed locally in memory only.
// No network calls, cookies, localStorage or sessionStorage are used.
const $ = id => document.getElementById(id);
const ui = {
  fileInput: $('fileInput'),
  fileName: $('fileName'),
  importNote: $('importNote'),
  passwordList: $('passwordList'),
  emptyState: $('emptyState'),
  listViewport: $('listViewport'),
  remainingCount: $('remainingCount'),
  status: $('status'),
  clearBtn: $('clearBtn'),
  toast: $('toast')
};

const PASSWORD_PATTERN = /^(?=.{8,10}$)(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[\x21-\x7E]{8,10}$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LINES = 20000;
let queue = [];
let totalLoaded = 0;
let copiedCount = 0;
let activeCopy = false;
let importVersion = 0;
let toastTimer = null;

function setStatus(text, type = '') {
  ui.status.textContent = text;
  ui.status.className = `footer-state ${type}`.trim();
}
function showToast(text) {
  clearTimeout(toastTimer);
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 1400);
}
function parsePasswords(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  if (lines.length > MAX_LINES) throw new Error(`Zu viele Zeilen (maximal ${MAX_LINES}).`);
  const seen = new Set();
  const passwords = [];
  let invalid = 0;
  let duplicates = 0;
  for (const raw of lines) {
    let value = raw.trim();
    if (!value) continue;
    // Optionale Nummerierung wie "1. CODE", "2) CODE" oder "3 CODE" ignorieren.
    // Bei gültigen Passwörtern sind keine Leerzeichen erlaubt, daher eindeutig.
    value = value.replace(/^\d{1,6}(?:(?:[.)]|[\-:])\s+|\s+)(?=\S)/, '').trim();
    if (!PASSWORD_PATTERN.test(value)) { invalid++; continue; }
    if (seen.has(value)) { duplicates++; continue; }
    seen.add(value);
    passwords.push(value);
  }
  return { passwords, invalid, duplicates };
}
function setEmpty(message, detail) {
  ui.emptyState.replaceChildren();
  const symbol = document.createElement('div');
  symbol.className = 'empty-glyph';
  symbol.textContent = queue.length === 0 && totalLoaded ? '✓' : '⌑';
  const title = document.createElement('strong');
  title.textContent = message;
  const sub = document.createElement('span');
  sub.textContent = detail;
  ui.emptyState.append(symbol, title, sub);
  ui.emptyState.hidden = false;
}
function render() {
  ui.passwordList.replaceChildren();
  ui.remainingCount.textContent = String(queue.length);
  ui.clearBtn.disabled = queue.length === 0;
  if (!queue.length) {
    ui.passwordList.hidden = true;
    if (totalLoaded) {
      setEmpty('Liste vollständig abgearbeitet', 'Lade oben eine neue Datei, um weiterzumachen.');
    } else {
      setEmpty('Noch keine Passwörter', 'Lade oben eine TXT-Datei, um die Liste zu starten.');
    }
    return;
  }
  ui.emptyState.hidden = true;
  ui.passwordList.hidden = false;
  const fragment = document.createDocumentFragment();
  queue.forEach((password, index) => {
    const row = document.createElement('li');
    row.className = 'password-row';
    const number = document.createElement('span');
    number.className = 'row-number';
    number.textContent = String(copiedCount + index + 1).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    const value = document.createElement('code');
    value.className = 'password-code';
    value.textContent = password;
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Kopieren';
    copyButton.setAttribute('aria-label', `Passwort Nummer ${copiedCount + index + 1} kopieren`);
    copyButton.addEventListener('click', () => copyPassword(index));
    row.append(number, value, copyButton);
    fragment.appendChild(row);
  });
  ui.passwordList.appendChild(fragment);
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) { /* Try legacy copy fallback */ }
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.readOnly = true;
  box.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
  document.body.appendChild(box);
  box.focus({preventScroll: true});
  box.select();
  box.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy');
  box.remove();
  if (!ok) throw new Error('Kopieren nicht möglich');
}
async function copyPassword(index) {
  if (activeCopy || index < 0 || index >= queue.length) return;
  const expected = queue[index];
  const version = importVersion;
  activeCopy = true;
  try {
    // ONLY password, never the visual number.
    await copyText(expected);
    // Import may have changed while copying: don't remove from the new list.
    if (version !== importVersion || queue[index] !== expected) return;
    queue.splice(index, 1);
    copiedCount++;
    render();
    // The next item remains at the top; page itself never scrolls.
    ui.listViewport.scrollTop = 0;
    if (queue.length) {
      setStatus(`${copiedCount} kopiert · ${queue.length} übrig`, 'success');
    } else {
      setStatus(`Fertig! ${copiedCount} Passwörter kopiert.`, 'success');
    }
    showToast('Passwort kopiert ✓');
  } catch (_) {
    setStatus('Kopieren fehlgeschlagen – Eintrag bleibt erhalten.', 'error');
    showToast('Bitte erneut versuchen');
  } finally {
    activeCopy = false;
  }
}
async function importFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE_BYTES) {
    setStatus('Datei zu groß (maximal 2 MB).', 'error');
    return;
  }
  const version = ++importVersion;
  setStatus('Datei wird eingelesen …');
  try {
    const text = await file.text();
    const result = parsePasswords(text);
    if (version !== importVersion) return;
    queue = result.passwords;
    totalLoaded = queue.length;
    copiedCount = 0;
    ui.fileName.textContent = file.name;
    ui.fileName.title = file.name;
    const skipped = result.invalid + result.duplicates;
    ui.importNote.textContent = skipped
      ? `${result.invalid} ungültig, ${result.duplicates} doppelt – übersprungen. Nur 8–10 Zeichen mit Groß-/Kleinbuchstaben, Zahl und Sonderzeichen.`
      : 'Nur auf deinem Gerät – kein Upload an einen Server.';
    render();
    ui.listViewport.scrollTop = 0;
    if (queue.length) {
      setStatus(`${queue.length} Passwörter geladen${skipped ? ` · ${skipped} übersprungen` : ''}.`, 'success');
    } else {
      setStatus('Keine gültigen Passwörter in dieser Datei gefunden.', 'error');
    }
  } catch (_) {
    setStatus('Datei konnte nicht gelesen werden.', 'error');
  }
}
ui.fileInput.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (file) importFile(file);
  event.target.value = '';
});
ui.clearBtn.addEventListener('click', () => {
  if (activeCopy) return;
  importVersion++;
  queue = [];
  totalLoaded = 0;
  copiedCount = 0;
  ui.fileName.textContent = 'Keine Datei geladen';
  ui.fileName.title = 'Keine Datei ausgewählt';
  ui.importNote.textContent = 'Nur auf deinem Gerät – kein Upload an einen Server.';
  setStatus('Liste geleert. Bereit für eine neue Datei.');
  render();
});
render();
