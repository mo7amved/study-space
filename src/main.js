import './styles/themes.css'; import './styles/main.css'; import './styles/responsive.css';
import { get, save } from './modules/storage.js';
import * as timer from './modules/timer.js';
import * as audio from './modules/audio.js';
import { toEmbed, toUri, loadApi } from './modules/spotify-embed.js';
import { toast, notify } from './modules/notifications.js';
import { todayMs } from './modules/statistics.js';
import { icon } from './utils/icons.js';
import { esc } from './utils/dates.js';
import { views, applySettings, setNavigate } from './components/views.js';

const NAV = [['dashboard', 'Dashboard', 'home'], ['focus', 'Focus Room', 'timer'], ['tasks', 'Tasks', 'tasks'], ['stats', 'Statistics', 'chart'], ['history', 'Session History', 'history'], ['community', 'Community', 'flame'], ['settings', 'Settings', 'gear']];
const app = document.getElementById('app');
app.innerHTML = `
<a class="skip" href="#main">Skip to content</a>
<aside class="side"><div class="brand"><span class="logo"></span>Study Space</div>
<nav aria-label="Main">${NAV.map(([id, l, i]) => `<a href="#/${id}" data-r="${id}">${icon(i)}<span>${l}</span></a>`).join('')}</nav></aside>
<main id="main" tabindex="-1"></main>
<div id="toasts" role="status" aria-live="polite"></div>
<section id="spot" class="spot" hidden aria-label="Spotify"></section>
<footer class="player" aria-label="Audio player">
  <button id="pp" class="btn icon" aria-label="Play ambient sound"></button>
  <div class="np"><strong id="npName"></strong><small id="npSub"></small></div>
  <select id="trk" aria-label="Track"></select>
  <button id="mute" class="btn icon" aria-label="Mute"></button>
  <input id="vol" type="range" min="0" max="1" step="0.01" aria-label="Volume" />
  <label class="btn icon" title="Play your own audio file" tabindex="0">${icon('upload')}<input id="file" type="file" accept="audio/*" hidden /></label>
  <button id="sp" class="btn icon" aria-label="Spotify embed" aria-expanded="false">${icon('music')}</button>
</footer>`;
const main = document.getElementById('main');
let route = 'dashboard', cleanup = null;

function go(r) { location.hash = '#/' + r; }
setNavigate(go);
function render() {
  const id = views[location.hash.replace('#/', '')] ? location.hash.replace('#/', '') : 'dashboard';
  route = id; cleanup?.(); cleanup = views[id](main) || null;
  document.querySelectorAll('[data-r]').forEach(a => a.dataset.r === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}
window.addEventListener('hashchange', () => { render(); main.focus({ preventScroll: true }); });

// ---- timer events
timer.on('change', () => { if (route === 'focus' || route === 'dashboard') render(); });
timer.on('done', ({ mode, suggestion }) => {
  audio.chime();
  const msg = mode === 'focus' ? 'Focus session complete.' : 'Break finished. Ready to focus?';
  toast(msg, { essential: true }); notify('Study Space', msg);
  if (mode === 'focus') {
    const goal = get().settings.goal * 60000, now = todayMs(), prev = now - timer.t().total;
    if (prev < goal && now >= goal) toast('Daily goal reached. Nice work.');
    if (suggestion === 'long') toast('Time for a long break.');
  }
  const s = get().settings;
  if ((mode === 'focus' && s.autoBreak) || (mode !== 'focus' && s.autoFocus)) timer.advance(true);
});
timer.on('tick', () => { const s = timer.t(); document.title = s.status === 'running' ? `${Math.ceil(s.left / 60000)}m · Study Space` : 'Study Space'; });

// ---- player
const $ = id => document.getElementById(id);
const trk = $('trk'); let lastVol = 0.4;
function paintPlayer() {
  const s = get().settings, on = audio.isPlaying();
  trk.innerHTML = Object.entries(audio.TRACKS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('') + (audio.customName() ? `<option value="file">Your file</option>` : '');
  trk.value = s.track in audio.TRACKS || (s.track === 'file' && audio.customName()) ? s.track : 'rain';
  $('pp').innerHTML = icon(on ? 'pause' : 'play'); $('pp').setAttribute('aria-label', on ? 'Pause sound' : 'Play sound');
  $('npName').textContent = s.track === 'file' && audio.customName() ? audio.customName() : audio.TRACKS[s.track] || audio.TRACKS.rain;
  $('npSub').textContent = on ? 'Playing · loops' : 'Paused · starts when you press play';
  $('mute').innerHTML = icon(s.vol === 0 ? 'mute' : 'vol'); $('vol').value = s.vol;
}
audio.onAudio(paintPlayer); paintPlayer();
$('pp').onclick = () => { if (!audio.isPlaying()) spCtrl?.pause(); audio.toggle(); };
trk.onchange = () => audio.setTrack(trk.value);
$('vol').oninput = e => { audio.setVolume(+e.target.value); $('mute').innerHTML = icon(+e.target.value === 0 ? 'mute' : 'vol'); };
$('mute').onclick = () => { const v = get().settings.vol; if (v > 0) { lastVol = v; audio.setVolume(0); } else audio.setVolume(lastVol || 0.4); paintPlayer(); };
$('file').onchange = e => { try { audio.useFile(e.target.files[0]); } catch (err) { toast(err.message, { essential: true }); } e.target.value = ''; };

// ---- Spotify embed panel (official iFrame API: the player is created once and survives opening/closing the panel)
let spCtrl = null, spUri = '', spBusy = false;
function buildSpot() {
  $('spot').innerHTML = `<div class="row between"><div><h2>Spotify</h2><p class="muted small">Playlist player · account connection is not enabled</p></div><button class="btn icon" id="spx" aria-label="Close Spotify panel">${icon('x')}</button></div>
  <form id="spf" class="row"><input id="spu" type="url" placeholder="https://open.spotify.com/playlist/…" value="${esc(get().spotify)}" aria-label="Spotify playlist or album URL" /><button class="btn primary">Load</button></form>
  <p id="spe" class="err" role="alert"></p>
  <div id="spwrap" hidden><div id="spmount"></div><div class="row" style="margin-top:10px"><button class="btn" id="spt" type="button">Play / Pause</button></div></div>
  <p id="spnote" class="muted small"></p>`;
  $('spx').onclick = () => toggleSpot(false);
  $('spt').onclick = () => spCtrl?.togglePlay();
  $('spf').onsubmit = e => { e.preventDefault(); const v = $('spu').value.trim();
    if (v && !toEmbed(v)) { $('spe').textContent = 'That link is not supported. Use an open.spotify.com playlist or album link.'; return; }
    $('spe').textContent = ''; get().spotify = v; save(); syncSpot(); };
  syncSpot();
}
async function syncSpot() {
  const url = get().spotify, uri = url && toUri(url);
  $('spwrap').hidden = !uri;
  $('spnote').innerHTML = uri
    ? `If the player stays blank, your network or browser may block Spotify embeds. <a href="${esc(url)}" target="_blank" rel="noopener">Open it in Spotify</a>. Playback and track skipping use Spotify's own controls; the bar below only controls built-in sounds.`
    : `Paste a Spotify playlist or album link. This embeds Spotify; it does not connect your personal account to Study Space. Playback and track navigation happen inside Spotify's own player, and Spotify Free may have playback limitations. The rest of Study Space works without it.`;
  if (!uri) { spCtrl?.pause(); return; }
  if (spCtrl) { if (uri !== spUri) { spCtrl.loadEntity(uri); spUri = uri; } return; }
  if (spBusy) return; spBusy = true;
  try {
    const api = await loadApi();
    api.createController($('spmount'), { width: '100%', height: 152, uri }, ctrl => {
      spCtrl = ctrl; spUri = uri; spBusy = false;
      ctrl.addListener('playback_update', e => {
        const playing = !e.data.isPaused && !e.data.isBuffering;
        $('sp').classList.toggle('on', playing);
        if (playing && audio.isPlaying()) audio.pause(); // avoid ambient sound + Spotify at the same time
      });
      if (get().spotify && toUri(get().spotify) !== spUri) syncSpot(); // link changed while loading
    });
  } catch (err) {
    spBusy = false;
    $('spe').textContent = 'Could not load the Spotify player. Your network or an ad blocker may be blocking it.';
  }
}
function toggleSpot(open) { $('spot').hidden = !open; $('sp').setAttribute('aria-expanded', open); if (open && !$('spf')) buildSpot(); }
$('sp').onclick = () => toggleSpot($('spot').hidden);

applySettings(); timer.init(); render();
