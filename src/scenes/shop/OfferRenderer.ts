// OfferRenderer: Handles offer card rendering and grid layout
// Extracted from ShopScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { TILE_DESCRIPTIONS, RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, RELIC_UI_TEXT, TILE_UI_TEXT } from '../../game/descriptions';

type Offer = { type: 'tile' | 'relic' | 'service'; id: string; price: number; label: string };

export interface OfferEntry {
  offer: Offer;
  priceText: Phaser.GameObjects.Text;
  coin?: Phaser.GameObjects.GameObject;
}

export class OfferRenderer {
  private offerEntries: OfferEntry[] = [];
  private formatPrice(n: number): { text: string; showCoin: boolean } {
    if (n <= 0) return { text: 'FREE', showCoin: false };
    return { text: `${n}g`, showCoin: true };
  }

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
    const cardH = 142;
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
    const iconBoxSize = 64;
    const iconTop = y + 14;

    // Hover description (compute once)
    const desc = offer.type === 'tile'
      ? (TILE_UI_TEXT[offer.id] ?? TILE_DESCRIPTIONS[offer.id] ?? EXTRA_TILE_DESCRIPTIONS[offer.id] ?? '')
      : offer.type === 'relic'
        ? (RELIC_UI_TEXT[offer.id] ?? RELIC_DESCRIPTIONS[offer.id] ?? EXTRA_RELIC_DESCRIPTIONS[offer.id] ?? '')
        : (offer.id === 'BuyLife' ? 'Buy a life' : 'Reroll the shop');

    // Card background (real card, not just the icon square)
    const card = this.scene.add.graphics().setDepth(10);
    const drawCard = (hovered: boolean) => {
      card.clear();
      card.fillStyle(hovered ? 0x1c1d27 : 0x171922, 1);
      card.lineStyle(1, hovered ? 0x3a3a46 : 0x2b2d38, 1);
      card.fillRoundedRect(x, y, w, h, 14);
      card.strokeRoundedRect(x, y, w, h, 14);
    };
    drawCard(false);

    // Interaction zone (single hit target for the whole card)
    const zone = this.scene.add.zone(centerX, y + h / 2, w, h).setOrigin(0.5).setDepth(30);
    zone.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.purchaseAndRefresh(offer))
      .on('pointerover', () => {
        drawCard(true);
        if (iconObj) this.scene.tweens.add({ targets: iconObj, scale: 1.04, duration: 120, ease: 'Quad.easeOut' });
        this.setHover(offer.label, offer.type, desc);
      })
      .on('pointerout', () => {
        drawCard(false);
        if (iconObj) this.scene.tweens.add({ targets: iconObj, scale: 1.0, duration: 120, ease: 'Quad.easeOut' });
        this.clearHover();
      });

    // Icon tile (square behind the emoji) – only for Tiles
    const iconTile = (offer.type === 'tile')
      ? this.scene.add.rectangle(centerX, iconTop + iconBoxSize / 2, iconBoxSize, iconBoxSize, 0x22232a, 1)
          .setOrigin(0.5, 0.5)
          .setStrokeStyle(1, 0x2e2e39)
          .setDepth(11)
      : null;

    // Icon (emoji only)
    let iconObj: Phaser.GameObjects.GameObject | null = null;
    {
      const emoji = this.iconFor(offer.id);
      iconObj = this.scene.add.text(centerX, iconTop + iconBoxSize / 2, emoji, { fontFamily: 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif', fontSize: '38px', color: '#e9e9ef' })
        .setOrigin(0.5, 0.5)
        .setDepth(12);
    }

    // Name
    const name = this.displayName(offer.label);
    const nameText = this.scene.add.text(centerX, iconTop + iconBoxSize + 10, name, { fontFamily: 'LTHoop', fontSize: '18px', color: '#e9e9ef' })
      .setOrigin(0.5, 0)
      .setDepth(12);

    // Price
    const priceY = y + h - 28;
    const coinR = 8;
    const eff = this.effectivePrice(offer);
    const fmt = this.formatPrice(eff);
    const priceText = this.scene.add.text(0, priceY, fmt.text, { fontFamily: 'LTHoop', fontSize: '18px', fontStyle: 'bold', color: '#facc15' })
      .setOrigin(0, 0.5)
      .setDepth(12);
    const groupWidth = coinR * 2 + 4 + priceText.width;
    const groupLeft = centerX - groupWidth / 2;
    const coin = this.drawCoin(groupLeft + coinR, priceY, coinR);
    (coin as any).setDepth?.(12);
    (coin as any).setVisible?.(fmt.showCoin);
    priceText.setX(groupLeft + coinR * 2 + 4);

    // Route child clicks through the same behavior (without duplicating hover handlers)
    ;[iconTile, iconObj, nameText, priceText, coin].filter(Boolean).forEach(el => {
      (el as any).setInteractive?.({ useHandCursor: true });
      (el as any).on?.('pointerdown', () => this.purchaseAndRefresh(offer));
      (el as any).on?.('pointerover', () => zone.emit('pointerover'));
      (el as any).on?.('pointerout', () => zone.emit('pointerout'));
    });

    // Track for price refresh
    this.offerEntries.push({ offer, priceText, coin });
  }

  getOfferEntries(): OfferEntry[] {
    return this.offerEntries;
  }

  clearOfferEntries(): void {
    this.offerEntries = [];
  }
}

