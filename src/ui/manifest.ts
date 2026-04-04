import Phaser from 'phaser';
import { runState } from '../state';
// Terminology update (v1.4): UI shows "Collectible(s)" instead of "Relic(s)".
// Internal identifiers remain RELIC_* for compatibility.
import { SHOP_TILES, RELICS } from '../game/items';
import { ChallengeId } from '../game/types';
import { TILE_DESCRIPTIONS, CHALLENGE_DESCRIPTIONS, RELIC_DESCRIPTIONS, EXTRA_RELIC_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, RELIC_UI_TEXT, TILE_UI_TEXT, CHALLENGE_UI_TEXT } from '../game/descriptions';

export class ManifestPanel {
  private scene: Phaser.Scene;
  private statsText: Phaser.GameObjects.Text;
  private shopTexts: Phaser.GameObjects.Text[] = [];
  private challengeTexts: Phaser.GameObjects.Text[] = [];
  private relicTexts: Phaser.GameObjects.Text[] = [];
  private extraNodes: Phaser.GameObjects.GameObject[] = [];
  private tooltipNameText: Phaser.GameObjects.Text;
  private tooltipDescText: Phaser.GameObjects.Text;
  private x: number;
  private y: number;
  private contentBottomY: number = 0;
  private hoverProxy?: (name: string, color: string, desc: string) => void;
  private clearHoverProxy?: () => void;
  private statBadges: Phaser.GameObjects.GameObject[] = [];
  // DOM fallback regions for hover routing when Phaser input is unavailable
  private domRegions: Array<{ x: number; y: number; w: number; h: number; over: () => void; out: () => void }> = [];
  private domLastIdx: number = -1;
  // Row references for flashing
  private shopRowById: Record<string, Phaser.GameObjects.Text> = {};
  private challengeRowById: Record<string, Phaser.GameObjects.Text> = {};
  // Stat pill number refs
  private levelNum?: Phaser.GameObjects.Text;
  private livesNum?: Phaser.GameObjects.Text;
  private coinsNum?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, opts?: { hoverProxy?: (name: string, color: string, desc: string) => void; clearHoverProxy?: () => void }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hoverProxy = opts?.hoverProxy;
    this.clearHoverProxy = opts?.clearHoverProxy;
    // NOTE: `x` is the left edge of the right-side panel (not the content inset).
    this.statsText = scene.add.text(x, y, '', { fontFamily: 'LTHoop', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0);
    const emojiFont = 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    this.tooltipNameText = scene.add.text(x, y, '', {
      fontFamily: emojiFont,
      fontSize: '12px',
      color: '#a78bfa'
    }).setOrigin(0, 0);
    this.tooltipDescText = scene.add.text(x, y, '', {
      fontFamily: emojiFont,
      fontSize: '12px',
      color: '#cfd2ff',
      wordWrap: { width: 190, useAdvancedWrap: true },
      align: 'left'
    }).setOrigin(0, 0);
    // If using external hover bar, keep internal tooltip hidden
    if (this.hoverProxy) {
      this.tooltipNameText.setVisible(false);
      this.tooltipDescText.setVisible(false);
    }
    this.refresh();
  }

  refresh() {
    // Cleanup any prior dynamic nodes (icons/images)
    this.extraNodes.forEach(n => n.destroy());
    this.extraNodes = [];
    // Reset dom regions
    this.domRegions = [];
    this.domLastIdx = -1;
    // Clear old stat badges
    this.statBadges.forEach(b => b.destroy());
    this.statBadges = [];
    this.statsText.setText('');
    // Layout: single source of truth for panel + inner padding.
    const panelX = Math.max(12, this.x);
    const panelW = Math.min(360, this.scene.scale.width - panelX - 12);
    const innerPadX = 16;
    const innerX = panelX + innerPadX;
    const innerRight = panelX + panelW - innerPadX;

    // Draw main side panel background (rounded)
    {
      const panelHBase = Math.max(280, this.scene.scale.height - this.y - 30);
      const hoverReserved = 68; // GameScene hover bar (40) + bottom margin (28)
      const panelTop = this.y;
      const maxH = Math.max(160, this.scene.scale.height - panelTop - (hoverReserved + 10)); // keep a small gap above hover
      const panelH = Math.min(panelHBase, maxH);
      const bg = this.scene.add.graphics().setDepth(-20);
      bg.fillStyle(0x14151d, 1);
      bg.lineStyle(1, 0x2b2d38, 1);
      bg.fillRoundedRect(panelX, panelTop, panelW, panelH, 16);
      bg.strokeRoundedRect(panelX, panelTop, panelW, panelH, 16);
      this.extraNodes.push(bg);
    }

    // Top stats as icon badges (Level, Lives, Coins)
    const pillsTopY = this.y + 16;
    const emojiFont = 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    const drawPill = (emoji: string, value: number, x: number, hoverMsg: string, kind: 'level' | 'lives' | 'coins') => {
      // Create texts first to measure
      const icon = this.scene.add.text(0, 0, emoji, {
        fontFamily: emojiFont,
        fontSize: '18px',
        color: '#cfd2ff'
      }).setOrigin(0, 0.5).setDepth(20);
      const num = this.scene.add.text(0, 0, String(value), {
        fontFamily: 'LTHoop',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setDepth(20);
      if (kind === 'level') this.levelNum = num;
      if (kind === 'lives') this.livesNum = num;
      if (kind === 'coins') this.coinsNum = num;
      const padX = 10;
      const gap = 8;
      const padY = 6;
      const contentH = Math.max(icon.height, num.height);
      const pillH = Math.max(28, Math.ceil(contentH + padY * 2));
      const pillW = Math.ceil(padX + icon.width + gap + num.width + padX);
      // Background rounded rect
      const bg = this.scene.add.graphics().setDepth(-5);
      bg.lineStyle(1, 0x3a3a46, 1);
      bg.fillStyle(0x1a1b23, 1);
      bg.fillRoundedRect(x, pillsTopY, pillW, pillH, Math.floor(pillH / 2));
      bg.strokeRoundedRect(x, pillsTopY, pillW, pillH, Math.floor(pillH / 2));
      // Position texts centered vertically
      icon.setPosition(x + padX, pillsTopY + pillH / 2);
      num.setPosition(x + padX + icon.width + gap, pillsTopY + pillH / 2);
      // Register DOM region for hover fallback
      const over = () => {
        if (this.hoverProxy) this.hoverProxy('', '#e9e9ef', hoverMsg);
        else this.showTooltip('', '#e9e9ef', hoverMsg);
      };
      const out = () => {
        if (this.clearHoverProxy) this.clearHoverProxy(); else this.clearTooltip();
      };
      this.domRegions.push({ x, y: pillsTopY, w: pillW, h: pillH, over, out });
      // Hover wiring
      const attachHover = (el: Phaser.GameObjects.GameObject) => {
        (el as any).setInteractive?.({ useHandCursor: false });
        (el as any).on?.('pointerover', () => {
          if (this.hoverProxy) this.hoverProxy('', '#e9e9ef', hoverMsg);
          else this.showTooltip('', '#e9e9ef', hoverMsg);
        });
        (el as any).on?.('pointerout', () => {
          if (this.clearHoverProxy) this.clearHoverProxy();
          else this.clearTooltip();
        });
      };
      attachHover(bg);
      attachHover(icon as any);
      attachHover(num as any);
      this.statBadges.push(bg, icon, num);
      return { right: x + pillW, bottom: pillsTopY + pillH };
    };
    // Draw three pills with spacing
    const gapX = 12;
    let nextX = innerX;
    const levelPill = drawPill('🪜', runState.level, nextX, `You're on Level ${runState.level}`, 'level');
    nextX = levelPill.right + gapX;
    const livesPill = drawPill('❤️', runState.lives, nextX, `You have ${runState.lives} lives`, 'lives');
    nextX = livesPill.right + gapX;
    const coinsPill = drawPill('🟡', runState.gold, nextX, `You have ${runState.gold} coins`, 'coins');
    let cursorY = coinsPill.bottom + 10;

    // Clear previous lists
    this.shopTexts.forEach(t => t.destroy());
    this.challengeTexts.forEach(t => t.destroy());
    this.relicTexts.forEach(t => t.destroy());
    this.shopTexts = [];
    this.challengeTexts = [];
    this.relicTexts = [];
    this.tooltipNameText.setText('');
    this.tooltipDescText.setText('');

    // Board Manifest (card-style list)
    const goodColor = '#9ae6b4';
    const badColor = '#fca5a5';
    this.shopTexts.push(this.scene.add.text(innerX, cursorY, 'Board Manifest', { fontFamily: 'LTHoop', fontSize: '16px', fontStyle: 'bold', color: '#e9e9ef' }).setOrigin(0, 0));
    cursorY += 16;
    // Compute card bounds inside the panel, so we can right-align counts
    const cardLeft = innerX;
    const cardRight = innerRight;
    const countRightX = cardRight - 10;
    const cardGfx = this.scene.add.graphics().setDepth(-18);
    this.extraNodes.push(cardGfx);
    const rowsTopY = cursorY + 16; // add extra breathing room below header
    let rowY = rowsTopY;
    const rowH = 18;
    const shopLabelById: Record<string, string> = {};
    for (const t of SHOP_TILES) shopLabelById[t.id] = t.label;
    const shopIcon = (id: string) => {
      const m: Record<string, string> = {
        Diamond: '💎',
        '1Up': '❤️',
        Pickaxe: '🪓',
        Compass: '🧭',
        Scratchcard: '🎟️',
        GoodDeal: '👍',
        RemoteControl: '📺',
        AdvancePayment: '💳',
        Quartz: '⚪',
        '2Up': '💞',
        LuckyCat: '🐈‍⬛',
        TarotCard: '🪬',
        MetalDetector: '🔎',
        LaundryMoney: '🧼',
        PokerChip: '🃏',
        LuckyPenny: '🧧',
        NineToFive: '🏢'
      };
      return m[id] ?? '🟣';
    };
    // Build unified manifest rows (good + bad)
    const challengeLabel = (id: string) => {
      switch (id) {
        case ChallengeId.AutoGrat: return '💸 Auto Grat';
        case ChallengeId.Stopwatch: return '⏱️ Stopwatch';
        case ChallengeId.MathTest: return '☠️ Math Test';
        case ChallengeId.BadDeal: return '💱 Bad Deal';
        case ChallengeId.Clover2: return '🍀 2-Leaf Clover';
        case ChallengeId.SnakeOil: return '🧴 Snake Oil';
        case ChallengeId.SnakeVenom: return '🐍 Snake Venom';
        case ChallengeId.BloodPact: return '🩸 Blood Pact';
        case ChallengeId.CarLoan: return '🚗 Car Loan';
        case ChallengeId.MegaMine: return '💥 MegaMine';
        case ChallengeId.BloodDiamond: return '🔻 Blood Diamond';
        case ChallengeId.FindersFee: return '🫴 Finder’s Fee';
        case ChallengeId.ATMFee: return '🏧 ATM Fee';
        case ChallengeId.Coal: return '🪨 Coal';
        case ChallengeId.BoxingDay: return '🥊 Boxing Day';
        case ChallengeId.Jackhammer: return '🛠️ Jackhammer';
        case ChallengeId.DonationBox: return '🎁 Donation Box';
        case ChallengeId.Appraisal: return '📏 Appraisal';
        case ChallengeId.Key: return '🔑 Key';
        default: return id;
      }
    };
    // Good entries
    const goodEntries: Array<{ label: string; n: number; id?: string; type: 'builtin' | 'shop' }> = [];
    goodEntries.push({ label: '🪙 Ore', n: runState.stats.oreTotal, type: 'builtin' });
    goodEntries.push({ label: '❌ Exit', n: runState.stats.xRemaining, type: 'builtin' });
    const stripLeadingEmoji = (s: string) => {
      if (!s) return s;
      const cp = s.codePointAt(0);
      if (cp === undefined) return s;
      const first = String.fromCodePoint(cp);
      const firstLen = cp > 0xffff ? 2 : 1;
      const looksEmoji = /\p{Emoji}/u.test(first);
      if (!looksEmoji) return s;
      const rest = s.slice(firstLen);
      return rest.startsWith(' ') ? rest.slice(1) : rest;
    };
    const seenShopIds: Record<string, boolean> = {};
    for (const [id, n] of Object.entries(runState.stats.shopCounts || {})) {
      // Hide removed/unknown shop tiles (e.g. deprecated IDs from old runs).
      if (!shopLabelById[id]) continue;
      const cleanName = stripLeadingEmoji(shopLabelById[id] ?? id);
      goodEntries.push({ label: `${shopIcon(id)} ${cleanName}`, n: n as number, id, type: 'shop' });
      seenShopIds[id] = true;
    }
    // Ensure owned shop tiles appear even if they didn't spawn this level (count 0)
    for (const [ownedId, count] of Object.entries(runState.ownedShopTiles || {})) {
      if (!shopLabelById[ownedId]) continue;
      if (seenShopIds[ownedId]) continue;
      const cleanName = stripLeadingEmoji(shopLabelById[ownedId] ?? ownedId);
      goodEntries.push({ label: `${shopIcon(ownedId)} ${cleanName}`, n: 0, id: ownedId, type: 'shop' });
    }
    // Bad entries
    const badEntries: Array<{ label: string; n: number; id?: string; type: 'builtin' | 'challenge' }> = [];
    badEntries.push({ label: '💣 Mines', n: runState.stats.minesTotal, type: 'builtin' });
    const challengeEntries = Object.entries(runState.stats.challengeCounts).filter(([id]) => id !== String(ChallengeId.Coal));
    for (const [id, n] of challengeEntries) {
      badEntries.push({ label: challengeLabel(id), n: n as number, id, type: 'challenge' });
    }
    // Ensure drafted challenges appear even if they didn't spawn this level (count 0)
    {
      const seenChallengeIds: Record<string, boolean> = {};
      for (const [id] of challengeEntries) seenChallengeIds[id] = true;
      for (const [ownedId, count] of Object.entries(runState.ownedChallenges || {})) {
        if (!count || count <= 0) continue;
        if (ownedId === String(ChallengeId.Coal)) continue;
        if (seenChallengeIds[ownedId]) continue;
        badEntries.push({ label: challengeLabel(ownedId), n: 0, id: ownedId, type: 'challenge' });
      }
    }
    // Draw rows: good then bad
    const drawRow = (labelText: string, count: number, labelColor: string, hoverId?: { kind: 'shop' | 'builtinGood' | 'challenge' | 'builtinBad'; id?: string }) => {
      const leftText = this.scene.add.text(cardLeft + 10, rowY, labelText, { fontFamily: 'LTHoop', fontSize: '14px', color: labelColor }).setOrigin(0, 0).setDepth(20);
      // Make counts use the same font styling and grey color as labels
      const rightText = this.scene.add.text(countRightX, rowY, String(count), { fontFamily: 'LTHoop', fontSize: '14px', color: labelColor }).setOrigin(1, 0).setDepth(20);
      this.shopTexts.push(leftText, rightText);
      // index for flashing later
      if (hoverId?.kind === 'shop' && hoverId.id) this.shopRowById[hoverId.id] = leftText;
      if (hoverId?.kind === 'challenge' && hoverId.id) this.challengeRowById[hoverId.id] = leftText;
      // Hover bindings
      const bind = (el: Phaser.GameObjects.GameObject) => {
        (el as any).setInteractive?.({ useHandCursor: true });
        el.on?.('pointerover', () => {
          if (hoverId?.kind === 'shop' && hoverId.id) {
            const name = shopLabelById[hoverId.id] ?? hoverId.id;
            const desc = TILE_UI_TEXT[hoverId.id] ?? TILE_DESCRIPTIONS[hoverId.id] ?? EXTRA_TILE_DESCRIPTIONS[hoverId.id] ?? '';
            if (this.hoverProxy) this.hoverProxy(name, goodColor, desc); else this.showTooltip(name, goodColor, desc);
          } else if (hoverId?.kind === 'builtinGood') {
            const name = labelText;
            const desc = labelText.includes('Ore') ? 'Reveals gold when opened' : 'Exit tile; proceed after reveal';
            if (this.hoverProxy) this.hoverProxy(name, goodColor, desc); else this.showTooltip(name, goodColor, desc);
          } else if (hoverId?.kind === 'challenge' && hoverId.id) {
            const name = challengeLabel(hoverId.id);
            const desc = CHALLENGE_UI_TEXT[hoverId.id] ?? CHALLENGE_DESCRIPTIONS[hoverId.id] ?? '';
            if (this.hoverProxy) this.hoverProxy(name, badColor, desc); else this.showTooltip(name, badColor, desc);
    } else {
            const name = labelText;
            const desc = '';
            if (this.hoverProxy) this.hoverProxy(name, '#e9e9ef', desc); else this.showTooltip(name, '#e9e9ef', desc);
          }
        });
        el.on?.('pointerout', () => {
          if (this.clearHoverProxy) this.clearHoverProxy(); else this.clearTooltip();
        });
      };
      bind(leftText); bind(rightText);
      // Register DOM region for hover fallback
      const regionOver = () => {
        if (hoverId?.kind === 'shop' && hoverId.id) {
          const name = shopLabelById[hoverId.id] ?? hoverId.id;
          const desc = TILE_UI_TEXT[hoverId.id] ?? TILE_DESCRIPTIONS[hoverId.id] ?? EXTRA_TILE_DESCRIPTIONS[hoverId.id] ?? '';
          if (this.hoverProxy) this.hoverProxy(name, goodColor, desc); else this.showTooltip(name, goodColor, desc);
        } else if (hoverId?.kind === 'builtinGood') {
          const desc = labelText.includes('Ore') ? 'Reveals gold when opened' : 'Exit tile; proceed after reveal';
          if (this.hoverProxy) this.hoverProxy(labelText, goodColor, desc); else this.showTooltip(labelText, goodColor, desc);
        } else if (hoverId?.kind === 'challenge' && hoverId.id) {
          const name = challengeLabel(hoverId.id);
          const desc = CHALLENGE_UI_TEXT[hoverId.id] ?? CHALLENGE_DESCRIPTIONS[hoverId.id] ?? '';
          if (this.hoverProxy) this.hoverProxy(name, badColor, desc); else this.showTooltip(name, badColor, desc);
        } else {
          if (this.hoverProxy) this.hoverProxy(labelText, '#e9e9ef', ''); else this.showTooltip(labelText, '#e9e9ef', '');
        }
      };
      const fullW = Math.max(0, (cardRight - cardLeft) - 20);
      this.domRegions.push({ x: cardLeft + 10, y: rowY, w: fullW, h: rowH, over: regionOver, out: () => { if (this.clearHoverProxy) this.clearHoverProxy(); else this.clearTooltip(); } });
      rowY += rowH;
    };
    const mutedLabel = '#9aa0a6';
    for (const e of goodEntries.sort((a, b) => a.label.localeCompare(b.label))) {
      if (e.type === 'shop' && e.id) drawRow(e.label, e.n, mutedLabel, { kind: 'shop', id: e.id });
      else drawRow(e.label, e.n, mutedLabel, { kind: 'builtinGood' });
    }
    for (const e of badEntries.sort((a, b) => a.label.localeCompare(b.label))) {
      if (e.type === 'challenge' && e.id) drawRow(e.label, e.n, mutedLabel, { kind: 'challenge', id: e.id });
      else drawRow(e.label, e.n, mutedLabel, { kind: 'builtinBad' });
    }
    // Draw card background now that we know height
    const cardHeight = (rowY - rowsTopY) + 12;
    cardGfx.lineStyle(1, 0x2b2d38, 1);
    cardGfx.fillStyle(0x171922, 1);
    cardGfx.fillRoundedRect(cardLeft, rowsTopY - 8, Math.max(0, cardRight - cardLeft), cardHeight, 12);
    cardGfx.strokeRoundedRect(cardLeft, rowsTopY - 8, Math.max(0, cardRight - cardLeft), cardHeight, 12);
    cursorY = rowsTopY - 8 + cardHeight + 14; // extra breathing room below the card

    // (Old 'Challenges' list removed in favor of Tile Distribution breakdown)

    // Collectibles breakdown (owned stacks)
    const relicLabelById: Record<string, string> = {};
    for (const r of RELICS) relicLabelById[r.id] = r.label;
    const ownedRelics = runState.ownedRelics || {};
    const relicIds = Object.keys(ownedRelics);
    if (relicIds.length > 0) {
      this.relicTexts.push(this.scene.add.text(innerX, cursorY, 'Collectibles', { fontFamily: 'LTHoop', fontSize: '16px', fontStyle: 'bold', color: '#e9e9ef' }).setOrigin(0, 0));
      cursorY += 18;
      for (const id of relicIds.sort((a, b) => (relicLabelById[a] || a).localeCompare(relicLabelById[b] || b))) {
        const n = ownedRelics[id] ?? 0;
        const countSuffix = n > 1 ? ` ×${n}` : '';
        const txt = this.scene.add.text(innerX + 12, cursorY, `${relicLabelById[id] ?? id}${countSuffix}`, { fontFamily: 'LTHoop', fontSize: '14px', color: '#e9e9ef' }).setOrigin(0, 0).setDepth(20);
        txt.setInteractive({ useHandCursor: true });
        const desc = RELIC_UI_TEXT[id] ?? RELIC_DESCRIPTIONS[id] ?? EXTRA_RELIC_DESCRIPTIONS[id] ?? '';
        txt.on('pointerover', () => {
          const name = relicLabelById[id] ?? id;
          if (this.hoverProxy) this.hoverProxy(name, '#7dd3fc', desc);
          else this.showTooltip(name, '#7dd3fc', desc);
        });
        txt.on('pointerout', () => {
          if (this.clearHoverProxy) this.clearHoverProxy();
          else this.clearTooltip();
        });
        this.relicTexts.push(txt);
        // DOM fallback region so hover works even if Phaser input misses
        const name = relicLabelById[id] ?? id;
        const over = () => {
          if (this.hoverProxy) this.hoverProxy(name, '#7dd3fc', desc);
          else this.showTooltip(name, '#7dd3fc', desc);
        };
        const out = () => {
          if (this.clearHoverProxy) this.clearHoverProxy();
          else this.clearTooltip();
        };
        // Use a generous width inside the card, same row height as others
        const fullW = Math.max(0, (innerRight - innerX) - 20);
        this.domRegions.push({ x: innerX + 10, y: cursorY, w: fullW, h: 16, over, out });
        cursorY += 16;
      }
    }
    // Record bottom of content (for positioning other panels)
    this.contentBottomY = cursorY;
    // Tooltip anchored near bottom of the side column (like shop), not affecting layout
    if (!this.hoverProxy) {
    const tooltipTop = Math.max(this.y, this.scene.scale.height - 110);
      this.tooltipNameText.setPosition(innerX, tooltipTop);
      this.tooltipDescText.setPosition(innerX, tooltipTop);
    }
  }

  // DOM fallback hover routing from GameScene
  domRouteMove(x: number, y: number): boolean {
    for (let i = 0; i < this.domRegions.length; i++) {
      const r = this.domRegions[i];
      if (x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h) {
        if (this.domLastIdx !== i) {
          if (this.domLastIdx >= 0) this.domRegions[this.domLastIdx].out();
          this.domLastIdx = i;
          r.over();
        }
        return true;
      }
    }
    if (this.domLastIdx >= 0) {
      this.domRegions[this.domLastIdx].out();
      this.domLastIdx = -1;
    }
    return false;
  }

  domRouteDown(x: number, y: number): boolean {
    // We don't have clicks to process here; just consume if inside to prevent board routing
    return this.domRegions.some(r => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h);
  }

  getBottomY(): number {
    return this.contentBottomY;
  }

  // Public API: flash a manifest row when a tile procs
  flashRow(kind: 'shop' | 'challenge', id: string) {
    const row = kind === 'shop' ? this.shopRowById[id] : this.challengeRowById[id];
    if (!row) return;
    this.scene.tweens.add({
      targets: row,
      alpha: { from: 1, to: 0.15 },
      yoyo: true,
      repeat: 3,
      duration: 90
    });
  }

  // Public API: float a delta near lives/coins
  floatDelta(kind: 'lives' | 'coins', delta: number) {
    const ref = kind === 'lives' ? this.livesNum : this.coinsNum;
    if (!ref || delta === 0) return;
    const txt = this.scene.add.text(ref.x + ref.width + 8, ref.y, (delta > 0 ? `+${delta}` : `${delta}`), {
      fontFamily: 'LTHoop',
      fontSize: '14px',
      color: delta > 0 ? '#9ae6b4' : '#fca5a5'
    }).setOrigin(0, 0.5).setDepth(30);
    this.scene.tweens.add({
      targets: txt,
      alpha: { from: 1, to: 0 },
      y: txt.y - 12,
      duration: 700,
      onComplete: () => txt.destroy()
    });
  }

  private clearTooltip() {
    this.tooltipNameText.setText('');
    this.tooltipDescText.setText('');
  }

  private showTooltip(name: string, nameColor: string, desc: string) {
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
    if (!name || name.trim() === '') {
      this.tooltipNameText.setText('');
      this.tooltipDescText.setText(desc);
      this.tooltipDescText.setX(this.tooltipNameText.x);
      this.tooltipDescText.setY(this.tooltipNameText.y);
    } else {
      this.tooltipNameText.setColor(nameColor);
      this.tooltipNameText.setText(`${name}:`);
      // Place description just after the colored name
      this.tooltipDescText.setText(' ' + desc);
      this.tooltipDescText.setX(this.tooltipNameText.x + this.tooltipNameText.width + 6);
      this.tooltipDescText.setY(this.tooltipNameText.y);
    }
  }
}


