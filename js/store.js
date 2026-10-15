/* Cloud Lab — estado global persistido no localStorage do navegador */
'use strict';

const Store = (() => {
  const KEY = 'cloudlab:v1';
  const VERSION = 1;
  const defaults = {};
  const subs = [];
  let s = null;

  /** Cada módulo registra o estado inicial da sua parte (aws, oci, gcp, linux...) */
  function register(name, fn) { defaults[name] = fn; }

  function fresh() {
    const o = { version: VERSION, tab: 'aws', done: [] };
    for (const [k, fn] of Object.entries(defaults)) o[k] = fn();
    return o;
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      s = d && d.version === VERSION ? d : fresh();
    } catch (e) { s = fresh(); }
    for (const [k, fn] of Object.entries(defaults)) if (!s[k]) s[k] = fn();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); }
    catch (e) { console.warn('Não foi possível salvar o estado do laboratório', e); }
  }

  function commit() { save(); subs.forEach(f => f()); }
  function on(fn) { subs.push(fn); }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  /**
   * Agenda transições de estado (ex.: pending -> running).
   * steps: [[ms, {campos}], ...] — tempos cumulativos. Sobrevive a recarregar a página.
   */
  function queue(item, steps) {
    let at = Date.now();
    item._q = steps.map(([ms, set]) => ({ at: (at += ms), set }));
  }

  /** Aplica as transições vencidas. Retorna true se algo mudou. */
  function advance(list) {
    const now = Date.now();
    let changed = false;
    for (const it of list) {
      while (it._q && it._q.length && it._q[0].at <= now) {
        Object.assign(it, it._q.shift().set);
        changed = true;
      }
      if (it._q && !it._q.length) delete it._q;
    }
    return changed;
  }

  return { register, load, save, commit, on, reset, queue, advance, get s() { return s; } };
})();
