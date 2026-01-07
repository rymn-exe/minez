// BoardSetup: Handles board generation and initialization
// Extracted from GameScene to reduce file size and improve maintainability
import { Board, ChallengeId, TileKind } from '../../game/types';
import { generateLevel } from '../../game/generation';
import { bindBoardForShopEffects } from '../../game/reveal';
import { runState } from '../../state';
import { RelicActivator } from './RelicActivator';
import { revealTile } from '../../game/reveal';
import { LevelResolver } from './LevelResolver';
import { getEffectRng } from '../../game/rngUtils';

export class BoardSetup {
  static setupBoard(
    width: number,
    height: number,
    levelResolver: LevelResolver
  ): Board {
    // Generate level
    const { board } = generateLevel(width, height);
    bindBoardForShopEffects(board);

    // Reset per-level counters
    runState.stats.specialRevealedThisLevel = 0;
    runState.stats.pendingToasts = [];
    runState.persistentEffects.optimistUsedThisLevel = false;
    // Reset per-level shop/challenge toggles that should not persist across levels
    runState.persistentEffects.scratchcardStacks = 0;
    runState.persistentEffects.tarotCard = false;
    runState.persistentEffects.pokerChipUsedThisLevel = false;
    runState.persistentEffects.luckyPennyStacks = 0;
    runState.persistentEffects.nineToFiveStacks = 0;
    // Reset per-level challenge modifiers (activate only when the tile is revealed)
    runState.persistentEffects.carLoan = false;
    runState.persistentEffects.snakeOil = false;
    runState.persistentEffects.mathTest = false;
    runState.persistentEffects.snakeVenom = { active: false, revealsUntilHit: 8 };
    runState.persistentEffects.noEndGold = false;
    runState.persistentEffects.atmFee = false;
    runState.persistentEffects.bloodDiamond = false;
    runState.persistentEffects.appraisal = false;
    runState.persistentEffects.donationBoxStacks = 0;
    levelResolver.reset();

    // Activate start-of-level relics
    const relicActivator = new RelicActivator(board, revealTile);
    relicActivator.activateStartOfLevel();

    // Challenge: Thief activates immediately on level start (even while unrevealed).
    // Each Thief tile steals 1 random owned collectible (if any).
    const thieves = board.tiles.filter(t => t.kind === TileKind.Challenge && t.subId === ChallengeId.Thief);
    if (thieves.length > 0) {
      for (let i = 0; i < thieves.length; i++) {
        const owned = Object.entries(runState.ownedRelics || {}).filter(([, n]) => (n ?? 0) > 0);
        if (owned.length <= 0) break;
        const rng = getEffectRng('ThiefStart', runState.level * 100 + i);
        const [id] = owned[Math.floor(rng() * owned.length)];
        const next = Math.max(0, (runState.ownedRelics[id] ?? 0) - 1);
        if (next <= 0) delete runState.ownedRelics[id];
        else runState.ownedRelics[id] = next;
        runState.stats.pendingToasts?.push({ kind: 'thief', id });
      }
    }

    return board;
  }
}

