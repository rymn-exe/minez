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
    levelResolver.reset();

    // Activate start-of-level relics
    const relicActivator = new RelicActivator(board, revealTile);
    relicActivator.activateStartOfLevel();

    return board;
  }
}

