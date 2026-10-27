import { get, save } from './storage.js';
// Essential toasts (session finished) still show in Do Not Disturb; everything else is suppressed.
export function toast(msg, { essential = false } = {}) {
  if (get().settings.dnd && !essential) return;
  const box = document.getElementById('toasts'); if (!box) return;
  const el = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg });
  box.append(el); setTimeout(() => el.remove(), 5000);
}
export function notify(title, body) {
  const s = get().settings;
  if (s.dnd || !s.browserNotify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body }); } catch {}
}
export async function enableBrowserNotifications() {
  if (!('Notification' in window)) return 'Your browser does not support notifications.';
  const r = await Notification.requestPermission();
  get().settings.browserNotify = r === 'granted'; save();
  return r === 'granted' ? 'Browser notifications are on.' : 'Permission was not granted. In-app alerts still work.';
}
