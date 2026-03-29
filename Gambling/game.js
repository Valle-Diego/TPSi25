/* ─────────────────────────────────────────────
   LET'S GO GAMBLING — game.js
   Clean, separated game logic
───────────────────────────────────────────── */

'use strict';

// ── CONFIG ──────────────────────────────────
const SYMBOLS = [
  { emoji: '🍒', weight: 12 },
  { emoji: '🍋', weight: 10 },
  { emoji: '🍊', weight: 10 },
  { emoji: '🍇', weight: 8  },
  { emoji: '🍍', weight: 8  },
  { emoji: '🍉', weight: 6  },
  { emoji: '⭐', weight: 4  },
  { emoji: '💎', weight: 2  },
];

// Build weighted pool
const POOL = SYMBOLS.flatMap(({ emoji, weight }) => Array(weight).fill(emoji));

const PAYTABLE = {
  5: { '💎': 20, '⭐': 15, '🍉': 12, default: 10 },
  4: { default: 3 },
  3: { default: 1 },
};

const REEL_COUNT = 5;
const SPIN_DURATION_BASE = 1000; // ms per reel stop start
const SPIN_INTERVAL = 220;       // ms between each reel start
const TICK_MS = 60;              // symbol swap interval during spin

// ── STATE ────────────────────────────────────
let credits  = 100;
let record   = 100;
let bet      = 10;
let spinning = false;
let reelsLeft = 0;

// Final symbols for each reel (set at spin start so result is predetermined)
const finalSymbols = Array(REEL_COUNT).fill(null);

// ── DOM REFS ─────────────────────────────────
const els = {
  cabinet:    document.getElementById('cabinet'),
  credits:    document.getElementById('credits'),
  betDisplay: document.getElementById('bet-display'),
  record:     document.getElementById('record'),
  payline:    document.getElementById('payline'),
  btnSpin:    document.getElementById('btn-spin'),
  ptToggle:   document.getElementById('pt-toggle'),
  paytable:   document.getElementById('paytable'),
  betOptions: document.querySelectorAll('.bet-btn'),
  reels:      Array.from({ length: REEL_COUNT }, (_, i) => ({
    el:    document.getElementById(`reel-${i}`),
    inner: document.querySelector(`#reel-${i} .reel-inner`),
  })),
  sounds: {
    spin:  document.getElementById('snd-spin'),
    win:   document.getElementById('snd-win'),
    lose:  document.getElementById('snd-lose'),
    click: document.getElementById('snd-click'),
  },
};

// ── INIT ─────────────────────────────────────
els.btnSpin.addEventListener('click', onSpin);

els.ptToggle.addEventListener('click', () => {
  const open = els.paytable.classList.toggle('open');
  els.ptToggle.textContent = open ? '▴ Pay Table' : '▾ Pay Table';
});

els.betOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    if (spinning) return;
    bet = parseInt(btn.dataset.bet, 10);
    els.betDisplay.textContent = bet;
    els.betOptions.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playSound('click');
  });
});

// ── AUDIO ────────────────────────────────────
function playSound(name) {
  const s = els.sounds[name];
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}

function stopSound(name) {
  const s = els.sounds[name];
  if (!s) return;
  s.pause();
  s.currentTime = 0;
}

// ── RNG ──────────────────────────────────────
function randomSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

// ── UI HELPERS ───────────────────────────────
function updateStats() {
  els.credits.textContent = credits;
  els.record.textContent  = record;
  els.betDisplay.textContent = bet;
}

function setPayline(text, cls = '') {
  els.payline.className = 'payline-text' + (cls ? ` ${cls}` : '');
  els.payline.textContent = text;
}

function flashStat(id, cls) {
  const el = document.getElementById(id);
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 800);
}

function setBtnDisabled(state) {
  els.btnSpin.disabled = state;
  els.betOptions.forEach(b => b.disabled = state);
}

// ── SPIN ─────────────────────────────────────
function onSpin() {
  if (spinning) return;

  if (credits < bet) {
    setPayline('NOT ENOUGH CREDITS — GAME OVER', 'lose');
    return;
  }

  spinning = true;
  reelsLeft = REEL_COUNT;
  credits -= bet;
  updateStats();
  flashStat('credits', 'flash-red');
  setPayline('SPINNING…', 'info');
  setBtnDisabled(true);

  // Predetermine results
  for (let i = 0; i < REEL_COUNT; i++) finalSymbols[i] = randomSymbol();

  // Clear win state
  els.reels.forEach(r => {
    r.el.classList.remove('win');
    r.el.classList.add('spinning');
  });
  els.cabinet.classList.remove('jackpot-glow');

  playSound('spin');

  // Start each reel with a staggered delay
  els.reels.forEach((reel, i) => {
    const stopDelay = SPIN_DURATION_BASE + i * SPIN_INTERVAL;
    startReelTick(reel, i, stopDelay);
  });
}

function startReelTick(reel, index, stopDelay) {
  // Rapid symbol shuffle
  const ticker = setInterval(() => {
    reel.inner.textContent = randomSymbol();
  }, TICK_MS);

  // Stop this reel after stopDelay ms
  setTimeout(() => {
    clearInterval(ticker);
    reel.inner.textContent = finalSymbols[index];
    reel.el.classList.remove('spinning');

    // Small bounce
    reel.el.style.transition = 'transform 0.1s ease';
    reel.el.style.transform  = 'scale(1.06)';
    setTimeout(() => {
      reel.el.style.transform = 'scale(1)';
    }, 110);

    reelsLeft--;
    if (reelsLeft === 0) onAllReelsStopped();
  }, stopDelay);
}

// ── EVALUATE ─────────────────────────────────
function onAllReelsStopped() {
  stopSound('spin');
  spinning = false;

  const result = evaluate(finalSymbols);

  if (result.multiplier > 0) {
    const winAmt = bet * result.multiplier;
    credits += winAmt;
    if (credits > record) record = credits;
    updateStats();
    flashStat('credits', 'flash-green');
    flashStat('record', 'flash-green');

    const label = result.count === 5 ? '🎉 JACKPOT!' : result.count === 4 ? '🔥 FOUR OF A KIND!' : '✨ THREE OF A KIND!';
    setPayline(`${label} +${winAmt} (×${result.multiplier})`, 'win');
    playSound('win');

    // Animate winning reels
    finalSymbols.forEach((sym, i) => {
      if (sym === result.symbol) els.reels[i].el.classList.add('win');
    });

    if (result.count === 5) {
      els.cabinet.classList.add('jackpot-glow');
      setTimeout(() => els.cabinet.classList.remove('jackpot-glow'), 3500);
    }
  } else {
    setPayline('😢 OH DANG IT! — NO MATCH', 'lose');
    playSound('lose');
  }

  updateStats();
  setBtnDisabled(false);
}

function evaluate(syms) {
  // Count occurrences of each symbol
  const counts = {};
  syms.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

  let bestCount  = 0;
  let bestSymbol = null;

  for (const [sym, cnt] of Object.entries(counts)) {
    if (cnt > bestCount || (cnt === bestCount && symValue(sym) > symValue(bestSymbol))) {
      bestCount  = cnt;
      bestSymbol = sym;
    }
  }

  // Look up multiplier
  const tier = PAYTABLE[bestCount];
  if (!tier) return { multiplier: 0, count: 0, symbol: null };

  const mult = tier[bestSymbol] ?? tier.default ?? 0;
  return { multiplier: mult, count: bestCount, symbol: bestSymbol };
}

function symValue(s) {
  // Higher = rarer
  return SYMBOLS.findIndex(({ emoji }) => emoji === s);
}
