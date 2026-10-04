// Hand-tuned inline SVG icons. All use currentColor unless they are illustrative.

const svg = (body, { size = 24, view = '0 0 24 24', cls = '' } = {}) =>
  `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="${view}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icon = {
  calendar: (s) => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', { size: s }),
  today: (s) => svg('<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/><path d="M7.5 9.5h9M7.5 13h6M7.5 16.5h3.5"/>', { size: s }),
  chart: (s) => svg('<path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-5 3.5 3 6-7"/><circle cx="19" cy="6.5" r="1.3" fill="currentColor"/>', { size: s }),
  settings: (s) => svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>', { size: s }),
  left: (s) => svg('<path d="M14.5 6 8.5 12l6 6"/>', { size: s }),
  right: (s) => svg('<path d="m9.5 6 6 6-6 6"/>', { size: s }),
  arrow: (s) => svg('<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/>', { size: s }),
  plus: (s) => svg('<path d="M12 6v12M6 12h12"/>', { size: s }),
  minus: (s) => svg('<path d="M6 12h12"/>', { size: s }),
  close: (s) => svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', { size: s }),
  check: (s) => svg('<path d="m5 12.5 4.2 4.2L19 7"/>', { size: s }),
  camera: (s) => svg('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z"/><circle cx="12" cy="12.5" r="3.4"/>', { size: s }),
  download: (s) => svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', { size: s }),
  sparkle: (s) => svg('<path d="M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5Z"/>', { size: s }),
  lemon: (s) => svg('<ellipse cx="12" cy="12" rx="7.5" ry="5.6" transform="rotate(-30 12 12)"/><path d="M17.6 6.4l1.6-1.6M4.8 19.2l1.6-1.6M9 12.8c1.3-1.8 3-3 5-3.6"/>', { size: s }),
  clock: (s) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', { size: s }),
  flame: (s) => svg('<path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.4-2.4-5-3.4-8.2-.4 2-1.4 3-2.6 3.6.2-2.7-.8-5.4-3.4-7.1.2 3-1.4 4.8-2.8 6.6A7.2 7.2 0 0 0 6 15.2C6 18.6 8.4 21 12 21Z"/>', { size: s }),
  leaf: (s) => svg('<path d="M5 19c0-8 5-13.5 14-14-.4 9-6 14-14 14Z"/><path d="M5 19 13 11"/>', { size: s }),
  scale: (s) => svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0"/><path d="m12 10.5 1.2-2"/>', { size: s }),
};

// Illustrative food marks inspired by the paper journal (colour, not currentColor).
export const art = {
  broccoli: `<svg class="art" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M17 24c0 5-1 9-2.4 12h9.8C23 33 22.4 29 22.6 24" fill="#6B8E3D"/>
    <circle cx="13" cy="17" r="6.4" fill="#4E7A2B"/><circle cx="20" cy="12" r="7.2" fill="#5E8C34"/>
    <circle cx="27" cy="17" r="6.2" fill="#4E7A2B"/><circle cx="20" cy="20" r="6" fill="#679A3A"/>
    <circle cx="16.5" cy="11" r="1.3" fill="#86B356"/><circle cx="24" cy="15" r="1.2" fill="#86B356"/><circle cx="12" cy="17" r="1.1" fill="#86B356"/></svg>`,
  steak: `<svg class="art" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M6 22c-1.6-6.4 3.8-12.6 12.6-13.6C27.8 7.3 35 10 34.6 17c-.4 6.4-6.8 6.6-9.6 9.8-3 3.4-6.6 5.6-11 4.8C9.8 30.8 7 27 6 22Z" fill="#B23A48"/>
    <path d="M10 21c-.6-4 3-8 9-8.6 6.4-.6 11.4 1.4 11 5.6" fill="none" stroke="#E7A3A7" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="24.5" cy="20" r="2.6" fill="#F1D3CF"/></svg>`,
  oil: `<svg class="art" viewBox="0 0 40 40" aria-hidden="true">
    <rect x="17.2" y="3.5" width="5.6" height="5" rx="1.2" fill="#3C3A30"/>
    <path d="M16.6 8.5h6.8l1.4 6.2c2.6 1.6 3.7 3.6 3.7 6.4v12.4A2.5 2.5 0 0 1 26 36H14a2.5 2.5 0 0 1-2.5-2.5V21.1c0-2.8 1.1-4.8 3.7-6.4Z" fill="#D9C24A"/>
    <path d="M13.4 22h13.2v8.6H13.4Z" fill="#F4EBB8"/><path d="M17 27.6c1.4-2.6 3.6-3.6 6-3.4" stroke="#7C8B3A" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,
  starch: `<svg class="art" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M5 19h30c0 8.4-6.6 15-15 15S5 27.4 5 19Z" fill="#C9A27A"/>
    <path d="M8 19c0-5 5-8.4 12-8.4S32 14 32 19Z" fill="#F4EDE0"/>
    <circle cx="15" cy="15.5" r="1" fill="#C9B79A"/><circle cx="21" cy="13.5" r="1" fill="#C9B79A"/><circle cx="25" cy="16" r="1" fill="#C9B79A"/></svg>`,
};

/** Crescent moon whose inner fill is toggled via CSS (.is-on). */
export const moon = (i) => `<svg class="moon" viewBox="0 0 32 32" aria-hidden="true">
  <path class="moon-fill" d="M21.5 4.8A11.6 11.6 0 1 0 27.2 22 9.4 9.4 0 0 1 21.5 4.8Z"/>
  <path class="moon-line" d="M21.5 4.8A11.6 11.6 0 1 0 27.2 22 9.4 9.4 0 0 1 21.5 4.8Z"/>
</svg><span class="unit-num">${i}</span>`;

/** Glass whose water level animates via CSS. */
export const glass = (i, uid) => `<svg class="glass" viewBox="0 0 32 40" aria-hidden="true">
  <defs><clipPath id="g${uid}-${i}"><path d="M5 4h22l-2.6 31.2a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8Z"/></clipPath></defs>
  <g clip-path="url(#g${uid}-${i})"><rect class="glass-water" x="0" y="0" width="32" height="40"/>
  <path class="glass-wave" d="M0 0q4-2 8 0t8 0 8 0 8 0v40H0Z"/></g>
  <path class="glass-line" d="M5 4h22l-2.6 31.2a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8Z"/>
</svg><span class="unit-num">${i}</span>`;

const faces = {
  angry: '<path d="M11 13.4l4 1.6M21 13.4l-4 1.6"/><path d="M11.5 23c2.6-2.4 6.4-2.4 9 0"/>',
  tired: '<path d="M10.8 15h4.2M17 15h4.2"/><path d="M12 22.4h8"/>',
  sad: '<circle cx="12.6" cy="14.6" r="1" fill="currentColor"/><circle cx="19.4" cy="14.6" r="1" fill="currentColor"/><path d="M12 22.6c2.4-2 5.6-2 8 0"/>',
  great: '<circle cx="12.6" cy="14" r="1" fill="currentColor"/><circle cx="19.4" cy="14" r="1" fill="currentColor"/><path d="M11.2 19.4c2.6 3.4 7 3.4 9.6 0"/>',
  fun: '<path d="M10.8 14.6c.8-1.6 2.8-1.6 3.6 0M17.6 14.6c.8-1.6 2.8-1.6 3.6 0"/><path d="M10.4 18.4h11.2c-.6 4-3 5.8-5.6 5.8s-5-1.8-5.6-5.8Z" fill="currentColor" fill-opacity=".14"/>',
};
export const face = (id) =>
  `<svg class="face" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/>${faces[id]}</svg>`;
