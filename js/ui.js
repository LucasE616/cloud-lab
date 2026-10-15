/* Cloud Lab — utilitários compartilhados pelos consoles simulados */
'use strict';

const UI = (() => {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

  const HEX = '0123456789abcdef';
  const rand = (n, chars = HEX) => {
    const a = new Uint32Array(n);
    crypto.getRandomValues(a);
    let o = '';
    for (let i = 0; i < n; i++) o += chars[a[i] % chars.length];
    return o;
  };
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = n => String(n).padStart(2, '0');

  const stamp = (d = new Date()) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const date = ts => new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const iso = ts => new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
  const bytes = n => {
    if (n < 1024) return n + ' B';
    const u = ['KB', 'MB', 'GB', 'TB'];
    let i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return n.toFixed(1) + ' ' + u[i];
  };

  // Ícones SVG pequenos usados como indicadores de status
  const ICON = {
    ok: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.6 8.3l2.2 2.2 4.6-4.8" stroke="#fff" stroke-width="1.8" fill="none"/></svg>',
    err: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="1.8"/></svg>',
    stop: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="7" fill="currentColor"/><rect x="5.2" y="5.2" width="5.6" height="5.6" fill="#fff"/></svg>',
    pending: '<svg viewBox="0 0 16 16" class="ico spin"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="26 12"/></svg>',
    info: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M8 7v4.5M8 4.5v.5" stroke="#fff" stroke-width="1.8"/></svg>',
    warn: '<svg viewBox="0 0 16 16" class="ico"><path d="M8 1.5l7 13H1z" fill="currentColor"/><path d="M8 6v4M8 11.6v.6" stroke="#fff" stroke-width="1.6"/></svg>',
    folder: '<svg viewBox="0 0 16 16" class="ico"><path d="M1 3.5h5l1.5 1.5H15v8.5H1z" fill="currentColor"/></svg>',
    file: '<svg viewBox="0 0 16 16" class="ico"><path d="M3 1h6l4 4v10H3z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9 1v4h4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
    caret: '<svg viewBox="0 0 16 16" class="ico caret"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    search: '<svg viewBox="0 0 16 16" class="ico"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.8"/></svg>',
    menu: '<svg viewBox="0 0 16 16" class="ico"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.8"/></svg>',
    refresh: '<svg viewBox="0 0 16 16" class="ico"><path d="M13 8a5 5 0 1 1-1.5-3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 1.5v3.5H8.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    bell: '<svg viewBox="0 0 16 16" class="ico"><path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11zM6.5 14h3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    help: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.7c-.6.3-.8.6-.8 1.3M8 11v.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    gear: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="8" r="2.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.5"/></svg>',
    terminal: '<svg viewBox="0 0 16 16" class="ico"><rect x="1" y="2" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 6l2.5 2L4 10M8 10.5h4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    user: '<svg viewBox="0 0 16 16" class="ico"><circle cx="8" cy="5.5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 14.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    copy: '<svg viewBox="0 0 16 16" class="ico"><rect x="5" y="5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 11H2V2h9v1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    close: '<svg viewBox="0 0 16 16" class="ico"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8"/></svg>',
  };

  /**
   * Tabela genérica. Cada tema estiliza `.tbl` do seu jeito.
   * select: null | 'single' | 'multi'. Clicar na linha dispara data-act=selAct.
   */
  function table({ cols, rows, key = 'id', select = null, selected = [], selAct = 'sel', empty = 'No resources', emptyHint = '' }) {
    const allOn = rows.length > 0 && rows.every(r => selected.includes(r[key]));
    const head = (select ? `<th class="c-sel">${select === 'multi'
      ? `<input type="checkbox" data-act="${selAct}All" ${allOn ? 'checked' : ''}>` : ''}</th>` : '')
      + cols.map(c => `<th>${c.h}</th>`).join('');
    const body = rows.length ? rows.map(r => {
      const on = selected.includes(r[key]);
      const sel = select ? `<td class="c-sel"><input type="${select === 'multi' ? 'checkbox' : 'radio'}" ${on ? 'checked' : ''} tabindex="-1"></td>` : '';
      return `<tr class="${on ? 'on' : ''}" ${select ? `data-act="${selAct}" data-id="${esc(r[key])}"` : ''}>${sel}${cols.map(c => `<td>${c.f(r)}</td>`).join('')}</tr>`;
    }).join('') : `<tr><td class="empty" colspan="${cols.length + (select ? 1 : 0)}"><b>${empty}</b>${emptyHint ? `<div>${emptyHint}</div>` : ''}</td></tr>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /** Lê os campos com atributo name de um elemento */
  function form(el) {
    const d = {};
    el.querySelectorAll('[name]').forEach(i => {
      if (i.type === 'checkbox') {
        if (i.dataset.multi) { (d[i.name] = d[i.name] || []); if (i.checked) d[i.name].push(i.value); }
        else d[i.name] = i.checked;
      } else if (i.type === 'radio') { if (i.checked) d[i.name] = i.value; }
      else d[i.name] = i.value;
    });
    return d;
  }

  /** Redesenha preservando rolagem e foco quando a "chave" da tela não mudou */
  function paint(el, html, key) {
    const same = el._key === key;
    const pos = {};
    if (same) el.querySelectorAll('[data-scroll]').forEach(n => { pos[n.dataset.scroll] = n.scrollTop; });
    const a = document.activeElement;
    const focusId = a && el.contains(a) && a.id ? a.id : null;
    const caret = focusId && 'selectionStart' in a ? a.selectionStart : null;
    el.innerHTML = html;
    el._key = key;
    if (same) el.querySelectorAll('[data-scroll]').forEach(n => { if (pos[n.dataset.scroll]) n.scrollTop = pos[n.dataset.scroll]; });
    if (focusId) {
      const f = el.querySelector('#' + CSS.escape(focusId));
      if (f) { f.focus(); if (caret != null) try { f.setSelectionRange(caret, caret); } catch (e) { /* ignore */ } }
    }
  }

  function toast(host, html, kind = 'success', ms = 5000) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.innerHTML = html;
    t.onclick = () => t.remove();
    host.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function modal(host, html, cls = '') {
    host.innerHTML = `<div class="modal-back" data-act="closeModalBack"><div class="modal ${cls}" role="dialog">${html}</div></div>`;
    const first = host.querySelector('.modal input:not([type=checkbox]):not([type=radio]), .modal textarea, .modal select');
    if (first) setTimeout(() => first.focus(), 30);
    return host.querySelector('.modal');
  }

  /**
   * Delegação de eventos: elementos com data-act (click), data-change (change),
   * data-input (input) e data-enter (Enter num campo) chamam handlers[nome].
   */
  function bind(root, handlers, onAnyClick) {
    root.addEventListener('click', e => {
      if (onAnyClick) onAnyClick(e);
      const el = e.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      const act = el.dataset.act;
      if (act === 'closeModalBack') { if (e.target === el) root.querySelector('.modal-host').innerHTML = ''; return; }
      if (act === 'closeModal') { root.querySelector('.modal-host').innerHTML = ''; return; }
      const fn = handlers[act];
      if (!fn) return;
      if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
      fn(el.dataset, el, e);
    });
    root.addEventListener('change', e => {
      const el = e.target.closest('[data-change]');
      if (el && handlers[el.dataset.change]) handlers[el.dataset.change](e.target.value, e.target, e);
    });
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-input]');
      if (el && handlers[el.dataset.input]) handlers[el.dataset.input](e.target.value, e.target, e);
    });
    root.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const el = e.target.closest('[data-enter]');
      if (el && handlers[el.dataset.enter]) { e.preventDefault(); handlers[el.dataset.enter](e.target.value, e.target, e); }
    });
    root.addEventListener('submit', e => e.preventDefault());
  }

  function pickFiles(multiple = true) {
    return new Promise(res => {
      const i = document.createElement('input');
      i.type = 'file';
      i.multiple = multiple;
      i.onchange = () => res([...i.files]);
      i.click();
    });
  }

  // Guarda o conteúdo apenas de arquivos de texto pequenos (localStorage é limitado)
  async function readFile(f) {
    const textual = f.size <= 150 * 1024 && (/^text\/|json|xml|javascript|csv|yaml|x-sh/.test(f.type)
      || /\.(txt|md|html?|css|js|json|csv|ya?ml|sh|py|conf|log|xml|ini|env)$/i.test(f.name));
    return { name: f.name, size: f.size, type: f.type || 'application/octet-stream', content: textual ? await f.text() : null };
  }

  function download(name, content, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function copy(text) {
    try { navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
  }

  const ipv4 = () => `${pick([3, 18, 34, 35, 44, 52, 54])}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`;

  return { esc, rand, int, pick, pad, stamp, date, iso, bytes, ICON, table, form, paint, toast, modal, bind, pickFiles, readFile, download, copy, ipv4 };
})();
