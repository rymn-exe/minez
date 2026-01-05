// ChallengeScene:
//  - Draft screen shown after each Shop (before the next level)
//  - Player selects 1 of 2 challenge tiles; selection is added to the run's drafted challenge pool
//  - Drafted challenges then spawn on future boards (see generation.ts)
import Phaser from 'phaser';
import { VIEW_WIDTH } from '../game/consts';
import { ChallengeId } from '../game/types';
import { CHALLENGE_DESCRIPTIONS, CHALLENGE_UI_TEXT } from '../game/descriptions';
import { runState } from '../state';
import { getChallengeRng } from '../game/rngUtils';

type Offer = { id: string; label: string; desc: string };

export default class ChallengeScene extends Phaser.Scene {
  private picked = false;

  constructor() {
    super('ChallengeScene');
  }

  private challengeLabel(id: string): string {
    // Keep in sync with Manifest/GameScene labels (fine if slightly different)
    switch (id) {
      case String(ChallengeId.AutoGrat): return '💸 Auto Grat';
      case String(ChallengeId.MathTest): return '☠️ Math Test';
      case String(ChallengeId.BadDeal): return '💱 Bad Deal';
      case String(ChallengeId.Clover2): return '🍀 2-Leaf Clover';
      case String(ChallengeId.SnakeOil): return '🧴 Snake Oil';
      case String(ChallengeId.SnakeVenom): return '🐍 Snake Venom';
      case String(ChallengeId.BloodPact): return '🩸 Blood Pact';
      case String(ChallengeId.CarLoan): return '🚗 Car Loan';
      case String(ChallengeId.MegaMine): return '💥 MegaMine';
      case String(ChallengeId.BloodDiamond): return '🔻 Blood Diamond';
      case String(ChallengeId.FindersFee): return '🫴 Finder’s Fee';
      case String(ChallengeId.ATMFee): return '🏧 ATM Fee';
      case String(ChallengeId.BoxingDay): return '🥊 Boxing Day';
      case String(ChallengeId.Thief): return '🦝 Thief';
      case String(ChallengeId.Jackhammer): return '🛠️ Jackhammer';
      case String(ChallengeId.DonationBox): return '🎁 Donation Box';
      case String(ChallengeId.Appraisal): return '📏 Appraisal';
      case String(ChallengeId.Key): return '🔑 Key';
      // Disabled / excluded (shouldn't appear)
      case String(ChallengeId.Coal): return '🪨 Coal';
      case String(ChallengeId.Stopwatch): return '⏱️ Stopwatch';
      default: return id;
    }
  }

  create() {
    this.picked = false;
    this.cameras.main.setBackgroundColor('#14141c');

    const flipReveal = (containerObj: Phaser.GameObjects.GameObject, revealObjs: Phaser.GameObjects.GameObject[], after?: () => void) => {
      this.tweens.add({
        targets: [containerObj],
        scaleX: 0,
        duration: 250,
        ease: 'Sine.easeIn',
        onComplete: () => {
          revealObjs.forEach(o => (o as any).setVisible?.(true));
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

    // Subtle animated background dots (matches other menus)
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

    this.add.text(24, 70, 'Pick a Challenge Tile', {
      fontFamily: 'LTHoop',
      fontSize: '32px',
      color: '#fca5a5'
    });
    this.add.text(24, 100, 'Choose 1 challenge tile. It can spawn on all future boards.', {
      fontFamily: 'LTHoop',
      fontSize: '16px',
      color: '#cfd2ff'
    });

    // Build the eligible pool (exclude Coal only)
    const all = Object.values(ChallengeId).map(String);
    const eligible = all.filter(id => id !== String(ChallengeId.Coal));

    // Deterministically pick 2 unique offers
    const rng = getChallengeRng();
    const pool = eligible.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const offers: Offer[] = pool.slice(0, 2).map(id => ({
      id,
      label: this.challengeLabel(id),
      desc: (CHALLENGE_UI_TEXT[id] ?? CHALLENGE_DESCRIPTIONS[id] ?? '')
    }));

    const cols = 2;
    const gapX = 24;
    const y = 190;
    const marginBottom = 24;
    // Fit cards to the viewport height so the bottom border never clips.
    const ratio = 1.32; // playing-card-ish ratio; slightly shorter than teammate screen to fit reliably
    const maxH = Math.max(260, this.scale.height - y - marginBottom);
    const maxW = VIEW_WIDTH - 48; // horizontal padding
    // Start by sizing from width, then clamp to height and recompute width from clamped height.
    const idealW = Math.floor((maxW - gapX * (cols - 1)) / cols);
    const idealH = Math.floor(idealW * ratio);
    const pcH = Math.min(idealH, maxH);
    const pcW = Math.floor(pcH / ratio);
    const totalW = cols * pcW + gapX * (cols - 1);
    const startX = Math.floor((VIEW_WIDTH - totalW) / 2);

    const groups: { cont: Phaser.GameObjects.Container; card: Phaser.GameObjects.Rectangle; reveal: Phaser.GameObjects.GameObject[] }[] = [];
    offers.forEach((o, i) => {
      const x = startX + i * (pcW + gapX);
      const cont = this.add.container(x + pcW / 2, y + pcH / 2);

      const card = this.add.rectangle(-pcW / 2, -pcH / 2, pcW, pcH, 0x242430, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a3a46)
        .setInteractive({ useHandCursor: true });
      (card as any).setRadius?.(16);

      const parts = o.label.split(' ');
      const emoji = parts.shift() || '';
      const name = parts.join(' ');

      const titleText = this.add.text(0, -pcH / 2 + 16, name, {
        fontFamily: 'LTHoop',
        fontSize: '26px',
        color: '#e9e9ef'
      }).setOrigin(0.5, 0);

      const iconText = this.add.text(0, -pcH / 2 + 66, emoji, {
        fontFamily: 'LTHoop',
        fontSize: '58px',
        color: '#e9e9ef'
      }).setOrigin(0.5, 0);

      const descText = this.add.text(0, -pcH / 2 + 150, o.desc, {
        fontFamily: 'LTHoop',
        fontSize: '16px',
        color: '#cfd2ff',
        wordWrap: { width: pcW - 36, useAdvancedWrap: true },
        align: 'center'
      }).setOrigin(0.5, 0);

      const owned = runState.ownedChallenges[o.id] ?? 0;
      const ownedText = this.add.text(0, pcH / 2 - 28, owned > 0 ? `In pool: x${owned}` : 'Not in pool yet', {
        fontFamily: 'LTHoop',
        fontSize: '14px',
        color: '#9aa0a6'
      }).setOrigin(0.5, 0.5);

      cont.add([card, titleText, iconText, descText, ownedText]);
      // For the entry animation, start with a blank back (hide front content)
      titleText.setVisible(false);
      iconText.setVisible(false);
      descText.setVisible(false);
      ownedText.setVisible(false);

      card.on('pointerover', () => { card.setFillStyle(0x2f2f3a, 0.6); });
      card.on('pointerout', () => { card.setFillStyle(0x242430, 0.6); });
      card.on('pointerdown', () => {
        if (this.picked) return;
        this.picked = true;
        runState.ownedChallenges[o.id] = (runState.ownedChallenges[o.id] ?? 0) + 1;
        // Reveal content if user clicks before flip animation completes
        titleText.setVisible(true);
        iconText.setVisible(true);
        descText.setVisible(true);
        ownedText.setVisible(true);
        // Fade into the next level
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('GameScene');
        });
        this.cameras.main.fadeOut(150, 0, 0, 0);
      });

      groups.push({ cont, card, reveal: [titleText, iconText, descText, ownedText] });
    });

    // On load: after a short intro delay, flip each card left-to-right in sequence
    const introDelay = 260;
    groups.forEach((g, idx) => {
      this.time.delayedCall(introDelay + idx * 220, () => flipReveal(g.cont, g.reveal));
    });
  }
}


