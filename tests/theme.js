/* Theme contract.
 *
 *   node tests/theme.js
 *
 * The other four suites test pure functions. None of them can see a single
 * line of CSS, which means a theme is the one change class that can pass the
 * entire suite and still break the app for everyone at once — not by throwing,
 * but by making something unreadable. A selected book that stops looking
 * selected is a broken ballot even though no code is wrong.
 *
 * This suite closes that gap for the dangerous part: colour contrast.
 *
 * WHAT IT CHECKS
 *   1. Every role token the app relies on is defined.
 *   2. No colour literal survives anywhere a theme cannot reach it — in
 *      particular, none inline in a JS template string.
 *   3. Every foreground/background pair in PAIRS below clears a WCAG
 *      contrast threshold, for EVERY theme defined in the file.
 *
 * WHAT IT DOES NOT CHECK — be honest about this
 *   PAIRS is DECLARED, not discovered. It lists the combinations the UI
 *   actually produces, worked out by hand. A genuinely new combination has
 *   to be added here or it goes unchecked. Discovering them automatically
 *   would need a headless browser walking computed styles, and this project
 *   deliberately has no build step to hang that on.
 *
 *   It also cannot tell you a theme is ugly, or tiring to read at 9pm in a
 *   dim room. Someone still has to look at it on a real phone.
 *
 * WHY THESE PAIRS
 *   The list came out of actually building a dark theme. The one that would
 *   have shipped a broken meeting is `on-gold / gold`: four chips put dark
 *   text on a gold disc (approval tick, ranking 1-2-3 badges, "next" tag,
 *   toast tick). A theme that repointed --navy at a light colour made them
 *   cream-on-gold at 1.57:1 — an invisible checkmark on the voting screen.
 *   That is the failure this file exists to catch.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ck = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log((cond ? '  ok  ' : 'FAIL  ') + name + (cond ? '' : '  <- ' + detail));
};

// ---- read the token block out of :root ------------------------------------
function tokensFrom(block){
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const rootMatch = src.match(/:root\{([\s\S]*?)\n\}/);
if (!rootMatch) { console.error('EXTRACT FAILED: no :root block'); process.exit(1); }
const BASE = tokensFrom(rootMatch[1]);

/* Themes. The base palette is the live one; add a block per theme and every
   check below runs against it too. A theme that only overrides SOME tokens
   inherits the rest, which is exactly how a real theme behaves. */
const THEMES = {
  'base (live)': {},
};

// ---- colour maths ---------------------------------------------------------
function parse(c){
  c = String(c).trim();
  let m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) return m[1].split('').map(h => parseInt(h + h, 16));
  m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0,2,4].map(i => parseInt(m[1].slice(i, i+2), 16));
  m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
/* An rgba() token is translucent, so its effective colour depends on what is
   behind it. Composite it over the given backdrop rather than pretending the
   alpha is not there — otherwise a tint reads as far more contrasty than it
   looks on screen. */
function flatten(c, behind){
  const m = String(c).match(/^rgba\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)[,\s/]+([\d.]+)\s*\)$/i);
  if (!m) return parse(c);
  const a = +m[4], fg = [+m[1], +m[2], +m[3]], bg = parse(behind) || [255,255,255];
  return fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
}
const lin = v => { v /= 255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
const lum = rgb => 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2]);
function contrast(fg, bg){
  const a = lum(fg), b = lum(bg);
  return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
}

/* [ foreground, background, what it is, minimum ratio, knownRatio? ]
   4.5 = body text. 3.0 = large text, icons, and borders carrying meaning.

   A fifth value marks a PRE-EXISTING shortfall in the live palette. It is
   not a licence to ignore the pair — the run prints it every time, and the
   check becomes "no worse than this". A theme that degrades a known
   exception still fails. Remove the fifth value the day the colour is
   fixed and the pair goes back to a hard minimum. */
const PAIRS = [
  ['--ink',          '--card',    'body text on a card',                  4.5],
  ['--ink',          '--cream',   'body text on the page',                4.5],
  ['--ink-2',        '--card',    'secondary text on a card',             4.5],
  ['--ink-3',        '--card',    'tertiary text on a card',              3.0],
  ['--ink-3',        '--cream',   'tertiary text on the page',            3.0, 2.90],
  ['--navy',         '--cream',   'headings on the page',                 4.5],
  ['--navy',         '--card',    'headings on a card',                   4.5],
  ['--gold-dim',     '--cream',   'small gold labels on the page',        4.5],
  ['--gold-dim',     '--card',    'small gold labels on a card',          4.5],
  ['--gold-deep',    '--cream',   'the locked-suggestions card',          4.5],
  // THE ONE THAT MATTERS. Dark ink on a gold disc: the approval tick, the
  // ranking 1-2-3 badges, the "next" tag, the toast tick.
  ['--on-gold',      '--gold',    'tick/badge glyph on gold  [VOTING]',   4.5],
  ['--on-gold-warm', '--gold',    'gold button label',                    4.5],
  // Selection must be visible as a BORDER, not only as a tick.
  /* The live gold is weak against both light surfaces. It is NOT an
     unguarded failure: selection carries three signals — this border, a
     halo, and the tickmark, which scales in as a SHAPE change and clears
     6.10:1. The border is the weakest of the three, not the only one.
     Recorded so a theme cannot quietly make it worse; a dark palette
     improves it to roughly 7:1. */
  ['--gold',         '--card',    'selected-card border  [VOTING]',       3.0, 2.87],
  ['--gold',         '--cream',   'selected-card border on page [VOTING]',3.0, 2.57],
  ['--danger',       '--card',    'destructive text',                     4.5],
  ['--ink',          '--surface-2','text in an input box',                4.5],
];

/* Tokens the app genuinely depends on. A theme missing one of these inherits
   the base value, which on an inverted palette is how you get invisible text. */
const REQUIRED = ['--ink','--ink-2','--ink-3','--cream','--card','--gold','--gold-2',
                  '--navy','--hair','--danger','--on-gold','--on-gold-warm',
                  '--gold-dim','--gold-deep','--gold-tint','--gold-glow','--surface-2'];

console.log('theme tokens');
for (const t of REQUIRED) ck(`${t} is defined`, !!BASE[t], 'missing from :root');

console.log('\nno colour a theme cannot reach');
const cssEnd = src.indexOf('</style>');
const js = src.slice(cssEnd);
const inlineHex = js.match(/style="[^"]*#[0-9A-Fa-f]{3,6}[^"]*"/g) || [];
ck('no hex colour inline in a JS template string', inlineHex.length === 0,
   inlineHex.slice(0,3).join(' | '));
const glow = src.match(/box-shadow:0 0 0 3px ([^,]+),var\(--shadow\)/);
ck('the selected-card halo derives from a token',
   !!glow && glow[1].startsWith('var(--'), glow ? glow[1] : 'not found');

/* Not colour, but the same class of defect: a CSS contract that nothing else
   can see, where getting it wrong degrades a screen members use under time
   pressure. .pickcard's title and author are both <span> with no whitespace
   between them in the template, so without display:block they render as
   "ShogunJames Clavell" and .pa's margin-top silently does nothing. That
   shipped and sat on the live approval grid until 2026-11-27. */
console.log('\nlayout contracts');
ck('approval-card title is block-level',
   /\.pickcard \.pt\{[^}]*display:block/.test(src),
   'inline <span>s with no whitespace between them run together');
ck('approval-card author is block-level',
   /\.pickcard \.pa\{[^}]*display:block/.test(src),
   'and its margin-top does nothing while inline');

for (const [name, over] of Object.entries(THEMES)){
  const T = { ...BASE, ...over };
  console.log(`\ncontrast — ${name}`);
  for (const [fgT, bgT, label, min, known] of PAIRS){
    const bgRaw = T[bgT], fgRaw = T[fgT];
    if (!bgRaw || !fgRaw){ ck(label, false, `token missing (${fgT} / ${bgT})`); continue; }
    // flatten a translucent foreground over its own background
    const bg = parse(bgRaw) || flatten(bgRaw, T['--cream']);
    const fg = flatten(fgRaw, bgRaw);
    if (!bg || !fg){ ck(label, false, `unparseable (${fgRaw} on ${bgRaw})`); continue; }
    const r = contrast(fg, bg);
    if (r >= min){ ck(`${r.toFixed(2)}:1  ${label}`, true); continue; }
    if (known != null){
      // 0.02 of slack for rounding, nothing more.
      const held = r >= known - 0.02;
      ck(`${r.toFixed(2)}:1  ${label}  (known shortfall, want ${min}:1)`, held,
         `WORSE than the recorded ${known}:1 — a theme has degraded it`);
      continue;
    }
    ck(`${r.toFixed(2)}:1  ${label}`, false, `below the ${min}:1 minimum`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
