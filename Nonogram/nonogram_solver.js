// ─── Constants ────────────────────────────────────────────────────────────────
const LIBRARY_KEY = 'nonogram_library';
const MAX_DIM     = 50;

// ─── State ────────────────────────────────────────────────────────────────────
let numRows  = 10;
let numCols  = 10;
let rowClues = [];   // rowClues[i] = number[]
let colClues = [];   // colClues[j] = number[]
let grid     = [];   // grid[i][j]: 0=unknown, 1=filled, -1=empty
let solving  = false;

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  heart: {
    rows: 9, cols: 9,
    rowClues: [[3,3],[5,5],[9],[9],[7],[5],[3],[1],[]],
    colClues:  [[1],[3,1],[5,1],[7],[5,1],[7],[5,1],[3,1],[1]]
  },
  cross: {
    rows: 9, cols: 9,
    rowClues: [[1],[1],[9],[1],[1],[9],[1],[1],[1]],
    colClues:  [[1],[1],[9],[1],[9],[1],[9],[1],[1]]
  },
  diamond: {
    rows: 9, cols: 9,
    rowClues: [[1],[3],[5],[7],[9],[7],[5],[3],[1]],
    colClues:  [[1],[3],[5],[7],[9],[7],[5],[3],[1]]
  },
  smile: {
    rows: 10, cols: 10,
    rowClues: [[2,2],[4,4],[1,4,1],[1,1],[2],[1,1],[2,2],[4,4],[1,4,1],[]],
    colClues:  [[],[2],[1,3],[1,4],[6],[6],[1,4],[1,3],[2],[]]
  },
  arrow: {
    rows: 9, cols: 9,
    rowClues: [[1],[2],[3],[4],[9],[4],[3],[2],[1]],
    colClues:  [[5],[6],[7],[8],[9],[4],[3],[2],[1]]
  }
};

function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  numRows  = p.rows;
  numCols  = p.cols;
  rowClues = p.rowClues.map(c => [...c]);
  colClues = p.colClues.map(c => [...c]);
  document.getElementById('num-rows').value = numRows;
  document.getElementById('num-cols').value = numCols;
  document.getElementById('puzzle-title').value = name.charAt(0).toUpperCase() + name.slice(1);
  grid = blankGrid();
  renderAll();
  setStatus('idle', `Preset "${name}" loaded — hit Solve`);
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────
function blankGrid() {
  return Array.from({ length: numRows }, () => new Array(numCols).fill(0));
}

// ─── Init from sidebar controls ───────────────────────────────────────────────
document.getElementById('init-btn').addEventListener('click', () => {
  const r = Math.min(MAX_DIM, Math.max(1, parseInt(document.getElementById('num-rows').value) || 10));
  const c = Math.min(MAX_DIM, Math.max(1, parseInt(document.getElementById('num-cols').value) || 10));
  numRows  = r;
  numCols  = c;
  rowClues = Array.from({ length: numRows }, () => []);
  colClues = Array.from({ length: numCols }, () => []);
  grid     = blankGrid();
  renderAll();
  setStatus('idle', `${r}×${c} grid ready — enter clues inline`);
  document.getElementById('solve-btn').disabled = false;
});

document.getElementById('clear-btn').addEventListener('click', () => {
  grid = blankGrid();
  renderAll();
  setStatus('idle', 'Grid cleared');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  rowClues = Array.from({ length: numRows }, () => []);
  colClues = Array.from({ length: numCols }, () => []);
  grid     = blankGrid();
  renderAll();
  setStatus('idle', 'Clues & grid reset');
});

// ─── Read clues from inline inputs ────────────────────────────────────────────
function readCluesFromInputs() {
  for (let i = 0; i < numRows; i++) {
    const el = document.getElementById(`ri-${i}`);
    rowClues[i] = el ? parseClue(el.value) : [];
  }
  for (let j = 0; j < numCols; j++) {
    const el = document.getElementById(`ci-${j}`);
    colClues[j] = el ? parseClue(el.value) : [];
  }
}

function parseClue(str) {
  return str.trim() === '' ? [] : str.trim().split(/[\s,]+/).map(Number).filter(n => n > 0);
}

function clueToStr(arr) {
  return arr.length ? arr.join(' ') : '';
}

// ─── Cell size based on grid dimensions ───────────────────────────────────────
function getCellSize() {
  if (numCols <= 15 && numRows <= 15) return 22;
  if (numCols <= 25 && numRows <= 25) return 18;
  if (numCols <= 35 && numRows <= 35) return 14;
  return 12;
}

// ─── Render everything ────────────────────────────────────────────────────────
function renderAll() {
  renderNonogram();
}

/**
 * Builds the full nonogram HTML table:
 * - top-left corner block
 * - column clue row (editable textarea per column)
 * - one row per puzzle row: left clue input + data cells
 */
function renderNonogram() {
  const wrap = document.getElementById('grid-scroll');
  const cellSize = getCellSize();
  wrap.style.setProperty('--cell', cellSize + 'px');

  // How many number-rows the column header occupies: max clue length
  const maxColRows = Math.max(...colClues.map(c => c.length), 1);
  // How wide the row-clue column should be (chars): max clue string length
  const maxRowClueW = Math.max(...rowClues.map(c => clueToStr(c).length), 4);
  const rowClueWidth = Math.max(44, maxRowClueW * 7 + 8);

  let html = `<table class="nonogram-table" style="--cell:${cellSize}px">`;

  // ── column-clue header row ──────────────────────────────────────────────────
  html += '<thead><tr>';
  // corner (spans the row-clue column)
  html += `<th class="corner-cell" style="width:${rowClueWidth}px;min-width:${rowClueWidth}px;height:${maxColRows * (cellSize + 2) + 8}px"></th>`;
  // one cell per column
  for (let j = 0; j < numCols; j++) {
    const sep = (j + 1) % 5 === 0 ? ' sep-right' : '';
    html += `<th class="col-clue-cell${sep}" style="width:${cellSize}px;min-width:${cellSize}px">
      <textarea class="col-clue-input"
        id="ci-${j}"
        rows="1"
        placeholder="…"
        title="Column ${j+1} clue"
        oninput="autoResizeTA(this)"
        onchange="colClueChanged(${j})"
      >${clueToStr(colClues[j])}</textarea>
    </th>`;
  }
  html += '</tr></thead>';

  // ── data rows ───────────────────────────────────────────────────────────────
  html += '<tbody>';
  for (let i = 0; i < numRows; i++) {
    const sepB = (i + 1) % 5 === 0 ? ' sep-bottom' : '';
    html += '<tr>';
    // row clue cell
    html += `<td class="row-clue-cell" style="width:${rowClueWidth}px;height:${cellSize}px">
      <input class="row-clue-input"
        id="ri-${i}"
        type="text"
        placeholder="…"
        title="Row ${i+1} clue"
        value="${clueToStr(rowClues[i])}"
        onchange="rowClueChanged(${i})"
      >
    </td>`;
    // data cells
    for (let j = 0; j < numCols; j++) {
      const st  = grid[i][j];
      const cls = st === 1 ? 'filled' : st === -1 ? 'empty' : 'unknown';
      const sepR = (j + 1) % 5 === 0 ? ' sep-right' : '';
      html += `<td class="data-cell ${cls}${sepR}${sepB}" onclick="toggleCell(${i},${j})"></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  wrap.innerHTML = html;

  // auto-resize all textareas for column clues
  wrap.querySelectorAll('.col-clue-input').forEach(ta => autoResizeTA(ta));
}

// keep textarea height snug
function autoResizeTA(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function rowClueChanged(i) {
  const el = document.getElementById(`ri-${i}`);
  if (el) rowClues[i] = parseClue(el.value);
}

function colClueChanged(j) {
  const el = document.getElementById(`ci-${j}`);
  if (el) colClues[j] = parseClue(el.value);
}

function toggleCell(i, j) {
  if (solving) return;
  grid[i][j] = grid[i][j] === 0 ? 1 : grid[i][j] === 1 ? -1 : 0;
  // only update the clicked cell's class, no full re-render
  const table = document.querySelector('.nonogram-table');
  if (!table) return;
  // tbody row i → child index i+1 (first is thead), then skip row-clue cell
  const row = table.tBodies[0].rows[i];
  if (!row) return;
  const cell = row.cells[j + 1]; // +1 for row-clue cell
  if (!cell) return;
  cell.className = cell.className.replace(/\b(filled|empty|unknown)\b/, '');
  const cls = grid[i][j] === 1 ? 'filled' : grid[i][j] === -1 ? 'empty' : 'unknown';
  cell.classList.add(cls);
}

// ─── Status ───────────────────────────────────────────────────────────────────
function setStatus(type, msg, stats = '') {
  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot' + (type !== 'idle' ? ' ' + type : '');
  document.getElementById('status-text').textContent = msg;
  document.getElementById('stats-text').textContent  = stats;
}

function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ─── Solver ───────────────────────────────────────────────────────────────────

/**
 * All valid placements for one line given its clue + current partial state.
 */
function getLinePossibilities(clue, line) {
  const n = line.length;
  const result = [];

  function place(ci, pos, current) {
    if (ci === clue.length) {
      for (let k = pos; k < n; k++) current[k] = -1;
      for (let k = 0; k < n; k++)
        if (line[k] !== 0 && line[k] !== current[k]) return;
      result.push([...current]);
      return;
    }
    const blockLen   = clue[ci];
    const remaining  = clue.slice(ci + 1).reduce((a, b) => a + b, 0) + clue.slice(ci + 1).length;
    const maxPos     = n - blockLen - remaining;

    for (let p = pos; p <= maxPos; p++) {
      const next = [...current];
      for (let k = pos; k < p; k++)              next[k] = -1;
      for (let k = p;   k < p + blockLen; k++)   next[k] =  1;

      let ok = true;
      for (let k = pos; k < p + blockLen; k++)
        if (line[k] !== 0 && line[k] !== next[k]) { ok = false; break; }
      if (!ok) continue;

      if (ci < clue.length - 1) {
        if (p + blockLen < n && line[p + blockLen] === 1) continue;
        next[p + blockLen] = -1;
        place(ci + 1, p + blockLen + 1, next);
      } else {
        place(ci + 1, p + blockLen, next);
      }
    }
  }

  place(0, 0, new Array(n).fill(0));
  return result;
}

/** Intersect all possibilities → definite cells. */
function intersectLine(possibilities) {
  if (!possibilities.length) return null;
  const n = possibilities[0].length;
  const result = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    const vals = possibilities.map(p => p[k]);
    if (vals.every(v => v ===  1)) result[k] =  1;
    else if (vals.every(v => v === -1)) result[k] = -1;
  }
  return result;
}

/** One propagation pass. Returns cells changed, or -1 on contradiction. */
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
    const line = g.map(r => r[j]);
    const poss = getLinePossibilities(cC[j], line);
    if (!poss.length) return -1;
    const inter = intersectLine(poss);
    for (let i = 0; i < g.length; i++)
      if (g[i][j] === 0 && inter[i] !== 0) { g[i][j] = inter[i]; changed++; }
  }
  return changed;
}

const cloneGrid = g => g.map(r => [...r]);
const isComplete = g => g.every(r => r.every(c => c !== 0));

/**
 * Full solver: propagation loop + heuristic backtracking.
 */
function solveNonogram(rC, cC) {
  const rows = rC.length, cols = cC.length;

  function inner(g) {
    while (true) {
      const ch = propagate(g, rC, cC);
      if (ch === -1) return null;
      if (ch === 0)  break;
    }
    if (isComplete(g)) return g;

    // most-constrained cell heuristic
    let bestI = -1, bestJ = -1, bestCount = Infinity;
    for (let i = 0; i < rows; i++) {
      if (g[i].every(c => c !== 0)) continue;
      const cnt = getLinePossibilities(rC[i], g[i]).length;
      for (let j = 0; j < cols; j++) {
        if (g[i][j] !== 0) continue;
        if (cnt < bestCount) { bestCount = cnt; bestI = i; bestJ = j; }
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
  if (solving) return;
  readCluesFromInputs();

  // Validate sums
  const rowSum = rowClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  const colSum = colClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  if (rowSum !== colSum) {
    setStatus('error', `Clue mismatch — row Σ ${rowSum} ≠ col Σ ${colSum}`);
    return;
  }

  solving = true;
  setStatus('solving', 'Solving…');
  setProgress(10);
  document.getElementById('solve-btn').disabled = true;

  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 20));
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

  const elapsed = (performance.now() - t0).toFixed(0);
  setProgress(100);

  if (result) {
    grid = result;
    renderAll();
    const cells = numRows * numCols;
    setStatus('solved', '✓ Solved!', `${numRows}×${numCols} · ${cells} cells · ${elapsed}ms`);
    saveToLibrary();
  } else {
    setStatus('error', '✗ No solution — check clues');
  }

  solving = false;
  document.getElementById('solve-btn').disabled = false;
  setTimeout(() => setProgress(0), 2500);
});

// ─── Library ──────────────────────────────────────────────────────────────────

function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || []; }
  catch { return []; }
}

function saveLibrary(lib) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
}

function saveToLibrary() {
  const title = (document.getElementById('puzzle-title').value.trim()) ||
                `${numRows}×${numCols} puzzle`;
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
  const lib = loadLibrary();
  // deduplicate by clue fingerprint
  const fp = fingerprint(rowClues, colClues);
  const idx = lib.findIndex(e => fingerprint(e.rowClues, e.colClues) === fp);
  if (idx >= 0) lib[idx] = entry; else lib.unshift(entry);
  saveLibrary(lib);
  renderLibrary();
}

function fingerprint(rC, cC) {
  return rC.map(c => c.join(',')).join('|') + '/' + cC.map(c => c.join(',')).join('|');
}

function deleteFromLibrary(id) {
  const lib = loadLibrary().filter(e => e.id !== id);
  saveLibrary(lib);
  renderLibrary();
}

function loadFromLibrary(id) {
  const entry = loadLibrary().find(e => e.id === id);
  if (!entry) return;
  numRows  = entry.rows;
  numCols  = entry.cols;
  rowClues = entry.rowClues.map(c => [...c]);
  colClues = entry.colClues.map(c => [...c]);
  grid     = entry.grid.map(r => [...r]);
  document.getElementById('num-rows').value    = numRows;
  document.getElementById('num-cols').value    = numCols;
  document.getElementById('puzzle-title').value = entry.title;
  renderAll();
  setStatus('solved', `Loaded: ${entry.title}`, `${numRows}×${numCols} · solved ${entry.solvedAt}`);
}

/** Draw a tiny pixel-art preview of the solved grid onto a canvas. */
function drawPreview(canvas, gridData, rows, cols) {
  const MAX_PX = 64;
  const px = Math.max(1, Math.floor(MAX_PX / Math.max(rows, cols)));
  canvas.width  = cols * px;
  canvas.height = rows * px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0d0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#c8f060';
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      if (gridData[i][j] === 1)
        ctx.fillRect(j * px, i * px, px, px);
}

function renderLibrary() {
  const lib = loadLibrary();
  const container = document.getElementById('library-grid');

  if (!lib.length) {
    container.innerHTML = '<div class="library-empty">No puzzles saved yet — solve one to add it here.</div>';
    return;
  }

  container.innerHTML = '';
  lib.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'lib-card';
    card.title = `Load "${entry.title}"`;

    // canvas preview
    const canvas = document.createElement('canvas');
    canvas.className = 'lib-preview';
    drawPreview(canvas, entry.grid, entry.rows, entry.cols);
    canvas.addEventListener('click', () => loadFromLibrary(entry.id));

    // text info
    const info = document.createElement('div');
    info.innerHTML = `
      <div class="lib-card-title">
        <span>${entry.title}</span>
        <button class="lib-delete" title="Delete" onclick="event.stopPropagation();deleteFromLibrary(${entry.id})">✕</button>
      </div>
      <div class="lib-card-meta">${entry.rows}×${entry.cols} · ${entry.solvedAt}</div>
    `;
    info.addEventListener('click', () => loadFromLibrary(entry.id));

    card.appendChild(canvas);
    card.appendChild(info);
    container.appendChild(card);
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.getElementById('solve-btn').disabled = false;
loadPreset('heart');
renderLibrary();
