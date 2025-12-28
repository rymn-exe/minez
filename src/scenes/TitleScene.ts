// TitleScene:
//  - Shows the game title and a single Start button
//  - On Start, resets run state and routes to the Teammate scene
import Phaser from 'phaser';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../game/consts';
import { runState } from '../state';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f13');

    this.add.text(VIEW_WIDTH / 2, 180, 'MINEZ', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#e9e9ef'
    }).setOrigin(0.5);

    this.add.text(VIEW_WIDTH / 2, 240, 'Roguelike Minesweeper', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const startBtn = this.add.rectangle(VIEW_WIDTH / 2, 360, 260, 56, 0x2a2a34)
      .setStrokeStyle(1, 0x3a3a46)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    const startText = this.drawButtonLabel('Start', startBtn);
    startText.setDepth(11);

    startBtn.on('pointerover', () => startBtn.setFillStyle(0x353542));
    startBtn.on('pointerout', () => startBtn.setFillStyle(0x2a2a34));
    const beginRun = () => {
      // Guard against multiple starts
      if (this.scene.isActive('TeammateScene')) return;
      // Debug trace to diagnose input issues in the wild
      // eslint-disable-next-line no-console
      console.log('[Minez] Starting new run → TeammateScene');
      // Reset run state for a fresh run
      runState.level = 1;
      runState.lives = 3;
      runState.gold = 0;
      runState.ownedShopTiles = {};
      runState.ownedRelics = {};
      runState.shopFreePurchases = 0;
      runState.persistentEffects = {
        carLoan: false,
        snakeVenom: { active: false, revealsUntilHit: 8 },
        mathTest: false,
        snakeOil: false,
        stopwatchCount: 0,
        scratchcardStacks: 0,
        optimistUsedThisLevel: false,
        pokerChipUsedThisLevel: false
      };
      runState.stats = {
        revealedCount: 0,
        minesFlagged: 0,
        minesTotal: 0,
        oreTotal: 0,
        xRemaining: 1,
        shopTilesRemaining: 0,
        challengeTilesRemaining: 0,
        shopCounts: {},
        challengeCounts: {},
        specialRevealedThisLevel: 0
      };
      this.scene.start('TeammateScene');
    };
    startBtn.on('pointerdown', beginRun);
    // Also make the label clickable for convenience
    startText.setInteractive({ useHandCursor: true }).on('pointerdown', beginRun);
    // Optional: allow keyboard and click-anywhere to start to avoid focus issues
    this.input.keyboard?.once('keydown-ENTER', beginRun);
    this.input.keyboard?.once('keydown-SPACE', beginRun);
    this.input.keyboard?.once('keydown', beginRun);
    // As a last resort, clicking anywhere on the background starts the run
    this.input.once('pointerdown', (p: Phaser.Input.Pointer, g: any) => {
      // If the user clicked the button/label, the handler above already ran
      // Only fire if we haven't switched scenes yet
      if (!this.scene.isActive('TeammateScene')) beginRun();
    });
    // Final fallback: auto-advance after a short delay if nothing was clickable
    this.time.delayedCall(2000, () => {
      if (!this.scene.isActive('TeammateScene')) beginRun();
    });
  }

  private drawButtonLabel(text: string, rect: Phaser.GameObjects.Rectangle) {
    const label = this.add.text(rect.x, rect.y, text, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    return label;
  }
}


