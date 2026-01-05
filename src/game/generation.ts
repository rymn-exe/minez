// Board generation:
//  - Creates the truth board for a level (no rendering here)
//  - Applies relic modifiers (Diffuser, Entrepreneur)
//  - Places drafted challenge tiles from the run's pool (guarantee 1 spawn per drafted challenge, then weighted rolls)
//  - Spawns shop tiles probabilistically from owned pool (with Accountant bonus)
//  - Guarantees one ❤️ 1Up per level
import { Board, Tile, TileKind, ChallengeId, indexAt } from './types';
import { LEVEL_SPECS } from './levelConfig';
import { createRng, rngInt, pickRandom } from './rng';
import { runState } from '../state';
import { SHOP_SPAWN_CAP_PER_LEVEL, SHOP_BASE_SPAWN_CHANCE } from './consts';

type SpawnBand = 'Low' | 'Medium' | 'High' | 'VeryHigh';
const SPAWN_TARGET: Record<SpawnBand, number> = {
  Low: 2,
  Medium: 4,
  High: 7,
  VeryHigh: 10
};

// Challenge spawn tuning (player-drafted pool):
// Each drafted challenge spawns stochastically with an expected count per stack.
// We implement a binomial roll with p=0.5 and N=2*target per stack, so E[count]=target per stack.
// Additionally, any drafted challenge is guaranteed to spawn at least once per level.
const CHALLENGE_SPAWN_BAND: Record<string, SpawnBand> = {
  [ChallengeId.AutoGrat]: 'High',
  [ChallengeId.MathTest]: 'Low',
  [ChallengeId.BadDeal]: 'Low',
  [ChallengeId.Clover2]: 'High',
  [ChallengeId.SnakeOil]: 'Medium',
  [ChallengeId.SnakeVenom]: 'Medium',
  [ChallengeId.BloodPact]: 'High',
  [ChallengeId.CarLoan]: 'Medium',
  [ChallengeId.MegaMine]: 'Medium',
  [ChallengeId.BloodDiamond]: 'Low',
  [ChallengeId.FindersFee]: 'High',
  [ChallengeId.ATMFee]: 'Medium',
  [ChallengeId.BoxingDay]: 'Medium',
  [ChallengeId.Stopwatch]: 'Medium',
  [ChallengeId.Thief]: 'Medium',
  [ChallengeId.Jackhammer]: 'High',
  [ChallengeId.DonationBox]: 'High',
  [ChallengeId.Appraisal]: 'High',
  [ChallengeId.Key]: 'Medium'
  // Coal intentionally excluded
};

/** Returned by `generateLevel` to the Scene to build the visual board. */
interface GenerationResult {
  board: Board;
}

function emptyBoard(width: number, height: number): Board {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        pos: { x, y },
        kind: TileKind.Hidden,
        revealed: false,
        flagged: false,
        number: 0
      });
    }
  }
  return { width, height, tiles };
}

function placeRandomTiles(board: Board, count: number, kind: TileKind, subId?: string, rand?: () => number): void {
  let placed = 0;
  const random = rand ?? Math.random;
  const freeIndices = board.tiles.map((_, i) => i);
  // naive; will be fine for 16x16
  while (placed < count && freeIndices.length > 0) {
    const idx = Math.floor(random() * freeIndices.length);
    const at = freeIndices.splice(idx, 1)[0];
    if (board.tiles[at].kind === TileKind.Hidden) {
      board.tiles[at].kind = kind;
      if (subId) board.tiles[at].subId = subId;
      placed++;
    }
  }
}

function countAdjMines(board: Board, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
      const t = board.tiles[indexAt(board, nx, ny)];
      if (t.kind === TileKind.Mine) n++;
      if (t.kind === TileKind.Challenge && (t.subId === ChallengeId.Clover2 || t.subId === ChallengeId.MegaMine)) n++;
    }
  }
  return n;
}

// Helper: try to bias special placement near at least one mine to reduce “orphan 1‑tile tells”.
function placeSpecialNearMine(board: Board, count: number, kind: TileKind, subId: string, rand: () => number): void {
  const candidates: number[] = [];
  for (let i = 0; i < board.tiles.length; i++) {
    const t = board.tiles[i];
    if (t.kind !== TileKind.Hidden) continue;
    const x = t.pos.x, y = t.pos.y;
    let adjMine = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
        const nt = board.tiles[indexAt(board, nx, ny)];
        if (nt.kind === TileKind.Mine) adjMine++;
      }
    }
    // Require at least 2 adjacent mines to reduce single‑cell tells
    if (adjMine >= 2) candidates.push(i);
  }
  let placed = 0;
  while (placed < count && candidates.length > 0) {
    const idx = Math.floor(rand() * candidates.length);
    const at = candidates.splice(idx, 1)[0];
    if (board.tiles[at].kind === TileKind.Hidden) {
      board.tiles[at].kind = kind;
      board.tiles[at].subId = subId;
      placed++;
    }
  }
  if (placed < count) {
    placeRandomTiles(board, count - placed, kind, subId, rand);
  }
}

export function generateLevel(width: number, height: number): GenerationResult {
  const levelSpec = LEVEL_SPECS.find(l => l.level === runState.level)!;
  const rand = createRng(runState.seed + runState.level);
  const board = emptyBoard(width, height);

  // Apply relic modifiers that affect counts
  const diffuserCount = runState.ownedRelics['Diffuser'] ?? 0;
  const entrepreneurCount = runState.ownedRelics['Entrepreneur'] ?? 0;

  // Apply global mine reduction (−25%) before relic modifiers
  const baseMines = Math.floor(levelSpec.mines * 0.75);
  const mines = Math.max(0, baseMines - diffuserCount * 5);
  const ore = levelSpec.ore + entrepreneurCount;
  const xTiles = levelSpec.xTiles;

  // Place core tiles
  placeRandomTiles(board, xTiles, TileKind.X, undefined, rand);
  placeRandomTiles(board, mines, TileKind.Mine, undefined, rand);
  placeRandomTiles(board, ore, TileKind.Ore, undefined, rand);

  // Place drafted challenge tiles from run pool.
  // - Level 1 starts with an empty pool (no challenges).
  // - Any drafted challenge spawns at least once per level.
  // - Additional copies are rolled per extra stack.
  const draftedEntries = Object.entries(runState.ownedChallenges || {}).filter(([, n]) => (n ?? 0) > 0);
  for (const [id, nRaw] of draftedEntries) {
    const n = Number(nRaw) || 0;
    if (n <= 0) continue;
    if (id === String(ChallengeId.Coal)) continue; // never spawn Coal via drafting
    const band = CHALLENGE_SPAWN_BAND[id];
    if (!band) continue;
    const target = SPAWN_TARGET[band];
    const p = 0.5;
    const trialsPerStack = Math.max(1, Math.floor(target * 2));
    let spawnedForThis = 0;
    for (let s = 0; s < n; s++) {
      for (let t = 0; t < trialsPerStack; t++) {
        if (rand() < p) {
          placeSpecialNearMine(board, 1, TileKind.Challenge, id, rand);
          spawnedForThis++;
        }
      }
    }
    // Guarantee at least one spawn per drafted challenge per level
    if (spawnedForThis === 0) {
      placeSpecialNearMine(board, 1, TileKind.Challenge, id, rand);
    }
  }

  // Place shop tiles from owned pool (no per‑level cap)
  const ownedIds = Object.keys(runState.ownedShopTiles);
  let spawned = 0;
  const accountantStacks = runState.ownedRelics['Accountant'] ?? 0;
  const bonus = Math.min(0.4, 0.01 * accountantStacks); // cap +40%
  const chance = Math.min(0.95, SHOP_BASE_SPAWN_CHANCE + bonus);
  for (const id of ownedIds) {
    const weight = runState.ownedShopTiles[id];
    for (let i = 0; i < weight; i++) {
      if (rand() < chance) {
        placeSpecialNearMine(board, 1, TileKind.Shop, id, rand);
        spawned++;
      }
    }
  }
  // Ensure at least one ❤️ 1Up shop tile per level (design request)
  const hasOneUp = board.tiles.some(t => t.kind === TileKind.Shop && t.subId === '1Up');
  if (!hasOneUp) {
    placeSpecialNearMine(board, 1, TileKind.Shop, '1Up', rand);
  }

  // Set numbers for remaining hidden -> numbers/safe
  for (const tile of board.tiles) {
    if (tile.kind === TileKind.Hidden) {
      // compute number
      const n = countAdjMines(board, tile.pos.x, tile.pos.y);
      tile.number = n;
      tile.kind = n === 0 ? TileKind.Safe : TileKind.Number;
    }
  }
  // Rendering handles frontier masking dynamically (no generation-time markings)

  // Assign compass arrow directions for any Compass shop tiles (fixed at generation)
  const xTilesPositions = board.tiles.filter(t => t.kind === TileKind.X).map(t => t.pos);
  for (const t of board.tiles) {
    if (t.kind === TileKind.Shop && t.subId === 'Compass') {
      // find nearest X by Manhattan distance
      let best: { pos: { x: number; y: number }; d: number } | null = null;
      for (const xp of xTilesPositions) {
        const d = Math.abs(xp.x - t.pos.x) + Math.abs(xp.y - t.pos.y);
        if (best === null || d < best.d) best = { pos: xp, d };
      }
      if (best) {
        const dx = best.pos.x - t.pos.x;
        const dy = best.pos.y - t.pos.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          t.compassDir = dx >= 0 ? '→' : '←';
        } else {
          t.compassDir = dy >= 0 ? '↓' : '↑';
        }
      }
    }
  }

  // Update run state stats and persistent effect flags
  runState.stats.minesTotal = mines;
  runState.stats.oreTotal = ore;
  runState.stats.xRemaining = xTiles;
  // recompute total shop tiles from counts (includes guaranteed 1Up)
  // (set a provisional value; will be finalized after counts below)
  runState.stats.shopTilesRemaining = spawned;
  runState.stats.challengeTilesRemaining = 0;
  // Build per-type counts
  runState.stats.shopCounts = {};
  runState.stats.challengeCounts = {};
  for (const t of board.tiles) {
    if (t.kind === TileKind.Shop && t.subId) {
      runState.stats.shopCounts[t.subId] = (runState.stats.shopCounts[t.subId] ?? 0) + 1;
    }
    if (t.kind === TileKind.Challenge && t.subId) {
      runState.stats.challengeCounts[t.subId] = (runState.stats.challengeCounts[t.subId] ?? 0) + 1;
    }
  }
  // Finalize total shop count from per-type map (ensures guaranteed 1Up is counted)
  runState.stats.shopTilesRemaining = Object.values(runState.stats.shopCounts).reduce((a, b) => a + b, 0);
  // Finalize total challenge count from per-type map
  runState.stats.challengeTilesRemaining = Object.values(runState.stats.challengeCounts).reduce((a, b) => a + b, 0);

  // Stopwatches disabled for now
  runState.persistentEffects.stopwatchCount = 0;
  // Car Loan should apply from level start if present on the board
  runState.persistentEffects.carLoan = (runState.stats.challengeCounts[ChallengeId.CarLoan] ?? 0) > 0;
  // Reset per-level toggles
  runState.persistentEffects.noEndGold = false;
  runState.persistentEffects.atmFee = (runState.stats.challengeCounts[ChallengeId.ATMFee] ?? 0) > 0;
  runState.persistentEffects.bloodDiamond = (runState.stats.challengeCounts[ChallengeId.BloodDiamond] ?? 0) > 0;
  runState.persistentEffects.tarotCard = false;
  runState.persistentEffects.appraisal = false;
  runState.persistentEffects.donationBoxStacks = 0;

  return { board };
}


