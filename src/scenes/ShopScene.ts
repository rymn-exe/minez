import Phaser from 'phaser';
import { runState } from '../state';
import { ECONOMY } from '../game/consts';
import { TILE_DESCRIPTIONS, RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS } from '../game/descriptions';
import { SHOP_TILES, RELICS, priceForRarity } from '../game/items';

type Offer = { type: 'tile' | 'relic' | 'service'; id: string; price: number; label: string };

export default class ShopScene extends Phaser.Scene {
  private offers: Offer[] = [];
  private descText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private offerEntries: { offer: Offer; text: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('ShopScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#14141c');
    this.titleText = this.add.text(24, 24, `Shop — Gold: ${runState.gold}`, { fontFamily: 'monospace', fontSize: '20px', color: '#e9e9ef' });

    // Generate offers (v2 pools)
    const shopPool: Offer[] = SHOP_TILES.map(t => ({
      type: 'tile',
      id: t.id,
      price: priceForRarity(t.rarity),
      label: t.label
    }));
    let relicPool: Offer[] = RELICS.map(r => ({
      type: 'relic',
      id: r.id,
      price: priceForRarity(r.rarity) + 5, // relics base 15, still aligns with v1 pricing
      label: r.label
    }));
    // Filter Sugar Daddy rules:
    // - no first shop (level 1)
    // - no spawn when gold <= 0 (would be pointless/negative)
    if (runState.level === 1 || runState.lives <= 1) {
      relicPool = relicPool.filter(o => o.id !== 'SugarDaddy');
    }

    // Simple deterministic selection by seed and level
    function pickN<T>(pool: T[], n: number): T[] {
      const copy = pool.slice();
      const out: T[] = [];
      while (out.length < n && copy.length) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    }

    const tileOffers = pickN(shopPool, 3);
    const extraRelics = (runState.ownedRelics['PersonalShopper'] ?? 0);
    const relicOffers = pickN(relicPool, 2 + extraRelics);
    this.offers = [...tileOffers, ...relicOffers];

    // Description panel anchored near bottom so it doesn't overlap lists
    this.descText = this.add.text(24, this.scale.height - 110, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#cfd2ff',
      wordWrap: { width: 592, useAdvancedWrap: true }
    }).setOrigin(0, 0);

    // Sections
    let y = 64;
    this.add.text(24, y, 'Shop Tiles', { fontFamily: 'monospace', fontSize: '16px', color: '#a78bfa' });
    y += 16;
    y = this.renderOffersList(tileOffers, y + 8);

    y += 12;
    this.add.text(24, y, 'Relics', { fontFamily: 'monospace', fontSize: '16px', color: '#a7f3d0' });
    y += 24;
    y = this.renderOffersList(relicOffers, y);

    // Services section (e.g., Buy Life)
    const services: Offer[] = [
      { type: 'service', id: 'BuyLife', price: 3, label: '❤️ Buy Life' },
      { type: 'service', id: 'Reroll', price: 2, label: '🔁 Reroll Shop' }
    ];
    y += 12;
    this.add.text(24, y, 'Services', { fontFamily: 'monospace', fontSize: '16px', color: '#f9d3b4' });
    y += 24;
    this.renderOffersList(services, y);

    const proceed = this.add.text(24, this.scale.height - 40, 'Proceed ▶', { fontFamily: 'monospace', fontSize: '18px', color: '#9ae6b4' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        runState.level += 1;
        // Reset persistent effects
        runState.persistentEffects.carLoan = false;
        runState.persistentEffects.snakeOil = false;
        runState.persistentEffects.mathTest = false;
        runState.persistentEffects.snakeVenom = { active: false, revealsUntilHit: 8 };
        this.scene.start('GameScene');
      });
  }

  private renderOffersList(offers: Offer[], startY: number): number {
    let y = startY;
    offers.forEach((offer) => {
      const bg = this.add.rectangle(24, y, 592, 48, 0x242430, 1).setOrigin(0, 0);
      bg.setStrokeStyle(1, 0x3a3a46);
      const t = this.add.text(36, y + 12, this.priceLabel(offer), { fontFamily: 'monospace', fontSize: '16px', color: '#e9e9ef' });
      const desc = offer.type === 'tile'
        ? (TILE_DESCRIPTIONS[offer.id] ?? '')
        : offer.type === 'relic'
          ? (RELIC_DESCRIPTIONS[offer.id] ?? EXTRA_RELIC_DESCRIPTIONS[offer.id] ?? '')
          : (offer.id === 'BuyLife' ? 'Purchase +1 life immediately' : 'Reroll the current offers');
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.purchase(offer);
        this.titleText.setText(`Shop — Gold: ${runState.gold}`);
        this.refreshAllPriceLabels();
      });
      // Also accept clicks on the text itself to avoid “two clicks” (text overlay blocking rect)
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.purchase(offer);
        this.titleText.setText(`Shop — Gold: ${runState.gold}`);
        this.refreshAllPriceLabels();
      });
      bg.on('pointerover', () => {
        this.descText.setText(`${offer.label}: ${desc ?? 'No description available.'}`);
      });
      bg.on('pointerout', () => {
        this.descText.setText('');
      });
      t.setText(this.priceLabel(offer));
      this.offerEntries.push({ offer, text: t });
      y += 56;
    });
    return y;
  }

  // (no in-place rerender helpers; reroll restarts the scene)

  private priceLabel(offer: Offer): string {
    const base = Math.max(0, offer.price - (runState.ownedRelics['Couponer'] ?? 0));
    const price = runState.shopFreePurchases > 0 ? 0 : base;
    return `${offer.label} — ${price}g ${this.ownedSuffix(offer)}`;
  }

  private refreshAllPriceLabels() {
    for (const entry of this.offerEntries) {
      entry.text.setText(this.priceLabel(entry.offer));
    }
  }

  private ownedSuffix(offer: Offer): string {
    if (offer.type === 'tile') {
      const n = runState.ownedShopTiles[offer.id] ?? 0;
      return n > 0 ? `(owned x${n})` : '';
    }
    if (offer.type === 'relic') {
      const n = runState.ownedRelics[offer.id] ?? 0;
      return n > 0 ? `(owned x${n})` : '';
    }
    // services don't have ownership
    return '';
  }

  private purchase(offer: Offer) {
    let finalPrice = Math.max(0, offer.price - (runState.ownedRelics['Couponer'] ?? 0));
    if (runState.shopFreePurchases > 0) {
      finalPrice = 0;
      runState.shopFreePurchases -= 1;
    }
    if (runState.gold < finalPrice) return;
    runState.gold -= finalPrice;

    if (offer.type === 'tile') {
      runState.ownedShopTiles[offer.id] = (runState.ownedShopTiles[offer.id] ?? 0) + 1;
      // Receipt should activate immediately: make next purchase free (prices show 0)
      if (offer.id === 'Receipt') {
        runState.shopFreePurchases += 1;
        this.refreshAllPriceLabels();
      }
    } else if (offer.type === 'relic') {
      runState.ownedRelics[offer.id] = (runState.ownedRelics[offer.id] ?? 0) + 1;
      // Sugar Daddy: convert lives -> gold, but never below 1 life
      if (offer.id === 'SugarDaddy') {
        const transferable = Math.max(0, runState.lives - 1);
        runState.lives -= transferable;
        runState.gold += transferable;
        this.titleText.setText(`Shop — Gold: ${runState.gold}`);
      }
    } else if (offer.type === 'service') {
      if (offer.id === 'BuyLife') {
        runState.lives += 1;
      }
      if (offer.id === 'Reroll') {
        // Restart scene to regenerate offers cleanly
        this.scene.restart();
        return;
      }
    }
    // After purchase, update price labels in case the free credit was consumed
    this.refreshAllPriceLabels();
  }
}


