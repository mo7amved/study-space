const KEY = 'study-space:data';
const VERSION = 1;
export const defaults = () => ({
  v: VERSION, tasks: [], sessions: [], timer: null, cycle: 0, spotify: '',
  settings: { focus: 25, short: 5, long: 15, every: 4, autoBreak: false, autoFocus: false, goal: 120,
    sound: true, accent: '#8b5cf6', theme: 'violet', reduce: false, focusMode: false, dnd: false,
    vol: 0.4, track: 'rain', browserNotify: false }
});
let state = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') return merge(raw);
  } catch (e) { console.warn('Stored data unreadable, using defaults.', e); }
  return defaults();
}
function merge(raw) {
  const d = defaults();
  return { ...d, ...raw, v: VERSION, tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [], settings: { ...d.settings, ...(raw.settings || {}) } };
}
export const get = () => state;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { console.warn('Could not save', e); return false; }
}
export function exportJSON() {
  const { tasks, sessions, settings } = state;
  const blob = new Blob([JSON.stringify({ app: 'study-space', v: VERSION, tasks, sessions, settings }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `study-space-${new Date().toISOString().slice(0, 10)}.json` });
  a.click(); URL.revokeObjectURL(a.href);
}
export function importJSON(text) {
  const o = JSON.parse(text);
  if (o.app !== 'study-space' || !Array.isArray(o.tasks) || !Array.isArray(o.sessions)) throw new Error('This is not a Study Space export file.');
  state = merge({ ...state, tasks: o.tasks, sessions: o.sessions, settings: o.settings, timer: null });
  save();
}
export function clearSessions() { state.sessions = []; save(); }
