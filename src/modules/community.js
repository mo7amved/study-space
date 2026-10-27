const CONFIG_KEY = 'study-space:community-config';
const SESSION_KEY = 'study-space:community-session';
const read = (key, fallback = null) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export const config = () => read(CONFIG_KEY, { url: '', key: '' });
export function saveConfig(url, key) {
  const clean = String(url).trim().replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(clean)) throw new Error('Enter your Supabase Project URL (https://your-project.supabase.co).');
  if (!String(key).trim()) throw new Error('Paste your Supabase anon/public key.');
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: clean, key: String(key).trim() }));
}
export const session = () => read(SESSION_KEY);
const storeSession = s => s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY);
async function request(path, { method = 'GET', body, auth = false, query = '', extraHeaders = {} } = {}) {
  const c = config();
  if (!c.url || !c.key) throw new Error('Community setup is not complete yet. Add your Supabase URL and anon key first.');
  const current = session();
  const headers = { apikey: c.key, 'Content-Type': 'application/json' };
  headers.Authorization = `Bearer ${auth && current?.access_token ? current.access_token : c.key}`;
  Object.assign(headers, extraHeaders);
  const response = await fetch(`${c.url}${path}${query}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || data.hint || `Request failed (${response.status}).`);
  return data;
}
export async function signUp(email, password, displayName) {
  const c = config();
  const data = await request('/auth/v1/signup', { method: 'POST', body: { email, password, data: { display_name: displayName } } });
  if (data.access_token) storeSession(data); else throw new Error('Account created. Check your email to confirm it, then sign in here.');
  await upsertProfile(displayName, 0);
  return data;
}
export async function signIn(email, password) {
  const data = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  storeSession(data);
  return data;
}
export function signOut() { storeSession(null); }
export async function profile() {
  const s = session(); if (!s?.user?.id) return null;
  const rows = await request('/rest/v1/profiles', { auth: true, query: `?select=id,display_name,focus_minutes&id=eq.${encodeURIComponent(s.user.id)}&limit=1` });
  return rows[0] || null;
}
export async function upsertProfile(displayName, focusMinutes) {
  const s = session(); if (!s?.user?.id) throw new Error('Sign in first.');
  const name = String(displayName || s.user.user_metadata?.display_name || s.user.email?.split('@')[0] || 'Student').trim().slice(0, 24);
  const existing = await profile();
  const minutes = Math.max(Number(existing?.focus_minutes || 0), Math.max(0, Math.floor(Number(focusMinutes) || 0)));
  await request('/rest/v1/profiles?on_conflict=id', { method: 'POST', auth: true, body: { id: s.user.id, display_name: name, focus_minutes: minutes, updated_at: new Date().toISOString() }, extraHeaders: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  return { display_name: name, focus_minutes: minutes };
}
export async function leaderboard() {
  return request('/rest/v1/profiles', { query: '?select=id,display_name,focus_minutes,updated_at&order=focus_minutes.desc&limit=50' });
}
export function setupSQL() {
  return `create table if not exists public.profiles (\n  id uuid primary key references auth.users(id) on delete cascade,\n  display_name text not null default 'Student',\n  focus_minutes integer not null default 0 check (focus_minutes >= 0),\n  updated_at timestamptz not null default now()\n);\n\nalter table public.profiles enable row level security;\n\ncreate policy "Anyone can view leaderboard profiles" on public.profiles\n  for select using (true);\ncreate policy "Users can create their own profile" on public.profiles\n  for insert with check (auth.uid() = id);\ncreate policy "Users can update their own profile" on public.profiles\n  for update using (auth.uid() = id) with check (auth.uid() = id);`;
}
