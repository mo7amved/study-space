const P = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>', timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  tasks: '<path d="M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  history: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4M12 8v5l3 2"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M7 4v16M17 4v16"/>', vol: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>', music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  flame: '<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-4 3-7 1 1 2 2 3-5z"/>', skip: '<path d="M5 4l10 8-10 8zM19 4v16"/>',
  reset: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5M3 4v4h4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', focus: '<circle cx="12" cy="12" r="3"/><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', check: '<path d="M4 12l5 5L20 6"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
export const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
