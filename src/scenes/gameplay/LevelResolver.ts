// LevelResolver: Handles end-of-level logic and collectible checks
// Extracted from GameScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { Board, TileKind } from '../../game/types';
import { runState } from '../../state';
import { VIEW_WIDTH, VIEW_HEIGHT, FINAL_LEVEL } from '../../game/consts';

export class LevelResolver {
  private cartographerAwarded: boolean = false;
  public board!: Board;

  constructor(
    private scene: Phaser.Scene,
    board: Board | null,
    private manifest: { refresh: () => void }
  ) {
    if (board) this.board = board;
  }

  resolveLevel(survived: boolean): void {
    if (survived) {
      this.checkResurrector();
      this.checkMinimalist();
      this.checkVexillologist();
      this.checkCartographer();
    }

    // Telemetry
    // eslint-disable-next-line no-console
    console.log('[Minez] Level resolved. Survived:', survived, 'Lives:', runState.lives, 'Gold:', runState.gold);

    if (!survived) {
      this.showEndScreen(false);
      return;
    }

    // Win after final level
    if (runState.level >= FINAL_LEVEL) {
      this.showEndScreen(true);
      return;
    }

    // Reset per-shop reroll usage when entering a fresh shop
    runState.persistentEffects.rerolledThisShop = false;
    runState.persistentEffects.shopRerollCount = 0;
    (runState.persistentEffects as any).buyLifeBoughtThisShop = false;
    (this.scene as Phaser.Scene).scene.start('ShopScene');
  }

  private checkResurrector(): void {
    // Resurrector: if end level with 1 life -> +1 life per stack
    if (runState.lives === 1) {
      const stacks = runState.ownedRelics['Resurrector'] ?? 0;
      if (stacks > 0) {
        runState.lives += stacks;
        this.manifest.refresh();
      }
    }
  }

  private checkMinimalist(): void {
    // Minimalist: reveal no special tiles -> +6 gold per stack
    const mini = runState.ownedRelics['Minimalist'] ?? 0;
    if (mini > 0 && runState.stats.specialRevealedThisLevel === 0) {
      runState.gold += 6 * mini;
    }
  }

  private checkVexillologist(): void {
    // Vexillologist: all real mines flagged and zero incorrect flags -> +5 gold per stack
    const vex = runState.ownedRelics['Vexillologist'] ?? 0;
    if (vex > 0) {
      const allMines = this.board.tiles.filter(t => t.kind === TileKind.Mine);
      const allFlagged = allMines.every(t => t.flagged);
      const anyWrongFlags = this.board.tiles.some(t => t.flagged && t.kind !== TileKind.Mine);
      if (allFlagged && !anyWrongFlags) {
        runState.gold += 5 * vex;
      }
    }
  }

  private checkCartographer(): void {
    // Cartographer: reveal all 4 corners -> +5 gold per stack
    const carto = runState.ownedRelics['Cartographer'] ?? 0;
    if (carto > 0 && !this.cartographerAwarded) {
      const w = this.board.width, h = this.board.height;
      const corners = [
        this.board.tiles[0],
        this.board.tiles[w - 1],
        this.board.tiles[(h - 1) * w],
        this.board.tiles[h * w - 1]
      ];
      if (corners.every(t => t.revealed)) {
        runState.gold += 5 * carto;
        this.cartographerAwarded = true;
      }
    }
  }

  showEndScreen(win: boolean): void {
    // Dim background and block clicks to underlying board
    const blocker = this.scene.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.55)
      .setDepth(6000)
      .setInteractive();
    const title = this.scene.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 14, win ? 'You Win!' : 'You Lose', {
      fontFamily: 'LTHoop',
      fontSize: '40px',
      color: '#e9e9ef'
    }).setOrigin(0.5).setDepth(6001);
    // Restart button
    const restartZone = this.scene.add.zone(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 30, 180, 44).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(6001);
    const btnBg = this.scene.add.graphics().setDepth(6001);
    btnBg.lineStyle(1, 0x3a3a46, 1);
    btnBg.fillStyle(0x2a2a34, 1);
    btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    const restartText = this.scene.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 30, 'Restart', {
      fontFamily: 'LTHoop',
      fontSize: '20px',
      color: '#fca5a5'
    }).setOrigin(0.5).setDepth(6002);
    restartZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.lineStyle(1, 0x3a3a46, 1);
      btnBg.fillStyle(0x353542, 1);
      btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
      btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    });
    restartZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.lineStyle(1, 0x3a3a46, 1);
      btnBg.fillStyle(0x2a2a34, 1);
      btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
      btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    });
    restartZone.on('pointerdown', () => (this.scene as Phaser.Scene).scene.start('TitleScene'));
  }

  reset(): void {
    this.cartographerAwarded = false;
  }

  hasCartographerAwarded(): boolean {
    return this.cartographerAwarded;
  }

  markCartographerAwarded(): void {
    this.cartographerAwarded = true;
  }
}

