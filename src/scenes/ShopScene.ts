import Phaser from 'phaser';
import { runState } from '../state';
import { ECONOMY } from '../game/consts';
import { TILE_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, TILE_UI_TEXT } from '../game/descriptions';
import { SHOP_TILES, priceForRarity } from '../game/items';
import { getShopRng } from '../game/rngUtils';
import { pickRandom } from '../game/rng';
import { ServiceRenderer } from './shop/ServiceRenderer';
import { OfferRenderer } from './shop/OfferRenderer';

// NOTE: Shop no longer sells collectibles, but we keep the 'relic' tag in the Offer type
// to remain compatible with shared shop UI components.
type Offer = { type: 'tile' | 'relic' | 'service'; id: string; price: number; label: string };

export default class ShopScene extends Phaser.Scene {
  private offers: Offer[] = [];
  private hoverDescText!: Phaser.GameObjects.Text;
  private hoverNameText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private purchasedIds: Set<string> = new Set();
  private servicePurchased: Set<string> = new Set();
  private serviceRenderer!: ServiceRenderer;
  private offerRenderer!: OfferRenderer;
  // Stats pill number refs (match right panel style)
  private shopLivesNum?: Phaser.GameObjects.Text;
  private shopCoinsNum?: Phaser.GameObjects.Text;
  // Utility: strip leading emoji from a label for cleaner names in cards
  private displayName(label: string): string {
    const trimmed = label.trim();
    const parts = trimmed.split(' ');
    if (parts.length <= 1) return trimmed;
    const first = parts[0];
    // If first token starts with a non-alphanumeric (emoji/punctuation), drop it
    if (!/^[A-Za-z0-9]/.test(first)) {
      return parts.slice(1).join(' ');
    }
    return trimmed;
  }
  // Draw a centered section header with subtle divider line
  private drawHeader(x: number, y: number, width: number, title: string, color: string) {
    const header = this.add.text(x + width / 2, y, title, { fontFamily: 'LTHoop', fontSize: '16px', color }).setOrigin(0.5, 0);
    const lineY = header.getBounds().bottom + 6;
    const pad = 12;
    this.add.rectangle(x + pad, lineY, width - pad * 2, 1, 0x32323c).setOrigin(0, 0);
    // Slightly more breathing room below header before content
    return header.getBounds().bottom + 20;
  }
  // Map an offer id to an emoji glyph used in the shop grid
  private iconFor(id: string): string {
    const m: Record<string, string> = {
      Diamond: '💎',
      '1Up': '❤️',
      Pickaxe: '🪓',
      Compass: '🧭',
      Scratchcard: '🎟️',
      GoodDeal: '👍',
      RemoteControl: '📺',
      AdvancePayment: '💳',
      Quartz: '🪨',
      '2Up': '💞',
      LuckyCat: '🐈‍⬛',
      TarotCard: '🪬',
      MetalDetector: '🔎',
      LaundryMoney: '🧼',
      PokerChip: '🃏',
      LuckyPenny: '🧧',
      NineToFive: '🏢',
      // Relics
      Vexillologist: '🏁',
      Pioneer: '🥾',
      TaxCollector: '🧮',
      Diffuser: '🧯',
      Mathematician: '📐',
      Accountant: '📈',
      Minimalist: '♻️',
      Lapidarist: '💠',
      Gambler: '🎰',
      PersonalShopper: '🛒',
      Cheapskate: '🪙',
      Cartographer: '🗺️',
      Couponer: '🏷️',
      Resurrector: '🧬',
      NumberCruncher: '🎯',
      Entrepreneur: '🏭',
      Researcher: '🧪',
      DebtCollector: '⚖️',
      Auditor: '🧾',
      Billionaire: '👑',
      Investor: '💼',
      Optimist: '🌞',
      SugarDaddy: '🎁',
      FortuneTeller: '🔮',
      Gamer: '🎮',
      Philanthropist: '🤲',
      Barterer: '🔄',
      Surgeon: '🩺',
      SalesAssociate: '👗',
      // Services
      Reroll: '🎲',
      BuyLife: '❤️'
    };
    return m[id] ?? '•';
  }
  // Temporary coin placeholder: small yellow circle (will be replaced by sprite)
  private drawCoin(x: number, y: number, radius: number = 7) {
    const coin = this.add.circle(x, y, radius, 0xfacc15, 1);
    coin.setStrokeStyle(1, 0x8a6c0a);
    return coin;
  }

  constructor() {
    super('ShopScene');
  }
  preload() {
    // Ensure quartz sprite is available before create runs, so we can render it immediately
    if (!this.textures.exists('quartz_icon')) {
      this.load.image('quartz_icon', '/assets/sprites/ShopTile-Quartz.png');
    }
  }

  create() {
    // Reset per-session state so previous shops don't bleed into new ones
    this.purchasedIds = new Set();
    this.servicePurchased = new Set();

    // If the shop has already been rerolled once this session and the player
    // does NOT own Gamer, pre-mark Reroll as SOLD after the restart
    {
      const hasGamer = ((runState.ownedRelics['Gamer'] ?? 0) > 0);
      const rerolled = runState.persistentEffects.rerolledThisShop;
      if (rerolled && !hasGamer) {
        this.servicePurchased.add('Reroll');
      }
    }
    // If Buy Life was already purchased this shop and the player does NOT own Surgeon, mark SOLD
    {
      const hasSurgeon = ((runState.ownedRelics['Surgeon'] ?? 0) > 0);
      const bought = (runState.persistentEffects as any).buyLifeBoughtThisShop;
      if (bought && !hasSurgeon) {
        this.servicePurchased.add('BuyLife');
      }
    }
    this.cameras.main.setBackgroundColor('#14141c');
    // Subtle animated background dots
    {
      const colors = [0xa78bfa, 0x7dd3fc, 0x9ae6b4, 0xfca5a5];
      for (let i = 0; i < 36; i++) {
        const x = Math.random() * this.scale.width;
        const y = Math.random() * this.scale.height;
        const r = 2 + Math.random() * 2;
        const c = colors[i % colors.length];
        const dot = this.add.circle(x, y, r, c, 1).setAlpha(0.0).setDepth(0);
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.0, to: 0.12 },
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
    // Header and stats (centered title, pills on right)
    this.titleText = this.add.text(this.scale.width / 2, 18, 'Shop', { fontFamily: 'LTHoop', fontSize: '28px', color: '#e9e9ef' }).setOrigin(0.5, 0);
    // Draw lives/coins pills (styled like right panel)
    {
      const emojiFont = 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      const drawPill = (emoji: string, value: number, x: number, kind: 'lives' | 'coins') => {
        const radius = 16;
        const y = 18 + radius;
        const bg = this.add.circle(x, y, radius, 0x2e2e39, 1).setStrokeStyle(1, 0x3a3a46).setOrigin(0.5);
        const icon = this.add.text(x, y - 10, emoji, { fontFamily: emojiFont, fontSize: '20px', color: '#e9e9ef' }).setOrigin(0.5, 0);
        const num = this.add.text(x + radius + 8, y - 8, String(value), { fontFamily: 'LTHoop', fontSize: '16px', color: '#e9e9ef' }).setOrigin(0, 0);
        if (kind === 'lives') this.shopLivesNum = num; else this.shopCoinsNum = num;
        return num.getBounds().right;
      };
      const startX = this.scale.width - 240;
      const right1 = drawPill('❤️', runState.lives, startX, 'lives');
      drawPill('🟡', runState.gold, right1 + 22, 'coins');
    }

    // Initialize renderers AFTER pills so service purchases can update these numbers immediately.
    this.serviceRenderer = new ServiceRenderer(
      this,
      (id: string) => this.iconFor(id),
      (x: number, y: number, radius?: number) => this.drawCoin(x, y, radius),
      (name: string, kind: 'service', desc: string) => this.setHover(name, kind, desc),
      () => this.clearHover(),
      (offer: any) => this.purchase(offer),
      this.servicePurchased,
      this.shopLivesNum,
      this.shopCoinsNum
    );
    this.offerRenderer = new OfferRenderer(
      this,
      (id: string) => this.iconFor(id),
      (label: string) => this.displayName(label),
      (x: number, y: number, radius?: number) => this.drawCoin(x, y, radius),
      (offer: Offer) => this.effectivePrice(offer),
      (name: string, kind: 'tile' | 'relic' | 'service', desc: string) => this.setHover(name, kind, desc),
      () => this.clearHover(),
      (offer: Offer) => this.purchaseAndRefresh(offer)
    );

    // Generate offers (v2 pools)
    const shopPool: Offer[] = SHOP_TILES.map(t => ({
      type: 'tile',
      id: t.id,
      price: priceForRarity(t.rarity),
      label: t.label
    }));

    // Simple deterministic selection by seed and level
    const shopRng = getShopRng();
    function pickN<T>(pool: T[], n: number): T[] {
      const copy = pool.slice();
      const out: T[] = [];
      while (out.length < n && copy.length) {
        const picked = pickRandom(shopRng, copy);
        const idx = copy.indexOf(picked);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    }

    const tileOffers = pickN(shopPool, 3);
    this.offers = [...tileOffers];

    // Layout metrics (readable layout)
    const margin = 24;
    const sectionGap = 60;
    const fullW = this.scale.width - margin * 2;
    const colGap = 36;
    const rowGap = 28;
    let topY = 64;
    // Footer hover metrics (needed for clamping earlier sections)
    const hoverH = 40;
    const hoverY = this.scale.height - hoverH - 28;
    const hoverW = this.scale.width - margin * 2;

    // Tiles row (full width)
    const tilesTitleBottom = this.drawHeader(margin, topY, fullW, 'Tiles', '#a78bfa');
    const tilesCols = Math.max(1, tileOffers.length); // one centered row like prototype
    const tilesBottom = this.offerRenderer.renderOffersGrid(tileOffers, margin, tilesTitleBottom, fullW, tilesCols, colGap, rowGap);

    // Services section — clamp safely above the hover area
    const servicesHeaderTop = Math.min(Math.max(tilesBottom + 40, topY + 180), hoverY - 120);

    // Footer hover text area (transparent so hover text appears to float)
    this.add.rectangle(margin, hoverY, hoverW, hoverH, 0x000000, 0).setOrigin(0, 0);
    const emojiFont = 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    this.hoverNameText = this.add.text(margin + 12, hoverY + 8, '', {
      fontFamily: emojiFont,
      fontSize: '14px',
      color: '#a78bfa'
    }).setOrigin(0, 0).setDepth(4001);
    this.hoverDescText = this.add.text(margin + 12, hoverY + 8, '', {
      fontFamily: emojiFont,
      fontSize: '14px',
      color: '#cfd2ff',
      align: 'left'
    }).setOrigin(0, 0).setDepth(4001);

    // Services section — header with divider
    const servicesTitleBottom = this.drawHeader(margin, servicesHeaderTop, fullW, 'Services', '#9ae6b4');
    const svcTop = servicesTitleBottom + 12;
    const svcColW = 160;
    const svcGapX = 80;
    const totalW = 2 * svcColW + svcGapX;
    const servicesX = Math.floor(this.scale.width / 2 - totalW / 2);
    this.serviceRenderer.drawServiceCard(servicesX, 'Reroll', 2, 'Reroll the shop', svcTop, svcColW);
    this.serviceRenderer.drawServiceCard(servicesX + svcColW + svcGapX, 'BuyLife', 3, 'Buy a life', svcTop, svcColW);

    // Proceed bottom-right (semi-transparent rounded button with LTHoop font)
    // Position proceed button ABOVE the hover bar so it doesn't overlap
    const proceedY = hoverY - 18;
    {
      const btnW = 160;
      const btnH = 44;
      const btnX = this.scale.width - 12 - btnW / 2;
      const btnY = proceedY;
      const btnGfx = this.add.graphics().setDepth(1000);
      const drawBtn = (hover: boolean) => {
        btnGfx.clear();
        btnGfx.lineStyle(1, 0x3a3a46, 1);
        // Slightly brighter on hover; semi-transparent at rest
        btnGfx.fillStyle(hover ? 0x353542 : 0x2a2a34, hover ? 0.75 : 0.6);
        btnGfx.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
        btnGfx.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      };
      drawBtn(false);
      const label = this.add.text(btnX, btnY, 'Proceed ▶', {
        fontFamily: 'LTHoop',
        fontSize: '20px',
        color: '#9ae6b4'
      }).setOrigin(0.5).setDepth(1001);
      const zone = this.add.zone(btnX, btnY, btnW + 12, btnH + 12)
        .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
        .on('pointerover', () => drawBtn(true))
        .on('pointerout', () => drawBtn(false))
      .on('pointerdown', () => {
        runState.level += 1;
        // Reset persistent effects
        runState.persistentEffects.carLoan = false;
        runState.persistentEffects.snakeOil = false;
        runState.persistentEffects.mathTest = false;
        runState.persistentEffects.snakeVenom = { active: false, revealsUntilHit: 8 };
        runState.persistentEffects.donationBoxStacks = 0;
        runState.persistentEffects.appraisal = false;
        // Draft a challenge for the upcoming level
        this.scene.start('ChallengeScene');
      });
      // Keep label above the graphics; zone is invisible and captures input
    }
  }


  private effectivePrice(offer: Offer): number {
    let base = offer.price;
    // Couponer affects items only (not services)
    if (offer.type !== 'service') {
      base = Math.max(0, base - (runState.ownedRelics['Couponer'] ?? 0));
    }
    // Barterer affects services only
    if (offer.type === 'service') {
      base = Math.max(0, base - (runState.ownedRelics['Barterer'] ?? 0));
    }
    return runState.shopFreePurchases > 0 ? 0 : base;
  }

  private markRerollSold() {
    // Flag so future clicks are blocked and future renders are SOLD
    this.servicePurchased.add('Reroll');
    // Target only the Reroll service UI; do not touch item prices
    this.serviceRenderer.markRerollSold();
  }

  private purchaseAndRefresh(offer: Offer) {
    // Allow multiple purchases per shop; individual offers can only be bought once
    // Prevent rebuy of the same offer within this shop session
    if (this.purchasedIds.has(offer.id)) {
      return;
    }
    // Check affordability before attempting purchase (respecting coupon/ATM fee)
    const base = offer.type === 'service'
      ? Math.max(0, offer.price - (runState.ownedRelics['Barterer'] ?? 0))
      : Math.max(0, offer.price - (runState.ownedRelics['Couponer'] ?? 0));
    const totalCost = base + (base > 0 && runState.persistentEffects.atmFee ? 1 : 0);
    if (offer.type !== 'service' && totalCost > runState.gold) {
      // Not affordable: give quick visual feedback on the card price
      const entry = this.offerRenderer.getOfferEntries().find(e => e.offer === offer);
      if (entry?.priceText) {
        const originalColor = (entry.priceText as any).style?.color || '#e9e9ef';
        entry.priceText.setColor('#fca5a5');
        this.tweens.add({
          targets: entry.priceText,
          x: entry.priceText.x + 4,
          yoyo: true,
          repeat: 3,
          duration: 40,
          onComplete: () => entry.priceText.setColor(originalColor)
        });
      }
      return;
    }
    const beforeGold = runState.gold;
    this.purchase(offer);
    // If purchase didn't go through (not enough gold), bail out
    if (offer.type !== 'service' && totalCost > 0 && runState.gold === beforeGold) {
      return;
    }
    if (offer.type !== 'service') {
      this.purchasedIds.add(offer.id);
      const entry = this.offerRenderer.getOfferEntries().find(e => e.offer === offer);
      if (entry) {
        entry.priceText.setText('SOLD');
        (entry.priceText as any).disableInteractive?.();
      }
      this.refreshAllPriceLabels();
    }
    this.shopLivesNum?.setText(String(runState.lives));
    this.shopCoinsNum?.setText(String(runState.gold));

    // Sales Associate: restock shop items after purchases (regenerate offers).
    // Implemented as a shop refresh via scene restart while preserving service purchase state via runState.persistentEffects.
    if (offer.type !== 'service' && (runState.ownedRelics['SalesAssociate'] ?? 0) > 0) {
      this.scene.restart();
    }
  }

  // Legacy list renderer (unused) – keep for compatibility, returns startY
  private renderOffersList(_offers: Offer[], startY: number): number {
    return startY;
  }

  // (no in-place rerender helpers; reroll restarts the scene)

  private priceLabel(offer: Offer): string {
    // Legacy; keep accurate for items vs services
    const price = this.effectivePrice(offer);
    return `${offer.label} — ${price}g ${this.ownedSuffix(offer)}`;
  }

  private refreshAllPriceLabels() {
    for (const entry of this.offerRenderer.getOfferEntries()) {
      if (this.purchasedIds.has(entry.offer.id)) {
        entry.priceText.setText('SOLD');
      } else {
        entry.priceText.setText(`${this.effectivePrice(entry.offer)}`);
      }
    }
    // Also refresh service price labels (e.g., after Receipt / free purchase credit)
    this.refreshServicePriceLabels();
  }

  private refreshServicePriceLabels() {
    const refs = this.serviceRenderer?.getRefs?.();
    if (!refs) return;
    const update = (id: 'Reroll' | 'BuyLife', basePrice: number) => {
      const ref = refs[id];
      if (!ref) return;
      // If SOLD already, leave it
      if (this.servicePurchased.has(id)) return;
      const offer: Offer = { type: 'service', id, price: basePrice, label: id };
      const price = this.effectivePrice(offer);
      ref.priceText.setText(String(price));
      if (ref.coin) (ref.coin as any).setVisible?.(price > 0);
    };
    update('Reroll', 2);
    update('BuyLife', 3);
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
    // Compute discounted price without consuming free purchases yet
    let finalPrice = offer.price;
    if (offer.type !== 'service') {
      finalPrice = Math.max(0, finalPrice - (runState.ownedRelics['Couponer'] ?? 0));
    } else {
      finalPrice = Math.max(0, finalPrice - (runState.ownedRelics['Barterer'] ?? 0));
    }
    if (runState.shopFreePurchases > 0) {
      finalPrice = 0;
      runState.shopFreePurchases -= 1;
    }
    // Affordability check must include ATM Fee surcharge (if any)
    const atmExtra = finalPrice > 0 && runState.persistentEffects.atmFee ? 1 : 0;
    const totalCost = finalPrice + atmExtra;
    if (runState.gold < totalCost) return;
    if (totalCost > 0) {
      runState.gold -= totalCost;
    }

    if (offer.type === 'tile') {
      runState.ownedShopTiles[offer.id] = (runState.ownedShopTiles[offer.id] ?? 0) + 1;
      // Receipt should activate immediately: make next purchase free (prices show 0)
      if (offer.id === 'Receipt') {
        runState.shopFreePurchases += 1;
        this.refreshAllPriceLabels();
      }
    } else if (offer.type === 'service') {
      if (offer.id === 'BuyLife') {
        runState.lives += 1;
        // Track one-time buy unless Surgeon is owned
        if ((runState.ownedRelics['Surgeon'] ?? 0) <= 0) {
          (runState.persistentEffects as any).buyLifeBoughtThisShop = true;
        }
      }
      if (offer.id === 'Reroll') {
        // Record that we've used our one reroll for this shop (unless Gamer)
        runState.persistentEffects.rerolledThisShop = true;
        runState.persistentEffects.shopRerollCount = (runState.persistentEffects.shopRerollCount ?? 0) + 1;
        // Restart scene to regenerate offers cleanly
        this.scene.restart();
        return;
      }
    }
    // After purchase, update price labels in case the free credit was consumed
    this.refreshAllPriceLabels();
  }

  private clearHover() {
    this.hoverNameText.setText('');
    this.hoverDescText.setText('');
  }

  private setHover(name: string, kind: 'tile' | 'relic' | 'service', desc: string) {
    const color = kind === 'tile' ? '#a78bfa' : kind === 'relic' ? '#7dd3fc' : '#9ae6b4';
    // Ensure a space after a leading emoji without breaking surrogate pairs
    if (name && name.length > 0) {
      const cp = name.codePointAt(0);
      if (cp !== undefined) {
        const firstLen = cp > 0xffff ? 2 : 1;
        const firstChar = String.fromCodePoint(cp);
        const looksEmoji = /\p{Emoji}/u.test(firstChar);
        const hasSpace = name[firstLen] === ' ';
        if (looksEmoji && !hasSpace) {
          name = firstChar + ' ' + name.slice(firstLen);
        }
      }
    }
    this.hoverNameText.setColor(color);
    this.hoverNameText.setText(name ? `${name}:` : '');
    // Position description just after the name prefix
    this.hoverDescText.setText(desc ? ' ' + desc : '');
    this.hoverDescText.setX(this.hoverNameText.x + this.hoverNameText.width + 6);
    this.hoverDescText.setY(this.hoverNameText.y);
  }
}


