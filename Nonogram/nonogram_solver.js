// ─── State ────────────────────────────────────────────────────────────────────
let numRows = 10, numCols = 10;
let rowClues = [], colClues = [];
let grid = []; // 0=unknown, 1=filled, -1=empty
let solving = false;

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  heart: {
    rows: 9, cols: 9,
    rowClues: [[3,3],[5,5],[9],[9],[7],[5],[3],[1],[]],
    colClues: [[1],[3,1],[5,1],[7],[5,1],[7],[5,1],[3,1],[1]]
  },
  cross: {
    rows: 9, cols: 9,
    rowClues: [[1],[1],[9],[1],[1],[9],[1],[1],[1]],
    colClues: [[1],[1],[9],[1],[9],[1],[9],[1],[1]]
  },
  diamond: {
    rows: 9, cols: 9,
    rowClues: [[1],[3],[5],[7],[9],[7],[5],[3],[1]],
    colClues: [[1],[3],[5],[7],[9],[7],[5],[3],[1]]
  },
  smile: {
    rows: 10, cols: 10,
    rowClues: [[2,2],[4,4],[1,4,1],[1,1],[2],[1,1],[2,2],[4,4],[1,4,1],[]],
    colClues: [[],[2],[1,3],[1,4],[6],[6],[1,4],[1,3],[2],[]]
  },
  arrow: {
    rows: 9, cols: 9,
    rowClues: [[1],[2],[3],[4],[9],[4],[3],[2],[1]],
    colClues: [[5],[6],[7],[8],[9],[4],[3],[2],[1]]
  }
};

function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  document.getElementById('num-rows').value = p.rows;
  document.getElementById('num-cols').value = p.cols;
  numRows = p.rows;
  numCols = p.cols;
  rowClues = p.rowClues.map(c => [...c]);
  colClues = p.colClues.map(c => [...c]);
  initClueInputs(true);
  initGrid();
  setStatus('idle', `Preset "${name}" loaded — click Solve`);
}

// ─── Initialization ───────────────────────────────────────────────────────────
document.getElementById('init-btn').addEventListener('click', () => {
  numRows = parseInt(document.getElementById('num-rows').value) || 10;
  numCols = parseInt(document.getElementById('num-cols').value) || 10;
  rowClues = Array.from({ length: numRows }, () => []);
  colClues = Array.from({ length: numCols }, () => []);
  initClueInputs(false);
  initGrid();
  setStatus('idle', 'Grid initialized — enter clues and solve');
});

document.getElementById('clear-btn').addEventListener('click', () => {
  initGrid();
  setStatus('idle', 'Grid cleared');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  rowClues = Array.from({ length: numRows }, () => []);
  colClues = Array.from({ length: numCols }, () => []);
  initClueInputs(false);
  initGrid();
  setStatus('idle', 'Clues reset');
});

function initClueInputs(prefill) {
  const rowList = document.getElementById('row-clues');
  const colList = document.getElementById('col-clues');
  rowList.innerHTML = '';
  colList.innerHTML = '';

  for (let i = 0; i < numRows; i++) {
    const div = document.createElement('div');
    div.className = 'clue-item';
    div.innerHTML = `
      <span class="clue-label">R${i + 1}</span>
      <input class="clue-input" type="text" id="rc-${i}" placeholder="e.g. 2 3"
        value="${prefill && rowClues[i] ? rowClues[i].join(' ') : ''}">
    `;
    rowList.appendChild(div);
  }

  for (let j = 0; j < numCols; j++) {
    const div = document.createElement('div');
    div.className = 'clue-item';
    div.innerHTML = `
      <span class="clue-label">C${j + 1}</span>
      <input class="clue-input" type="text" id="cc-${j}" placeholder="e.g. 1 4"
        value="${prefill && colClues[j] ? colClues[j].join(' ') : ''}">
    `;
    colList.appendChild(div);
  }

  document.getElementById('solve-btn').disabled = false;
}

function readClues() {
  rowClues = [];
  colClues = [];
  for (let i = 0; i < numRows; i++) {
    const el = document.getElementById(`rc-${i}`);
    const val = el ? el.value.trim() : '';
    rowClues.push(val === '' ? [] : val.split(/\s+/).map(Number).filter(n => n > 0));
  }
  for (let j = 0; j < numCols; j++) {
    const el = document.getElementById(`cc-${j}`);
    const val = el ? el.value.trim() : '';
    colClues.push(val === '' ? [] : val.split(/\s+/).map(Number).filter(n => n > 0));
  }
}

function initGrid() {
  grid = Array.from({ length: numRows }, () => new Array(numCols).fill(0));
  renderGrid();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderGrid() {
  const container = document.getElementById('grid-container');
  const maxColClueLen = Math.max(...colClues.map(c => c.length), 1);
  const maxRowClueLen = Math.max(...rowClues.map(c => c.length), 1);

  let html = `<div class="nonogram-grid"><table class="grid-table"><tbody>`;

  // Column header rows
  for (let ci = 0; ci < maxColClueLen; ci++) {
    html += '<tr>';
    if (ci === 0) {
      html += `<td class="clue-cell clue-corner" rowspan="${maxColClueLen}" colspan="${maxRowClueLen}"></td>`;
    }
    for (let j = 0; j < numCols; j++) {
      const clue = colClues[j] || [];
      const offset = maxColClueLen - clue.length;
      const val = ci >= offset ? clue[ci - offset] : '';
      html += `<td class="clue-cell col-clue">${val !== '' ? val : ''}</td>`;
    }
    html += '</tr>';
  }

  // Grid rows
  for (let i = 0; i < numRows; i++) {
    html += '<tr>';
    const rclue = rowClues[i] || [];
    const roffset = maxRowClueLen - rclue.length;
    for (let k = 0; k < maxRowClueLen; k++) {
      const val = k >= roffset ? rclue[k - roffset] : '';
      html += `<td class="clue-cell">${val !== '' ? val : ''}</td>`;
    }
    for (let j = 0; j < numCols; j++) {
      const state = grid[i][j];
      const cls = state === 1 ? 'filled' : state === -1 ? 'empty' : 'unknown';
      const br = (j + 1) % 5 === 0 ? ' border-right' : '';
      const bb = (i + 1) % 5 === 0 ? ' border-bottom' : '';
      html += `<td class="cell ${cls}${br}${bb}" onclick="toggleCell(${i},${j})"></td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function toggleCell(i, j) {
  if (solving) return;
  grid[i][j] = grid[i][j] === 0 ? 1 : grid[i][j] === 1 ? -1 : 0;
  renderGrid();
}

// ─── Status ───────────────────────────────────────────────────────────────────
function setStatus(type, msg, stats = '') {
  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot' + (type !== 'idle' ? ' ' + type : '');
  document.getElementById('status-text').textContent = msg;
  document.getElementById('stats-text').textContent = stats;
}

function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

// ─── Solver ───────────────────────────────────────────────────────────────────

/**
 * Generate all valid placements for a line given clues and current known state.
 * @param {number[]} clue - Array of block lengths
 * @param {number[]} line - Current line state (0=unknown, 1=filled, -1=empty)
 * @returns {number[][]} Array of all valid complete line assignments
 */
function getLinePossibilities(clue, line) {
  const n = line.length;
  const result = [];

  function place(ci, pos, current) {
    if (ci === clue.length) {
      for (let k = pos; k < n; k++) current[k] = -1;
      for (let k = 0; k < n; k++) {
        if (line[k] !== 0 && line[k] !== current[k]) return;
      }
      result.push([...current]);
      return;
    }

    const blockLen = clue[ci];
    const remaining = clue.slice(ci + 1).reduce((a, b) => a + b, 0) + clue.slice(ci + 1).length;
    const maxPos = n - blockLen - remaining;

    for (let p = pos; p <= maxPos; p++) {
      const next = [...current];
      for (let k = pos; k < p; k++) next[k] = -1;
      for (let k = p; k < p + blockLen; k++) next[k] = 1;

      let ok = true;
      for (let k = pos; k < p + blockLen; k++) {
        if (line[k] !== 0 && line[k] !== next[k]) { ok = false; break; }
      }
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

/**
 * Intersect all possibilities: cells agreed upon by every possibility are committed.
 * @param {number[][]} possibilities
 * @returns {number[]} Intersected line (0 where ambiguous)
 */
function intersectLine(possibilities) {
  if (possibilities.length === 0) return null;
  const n = possibilities[0].length;
  const result = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    const vals = possibilities.map(p => p[k]);
    if (vals.every(v => v === 1)) result[k] = 1;
    else if (vals.every(v => v === -1)) result[k] = -1;
    else result[k] = 0;
  }
  return result;
}

/**
 * One pass of constraint propagation across all rows and columns.
 * @returns {number} Number of cells newly determined, or -1 on contradiction
 */
function propagate(g, rClues, cClues) {
  let changed = 0;

  for (let i = 0; i < g.length; i++) {
    const line = g[i];
    const poss = getLinePossibilities(rClues[i], line);
    if (poss.length === 0) return -1;
    const inter = intersectLine(poss);
    for (let j = 0; j < line.length; j++) {
      if (line[j] === 0 && inter[j] !== 0) {
        line[j] = inter[j];
        changed++;
      }
    }
  }

  for (let j = 0; j < g[0].length; j++) {
    const line = g.map(r => r[j]);
    const poss = getLinePossibilities(cClues[j], line);
    if (poss.length === 0) return -1;
    const inter = intersectLine(poss);
    for (let i = 0; i < g.length; i++) {
      if (g[i][j] === 0 && inter[i] !== 0) {
        g[i][j] = inter[i];
        changed++;
      }
    }
  }

  return changed;
}

function cloneGrid(g) {
  return g.map(r => [...r]);
}

function isComplete(g) {
  return g.every(r => r.every(c => c !== 0));
}

/**
 * Full solver: iterative constraint propagation + backtracking.
 * Picks the most constrained unknown cell when propagation stalls.
 */
function solve(rClues, cClues) {
  const rows = rClues.length, cols = cClues.length;
  const initial = Array.from({ length: rows }, () => new Array(cols).fill(0));

  function inner(g) {
    // Propagate until stable
    while (true) {
      const ch = propagate(g, rClues, cClues);
      if (ch === -1) return null;
      if (ch === 0) break;
    }
    if (isComplete(g)) return g;

    // Find most constrained unknown cell
    let bestI = -1, bestJ = -1, bestCount = Infinity;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (g[i][j] !== 0) continue;
        const rowPoss = getLinePossibilities(rClues[i], g[i]).length;
        if (rowPoss < bestCount) {
          bestCount = rowPoss;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestI === -1) return null;

    // Try filled then empty
    for (const val of [1, -1]) {
      const g2 = cloneGrid(g);
      g2[bestI][bestJ] = val;
      const res = inner(g2);
      if (res) return res;
    }

    return null;
  }

  return inner(initial);
}

// ─── Solve Button ─────────────────────────────────────────────────────────────
document.getElementById('solve-btn').addEventListener('click', async () => {
  if (solving) return;
  readClues();

  const rowSum = rowClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  const colSum = colClues.reduce((a, c) => a + c.reduce((x, y) => x + y, 0), 0);
  if (rowSum !== colSum) {
    setStatus('error', `Clue mismatch: row sum (${rowSum}) ≠ col sum (${colSum})`);
    return;
  }

  solving = true;
  setStatus('solving', 'Solving…');
  setProgress(10);
  document.getElementById('solve-btn').disabled = true;

  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 20));
  setProgress(30);

  let result;
  try {
    result = solve(rowClues, colClues);
  } catch (e) {
    setStatus('error', 'Solver error: ' + e.message);
    solving = false;
    document.getElementById('solve-btn').disabled = false;
    return;
  }

  const t1 = performance.now();
  setProgress(100);

  if (result) {
    grid = result;
    renderGrid();
    const ms = (t1 - t0).toFixed(0);
    const cells = numRows * numCols;
    setStatus('solved', '✓ Solved!', `${cells} cells · ${ms}ms`);
  } else {
    setStatus('error', '✗ No solution found — check clues');
  }

  solving = false;
  document.getElementById('solve-btn').disabled = false;
  setTimeout(() => setProgress(0), 2000);
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
loadPreset('heart');
