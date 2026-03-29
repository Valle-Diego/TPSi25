/* ============================================================
   Hamiltonian Path Puzzle — App Logic
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

/** The four cardinal movement directions: right, left, down, up. */
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * Built-in puzzle presets.
 * Each entry defines grid dimensions, cell size, and the initial grid layout.
 * `data: null` means the grid will be randomly generated.
 */
const PRESETS = {
  classic: {
    rows: 8, cols: 6, csize: 52,
    data: [
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
    ],
  },
  small: {
    rows: 4, cols: 4, csize: 68,
    data: [
      ['empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty' ],
    ],
  },
  medium: {
    rows: 6, cols: 6, csize: 60,
    data: [
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
      ['empty', 'empty', 'empty', 'empty', 'empty', 'empty' ],
    ],
  },
  large: { rows: 10, cols: 8, csize: 44, data: null },
};

// ── State ────────────────────────────────────────────────────────────────────

let ROWS = 8;           // current grid row count
let COLS = 6;           // current grid column count
let CSIZE = 52;         // cell size in pixels

let grid = [];          // 2-D array: 'empty' | 'obstacle' | 'start'
let currentTool = 'empty';
let isDragging = false;

// Animation state
let solution   = null;  // array of [row, col] pairs, or null
let animStep   = 0;
let animTimer  = null;
let isPaused   = false;
let totalCells = 0;     // number of non-obstacle cells (= target path length)

// ── Grid management ──────────────────────────────────────────────────────────

/**
 * (Re-)initialise the grid array.
 * When `keepData` is true, any cells that still fit within the new
 * dimensions are copied from the previous grid; the rest default to 'empty'.
 */
function initGrid(rows, cols, keepData = false) {
  const old = grid;
  ROWS = rows;
  COLS = cols;
  grid = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      keepData && old[r]?.[c] ? old[r][c] : 'empty'
    )
  );
}

/** Build DOM cells and attach interaction handlers. */
function renderGrid() {
  const el = document.getElementById('puzzle-grid');
  el.style.gridTemplateColumns = `repeat(${COLS}, ${CSIZE}px)`;
  el.innerHTML = '';

  const fs = cellFontSize();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = `cell ${grid[r][c]}`;
      cell.style.cssText = `width:${CSIZE}px; height:${CSIZE}px; font-size:${fs}px`;

      if (grid[r][c] === 'start') cell.textContent = 'G';

      // Mouse: start drag on mousedown, continue on enter while held
      cell.addEventListener('mousedown', e => {
        isDragging = true;
        paintCell(r, c);
        e.preventDefault();           // prevent text selection while dragging
      });
      cell.addEventListener('mouseenter', () => {
        if (isDragging) paintCell(r, c);
      });

      // Touch: treat each touchstart as a single paint (no drag-to-paint on touch)
      cell.addEventListener('touchstart', e => {
        paintCell(r, c);
        e.preventDefault();
      }, { passive: false });

      el.appendChild(cell);
    }
  }
}

/** Stop dragging when the mouse button is released anywhere on the page. */
document.addEventListener('mouseup', () => { isDragging = false; });

/** Apply `currentTool` to the cell at (r, c) and refresh its appearance. */
function paintCell(r, c) {
  // Enforce single start: clear any existing start cell before placing a new one
  if (currentTool === 'start') {
    for (let i = 0; i < ROWS; i++)
      for (let j = 0; j < COLS; j++)
        if (grid[i][j] === 'start') grid[i][j] = 'empty';
  }

  grid[r][c] = currentTool;
  refreshCellDOM(r, c);
}

/** Update one cell's CSS class and label without re-rendering the whole grid. */
function refreshCellDOM(r, c, cls = null, label = null) {
  const cells = document.getElementById('puzzle-grid').querySelectorAll('.cell');
  const cell  = cells[r * COLS + c];
  cell.className = `cell ${cls ?? grid[r][c]}`;
  cell.textContent = label ?? (grid[r][c] === 'start' ? 'G' : '');
}

/** Font size scales with cell size so numbers always fit. */
function cellFontSize() {
  return Math.max(9, Math.round(CSIZE * 0.26));
}

// ── Tool selection ────────────────────────────────────────────────────────────

function setTool(tool) {
  currentTool = tool;
  ['empty', 'obstacle', 'start'].forEach(t => {
    document.getElementById(`tool-${t}`).classList.toggle('active', t === tool);
  });
}

// ── Grid size controls ────────────────────────────────────────────────────────

/** Called by the Rows / Columns sliders. Resizes grid, keeping existing data. */
function onSizeChange() {
  const r = Number(document.getElementById('sl-rows').value);
  const c = Number(document.getElementById('sl-cols').value);
  document.getElementById('lbl-rows').textContent = r;
  document.getElementById('lbl-cols').textContent = c;
  resetAnimation();
  initGrid(r, c, /* keepData */ true);
  renderGrid();
  setStatus('idle', `Grid resized to ${r}×${c}.`);
}

/** Called by the Cell size slider. Only re-renders, doesn't touch grid data. */
function onCellSizeChange() {
  CSIZE = Number(document.getElementById('sl-csize').value);
  document.getElementById('lbl-csize').textContent = `${CSIZE}px`;
  renderGrid();
}

// ── Preset loader ─────────────────────────────────────────────────────────────

function loadPreset(name) {
  resetAnimation();
  const p = PRESETS[name];

  ROWS  = p.rows;
  COLS  = p.cols;
  CSIZE = p.csize;

  // Sync sliders to match the preset dimensions
  document.getElementById('sl-rows').value  = ROWS;
  document.getElementById('sl-cols').value  = COLS;
  document.getElementById('sl-csize').value = CSIZE;
  document.getElementById('lbl-rows').textContent  = ROWS;
  document.getElementById('lbl-cols').textContent  = COLS;
  document.getElementById('lbl-csize').textContent = `${CSIZE}px`;

  if (p.data) {
    grid = p.data.map(row => [...row]);
  } else {
    // Large preset: empty grid with start at (0,0) and ~15% random obstacles
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
    grid[0][0] = 'start';
    const target = Math.floor(ROWS * COLS * 0.15);
    let placed = 0;
    while (placed < target) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (grid[r][c] === 'empty') { grid[r][c] = 'obstacle'; placed++; }
    }
  }

  renderGrid();
  setStatus('idle', `Preset "${name}" loaded.`);
}

// ── Clear grid ────────────────────────────────────────────────────────────────

function clearGrid() {
  resetAnimation();
  initGrid(ROWS, COLS, /* keepData */ false);
  renderGrid();
  setStatus('idle', 'Grid cleared.');
  document.getElementById('status-count').textContent = '';
}

// ── Solver ────────────────────────────────────────────────────────────────────

/** Count all cells that are not obstacles. */
function countNonObstacle() {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== 'obstacle') n++;
  return n;
}

/** Return [row, col] of the start cell, or null if none is set. */
function findStart() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === 'start') return [r, c];
  return null;
}

/**
 * Check whether all non-obstacle cells are reachable from (sr, sc)
 * using a simple BFS. If the reachable count is less than totalCells,
 * the puzzle has disconnected regions and no Hamiltonian path exists.
 *
 * This early-exit check is cheap and prevents the DFS from wasting time
 * on provably unsolvable grids.
 */
function isConnected(sr, sc) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const queue   = [[sr, sc]];
  visited[sr][sc] = true;
  let count = 1;

  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (
        nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
        grid[nr][nc] !== 'obstacle' && !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        count++;
        queue.push([nr, nc]);
      }
    }
  }

  return count === totalCells;
}

/**
 * Iterative DFS that finds a Hamiltonian path starting from (sr, sc).
 *
 * WHY ITERATIVE?
 * The recursive version was the source of the "no solution found" bug:
 * JavaScript has a limited call-stack depth (~10 000 frames). On grids
 * with many non-obstacle cells the recursion could exceed this limit,
 * causing a silent RangeError and incorrectly reporting no solution.
 *
 * The iterative version uses an explicit stack of { r, c, dirIndex, pathLen }
 * frames so the search depth is only limited by available heap memory.
 *
 * HOW IT WORKS (backtracking with an explicit stack):
 *   Each stack frame represents "we are at cell (r, c) and have tried
 *   directions 0..dirIndex-1 already".
 *
 *   On every iteration we either:
 *     a) Try the next untried direction from the current cell → push a new frame.
 *     b) Run out of directions → backtrack (pop this frame, un-mark the cell).
 *
 *   A path array (flat, alternating r/c) and a visited grid are kept in sync
 *   with the stack so that backtracking is O(1) per step.
 */
function findHamiltonianPath(sr, sc) {
  // visited[r][c] = true while (r, c) is part of the current path
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  // path stores [r0, c0, r1, c1, …]; we reconstruct [[r,c],…] at the end
  const path = [];

  // Each stack frame: { r, c, dirIdx }
  // dirIdx = next direction index to try for this cell
  const stack = [];

  // ── Seed the search ──
  visited[sr][sc] = true;
  path.push(sr, sc);
  stack.push({ r: sr, c: sc, dirIdx: 0 });

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const { r, c } = frame;

    // Found a complete Hamiltonian path
    if (path.length / 2 === totalCells) {
      // Reconstruct into [[r, c], …] pairs
      const result = [];
      for (let i = 0; i < path.length; i += 2) result.push([path[i], path[i + 1]]);
      return result;
    }

    // Try the next untested direction from this cell
    let moved = false;
    while (frame.dirIdx < DIRS.length) {
      const [dr, dc] = DIRS[frame.dirIdx];
      frame.dirIdx++;
      const nr = r + dr, nc = c + dc;

      if (
        nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
        grid[nr][nc] !== 'obstacle' && !visited[nr][nc]
      ) {
        // Move into (nr, nc)
        visited[nr][nc] = true;
        path.push(nr, nc);
        stack.push({ r: nr, c: nc, dirIdx: 0 });
        moved = true;
        break;
      }
    }

    // All directions exhausted from (r, c) → backtrack
    if (!moved) {
      visited[r][c] = false;
      path.splice(path.length - 2, 2);
      stack.pop();
    }
  }

  return null; // no Hamiltonian path exists
}

/** Entry point for the Solve button. Validates input, then runs the solver. */
function solve() {
  resetAnimation();

  const start = findStart();
  if (!start) {
    setStatus('error', 'Please place a Start cell (◉ Start tool).');
    return;
  }

  totalCells = countNonObstacle();
  if (totalCells < 2) {
    setStatus('error', 'Need at least 2 non-obstacle cells.');
    return;
  }

  // Connectivity pre-check: if the graph is disconnected no path can exist
  if (!isConnected(start[0], start[1])) {
    setStatus('error', 'Grid is disconnected — some cells are unreachable from the start.');
    return;
  }

  setStatus('solving', 'Searching for a Hamiltonian path…');
  document.getElementById('btn-solve').disabled = true;

  /*
   * Yield to the browser briefly so it can repaint the "Searching…" status
   * before the solver blocks the main thread.
   */
  setTimeout(() => {
    const result = findHamiltonianPath(start[0], start[1]);

    if (!result) {
      setStatus('error', 'No Hamiltonian path found. Try removing some obstacles.');
      document.getElementById('btn-solve').disabled = false;
      return;
    }

    solution = result;
    setStatus('solving', 'Path found! Animating…');
    document.getElementById('btn-pause').disabled      = false;
    document.getElementById('btn-step').disabled       = false;
    document.getElementById('btn-reset-anim').disabled = false;
    startAnimation();
  }, 20);
}

// ── Animation ─────────────────────────────────────────────────────────────────

/** Convert the speed slider (1–10) to a millisecond interval. */
function animDelay() {
  return Math.round(640 / Number(document.getElementById('speed').value));
}

/** Begin auto-stepping through the solution. */
function startAnimation() {
  animStep  = 0;
  animTimer = setInterval(() => {
    if (isPaused) return;

    if (animStep >= solution.length) {
      // Path fully drawn
      clearInterval(animTimer);
      animTimer = null;
      setStatus('done', `✓ Complete! All ${totalCells} cells visited.`);
      document.getElementById('btn-pause').disabled = true;
      return;
    }

    drawStep(animStep++);
  }, animDelay());
}

/**
 * Redraw the entire grid, colouring cells according to the solution
 * up to and including `idx`.
 */
function drawStep(idx) {
  const cells = document.getElementById('puzzle-grid').querySelectorAll('.cell');
  const fs    = `${cellFontSize()}px`;

  // Reset all cells to their base grid state
  cells.forEach((cell, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    cell.className   = `cell ${grid[r][c]}`;
    cell.style.fontSize = fs;
    cell.textContent = grid[r][c] === 'start' ? 'G' : '';
  });

  // Paint path cells up to idx
  for (let i = 0; i <= idx; i++) {
    const [pr, pc] = solution[i];
    const cell = cells[pr * COLS + pc];
    cell.style.fontSize = fs;
    cell.textContent    = String(i + 1);

    if (i === idx) {
      // Current head of the path
      cell.className = 'cell current';
    } else if (i === solution.length - 1) {
      // The final cell (shown as finish once the path is complete)
      cell.className = 'cell finish';
    } else {
      cell.className = 'cell visited';
    }
  }

  document.getElementById('status-count').textContent =
    `${idx + 1} / ${totalCells}`;
}

/** Advance the animation by exactly one step (used by the Step button). */
function stepSolve() {
  if (!solution) return;

  // If auto-play is running, stop it first
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
    isPaused  = false;
    document.getElementById('btn-pause').textContent = '⏸ Pause';
  }

  if (animStep < solution.length) {
    drawStep(animStep++);
    if (animStep === solution.length) {
      setStatus('done', `✓ Complete! All ${totalCells} cells visited.`);
      document.getElementById('btn-pause').disabled = true;
    }
  }
}

/** Toggle between paused and playing. */
function togglePause() {
  if (!solution) return;
  isPaused = !isPaused;
  document.getElementById('btn-pause').textContent = isPaused ? '▶ Resume' : '⏸ Pause';

  // If we just resumed and the timer had stopped, restart it
  if (!isPaused && !animTimer && animStep < solution.length) {
    startAnimation();
  }
}

/**
 * Stop any running animation and reset all animation state.
 * Also re-renders the grid in its plain (un-animated) state.
 */
function resetAnimation() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
  isPaused  = false;
  animStep  = 0;
  solution  = null;

  document.getElementById('btn-pause').disabled      = true;
  document.getElementById('btn-pause').textContent   = '⏸ Pause';
  document.getElementById('btn-step').disabled       = true;
  document.getElementById('btn-reset-anim').disabled = true;
  document.getElementById('btn-solve').disabled      = false;
  document.getElementById('status-count').textContent = '';

  // Restore all cells to their grid state
  const cells = document.getElementById('puzzle-grid').querySelectorAll('.cell');
  const fs    = `${cellFontSize()}px`;
  cells.forEach((cell, i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const state = grid[r]?.[c] ?? 'empty';
    cell.className      = `cell ${state}`;
    cell.style.fontSize = fs;
    cell.textContent    = state === 'start' ? 'G' : '';
  });
}

// ── Status bar ────────────────────────────────────────────────────────────────

/**
 * Update the status indicator.
 * @param {'idle'|'solving'|'done'|'error'} state
 * @param {string} msg
 */
function setStatus(state, msg) {
  const dot = document.getElementById('status-dot');
  dot.className = state === 'idle' ? 'status-dot' : `status-dot ${state}`;
  document.getElementById('status-text').textContent = msg;
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadPreset('classic');
