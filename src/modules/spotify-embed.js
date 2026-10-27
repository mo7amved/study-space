// Official Spotify Embed + iFrame API. No Web API, no tokens, no secrets.
// A future account integration (Authorization Code + PKCE) would live in its own module next to audio.js.
const RE = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album)\/([A-Za-z0-9]{22})(?:[/?#].*)?$/;

function parse(url) {
  const m = String(url ?? '').trim().match(RE);
  return m ? { type: m[1], id: m[2] } : null;
}

// Plain iframe URL (fallback / validation).
export function toEmbed(url) {
  const p = parse(url);
  return p ? `https://open.spotify.com/embed/${p.type}/${p.id}?theme=0` : null;
}

// URI used by the iFrame API: spotify:playlist:<id> or spotify:album:<id>
export function toUri(url) {
  const p = parse(url);
  return p ? `spotify:${p.type}:${p.id}` : null;
}

// Loads https://open.spotify.com/embed/iframe-api/v1 once and resolves with IFrameAPI.
let apiPromise = null;
export function loadApi(timeoutMs = 10000) {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { apiPromise = null; reject(new Error('Spotify API timed out')); }, timeoutMs);
    window.onSpotifyIframeApiReady = api => { clearTimeout(timer); resolve(api); };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = () => { clearTimeout(timer); apiPromise = null; reject(new Error('Spotify API blocked')); };
    document.body.appendChild(s);
  });
  return apiPromise;
}
