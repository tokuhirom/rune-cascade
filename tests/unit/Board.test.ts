import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../src/core/Board';
import { BOARD_COLS, BOARD_ROWS, RuneType, CellState } from '../../src/core/constants';

function createBoardWithGrid(grid: (RuneType | null)[][]): Board {
  const board = new Board();
  board.grid = grid.map(row => [...row]);
  // Reset cell states
  board.cellState = grid.map(row => row.map(() => CellState.Normal));
  return board;
}

function makeGrid(fill: RuneType = RuneType.Sword): (RuneType | null)[][] {
  // Create a grid with no matches: alternating pattern
  const grid: (RuneType | null)[][] = [];
  const types = [RuneType.Sword, RuneType.Shield, RuneType.Heart, RuneType.Star, RuneType.Gold];
  for (let r = 0; r < BOARD_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < BOARD_COLS; c++) {
      grid[r][c] = types[(r * 2 + c) % 5];
    }
  }
  return grid;
}

describe('Board', () => {
  describe('constructor', () => {
    it('creates a grid with correct dimensions', () => {
      const board = new Board();
      expect(board.grid.length).toBe(BOARD_ROWS);
      for (const row of board.grid) {
        expect(row.length).toBe(BOARD_COLS);
      }
    });

    it('creates a grid with no initial matches', () => {
      const board = new Board();
      const matches = board.findMatches();
      expect(matches.length).toBe(0);
    });

    it('all cells are filled with valid rune types', () => {
      const board = new Board();
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const val = board.grid[r][c];
          expect(val).not.toBeNull();
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThan(5);
        }
      }
    });
  });

  describe('get', () => {
    it('returns null for out of bounds', () => {
      const board = new Board();
      expect(board.get(-1, 0)).toBeNull();
      expect(board.get(0, -1)).toBeNull();
      expect(board.get(BOARD_ROWS, 0)).toBeNull();
      expect(board.get(0, BOARD_COLS)).toBeNull();
    });

    it('returns the rune type at valid position', () => {
      const board = new Board();
      const val = board.get(0, 0);
      expect(val).toBe(board.grid[0][0]);
    });
  });

  describe('swap', () => {
    it('swaps two cells', () => {
      const grid = makeGrid();
      const board = createBoardWithGrid(grid);
      const a = board.grid[0][0];
      const b = board.grid[0][1];
      board.swap(0, 0, 0, 1);
      expect(board.grid[0][0]).toBe(b);
      expect(board.grid[0][1]).toBe(a);
    });
  });

  describe('isAdjacent', () => {
    it('returns true for horizontally adjacent', () => {
      const board = new Board();
      expect(board.isAdjacent(0, 0, 0, 1)).toBe(true);
    });

    it('returns true for vertically adjacent', () => {
      const board = new Board();
      expect(board.isAdjacent(0, 0, 1, 0)).toBe(true);
    });

    it('returns false for diagonal', () => {
      const board = new Board();
      expect(board.isAdjacent(0, 0, 1, 1)).toBe(false);
    });

    it('returns false for same cell', () => {
      const board = new Board();
      expect(board.isAdjacent(0, 0, 0, 0)).toBe(false);
    });

    it('returns false for non-adjacent', () => {
      const board = new Board();
      expect(board.isAdjacent(0, 0, 0, 2)).toBe(false);
    });
  });

  describe('findMatches', () => {
    it('finds horizontal match of 3', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe(RuneType.Gold);
      expect(matches[0].positions.length).toBe(3);
    });

    it('finds horizontal match of 4', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      grid[0][3] = RuneType.Gold;
      // Ensure adjacent cell is different to avoid match of 5
      grid[0][4] = RuneType.Heart;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      expect(matches.length).toBe(1);
      expect(matches[0].positions.length).toBe(4);
    });

    it('finds vertical match of 3', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Star;
      grid[1][0] = RuneType.Star;
      grid[2][0] = RuneType.Star;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe(RuneType.Star);
      expect(matches[0].positions.length).toBe(3);
    });

    it('finds multiple separate matches', () => {
      const grid = makeGrid();
      // Horizontal match at row 0
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      // Vertical match at col 6
      grid[3][6] = RuneType.Heart;
      grid[4][6] = RuneType.Heart;
      grid[5][6] = RuneType.Heart;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      expect(matches.length).toBe(2);
    });

    it('returns no matches when there are none', () => {
      const grid = makeGrid();
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      expect(matches.length).toBe(0);
    });

    it('does not match null cells', () => {
      const grid = makeGrid();
      grid[0][0] = null;
      grid[0][1] = null;
      grid[0][2] = null;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      // Should not match the nulls
      const nullMatches = matches.filter(m => m.positions.some(([r, c]) => r === 0 && c <= 2));
      expect(nullMatches.length).toBe(0);
    });

    it('handles cross/T-shape matches (horizontal + vertical overlap)', () => {
      const grid = makeGrid();
      // Horizontal: row 2, cols 0-2
      grid[2][0] = RuneType.Sword;
      grid[2][1] = RuneType.Sword;
      grid[2][2] = RuneType.Sword;
      // Vertical: rows 0-4, col 1
      grid[0][1] = RuneType.Sword;
      grid[1][1] = RuneType.Sword;
      // grid[2][1] already set
      grid[3][1] = RuneType.Sword;
      grid[4][1] = RuneType.Sword;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();

      // Collect all matched positions
      const allPositions = new Set<string>();
      for (const m of matches) {
        for (const [r, c] of m.positions) {
          allPositions.add(`${r},${c}`);
        }
      }
      // All 7 unique cells should be matched
      expect(allPositions.size).toBe(7);
    });

    it('does not produce empty match results', () => {
      const grid = makeGrid();
      // Create overlapping horizontal and vertical
      grid[0][0] = RuneType.Sword;
      grid[0][1] = RuneType.Sword;
      grid[0][2] = RuneType.Sword;
      grid[1][0] = RuneType.Sword;
      grid[2][0] = RuneType.Sword;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      for (const m of matches) {
        expect(m.positions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('removeMatches', () => {
    it('sets matched positions to null', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      const matches = board.findMatches();
      board.removeMatches(matches);
      expect(board.grid[0][0]).toBeNull();
      expect(board.grid[0][1]).toBeNull();
      expect(board.grid[0][2]).toBeNull();
    });
  });

  describe('applyGravity', () => {
    it('drops runes down to fill gaps', () => {
      const grid = makeGrid();
      const topVal = grid[0][0];
      grid[1][0] = null;
      const board = createBoardWithGrid(grid);
      board.applyGravity();
      // The rune from row 0 should have dropped to row 1
      expect(board.grid[1][0]).toBe(topVal);
      // Row 0 should be filled with a new rune
      expect(board.grid[0][0]).not.toBeNull();
    });

    it('fills all null cells after gravity', () => {
      const grid = makeGrid();
      grid[0][3] = null;
      grid[1][3] = null;
      grid[2][3] = null;
      const board = createBoardWithGrid(grid);
      board.applyGravity();
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          expect(board.grid[r][c]).not.toBeNull();
        }
      }
    });

    it('returns drop info for all affected cells', () => {
      const grid = makeGrid();
      grid[5][0] = null;
      const board = createBoardWithGrid(grid);
      const drops = board.applyGravity();
      // Should have drops for column 0 at minimum
      const col0Drops = drops.filter(d => d.col === 0);
      expect(col0Drops.length).toBeGreaterThan(0);
    });

    it('includes stationary runes in drops for animation', () => {
      // animateDrops destroys ALL sprites then recreates from drops,
      // so applyGravity must return entries for ALL runes including stationary ones
      const grid = makeGrid();
      // Remove middle cell - runes below it don't move
      grid[3][0] = null;
      const board = createBoardWithGrid(grid);
      const drops = board.applyGravity();

      const col0Drops = drops.filter(d => d.col === 0);
      const coveredRows = new Set(col0Drops.map(d => d.toRow));
      // Every row in col 0 must have a drop entry (including stationary rows 4-6)
      expect(coveredRows.size).toBe(BOARD_ROWS);
    });

    it('preserves order of non-null runes', () => {
      const grid = makeGrid();
      const originalOrder = [grid[0][2], grid[2][2], grid[4][2], grid[6][2]];
      grid[1][2] = null;
      grid[3][2] = null;
      grid[5][2] = null;
      const board = createBoardWithGrid(grid);
      board.applyGravity();
      // Original runes should be at bottom, in order
      expect(board.grid[6][2]).toBe(originalOrder[3]);
      expect(board.grid[5][2]).toBe(originalOrder[2]);
      expect(board.grid[4][2]).toBe(originalOrder[1]);
      expect(board.grid[3][2]).toBe(originalOrder[0]);
    });
  });

  describe('special cell states', () => {
    it('frozen cells are not matchable', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[0][1] = CellState.Frozen;
      const matches = board.findMatches();
      // Should not find a match because middle cell is frozen
      const goldMatches = matches.filter(m => m.type === RuneType.Gold && m.positions.some(([r]) => r === 0));
      expect(goldMatches.length).toBe(0);
    });

    it('obstacle cells are not matchable', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[0][0] = CellState.Obstacle;
      board.grid[0][0] = null;
      const matches = board.findMatches();
      const goldMatches = matches.filter(m => m.type === RuneType.Gold && m.positions.some(([r]) => r === 0));
      expect(goldMatches.length).toBe(0);
    });

    it('rowClear cells can be matched', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[0][1] = CellState.RowClear;
      const matches = board.findMatches();
      expect(matches.length).toBeGreaterThan(0);
    });

    it('canSwap returns false for frozen cells', () => {
      const board = new Board();
      board.cellState[0][0] = CellState.Frozen;
      expect(board.canSwap(0, 0)).toBe(false);
    });

    it('canSwap returns false for obstacle cells', () => {
      const board = new Board();
      board.cellState[0][0] = CellState.Obstacle;
      expect(board.canSwap(0, 0)).toBe(false);
    });

    it('getAdjacentSpecials thaws frozen cells adjacent to matches', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[1][1] = CellState.Frozen;
      const matches = board.findMatches();
      const { thawed } = board.getAdjacentSpecials(matches);
      expect(thawed.length).toBe(1);
      expect(thawed[0]).toEqual([1, 1]);
      expect(board.cellState[1][1]).toBe(CellState.Normal);
    });

    it('getAdjacentSpecials destroys obstacles adjacent to matches', () => {
      const grid = makeGrid();
      grid[0][0] = RuneType.Gold;
      grid[0][1] = RuneType.Gold;
      grid[0][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[1][0] = CellState.Obstacle;
      board.grid[1][0] = null;
      const matches = board.findMatches();
      const { destroyedObstacles } = board.getAdjacentSpecials(matches);
      expect(destroyedObstacles.length).toBe(1);
      expect(board.cellState[1][0]).toBe(CellState.Normal);
    });

    it('freezeRunes places frozen state on normal cells', () => {
      const board = new Board();
      const frozen = board.freezeRunes(3);
      expect(frozen.length).toBe(3);
      for (const [r, c] of frozen) {
        expect(board.cellState[r][c]).toBe(CellState.Frozen);
      }
    });

    it('placeObstacles replaces runes with obstacles', () => {
      const board = new Board();
      const placed = board.placeObstacles(2);
      expect(placed.length).toBe(2);
      for (const [r, c] of placed) {
        expect(board.cellState[r][c]).toBe(CellState.Obstacle);
        expect(board.grid[r][c]).toBeNull();
      }
    });

    it('placeRowClear marks one cell as RowClear', () => {
      const board = new Board();
      const pos = board.placeRowClear();
      expect(pos).not.toBeNull();
      if (pos) {
        expect(board.cellState[pos[0]][pos[1]]).toBe(CellState.RowClear);
      }
    });

    it('getRowClearRows returns rows with RowClear cells in matches', () => {
      const grid = makeGrid();
      grid[3][0] = RuneType.Gold;
      grid[3][1] = RuneType.Gold;
      grid[3][2] = RuneType.Gold;
      const board = createBoardWithGrid(grid);
      board.cellState[3][1] = CellState.RowClear;
      const matches = board.findMatches();
      const rows = board.getRowClearRows(matches);
      expect(rows).toContain(3);
    });

    it('clearRows clears all cells in specified rows', () => {
      const board = new Board();
      const cleared = board.clearRows([2]);
      expect(cleared.length).toBe(BOARD_COLS);
      for (let c = 0; c < BOARD_COLS; c++) {
        expect(board.grid[2][c]).toBeNull();
      }
    });

    it('swap also swaps cell states', () => {
      const board = new Board();
      board.cellState[0][0] = CellState.RowClear;
      board.cellState[0][1] = CellState.Normal;
      board.swap(0, 0, 0, 1);
      expect(board.cellState[0][0]).toBe(CellState.Normal);
      expect(board.cellState[0][1]).toBe(CellState.RowClear);
    });
  });

  describe('full match-remove-gravity cycle', () => {
    it('produces a valid board after cycle', () => {
      const board = new Board();
      // Force a match
      const type = RuneType.Heart;
      board.grid[6][0] = type;
      board.grid[6][1] = type;
      board.grid[6][2] = type;

      const matches = board.findMatches();
      expect(matches.length).toBeGreaterThan(0);

      board.removeMatches(matches);
      board.applyGravity();

      // Board should be fully filled
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          expect(board.grid[r][c]).not.toBeNull();
        }
      }
    });
  });
});
