// BoardSetup: Handles board generation and initialization
// Extracted from GameScene to reduce file size and improve maintainability
import { Board } from '../../game/types';
import { generateLevel } from '../../game/generation';
import { bindBoardForShopEffects } from '../../game/reveal';
import { runState } from '../../state';
import { RelicActivator } from './RelicActivator';
import { revealTile } from '../../game/reveal';
import { LevelResolver } from './LevelResolver';

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
    runState.persistentEffects.optimistUsedThisLevel = false;
    // Reset per-level shop/challenge toggles that should not persist across levels
    runState.persistentEffects.scratchcardStacks = 0;
    runState.persistentEffects.tarotCard = false;
    runState.persistentEffects.pokerChipUsedThisLevel = false;
    runState.persistentEffects.cheatSheetStacks = 0;
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

    return board;
  }
}

