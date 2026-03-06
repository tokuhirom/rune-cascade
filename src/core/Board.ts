import { BOARD_COLS, BOARD_ROWS, RUNE_COUNT, RuneType, CellState } from './constants';

export interface MatchResult {
  positions: [number, number][];
  type: RuneType;
}

export class Board {
  grid: (RuneType | null)[][];
  cellState: CellState[][];

  constructor() {
    this.grid = [];
    this.cellState = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      this.grid[r] = [];
      this.cellState[r] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        this.grid[r][c] = this.randomRune();
        this.cellState[r][c] = CellState.Normal;
      }
    }
    // Remove initial matches
    let initialMatches = this.findMatches();
    while (initialMatches.length > 0) {
      for (const match of initialMatches) {
        for (const [r, c] of match.positions) {
          this.grid[r][c] = this.randomRune();
        }
      }
      initialMatches = this.findMatches();
    }
  }

  randomRune(): RuneType {
    return Math.floor(Math.random() * RUNE_COUNT) as RuneType;
  }

  get(r: number, c: number): RuneType | null {
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return null;
    return this.grid[r][c];
  }

  getState(r: number, c: number): CellState {
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return CellState.Normal;
    return this.cellState[r][c];
  }

  isMatchable(r: number, c: number): boolean {
    const state = this.getState(r, c);
    return state === CellState.Normal || state === CellState.RowClear;
  }

  swap(r1: number, c1: number, r2: number, c2: number): void {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    // Swap cell states too
    const tempState = this.cellState[r1][c1];
    this.cellState[r1][c1] = this.cellState[r2][c2];
    this.cellState[r2][c2] = tempState;
  }

  canSwap(r: number, c: number): boolean {
    const state = this.getState(r, c);
    return state !== CellState.Frozen && state !== CellState.Obstacle;
  }

  isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  findMatches(): MatchResult[] {
    const matched = new Set<string>();
    const results: MatchResult[] = [];

    // Horizontal matches
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c <= BOARD_COLS - 3; c++) {
        const t = this.grid[r][c];
        if (t === null || !this.isMatchable(r, c)) continue;
        if (this.grid[r][c + 1] === t && this.isMatchable(r, c + 1) &&
            this.grid[r][c + 2] === t && this.isMatchable(r, c + 2)) {
          const positions: [number, number][] = [];
          let end = c;
          while (end < BOARD_COLS && this.grid[r][end] === t && this.isMatchable(r, end)) {
            positions.push([r, end]);
            matched.add(`${r},${end}`);
            end++;
          }
          results.push({ positions, type: t });
          c = end - 1;
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < BOARD_COLS; c++) {
      for (let r = 0; r <= BOARD_ROWS - 3; r++) {
        const t = this.grid[r][c];
        if (t === null || !this.isMatchable(r, c)) continue;
        if (this.grid[r + 1][c] === t && this.isMatchable(r + 1, c) &&
            this.grid[r + 2][c] === t && this.isMatchable(r + 2, c)) {
          const positions: [number, number][] = [];
          let end = r;
          while (end < BOARD_ROWS && this.grid[end][c] === t && this.isMatchable(end, c)) {
            if (!matched.has(`${end},${c}`)) {
              positions.push([end, c]);
              matched.add(`${end},${c}`);
            }
            end++;
          }
          if (positions.length > 0) {
            results.push({ positions, type: t });
          }
          r = end - 1;
        }
      }
    }

    return results;
  }

  removeMatches(matches: MatchResult[]): void {
    for (const match of matches) {
      for (const [r, c] of match.positions) {
        this.grid[r][c] = null;
        this.cellState[r][c] = CellState.Normal;
      }
    }
  }

  // Find cells adjacent to matched positions that have special states
  getAdjacentSpecials(matches: MatchResult[]): { thawed: [number, number][]; destroyedObstacles: [number, number][] } {
    const matchedSet = new Set<string>();
    for (const match of matches) {
      for (const [r, c] of match.positions) {
        matchedSet.add(`${r},${c}`);
      }
    }

    const thawed: [number, number][] = [];
    const destroyedObstacles: [number, number][] = [];
    const checked = new Set<string>();

    for (const match of matches) {
      for (const [r, c] of match.positions) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr;
          const nc = c + dc;
          const key = `${nr},${nc}`;
          if (checked.has(key) || matchedSet.has(key)) continue;
          checked.add(key);
          if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue;

          const state = this.cellState[nr][nc];
          if (state === CellState.Frozen) {
            this.cellState[nr][nc] = CellState.Normal;
            thawed.push([nr, nc]);
          } else if (state === CellState.Obstacle) {
            this.cellState[nr][nc] = CellState.Normal;
            this.grid[nr][nc] = null;
            destroyedObstacles.push([nr, nc]);
          }
        }
      }
    }

    return { thawed, destroyedObstacles };
  }

  // Find row-clear cells in matches and return their rows
  getRowClearRows(matches: MatchResult[]): number[] {
    const rows = new Set<number>();
    for (const match of matches) {
      for (const [r, c] of match.positions) {
        if (this.cellState[r][c] === CellState.RowClear) {
          rows.add(r);
        }
      }
    }
    return [...rows];
  }

  // Clear entire rows, returning positions cleared
  clearRows(rows: number[]): [number, number][] {
    const cleared: [number, number][] = [];
    for (const r of rows) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.grid[r][c] !== null) {
          cleared.push([r, c]);
          this.grid[r][c] = null;
          this.cellState[r][c] = CellState.Normal;
        }
      }
    }
    return cleared;
  }

  // Place random obstacles on the board
  placeObstacles(count: number): [number, number][] {
    const placed: [number, number][] = [];
    const candidates: [number, number][] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.grid[r][c] !== null && this.cellState[r][c] === CellState.Normal) {
          candidates.push([r, c]);
        }
      }
    }
    candidates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const [r, c] = candidates[i];
      this.cellState[r][c] = CellState.Obstacle;
      this.grid[r][c] = null; // Obstacles replace the rune
      placed.push([r, c]);
    }
    return placed;
  }

  // Freeze random runes on the board
  freezeRunes(count: number): [number, number][] {
    const frozen: [number, number][] = [];
    const candidates: [number, number][] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.grid[r][c] !== null && this.cellState[r][c] === CellState.Normal) {
          candidates.push([r, c]);
        }
      }
    }
    candidates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const [r, c] = candidates[i];
      this.cellState[r][c] = CellState.Frozen;
      frozen.push([r, c]);
    }
    return frozen;
  }

  // Place a row-clear rune at a random normal position
  placeRowClear(): [number, number] | null {
    const candidates: [number, number][] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.grid[r][c] !== null && this.cellState[r][c] === CellState.Normal) {
          candidates.push([r, c]);
        }
      }
    }
    if (candidates.length === 0) return null;
    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    this.cellState[r][c] = CellState.RowClear;
    return [r, c];
  }

  // Returns array of {col, fromRow, toRow} for animations.
  // Includes ALL runes (moved, stationary, and new) so animateDrops can rebuild all sprites.
  applyGravity(): { col: number; fromRow: number; toRow: number; type: RuneType; state: CellState }[] {
    const drops: { col: number; fromRow: number; toRow: number; type: RuneType; state: CellState }[] = [];

    for (let c = 0; c < BOARD_COLS; c++) {
      let writePos = BOARD_ROWS - 1;
      for (let r = BOARD_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== writePos) {
            drops.push({ col: c, fromRow: r, toRow: writePos, type: this.grid[r][c]!, state: this.cellState[r][c] });
            this.grid[writePos][c] = this.grid[r][c];
            this.cellState[writePos][c] = this.cellState[r][c];
            this.grid[r][c] = null;
            this.cellState[r][c] = CellState.Normal;
          } else {
            // Stationary rune: still include in drops so sprites are rebuilt
            drops.push({ col: c, fromRow: r, toRow: r, type: this.grid[r][c]!, state: this.cellState[r][c] });
          }
          writePos--;
        }
      }
      // Fill empty spaces at top with new runes
      for (let r = writePos; r >= 0; r--) {
        const newType = this.randomRune();
        this.grid[r][c] = newType;
        this.cellState[r][c] = CellState.Normal;
        drops.push({ col: c, fromRow: r - (writePos + 1), toRow: r, type: newType, state: CellState.Normal });
      }
    }

    return drops;
  }
}
