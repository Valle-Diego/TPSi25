/**
 * app.js
 * DOM controller for the Sudoku Solver.
 * Depends on: SudokuSolver (solver.js)
 */

(() => {

  /* ── Example puzzle (0 = empty) ───────────────────── */
  const EXAMPLE = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],

    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],

    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
  ];

  /* ── State ─────────────────────────────────────────── */
  const cells  = [];   // flat array [81] of <input> elements
  let   givenMask = new Array(81).fill(false);  // which cells were user-entered

  /* ── Build grid ────────────────────────────────────── */
  const board = document.getElementById('board');

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.className = 'cell';
      input.setAttribute('data-row', r);
      input.setAttribute('data-col', c);
      input.setAttribute('aria-label', `Row ${r+1} Column ${c+1}`);

      input.addEventListener('keydown',  onKeyDown);
      input.addEventListener('input',    onInput);
      input.addEventListener('focus',    onFocus);

      board.appendChild(input);
      cells.push(input);
    }
  }

  /* ── Helpers ───────────────────────────────────────── */

  function idx(r, c) { return r * 9 + c; }

  function getGrid() {
    return Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => {
        const v = parseInt(cells[idx(r,c)].value, 10);
        return Number.isInteger(v) && v >= 1 && v <= 9 ? v : 0;
      })
    );
  }

  function setGrid(grid, solvedMask) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const i = idx(r, c);
        const cell = cells[i];
        const v = grid[r][c];
        cell.value = v === 0 ? '' : v;
        // mark as solved (animated) only if not given
        if (solvedMask && solvedMask[i] && !givenMask[i]) {
          cell.classList.add('solved');
          cell.readOnly = true;
        }
      }
    }
  }

  function clearClasses() {
    cells.forEach(c => c.classList.remove('solved', 'error'));
  }

  function markGivens() {
    cells.forEach((cell, i) => {
      const hasValue = cell.value.trim() !== '';
      givenMask[i] = hasValue;
      cell.classList.toggle('given', hasValue);
      cell.readOnly = hasValue;
    });
  }

  function showStatus(msg, type = 'info') {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = `status show ${type}`;
    clearTimeout(el._timer);
    if (type !== 'failure') {
      el._timer = setTimeout(() => el.classList.remove('show'), 3500);
    }
  }

  /* ── Staggered animation for solved cells ───────────── */
  function animateSolved(solvedMask) {
    // collect solved indices and animate with increasing delay
    const solvedIndices = solvedMask
      .map((s, i) => s ? i : -1)
      .filter(i => i !== -1);

    solvedIndices.forEach((i, order) => {
      cells[i].style.animationDelay = `${order * 12}ms`;
    });
  }

  /* ── Event handlers ─────────────────────────────────── */

  function onInput(e) {
    const cell = e.target;
    // keep only digits 1-9
    const val = cell.value.replace(/[^1-9]/g, '').slice(-1);
    cell.value = val;
    clearClasses();
    // remove given style if user clears a cell
    const i = parseInt(cell.dataset.row) * 9 + parseInt(cell.dataset.col);
    if (val === '') {
      givenMask[i] = false;
      cell.classList.remove('given');
      cell.readOnly = false;
    }
    validateLive();
  }

  function onKeyDown(e) {
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    let nr = r, nc = c;

    switch (e.key) {
      case 'ArrowUp':    nr = (r + 8) % 9;          break;
      case 'ArrowDown':  nr = (r + 1) % 9;           break;
      case 'ArrowLeft':  nc = (c + 8) % 9;          break;
      case 'ArrowRight': nc = (c + 1) % 9;           break;
      case 'Backspace':
      case 'Delete':
        e.target.value = '';
        onInput({ target: e.target });
        return;
      case 'Enter':
        document.getElementById('btn-solve').click();
        return;
      default: return;
    }

    e.preventDefault();
    cells[idx(nr, nc)].focus();
  }

  function onFocus(e) {
    // soft-highlight row and column (visual aid)
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    cells.forEach(cell => {
      const cr = parseInt(cell.dataset.row);
      const cc = parseInt(cell.dataset.col);
      cell.style.background = (cr === r || cc === c) && !(cr === r && cc === c)
        ? 'var(--surface2)'
        : '';
    });
  }

  function validateLive() {
    const grid = getGrid();
    const { errors } = SudokuSolver.validate(grid);
    cells.forEach((cell, i) => {
      const r = Math.floor(i / 9), c = i % 9;
      if (errors.has(`r${r}c${c}`) && cell.value !== '')
        cell.classList.add('error');
      else
        cell.classList.remove('error');
    });
  }

  /* ── Button actions ─────────────────────────────────── */

  document.getElementById('btn-solve').addEventListener('click', () => {
    clearClasses();
    markGivens();

    const grid = getGrid();
    const { valid, errors } = SudokuSolver.validate(grid);

    if (!valid) {
      // highlight errors
      errors.forEach(key => {
        const [, r,, c] = key.match(/r(\d)c(\d)/);
        cells[idx(+r, +c)].classList.add('error');
      });
      showStatus('Conflicts detected — fix highlighted cells.', 'failure');
      return;
    }

    const before = grid.map(row => row.slice());
    const { solved, grid: result } = SudokuSolver.solve(grid);

    if (!solved) {
      showStatus('No solution exists for this puzzle.', 'failure');
      return;
    }

    // build mask of which cells were solved (not given, were 0)
    const solvedMask = new Array(81).fill(false);
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (before[r][c] === 0) solvedMask[idx(r, c)] = true;

    animateSolved(solvedMask);
    setGrid(result, solvedMask);
    showStatus('Puzzle solved!', 'success');
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    cells.forEach(cell => {
      cell.value = '';
      cell.readOnly = false;
      cell.style.background = '';
      cell.style.animationDelay = '';
    });
    givenMask.fill(false);
    clearClasses();
    cells.forEach(c => c.classList.remove('given'));
    const el = document.getElementById('status');
    el.className = 'status';
    el.textContent = '';
  });

  document.getElementById('btn-example').addEventListener('click', () => {
    // first clear
    document.getElementById('btn-clear').click();

    // fill example
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const v = EXAMPLE[r][c];
        const cell = cells[idx(r, c)];
        if (v !== 0) {
          cell.value = v;
          cell.classList.add('given');
          cell.readOnly = true;
          givenMask[idx(r,c)] = true;
        }
      }
    showStatus('Example puzzle loaded — press Solve.', 'info');
  });

  /* ── Remove highlight on board blur ─────────────────── */
  board.addEventListener('focusout', e => {
    if (!board.contains(e.relatedTarget)) {
      cells.forEach(cell => (cell.style.background = ''));
    }
  });

})();
