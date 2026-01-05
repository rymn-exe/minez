// RelicActivator: Handles start-of-level relic activations
// Extracted from GameScene to reduce file size and improve maintainability
import { Board, TileKind } from '../../game/types';
import { runState } from '../../state';
import { revealTile } from '../../game/reveal';
import { createRng } from '../../game/rng';

export class RelicActivator {
  constructor(
    private board: Board,
    private revealTileFn: (board: Board, x: number, y: number) => void
  ) {}

  activateStartOfLevel(): void {
    this.activatePioneer();
    this.activateCheapskate();
    this.activateDebtCollector();
    this.activateFortuneTeller();
    this.activateMathematician();
    this.activateResearcher();
  }

  private activatePioneer(): void {
    const pioneer = runState.ownedRelics['Pioneer'] ?? 0;
    if (pioneer === 0) return;

    let idx = this.board.tiles.findIndex(t => t.kind === TileKind.Mine && !t.flagged);
    if (idx < 0) {
      idx = this.board.tiles.findIndex(t => t.kind === TileKind.Challenge && t.subId === 'Clover2' && !t.flagged);
    }
    if (idx >= 0) {
      const picked = this.board.tiles[idx];
      picked.flagged = true;
      if (picked.kind === TileKind.Mine) {
        runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
      }
    }
  }

  private activateCheapskate(): void {
    const cheapskate = runState.ownedRelics['Cheapskate'] ?? 0;
    if (cheapskate > 0 && runState.gold >= 10) {
      runState.lives += cheapskate;
    }
  }

  private activateDebtCollector(): void {
    const debt = runState.ownedRelics['DebtCollector'] ?? 0;
    if (debt > 0 && runState.gold < 0) {
      runState.lives += debt;
    }
  }

  private activateFortuneTeller(): void {
    const fortune = runState.ownedRelics['FortuneTeller'] ?? 0;
    if (fortune === 0) return;

    const idxOre = this.board.tiles.findIndex(t => t.kind === TileKind.Ore && !t.revealed);
    if (idxOre >= 0) {
      const p = this.board.tiles[idxOre].pos;
      this.revealTileFn(this.board, p.x, p.y);
    }
  }

  private activateMathematician(): void {
    const math = runState.ownedRelics['Mathematician'] ?? 0;
    if (math === 0) return;

    let maxNum = -1;
    for (const t of this.board.tiles) {
      if (!t.revealed && t.kind === TileKind.Number) {
        if (t.number > maxNum) maxNum = t.number;
      }
    }
    if (maxNum > 0) {
      const candidates = this.board.tiles.filter(t => !t.revealed && t.kind === TileKind.Number && t.number === maxNum);
      if (candidates.length > 0) {
        // Use seeded RNG for deterministic selection
        const rand = createRng(runState.seed + runState.level + 1000); // Offset to avoid conflicts
        const pick = candidates[Math.floor(rand() * candidates.length)];
        this.revealTileFn(this.board, pick.pos.x, pick.pos.y);
      }
    }
  }

  private activateResearcher(): void {
    const researcher = runState.ownedRelics['Researcher'] ?? 0;
    if (researcher === 0) return;

    const idx = this.board.tiles.findIndex(t => t.kind === TileKind.Challenge && !t.flagged && !t.revealed);
    if (idx >= 0) {
      this.board.tiles[idx].flagged = true;
      this.board.tiles[idx].flagColor = 'yellow';
    }
  }
}

