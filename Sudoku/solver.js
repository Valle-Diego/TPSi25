/**
 * solver.js
 * Pure Sudoku solving logic — no DOM dependencies.
 *
 * Exported API (browser globals):
 *   SudokuSolver.solve(grid)   → { solved: bool, grid: number[][] }
 *   SudokuSolver.validate(grid)→ { valid: bool, errors: Set<string> }
 */

const SudokuSolver = (() => {

  /* ── helpers ─────────────────────────────────────── */

  /** Deep-copy a 9×9 grid */
  function clone(grid) {
    return grid.map(row => row.slice());
  }

  /** Return all (row,col) pairs that are empty (value === 0) */
  function emptyCells(grid) {
    const cells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0) cells.push([r, c]);
    return cells;
  }

  /** Check whether `num` can be placed at (row,col) */
  function isValid(grid, row, col, num) {
    // row
    if (grid[row].includes(num)) return false;
    // column
    for (let r = 0; r < 9; r++)
      if (grid[r][col] === num) return false;
    // 3×3 box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (grid[r][c] === num) return false;
    return true;
  }

  /** Return the set of candidates for (row,col) */
  function candidates(grid, row, col) {
    const nums = new Set([1,2,3,4,5,6,7,8,9]);
    // eliminate row
    grid[row].forEach(n => nums.delete(n));
    // eliminate column
    for (let r = 0; r < 9; r++) nums.delete(grid[r][col]);
    // eliminate box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        nums.delete(grid[r][c]);
    return nums;
  }

  /* ── constraint propagation (naked singles) ──────── */

  /**
   * Repeatedly fill cells that have only one candidate.
   * Returns false if a contradiction is reached.
   */
  function propagate(grid) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid[r][c] !== 0) continue;
          const cands = candidates(grid, r, c);
          if (cands.size === 0) return false; // contradiction
          if (cands.size === 1) {
            grid[r][c] = [...cands][0];
            changed = true;
          }
        }
      }
    }
    return true;
  }

  /* ── backtracking solver ─────────────────────────── */

  /**
   * Recursive backtracking with MRV (minimum remaining values)
   * heuristic — always branch on the cell with fewest candidates.
   * Returns true when a solution is found (grid mutated in place).
   */
  function backtrack(grid) {
    // propagate constraints first
    if (!propagate(grid)) return false;

    // find empty cell with fewest candidates (MRV)
    let bestRow = -1, bestCol = -1, bestSize = 10;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const size = candidates(grid, r, c).size;
        if (size < bestSize) {
          bestSize = size;
          bestRow = r;
          bestCol = c;
          if (size === 0) return false; // dead end
        }
      }
    }

    // no empty cells → solved!
    if (bestRow === -1) return true;

    const cands = candidates(grid, bestRow, bestCol);
    for (const num of cands) {
      const snapshot = clone(grid);
      grid[bestRow][bestCol] = num;
      if (backtrack(grid)) return true;
      // restore
      for (let r = 0; r < 9; r++) grid[r] = snapshot[r];
    }

    return false; // no candidate worked
  }

  /* ── public API ──────────────────────────────────── */

  /**
   * Solve a Sudoku puzzle.
   * @param {number[][]} grid  9×9 array; 0 = empty cell
   * @returns {{ solved: boolean, grid: number[][] }}
   */
  function solve(grid) {
    const work = clone(grid);
    const solved = backtrack(work);
    return { solved, grid: work };
  }

  /**
   * Validate the current state of the board (partial or complete).
   * Highlights cells that violate row / column / box uniqueness.
   * @param {number[][]} grid
   * @returns {{ valid: boolean, errors: Set<string> }}
   *   errors contains strings like "r0c3" for each conflicting cell
   */
  function validate(grid) {
    const errors = new Set();

    function check(indices) {
      const seen = {};
      for (const [r, c] of indices) {
        const v = grid[r][c];
        if (v === 0) continue;
        if (seen[v] !== undefined) {
          errors.add(`r${r}c${c}`);
          errors.add(seen[v]);
        } else {
          seen[v] = `r${r}c${c}`;
        }
      }
    }

    // rows
    for (let r = 0; r < 9; r++)
      check([...Array(9)].map((_, c) => [r, c]));
    // columns
    for (let c = 0; c < 9; c++)
      check([...Array(9)].map((_, r) => [r, c]));
    // boxes
    for (let br = 0; br < 3; br++)
      for (let bc = 0; bc < 3; bc++) {
        const cells = [];
        for (let r = br*3; r < br*3+3; r++)
          for (let c = bc*3; c < bc*3+3; c++)
            cells.push([r, c]);
        check(cells);
      }

    return { valid: errors.size === 0, errors };
  }

  return { solve, validate };

})();
