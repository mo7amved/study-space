const p = n => String(n).padStart(2, '0');
export const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const today = () => dayKey(Date.now());
export const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d.getTime()); };
// Weeks start on Monday, local time.
export const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
export const fmtDur = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
export const clock = ms => { const s = Math.ceil(ms / 1000); return `${p(Math.floor(s / 60))}:${p(s % 60)}`; };
export const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = ts => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
export const uid = pre => `${pre}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
