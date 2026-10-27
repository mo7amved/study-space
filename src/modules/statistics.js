import { get } from './storage.js';
import { dayKey, today, daysAgo, weekStart } from '../utils/dates.js';
// Only completed focus sessions count as study time. Breaks, skipped and cancelled sessions never do.
export const focusDone = () => get().sessions.filter(s => s.type === 'focus' && s.status === 'completed');
export function perDay() { const m = {}; focusDone().forEach(s => { const k = dayKey(s.start); m[k] = (m[k] || 0) + s.dur; }); return m; }
export const todayMs = () => perDay()[today()] || 0;
export const weekMs = () => focusDone().filter(s => s.start >= weekStart()).reduce((a, s) => a + s.dur, 0);
export const taskMs = id => focusDone().filter(s => s.taskId === id).reduce((a, s) => a + s.dur, 0);
export const goalPct = () => Math.min(100, Math.round(todayMs() / 60000 / get().settings.goal * 100));
export function last7() { return [...Array(7)].map((_, i) => { const k = daysAgo(6 - i); const [y, m, d] = k.split('-'); return { k, label: new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short' }), ms: perDay()[k] || 0 }; }); }
export function bySubject() {
  const m = {}; focusDone().forEach(s => { const t = get().tasks.find(x => x.id === s.taskId); const k = t?.subject || 'No subject'; m[k] = (m[k] || 0) + s.dur; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
export function streaks() {
  const days = perDay(); const keys = Object.keys(days).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(k => { const [y, m, d] = k.split('-').map(Number); const t = Date.UTC(y, m - 1, d);
    run = prev !== null && t - prev === 864e5 ? run + 1 : 1; prev = t; best = Math.max(best, run); });
  let cur = 0, i = days[today()] ? 0 : 1; // today may still be empty without breaking the streak
  while (days[daysAgo(i)]) { cur++; i++; }
  return { current: cur, best };
}
export function bestDay() { const e = Object.entries(perDay()).sort((a, b) => b[1] - a[1])[0]; return e || null; }
