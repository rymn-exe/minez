// ServiceRenderer: Handles service card rendering and purchase logic
// Extracted from ShopScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { runState } from '../../state';

type ServiceId = 'Reroll' | 'BuyLife';

export interface ServiceRefs {
  bg: Phaser.GameObjects.GameObject;
  icon: Phaser.GameObjects.GameObject;
  priceText: Phaser.GameObjects.Text;
  coin?: Phaser.GameObjects.GameObject;
}

export class ServiceRenderer {
  private svcRefs: Record<string, ServiceRefs> = {};
  private formatPrice(n: number): { text: string; showCoin: boolean } {
    if (n <= 0) return { text: 'FREE', showCoin: false };
    return { text: `${n}g`, showCoin: true };
  }

  constructor(
    private scene: Phaser.Scene,
    private iconFor: (id: string) => string,
    private drawCoin: (x: number, y: number, radius?: number) => Phaser.GameObjects.GameObject,
    private setHover: (name: string, kind: 'service', desc: string) => void,
    private clearHover: () => void,
    private purchase: (offer: any) => void,
    private servicePurchased: Set<string>,
    private shopLivesNum?: Phaser.GameObjects.Text,
    private shopCoinsNum?: Phaser.GameObjects.Text
  ) {}

  drawServiceCard(
    x: number,
    y: number,
    w: number,
    h: number,
    id: ServiceId,
    price: number,
    hover: string
  ): void {
    const emoji = this.iconFor(id);
    const centerX = x + w / 2;

    const card = this.scene.add.graphics().setDepth(10);
    const drawCard = (hovered: boolean, sold: boolean) => {
      card.clear();
      const fill = sold ? 0x14151d : (hovered ? 0x1c1d27 : 0x171922);
      const stroke = sold ? 0x2b2d38 : (hovered ? 0x3a3a46 : 0x2b2d38);
      card.fillStyle(fill, 1);
      card.lineStyle(1, stroke, 1);
      card.fillRoundedRect(x, y, w, h, 14);
      card.strokeRoundedRect(x, y, w, h, 14);
    };

    // Interaction zone for whole card
    const zone = this.scene.add.zone(centerX, y + h / 2, w, h).setOrigin(0.5).setDepth(30);

    const title = this.scene.add.text(centerX, y + 86, id === 'Reroll' ? 'Reroll' : 'Buy Life', {
      fontFamily: 'LTHoop',
      fontSize: '18px',
      color: '#e9e9ef'
    }).setOrigin(0.5, 0).setDepth(12);

    const icon = this.scene.add.text(centerX, y + 18, emoji, {
      fontFamily: 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
      fontSize: '38px',
      color: '#e9e9ef'
    }).setOrigin(0.5, 0).setDepth(12);

    // Centered price group, nudged lower to avoid overlap with headers
    // Display price (Barterer + free purchase credit)
    const hasBarterer = (runState.ownedRelics['Barterer'] ?? 0) > 0;
    const discounted = Math.max(0, price - (hasBarterer ? (runState.ownedRelics['Barterer'] ?? 0) : 0));
    const displayPrice = runState.shopFreePurchases > 0 ? 0 : discounted;
    const priceBaseY = y + h - 28;
    const fmt = this.formatPrice(displayPrice);
    const pText = this.scene.add.text(0, priceBaseY, fmt.text, { fontFamily: 'LTHoop', fontSize: '18px', fontStyle: 'bold', color: '#facc15' })
      .setOrigin(0, 0.5)
      .setDepth(12);
    const coinR = 8;
    const grpW = coinR * 2 + 4 + pText.width;
    const left = centerX - grpW / 2;
    const svcCoin = this.drawCoin(left + coinR, priceBaseY, coinR);
    (svcCoin as any).setDepth?.(12);
    (svcCoin as any).setVisible?.(fmt.showCoin);
    pText.setX(left + coinR * 2 + 4);
    const priceText = pText;
    // keep refs for targeted updates
    this.svcRefs[id] = { bg: zone, icon, priceText, coin: svcCoin };

    const isSold = () => this.servicePurchased.has(id);
    drawCard(false, isSold());

    const click = () => {
      const hasSurgeon = ((runState.ownedRelics['Surgeon'] ?? 0) > 0);
      if (this.servicePurchased.has(id)) return;
      const fake: any = { type: 'service', id, price, label: id };
      this.purchase(fake);
      // Surgeon: Buy Life can be purchased repeatedly (do not mark SOLD)
      if (!(id === 'BuyLife' && hasSurgeon)) {
        this.servicePurchased.add(id);
        // Mark this service card SOLD and disable interactivity
        title.setText('SOLD');
        title.setColor('#9aa0a6');
        icon.setAlpha(0.35);
        priceText.setText('');
        if (svcCoin) (svcCoin as any).setVisible?.(false);
        (zone as any).disableInteractive?.();
      }
      this.shopLivesNum?.setText(String(runState.lives));
      this.shopCoinsNum?.setText(String(runState.gold));
    };

    zone.setInteractive({ useHandCursor: true })
      .on('pointerdown', click)
      .on('pointerover', () => {
        drawCard(true, isSold());
        this.setHover(id === 'Reroll' ? 'Reroll' : 'Buy Life', 'service', hover);
      })
      .on('pointerout', () => {
        drawCard(false, isSold());
        this.clearHover();
      });

    // Route child interactions to the zone for consistent hover feel
    ;[icon, title, priceText, svcCoin].filter(Boolean).forEach(el => {
      (el as any).setInteractive?.({ useHandCursor: true });
      (el as any).on?.('pointerdown', click);
      (el as any).on?.('pointerover', () => zone.emit('pointerover'));
      (el as any).on?.('pointerout', () => zone.emit('pointerout'));
    });

    // If already flagged as purchased, render SOLD immediately
    if (this.servicePurchased.has(id)) {
      title.setText('SOLD');
      title.setColor('#9aa0a6');
      icon.setAlpha(0.35);
      priceText.setText('');
      if (svcCoin) (svcCoin as any).setVisible?.(false);
      (zone as any).disableInteractive?.();
      drawCard(false, true);
    }
  }

  markRerollSold(): void {
    const ref = this.svcRefs['Reroll'];
    if (ref) {
      // `icon` remains the emoji; the SOLD state is handled via `servicePurchased`
      ref.priceText.setText('');
      (ref.bg as any).disableInteractive?.();
      if (ref.coin) (ref.coin as any).setVisible?.(false);
    }
  }

  getRefs(): Record<string, ServiceRefs> {
    return this.svcRefs;
  }
}

