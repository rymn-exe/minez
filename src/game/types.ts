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
  MegaMine = 'MegaMine',
  BloodDiamond = 'BloodDiamond',
  FindersFee = 'FindersFee',
  ATMFee = 'ATMFee',
  Coal = 'Coal',
  BoxingDay = 'BoxingDay',
  Thief = 'Thief',
  Jackhammer = 'Jackhammer',
  DonationBox = 'DonationBox',
  Appraisal = 'Appraisal',
  Key = 'Key'
}

export interface Tile {
  pos: Position;
  kind: TileKind;
  revealed: boolean;
  flagged: boolean;
  // Color of the flag when flagged was set; keeps historical color regardless of later selection changes
  flagColor?: 'white' | 'yellow' | 'blue';
  number: number;
  subId?: string; // Shop or Challenge specific id
  compassDir?: '↑' | '↓' | '←' | '→';
  // Visual masking properties (for UI rendering only, doesn't affect game logic)
  mathMasked?: boolean; // Math Test: numbers >1 show as '?'
  randomMasked?: boolean; // Random 20% chance to show number as '?'
  // If set, UI should animate a transform (flash old state, then swap to this new display)
  pendingTransform?: 'Quartz' | 'Ore' | 'Diamond' | 'MegaMine';
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


