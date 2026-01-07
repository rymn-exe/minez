// TeammateScene:
//  - First‑run “free collectible” picker. Shows three random collectibles (0g) with descriptions.
//  - Clicking a card increments that collectible in runState and starts the first level.
import Phaser from 'phaser';
import { VIEW_WIDTH } from '../game/consts';
import { RELICS } from '../game/items';
import { RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS, RELIC_UI_TEXT } from '../game/descriptions';
import { runState } from '../state';
import { getTeammateRng } from '../game/rngUtils';

type Offer = { id: string; label: string; desc: string };

export default class TeammateScene extends Phaser.Scene {
  private picked = false;

  constructor() {
    super('TeammateScene');
  }

  create() {
    // Reset per-run guard so picks work after restarts
    this.picked = false;
    this.cameras.main.setBackgroundColor('#14141c');
    // Subtle animated background dots (persisting style)
    {
      const colors = [0xa78bfa, 0x7dd3fc, 0x9ae6b4, 0xfca5a5, 0xf59e0b];
      for (let i = 0; i < 48; i++) {
        const x = Math.random() * this.scale.width;
        const y = Math.random() * this.scale.height;
        const r = 2 + Math.random() * 2;
        const c = colors[i % colors.length];
        const dot = this.add.circle(x, y, r, c, 1).setAlpha(0.0).setDepth(0);
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.0, to: 0.20 },
          duration: 1500 + Math.random() * 1500,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 2000,
          onYoyo: () => {
            dot.x += (Math.random() - 0.5) * 8;
            dot.y += (Math.random() - 0.5) * 6;
          }
        });
      }
    }

    this.add.text(24, 70, 'Pick a Collectible', {
      fontFamily: 'LTHoop',
      fontSize: '32px',
      color: '#a7f3d0'
    });

    // pick 3 random unique relics (deterministic based on seed)
    const pool = [...RELICS];
    const teammateRng = getTeammateRng();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(teammateRng() * (i + 1));
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
    const cardH = 150;

    // No hover bar on this screen; cards display their own descriptions

    const flipReveal = (containerObj: Phaser.GameObjects.GameObject, revealObjs: Phaser.GameObjects.GameObject[], after?: () => void) => {
      // First half: shrink just the blank card (back side visible)
      this.tweens.add({
        targets: [containerObj],
        scaleX: 0,
        duration: 250,
        ease: 'Sine.easeIn',
        onComplete: () => {
          // Reveal the front content at the midpoint
          revealObjs.forEach(o => (o as any).setVisible?.(true));
          // Second half: expand card + content together
          this.tweens.add({
            targets: [containerObj],
            scaleX: 1,
            duration: 250,
            ease: 'Sine.easeOut',
            onComplete: after
          });
        }
      });
    };

    const rarityById: Record<string, string> = {};
    for (const r of RELICS) rarityById[r.id] = r.rarity;
    const rarityColor = (rar: string) => {
      switch (rar) {
        case 'Common': return 0x9aa0a6;   // grey
        case 'Uncommon': return 0x7dd3fc; // cyan
        case 'Rare': return 0xa78bfa;     // purple
        case 'VeryRare': return 0xfca5a5; // pink/red
        default: return 0x9aa0a6;
      }
    };
    const groups: { cont: Phaser.GameObjects.Container; card: Phaser.GameObjects.Rectangle; title: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Text; desc: Phaser.GameObjects.Text }[] = [];
    offers.forEach((o, i) => {
      const x = marginX + i * (cardW + gapX);
      const y = 200; // push cards down so they don't overlap header text
      // Centered container so scaleX animates like a real flip
      const pcW = cardW;
      const pcH = Math.floor(cardW * 1.45);
      const cont = this.add.container(x + pcW / 2, y + pcH / 2);
      // Playing card ratio ~1:1.4
      const card = this.add.rectangle(-pcW / 2, -pcH / 2, pcW, pcH, 0x242430, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a3a46)
        .setInteractive({ useHandCursor: true });
      // Soften edges
      (card as any).setRadius?.(16);
      // Split "emoji name" into [emoji, name]
      const parts = o.label.split(' ');
      const emoji = parts.shift() || '';
      const name = parts.join(' ');
      // Header: collectible name (bigger)
      const titleText = this.add.text(0, -pcH / 2 + 14, name, {
        fontFamily: 'LTHoop',
        fontSize: '26px',
        color: '#e9e9ef'
      }).setOrigin(0.5, 0);
      // Big emoji icon
      const iconText = this.add.text(0, -pcH / 2 + 66, emoji, {
        fontFamily: 'LTHoop',
        fontSize: '58px',
        color: '#e9e9ef'
      }).setOrigin(0.5, 0);
      // Rarity pill
      const rar = rarityById[o.id] || 'Common';
      const pillW = 110;
      const pillH = 28;
      const pillY = -pcH / 2 + 66 + 58 + 8;
      const pillBg = this.add.rectangle(-pillW / 2, pillY, pillW, pillH, 0x1f2430).setOrigin(0, 0).setStrokeStyle(1, rarityColor(rar));
      (pillBg as any).setRadius?.(pillH / 2);
      const pillText = this.add.text(0, pillY, rar, {
        fontFamily: 'LTHoop',
        fontSize: '13px',
        color: '#e9e9ef'
      }).setOrigin(0.5, 0);
      // Center the text vertically within the pill for extra padding
      pillText.setY(pillY + Math.floor((pillH - pillText.height) / 2));
      // Description below icon
      const descText = this.add.text(0, pillY + pillH + 8, (RELIC_UI_TEXT[o.id] ?? RELIC_DESCRIPTIONS[o.id] ?? EXTRA_RELIC_DESCRIPTIONS[o.id] ?? ''), {
        fontFamily: 'LTHoop',
        fontSize: '16px',
        color: '#cfd2ff',
        wordWrap: { width: pcW - 36, useAdvancedWrap: true },
        align: 'center'
      }).setOrigin(0.5, 0);
      cont.add([card, titleText, iconText, pillBg, pillText, descText]);
      // For the entry animation, start with a blank back (hide front content)
      titleText.setVisible(false);
      iconText.setVisible(false);
      pillBg.setVisible(false);
      pillText.setVisible(false);
      descText.setVisible(false);
      card.on('pointerover', () => { card.setFillStyle(0x2f2f3a, 0.6); });
      card.on('pointerout', () => { card.setFillStyle(0x242430, 0.6); });
      card.on('pointerdown', () => {
        if (this.picked) return;
        this.picked = true;
        runState.ownedRelics[o.id] = (runState.ownedRelics[o.id] ?? 0) + 1;
        // Reveal content (no bright flash between scenes)
        titleText.setVisible(true);
        iconText.setVisible(true);
        pillBg.setVisible(true);
        pillText.setVisible(true);
        descText.setVisible(true);
        // Smooth fade to GameScene instead of green flash
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('GameScene');
        });
        this.cameras.main.fadeOut(150, 0, 0, 0);
        });
      groups.push({ cont, card, title: titleText, icon: iconText, desc: descText });
    });
    // On load: after a short intro delay, flip each card left-to-right in sequence
    const introDelay = 300;
    groups.forEach((g, idx) => {
      this.time.delayedCall(introDelay + idx * 250, () => flipReveal(g.cont, [g.title, g.icon, ...g.cont.list.filter(el => el !== g.card) as any, g.desc]));
    });
  }
}


