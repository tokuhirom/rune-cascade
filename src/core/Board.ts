import { BOARD_COLS, BOARD_ROWS, RUNE_COUNT, RuneType } from './constants';

export interface MatchResult {
  positions: [number, number][];
  type: RuneType;
}

export class Board {
  grid: (RuneType | null)[][];

  constructor() {
    this.grid = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        this.grid[r][c] = this.randomRune();
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

  swap(r1: number, c1: number, r2: number, c2: number): void {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
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
        if (t === null) continue;
        if (this.grid[r][c + 1] === t && this.grid[r][c + 2] === t) {
          const positions: [number, number][] = [];
          let end = c;
          while (end < BOARD_COLS && this.grid[r][end] === t) {
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
        if (t === null) continue;
        if (this.grid[r + 1][c] === t && this.grid[r + 2][c] === t) {
          const positions: [number, number][] = [];
          let end = r;
          while (end < BOARD_ROWS && this.grid[end][c] === t) {
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
      }
    }
  }

  // Returns array of {col, fromRow, toRow} for animations.
  // Includes ALL runes (moved, stationary, and new) so animateDrops can rebuild all sprites.
  applyGravity(): { col: number; fromRow: number; toRow: number; type: RuneType }[] {
    const drops: { col: number; fromRow: number; toRow: number; type: RuneType }[] = [];

    for (let c = 0; c < BOARD_COLS; c++) {
      let writePos = BOARD_ROWS - 1;
      for (let r = BOARD_ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== writePos) {
            drops.push({ col: c, fromRow: r, toRow: writePos, type: this.grid[r][c]! });
            this.grid[writePos][c] = this.grid[r][c];
            this.grid[r][c] = null;
          } else {
            // Stationary rune: still include in drops so sprites are rebuilt
            drops.push({ col: c, fromRow: r, toRow: r, type: this.grid[r][c]! });
          }
          writePos--;
        }
      }
      // Fill empty spaces at top with new runes
      for (let r = writePos; r >= 0; r--) {
        const newType = this.randomRune();
        this.grid[r][c] = newType;
        drops.push({ col: c, fromRow: r - (writePos + 1), toRow: r, type: newType });
      }
    }

    return drops;
  }
}
