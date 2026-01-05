// OfferRenderer: Handles offer card rendering and grid layout
// Extracted from ShopScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { TILE_DESCRIPTIONS, RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, RELIC_UI_TEXT, TILE_UI_TEXT } from '../../game/descriptions';

type Offer = { type: 'tile' | 'relic' | 'service'; id: string; price: number; label: string };

export interface OfferEntry {
  offer: Offer;
  priceText: Phaser.GameObjects.Text;
}

export class OfferRenderer {
  private offerEntries: OfferEntry[] = [];

  constructor(
    private scene: Phaser.Scene,
    private iconFor: (id: string) => string,
    private displayName: (label: string) => string,
    private drawCoin: (x: number, y: number, radius?: number) => Phaser.GameObjects.GameObject,
    private effectivePrice: (offer: Offer) => number,
    private setHover: (name: string, kind: 'tile' | 'relic' | 'service', desc: string) => void,
    private clearHover: () => void,
    private purchaseAndRefresh: (offer: Offer) => void
  ) {}

  renderOffersGrid(
    offers: Offer[],
    startX: number,
    startY: number,
    boxWidth: number,
    cols: number,
    colGap: number,
    rowGap: number
  ): number {
    let x = startX;
    let y = startY;
    let col = 0;
    const cardW = Math.floor((boxWidth - (cols - 1) * colGap) / cols);
    const cardH = 88;
    offers.forEach((offer) => {
      this.renderOfferCard(offer, x, y, cardW, cardH);
      col++;
      if (col >= cols) {
        col = 0;
        x = startX;
        y += cardH + rowGap;
      } else {
        x += cardW + colGap;
      }
    });
    return y + cardH;
  }

  renderOfferCard(offer: Offer, x: number, y: number, w: number, h: number): void {
    const centerX = x + Math.floor(w / 2);
    const topY = y + 6;
    const iconBoxSize = 64;
    const iconTop = topY;

    // Hover description (compute once)
    const desc = offer.type === 'tile'
      ? (TILE_UI_TEXT[offer.id] ?? TILE_DESCRIPTIONS[offer.id] ?? EXTRA_TILE_DESCRIPTIONS[offer.id] ?? '')
      : offer.type === 'relic'
        ? (RELIC_UI_TEXT[offer.id] ?? RELIC_DESCRIPTIONS[offer.id] ?? EXTRA_RELIC_DESCRIPTIONS[offer.id] ?? '')
        : (offer.id === 'BuyLife' ? 'Buy a life' : 'Reroll the shop');

    // Icon tile (square behind the emoji) – only for Tiles
    const iconTile = (offer.type === 'tile')
      ? this.scene.add.rectangle(centerX - iconBoxSize / 2, iconTop, iconBoxSize, iconBoxSize, 0x22232a, 1)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x2e2e39)
      : null;
    // Icon (emoji only)
    let iconObj: Phaser.GameObjects.GameObject | null = null;
    {
      const emoji = this.iconFor(offer.id);
      iconObj = this.scene.add.text(centerX, iconTop + iconBoxSize / 2, emoji, { fontFamily: 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif', fontSize: '38px', color: '#e9e9ef' }).setOrigin(0.5, 0.5);
    }
    ;[iconTile, iconObj].filter(Boolean).forEach(el => (el as any).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.purchaseAndRefresh(offer))
      .on('pointerover', () => {
        if (iconObj) this.scene.tweens.add({ targets: iconObj, scale: 1.04, duration: 120, ease: 'Quad.easeOut' });
        this.setHover(offer.label, offer.type, desc);
      })
      .on('pointerout', () => {
        if (iconObj) this.scene.tweens.add({ targets: iconObj, scale: 1.0, duration: 120, ease: 'Quad.easeOut' });
        this.clearHover();
      }));
    // Name
    const name = this.displayName(offer.label);
    const nameText = this.scene.add.text(centerX, iconTop + iconBoxSize + 6, name, { fontFamily: 'LTHoop', fontSize: '18px', color: '#e9e9ef' }).setOrigin(0.5, 0);
    nameText.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.setHover(offer.label, offer.type, desc))
      .on('pointerout', () => this.clearHover())
      .on('pointerdown', () => this.purchaseAndRefresh(offer));
    // Price
    const priceY = iconTop + iconBoxSize + 28;
    const coinR = 7;
    const priceStr = `${this.effectivePrice(offer)}`;
    const priceText = this.scene.add.text(0, priceY + 8, priceStr, { fontFamily: 'LTHoop', fontSize: '18px', fontStyle: 'bold', color: '#e9e9ef' }).setOrigin(0, 0.5);
    const groupWidth = coinR * 2 + 4 + priceText.width;
    const groupLeft = centerX - groupWidth / 2;
    const coin = this.drawCoin(groupLeft + coinR, priceY + 8, coinR);
    priceText.setX(groupLeft + coinR * 2 + 4);
    priceText.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.setHover(offer.label, offer.type, desc))
      .on('pointerout', () => this.clearHover())
      .on('pointerdown', () => this.purchaseAndRefresh(offer));
    coin.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.setHover(offer.label, offer.type, desc))
      .on('pointerout', () => this.clearHover())
      .on('pointerdown', () => this.purchaseAndRefresh(offer));
    // Track for price refresh
    this.offerEntries.push({ offer, priceText });
  }

  getOfferEntries(): OfferEntry[] {
    return this.offerEntries;
  }

  clearOfferEntries(): void {
    this.offerEntries = [];
  }
}

