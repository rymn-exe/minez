// Reveal engine:
//  - Mutates the underlying board model (no Phaser objects here)
//  - Emits GameEvent notifications for the Scene to react (UI, scene changes)
//  - Applies challenge/relic rules and keeps runState counters in sync
//  - Returns a compact RevealResult so callers can handle follow‑up flows (e.g. ❌ resolution)
import { Board, Tile, TileKind, ChallengeId, indexAt, neighbors } from './types';
import { runState } from '../state';
import { rngInt } from './rng';
import { events, GameEvent } from './events';
import { ECONOMY } from './consts';
import { revealTile as revealRec } from './reveal';

export interface RevealResult {
  // Net life change (negative when taking damage)
  lifeDelta: number;
  // Net gold change (positive for gain, negative for costs)
  goldDelta: number;
  // When true, the level end flow should run (e.g., clicked ❌)
  endedLevel: boolean;
  // For X-resolution sequence: number of stopwatches auto-revealed
  stopwatchesRevealed?: number;
}

function floodReveal(board: Board, x: number, y: number, visited: Set<number>, res: RevealResult) {
  const idx = indexAt(board, x, y);
  if (visited.has(idx)) return;
  const t = board.tiles[idx];
  if (t.revealed || t.flagged) return;
  t.revealed = true;
  runState.stats.revealedCount++;
  events.emit(GameEvent.TileRevealed, { tile: t });

  if (t.kind === TileKind.Safe) {
    for (const p of neighbors(board, x, y)) {
      const nTile = board.tiles[indexAt(board, p.x, p.y)];
      if (!nTile.revealed && (nTile.kind === TileKind.Safe || nTile.kind === TileKind.Number)) {
        floodReveal(board, p.x, p.y, visited, res);
      }
    }
  }
}

export function revealTile(board: Board, x: number, y: number, byUser: boolean = false): RevealResult {
  const res: RevealResult = { lifeDelta: 0, goldDelta: 0, endedLevel: false };
  const tile = board.tiles[indexAt(board, x, y)];
  if (tile.revealed || tile.flagged) return res;

  // Car Loan fee for special tiles (shop/challenge) only; never below 0
  if (runState.persistentEffects.carLoan) {
    if (tile.kind === TileKind.Shop || tile.kind === TileKind.Challenge) {
      runState.gold -= 1; // can go negative per new rule
      res.goldDelta -= 1;
    }
  }

  switch (tile.kind) {
    case TileKind.Mine: {
      // Optimist: first mine each level becomes Zirconium (no life lost) but still counts as mine opened
      if (!runState.persistentEffects.optimistUsedThisLevel && (runState.ownedRelics['Optimist'] ?? 0) > 0) {
        runState.persistentEffects.optimistUsedThisLevel = true;
        tile.revealed = true;
        runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
        // Lapidarist applies as mine opened
        const lap = runState.ownedRelics['Lapidarist'] ?? 0;
        if (lap > 0) {
          runState.gold += 3 * lap;
          res.goldDelta += 3 * lap;
          events.emit(GameEvent.GoldGained, { amount: 3 * lap, source: 'Lapidarist' });
        }
        // Zirconium +1g
        runState.gold += 1;
        res.goldDelta += 1;
        events.emit(GameEvent.GoldGained, { amount: 1, source: 'OptimistZirconium' });
        events.emit(GameEvent.TileRevealed, { tile });
        break;
      }
      // Gambler relic 25% to not explode per stack
      const stacks = runState.ownedRelics['Gambler'] ?? 0;
      let prevented = false;
      for (let i = 0; i < stacks; i++) {
        const roll = Math.random(); // ok non-deterministic for now
        if (roll < 0.25) {
          prevented = true;
          break;
        }
      }
      tile.revealed = true;
      // Decrement mines remaining on reveal
      runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
      // Lapidarist: +3 gold per stack when revealing a mine
      const lap = runState.ownedRelics['Lapidarist'] ?? 0;
      if (lap > 0) {
        runState.gold += 3 * lap;
        res.goldDelta += 3 * lap;
        events.emit(GameEvent.GoldGained, { amount: 3 * lap, source: 'Lapidarist' });
      }
      if (!prevented) {
        // Billionaire: pay 5g instead of losing a life (if lives >1 and gold >=5)
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(0, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      events.emit(GameEvent.TileRevealed, { tile });
      break;
    }
    case TileKind.Ore: {
      tile.revealed = true;
      runState.stats.oreTotal = Math.max(0, runState.stats.oreTotal - 1);
      // Investor: 25% chance Ore becomes Diamond
      const investor = (runState.ownedRelics['Investor'] ?? 0) > 0 && Math.random() < 0.25;
      if (investor) {
        // mark for UI so icon shows 💎 instead of 🪙
        (tile as any).subId = 'Diamond';
      }
      const gain = (runState.persistentEffects.snakeOil
        ? 0
        : (investor ? rngInt(Math.random, 7, 10) : rngInt(Math.random, 2, 5)));
      if (gain > 0) {
        runState.gold += gain;
        res.goldDelta += gain;
        events.emit(GameEvent.GoldGained, { amount: gain, source: investor ? 'InvestorDiamond' : 'Ore' });
      }
      // Snake Venom (v2): revealing Ore-like tiles costs 1 life (cannot kill)
      if (runState.persistentEffects.snakeVenom.active && runState.lives > 1) {
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(1, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      events.emit(GameEvent.TileRevealed, { tile });
      break;
    }
    case TileKind.X: {
      tile.revealed = true;
      runState.stats.xRemaining = Math.max(0, runState.stats.xRemaining - 1);
      events.emit(GameEvent.TileRevealed, { tile });
      if (byUser) {
        events.emit(GameEvent.LevelEndTriggered, { reason: 'X' });
        res.stopwatchesRevealed = 0; // stopwatches disabled
        res.endedLevel = true;
      }
      break;
    }
    case TileKind.Challenge: {
      tile.revealed = true;
      // decrease counters
      runState.stats.challengeTilesRemaining = Math.max(0, runState.stats.challengeTilesRemaining - 1);
      if (tile.subId) {
        runState.stats.challengeCounts[tile.subId] = Math.max(0, (runState.stats.challengeCounts[tile.subId] ?? 0) - 1);
      }
      runState.stats.specialRevealedThisLevel += 1;
      // Scratchcard bonus (+stacks) for special tiles
      if (runState.persistentEffects.scratchcardStacks > 0) {
        runState.gold += runState.persistentEffects.scratchcardStacks;
        res.goldDelta += runState.persistentEffects.scratchcardStacks;
        events.emit(GameEvent.GoldGained, { amount: runState.persistentEffects.scratchcardStacks, source: 'Scratchcard' });
      }
      applyChallengeOnReveal(tile, res);
      events.emit(GameEvent.TileRevealed, { tile });
      break;
    }
    case TileKind.Shop: {
      tile.revealed = true;
      // decrease counters
      runState.stats.shopTilesRemaining = Math.max(0, runState.stats.shopTilesRemaining - 1);
      if (tile.subId) {
        runState.stats.shopCounts[tile.subId] = Math.max(0, (runState.stats.shopCounts[tile.subId] ?? 0) - 1);
      }
      runState.stats.specialRevealedThisLevel += 1;
      // Scratchcard bonus (+stacks) for special tiles
      if (runState.persistentEffects.scratchcardStacks > 0) {
        runState.gold += runState.persistentEffects.scratchcardStacks;
        res.goldDelta += runState.persistentEffects.scratchcardStacks;
        events.emit(GameEvent.GoldGained, { amount: runState.persistentEffects.scratchcardStacks, source: 'Scratchcard' });
      }
      applyShopTileOnReveal(tile, res);
      events.emit(GameEvent.TileRevealed, { tile });
      break;
    }
    case TileKind.Safe: {
      floodReveal(board, x, y, new Set<number>(), res);
      break;
    }
    case TileKind.Number: {
      tile.revealed = true;
      runState.stats.revealedCount++;
      // Number Cruncher: X% chance (X = tile.number) to grant +1 gold per stack
      const stacksNC = runState.ownedRelics['NumberCruncher'] ?? 0;
      if (stacksNC > 0 && tile.number > 0) {
        const chance = Math.min(1, tile.number / 100);
        if (Math.random() < chance) {
          runState.gold += stacksNC;
          res.goldDelta += stacksNC;
          events.emit(GameEvent.GoldGained, { amount: stacksNC, source: 'NumberCruncher' });
        }
      }
      events.emit(GameEvent.TileRevealed, { tile });
      break;
    }
  }

  // (Snake Venom ore/diamond/zirconium handling is applied at reveal-time above)

  // Immediate loss: if lives reach 0 at any time during a reveal (and level hasn't already ended via X)
  if (!res.endedLevel && runState.lives <= 0) {
    res.endedLevel = true;
    events.emit(GameEvent.LevelEndResolved, { survived: false, goldAwarded: 0 });
  }

  return res;
}

function applyChallengeOnReveal(tile: Tile, res: RevealResult) {
  switch (tile.subId) {
    case ChallengeId.AutoGrat: {
      runState.gold -= 1; // steals 1 gold; can go negative
      res.goldDelta -= 1;
      break;
    }
    case ChallengeId.Stopwatch: {
      // Disabled
      break;
    }
    case ChallengeId.MathTest: {
      runState.persistentEffects.mathTest = true;
      break;
    }
    case ChallengeId.BadDeal: {
      runState.gold += 1;
      res.goldDelta += 1;
      const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
      if (canBillionaire) {
        runState.gold -= 5;
        res.goldDelta -= 5;
      } else {
        runState.lives = Math.max(0, runState.lives - 1);
        res.lifeDelta -= 1;
      }
      break;
    }
    case ChallengeId.Clover2: {
      // Harmless on reveal; counts as mine for numbers and detection; accepts flags
      break;
    }
    case ChallengeId.SnakeOil: {
      runState.persistentEffects.snakeOil = true;
      break;
    }
    case ChallengeId.MegaMine: {
      // Acts like a mine on reveal. If player has >2 lives, it costs 2 lives instead of 1
      const livesHit = runState.lives > 2 ? 2 : 1;
      for (let i = 0; i < livesHit; i++) {
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(0, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      break;
    }
    case ChallengeId.SnakeVenom: {
      runState.persistentEffects.snakeVenom.active = true;
      // counter already set to 8 in state
      break;
    }
    case ChallengeId.BloodPact: {
      if (runState.lives >= 3) {
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(0, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      break;
    }
    case ChallengeId.CarLoan: {
      runState.persistentEffects.carLoan = true;
      break;
    }
  }
}

function applyShopTileOnReveal(tile: Tile, res: RevealResult) {
  switch (tile.subId) {
    case 'Diamond': {
      if (!runState.persistentEffects.snakeOil) {
        const gain = rngInt(Math.random, 7, 10);
        runState.gold += gain;
        res.goldDelta += gain;
        events.emit(GameEvent.GoldGained, { amount: gain, source: 'Diamond' });
      }
      // Snake Venom penalty on Diamond reveal (cannot kill)
      if (runState.persistentEffects.snakeVenom.active && runState.lives > 1) {
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(1, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      break;
    }
    case '1Up': {
      runState.lives += 1;
      res.lifeDelta += 1;
      break;
    }
    case 'Pickaxe': {
      // Reveal up to 2 adjacent non-mine tiles
      if (thisBoard) {
        const { x, y } = tile.pos;
        const neighs = neighbors(thisBoard, x, y)
          .filter(p => {
            const t = thisBoard!.tiles[indexAt(thisBoard!, p.x, p.y)];
            return !t.revealed && t.kind !== TileKind.Mine;
          });
        for (let i = 0; i < Math.min(2, neighs.length); i++) {
          const p = neighs[i];
          revealTile(thisBoard, p.x, p.y); // chain reveal
        }
      }
      break;
    }
    case 'Compass': {
      // UI-only effect; will be handled in UI render
      break;
    }
    case 'GoodDeal': {
      if (runState.gold > 0) {
        runState.gold -= 1;
        res.goldDelta -= 1;
        runState.lives += 1;
        res.lifeDelta += 1;
      }
      break;
    }
    case 'RemoteControl': {
      // Flag a mine if exists else clover
      if (thisBoard) {
        const idxMine = thisBoard.tiles.findIndex(t => t.kind === TileKind.Mine && !t.flagged && !t.revealed);
        if (idxMine >= 0) {
          thisBoard.tiles[idxMine].flagged = true;
          // Decrement mines remaining when auto-flagging a real mine
          runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
        } else {
          const idxClover = thisBoard.tiles.findIndex(t => t.kind === TileKind.Challenge && t.subId === ChallengeId.Clover2 && !t.flagged && !t.revealed);
          if (idxClover >= 0) thisBoard.tiles[idxClover].flagged = true;
        }
      }
      break;
    }
    case 'AdvancePayment': {
      // Reveal an Ore tile if exists
      if (thisBoard) {
        const idxOre = thisBoard.tiles.findIndex(t => t.kind === TileKind.Ore && !t.revealed);
        if (idxOre >= 0) {
          const p = thisBoard.tiles[idxOre].pos;
          revealTile(thisBoard, p.x, p.y);
        }
      }
      break;
    }
    case 'Magnet': {
      // Reveal all adjacent Ore tiles
      if (thisBoard) {
        const { x, y } = tile.pos;
        for (const p of neighbors(thisBoard, x, y)) {
          const tt = thisBoard.tiles[indexAt(thisBoard, p.x, p.y)];
          if (tt.kind === TileKind.Ore && !tt.revealed) {
            revealTile(thisBoard, p.x, p.y);
          }
        }
      }
      break;
    }
    case 'Scratchcard': {
      runState.persistentEffects.scratchcardStacks += 1;
      break;
    }
    case 'Receipt': {
      runState.shopFreePurchases += 1;
      break;
    }
    case 'Zirconium': {
      // Investor chance to upgrade to Diamond
      const investor = (runState.ownedRelics['Investor'] ?? 0) > 0 && Math.random() < 0.25;
      const amount = investor ? rngInt(Math.random, 7, 10) : 1;
      if (!runState.persistentEffects.snakeOil || !investor) {
        runState.gold += amount;
        res.goldDelta += amount;
        events.emit(GameEvent.GoldGained, { amount, source: investor ? 'InvestorDiamond' : 'Zirconium' });
      }
      // Show 💎 if upgraded
      if (investor) {
        tile.subId = 'Diamond';
      }
      // Snake Venom penalty on Zirconium reveal (cannot kill)
      if (runState.persistentEffects.snakeVenom.active && runState.lives > 1) {
        const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.gold >= 5;
        if (canBillionaire) {
          runState.gold -= 5;
          res.goldDelta -= 5;
        } else {
          runState.lives = Math.max(1, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      break;
    }
    case '2Up': {
      runState.lives += 2;
      res.lifeDelta += 2;
      break;
    }
    case 'LuckyCat': {
      if (runState.lives > 0) {
        runState.gold += runState.lives;
        res.goldDelta += runState.lives;
        events.emit(GameEvent.GoldGained, { amount: runState.lives, source: 'LuckyCat' });
      }
      break;
    }
  }
}

// Workaround for shop tile effects needing board; Scene will set this before reveals
let thisBoard: Board | null = null;
export function bindBoardForShopEffects(board: Board) {
  thisBoard = board;
}


