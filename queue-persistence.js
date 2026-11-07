/* Queue persistence (V02) – keeps the original app's HTML/CSS/UI untouched.
   The file is included before the application is initialized. */
(() => {
  'use strict';
  const KIND = 'keyqueue';
  const scope = location.pathname.replace(/index\.html?$/i, '').replace(/\/+$/, '') || '/';
  const KEY = `queue.v02.remaining.${KIND}:${scope}`;
  const saveName = `${KIND}.txt`;
  let restoring = false;
  let state = null;

  function parse(text) {
    // Keep the original order and all interior spaces; do not add numbering.
    return [...new Set(String(text).replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).map(s => s.trim()).filter(Boolean))];
  }
  function readStored() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (value && value.version === 2 && Array.isArray(value.remaining)) {
        return {version: 2, fileName: typeof value.fileName === 'string' ? value.fileName : saveName,
          remaining: value.remaining.filter(v => typeof v === 'string')};
      }
    } catch (e) { console.warn('[Queue V02] Laden fehlgeschlagen:', e); }
    return null;
  }
  function save() {
    try { if (state) localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('[Queue V02] Speichern fehlgeschlagen:', e); }
  }
  function take(value) {
    if (!state || typeof value !== 'string') return false;
    const index = state.remaining.indexOf(value.trim());
    if (index === -1) return false;
    state.remaining.splice(index, 1);
    save();
    return true;
  }

  // Track user-selected text files; original app continues to parse and render them.
  document.addEventListener('change', (event) => {
    const input = event.target;
    if (restoring || !input || input.tagName !== 'INPUT' || input.type !== 'file') return;
    const file = input.files && input.files[0];
    if (!file) return;
    file.text().then(text => {
      state = {version: 2, fileName: file.name || saveName, remaining: parse(text)};
      save();
    }).catch(e => console.warn('[Queue V02] TXT konnte nicht gespeichert werden:', e));
  }, true);

  // Intercept successful native clipboard copies; a rejected copy never removes a record.
  function trackClipboard() {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return;
    const target = navigator.clipboard;
    const original = target.writeText.bind(target);
    const patched = async function (text) {
      const result = await original(text);
      take(String(text));
      return result;
    };
    try {
      target.writeText = patched;
      if (target.writeText === patched) return;
    } catch (_) { /* Safari may expose a read-only method. */ }
    try {
      Object.defineProperty(target, 'writeText', { configurable: true, value: patched });
    } catch (_) { /* Click/removal fallback below covers this case. */ }
  }
  trackClipboard();

  // Some iPhone versions or original apps use document.execCommand('copy') as fallback.
  if (typeof document.execCommand === 'function') {
    const nativeExec = document.execCommand.bind(document);
    try {
      document.execCommand = function(command, ...args) {
        const selected = document.activeElement;
        const copiedText = selected && typeof selected.value === 'string'
          ? selected.value.substring(selected.selectionStart || 0, selected.selectionEnd || selected.value.length)
          : String(window.getSelection?.() || '');
        const ok = nativeExec(command, ...args);
        if (ok && String(command).toLowerCase() === 'copy') take(copiedText);
        return ok;
      };
    } catch (_) { /* Click/removal fallback below covers this case. */ }
  }

  function matchingRow(button) {
    if (!state) return null;
    const selectors = ['li', 'tr', '[data-index]', '[data-id]', '.queue-item', '.list-item',
      '.password-row', '.name-row', '.entry-row', '[class*="row"]', '[class*="item"]'];
    let node = button.parentElement;
    for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
      if (!selectors.some(sel => { try { return node.matches(sel); } catch (_) { return false; } })) continue;
      const text = node.textContent || '';
      const choices = state.remaining.filter(x => text.includes(x));
      if (choices.length === 1) return {node, value: choices[0]};
      if (choices.length > 1) {
        choices.sort((a,b) => b.length - a.length);
        return {node, value: choices[0]};
      }
    }
    return null;
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button, [role="button"]');
    if (!button || !state) return;
    const label = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')]
      .filter(Boolean).join(' ').toLowerCase();
    // File replacement is handled by the file input's change event above.
    if (!/(kopieren|copy)/i.test(label)) return;
    const match = matchingRow(button);
    if (!match) return;
    setTimeout(() => {
      // Only the original app's SUCCESSFUL removal is a fallback signal.
      if (!match.node.isConnected) take(match.value);
    }, 550);
  }, true);

  // After the original app's listeners exist, re-import remaining entries as a synthetic TXT.
  function restore() {
    state = readStored();
    if (!state || !state.remaining.length) return;
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    const input = inputs.find(el => /txt|text/i.test(el.accept || '')) || inputs[0];
    if (!input) {
      console.warn('[Queue V02] Keine Datei-Eingabe gefunden; konnte nicht automatisch wiederherstellen.');
      return;
    }
    try {
      const file = new File([state.remaining.join('\n') + '\n'], state.fileName || saveName,
        {type: 'text/plain;charset=utf-8'});
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      restoring = true;
      input.dispatchEvent(new Event('change', {bubbles: true}));
      queueMicrotask(() => { restoring = false; });
    } catch (e) {
      restoring = false;
      console.warn('[Queue V02] Automatische Wiederherstellung nicht unterstützt:', e);
    }
  }
  if (document.readyState === 'complete') setTimeout(restore, 0);
  else window.addEventListener('load', restore, {once: true});
})();
