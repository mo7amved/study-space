import { get, save } from './storage.js';
// Built-in sounds are synthesized with the Web Audio API, so no audio files are required.
export const TRACKS = { rain: 'Soft rain', white: 'White noise', brown: 'Deep calm', ambient: 'Gentle ambient' };
let ctx, master, nodes = [], el = null, playing = false, fileName = '';
const subs = new Set(); export const onAudio = f => subs.add(f); const emit = () => subs.forEach(f => f());
export const isPlaying = () => playing; export const customName = () => fileName;

function ensure() {
  if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); }
  if (ctx.state === 'suspended') ctx.resume();
  master.gain.value = get().settings.vol;
}
function noise(kind) {
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
}
function build(track) {
  if (track === 'ambient') {
    [110, 164.8, 220.5].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.12; l.frequency.value = 0.08 + i * 0.05; lg.gain.value = 0.06;
      l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); l.start(); nodes.push(o, l); });
  } else {
    const n = noise(track === 'brown' ? 'brown' : 'white'); let out = n;
    if (track === 'rain') { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5; n.connect(bp); out = bp; }
    out.connect(master); n.start(); nodes.push(n);
  }
}
function halt() { nodes.forEach(n => { try { n.stop(); } catch {} n.disconnect(); }); nodes = []; if (el) el.pause(); playing = false; }

export async function play() {
  halt();
  const s = get().settings;
  try {
    if (s.track === 'file' && el) { el.volume = s.vol; await el.play(); }
    else { if (s.track === 'file') s.track = 'rain'; ensure(); build(s.track in TRACKS ? s.track : 'rain'); }
    playing = true;
  } catch (e) { console.warn('Audio blocked', e); playing = false; }
  emit();
}
export function pause() { halt(); emit(); }
export const toggle = () => (playing ? pause() : play());
export function setTrack(id) { get().settings.track = id; save(); if (playing) play(); else emit(); }
export function setVolume(v) { get().settings.vol = v; save(); if (master) master.gain.value = v; if (el) el.volume = v; }
export function useFile(file) {
  if (!file || !file.type.startsWith('audio/')) throw new Error('Choose an audio file (mp3, wav or ogg).');
  if (el) URL.revokeObjectURL(el.src);
  el = new Audio(URL.createObjectURL(file)); el.loop = true; fileName = file.name;
  get().settings.track = 'file'; save(); play();
}
export function chime() {
  if (!get().settings.sound) return;
  try { ensure(); [660, 880, 1320].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
    const t0 = ctx.currentTime + i * 0.18; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.55); }); } catch {}
}
