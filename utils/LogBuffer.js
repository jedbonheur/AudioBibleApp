// Simple in-memory log buffer with subscription for BG music logs
// Keeps the last N logs and notifies subscribers on updates

const MAX = 200;

const state = {
  logs: [], // { line: string, raw: any }
  subs: new Set(),
  appListenerAttached: false,
};

function notify() {
  state.subs.forEach((fn) => {
    try {
      fn(state.logs);
    } catch {}
  });
}

function toMs(t) {
  // If seconds, multiply; if ms or larger, return as-is
  if (typeof t !== 'number') return Date.now();
  return t > 1e12 ? t : t * 1000;
}

export function pushBgLog(evt) {
  try {
    const tsVal = toMs(evt?.timestamp ?? Date.now());
    const ts = new Date(tsVal);
    const time = isNaN(ts.getTime()) ? new Date() : ts;
    const line = `${time.toLocaleTimeString()} | ${evt?.type || 'log'} | ${evt?.message || ''}`;
    const next = [...state.logs, { line, raw: evt }];
    if (next.length > MAX) next.shift();
    state.logs = next;
    notify();
  } catch {}
}

export function getBgLogs() {
  return state.logs;
}

export function clearBgLogs() {
  state.logs = [];
  notify();
}

export function subscribeBgLogs(fn) {
  state.subs.add(fn);
  return () => {
    try {
      state.subs.delete(fn);
    } catch {}
  };
}

export function markBgAppListenerAttached(attached = true) {
  state.appListenerAttached = !!attached;
}

export function isBgAppListenerAttached() {
  return !!state.appListenerAttached;
}
