// generate-bible-icons.js
const fs = require('fs');
const path = require('path');

const categoryColor = {
  pentateuch: '#CB653F',
  historical: '#FE9540',
  wisdom: '#FFD700',
  major_prophet: '#845EC2',
  minor_prophet: '#036AFC',
  gospel: '#CB653F',
  history: '#845EC2',
  pauline_epistle: '#7fe06eff',
  general_epistle: '#FE9540',
  prophecy: '#dede32',
};

const books = [
  { name: 'Genesis', category: 'pentateuch' },
  { name: 'Exodus', category: 'pentateuch' },
  { name: 'Leviticus', category: 'pentateuch' },
  { name: 'Numbers', category: 'pentateuch' },
  { name: 'Deuteronomy', category: 'pentateuch' },
  { name: 'Joshua', category: 'historical' },
  { name: 'Judges', category: 'historical' },
  { name: 'Ruth', category: 'historical' },
  { name: '1 Samuel', category: 'historical' },
  { name: '2 Samuel', category: 'historical' },
  { name: '1 Kings', category: 'historical' },
  { name: '2 Kings', category: 'historical' },
  { name: '1 Chronicles', category: 'historical' },
  { name: '2 Chronicles', category: 'historical' },
  { name: 'Ezra', category: 'historical' },
  { name: 'Nehemiah', category: 'historical' },
  { name: 'Esther', category: 'historical' },
  { name: 'Job', category: 'wisdom' },
  { name: 'Psalms', category: 'wisdom' },
  { name: 'Proverbs', category: 'wisdom' },
  { name: 'Ecclesiastes', category: 'wisdom' },
  { name: 'Song of Songs', category: 'wisdom' },
  { name: 'Isaiah', category: 'major_prophet' },
  { name: 'Jeremiah', category: 'major_prophet' },
  { name: 'Lamentations', category: 'major_prophet' },
  { name: 'Ezekiel', category: 'major_prophet' },
  { name: 'Daniel', category: 'major_prophet' },
  { name: 'Hosea', category: 'minor_prophet' },
  { name: 'Joel', category: 'minor_prophet' },
  { name: 'Amos', category: 'minor_prophet' },
  { name: 'Obadiah', category: 'minor_prophet' },
  { name: 'Jonah', category: 'minor_prophet' },
  { name: 'Micah', category: 'minor_prophet' },
  { name: 'Nahum', category: 'minor_prophet' },
  { name: 'Habakkuk', category: 'minor_prophet' },
  { name: 'Zephaniah', category: 'minor_prophet' },
  { name: 'Haggai', category: 'minor_prophet' },
  { name: 'Zechariah', category: 'minor_prophet' },
  { name: 'Malachi', category: 'minor_prophet' },
  { name: 'Matthew', category: 'gospel' },
  { name: 'Mark', category: 'gospel' },
  { name: 'Luke', category: 'gospel' },
  { name: 'John', category: 'gospel' },
  { name: 'Acts', category: 'history' },
  { name: 'Romans', category: 'pauline_epistle' },
  { name: '1 Corinthians', category: 'pauline_epistle' },
  { name: '2 Corinthians', category: 'pauline_epistle' },
  { name: 'Galatians', category: 'pauline_epistle' },
  { name: 'Ephesians', category: 'pauline_epistle' },
  { name: 'Philippians', category: 'pauline_epistle' },
  { name: 'Colossians', category: 'pauline_epistle' },
  { name: '1 Thessalonians', category: 'pauline_epistle' },
  { name: '2 Thessalonians', category: 'pauline_epistle' },
  { name: '1 Timothy', category: 'pauline_epistle' },
  { name: '2 Timothy', category: 'pauline_epistle' },
  { name: 'Titus', category: 'pauline_epistle' },
  { name: 'Philemon', category: 'pauline_epistle' },
  { name: 'Hebrews', category: 'general_epistle' },
  { name: 'James', category: 'general_epistle' },
  { name: '1 Peter', category: 'general_epistle' },
  { name: '2 Peter', category: 'general_epistle' },
  { name: '1 John', category: 'general_epistle' },
  { name: '2 John', category: 'general_epistle' },
  { name: '3 John', category: 'general_epistle' },
  { name: 'Jude', category: 'general_epistle' },
  { name: 'Revelation', category: 'prophecy' },
];

// Utilities
function getFirstLetterUppercase(name) {
  if (!name || typeof name !== 'string') return '';
  const match = name.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : '';
}

function darkenHex(hex, amount = 0.3) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.max(0, Math.floor(r * (1 - amount)));
  const dg = Math.max(0, Math.floor(g * (1 - amount)));
  const db = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${[dr, dg, db].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function sanitizeFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-');
}

function getDarkLetterColor() {
  const darkColors = ['#000000ff', '#000000ff', '#000000ff', '#000000ff'];
  return darkColors[Math.floor(Math.random() * darkColors.length)];
}

// SVG generator
function makeIconSVG({ name, bg, hinge, letterColor }) {
  const W = 60, H = 60, borderRadius = 4;
  const nameX = Math.round(W * 0.06);
  const nameY = Math.round(H * 0.10) + 6;
  const letterX = Math.round(W * 0.98);
  const letterY = Math.round(H * 0.90);

  const bookName = name.toUpperCase();
  const firstLetter = getFirstLetterUppercase(name);

  const hingeWidth = 2;
  const hingePath = `
    M 0,${borderRadius}
    A ${borderRadius},${borderRadius} 0 0 1 ${borderRadius},0
    H ${hingeWidth}
    V ${H}
    H ${borderRadius}
    A ${borderRadius},${borderRadius} 0 0 1 0,${H - borderRadius}
    Z
  `.replace(/\s+/g, ' ').trim();

  let fontSize = 6; // default slightly smaller than before

  if (bookName.length > 10) { // start shrinking a bit earlier
    fontSize = Math.max(
      3, // new minimum font size
      Math.floor(6 - (bookName.length - 10) * 0.5) // shrink faster
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${W}" height="${H}" rx="${borderRadius}" ry="${borderRadius}" fill="${bg}"/>
  <path d="${hingePath}" fill="${hinge}"/>
  <text x="${nameX}" y="${nameY}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="${fontSize}" font-weight="700" fill="${letterColor}" text-rendering="geometricPrecision">${bookName}</text>
  <text x="${letterX}" y="${letterY}" font-family="'Radley', serif" font-weight="400" font-style="normal" font-size="42" fill="${letterColor}" text-anchor="end" dominant-baseline="alphabetic" text-rendering="geometricPrecision">${firstLetter}</text>
</svg>`;
}

// Generate all
function main() {
  const outDir = path.join(process.cwd(), 'icons');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  books.forEach((b, idx) => {
    const bg = categoryColor[b.category] || '#CCCCCC';
    const hinge = darkenHex(bg, 0.55);
    const letterColor = getDarkLetterColor();
    const svg = makeIconSVG({ name: b.name, bg, hinge, letterColor });
    const num = String(idx + 1).padStart(2, '0');
    const filename = `${num}-${sanitizeFilename(b.name)}.svg`;
    fs.writeFileSync(path.join(outDir, filename), svg, 'utf8');
  });

  console.log(`✅ Generated ${books.length} icons in ./icons`);
}

main();
