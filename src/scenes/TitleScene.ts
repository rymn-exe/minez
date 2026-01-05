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
  private started = false;

  create() {
    // Reset start guard when returning to title
    this.started = false;
    this.cameras.main.setBackgroundColor('#0f0f13');

    // Animated title: gentle per-letter wave
    {
      const titleText = 'MINEZ';
      const style = { fontFamily: 'GrapeSoda', fontSize: '72px', color: '#e9e9ef' } as Phaser.Types.GameObjects.Text.TextStyle;
      const baselineY = 180;
      const letterObjs: Phaser.GameObjects.Text[] = [];
      // First measure total width
      const tempLetters = titleText.split('').map(ch => this.add.text(0, 0, ch, style).setOrigin(0, 0.5).setVisible(false));
      const spacing = 4;
      const totalW = tempLetters.reduce((w, t) => w + t.width, 0) + spacing * (tempLetters.length - 1);
      const startX = VIEW_WIDTH / 2 - totalW / 2;
      // Position visible letters and destroy temps
      let xCursor = startX;
      tempLetters.forEach(t => {
        const ch = t.text;
        t.destroy();
        const letter = this.add.text(xCursor, baselineY, ch, style).setOrigin(0, 0.5);
        letterObjs.push(letter);
        xCursor += letter.width + spacing;
      });
      // Gentle wave
      const amplitude = 6;
      letterObjs.forEach((letter, idx) => {
        this.tweens.add({
          targets: letter,
          y: baselineY - amplitude,
          duration: 1000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          delay: idx * 120
        });
      });
    }

    // Subtitle removed per request

    // Start button as a container with a rounded background graphics
    const startCont = this.add.container(VIEW_WIDTH / 2, 360).setDepth(1000);
    const startGfx = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      startGfx.clear();
      startGfx.lineStyle(1, 0x3a3a46, 1);
      startGfx.fillStyle(hover ? 0x353542 : 0x2a2a34, 1);
      // draw centered rounded rect (260x56, radius 10)
      startGfx.fillRoundedRect(-130, -28, 260, 56, 10);
      startGfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    const startText = this.add.text(0, 0, 'Start', { fontFamily: 'LTHoop', fontSize: '24px', color: '#9ae6b4' }).setOrigin(0.5);
    startCont.add([startGfx, startText]);
    // Create a larger invisible zone above the button for rock-solid hover/click
    const startZone = this.add.zone(VIEW_WIDTH / 2, 360, 340, 100)
      .setOrigin(0.5)
      .setDepth(1100)
      .setInteractive({ useHandCursor: true });
    startZone.on('pointerover', () => drawBtn(true));
    startZone.on('pointerout', () => drawBtn(false));
    const beginRun = () => {
      if (this.started) return;
      this.started = true;
      // Debug trace to diagnose input issues in the wild
      // eslint-disable-next-line no-console
      console.log('[Minez] Starting new run → TeammateScene');
      // Reset run state for a fresh run
      // New seed per run so consecutive runs don't look identical.
      runState.seed = Math.floor(Math.random() * 2 ** 31);
      runState.rngState = 0;
      runState.level = 1;
      runState.lives = 3;
      runState.gold = 0;
      runState.ownedShopTiles = {};
      runState.ownedRelics = {};
      runState.ownedChallenges = {};
      runState.shopFreePurchases = 0;
      runState.persistentEffects = {
        carLoan: false,
        snakeVenom: { active: false, revealsUntilHit: 8 },
        mathTest: false,
        snakeOil: false,
        stopwatchCount: 0,
        scratchcardStacks: 0,
        optimistUsedThisLevel: false,
        pokerChipUsedThisLevel: false,
        tarotCard: false,
        rerolledThisShop: false,
        noEndGold: false,
        atmFee: false,
        bloodDiamond: false,
        donationBoxStacks: 0,
        appraisal: false,
        shopRerollCount: 0,
        cheatSheetStacks: 0,
        luckyPennyStacks: 0,
        nineToFiveStacks: 0
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
    startZone.on('pointerdown', beginRun);
    // Subtle animated background dots
    {
      const colors = [0xa78bfa, 0x7dd3fc, 0x9ae6b4, 0xfca5a5, 0xf59e0b];
      for (let i = 0; i < 64; i++) {
        const x = Math.random() * VIEW_WIDTH;
        const y = Math.random() * VIEW_HEIGHT;
        const r = 2 + Math.random() * 2;
        const c = colors[i % colors.length];
        const dot = this.add.circle(x, y, r, c, 1).setAlpha(0.0).setDepth(0);
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.0, to: 0.22 },
          duration: 1500 + Math.random() * 1500,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 2000,
          onYoyo: () => {
            // small drift
            dot.x += (Math.random() - 0.5) * 8;
            dot.y += (Math.random() - 0.5) * 6;
          }
        });
      }
    }
    // Also allow keyboard to start (does not auto-advance)
    this.input.keyboard?.once('keydown-ENTER', beginRun);
    this.input.keyboard?.once('keydown-SPACE', beginRun);
    
    // Press 'B' to view button previews
    this.input.keyboard?.once('keydown-B', () => {
      this.scene.start('ButtonPreviewScene');
    });

    // Version label (bottom-right) in title font
    {
      const m = (document.title || '').match(/v[\d.]+/);
      const ver = m ? m[0] : '';
      if (ver) {
        this.add.text(VIEW_WIDTH - 12, VIEW_HEIGHT - 10, ver, {
          fontFamily: 'GrapeSoda',
          fontSize: '20px',
          color: '#e9e9ef'
        }).setOrigin(1, 1).setAlpha(0.9);
      }
    }
    
    // Hint to view button previews
    this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 30, 'Press B to view button styles', {
      fontFamily: 'LTHoop',
      fontSize: '12px',
      color: '#9aa0a6'
    }).setOrigin(0.5, 1).setAlpha(0.7);
  }

  private drawButtonLabel(text: string, rect: Phaser.GameObjects.Rectangle) {
    const label = this.add.text(rect.x, rect.y, text, {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    return label;
  }
}


