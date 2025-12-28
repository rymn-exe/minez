export type Position = { x: number; y: number };

export enum TileKind {
  Hidden = 'Hidden',
  Safe = 'Safe',
  Number = 'Number',
  Mine = 'Mine',
  X = 'X',
  Ore = 'Ore',
  Shop = 'Shop',
  Challenge = 'Challenge'
}

export enum ChallengeId {
  AutoGrat = 'AutoGrat',
  Stopwatch = 'Stopwatch',
  MathTest = 'MathTest',
  BadDeal = 'BadDeal',
  Clover2 = 'Clover2',
  SnakeOil = 'SnakeOil',
  SnakeVenom = 'SnakeVenom',
  BloodPact = 'BloodPact',
  CarLoan = 'CarLoan',
  MegaMine = 'MegaMine'
}

export interface Tile {
  pos: Position;
  kind: TileKind;
  revealed: boolean;
  flagged: boolean;
  number: number;
  subId?: string; // Shop or Challenge specific id
  compassDir?: '↑' | '↓' | '←' | '→';
}

export interface Board {
  width: number;
  height: number;
  tiles: Tile[];
}

export function indexAt(board: Board, x: number, y: number): number {
  return y * board.width + x;
}
export function inBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.width && y < board.height;
}
export function neighbors(board: Board, x: number, y: number): Position[] {
  const out: Position[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (inBounds(board, nx, ny)) out.push({ x: nx, y: ny });
    }
  }
  return out;
}


