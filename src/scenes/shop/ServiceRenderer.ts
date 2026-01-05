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
    id: ServiceId,
    price: number,
    hover: string,
    svcTop: number,
    svcColW: number
  ): void {
    const emoji = this.iconFor(id);
    const centerX = x + svcColW / 2;
    // Invisible interaction zone instead of a visible box
    const bg = this.scene.add.zone(centerX, svcTop + 28, svcColW, 70).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const icon = this.scene.add.text(centerX, svcTop, emoji, { fontFamily: 'LTHoop', fontSize: '34px', color: '#e9e9ef' }).setOrigin(0.5, 0);
    // Centered price group, nudged lower to avoid overlap with headers
    const prStr = `${price}`;
    const priceBaseY = svcTop + 44;
    const pText = this.scene.add.text(0, priceBaseY, prStr, { fontFamily: 'LTHoop', fontSize: '18px', fontStyle: 'bold', color: '#e9e9ef' }).setOrigin(0, 0.5);
    const grpW = 7 * 2 + 4 + pText.width;
    const left = centerX - grpW / 2;
    const svcCoin = this.drawCoin(left + 7, priceBaseY, 7);
    pText.setX(left + 7 * 2 + 4);
    const priceText = pText;
    // keep refs for targeted updates
    this.svcRefs[id] = { bg, icon, priceText, coin: svcCoin };
    const click = () => {
      if (this.servicePurchased.has(id)) return;
      const fake: any = { type: 'service', id, price, label: id };
      this.purchase(fake);
      this.servicePurchased.add(id);
      // Mark this service card SOLD and disable interactivity
      icon.setText('SOLD');
      priceText.setText('');
      if (svcCoin) (svcCoin as any).setVisible?.(false);
      (bg as any).disableInteractive?.();
      (icon as any).disableInteractive?.();
      (priceText as any).disableInteractive?.();
      this.shopLivesNum?.setText(String(runState.lives));
      this.shopCoinsNum?.setText(String(runState.gold));
    };
    [bg, icon, priceText, svcCoin].forEach(el =>
      (el as any).setInteractive?.({ useHandCursor: true })
        .on?.('pointerdown', click)
        .on?.('pointerover', () => this.setHover(id === 'Reroll' ? 'Reroll' : 'Buy Life', 'service', hover))
        .on?.('pointerout', () => this.clearHover())
    );
    // If already flagged as purchased, render SOLD immediately
    if (this.servicePurchased.has(id)) {
      icon.setText('SOLD');
      priceText.setText('');
      if (svcCoin) (svcCoin as any).setVisible?.(false);
      (bg as any).disableInteractive?.();
      (icon as any).disableInteractive?.();
      (priceText as any).disableInteractive?.();
    }
  }

  markRerollSold(): void {
    const ref = this.svcRefs['Reroll'];
    if (ref) {
      (ref.icon as any).setText('SOLD');
      ref.priceText.setText('');
      (ref.bg as any).disableInteractive?.();
      (ref.icon as any).disableInteractive?.();
      (ref.priceText as any).disableInteractive?.();
      if (ref.coin) (ref.coin as any).setVisible?.(false);
    }
  }

  getRefs(): Record<string, ServiceRefs> {
    return this.svcRefs;
  }
}

