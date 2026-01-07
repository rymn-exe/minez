// Board generation:
//  - Creates the truth board for a level (no rendering here)
//  - Applies relic modifiers (Diffuser, Entrepreneur)
//  - Places drafted challenge tiles from the run's pool (guarantee 1 spawn per drafted challenge, then weighted rolls)
//  - Spawns shop tiles probabilistically from owned pool (with Accountant bonus)
//  - Guarantees one ❤️ 1Up per level
import { Board, Tile, TileKind, ChallengeId, indexAt } from './types';
import { createRng, rngInt, pickRandom } from './rng';
import { runState } from '../state';
import { SHOP_SPAWN_CAP_PER_LEVEL, SHOP_BASE_SPAWN_CHANCE } from './consts';
import { SHOP_TILES } from './items';

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
  const rand = createRng(runState.seed + runState.level);
  const board = emptyBoard(width, height);
  const area = width * height;

  // Apply relic modifiers that affect counts
  const diffuserCount = runState.ownedRelics['Diffuser'] ?? 0;
  const entrepreneurCount = runState.ownedRelics['Entrepreneur'] ?? 0;

  // v2 scaling:
  // - One exit tile per level
  // - Mines are a seeded random 16–20% of tiles (excluding the exit)
  // - Ore is (mostly) fixed per board
  const xTiles = 1;
  const density = 0.16 + rand() * 0.04; // [0.16, 0.20)
  const baseMineCount = Math.round(density * Math.max(0, area - xTiles));
  // Keep at least 1 mine so the puzzle remains Minesweeper-like.
  const mines = Math.max(1, Math.min(area - xTiles - 1, baseMineCount - diffuserCount * 5));
  // Ore: guarantee 1 per board (plus Entrepreneur bonus).
  const ore = Math.min(area - xTiles - mines, 1 + entrepreneurCount);

  // Place core tiles
  placeRandomTiles(board, xTiles, TileKind.X, undefined, rand);
  placeRandomTiles(board, mines, TileKind.Mine, undefined, rand);
  placeRandomTiles(board, ore, TileKind.Ore, undefined, rand);

  // Remaining capacity for specials (shop/challenge) before filling numbers/safe
  let remainingSpecialSlots = Math.max(0, area - xTiles - mines - ore);

  // Place drafted challenge tiles from run pool.
  // - Level 1 starts with an empty pool (no challenges).
  // - Any drafted challenge spawns at least once per level.
  // - Additionally, scale extra challenge spawns by remaining board capacity.
  const draftedEntries = Object.entries(runState.ownedChallenges || {})
    .filter(([, n]) => (n ?? 0) > 0)
    .filter(([id]) => id !== String(ChallengeId.Coal));

  // Build weights for all drafted challenges
  const weights: Array<{ id: string; stacks: number; w: number }> = [];
  for (const [id, nRaw] of draftedEntries) {
    const stacks = Number(nRaw) || 0;
    if (stacks <= 0) continue;
    const band = CHALLENGE_SPAWN_BAND[id];
    if (!band) continue;
    const base = SPAWN_TARGET[band]; // treat the target as a relative weight
    weights.push({ id, stacks, w: Math.max(1, base) * stacks });
  }

  // Cap total challenge tiles by board size, especially early levels (prevents small-board blowups).
  // The guarantee below counts toward this cap.
  const challengeCap = Math.min(
    remainingSpecialSlots,
    Math.max(0, Math.round(area * Math.min(0.14, 0.04 + 0.01 * runState.level)))
  );
  let challengesPlaced = 0;

  // Guarantee 1 per drafted challenge, but never exceed caps/available slots.
  if (remainingSpecialSlots > 0 && weights.length > 0 && challengeCap > 0) {
    // If we can't fit all, prioritize higher-weight challenges first.
    const sorted = weights.slice().sort((a, b) => b.w - a.w);
    for (const e of sorted) {
      if (remainingSpecialSlots <= 0) break;
      if (challengesPlaced >= challengeCap) break;
      placeSpecialNearMine(board, 1, TileKind.Challenge, e.id, rand);
      remainingSpecialSlots -= 1;
      challengesPlaced += 1;
      }
    }

  // Extra challenge budget: allocate a fraction of remaining special capacity to challenges.
  // This keeps small boards playable while letting later boards get more complex.
  const budgetFrac = Math.min(0.18, 0.02 + 0.008 * runState.level);
  const extraBudgetRaw = Math.max(0, Math.round(remainingSpecialSlots * budgetFrac));
  const extraChallengeBudget = Math.min(remainingSpecialSlots, Math.max(0, challengeCap - challengesPlaced), extraBudgetRaw);
  for (let k = 0; k < extraChallengeBudget; k++) {
    if (weights.length === 0) break;
    const totalW = weights.reduce((a, b) => a + b.w, 0);
    let r = rand() * totalW;
    let picked = weights[0];
    for (const e of weights) {
      r -= e.w;
      if (r <= 0) { picked = e; break; }
    }
    placeSpecialNearMine(board, 1, TileKind.Challenge, picked.id, rand);
    challengesPlaced += 1;
    }
  remainingSpecialSlots = Math.max(0, remainingSpecialSlots - extraChallengeBudget);

  // Place shop tiles from owned pool (no per‑level cap)
  // Filter to only shop tiles that still exist (prevents legacy/removed IDs from spawning).
  const allowedShopIds = new Set(SHOP_TILES.map(s => s.id));
  const ownedIds = Object.keys(runState.ownedShopTiles).filter(id => allowedShopIds.has(id));
  let spawned = 0;
  const spawnedById: Record<string, number> = {};
  const accountantStacks = runState.ownedRelics['Accountant'] ?? 0;
  const bonus = Math.min(0.4, 0.01 * accountantStacks); // cap +40%
  const chance = Math.min(0.95, SHOP_BASE_SPAWN_CHANCE + bonus);
  // v2: cap shop spawns by board size to avoid flooding small boards
  const shopCap = Math.min(remainingSpecialSlots, Math.max(0, Math.round(area * 0.06)));

  // Per-tile "usually at least one": for each owned shop tile, try to spawn >=1 with 80% chance.
  // This happens before extra weighted rolls, and respects the overall cap for small boards.
  const guaranteeChance = 0.8;
  const idsForGuarantee = ownedIds
    .filter(id => (runState.ownedShopTiles[id] ?? 0) > 0)
    // 1Up is already guaranteed below
    .filter(id => id !== '1Up');
  // Shuffle deterministically so if we can't fit all, which ones make it is still seeded.
  for (let i = idsForGuarantee.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = idsForGuarantee[i];
    idsForGuarantee[i] = idsForGuarantee[j];
    idsForGuarantee[j] = tmp;
  }
  for (const id of idsForGuarantee) {
    if (spawned >= shopCap) break;
    const maxPerBoard = (id === 'PokerChip') ? 1 : Number.POSITIVE_INFINITY;
    const already = spawnedById[id] ?? 0;
    if (already >= maxPerBoard) continue;
    if (rand() < guaranteeChance) {
      placeSpecialNearMine(board, 1, TileKind.Shop, id, rand);
      spawned++;
      spawnedById[id] = (spawnedById[id] ?? 0) + 1;
    }
  }

  for (const id of ownedIds) {
    const weight = runState.ownedShopTiles[id];
    const maxPerBoard = (id === 'PokerChip') ? 1 : Number.POSITIVE_INFINITY;
    let spawnedThisId = spawnedById[id] ?? 0;
    for (let i = 0; i < weight; i++) {
      if (spawned >= shopCap) break;
      if (spawnedThisId >= maxPerBoard) break;
      if (rand() < chance) {
        placeSpecialNearMine(board, 1, TileKind.Shop, id, rand);
        spawned++;
        spawnedThisId++;
        spawnedById[id] = spawnedThisId;
      }
    }
  }
  // Ensure at least one ❤️ 1Up shop tile per level (design request)
  const hasOneUp = board.tiles.some(t => t.kind === TileKind.Shop && t.subId === '1Up');
  if (!hasOneUp && spawned < shopCap) {
    placeSpecialNearMine(board, 1, TileKind.Shop, '1Up', rand);
    spawnedById['1Up'] = (spawnedById['1Up'] ?? 0) + 1;
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

  // Challenge tiles only activate effects when revealed; do not pre-activate from board presence.
  // Per-level toggles are reset in BoardSetup at level start.

  return { board };
}


