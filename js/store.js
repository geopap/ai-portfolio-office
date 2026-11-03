// App state, persisted per browser. Storage may be unavailable (private mode,
// blocked site data), so every access is guarded and the app works without it.

import { INITIATIVES, CAPACITY, QUARTERS, PERIOD, COMPANY } from './data.js';
import { appendEntry } from './audit.js';

const KEY = 'aipo.state.v1';

export function freshState() {
  return {
    portfolio: { company: COMPANY, period: PERIOD, quarters: QUARTERS, capacity: CAPACITY, initiatives: structuredClone(INITIATIVES) },
    cycle: { status: 'not started', steps: {}, reviewer: '', comment: '', decidedAt: null },
    overrides: {},
    narrative: null,
    audit: [],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Company details always come from data.js, never from an older saved copy.
      return { ...freshState(), ...saved, portfolio: { ...saved.portfolio, company: COMPANY } };
    }
  } catch { /* storage unavailable or corrupt — start fresh */ }
  return freshState();
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export async function log(state, actor, action, detail) {
  state.audit = await appendEntry(state.audit, { actor, action, detail });
  save(state);
}

export const session = {
  get(k) { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch { /* ignore */ } },
};
