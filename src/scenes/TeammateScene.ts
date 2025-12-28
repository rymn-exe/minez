// TeammateScene:
//  - First‑run “free relic” picker. Shows three random relics (0g) with descriptions.
//  - Clicking a card increments that relic in runState and starts the first level.
import Phaser from 'phaser';
import { VIEW_WIDTH } from '../game/consts';
import { RELICS } from '../game/items';
import { RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS } from '../game/descriptions';
import { runState } from '../state';

type Offer = { id: string; label: string; desc: string };

export default class TeammateScene extends Phaser.Scene {
  private picked = false;

  constructor() {
    super('TeammateScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#14141c');

    this.add.text(24, 24, 'MINEZ', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e9e9ef'
    });
    this.add.text(24, 70, 'Select a Teammate', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#a7f3d0'
    });
    this.add.text(24, 100, 'Pick one relic to start your run. It\'s free.', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#cfd2ff'
    });

    // pick 3 random unique relics
    const pool = [...RELICS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Do not allow Sugar Daddy as a free teammate pick
    const offers: Offer[] = pool.filter(r => r.id !== 'SugarDaddy').slice(0, 3).map(r => ({
      id: r.id,
      label: r.label,
      desc: (RELIC_DESCRIPTIONS[r.id] ?? EXTRA_RELIC_DESCRIPTIONS[r.id] ?? '')
    }));

    // Responsive 3-column layout so the 3rd card never clips
    const marginX = 24;
    const cols = 3;
    const gapX = 16;
    const baseY = 150;
    const available = VIEW_WIDTH - marginX * 2 - gapX * (cols - 1);
    const cardW = Math.floor(available / cols);
    const cardH = 130;

    offers.forEach((o, i) => {
      const x = marginX + i * (cardW + gapX);
      const y = baseY;
      const card = this.add.rectangle(x, y, cardW, cardH, 0x242430)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a3a46)
        .setInteractive({ useHandCursor: true });
      this.add.text(x + 12, y + 12, `${o.label} — 0g`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e9e9ef'
      });
      this.add.text(x + 12, y + 42, o.desc, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cfd2ff',
        wordWrap: { width: cardW - 24, useAdvancedWrap: true }
      });
      card.on('pointerover', () => card.setFillStyle(0x2f2f3a));
      card.on('pointerout', () => card.setFillStyle(0x242430));
      card.on('pointerdown', () => {
        if (this.picked) return;
        this.picked = true;
        runState.ownedRelics[o.id] = (runState.ownedRelics[o.id] ?? 0) + 1;
        this.cameras.main.flash(150, 150, 255, 150);
        this.time.delayedCall(200, () => {
          this.scene.start('GameScene');
        });
      });
    });
  }
}


