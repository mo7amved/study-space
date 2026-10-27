# Study Space

A study productivity app: Pomodoro timer, tasks, statistics, session history, focus mode, ambient sound, Spotify playlist embeds, and an optional real community leaderboard. Plain HTML, CSS and vanilla JavaScript (ES modules) with Vite. No framework. The personal study tools work without an account; the community leaderboard requires your own Supabase project.

## Setup (Windows PowerShell or any terminal)
Requires Node.js 18+.

    cd study-space
    npm install
    npm run dev

Open the URL Vite prints (usually http://localhost:5173). Build with `npm run build`.

## Features
Dashboard, Focus Room (custom durations, timestamp-based timer that survives refresh and background tabs, smart long-break suggestions, auto-start options), Tasks (create, edit, delete, filter, search, sort, per-task study time), Statistics (7-day chart, subjects, streaks, 28-day heatmap), Session History (filter, sort, clear with confirmation), Focus Mode, Do Not Disturb (in-app only), themes and accent colours, export/import JSON, and a Community page that can connect to Supabase Auth plus a shared leaderboard.

## How data is stored
Everything lives in browser localStorage under one key (`study-space:data`, with a version field). It does not sync between devices and is removed if you clear browser data. Use Settings > Export data for backups.

## Streaks and statistics
Only completed focus sessions count. A day counts for the streak if it has at least one (local date). Skipped and cancelled sessions are saved in history but never counted. Weeks run Monday to Sunday.

## Audio
Built-in sounds (rain, white noise, deep calm, gentle ambient) are generated with the Web Audio API, so no audio files are needed. You can also play your own file from the upload button in the player (it is not saved between visits). To bundle files later, put them in `public/assets/` and add an `<audio>` source in `src/modules/audio.js`.

## Community leaderboard (real users)

The Community page is intentionally not populated with fake profiles. To enable real shared accounts and rankings:

1. Create a project in [Supabase](https://supabase.com/dashboard).
2. In Project Settings → API, copy the Project URL and the **anon/public or publishable key**. Never use a `service_role` or secret key in the browser.
3. Open the Community page, paste those values, and save.
4. Open its setup instructions, copy the supplied SQL into the Supabase SQL Editor, and run it once.
5. Create an account or sign in. Use a nickname rather than private information.

The leaderboard is based on each account's completed focus minutes synced from the current browser when the Community page is opened/refreshed. It is a simple all-time leaderboard, not an anti-cheat system; do not treat scores as verified. Supabase's email-confirmation settings may require confirming your email before sign-in.

## Spotify
Paste a Spotify playlist or album link in the player's Spotify panel. It uses the official Spotify Embed with the iFrame API (`https://open.spotify.com/embed/iframe-api/v1`); the player keeps playing when you close the panel, and ambient sound pauses when Spotify starts; playback and track skipping use Spotify's own controls, and free accounts may be limited by Spotify's rules. This is not a personal-account OAuth connection. Full account/API integration requires a Spotify developer app and is subject to Spotify's current eligibility rules; the Web Playback SDK requires Premium. The app does not include Spotify client secrets.

## Limitations
A website cannot turn off other apps' notifications; use your operating system's Do Not Disturb. Background-tab timers can fire late, but remaining time is recalculated from timestamps. Spotify personal-account connection is not enabled; only the official playlist/album embed is included. The Community leaderboard requires a user-configured Supabase project. Background presets and ambient visual effects are not included.

## Troubleshooting
If `npm install` fails, check `node -v`. If sound is silent, press play once (browsers block autoplay). If Spotify is blank, your network or browser may block embeds.
