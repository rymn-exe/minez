// Reveal engine:
//  - Mutates the underlying board model (no Phaser objects here)
//  - Emits GameEvent notifications for the Scene to react (UI, scene changes)
//  - Applies challenge/collectible rules and keeps runState counters in sync
//  - Returns a compact RevealResult so callers can handle follow‑up flows (e.g. ❌ resolution)
// Legacy note: if you see "Zirconium" in older comments/events, it refers to "Quartz".
import { Board, Tile, TileKind, ChallengeId, indexAt, neighbors } from './types';
import { runState } from '../state';
import { rngInt, pickRandom } from './rng';
import { events, GameEvent } from './events';
import { ECONOMY } from './consts';
import { revealTile as revealRec } from './reveal';
import { getTileRng, getEffectRng } from './rngUtils';

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
      if (nTile.revealed || nTile.flagged) continue;
      if (nTile.kind === TileKind.Safe) {
        floodReveal(board, p.x, p.y, visited, res);
      } else if (nTile.kind === TileKind.Number) {
        // IMPORTANT: reveal number tiles via the normal reveal path so that
        // - 20% random '?' masking applies
        // - Math Test masking applies
        // - Number Cruncher / Tarot Card side-effects apply
        revealTile(board, p.x, p.y, false);
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
      let loss = 1;
      runState.gold -= 1; // can go negative per new rule
      res.goldDelta -= 1;
      if (runState.persistentEffects.atmFee) {
        runState.gold -= 1;
        res.goldDelta -= 1;
        loss += 1;
      }
      // Emit as a negative coin delta (respects ATM Fee)
      events.emit(GameEvent.GoldGained, { amount: -loss, source: 'CarLoan' });
    }
  }

  switch (tile.kind) {
    case TileKind.Mine: {
      // Optimist: first mine each level becomes Quartz (no life lost) but still counts as mine opened
      if (!runState.persistentEffects.optimistUsedThisLevel && (runState.ownedRelics['Optimist'] ?? 0) > 0) {
        runState.persistentEffects.optimistUsedThisLevel = true;
        tile.revealed = true;
        // Mark for UI transform after the reveal flip (handled in GameScene).
        tile.pendingTransform = 'Quartz';
        runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
        // Lapidarist applies as mine opened
        const lap = runState.ownedRelics['Lapidarist'] ?? 0;
        if (lap > 0) {
          runState.gold += 3 * lap;
          res.goldDelta += 3 * lap;
          events.emit(GameEvent.GoldGained, { amount: 3 * lap, source: 'Lapidarist' });
        }
        // Quartz +1g
        runState.gold += 1;
        res.goldDelta += 1;
        events.emit(GameEvent.GoldGained, { amount: 1, source: 'OptimistQuartz' });
        events.emit(GameEvent.TileRevealed, { tile });
        break;
      }
      // Gambler collectible 25% to not explode per stack
      const stacks = runState.ownedRelics['Gambler'] ?? 0;
      let prevented = false;
      if (stacks > 0) {
        const rng = getTileRng(board, x, y);
        for (let i = 0; i < stacks; i++) {
          const roll = rng();
          if (roll < 0.25) {
            prevented = true;
            break;
          }
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
      const investor = (runState.ownedRelics['Investor'] ?? 0) > 0 && getTileRng(board, x, y)() < 0.25;
      const gain = (runState.persistentEffects.snakeOil
        ? 0
        : (investor ? rngInt(Math.random, 7, 10) : rngInt(Math.random, 2, 5)));
      if (gain > 0) {
        runState.gold += gain;
        res.goldDelta += gain;
        events.emit(GameEvent.GoldGained, { amount: gain, source: investor ? 'InvestorDiamond' : 'Ore' });
      }
      // Blood Diamond: lose 1 life in addition to gold on ⚪/🪙/💎
      if (runState.persistentEffects.bloodDiamond) {
        const canBillionaire2 = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canBillionaire2) {
          runState.gold -= 5;
          res.goldDelta -= 5;
          if (runState.persistentEffects.atmFee) {
            runState.gold -= 1;
            res.goldDelta -= 1;
          }
        } else {
          runState.lives = Math.max(0, runState.lives - 1);
          res.lifeDelta -= 1;
        }
      }
      // UI transform: ore → diamond
      if (investor) {
        tile.pendingTransform = 'Diamond';
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
      applyChallengeOnReveal(board, tile, res);
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
        if (getTileRng(board, x, y)() < chance) {
          runState.gold += stacksNC;
          res.goldDelta += stacksNC;
          events.emit(GameEvent.GoldGained, { amount: stacksNC, source: 'NumberCruncher' });
        }
      }
      // Snake Venom (new): 25% chance to lose a life on 3+
      if (runState.persistentEffects.snakeVenom.active && tile.number >= 3) {
        if (getTileRng(board, x, y)() < 0.25) {
          const canBill = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
          if (canBill) {
            runState.gold -= 5;
            res.goldDelta -= 5;
            if (runState.persistentEffects.atmFee) {
              runState.gold -= 1;
              res.goldDelta -= 1;
            }
          } else {
            runState.lives = Math.max(0, runState.lives - 1);
            res.lifeDelta -= 1;
          }
        }
      }
      // Math Test masking should not be retroactive: only numbers revealed AFTER Math Test are masked
      if (runState.persistentEffects.mathTest && tile.number > 1) {
        tile.mathMasked = true;
      }
      // Global masking: every revealed number has a base 20% chance to display as '?'.
      const tileRng = getTileRng(board, x, y);
      if (tileRng() < 0.20) {
        tile.randomMasked = true;
      }

      // If this number would be shown as '?', Lucky Penny / Tarot Card can “upgrade” it.
      const isMasked = (tile.mathMasked || tile.randomMasked) && tile.number > 0;
      if (isMasked) {
        // Lucky Penny: 5% to become Quartz => +1 gold (blocked by Snake Oil)
        if ((runState.persistentEffects.luckyPennyStacks ?? 0) > 0 && tileRng() < 0.05) {
          if (!runState.persistentEffects.snakeOil) {
            runState.gold += 1;
            res.goldDelta += 1;
            events.emit(GameEvent.GoldGained, { amount: 1, source: 'LuckyPennyQuartz' });
          }
          // Animate: keep showing '?' for now; swap after UI flash
          tile.pendingTransform = 'Quartz';
        }
        // Tarot Card: 5% to become Quartz/Diamond/Ore
        if (!tile.pendingTransform && runState.persistentEffects.tarotCard && tileRng() < 0.05) {
          const pick = Math.floor(tileRng() * 3); // 0: Quartz, 1: Ore, 2: Diamond
          let gain = 0;
          let show: 'Quartz' | 'Ore' | 'Diamond';
          if (pick === 0) { gain = 1; show = 'Quartz'; }
          else if (pick === 1) { gain = rngInt(tileRng, 2, 5); show = 'Ore'; }
          else { gain = rngInt(tileRng, 7, 10); show = 'Diamond'; }
          // Snake Oil blocks Quartz/Ore/Diamond gold
          if (!runState.persistentEffects.snakeOil) {
            runState.gold += gain;
            res.goldDelta += gain;
            events.emit(GameEvent.GoldGained, { amount: gain, source: pick === 0 ? 'TarotQuartz' : pick === 1 ? 'TarotOre' : 'TarotDiamond' });
          }
          // Animate: keep showing '?' for now; swap after UI flash
          tile.pendingTransform = show;
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

  // Emit life change summary for this reveal (positive or negative)
  if (res.lifeDelta !== 0) {
    events.emit(GameEvent.LifeChanged, { delta: res.lifeDelta });
  }

  // 9-5: whenever you lose a life, gain 2 gold per stack per life lost.
  if (res.lifeDelta < 0 && (runState.persistentEffects.nineToFiveStacks ?? 0) > 0) {
    const stacks = runState.persistentEffects.nineToFiveStacks ?? 0;
    const gain = 2 * stacks * Math.abs(res.lifeDelta);
    runState.gold += gain;
    res.goldDelta += gain;
    events.emit(GameEvent.GoldGained, { amount: gain, source: 'NineToFive' });
  }

  return res;
}

function applyChallengeOnReveal(board: Board, tile: Tile, res: RevealResult) {
  switch (tile.subId) {
    case ChallengeId.AutoGrat: {
      let loss = 1;
      runState.gold -= 1; // steals 1 gold; can go negative
      res.goldDelta -= 1;
      if (runState.persistentEffects.atmFee) {
        runState.gold -= 1;
        res.goldDelta -= 1;
        loss += 1;
      }
      events.emit(GameEvent.GoldGained, { amount: -loss, source: 'AutoGrat' });
      break;
    }
    case ChallengeId.Stopwatch: {
      // No immediate effect. Leaving the level with any unrevealed stopwatches costs lives (handled on exit).
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
    case ChallengeId.BloodDiamond: {
      runState.persistentEffects.bloodDiamond = true;
      break;
    }
    case ChallengeId.FindersFee: {
      runState.persistentEffects.noEndGold = true;
      break;
    }
    case ChallengeId.ATMFee: {
      runState.persistentEffects.atmFee = true;
      break;
    }
    case ChallengeId.Coal: {
      // no effect
      break;
    }
    case ChallengeId.BoxingDay: {
      const before = runState.gold;
      const after = Math.floor(before / 2);
      const delta = after - before; // negative or zero
      if (delta !== 0) {
        runState.gold = after;
        res.goldDelta += delta;
        events.emit(GameEvent.GoldGained, { amount: delta, source: 'BoxingDay' });
      }
      // ATM fee triggers on any gold loss
      if (runState.persistentEffects.atmFee && before > after) {
        runState.gold -= 1;
        res.goldDelta -= 1;
        events.emit(GameEvent.GoldGained, { amount: -1, source: 'ATMFee' });
      }
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
    case ChallengeId.Jackhammer: {
      // Reveal all surrounding tiles, including mines.
      // Prevent chain reactions: a Jackhammer revealed *by* another Jackhammer does not trigger.
      if ((tile as any).__fromJackhammer) {
        delete (tile as any).__fromJackhammer;
        break;
      }
      const { x, y } = tile.pos;
      const neighs = neighbors(board, x, y);
      for (const p of neighs) {
        const nt = board.tiles[indexAt(board, p.x, p.y)];
        if (!nt.revealed && !nt.flagged) {
          // Mark Jackhammers revealed by this effect so they don't cascade.
          if (nt.kind === TileKind.Challenge && nt.subId === ChallengeId.Jackhammer) {
            (nt as any).__fromJackhammer = true;
          }
          revealTile(board, p.x, p.y, false);
        }
      }
      break;
    }
    case ChallengeId.DonationBox: {
      // Each time you gain gold, reveal a random tile (handled by GameScene on GoldGained).
      runState.persistentEffects.donationBoxStacks += 1;
      break;
    }
    case ChallengeId.Appraisal: {
      // Quartz costs 1 life when revealed (for the rest of the level).
      runState.persistentEffects.appraisal = true;
      break;
    }
    case ChallengeId.Key: {
      // No immediate effect. Exiting requires revealing all keys (handled on exit).
      break;
    }
  }
  // Auditor: each challenge tile revealed grants +1 gold per stack
  const auditorStacks = runState.ownedRelics['Auditor'] ?? 0;
  if (auditorStacks > 0) {
    runState.gold += auditorStacks;
    res.goldDelta += auditorStacks;
    events.emit(GameEvent.GoldGained, { amount: auditorStacks, source: 'Auditor' });
  }
}

function applyShopTileOnReveal(tile: Tile, res: RevealResult) {
  switch (tile.subId) {
    case 'Diamond': {
      if (!runState.persistentEffects.snakeOil) {
        const diamondRng = thisBoard ? getTileRng(thisBoard, tile.pos.x, tile.pos.y) : getEffectRng('Diamond');
        const gain = rngInt(diamondRng, 7, 10);
        runState.gold += gain;
        res.goldDelta += gain;
        events.emit(GameEvent.GoldGained, { amount: gain, source: 'Diamond' });
      }
      // Blood Diamond: +1 life loss
      if (runState.persistentEffects.bloodDiamond) {
        const canB = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canB) {
          runState.gold -= 5;
          res.goldDelta -= 5;
          if (runState.persistentEffects.atmFee) {
            runState.gold -= 1; res.goldDelta -= 1;
          }
        } else {
          runState.lives = Math.max(0, runState.lives - 1);
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
      // Reveal up to 2 random adjacent non-mine, unrevealed tiles
      if (thisBoard) {
        const { x, y } = tile.pos;
        const candidates = neighbors(thisBoard, x, y).filter(p => {
          const t = thisBoard!.tiles[indexAt(thisBoard!, p.x, p.y)];
          return !t.revealed && t.kind !== TileKind.Mine;
        });
        // Shuffle deterministically using seeded RNG
        const pickaxeRng = getTileRng(thisBoard, x, y);
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(pickaxeRng() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const toOpen = candidates.slice(0, 2);
        for (const p of toOpen) {
          revealTile(thisBoard, p.x, p.y, false);
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
        if (runState.persistentEffects.atmFee) {
          runState.gold -= 1;
          res.goldDelta -= 1;
        }
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
          thisBoard.tiles[idxMine].flagColor = 'blue';
          // Decrement mines remaining when auto-flagging a real mine
          runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
        } else {
          const idxClover = thisBoard.tiles.findIndex(t => t.kind === TileKind.Challenge && t.subId === ChallengeId.Clover2 && !t.flagged && !t.revealed);
          if (idxClover >= 0) {
            thisBoard.tiles[idxClover].flagged = true;
            thisBoard.tiles[idxClover].flagColor = 'blue';
          }
        }
        events.emit(GameEvent.BoardChanged, { reason: 'RemoteControl' });
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
    case 'LuckyPenny': {
      runState.persistentEffects.luckyPennyStacks += 1;
      break;
    }
    case 'NineToFive': {
      runState.persistentEffects.nineToFiveStacks += 1;
      break;
    }
    case 'PokerChip': {
      // Only once per board.
      if (!thisBoard || runState.persistentEffects.pokerChipUsedThisLevel) break;
      runState.persistentEffects.pokerChipUsedThisLevel = true;
      // Pick one X and one Mine (unrevealed) and mark both with a BLUE flag.
      const idxX = thisBoard.tiles.findIndex(t => t.kind === TileKind.X && !t.revealed && !t.flagged);
      const mineCandidates = thisBoard.tiles
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => t.kind === TileKind.Mine && !t.revealed && !t.flagged);
      if (idxX >= 0 && mineCandidates.length > 0) {
        const rng = getTileRng(thisBoard, tile.pos.x, tile.pos.y);
        const pickedMine = mineCandidates[Math.floor(rng() * mineCandidates.length)];
        const flag = (idx: number) => {
          const tt = thisBoard!.tiles[idx];
          if (!tt.flagged) {
            tt.flagged = true;
            tt.flagColor = 'blue';
            if (tt.kind === TileKind.Mine) {
              runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
            }
          }
        };
        flag(idxX);
        flag(pickedMine.idx);
        events.emit(GameEvent.BoardChanged, { reason: 'PokerChip' });
      }
      break;
    }
    case 'Receipt': {
      runState.shopFreePurchases += 1;
      break;
    }
    case 'TarotCard': {
      // Enable Tarot effect for this level
      runState.persistentEffects.tarotCard = true;
      break;
    }
    case 'MetalDetector': {
      // Flag all adjacent mines (or clovers) without revealing
      if (thisBoard) {
        const { x, y } = tile.pos;
        for (const p of neighbors(thisBoard, x, y)) {
          const tt = thisBoard.tiles[indexAt(thisBoard, p.x, p.y)];
          if (!tt.flagged && !tt.revealed && (tt.kind === TileKind.Mine || (tt.kind === TileKind.Challenge && tt.subId === ChallengeId.Clover2))) {
            tt.flagged = true;
            tt.flagColor = 'blue';
            if (tt.kind === TileKind.Mine) {
              runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
            }
          }
        }
        events.emit(GameEvent.BoardChanged, { reason: 'MetalDetector' });
      }
      break;
    }
    case 'LaundryMoney': {
      const before = runState.gold;
      const after = Math.ceil(before / 5) * 5;
      const delta = after - before;
      if (delta !== 0) {
        runState.gold = after;
        res.goldDelta += delta;
        if (delta > 0) {
          events.emit(GameEvent.GoldGained, { amount: delta, source: 'LaundryMoney' });
        }
      }
      break;
    }
    case 'Quartz': {
      // Investor chance to upgrade to Diamond
      const quartzRng = thisBoard ? getTileRng(thisBoard, tile.pos.x, tile.pos.y) : getEffectRng('Quartz');
      const investor = (runState.ownedRelics['Investor'] ?? 0) > 0 && quartzRng() < 0.25;
      const amount = investor ? rngInt(quartzRng, 7, 10) : 1;
      if (!runState.persistentEffects.snakeOil) {
        runState.gold += amount;
        res.goldDelta += amount;
        events.emit(GameEvent.GoldGained, { amount, source: investor ? 'InvestorDiamond' : 'Quartz' });
      }
      // UI transform: quartz → diamond
      if (investor) {
        tile.pendingTransform = 'Diamond';
      }
      // Blood Diamond: +1 life loss
      if (runState.persistentEffects.bloodDiamond) {
        const canB2 = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canB2) {
          runState.gold -= 5; res.goldDelta -= 5;
          if (runState.persistentEffects.atmFee) { runState.gold -= 1; res.goldDelta -= 1; }
        } else {
          runState.lives = Math.max(0, runState.lives - 1); res.lifeDelta -= 1;
        }
      }
      // Appraisal: Quartz costs 1 life
      if (runState.persistentEffects.appraisal) {
        const canB3 = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && runState.lives > 1 && runState.gold >= 5;
        if (canB3) {
          runState.gold -= 5; res.goldDelta -= 5;
          if (runState.persistentEffects.atmFee) { runState.gold -= 1; res.goldDelta -= 1; }
        } else {
          runState.lives = Math.max(0, runState.lives - 1); res.lifeDelta -= 1;
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


