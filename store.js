// store.js
// Defines window.Store — persistent localStorage wrapper.
// Must be loaded before all other scripts that use Store.

window.Store = {
  get:  (key)      => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set:  (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn('Store.set failed:', e); } },
  del:  (key)      => localStorage.removeItem(key),
  keys: (prefix)   => Object.keys(localStorage).filter(k => k.startsWith(prefix)),
};
