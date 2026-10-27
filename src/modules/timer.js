import { get, save } from './storage.js';
import { uid } from '../utils/dates.js';

const subs = { tick: new Set(), change: new Set(), done: new Set() };
export const on = (k, f) => { subs[k].add(f); return () => subs[k].delete(f); };
const emit = (k, a) => subs[k].forEach(f => f(a));
const mins = m => get().settings[m] * 60000;
export const t = () => get().timer;
let iv = null;

export function init() {
  if (!t() || !['focus', 'short', 'long'].includes(t().mode)) setMode('focus');
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  if (t().status === 'running') { loop(); tick(); }
  emit('change');
}
function loop() { if (!iv) iv = setInterval(tick, 250); }
function stopLoop() { clearInterval(iv); iv = null; }

export function setMode(mode, keepTask = true) {
  stopLoop();
  const task = keepTask && get().timer ? get().timer.taskId : null;
  get().timer = { id: null, mode, status: 'idle', total: mins(mode), left: mins(mode), endAt: 0, startedAt: 0, taskId: task };
  save(); emit('change');
}
export function setTask(id) { t().taskId = id || null; save(); emit('change'); }
export function start() {
  const s = t();
  if (s.status === 'running') return;
  if (s.status === 'done') return setMode(s.mode);
  if (s.status === 'idle') { s.left = s.total = mins(s.mode); s.startedAt = Date.now(); s.id = uid('s'); }
  s.endAt = Date.now() + s.left; s.status = 'running';
  save(); loop(); emit('change');
}
export function pause() {
  const s = t(); if (s.status !== 'running') return;
  s.left = Math.max(0, s.endAt - Date.now()); s.status = 'paused'; stopLoop(); save(); emit('change');
}
export function reset() { if (t().status !== 'idle') record('cancelled'); setMode(t().mode); }
export function clearSession() { if (t().status !== 'idle') record('cancelled'); setMode(t().mode, false); }
export function skip() {
  if (t().status !== 'idle') record('skipped');
  advance(false);
}
function elapsed() { const s = t(); const left = s.status === 'running' ? Math.max(0, s.endAt - Date.now()) : s.left; return s.total - left; }
function record(status, force) {
  const s = t(); const dur = status === 'completed' ? s.total : elapsed();
  if (!s.id || (dur < 1000 && !force)) return;
  if (get().sessions.some(x => x.id === s.id)) return; // never duplicate a session
  get().sessions.push({ id: s.id, type: s.mode, taskId: s.taskId, start: s.startedAt, dur, status });
  save();
}
export function tick() {
  const s = t(); if (!s || s.status !== 'running') return;
  s.left = Math.max(0, s.endAt - Date.now());
  if (s.left > 0) return emit('tick');
  complete();
}
function complete() {
  const s = t(); if (s.status !== 'running') return; // guards against double completion
  stopLoop(); s.status = 'done'; s.left = 0;
  record('completed', true);
  const g = get();
  let suggestion = null;
  if (s.mode === 'focus') { g.cycle++; suggestion = g.cycle >= g.settings.every ? 'long' : 'short'; }
  else if (s.mode === 'long') g.cycle = 0;
  save(); emit('done', { mode: s.mode, suggestion }); emit('change');
}
// Moves to the next mode. auto=true respects the auto-start preferences.
export function advance(auto) {
  const s = t(), g = get();
  if (s.mode === 'focus') {
    setMode(g.cycle >= g.settings.every ? 'long' : 'short');
    if (auto && g.settings.autoBreak) start();
  } else {
    if (s.mode === 'long') g.cycle = 0;
    setMode('focus');
    if (auto && g.settings.autoFocus) start();
  }
}
