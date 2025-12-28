import Phaser from 'phaser';
import { runState } from '../state';
import { SHOP_TILES, RELICS } from '../game/items';
import { ChallengeId } from '../game/types';
import { TILE_DESCRIPTIONS, CHALLENGE_DESCRIPTIONS, RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS } from '../game/descriptions';

export class ManifestPanel {
  private scene: Phaser.Scene;
  private statsText: Phaser.GameObjects.Text;
  private shopTexts: Phaser.GameObjects.Text[] = [];
  private challengeTexts: Phaser.GameObjects.Text[] = [];
  private relicTexts: Phaser.GameObjects.Text[] = [];
  private tooltipText: Phaser.GameObjects.Text;
  private x: number;
  private y: number;
  private contentBottomY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.statsText = scene.add.text(x, y, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0);
    this.tooltipText = scene.add.text(x, y, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#cfd2ff',
      wordWrap: { width: 190, useAdvancedWrap: true }
    }).setOrigin(0, 0);
    this.refresh();
  }

  refresh() {
    // Top stats
    const lines = [
      `Lives: ${runState.lives}`,
      `Gold: ${runState.gold}`,
      `Level: ${runState.level}`,
      `Mines: ${runState.stats.minesTotal}`,
      `Ore: ${runState.stats.oreTotal}`,
      `X: ${runState.stats.xRemaining}`
    ];
    this.statsText.setText(lines.join('\n'));
    let cursorY = this.statsText.getBounds().bottom + 4;

    // Clear previous lists
    this.shopTexts.forEach(t => t.destroy());
    this.challengeTexts.forEach(t => t.destroy());
    this.relicTexts.forEach(t => t.destroy());
    this.shopTexts = [];
    this.challengeTexts = [];
    this.relicTexts = [];
    this.tooltipText.setText('');

    // Shop breakdown
    const shopLabelById: Record<string, string> = {};
    for (const t of SHOP_TILES) shopLabelById[t.id] = t.label;
    // Show all owned shop tiles, even if count is 0 this level
    const ownedShopIds = Object.keys(runState.ownedShopTiles || {});
    if (ownedShopIds.length > 0) {
      this.shopTexts.push(this.scene.add.text(this.x, cursorY, 'Shop Tiles:', { fontFamily: 'monospace', fontSize: '14px', color: '#a78bfa' }).setOrigin(0, 0));
      cursorY += 16;
      const displayIds = Array.from(new Set<string>([...ownedShopIds, ...Object.keys(runState.stats.shopCounts || {})]));
      for (const id of displayIds.sort((a, b) => (shopLabelById[a] || a).localeCompare(shopLabelById[b] || b))) {
        const n = runState.stats.shopCounts[id] ?? 0;
        const txt = this.scene.add.text(this.x + 12, cursorY, `${shopLabelById[id] ?? id}: ${n}`, { fontFamily: 'monospace', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0);
        txt.setInteractive({ useHandCursor: true });
        const desc = TILE_DESCRIPTIONS[id] ?? '';
        txt.on('pointerover', () => this.tooltipText.setText(desc));
        txt.on('pointerout', () => this.tooltipText.setText(''));
        this.shopTexts.push(txt);
        cursorY += 16;
      }
    } else {
      this.shopTexts.push(this.scene.add.text(this.x, cursorY, 'Shop Tiles: 0', { fontFamily: 'monospace', fontSize: '14px', color: '#a78bfa' }).setOrigin(0, 0));
      cursorY += 16;
    }

    // Challenge breakdown
    const challengeLabel = (id: string) => {
      switch (id) {
        case ChallengeId.AutoGrat: return '💸 Auto Grat';
        // Stopwatch disabled for now
        case ChallengeId.MathTest: return '☠️ Math Test';
        case ChallengeId.BadDeal: return '💱 Bad Deal';
        case ChallengeId.Clover2: return '🍀 2-Leaf Clover';
        case ChallengeId.SnakeOil: return '🧴 Snake Oil';
        case ChallengeId.SnakeVenom: return '🐍 Snake Venom';
        case ChallengeId.BloodPact: return '🩸 Blood Pact';
        case ChallengeId.CarLoan: return '🚗 Car Loan';
        case ChallengeId.MegaMine: return '💥 MegaMine';
        default: return id;
      }
    };
    // Show active challenge counts (Stopwatch removed)
    const challengeEntries = Object.entries(runState.stats.challengeCounts)
      .filter(([id]) => id !== String(ChallengeId.Stopwatch))
      .filter(([, n]) => n > 0);
    if (challengeEntries.length > 0) {
      this.challengeTexts.push(this.scene.add.text(this.x, cursorY, 'Challenges:', { fontFamily: 'monospace', fontSize: '14px', color: '#a7f3d0' }).setOrigin(0, 0));
      cursorY += 16;
      for (const [id, n] of challengeEntries.sort((a, b) => challengeLabel(a[0]).localeCompare(challengeLabel(b[0])))) {
        const txt = this.scene.add.text(this.x + 12, cursorY, `${challengeLabel(id)}: ${n}`, { fontFamily: 'monospace', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0);
        txt.setInteractive({ useHandCursor: true });
        const desc = CHALLENGE_DESCRIPTIONS[id] ?? '';
        txt.on('pointerover', () => this.tooltipText.setText(desc));
        txt.on('pointerout', () => this.tooltipText.setText(''));
        this.challengeTexts.push(txt);
        cursorY += 16;
      }
    } else {
      this.challengeTexts.push(this.scene.add.text(this.x, cursorY, 'Challenges: 0', { fontFamily: 'monospace', fontSize: '14px', color: '#a7f3d0' }).setOrigin(0, 0));
      cursorY += 16;
    }

    // Relics breakdown (owned relics with stack counts)
    const relicLabelById: Record<string, string> = {};
    for (const r of RELICS) relicLabelById[r.id] = r.label;
    const ownedRelics = runState.ownedRelics || {};
    const relicIds = Object.keys(ownedRelics);
    if (relicIds.length > 0) {
      this.relicTexts.push(this.scene.add.text(this.x, cursorY, 'Relics:', { fontFamily: 'monospace', fontSize: '14px', color: '#7dd3fc' }).setOrigin(0, 0));
      cursorY += 16;
      for (const id of relicIds.sort((a, b) => (relicLabelById[a] || a).localeCompare(relicLabelById[b] || b))) {
        const n = ownedRelics[id] ?? 0;
        const countSuffix = n > 1 ? ` ×${n}` : '';
        const txt = this.scene.add.text(this.x + 12, cursorY, `${relicLabelById[id] ?? id}${countSuffix}`, { fontFamily: 'monospace', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0);
        txt.setInteractive({ useHandCursor: true });
        const desc = (RELIC_DESCRIPTIONS as any)[id] ?? (EXTRA_RELIC_DESCRIPTIONS as any)[id] ?? '';
        txt.on('pointerover', () => this.tooltipText.setText(desc));
        txt.on('pointerout', () => this.tooltipText.setText(''));
        this.relicTexts.push(txt);
        cursorY += 16;
      }
    }
    // Record bottom of content (for positioning other panels)
    this.contentBottomY = cursorY;
    // Tooltip anchored near bottom of the side column (like shop), not affecting layout
    const tooltipTop = Math.max(this.y, this.scene.scale.height - 110);
    this.tooltipText.setPosition(this.x, tooltipTop);
  }

  getBottomY(): number {
    return this.contentBottomY;
  }
}


