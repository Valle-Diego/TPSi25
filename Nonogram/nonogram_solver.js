// ─── Constants ────────────────────────────────────────────────────────────────
const LIBRARY_KEY = 'nonogram_library';
const MAX_DIM     = 50;

// ─── State ────────────────────────────────────────────────────────────────────
let numRows  = 0;
let numCols  = 0;
let rowClues = [];
let colClues = [];
let grid     = [];
let solving  = false;

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  heart: {
    rows: 10, cols: 11,
    rowClues: [[2,2],[4,4],[11],[11],[11],[9],[7],[5],[3],[1]],
    colClues:  [[3],[5],[7],[8],[8],[8],[8],[8],[7],[5],[3]]
  },
  duck: {
    rows: 11, cols: 10,
    rowClues: [[],[3],[2,1],[3,2],[2,2],[6],[1,5],[6],[1],[2],[]],
    colClues:  [[],[1,2],[3,1],[1,5],[7,1],[5],[3],[4],[3],[]]
  },
  diamond: {
    rows: 9, cols: 9,
    rowClues: [[1],[3],[5],[7],[9],[7],[5],[3],[1]],
    colClues:  [[1],[3],[5],[7],[9],[7],[5],[3],[1]]
  },
};

// Validate that a preset's clues are self-consistent before loading
function validatePreset(p) {
  const rowSum = p.rowClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  const colSum = p.colClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  if (rowSum !== colSum) {
    console.error(`Preset invalid: rowSum=${rowSum} colSum=${colSum}`);
    return false;
  }
  if (p.rowClues.length !== p.rows || p.colClues.length !== p.cols) {
    console.error(`Preset invalid: clue count mismatch`);
    return false;
  }
  return true;
}

function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  if (!validatePreset(p)) {
    setStatus('error', `Preset "${name}" has invalid clues`);
    return;
  }
  numRows  = p.rows;
  numCols  = p.cols;
  rowClues = p.rowClues.map(c => [...c]);
  colClues = p.colClues.map(c => [...c]);
  document.getElementById('num-rows').value     = numRows;
  document.getElementById('num-cols').value     = numCols;
  document.getElementById('puzzle-title').value = capitalize(name);
  grid = blankGrid();
  buildTable();
  document.getElementById('solve-btn').disabled = false;
  setStatus('idle', `"${capitalize(name)}" loaded — hit Solve`);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function blankGrid() {
  return Array.from({ length: numRows }, () => new Array(numCols).fill(0));
}

function parseClue(str) {
  const trimmed = str.trim();
  if (!trimmed) return [];
  return trimmed.split(/[\s,]+/).map(Number).filter(n => Number.isFinite(n) && n > 0);
}

function clueStr(arr) {
  return arr.length ? arr.join(' ') : '';
}

// Cell size in px — always square
function cellSize() {
  const big = Math.max(numRows, numCols);
  if (big <= 15) return 24;
  if (big <= 25) return 20;
  if (big <= 35) return 15;
  return 12;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Button listeners ─────────────────────────────────────────────────────────
document.getElementById('init-btn').addEventListener('click', () => {
  const r = clamp(parseInt(document.getElementById('num-rows').value) || 10, 1, MAX_DIM);
  const c = clamp(parseInt(document.getElementById('num-cols').value) || 10, 1, MAX_DIM);
  numRows  = r;
  numCols  = c;
  rowClues = Array.from({ length: r }, () => []);
  colClues = Array.from({ length: c }, () => []);
  grid     = blankGrid();
  buildTable();
  document.getElementById('solve-btn').disabled = false;
  setStatus('idle', `${r}×${c} grid ready — type clues on the grid`);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!numRows) return;
  grid = blankGrid();
  refreshCells();
  setStatus('idle', 'Grid cleared');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!numRows) return;
  rowClues = Array.from({ length: numRows }, () => []);
  colClues = Array.from({ length: numCols }, () => []);
  grid     = blankGrid();
  buildTable();
  setStatus('idle', 'Clues & grid reset');
});

// ─── Build the full table ─────────────────────────────────────────────────────
function buildTable() {
  const cs  = cellSize();   // cell size in px — used for BOTH width and height
  const rcw = rowClueWidth(); // width of the left row-clue column

  const scroll = document.getElementById('grid-scroll');

  // We build a single <table>. The critical rule: every <td> and <th> that
  // represents a puzzle cell gets explicit style="width:Xpx;height:Xpx" so
  // the browser never compresses them. The corner cell sets the left-column width.

  let html = `<table class="nonogram-table" id="nono-table">`;

  // ── thead row: corner + column clue cells ─────────────────────────────────
  // Header height = enough for the tallest column clue (up to ~6 numbers stacked)
  const maxColClueNums = Math.max(...colClues.map(c => c.length), 1);
  // each number line is ~(cs * 0.8) tall in the textarea, plus padding
  const headerH = Math.max(maxColClueNums * 14 + 6, 22);

  html += `<thead><tr>`;
  // corner — its width anchors the row-clue column; height anchors the header row
  html += `<th class="corner-cell" style="width:${rcw}px;min-width:${rcw}px;height:${headerH}px;"></th>`;

  for (let j = 0; j < numCols; j++) {
    const sepR = (j + 1) % 5 === 0 ? ' sep-right' : '';
    // width AND min-width both set — forces fixed layout to respect cell size
    html += `<th class="col-clue-th${sepR}" style="width:${cs}px;min-width:${cs}px;height:${headerH}px;">`;
    html += `<textarea class="col-clue-ta" id="ci-${j}" placeholder="…">${clueStr(colClues[j])}</textarea>`;
    html += `</th>`;
  }
  html += `</tr></thead>`;

  // ── tbody: one tr per puzzle row ──────────────────────────────────────────
  html += `<tbody>`;
  for (let i = 0; i < numRows; i++) {
    const sepB = (i + 1) % 5 === 0 ? ' sep-bottom' : '';
    html += `<tr>`;
    // row-clue cell — same height as a data cell
    html += `<td class="row-clue-td" style="width:${rcw}px;min-width:${rcw}px;height:${cs}px;">`;
    html += `<input class="row-clue-input" id="ri-${i}" type="text" placeholder="…" value="${clueStr(rowClues[i])}">`;
    html += `</td>`;
    // data cells
    for (let j = 0; j < numCols; j++) {
      const sepR = (j + 1) % 5 === 0 ? ' sep-right' : '';
      const cls  = cellClass(grid[i][j]);
      // Both width AND height explicitly set on every data cell — this is what
      // guarantees square cells regardless of table-layout behaviour.
      html += `<td class="data-cell ${cls}${sepR}${sepB}"`;
      html += ` style="width:${cs}px;min-width:${cs}px;height:${cs}px;min-height:${cs}px;"`;
      html += ` data-i="${i}" data-j="${j}"></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  scroll.innerHTML = html;

  // ── wire up events ────────────────────────────────────────────────────────

  // Column clue textareas
  for (let j = 0; j < numCols; j++) {
    const ta = document.getElementById(`ci-${j}`);
    if (!ta) continue;
    ta.addEventListener('input',  () => { colClues[j] = parseClue(ta.value); });
    ta.addEventListener('change', () => { colClues[j] = parseClue(ta.value); });
  }

  // Row clue inputs
  for (let i = 0; i < numRows; i++) {
    const inp = document.getElementById(`ri-${i}`);
    if (!inp) continue;
    inp.addEventListener('input',  () => { rowClues[i] = parseClue(inp.value); });
    inp.addEventListener('change', () => { rowClues[i] = parseClue(inp.value); });
  }

  // Data cell clicks via delegation
  const tbody = scroll.querySelector('tbody');
  tbody.addEventListener('click', e => {
    const td = e.target.closest('.data-cell');
    if (!td || solving) return;
    const i = parseInt(td.dataset.i);
    const j = parseInt(td.dataset.j);
    grid[i][j] = grid[i][j] === 0 ? 1 : grid[i][j] === 1 ? -1 : 0;
    updateCellClass(td, grid[i][j]);
  });
}

// ── compute a sensible width for the row-clue column ─────────────────────────
function rowClueWidth() {
  const maxLen = Math.max(...rowClues.map(c => clueStr(c).length), 3);
  // ~7px per character, minimum 48px
  return Math.max(48, maxLen * 7 + 12);
}

function cellClass(v) {
  return v === 1 ? 'filled' : v === -1 ? 'empty' : 'unknown';
}

function updateCellClass(td, v) {
  td.classList.remove('filled', 'empty', 'unknown');
  td.classList.add(cellClass(v));
}

// Refresh only cell colours (after solving) without rebuilding the table
function refreshCells() {
  document.querySelectorAll('#nono-table .data-cell').forEach(td => {
    const i = parseInt(td.dataset.i);
    const j = parseInt(td.dataset.j);
    updateCellClass(td, grid[i][j]);
  });
}

// ─── Read all clues from the live inputs ──────────────────────────────────────
function readAllClues() {
  for (let i = 0; i < numRows; i++) {
    const el = document.getElementById(`ri-${i}`);
    if (el) rowClues[i] = parseClue(el.value);
  }
  for (let j = 0; j < numCols; j++) {
    const el = document.getElementById(`ci-${j}`);
    if (el) colClues[j] = parseClue(el.value);
  }
}

// ─── Status / progress ────────────────────────────────────────────────────────
function setStatus(type, msg, extra = '') {
  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot' + (type !== 'idle' ? ' ' + type : '');
  document.getElementById('status-text').textContent = msg;
  document.getElementById('stats-text').textContent  = extra;
}

function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ─── Solver ───────────────────────────────────────────────────────────────────

function getLinePossibilities(clue, line) {
  const n = line.length;
  const result = [];

  function place(ci, pos, cur) {
    if (ci === clue.length) {
      const copy = [...cur];
      for (let k = pos; k < n; k++) copy[k] = -1;
      for (let k = 0; k < n; k++)
        if (line[k] !== 0 && line[k] !== copy[k]) return;
      result.push(copy);
      return;
    }
    const bl  = clue[ci];
    const rem = clue.slice(ci + 1).reduce((a, b) => a + b, 0) + clue.slice(ci + 1).length;
    const max = n - bl - rem;
    for (let p = pos; p <= max; p++) {
      const next = [...cur];
      for (let k = pos; k < p;      k++) next[k] = -1;
      for (let k = p;   k < p + bl; k++) next[k] =  1;
      let ok = true;
      for (let k = pos; k < p + bl; k++)
        if (line[k] !== 0 && line[k] !== next[k]) { ok = false; break; }
      if (!ok) continue;
      if (ci < clue.length - 1) {
        if (p + bl < n && line[p + bl] === 1) continue;
        next[p + bl] = -1;
        place(ci + 1, p + bl + 1, next);
      } else {
        place(ci + 1, p + bl, next);
      }
    }
  }

  place(0, 0, new Array(n).fill(0));
  return result;
}

function intersectLine(poss) {
  if (!poss.length) return null;
  const n = poss[0].length;
  const r = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    if (poss.every(p => p[k] ===  1)) r[k] =  1;
    else if (poss.every(p => p[k] === -1)) r[k] = -1;
  }
  return r;
}

function propagate(g, rC, cC) {
  let changed = 0;
  for (let i = 0; i < g.length; i++) {
    const poss = getLinePossibilities(rC[i], g[i]);
    if (!poss.length) return -1;
    const inter = intersectLine(poss);
    for (let j = 0; j < g[i].length; j++)
      if (g[i][j] === 0 && inter[j] !== 0) { g[i][j] = inter[j]; changed++; }
  }
  for (let j = 0; j < g[0].length; j++) {
    const col  = g.map(r => r[j]);
    const poss = getLinePossibilities(cC[j], col);
    if (!poss.length) return -1;
    const inter = intersectLine(poss);
    for (let i = 0; i < g.length; i++)
      if (g[i][j] === 0 && inter[i] !== 0) { g[i][j] = inter[i]; changed++; }
  }
  return changed;
}

const cloneGrid  = g => g.map(r => [...r]);
const isComplete = g => g.every(r => r.every(c => c !== 0));

function solveNonogram(rC, cC) {
  const rows = rC.length, cols = cC.length;

  function inner(g) {
    for (;;) {
      const ch = propagate(g, rC, cC);
      if (ch === -1) return null;
      if (ch === 0)  break;
    }
    if (isComplete(g)) return g;

    let bestI = -1, bestJ = -1, bestCnt = Infinity;
    for (let i = 0; i < rows; i++) {
      if (g[i].every(c => c !== 0)) continue;
      const cnt = getLinePossibilities(rC[i], g[i]).length;
      for (let j = 0; j < cols; j++) {
        if (g[i][j] === 0 && cnt < bestCnt) { bestCnt = cnt; bestI = i; bestJ = j; }
      }
    }
    if (bestI === -1) return null;

    for (const val of [1, -1]) {
      const g2 = cloneGrid(g);
      g2[bestI][bestJ] = val;
      const res = inner(g2);
      if (res) return res;
    }
    return null;
  }

  return inner(Array.from({ length: rows }, () => new Array(cols).fill(0)));
}

// ─── Solve button ─────────────────────────────────────────────────────────────
document.getElementById('solve-btn').addEventListener('click', async () => {
  if (solving || !numRows) return;
  readAllClues();

  const rowSum = rowClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  const colSum = colClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  if (rowSum !== colSum) {
    setStatus('error', `Clue mismatch — row Σ ${rowSum} ≠ col Σ ${colSum}`);
    return;
  }

  solving = true;
  document.getElementById('solve-btn').disabled = true;
  setStatus('solving', 'Solving…');
  setProgress(10);

  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 30));
  setProgress(35);

  let result;
  try {
    result = solveNonogram(rowClues, colClues);
  } catch (e) {
    setStatus('error', 'Solver error: ' + e.message);
    solving = false;
    document.getElementById('solve-btn').disabled = false;
    return;
  }

  const ms = (performance.now() - t0).toFixed(0);
  setProgress(100);

  if (result) {
    grid = result;
    refreshCells();
    setStatus('solved', '✓ Solved!', `${numRows}×${numCols} · ${numRows * numCols} cells · ${ms}ms`);
    saveToLibrary();
  } else {
    setStatus('error', '✗ No solution found — check your clues');
  }

  solving = false;
  document.getElementById('solve-btn').disabled = false;
  setTimeout(() => setProgress(0), 2500);
});

// ─── Library ──────────────────────────────────────────────────────────────────
function loadLib()     { try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; } catch { return []; } }
function persistLib(l) { localStorage.setItem(LIBRARY_KEY, JSON.stringify(l)); }

function fingerprint(rC, cC) {
  return rC.map(c => c.join(',')).join('|') + '§' + cC.map(c => c.join(',')).join('|');
}

function saveToLibrary() {
  const title = document.getElementById('puzzle-title').value.trim() || `${numRows}×${numCols}`;
  const entry = {
    id:       Date.now(),
    title,
    rows:     numRows,
    cols:     numCols,
    rowClues: rowClues.map(c => [...c]),
    colClues: colClues.map(c => [...c]),
    grid:     grid.map(r => [...r]),
    solvedAt: new Date().toLocaleString()
  };
  const lib = loadLib();
  const fp  = fingerprint(rowClues, colClues);
  const idx = lib.findIndex(e => fingerprint(e.rowClues, e.colClues) === fp);
  if (idx >= 0) lib[idx] = entry; else lib.unshift(entry);
  persistLib(lib);
  renderLibrary();
}

function deleteFromLibrary(id) {
  persistLib(loadLib().filter(e => e.id !== id));
  renderLibrary();
}

function loadFromLibrary(id) {
  const e = loadLib().find(x => x.id === id);
  if (!e) return;
  numRows  = e.rows;
  numCols  = e.cols;
  rowClues = e.rowClues.map(c => [...c]);
  colClues = e.colClues.map(c => [...c]);
  grid     = e.grid.map(r => [...r]);
  document.getElementById('num-rows').value     = numRows;
  document.getElementById('num-cols').value     = numCols;
  document.getElementById('puzzle-title').value = e.title;
  buildTable();
  document.getElementById('solve-btn').disabled = false;
  setStatus('solved', `Loaded: ${e.title}`, `${numRows}×${numCols} · solved ${e.solvedAt}`);
}

function drawPreview(canvas, g, rows, cols) {
  const px = Math.max(1, Math.floor(64 / Math.max(rows, cols)));
  canvas.width  = cols * px;
  canvas.height = rows * px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0d0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#c8f060';
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      if (g[i][j] === 1) ctx.fillRect(j * px, i * px, px, px);
}

function renderLibrary() {
  const lib  = loadLib();
  const wrap = document.getElementById('library-grid');
  if (!lib.length) {
    wrap.innerHTML = '<div class="library-empty">No puzzles saved yet — solve one to add it here.</div>';
    return;
  }
  wrap.innerHTML = '';
  lib.forEach(e => {
    const card = document.createElement('div');
    card.className = 'lib-card';

    const canvas = document.createElement('canvas');
    canvas.className = 'lib-preview';
    drawPreview(canvas, e.grid, e.rows, e.cols);
    canvas.onclick = () => loadFromLibrary(e.id);

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="lib-card-title">
        <span>${e.title}</span>
        <button class="lib-delete" title="Delete">✕</button>
      </div>
      <div class="lib-card-meta">${e.rows}×${e.cols} · ${e.solvedAt}</div>
    `;
    info.querySelector('.lib-delete').onclick = ev => { ev.stopPropagation(); deleteFromLibrary(e.id); };
    info.onclick = () => loadFromLibrary(e.id);

    card.appendChild(canvas);
    card.appendChild(info);
    wrap.appendChild(card);
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
renderLibrary();
loadPreset('heart');
