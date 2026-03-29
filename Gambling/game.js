'use strict';

/* ─────────────────────────────────────────────
   LET'S GO GAMBLING — game.js
   3×5 grid with 11 classic patterns
   Grid addressing: grid[row][col], row=0 top, row=2 bottom
───────────────────────────────────────────── */

// ── SYMBOLS (weighted) ───────────────────────
const SYMBOLS = [
  { e: '🍒', w: 14 },
  { e: '🍋', w: 12 },
  { e: '🍊', w: 10 },
  { e: '🍇', w:  9 },
  { e: '🍍', w:  8 },
  { e: '🍉', w:  6 },
  { e: '⭐', w:  4 },
  { e: '💎', w:  2 },
];
const POOL = SYMBOLS.flatMap(({ e, w }) => Array(w).fill(e));

// ── PATTERNS ────────────────────────────────
// Each pattern is an array of [row, col] cells (5 cells, one per column)
// "match" means all 5 cells share the same symbol.
const PATTERNS = [
  {
    name: 'HOR',
    mult: 1,
    cells: [[1,0],[1,1],[1,2],[1,3],[1,4]], // middle row
    desc: 'middle row',
  },
  {
    name: 'DIAG',
    mult: 1,
    cells: [[0,0],[0,1],[1,2],[2,3],[2,4]], // diagonal ↘ (approx)
    desc: 'diagonal ↘',
  },
  {
    name: 'DIAG2',
    mult: 1,
    cells: [[2,0],[2,1],[1,2],[0,3],[0,4]], // diagonal ↗
    desc: 'diagonal ↗',
  },
  {
    name: 'HOR-L (top)',
    mult: 2,
    cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], // top row
    desc: 'top row',
  },
  {
    name: 'HOR-L (bot)',
    mult: 2,
    cells: [[2,0],[2,1],[2,2],[2,3],[2,4]], // bottom row
    desc: 'bottom row',
  },
  {
    name: 'HOR-XL',
    mult: 3,
    // All 3 rows must match the same symbol
    cells: [
      [0,0],[0,1],[0,2],[0,3],[0,4],
      [1,0],[1,1],[1,2],[1,3],[1,4],
      [2,0],[2,1],[2,2],[2,3],[2,4],
    ],
    desc: 'all 3 rows',
    allSame: true, // special: every cell same symbol
  },
  {
    name: 'ZIG',
    mult: 4,
    // M-shape: top-mid-top-mid-top across columns
    cells: [[0,0],[1,1],[0,2],[1,3],[0,4]],
    desc: 'M-shape',
  },
  {
    name: 'ZAG',
    mult: 4,
    // W-shape: bot-mid-bot-mid-bot
    cells: [[2,0],[1,1],[2,2],[1,3],[2,4]],
    desc: 'W-shape',
  },
  {
    name: 'ABOVE',
    mult: 7,
    // Top 2 rows all same symbol (10 cells)
    cells: [
      [0,0],[0,1],[0,2],[0,3],[0,4],
      [1,0],[1,1],[1,2],[1,3],[1,4],
    ],
    desc: 'top 2 rows',
    allSame: true,
  },
  {
    name: 'BELOW',
    mult: 7,
    // Bottom 2 rows all same symbol (10 cells)
    cells: [
      [1,0],[1,1],[1,2],[1,3],[1,4],
      [2,0],[2,1],[2,2],[2,3],[2,4],
    ],
    desc: 'bottom 2 rows',
    allSame: true,
  },
  {
    name: 'EYE',
    mult: 8,
    // Diamond / eye shape: pick cells that form a diamond in a 3×5
    // col0:mid, col1:top+bot, col2:all3, col3:top+bot, col4:mid
    cells: [
      [1,0],
      [0,1],[2,1],
      [0,2],[1,2],[2,2],
      [0,3],[2,3],
      [1,4],
    ],
    desc: 'diamond shape',
    allSame: true,
  },
  {
    name: 'JACKPOT',
    mult: 10,
    // All 15 cells same symbol
    cells: [
      [0,0],[0,1],[0,2],[0,3],[0,4],
      [1,0],[1,1],[1,2],[1,3],[1,4],
      [2,0],[2,1],[2,2],[2,3],[2,4],
    ],
    desc: 'all 15 cells',
    allSame: true,
  },
];

// VERT: each column independently (5 patterns, one per column)
// We handle VERT specially in evaluate().

// ── STATE ────────────────────────────────────
let credits  = 200;
let record   = 200;
let bet      = 10;
let spinning = false;

// 3×5 grid of final symbols [row][col]
const grid = [
  ['🍒','🍋','🍊','🍉','⭐'],
  ['🍇','💎','🍒','🍋','🍍'],
  ['🍉','⭐','🍇','💎','🍒'],
];

// ── DOM ──────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  cabinet:    $('cabinet'),
  credits:    $('credits'),
  betDisplay: $('bet-display'),
  record:     $('record'),
  paylineText:$('payline-text'),
  btnSpin:    $('btn-spin'),
  ptToggle:   $('pt-toggle'),
  paytable:   $('paytable'),
  betBtns:    document.querySelectorAll('.bet-btn'),
};

// Cell element lookup
function cellEl(r, c) { return $(`c${r}${c}`); }
function cellInner(r, c) { return cellEl(r,c).querySelector('.cell-inner'); }

// ── INIT ─────────────────────────────────────
dom.btnSpin.addEventListener('click', onSpin);

dom.ptToggle.addEventListener('click', () => {
  const open = dom.paytable.classList.toggle('open');
  dom.ptToggle.textContent = open ? '▴ Pay Table' : '▾ Pay Table';
});

dom.betBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (spinning) return;
    bet = parseInt(btn.dataset.bet, 10);
    dom.betDisplay.textContent = bet;
    dom.betBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playSound('click');
  });
});

// ── AUDIO ────────────────────────────────────
function playSound(name) {
  const s = $(`snd-${name}`);
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}
function stopSound(name) {
  const s = $(`snd-${name}`);
  if (!s) return;
  s.pause(); s.currentTime = 0;
}

// ── RNG ──────────────────────────────────────
function rnd() { return POOL[Math.floor(Math.random() * POOL.length)]; }

// ── SPIN ─────────────────────────────────────
function onSpin() {
  if (spinning) return;
  if (credits < bet) {
    setMsg('NOT ENOUGH CREDITS', 'lose');
    return;
  }

  spinning = true;
  credits -= bet;
  updateStats();
  flashStat('credits', 'flash-red');
  setMsg('SPINNING…', 'info');
  setAllDisabled(true);
  clearWinCells();
  dom.cabinet.classList.remove('jackpot-glow');

  // Predetermine final grid
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      grid[r][c] = rnd();

  playSound('spin');

  // Staggered column stop: col 0 stops first
  const COL_DELAY  = 260; // ms between column stops
  const SPIN_BASE  = 700; // how long col 0 spins
  const TICK       = 55;

  // Start all cells spinning immediately
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      startCellSpin(r, c);

  // Per-column ticker + stop
  for (let c = 0; c < 5; c++) {
    const stopAt = SPIN_BASE + c * COL_DELAY;
    const col = c;

    // Rapid random tick for this column
    const tickers = [0,1,2].map(r => {
      return setInterval(() => {
        cellInner(r, col).textContent = rnd();
      }, TICK);
    });

    setTimeout(() => {
      // Stop all 3 cells in this column
      tickers.forEach(t => clearInterval(t));
      [0,1,2].forEach(r => {
        const inner = cellInner(r, col);
        inner.textContent = grid[r][col];
        cellEl(r,col).classList.remove('spinning');

        // Bounce
        inner.style.transform = 'scale(1.15)';
        setTimeout(() => { inner.style.transform = 'scale(1)'; }, 120);
      });

      // Last column done → evaluate
      if (col === 4) {
        setTimeout(() => {
          stopSound('spin');
          evaluate();
          spinning = false;
          setAllDisabled(false);
        }, 180);
      }
    }, stopAt);
  }
}

function startCellSpin(r, c) {
  cellEl(r,c).classList.add('spinning');
}

// ── EVALUATE ─────────────────────────────────
function evaluate() {
  const wins = [];

  // Check each pattern
  for (const pat of PATTERNS) {
    if (patternMatches(pat)) {
      wins.push(pat);
    }
  }

  // Check VERT: each column independently (all 3 rows same)
  for (let c = 0; c < 5; c++) {
    if (grid[0][c] === grid[1][c] && grid[1][c] === grid[2][c]) {
      wins.push({
        name: `VERT col ${c+1}`,
        mult: 1,
        cells: [[0,c],[1,c],[2,c]],
        desc: `column ${c+1}`,
      });
    }
  }

  if (wins.length === 0) {
    setMsg('😢 OH DANG IT! — NO MATCH', 'lose');
    playSound('lose');
    return;
  }

  // Best win (highest multiplier)
  wins.sort((a,b) => b.mult - a.mult);
  const best = wins[0];

  const winAmt = bet * best.mult;
  credits += winAmt;
  if (credits > record) record = credits;
  updateStats();
  flashStat('credits', 'flash-green');
  if (credits > record) flashStat('record', 'flash-green');

  // Highlight winning cells
  const winCells = new Set();
  wins.forEach(w => w.cells.forEach(([r,c]) => winCells.add(`${r},${c}`)));
  winCells.forEach(key => {
    const [r,c] = key.split(',').map(Number);
    cellEl(r,c).classList.add('win');
  });

  const isJackpot = best.name === 'JACKPOT';
  const label = isJackpot
    ? '✦ JACKPOT!'
    : wins.length > 1
      ? `${best.name} + ${wins.length-1} more!`
      : best.name;

  setMsg(`${label}  +${winAmt}  (×${best.mult})`, 'win');
  playSound('win');

  if (isJackpot) {
    dom.cabinet.classList.add('jackpot-glow');
    setTimeout(() => dom.cabinet.classList.remove('jackpot-glow'), 4000);
  }
}

function patternMatches(pat) {
  if (pat.allSame) {
    // Every cell in the pattern must share one symbol
    const sym = grid[pat.cells[0][0]][pat.cells[0][1]];
    return pat.cells.every(([r,c]) => grid[r][c] === sym);
  }
  // 5-cell line pattern: all 5 same symbol
  const sym = grid[pat.cells[0][0]][pat.cells[0][1]];
  return pat.cells.every(([r,c]) => grid[r][c] === sym);
}

// ── UI HELPERS ───────────────────────────────
function updateStats() {
  dom.credits.textContent    = credits;
  dom.record.textContent     = record;
  dom.betDisplay.textContent = bet;
}

function setMsg(text, cls = '') {
  dom.paylineText.className = 'payline-text' + (cls ? ` ${cls}` : '');
  dom.paylineText.textContent = text;
}

function flashStat(id, cls) {
  const el = $(id);
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 750);
}

function clearWinCells() {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      cellEl(r,c).classList.remove('win');
}

function setAllDisabled(state) {
  dom.btnSpin.disabled = state;
  dom.betBtns.forEach(b => b.disabled = state);
}
