import { get, save, exportJSON, importJSON, clearSessions } from '../modules/storage.js';
import * as timer from '../modules/timer.js';
import * as st from '../modules/statistics.js';
import { toast, enableBrowserNotifications } from '../modules/notifications.js';
import { icon } from '../utils/icons.js';
import { esc, uid, today, dayKey, fmtDur, clock, fmtTime, fmtDate } from '../utils/dates.js';
import * as community from '../modules/community.js';

let nav = () => {}; export const setNavigate = f => (nav = f);
const PRI = { high: 3, medium: 2, low: 1 };
const ACCENTS = ['#8b5cf6', '#a78bfa', '#c084fc', '#6366f1', '#ec4899', '#22d3ee', '#34d399'];
const THEMES = { violet: 'Violet night', midnight: 'Midnight', graphite: 'Graphite' };
const page = (title, sub, body) => `<header class="ph"><div><h1>${title}</h1><p class="muted">${sub}</p></div></header>${body}`;
const empty = (t, p, btn = '') => `<div class="empty"><h3>${t}</h3><p class="muted">${p}</p>${btn}</div>`;
const isOverdue = t => !t.done && t.deadline && t.deadline < today();

export function applySettings() {
  const s = get().settings, d = document.documentElement;
  d.dataset.theme = s.theme; d.style.setProperty('--accent', s.accent);
  d.classList.toggle('reduce', s.reduce); d.classList.toggle('focus-mode', s.focusMode);
}
function toggleFocusMode(v) { get().settings.focusMode = v ?? !get().settings.focusMode; save(); applySettings(); }

function dashboard(root) {
  const g = get(), n = new Date().getHours(), open = g.tasks.filter(t => !t.done);
  const top = [...open].sort((a, b) => PRI[b.priority] - PRI[a.priority] || (a.deadline || '9') .localeCompare(b.deadline || '9')).slice(0, 4);
  const recent = [...g.sessions].reverse().slice(0, 5), sk = st.streaks();
  const sessionsToday = st.focusDone().filter(s => dayKey(s.start) === today()).length;
  root.innerHTML = page(`Good ${n < 12 ? 'morning' : n < 18 ? 'afternoon' : 'evening'}`, new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  `<div class="cards">
    <div class="card"><span class="muted">Focus today</span><strong class="big">${fmtDur(st.todayMs())}</strong><div class="bar"><i style="width:${st.goalPct()}%"></i></div><small class="muted">${st.goalPct()}% of ${g.settings.goal} min goal</small></div>
    <div class="card"><span class="muted">Sessions today</span><strong class="big">${sessionsToday}</strong></div>
    <div class="card"><span class="muted">Study streak</span><strong class="big">${sk.current} ${sk.current === 1 ? 'day' : 'days'}</strong><small class="muted">Best: ${sk.best}</small></div>
    <div class="card"><span class="muted">Tasks remaining</span><strong class="big">${open.length}</strong></div>
  </div>
  <section class="dashboard-hero"><div><span class="eyebrow">YOUR PERSONAL STUDY SPACE</span><h2>Small sessions.<br/>Big progress.</h2><p>Build focus one session at a time. Your next win is just 25 minutes away.</p><div class="row wrap"><button class="btn primary lg" id="qs">${icon('play')} Start focusing</button><a class="btn" href="#/community">${icon('flame')} Compete with students</a></div></div><div class="hero-orbit" aria-hidden="true"><div class="hero-orbit-inner"><span>FOCUS</span><strong>25</strong><small>MINUTES</small></div></div></section>
  <div class="grid2"><section class="card"><h2>Up next</h2>${top.length ? `<ul class="list">${top.map(t => `<li><span class="pill ${t.priority}">${t.priority}</span> ${esc(t.title)}${t.deadline ? `<small class="muted"> · due ${esc(t.deadline)}</small>` : ''}</li>`).join('')}</ul>` : empty('No open tasks', 'Add a task to decide what to focus on.', '<a class="btn" href="#/tasks">Add a task</a>')}</section>
  <section class="card"><h2>Recent activity</h2>${recent.length ? `<ul class="list">${recent.map(s => `<li>${s.type === 'focus' ? 'Focus' : 'Break'} · ${fmtDur(s.dur)} <span class="pill ${s.status}">${s.status}</span><small class="muted"> ${fmtDate(s.start)} ${fmtTime(s.start)}</small></li>`).join('')}</ul>` : empty('Nothing yet', 'Start your first 25-minute focus session. Try a small task and set a daily goal in Settings.')}</section></div>`);
  root.querySelector('#qs').onclick = () => { if (timer.t().mode !== 'focus') timer.setMode('focus'); timer.start(); nav('focus'); };
}

function focus(root) {
  const g = get(), s = timer.t(), C = 2 * Math.PI * 110, tasks = g.tasks.filter(t => !t.done);
  const label = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const state = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Completed' }[s.status];
  const next = s.mode === 'focus' ? (g.cycle >= g.settings.every ? 'long' : 'short') : 'focus';
  root.innerHTML = page('Focus Room', `${g.cycle} of ${g.settings.every} focus sessions before a long break`, `
  <div class="focusbox">
  <div class="tabs" role="tablist">${Object.entries(label).map(([k, v]) => `<button role="tab" aria-selected="${s.mode === k}" data-m="${k}">${v}</button>`).join('')}</div>
  <div class="ring"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="110" class="track"/><circle id="arc" cx="120" cy="120" r="110" class="arc" stroke-dasharray="${C}" style="stroke-dashoffset:${C * (1 - (s.total ? s.left / s.total : 1))}" transform="rotate(-90 120 120)"/></svg>
    <div class="ringtxt"><strong id="clk" role="timer" aria-live="off">${clock(s.left)}</strong><span>${label[s.mode]} · ${state}</span></div></div>
  <label class="field">Working on<select id="tsel"><option value="">No task</option>${tasks.map(t => `<option value="${t.id}" ${t.id === s.taskId ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>
  ${s.status === 'done' ? `<div class="banner" role="alert"><p>${s.mode === 'focus' ? 'Focus session complete.' : 'Break finished.'} ${s.mode === 'focus' && next === 'long' ? 'You have earned a long break.' : ''}</p>
    <div class="row"><button class="btn primary" id="nb">${next === 'focus' ? 'Start focusing' : 'Start ' + label[next].toLowerCase()}</button><button class="btn" id="dm">Dismiss</button>${s.mode === 'focus' ? '<button class="btn" id="kf">Keep focusing</button>' : ''}</div></div>` : `
  <div class="row center">
    ${s.status === 'running' ? `<button class="btn primary lg" id="pa">${icon('pause')} Pause</button>` : `<button class="btn primary lg" id="st">${icon('play')} ${s.status === 'paused' ? 'Resume' : 'Start'}</button>`}
    <button class="btn" id="rs">${icon('reset')} Reset</button><button class="btn" id="sk">${icon('skip')} Skip</button><button class="btn" id="cl">Clear session</button></div>`}
  <div class="row center"><button class="btn" id="fm">${icon('focus')} ${g.settings.focusMode ? 'Exit Focus Mode' : 'Focus Mode'}</button>
    <label class="check"><input type="checkbox" id="dnd" ${g.settings.dnd ? 'checked' : ''}/> Do Not Disturb</label></div>
  <p class="muted small center">Do Not Disturb only quiets Study Space. To silence other apps, turn on your operating system's Do Not Disturb or Focus mode.</p></div>`);
  const $ = q => root.querySelector(q), on = (q, f) => { const e = $(q); if (e) e.onclick = f; };
  root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { if (s.status === 'running' || s.status === 'paused') { if (!confirm('Switch mode? The current session will be recorded as cancelled.')) return; timer.reset(); } timer.setMode(b.dataset.m); });
  on('#st', timer.start); on('#pa', timer.pause); on('#rs', timer.reset); on('#sk', timer.skip); on('#cl', timer.clearSession);
  on('#nb', () => { timer.advance(false); timer.start(); }); on('#dm', () => timer.setMode('focus')); on('#kf', () => { timer.setMode('focus'); timer.start(); });
  on('#fm', () => { toggleFocusMode(); focus(root); });
  $('#tsel').onchange = e => timer.setTask(e.target.value);
  $('#dnd').onchange = e => { g.settings.dnd = e.target.checked; save(); };
  const off = timer.on('tick', () => { const t = timer.t(), a = $('#arc'), c = $('#clk'); if (!a) return; c.textContent = clock(t.left); a.style.strokeDashoffset = C * (1 - t.left / t.total); });
  return off;
}

function tasksView(root) {
  const g = get(); let edit = null, f = { q: '', status: 'all', pri: 'all', sub: 'all', sort: 'created' };
  const draw = () => {
    const subs = [...new Set(g.tasks.map(t => t.subject).filter(Boolean))];
    const e = g.tasks.find(t => t.id === edit) || {};
    let list = g.tasks.filter(t => (f.status === 'all' || (f.status === 'done' ? t.done : f.status === 'overdue' ? isOverdue(t) : !t.done)) && (f.pri === 'all' || t.priority === f.pri) && (f.sub === 'all' || t.subject === f.sub) && (`${t.title} ${t.desc} ${t.subject}`.toLowerCase().includes(f.q.toLowerCase())));
    list.sort((a, b) => f.sort === 'priority' ? PRI[b.priority] - PRI[a.priority] : f.sort === 'deadline' ? (a.deadline || '9').localeCompare(b.deadline || '9') : f.sort === 'title' ? a.title.localeCompare(b.title) : b.created - a.created);
    root.innerHTML = page('Tasks', 'Plan what to study, then focus on it.', `
    <form id="tf" class="card form"><h2>${edit ? 'Edit task' : 'New task'}</h2>
      <label class="field">Title<input name="title" required maxlength="120" value="${esc(e.title)}"/></label>
      <label class="field">Description (optional)<textarea name="desc" rows="2">${esc(e.desc)}</textarea></label>
      <div class="row wrap"><label class="field">Subject<input name="subject" maxlength="40" list="subs" value="${esc(e.subject)}"/><datalist id="subs">${subs.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
      <label class="field">Priority<select name="priority">${['low', 'medium', 'high'].map(p => `<option ${(e.priority || 'medium') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <label class="field">Deadline<input type="date" name="deadline" value="${esc(e.deadline)}"/></label>
      <label class="field">Estimate (min)<input type="number" name="est" min="0" max="2000" value="${esc(e.est)}"/></label></div>
      <div class="row"><button class="btn primary">${edit ? 'Save changes' : 'Add task'}</button>${edit ? '<button type="button" class="btn" id="ce">Cancel</button>' : ''}</div></form>
    <div class="row wrap filters"><input id="q" type="search" placeholder="Search tasks" aria-label="Search tasks" value="${esc(f.q)}"/>
      ${sel('status', ['all', 'active', 'done', 'overdue'], f.status, 'Status')}${sel('pri', ['all', 'high', 'medium', 'low'], f.pri, 'Priority')}${sel('sub', ['all', ...subs], f.sub, 'Subject')}${sel('sort', ['created', 'priority', 'deadline', 'title'], f.sort, 'Sort')}</div>
    ${list.length ? `<ul class="tasks">${list.map(t => { const spent = st.taskMs(t.id); return `<li class="task ${t.done ? 'done' : ''} ${isOverdue(t) ? 'over' : ''}">
      <input type="checkbox" data-t="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark ${esc(t.title)} complete"/>
      <div class="grow"><strong>${esc(t.title)}</strong><div class="meta"><span class="pill ${t.priority}">${t.priority}</span>${t.subject ? `<span>${esc(t.subject)}</span>` : ''}${t.deadline ? `<span class="${isOverdue(t) ? 'bad' : ''}">${isOverdue(t) ? 'Overdue · ' : 'Due '}${esc(t.deadline)}</span>` : ''}<span>${fmtDur(spent)}${t.est ? ` of ${t.est}m` : ''} studied</span></div>
      ${t.est ? `<div class="bar"><i style="width:${Math.min(100, spent / 60000 / t.est * 100)}%"></i></div>` : ''}${t.desc ? `<p class="muted small">${esc(t.desc)}</p>` : ''}</div>
      <div class="row">${t.done ? '' : `<button class="btn" data-f="${t.id}">Focus</button>`}<button class="btn icon" data-e="${t.id}" aria-label="Edit ${esc(t.title)}">${icon('edit', 18)}</button><button class="btn icon" data-d="${t.id}" aria-label="Delete ${esc(t.title)}">${icon('trash', 18)}</button></div></li>`; }).join('')}</ul>`
      : empty(g.tasks.length ? 'No matching tasks' : 'No tasks yet', g.tasks.length ? 'Try changing the filters.' : 'Add your first task above, then press Focus to study it.')}`);
    bind();
  };
  const sel = (k, opts, v, l) => `<select data-k="${k}" aria-label="${l}">${opts.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${l}: ${esc(o)}</option>`).join('')}</select>`;
  const bind = () => {
    root.querySelector('#tf').onsubmit = ev => { ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target)); d.title = d.title.trim(); if (!d.title) return;
      d.est = Math.max(0, +d.est || 0);
      if (edit) Object.assign(g.tasks.find(t => t.id === edit), d); else g.tasks.push({ id: uid('t'), done: false, created: Date.now(), ...d });
      save(); toast(edit ? 'Task saved.' : 'Task added.'); edit = null; draw(); };
    const ce = root.querySelector('#ce'); if (ce) ce.onclick = () => { edit = null; draw(); };
    root.querySelector('#q').oninput = ev => { f.q = ev.target.value; const pos = ev.target.selectionStart; draw(); const q = root.querySelector('#q'); q.focus(); q.setSelectionRange(pos, pos); };
    root.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { f[s.dataset.k] = s.value; draw(); });
    root.querySelectorAll('[data-t]').forEach(c => c.onchange = () => { g.tasks.find(t => t.id === c.dataset.t).done = c.checked; save(); draw(); });
    root.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { edit = b.dataset.e; draw(); scrollTo(0, 0); });
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (!confirm('Delete this task? Past sessions stay in your history.')) return; g.tasks = g.tasks.filter(t => t.id !== b.dataset.d); if (timer.t().taskId === b.dataset.d) timer.setTask(null); save(); draw(); });
    root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (timer.t().mode !== 'focus' && timer.t().status === 'idle') timer.setMode('focus'); timer.setTask(b.dataset.f); toast('Task selected for your next focus session.'); nav('focus'); });
  };
  draw();
}

function stats(root) {
  const g = get(), days = st.last7(), max = Math.max(...days.map(d => d.ms), 1), done = st.focusDone(), sk = st.streaks(), bd = st.bestDay(), subj = st.bySubject();
  const avg = done.length ? done.reduce((a, s) => a + s.dur, 0) / done.length : 0, tdone = g.tasks.filter(t => t.done).length;
  const goal = g.settings.goal * 60000;
  const cells = [...Array(28)].map((_, i) => { const k = new Date(); k.setDate(k.getDate() - (27 - i)); const key = dayKey(k.getTime()), ms = st.perDay()[key] || 0, lv = ms === 0 ? 0 : ms >= goal ? 4 : ms >= goal * .66 ? 3 : ms >= goal * .33 ? 2 : 1; return `<i class="lv${lv}" title="${key}: ${fmtDur(ms)}"></i>`; }).join('');
  root.innerHTML = page('Statistics', 'Based on completed focus sessions only. Breaks, skipped and cancelled sessions are not counted.', `
  <div class="cards">${[['Focus today', fmtDur(st.todayMs())], ['Focus this week (Mon–Sun)', fmtDur(st.weekMs())], ['Completed sessions', done.length], ['Average session', done.length ? fmtDur(avg) : '—'], ['Goal today', st.goalPct() + '%'], ['Most productive day', bd ? `${bd[0]} (${fmtDur(bd[1])})` : '—']].map(([l, v]) => `<div class="card"><span class="muted">${l}</span><strong class="big sm">${v}</strong></div>`).join('')}</div>
  <section class="card"><h2>Last 7 days</h2>${done.length ? `<div class="chart" role="img" aria-label="Focus minutes per day: ${days.map(d => `${d.label} ${Math.round(d.ms / 60000)}`).join(', ')}">${days.map(d => `<div class="col"><small>${d.ms ? Math.round(d.ms / 60000) : ''}</small><div class="colbar"><i style="height:${d.ms / max * 100}%"></i></div><small class="muted">${d.label}</small></div>`).join('')}</div>` : empty('No data yet', 'Complete a focus session and your week will appear here.')}</section>
  <div class="grid2"><section class="card"><h2>By subject</h2>${subj.length ? subj.map(([s, ms]) => `<div class="srow"><span>${esc(s)}</span><span>${fmtDur(ms)}</span><div class="bar"><i style="width:${ms / subj[0][1] * 100}%"></i></div></div>`).join('') : '<p class="muted">Link sessions to tasks with subjects to see this.</p>'}</section>
  <section class="card"><h2>Tasks</h2><p>${tdone} of ${g.tasks.length} completed</p><div class="bar"><i style="width:${g.tasks.length ? tdone / g.tasks.length * 100 : 0}%"></i></div></section></div>
  <section class="card"><h2>Streak: ${sk.current} ${sk.current === 1 ? 'day' : 'days'} · Best: ${sk.best}</h2><div class="heat" role="img" aria-label="Study activity for the last 28 days">${cells}</div>
  <p class="muted small">A day counts toward your streak when you complete at least one focus session (by your local date). Your streak stays alive today until midnight, and missing a full day resets it.</p></section>`);
}

function history(root) {
  const g = get(); let f = { q: '', type: 'all', status: 'all', dir: 'desc' };
  const draw = () => {
    const rows = g.sessions.map(s => ({ ...s, task: g.tasks.find(t => t.id === s.taskId) })).filter(s => (f.type === 'all' || s.type === f.type) && (f.status === 'all' || s.status === f.status) && `${s.task?.title || ''} ${s.task?.subject || ''}`.toLowerCase().includes(f.q.toLowerCase())).sort((a, b) => f.dir === 'desc' ? b.start - a.start : a.start - b.start);
    root.innerHTML = page('Session History', `Today: ${fmtDur(st.todayMs())} focus · This week: ${fmtDur(st.weekMs())} focus`, `
    <div class="row wrap filters"><input id="q" type="search" placeholder="Search by task or subject" aria-label="Search history" value="${esc(f.q)}"/>
      <select data-k="type" aria-label="Type">${['all', 'focus', 'short', 'long'].map(o => `<option ${o === f.type ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <select data-k="status" aria-label="Status">${['all', 'completed', 'skipped', 'cancelled'].map(o => `<option ${o === f.status ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <select data-k="dir" aria-label="Order"><option value="desc" ${f.dir === 'desc' ? 'selected' : ''}>Newest first</option><option value="asc" ${f.dir === 'asc' ? 'selected' : ''}>Oldest first</option></select>
      <button class="btn" id="clr">Clear history</button></div>
    ${rows.length ? `<div class="scroll"><table><thead><tr><th>Date</th><th>Start</th><th>Type</th><th>Task</th><th>Subject</th><th>Duration</th><th>Status</th></tr></thead><tbody>${rows.map(s => `<tr><td>${fmtDate(s.start)}</td><td>${fmtTime(s.start)}</td><td>${s.type === 'focus' ? 'Focus' : s.type === 'short' ? 'Short break' : 'Long break'}</td><td>${esc(s.task?.title || '—')}</td><td>${esc(s.task?.subject || '—')}</td><td>${fmtDur(s.dur)}</td><td><span class="pill ${s.status}">${s.status}</span></td></tr>`).join('')}</tbody></table></div>` : empty('No sessions to show', g.sessions.length ? 'Try different filters.' : 'Finished sessions are saved here automatically.')}`);
    root.querySelector('#q').oninput = e => { f.q = e.target.value; const p = e.target.selectionStart; draw(); const q = root.querySelector('#q'); q.focus(); q.setSelectionRange(p, p); };
    root.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { f[s.dataset.k] = s.value; draw(); });
    root.querySelector('#clr').onclick = () => { if (g.sessions.length && confirm('Delete all session history? This cannot be undone.')) { clearSessions(); draw(); } };
  };
  draw();
}

function settings(root) {
  const g = get(), s = g.settings;
  const num = (k, l, min, max) => `<label class="field">${l}<input type="number" data-n="${k}" min="${min}" max="${max}" value="${s[k]}"/></label>`;
  const chk = (k, l) => `<label class="check"><input type="checkbox" data-c="${k}" ${s[k] ? 'checked' : ''}/> ${l}</label>`;
  root.innerHTML = page('Settings', 'Saved automatically in this browser.', `
  <section class="card form"><h2>Timer</h2><div class="row wrap">${num('focus', 'Focus (min)', 1, 180)}${num('short', 'Short break (min)', 1, 60)}${num('long', 'Long break (min)', 1, 120)}${num('every', 'Focus sessions before long break', 1, 12)}${num('goal', 'Daily goal (min)', 5, 1440)}</div>
    ${chk('autoBreak', 'Start breaks automatically')}${chk('autoFocus', 'Start the next focus session automatically')}<p class="muted small">Duration changes apply to the next session you start from idle.</p></section>
  <section class="card form"><h2>Appearance</h2><div class="row wrap"><label class="field">Theme<select data-s="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row" role="radiogroup" aria-label="Accent colour">${ACCENTS.map(c => `<button class="sw" role="radio" aria-checked="${s.accent === c}" aria-label="Accent ${c}" data-a="${c}" style="background:${c}"></button>`).join('')}</div>
    ${chk('reduce', 'Reduce animations')}</section>
  <section class="card form"><h2>Sound and notifications</h2>${chk('sound', 'Play a chime when a session ends')}${chk('dnd', 'Do Not Disturb (hides non-essential in-app alerts)')}
    <div class="row"><button class="btn" id="bn">Enable browser notifications</button></div><p class="muted small">Study Space can't change notifications from other apps. Use your operating system's Do Not Disturb for that.</p></section>
  <section class="card form"><h2>Your data</h2><p class="muted small">Everything is stored in this browser with localStorage. It does not sync between devices, and clearing browser data removes it. Export a backup if it matters.</p>
    <div class="row wrap"><button class="btn" id="ex">Export data</button><label class="btn">Import data<input type="file" id="im" accept="application/json" hidden/></label></div></section>`);
  root.querySelectorAll('[data-n]').forEach(i => i.onchange = () => { const v = Math.min(+i.max, Math.max(+i.min, Math.round(+i.value) || +i.min)); i.value = v; s[i.dataset.n] = v; save(); if (timer.t().status === 'idle') timer.setMode(timer.t().mode); });
  root.querySelectorAll('[data-c]').forEach(i => i.onchange = () => { s[i.dataset.c] = i.checked; save(); applySettings(); });
  root.querySelectorAll('[data-s]').forEach(i => i.onchange = () => { s[i.dataset.s] = i.value; save(); applySettings(); });
  root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { s.accent = b.dataset.a; save(); applySettings(); settings(root); });
  root.querySelector('#bn').onclick = async () => toast(await enableBrowserNotifications(), { essential: true });
  root.querySelector('#ex').onclick = exportJSON;
  root.querySelector('#im').onchange = async e => { const f = e.target.files[0]; if (!f) return;
    try { const text = await f.text(); JSON.parse(text); if (!confirm('Importing replaces your current tasks, sessions and settings. Continue?')) return; importJSON(text); location.reload(); }
    catch (err) { toast(`Import failed: ${err.message}`, { essential: true }); } };
}


function communityView(root) {
  const c = community.config();
  const s = community.session();
  const localMinutes = Math.floor(st.focusDone().reduce((sum, row) => sum + row.dur, 0) / 60000);
  const status = (message, bad = false) => { const el = root.querySelector('#community-message'); if (el) { el.textContent = message; el.classList.toggle('bad', bad); } };
  let board = null, me = null;
  const draw = (board = null, me = null) => {
    const cfg = community.config(), user = community.session();
    root.innerHTML = page('Community', 'Real students. Real focus time. Friendly competition.', `
      <section class="community-hero"><div class="community-orb">${icon('flame', 30)}</div><div class="community-hero-copy"><span class="eyebrow">STUDY TOGETHER</span><h2>Your next study streak starts here.</h2><p>Join the leaderboard, build a habit, and compare focus minutes with real people.</p></div><div class="community-stat"><strong>${user ? (me?.focus_minutes ?? localMinutes) : localMinutes}</strong><span>your focus minutes</span></div></section>
      <div id="community-message" class="community-message" role="status">${cfg.url ? (user ? `Signed in${user.user?.email ? ` as ${esc(user.user.email)}` : ''}. Refresh the leaderboard to update your score.` : 'Community backend configured. Create an account or sign in to join the leaderboard.') : 'Community needs a small free backend setup before real users can appear. No fake players are shown.'}</div>
      <div class="community-grid">
        <section class="card community-card"><div class="section-kicker">01 / CONNECT</div><h2>Set up the community</h2><p class="muted small">This uses Supabase for real accounts and shared scores. The public anon key is intended for browser apps; never paste a service-role key here.</p>
          <form id="community-config" class="form"><label class="field">Supabase Project URL<input id="sb-url" type="url" placeholder="https://your-project.supabase.co" value="${esc(cfg.url)}" required /></label><label class="field">Supabase anon / publishable key<input id="sb-key" type="password" autocomplete="off" placeholder="Paste your public anon key" value="${esc(cfg.key)}" required /></label><button class="btn primary">Save connection</button></form>
          <details class="setup-details"><summary>How to create the free backend</summary><ol><li>Create a project at <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">Supabase</a>.</li><li>Copy the Project URL and anon/public key from Project Settings → API.</li><li>Open SQL Editor, paste the SQL below, and run it.</li><li>Paste the URL and public key above, then create an account.</li></ol><pre class="sql-block" id="community-sql"></pre><button class="btn" type="button" id="copy-sql">Copy SQL</button><p class="muted small">This project stores display names and total focus minutes in a public leaderboard. Use a nickname, not private personal information.</p></details>
        </section>
        <section class="card community-card"><div class="section-kicker">02 / YOUR ACCOUNT</div><h2>${user ? 'You’re in the community' : 'Join the leaderboard'}</h2>
          ${user ? `<div class="signed-in"><div class="avatar">${esc((user.user?.user_metadata?.display_name || user.user?.email || 'S').slice(0,1).toUpperCase())}</div><div><strong>${esc(user.user?.user_metadata?.display_name || user.user?.email || 'Student')}</strong><p class="muted small">${esc(user.user?.email || '')}</p></div></div><label class="field">Leaderboard nickname<input id="community-name" maxlength="24" value="${esc(me?.display_name || user.user?.user_metadata?.display_name || '')}" placeholder="Choose a nickname" /></label><div class="row wrap"><button class="btn primary" id="save-community-profile">Update score & profile</button><button class="btn" id="community-signout">Sign out</button></div>` : `<form id="community-auth" class="form"><label class="field">Display name<input id="community-display" maxlength="24" placeholder="Your study nickname" required /></label><label class="field">Email<input id="community-email" type="email" autocomplete="email" placeholder="you@example.com" required /></label><label class="field">Password<input id="community-password" type="password" minlength="6" autocomplete="current-password" placeholder="At least 6 characters" required /></label><div class="row wrap"><button class="btn primary" name="action" value="signup">Create account</button><button class="btn" name="action" value="signin">Sign in</button></div></form>`}
          <p class="muted small">Your score is calculated from completed focus sessions on this browser and synced when you open or refresh this page. The leaderboard is real only after the backend is configured.</p>
        </section>
      </div>
      <section class="card leaderboard-card"><div class="row between wrap"><div><div class="section-kicker">03 / THE RANKINGS</div><h2>All-time focus leaderboard</h2><p class="muted small">Ranked by total completed focus minutes. No sample users or made-up scores.</p></div><button class="btn" id="refresh-board">${icon('reset')} Refresh leaderboard</button></div>
      ${board ? (board.length ? `<div class="leaderboard">${board.map((u, i) => `<div class="leader-row ${s?.user?.id === u.id ? 'is-you' : ''}"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="avatar">${esc((u.display_name || 'S').slice(0,1).toUpperCase())}</span><span class="leader-name"><strong>${esc(u.display_name || 'Student')}${s?.user?.id === u.id ? ' <span class="you-tag">YOU</span>' : ''}</strong><small class="muted">Focus time recorded</small></span><strong class="leader-score">${Math.floor((u.focus_minutes || 0) / 60)}h ${(u.focus_minutes || 0) % 60}m</strong></div>`).join('')}</div>` : empty('No students yet', 'Create an account and be the first to join the real leaderboard.')) : empty('Leaderboard not loaded', 'Connect the backend, sign in, then refresh to see real community members.')}
      </section>`);
    const sql = root.querySelector('#community-sql'); if (sql) sql.textContent = community.setupSQL();
    root.querySelector('#community-config').onsubmit = e => { e.preventDefault(); try { community.saveConfig(root.querySelector('#sb-url').value, root.querySelector('#sb-key').value); status('Connection saved. Now create an account or sign in.'); draw(); } catch (err) { status(err.message, true); } };
    const authForm = root.querySelector('#community-auth');
    if (authForm) authForm.onsubmit = async e => { e.preventDefault(); const action = e.submitter?.value || 'signup'; const email = root.querySelector('#community-email').value.trim(); const password = root.querySelector('#community-password').value; const name = root.querySelector('#community-display').value.trim();
      try { if (action === 'signup') await community.signUp(email, password, name); else await community.signIn(email, password); const user = community.session(); await community.upsertProfile(action === 'signup' ? name : (user?.user?.user_metadata?.display_name || name || email.split('@')[0]), localMinutes); const rows = await community.leaderboard(); draw(rows, await community.profile()); } catch (err) { status(err.message, true); } };
    root.querySelector('#community-signout')?.addEventListener('click', () => { community.signOut(); draw(); });
    root.querySelector('#save-community-profile')?.addEventListener('click', async () => { try { await community.upsertProfile(root.querySelector('#community-name').value, localMinutes); const rows = await community.leaderboard(); draw(rows, await community.profile()); } catch (err) { status(err.message, true); } });
    root.querySelector('#refresh-board').onclick = async () => { try { let profile = null; if (community.session()) { await community.upsertProfile(undefined, localMinutes); profile = await community.profile(); } const rows = await community.leaderboard(); draw(rows, profile); } catch (err) { status(err.message, true); } };
    root.querySelector('#copy-sql')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(community.setupSQL()); status('SQL copied. Paste it into the Supabase SQL Editor.'); } catch { status('Select and copy the SQL shown above.', true); } });
  };
  draw(null, null);
  if (c.url && c.key) {
    (async () => { try { if (s) { await community.upsertProfile(undefined, localMinutes); me = await community.profile(); } board = await community.leaderboard(); if (root.querySelector('#community-config')) draw(board, me); }
      catch (err) { status(err.message, true); } })();
  }
}

export const views = { dashboard, focus, tasks: tasksView, stats, history, settings, community: communityView };
