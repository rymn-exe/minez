// GameScene:
//  - Owns the Phaser board rendering (rectangles + numeric labels)
//  - Delegates all game logic to the reveal engine and listens to GameEvents
//  - Handles UX flows: hover/press states, double‑click chording,
//    ❌ resolution sequence (auto‑reveal ⏱️ → life countdown → resolve)
//  - Applies immediate collectible awards that depend on UI state (e.g. Cartographer on corners)
import Phaser from 'phaser';
import { GRID_SIZE, CELL, PADDING, PANEL_WIDTH, VIEW_WIDTH, VIEW_HEIGHT, ECONOMY } from '../game/consts';
// Font policy: use only two fonts across the app:
//  - LTHoop for all UI/body text
//  - GrapeSoda for primary titles
import { Board, TileKind, indexAt, ChallengeId, neighbors } from '../game/types';
import { generateLevel } from '../game/generation';
import { bindBoardForShopEffects, revealTile } from '../game/reveal';
import { runState } from '../state';
import { ManifestPanel } from '../ui/manifest';
import { events, GameEvent } from '../game/events';
import { ActiveEffectsPanel } from '../ui/activeEffects';
import { SHOP_TILES } from '../game/items';
import { TILE_DESCRIPTIONS, CHALLENGE_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, TILE_UI_TEXT, CHALLENGE_UI_TEXT } from '../game/descriptions';

const TILE_NORMAL = 0x2a2a34;
const TILE_HOVER = 0x3a3a46;
const TILE_PRESSED = 0x4a4a56;

export default class GameScene extends Phaser.Scene {
  private board!: Board;
  private tiles: Phaser.GameObjects.Rectangle[][] = [];
  private numbers: Phaser.GameObjects.Text[][] = [];
  private iconImages: Map<number, Phaser.GameObjects.Image> = new Map();
  private boardCell: number = CELL;
  private manifest!: ManifestPanel;
  private effectsPanel!: ActiveEffectsPanel;
  private hoverNameText!: Phaser.GameObjects.Text;
  private hoverDescText!: Phaser.GameObjects.Text;
  private clickTimes: number[][] = [];
  private pressedLeft: boolean[][] = [];
  private resolvingEnd: boolean = false;
  private cartographerAwarded: boolean = false;
  private disposers: Array<() => void> = [];
  private flagSwatches: Phaser.GameObjects.Arc[] = [];
  private flagSwatchHalos: Phaser.GameObjects.Arc[] = [];
  private flagSwatchKeys: Array<'white' | 'yellow' | 'blue'> = [];
  private static FLAG_COLOR_HEX: Record<'white' | 'yellow' | 'blue', string> = {
    white: '#d6d6dc',
    yellow: '#facc15',
    blue: '#60a5fa'
  };
  private flagPaintMode: boolean = false;
  private flagCursor?: Phaser.GameObjects.Text;
  private domHoverGX: number = -1;
  private domHoverGY: number = -1;
  private swatchLastClickTs: Record<string, number> = {};

  constructor() {
    super('GameScene');
  }

  preload() {
    if (!this.textures.exists('quartz_icon')) {
      this.load.image('quartz_icon', '/assets/sprites/ShopTile-Quartz.png');
    }
    if (!this.textures.exists('diamond_icon')) {
      this.load.image('diamond_icon', '/assets/sprites/ShopTile-Diamond.png');
    }
    if (!this.textures.exists('clover2_icon')) {
      this.load.image('clover2_icon', '/assets/sprites/ChallengeTile-2LeafClover.png');
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#121218');
    // Make sure the input system is fully active and filter to top-most hit
    (this.input as any).enabled = true;
    (this.input as any).topOnly = true;
    // Ensure browser routes events to the canvas
    try {
      (this.sys.game.canvas as any).style.pointerEvents = 'auto';
    } catch {}
    // Debug: show click counts to verify input is reaching this scene
    let sceneClickCount = 0;
    const clickCounter = this.add.text(8, 6, '', { fontFamily: 'LTHoop', fontSize: '12px', color: '#7dd3fc' }).setOrigin(0, 0).setDepth(3000).setScrollFactor(0);
    // Subtle animated background dots
    {
      const colors = [0xa78bfa, 0x7dd3fc, 0x9ae6b4, 0xfca5a5, 0xf59e0b];
      for (let i = 0; i < 64; i++) {
        const x = Math.random() * this.scale.width;
        const y = Math.random() * this.scale.height;
        const r = 2 + Math.random() * 2;
        const c = colors[i % colors.length];
        const dot = this.add.circle(x, y, r, c, 1).setAlpha(0.0).setDepth(0);
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.0, to: 0.22 },
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
    // Reset end-of-level guard on each level start
    this.resolvingEnd = false;
    // Cleanup any previous icon sprites if the scene is restarted
    this.iconImages.forEach(img => img.destroy());
    this.iconImages.clear();
    // Sprites are preloaded; no-op here.
    // Seed display
    const seedEl = document.getElementById('seed');
    if (seedEl) seedEl.textContent = `Seed: ${runState.seed}`;
    // Telemetry: log seed
    // eslint-disable-next-line no-console
    console.log('[Minez] Seed:', runState.seed, 'Level:', runState.level);

    // Generate level
    const { board } = generateLevel(GRID_SIZE, GRID_SIZE);
    this.board = board;
    bindBoardForShopEffects(this.board);

    // Reset per-level counters
    runState.stats.specialRevealedThisLevel = 0;
    runState.persistentEffects.optimistUsedThisLevel = false;
    this.cartographerAwarded = false;

    // Pioneer: start with 1 mine flagged
    const pioneer = runState.ownedRelics['Pioneer'] ?? 0;
    if (pioneer > 0) {
      let idx = this.board.tiles.findIndex(t => t.kind === TileKind.Mine && !t.flagged);
      if (idx < 0) {
        idx = this.board.tiles.findIndex(t => t.kind === TileKind.Challenge && t.subId === 'Clover2' && !t.flagged);
      }
      if (idx >= 0) {
        const picked = this.board.tiles[idx];
        picked.flagged = true;
        if (picked.kind === TileKind.Mine) {
          runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
        }
      }
    }

    // Cheapskate: start level with 10+ gold -> +1 life per stack
    const cheapskate = runState.ownedRelics['Cheapskate'] ?? 0;
    if (cheapskate > 0 && runState.gold >= 10) {
      runState.lives += cheapskate;
    }

    // Debt Collector: enter level with <0 gold -> +1 life per stack
    const debt = runState.ownedRelics['DebtCollector'] ?? 0;
    if (debt > 0 && runState.gold < 0) {
      runState.lives += debt;
    }

    // Fortune Teller: open an Ore tile at level start
    const fortune = runState.ownedRelics['FortuneTeller'] ?? 0;
    if (fortune > 0) {
      const idxOre = this.board.tiles.findIndex(t => t.kind === TileKind.Ore && !t.revealed);
      if (idxOre >= 0) {
        const p = this.board.tiles[idxOre].pos;
        revealTile(this.board, p.x, p.y);
      }
    }

    // Mathematician: reveal one highest number tile at level start
    const math = runState.ownedRelics['Mathematician'] ?? 0;
    if (math > 0) {
      let maxNum = -1;
      for (const t of this.board.tiles) {
        if (!t.revealed && t.kind === TileKind.Number) {
          if (t.number > maxNum) maxNum = t.number;
        }
      }
      if (maxNum > 0) {
        const candidates = this.board.tiles.filter(t => !t.revealed && t.kind === TileKind.Number && t.number === maxNum);
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          revealTile(this.board, pick.pos.x, pick.pos.y);
        }
      }
    }

    // Researcher: flag a random challenge tile at level start (use yellow flag)
    const researcher = runState.ownedRelics['Researcher'] ?? 0;
    if (researcher > 0) {
      const idx = this.board.tiles.findIndex(t => t.kind === TileKind.Challenge && !t.flagged && !t.revealed);
      if (idx >= 0) {
        this.board.tiles[idx].flagged = true;
        (this.board.tiles[idx] as any).flagColor = 'yellow';
      }
    }

    // Bottom-aligned hover bar (aligned with Shop/Teammate screens)
    const margin = 24;
    const hoverH = 40;
    const hoverY = this.scale.height - hoverH - 28;
    const hoverW = this.scale.width - margin * 2;
    // Transparent hover area so hover text appears to float
    this.add.rectangle(margin, hoverY, hoverW, hoverH, 0x000000, 0).setOrigin(0, 0).setDepth(4000);
    const emojiFont = 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    this.hoverNameText = this.add.text(margin + 12, hoverY + 8, '', { fontFamily: emojiFont, fontSize: '14px', color: '#a78bfa', align: 'left' }).setOrigin(0, 0).setDepth(4001);
    // Disable advanced wrapping and force left alignment to avoid space stretching
    this.hoverDescText = this.add.text(margin + 12, hoverY + 8, '', { fontFamily: emojiFont, fontSize: '14px', color: '#cfd2ff', align: 'left' }).setOrigin(0, 0).setDepth(4001);
    (this.hoverDescText as any).setWordWrapWidth?.(0, false);

    // Grid (slightly smaller to leave room above the hover bar)
    this.boardCell = 32; // local render size for game scene tiles
    const BOARD_LEFT = PADDING;
    const BOARD_TOP = PADDING;
    // Side panel aligned to actual board width (fix spacing)
    const sideX = BOARD_LEFT + GRID_SIZE * this.boardCell + PADDING;
    // Align right panel top more closely with the board top while keeping header clearance
    this.manifest = new ManifestPanel(this, sideX, PADDING + 24, {
      hoverProxy: (name, color, desc) => this.setHover(name, color, desc),
      clearHoverProxy: () => this.clearHover()
    });
    this.effectsPanel = new ActiveEffectsPanel(this, sideX, this.manifest.getBottomY() + 12);
    // Flag color picker (right panel) styled as a card
    {
      const efp: any = this.effectsPanel as any;
      const title = this.add.text(
        sideX,
        (efp.getBottomY ? efp.getBottomY() + 12 : (this.manifest.getBottomY() + 12)),
        'Flag Colour',
        { fontFamily: 'LTHoop', fontSize: '16px', color: '#e9e9ef' }
      ).setOrigin(0, 0);
      const topY = (title.getBounds ? title.getBounds().bottom : title.y + 30) + 8;
      // Align card to the side panel like other cards
      const mainX = Math.max(12, sideX - 12);
      const panelW = Math.min(360, this.scale.width - mainX - 12);
      const cardLeft = sideX - 2;
      const cardRight = mainX + panelW - 12;
      const cardWidth = Math.max(220, cardRight - cardLeft);
      // Smaller swatches with clearer selected state
      const r = 9;
      const gap = 20;
      // Center vertically: card has 18px padding top and bottom, so center = topY + 18 + r
      const baseY = topY + 18 + r;
      // Background card behind swatches
      const cardGfx = this.add.graphics().setDepth(-18);
      // Swatches
      const colors: Array<['white' | 'yellow' | 'blue', number]> = [
        ['white', 0xd6d6dc],
        ['yellow', 0xfacc15],
        ['blue', 0x60a5fa]
      ];
      // Center swatches horizontally within the card
      const count = colors.length;
      const totalW = count * (2 * r) + (count - 1) * gap;
      let cx = cardLeft + cardWidth / 2 - totalW / 2 + r;
      this.flagSwatches = [];
      this.flagSwatchHalos = [];
      this.flagSwatchKeys = [];
      colors.forEach(([key, fill]) => {
        const halo = this.add.circle(cx, baseY, r + 5, 0x000000, 0)
          .setOrigin(0.5, 0.5)
          .setStrokeStyle(3, 0x9ae6b4);
        halo.setVisible(false);
        const node = this.add.circle(cx, baseY, r, fill, 1)
          .setOrigin(0.5, 0.5)
          .setStrokeStyle(2, 0x3a3a46);
        node.setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            const now = this.time.now;
            const last: number = (node as any).getData?.('lastClickTs') ?? 0;
            const isDouble = now - last < 250;
            (node as any).setData?.('lastClickTs', now);
            const prevColor = runState.flagColor;
            runState.flagColor = key;
            this.refreshFlagPicker();
            this.updateFlagCursorAppearance();
            this.renderAll();
            if (isDouble) {
              if (this.flagPaintMode && prevColor === key) this.disableFlagPaintMode();
              else this.enableFlagPaintMode();
            }
          });
        this.flagSwatchHalos.push(halo);
        this.flagSwatches.push(node);
        this.flagSwatchKeys.push(key);
        cx += r * 2 + gap;
      });
      // Draw the card after measuring layout
      const cardHeight = 18 + r * 2 + 18;
      cardGfx.lineStyle(1, 0x2b2d38, 1);
      cardGfx.fillStyle(0x171922, 1);
      cardGfx.fillRoundedRect(cardLeft, topY, cardWidth, cardHeight, 12);
      cardGfx.strokeRoundedRect(cardLeft, topY, cardWidth, cardHeight, 12);
      this.refreshFlagPicker();
    }
    // Follow pointer with a flag indicator while in paint mode
    {
      const moveHandler = (pointer: Phaser.Input.Pointer) => {
        if (this.flagPaintMode && this.flagCursor) {
          this.flagCursor.setPosition(pointer.x + 8, pointer.y + 8);
        }
      };
      this.input.on('pointermove', moveHandler);
      this.disposers.push(() => this.input.off('pointermove', moveHandler as any));
    }
    // Nudge: some browsers settle webfonts one frame late even after fonts.ready.
    // Force a second-pass layout once shortly after create so texts pick up LTHoop.
    this.time.delayedCall(60, () => {
      try {
        this.manifest.refresh();
        this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
        this.effectsPanel.refresh?.();
        this.refreshFlagPicker();
      } catch {}
    });
    // Quick escape from flag paint mode using ESC
    {
      const escHandler = () => this.disableFlagPaintMode();
      this.input.keyboard?.on('keydown-ESC', escHandler);
      this.disposers.push(() => this.input.keyboard?.off('keydown-ESC', escHandler));
    }
    // Temporary: click-blip to verify scene input is firing
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const blip = this.add.circle(pointer.x, pointer.y, 4, 0xff66cc, 1).setDepth(2000);
      this.tweens.add({ targets: blip, alpha: 0, duration: 250, onComplete: () => blip.destroy() });
    });
    // Also attach a DOM-level listener to detect if the page itself is swallowing events before Phaser
    const domHandler = (ev: PointerEvent) => {
      const last = (window as any).__minezLastPhaserDown as number | undefined;
      const lastFlagged = !!(window as any).__minezLastPhaserFlagged;
      const recentlyHandled = !!(last && performance.now() - last < 350);
      // If Phaser just handled this and performed a flag action, skip routing.
      // If Phaser handled it but did NOT flag and this is a ctrl/meta click, route it as a flag.
      if (recentlyHandled && lastFlagged) return;
      // Place a small teal dot at DOM coordinates to prove events arrive at the page
      const blip = this.add.circle(ev.clientX, ev.clientY, 4, 0x22e0c0, 1).setDepth(2001);
      this.tweens.add({ targets: blip, alpha: 0, duration: 300, onComplete: () => blip.destroy() });
      // Fallback: route DOM pointer events to game logic if Phaser input misses them
      if (!recentlyHandled || (ev.ctrlKey || ev.metaKey)) {
        this.routeDomPointer(ev);
      }
    };
    window.addEventListener('pointerdown', domHandler, { passive: true });
    const domMove = (ev: PointerEvent) => this.routeDomMove(ev);
    window.addEventListener('pointermove', domMove, { passive: true });
    // Prevent context menu so right-click can be used for flags even via DOM route
    const cm = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', cm);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pointerdown', domHandler as any);
      window.removeEventListener('pointermove', domMove as any);
      window.removeEventListener('contextmenu', cm as any);
    });
    // Phaser-level global fallback: always allow Ctrl/Cmd/right-click to flag the tile under the cursor
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const evt: any = (pointer as any).event || {};
      const wantsFlag = this.flagPaintMode || pointer.rightButtonDown() || evt.button === 2 || (pointer as any).ctrlKey || evt.ctrlKey || evt.metaKey;
      if (!wantsFlag) return;
      // Translate to board grid using Phaser pointer (already in game coords)
      const x = pointer.x;
      const y = pointer.y;
      const BOARD_LEFT = PADDING;
      const BOARD_TOP = PADDING;
      const boardW = GRID_SIZE * this.boardCell;
      const boardH = GRID_SIZE * this.boardCell;
      if (x < BOARD_LEFT || y < BOARD_TOP || x >= BOARD_LEFT + boardW || y >= BOARD_TOP + boardH) return;
      // Prefer the tile currently in hover state for precision on borders
      const gx = (this.domHoverGX !== -1) ? this.domHoverGX : Math.floor((x - BOARD_LEFT) / this.boardCell);
      const gy = (this.domHoverGY !== -1) ? this.domHoverGY : Math.floor((y - BOARD_TOP) / this.boardCell);
      // Avoid triggering reveal on pointerup for this tile
      (this.pressedLeft[gy] ||= [])[gx] = false;
      this.toggleFlag(gx, gy);
      // Mark as handled so DOM fallback does not double-handle
      (window as any).__minezLastPhaserDown = performance.now();
      (window as any).__minezLastPhaserFlagged = true;
    });
    for (let y = 0; y < GRID_SIZE; y++) {
      this.tiles[y] = [];
      this.numbers[y] = [];
      this.clickTimes[y] = [];
      this.pressedLeft[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const rx = BOARD_LEFT + x * this.boardCell + this.boardCell / 2;
        const ry = BOARD_TOP + y * this.boardCell + this.boardCell / 2;

        const rect = this.add.rectangle(rx, ry, this.boardCell - 2, this.boardCell - 2, TILE_NORMAL).setStrokeStyle(1, 0x3a3a46).setDepth(1000);
        rect.setInteractive({ useHandCursor: true });
        // Debug: record click counts without altering tile fill (avoid fighting revealed alpha)
        rect.on('pointerdown', () => {
          sceneClickCount++;
          clickCounter.setText(`clicks: ${sceneClickCount}`);
        });

        rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          // Robust right/ctrl/command detection (covers macOS ctrl-click as right-click)
          const evt: any = (pointer as any).event || {};
          const withModifier = !!((pointer as any).ctrlKey || evt.ctrlKey || evt.metaKey);
          const isRight = !!(pointer.rightButtonDown() || evt.button === 2 || pointer.buttons === 2);
          const shouldFlag = this.flagPaintMode || isRight || withModifier;
          // Mark that Phaser handled this pointer so DOM fallback can cooperate
          (window as any).__minezLastPhaserDown = performance.now();
          (window as any).__minezLastPhaserFlagged = shouldFlag;
          if (shouldFlag) {
            // Ensure no reveal occurs on pointerup after a flag action
            this.pressedLeft[y][x] = false;
            this.toggleFlag(x, y);
          } else {
            // Detect double-click early for reliable chording
            const now = this.time.now;
            const last = this.clickTimes[y][x] ?? 0;
            if (now - last < 500) {
              this.pressedLeft[y][x] = false;
              this.chordReveal(x, y);
              this.clickTimes[y][x] = 0;
              return;
            }
            this.pressedLeft[y][x] = true;
            this.setTileHoverState(x, y, 'pressed');
            this.clickTimes[y][x] = now;
          }
        });
        rect.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          const tBefore = this.board.tiles[indexAt(this.board, x, y)];
          let didAction = false;
          if (!pointer.rightButtonReleased() && this.pressedLeft[y][x]) {
            const now = this.time.now;
            const last = this.clickTimes[y][x] ?? 0;
            if (now - last < 500) {
              this.chordReveal(x, y);
              this.clickTimes[y][x] = 0;
              didAction = true;
            } else {
              this.handleReveal(x, y);
              this.clickTimes[y][x] = now;
              didAction = true;
            }
          }
          this.pressedLeft[y][x] = false;
          // Recompute tile after any action and ensure proper styling
          const tAfter = this.board.tiles[indexAt(this.board, x, y)];
          if (didAction) {
            this.renderTile(x, y);
          }
          if (!tAfter.revealed) this.setTileHoverState(x, y, 'hover');
        });
        rect.on('pointerupoutside', () => {
          this.pressedLeft[y][x] = false;
          this.setTileHoverState(x, y, 'normal');
        });
        rect.on('pointerover', () => {
          this.setTileHoverState(x, y, 'hover');
          this.showTileHover(x, y);
        });
        rect.on('pointerout', () => {
          this.setTileHoverState(x, y, 'normal');
          this.clearHover();
        });

        this.tiles[y][x] = rect;
        const label = this.add.text(rx, ry, '', { fontFamily: 'LTHoop', fontSize: '16px', color: '#d6d6dc' }).setOrigin(0.5).setDepth(1001);
        this.numbers[y][x] = label;
      }
    }

    this.input.mouse?.disableContextMenu();

    // Event listeners
    this.disposers.push(events.on(GameEvent.LevelEndResolved, ({ survived }) => {
      if (this.resolvingEnd) return;
      this.resolvingEnd = true;
      this.resolveLevel(survived);
    }));

    // Flip animation on any tile reveal
    this.disposers.push(events.on(GameEvent.TileRevealed, ({ tile }: any) => {
      const { x, y } = tile.pos;
      this.animateFlipAt(x, y);
      // If Math Test was revealed, don't show its hover blurb; clear any lingering hover
      if (tile.kind === TileKind.Challenge && String(tile.subId) === String(ChallengeId.MathTest)) {
        this.clearHover();
      }
      // Mine: flash twice then show explosion emoji
      if (tile.kind === TileKind.Mine) {
        this.time.delayedCall(190, () => {
          const label = this.numbers[y][x];
          if (!label) return;
          this.tweens.add({
            targets: label,
            alpha: { from: 1, to: 0.2 },
            yoyo: true,
            repeat: 1,
            duration: 120,
            onComplete: () => label.setText('💥')
          });
        });
      }
      // Manifest row flash for shop/challenge tiles
      if (tile.kind === TileKind.Shop) {
        const id = String(tile.subId || '');
        (this.manifest as any).flashRow?.('shop', id);
      } else if (tile.kind === TileKind.Challenge) {
        const id = String(tile.subId || '');
        (this.manifest as any).flashRow?.('challenge', id);
      }
    }));

    // Award Cartographer as soon as all four corners are revealed (any tile types)
    this.disposers.push(events.on(GameEvent.TileRevealed, ({ tile }: any) => {
      if (this.cartographerAwarded) return;
      const stacks = runState.ownedRelics['Cartographer'] ?? 0;
      if (stacks <= 0) return;
      const w = this.board.width, h = this.board.height;
      const corners = [
        this.board.tiles[0],
        this.board.tiles[w - 1],
        this.board.tiles[(h - 1) * w],
        this.board.tiles[h * w - 1]
      ];
      if (corners.every(t => t.revealed)) {
        runState.gold += 5 * stacks;
        this.cartographerAwarded = true;
        this.manifest.refresh();
      }
    }));

    // Tax Collector: +1 gold whenever you gain gold per stack
    this.disposers.push(events.on(GameEvent.GoldGained, ({ amount, source }) => {
      const stacks = runState.ownedRelics['TaxCollector'] ?? 0;
      if (stacks > 0 && amount > 0) {
        runState.gold += stacks;
        // eslint-disable-next-line no-console
        console.log('[Minez] Tax Collector +', stacks, 'from', source);
        this.manifest.refresh();
      }
      // Float coin delta in the right panel
      (this.manifest as any).floatDelta?.('coins', amount);
    }));
    // Lives delta float
    this.disposers.push(events.on(GameEvent.LifeChanged, ({ delta }) => {
      (this.manifest as any).floatDelta?.('lives', delta);
      this.manifest.refresh();
    }));

    // Unsubscribe on scene shutdown to avoid listener leaks across levels
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.disposers) off();
      this.disposers = [];
    });

    this.renderAll();
  }

  private clearHover() {
    if (this.hoverNameText && this.hoverDescText) {
      this.hoverNameText.setText('');
      this.hoverDescText.setText('');
    }
  }

  private setHover(name: string, color: string, desc: string) {
    if (!this.hoverNameText || !this.hoverDescText) return;
    // Ensure a space between a leading emoji and the word without breaking surrogate pairs.
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
      this.hoverNameText.setText('');
      this.hoverDescText.setText(desc);
      this.hoverDescText.setX(this.hoverNameText.x);
      this.hoverDescText.setY(this.hoverNameText.y);
    } else {
      this.hoverNameText.setColor(color);
      this.hoverNameText.setText(`${name}:`);
      this.hoverDescText.setText(' ' + desc);
      this.hoverDescText.setX(this.hoverNameText.x + this.hoverNameText.width + 6);
      this.hoverDescText.setY(this.hoverNameText.y);
    }
  }

  private showTileHover(x: number, y: number) {
    const t = this.board.tiles[indexAt(this.board, x, y)];
    // For unrevealed tiles, don't show text; the tile itself lightens via hover state
    if (!t.revealed) { this.clearHover(); return; }
    if (t.kind === TileKind.Shop) {
      const id = t.subId as string;
      const labelMap: Record<string, string> = {};
      for (const s of SHOP_TILES) labelMap[s.id] = s.label;
      const name = labelMap[id] ?? id;
      const desc = (TILE_UI_TEXT as any)[id] ?? (TILE_DESCRIPTIONS as any)[id] ?? (EXTRA_TILE_DESCRIPTIONS as any)[id] ?? '';
      if (desc) this.setHover(name, '#a78bfa', desc);
      else this.clearHover();
      return;
    }
    if (t.kind === TileKind.Challenge) {
      const id = String(t.subId);
      // Suppress transient hover spam for Math Test after reveal
      if (id === String(ChallengeId.MathTest)) {
        this.clearHover();
        return;
      }
      const name = this.challengeLabel(id);
      const desc = (CHALLENGE_UI_TEXT as any)[id] ?? CHALLENGE_DESCRIPTIONS[id] ?? '';
      if (desc) this.setHover(name, '#a7f3d0', desc);
      else this.clearHover();
      return;
    }
    if (t.kind === TileKind.Ore) {
      this.setHover('🪙 Ore', '#9ae6b4', 'Reveals gold when opened');
      return;
    }
    if (t.kind === TileKind.X) {
      this.setHover('❌ Exit', '#9ae6b4', 'Proceed to the next level');
      return;
    }
    if (t.kind === TileKind.Mine) {
      this.setHover('💣 Mine', '#fca5a5', 'Explodes when revealed');
      return;
    }
    if (t.kind === TileKind.Number) {
      this.setHover(`Number ${t.number}`, '#e9e9ef', 'Adjacent mines count');
      return;
    }
    if (t.kind === TileKind.Safe) {
      this.setHover('Safe', '#e9e9ef', 'Empty tile');
      return;
    }
    // Other tile types: no hover text
    this.clearHover();
  }

  private toggleFlag(x: number, y: number) {
    const idx = indexAt(this.board, x, y);
    const t = this.board.tiles[idx];
    if (t.revealed) return;
    const next = !t.flagged;
    // Update mines remaining display when correctly flagging/unflagging a real mine
    if (t.kind === TileKind.Mine) {
      if (next) {
        runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
      } else {
        runState.stats.minesTotal += 1;
      }
    }
    t.flagged = next;
    if (next) {
      // Persist the selected flag color at the time of placement
      (t as any).flagColor = runState.flagColor;
    } else {
      // Clear stored color when unflagging
      delete (t as any).flagColor;
    }
    this.renderTile(x, y);
    this.manifest.refresh();
  }

  private handleReveal(x: number, y: number) {
    const idx = indexAt(this.board, x, y);
    const tileBefore = this.board.tiles[idx];
    const wasX = tileBefore.kind === TileKind.X;
    // Two‑step X behaviour:
    // 1) First click on an unrevealed X only reveals it (no progress)
    // 2) Second click on the revealed X proceeds the level
    if (wasX && !tileBefore.revealed) {
      // If the X is flagged, first left‑click should unflag rather than reveal/proceed
      if (tileBefore.flagged) {
        tileBefore.flagged = false;
        this.renderTile(x, y);
        this.manifest.refresh();
        return;
      }
      revealTile(this.board, x, y, false); // reveal only
      this.manifest.refresh();
      this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
      this.effectsPanel.refresh();
      return;
    }
    const res = revealTile(this.board, x, y, true);
    this.manifest.refresh();
    this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
    this.effectsPanel.refresh();
    // If X is clicked when already revealed, proceed the level (stopwatches disabled).
    if (wasX) {
      let toLose = 0;
      const finalize = () => {
        const survived = runState.lives > 0;
        if (survived) {
          // Finder's Fee: no end-of-level gold if revealed before X
          if (!(runState.persistentEffects as any).noEndGold) {
            runState.gold += ECONOMY.endOfLevelGold;
            events.emit(GameEvent.GoldGained, { amount: ECONOMY.endOfLevelGold, source: 'LevelClear' } as any);
          }
          this.manifest.refresh();
        }
        // Navigate immediately; also guard against double-resolve
        if (!this.resolvingEnd) {
          this.resolvingEnd = true;
          this.resolveLevel(survived);
          // extra safety: force navigation again shortly after
          if (survived) {
            this.time.delayedCall(10, () => {
              if (this.scene.isActive('GameScene')) {
                this.scene.start('ShopScene');
              }
            });
          }
        }
      };
      const stepDown = (remaining: number) => {
        if (remaining <= 0) {
          // slight delay to let UI settle
          this.time.delayedCall(150, finalize);
          return;
        }
        if (runState.lives > 0) {
          runState.lives = Math.max(0, runState.lives - 1);
          this.manifest.refresh();
        }
        this.time.delayedCall(250, () => stepDown(remaining - 1));
      };
      if (toLose > 0) {
        this.time.delayedCall(200, () => stepDown(toLose));
      } else {
        finalize();
      }
    }
    // Non‑X deaths (mine, megamine, bad deal, etc.): ensure we resolve as a loss.
    else if (res.endedLevel && !this.resolvingEnd) {
      this.resolvingEnd = true;
      this.resolveLevel(false);
    }
  }

  // Minesweeper chording: double-click a revealed number to open all unflagged neighbors
  private chordReveal(x: number, y: number) {
    const t = this.board.tiles[indexAt(this.board, x, y)];
    if (!t.revealed || t.kind !== TileKind.Number) return;
    const neighs = neighbors(this.board, x, y);
    // Count flags OR already revealed mines toward satisfying the number
    const satisfied = neighs.reduce((acc, p) => {
      const nt = this.board.tiles[indexAt(this.board, p.x, p.y)];
      const revealedMine =
        (nt.kind === TileKind.Mine && nt.revealed) ||
        (nt.kind === TileKind.Challenge && nt.subId === ChallengeId.MegaMine && nt.revealed);
      return acc + ((nt.flagged || revealedMine) ? 1 : 0);
    }, 0);
    if (satisfied !== t.number) return;
    for (const p of neighs) {
      const nt = this.board.tiles[indexAt(this.board, p.x, p.y)];
      if (!nt.revealed && !nt.flagged) {
        revealTile(this.board, p.x, p.y, true);
      }
    }
    this.manifest.refresh();
    this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
    this.effectsPanel.refresh();
  }

  private renderAll() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.renderTile(x, y);
      }
    }
  }

  // Animate a flip at a given grid coordinate: shrink → swap content → expand
  private animateFlipAt(x: number, y: number) {
    const rect = this.tiles[y][x];
    const label = this.numbers[y][x];
    // Guard against missing objects (shouldn't happen)
    if (!rect || !label) return;
    // First half: scaleX to 0
    this.tweens.add({
      targets: [rect, label],
      scaleX: 0,
      duration: 90,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Swap to revealed visuals
        this.renderTile(x, y);
        // If an icon image was created during render, include it in the second half
        const idx = indexAt(this.board, x, y);
        const img = this.iconImages.get(idx);
        if (img) img.setScale(0, img.scaleY);
        // Second half: expand back to 1
        const targets: any[] = [rect, label];
        if (img) targets.push(img);
        this.tweens.add({
          targets,
          scaleX: 1,
          duration: 90,
          ease: 'Sine.easeOut'
        });
      }
    });
  }

  private setTileHoverState(x: number, y: number, state: 'normal' | 'hover' | 'pressed') {
    const t = this.board.tiles[indexAt(this.board, x, y)];
    const rect = this.tiles[y][x];
    if (t.revealed) return;
    switch (state) {
      case 'hover':
        rect.setFillStyle(TILE_HOVER, 1);
        break;
      case 'pressed':
        rect.setFillStyle(TILE_PRESSED, 1);
        break;
      default:
        rect.setFillStyle(TILE_NORMAL, 1);
    }
  }

  private renderTile(x: number, y: number) {
    const idx = indexAt(this.board, x, y);
    const t = this.board.tiles[idx];
    const rect = this.tiles[y][x];
    const label = this.numbers[y][x];
    // helper to clear any icon image at this tile
    const clearIcon = () => {
      const img = this.iconImages.get(idx);
      if (img) {
        img.destroy();
        this.iconImages.delete(idx);
      }
    };

    if (!t.revealed) {
      // Original solid fill for unrevealed tiles
      rect.setFillStyle(TILE_NORMAL, 1);
      if (t.flagged) {
        label.setText('⚑');
        const stored = (t as any).flagColor as ('white' | 'yellow' | 'blue' | undefined);
        const css = GameScene.FLAG_COLOR_HEX[stored ?? 'white'] ?? GameScene.FLAG_COLOR_HEX.white;
        label.setColor(css);
      } else {
        label.setText('');
        label.setColor('#d6d6dc');
      }
      clearIcon();
      return;
    }

    // Revealed styling
    const revealedAlpha = 0.6;
    if (t.kind === TileKind.Mine) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      label.setText('💣');
      clearIcon();
    } else if (t.kind === TileKind.X) {
      rect.setFillStyle(0x1e7b4a, revealedAlpha);
      label.setText('❌');
      clearIcon();
    } else if (t.kind === TileKind.Ore) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for ore and upgrades
      label.setText((t as any).subId === 'Diamond' ? '💎' : '🪙');
      clearIcon();
    } else if (t.kind === TileKind.Shop) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for shop tiles
      label.setText(this.shopIcon(t.subId, t.compassDir));
      clearIcon();
    } else if (t.kind === TileKind.Challenge) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for challenges
      label.setText(this.challengeIcon(t.subId));
      clearIcon();
    } else if (t.kind === TileKind.Safe) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Persistent frontier masking:
      // If a revealed 0-tile ever borders an unrevealed neighbor, mark it to always display '?'
      if (t.number === 0) {
        const hasUnrevealedNeighbor = neighbors(this.board, x, y).some(p => {
          const nt = this.board.tiles[indexAt(this.board, p.x, p.y)];
          return !nt.revealed;
        });
        if (hasUnrevealedNeighbor && (t as any).subId !== 'FrontierQuestion') {
          (t as any).subId = 'FrontierQuestion';
        }
        label.setText((t as any).subId === 'FrontierQuestion' ? '?' : '');
      } else {
        label.setText('');
      }
      clearIcon();
    } else if (t.kind === TileKind.Number) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      if ((t as any).mathMasked) {
        label.setText('?');
      } else {
        label.setText(String(t.number));
      }
      clearIcon();
    }
  }

  private refreshFlagPicker() {
    const selected = runState.flagColor;
    const map: Record<'white' | 'yellow' | 'blue', number> = {
      white: 0xd6d6dc,
      yellow: 0xfacc15,
      blue: 0x60a5fa
    };
    this.flagSwatches.forEach((node: any, idx: number) => {
      // node.fillColor is a number; compare to map to detect which is selected
      const isSelected =
        (selected === 'white' && node.fillColor === map.white) ||
        (selected === 'yellow' && node.fillColor === map.yellow) ||
        (selected === 'blue' && node.fillColor === map.blue);
      node.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x9ae6b4 : 0x3a3a46);
      const halo = this.flagSwatchHalos[idx];
      if (halo) halo.setVisible(!!isSelected);
    });
  }

  private enableFlagPaintMode() {
    if (this.flagPaintMode) return;
    this.flagPaintMode = true;
    // Hide the system cursor and show our flag cursor indicator
    this.input.setDefaultCursor('none');
    if (!this.flagCursor) {
      this.flagCursor = this.add.text(0, 0, '⚑', {
        fontFamily: 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: '20px',
        color: GameScene.FLAG_COLOR_HEX[runState.flagColor] ?? '#d6d6dc'
      }).setOrigin(0, 0).setDepth(5000);
    }
    this.flagCursor.setVisible(true);
    this.updateFlagCursorAppearance();
  }

  private disableFlagPaintMode() {
    if (!this.flagPaintMode) return;
    this.flagPaintMode = false;
    this.input.setDefaultCursor('default');
    if (this.flagCursor) this.flagCursor.setVisible(false);
  }

  private updateFlagCursorAppearance() {
    if (!this.flagCursor) return;
    const css = GameScene.FLAG_COLOR_HEX[runState.flagColor] ?? '#d6d6dc';
    this.flagCursor.setColor(css);
  }

  // Fallback route: translate DOM pointer to board action when Phaser input fails
  private routeDomPointer(ev: PointerEvent) {
    const canvas = this.sys.game.canvas as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = ev.clientX - rect.left;
    const rawY = ev.clientY - rect.top;
    // Convert from CSS pixels to game coordinates (handles FIT scaling, DPR)
    const scaleX = this.scale.width / rect.width;
    const scaleY = this.scale.height / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;
    // Give right-side panel first chance (so board doesn't steal clicks)
    if ((this.manifest as any)?.domRouteDown?.(x, y)) {
      return;
    }
    // First, hit-test flag swatches so the selector remains clickable
    for (let i = 0; i < this.flagSwatches.length; i++) {
      const s = this.flagSwatches[i];
      if (!s || !s.active || !s.visible) continue;
      const dx = x - s.x;
      const dy = y - s.y;
      const dist2 = dx * dx + dy * dy;
      const r = ((s as any).radius ?? 10) + 6; // expand hit area slightly
      if (dist2 <= r * r) {
        const key = this.flagSwatchKeys[i];
        const last = this.swatchLastClickTs[key] ?? 0;
        const now = performance.now();
        const isDouble = now - last < 250;
        this.swatchLastClickTs[key] = now;
        const prevColor = runState.flagColor;
        runState.flagColor = key;
        this.refreshFlagPicker();
        this.updateFlagCursorAppearance();
        this.renderAll();
        if (isDouble) {
          if (this.flagPaintMode && prevColor === key) this.disableFlagPaintMode();
          else this.enableFlagPaintMode();
        }
        return; // handled by swatch
      }
    }
    // Board area bounds
    const BOARD_LEFT = PADDING;
    const BOARD_TOP = PADDING;
    const boardW = GRID_SIZE * this.boardCell;
    const boardH = GRID_SIZE * this.boardCell;
    if (x < BOARD_LEFT || y < BOARD_TOP || x >= BOARD_LEFT + boardW || y >= BOARD_TOP + boardH) {
      return;
    }
    const gx = Math.floor((x - BOARD_LEFT) / this.boardCell);
    const gy = Math.floor((y - BOARD_TOP) / this.boardCell);
    // If paint mode or ctrl/right-click: toggle flag. Otherwise reveal.
    const isRight = ev.button === 2;
    const wantsFlag = this.flagPaintMode || ev.ctrlKey || ev.metaKey || isRight;
    if (!wantsFlag) {
      // DOM reveal fallback with double-click (chord) support
      const now = performance.now();
      const last = (this.clickTimes[gy]?.[gx] ?? 0) as number;
      if (!this.clickTimes[gy]) this.clickTimes[gy] = [];
      if (now - last < 500) {
        this.chordReveal(gx, gy);
        this.clickTimes[gy][gx] = 0;
      } else {
        this.handleReveal(gx, gy);
        this.clickTimes[gy][gx] = now;
      }
      return;
    }
    // Prefer hovered tile so ctrl+click always flags what's highlighted
    const useGX = (this.domHoverGX !== -1) ? this.domHoverGX : gx;
    const useGY = (this.domHoverGY !== -1) ? this.domHoverGY : gy;
    this.toggleFlag(useGX, useGY);
    return;
    // If we reached here earlier (non-flag), Phaser will handle reveal. Kept return to be explicit.
  }

  // Fallback hover routing: update hover text when moving over revealed tiles
  private routeDomMove(ev: PointerEvent) {
    const canvas = this.sys.game.canvas as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = ev.clientX - rect.left;
    const rawY = ev.clientY - rect.top;
    const scaleX = this.scale.width / rect.width;
    const scaleY = this.scale.height / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;
    if (this.flagPaintMode && this.flagCursor) {
      this.flagCursor.setPosition(x + 8, y + 8);
    }
    // Route to right panel hovers first
    if ((this.manifest as any)?.domRouteMove?.(x, y)) {
      return;
    }
    const BOARD_LEFT = PADDING;
    const BOARD_TOP = PADDING;
    const boardW = GRID_SIZE * this.boardCell;
    const boardH = GRID_SIZE * this.boardCell;
    if (x < BOARD_LEFT || y < BOARD_TOP || x >= BOARD_LEFT + boardW || y >= BOARD_TOP + boardH) {
      if (this.domHoverGX !== -1 && this.domHoverGY !== -1) {
        this.setTileHoverState(this.domHoverGX, this.domHoverGY, 'normal');
      }
      this.domHoverGX = -1; this.domHoverGY = -1;
      this.clearHover();
      return;
    }
    const gx = Math.floor((x - BOARD_LEFT) / this.boardCell);
    const gy = Math.floor((y - BOARD_TOP) / this.boardCell);
    if (gx === this.domHoverGX && gy === this.domHoverGY) return;
    // Reset previous tile hover
    if (this.domHoverGX !== -1 && this.domHoverGY !== -1) {
      this.setTileHoverState(this.domHoverGX, this.domHoverGY, 'normal');
    }
    this.domHoverGX = gx; this.domHoverGY = gy;
    const t = this.board.tiles[indexAt(this.board, gx, gy)];
    if (!t.revealed) {
      this.setTileHoverState(gx, gy, 'hover');
    }
    this.showTileHover(gx, gy);
  }

  // Apply end-of-level collectibles and navigate to next scene or loss
  private resolveLevel(survived: boolean) {
    // Resurrector: if end level with 1 life -> +1 life per stack
    if (survived && runState.lives === 1) {
      const stacks = runState.ownedRelics['Resurrector'] ?? 0;
      if (stacks > 0) {
        runState.lives += stacks;
        this.manifest.refresh();
      }
    }
    // Minimalist: reveal no special tiles -> +6 gold per stack
    if (survived) {
      const mini = runState.ownedRelics['Minimalist'] ?? 0;
      if (mini > 0 && runState.stats.specialRevealedThisLevel === 0) {
        runState.gold += 6 * mini;
      }
    }
    // Vexillologist: all real mines flagged and zero incorrect flags -> +3 gold per stack
    if (survived) {
      const vex = runState.ownedRelics['Vexillologist'] ?? 0;
      if (vex > 0) {
        const allMines = this.board.tiles.filter(t => t.kind === TileKind.Mine);
        const allFlagged = allMines.every(t => t.flagged);
        const anyWrongFlags = this.board.tiles.some(t => t.flagged && t.kind !== TileKind.Mine);
        if (allFlagged && !anyWrongFlags) {
          runState.gold += 3 * vex;
        }
      }
    }
    // Cartographer: reveal all 4 corners -> +5 gold per stack
    if (survived) {
      const carto = runState.ownedRelics['Cartographer'] ?? 0;
      if (carto > 0 && !this.cartographerAwarded) {
        const w = this.board.width, h = this.board.height;
        const corners = [
          this.board.tiles[0],
          this.board.tiles[w - 1],
          this.board.tiles[(h - 1) * w],
          this.board.tiles[h * w - 1]
        ];
        if (corners.every(t => t.revealed)) {
          runState.gold += 5 * carto;
          this.cartographerAwarded = true;
        }
      }
    }
    // Telemetry
    // eslint-disable-next-line no-console
    console.log('[Minez] Level resolved. Survived:', survived, 'Lives:', runState.lives, 'Gold:', runState.gold);
    if (!survived) {
      this.showEndScreen(false);
      return;
    }
    // Win after level 10: show win screen instead of going to shop
    if (runState.level >= 10) {
      this.showEndScreen(true);
      return;
    }
    // Reset per-shop reroll usage when entering a fresh shop
    (runState.persistentEffects as any).rerolledThisShop = false;
    this.scene.start('ShopScene');
  }
  private shopIcon(subId?: string, compassDir?: string): string {
    switch (subId) {
      case 'Diamond': return '💎';
      case '1Up': return '❤️';
      case 'Pickaxe': return '🪓';
      case 'Compass': return compassDir ? compassDir : '🧭';
      case 'Scratchcard': return '🎟️';
      case 'GoodDeal': return '👍';
      case 'RemoteControl': return '📺';
      case 'AdvancePayment': return '💳';
      case 'Quartz': return '⚪';
      case 'Receipt': return '🧾';
      case '2Up': return '💞';
      case 'LuckyCat': return '🐈‍⬛';
      case 'TarotCard': return '🪬';
      case 'MetalDetector': return '🔎';
      case 'LaundryMoney': return '🧼';
      default: return '🟣';
    }
  }
  private challengeIcon(subId?: string) {
    switch (subId) {
      case ChallengeId.AutoGrat: return '💸';
      case ChallengeId.Stopwatch: return '⏱️';
      case ChallengeId.MathTest: return '☠️';
      case ChallengeId.BadDeal: return '💱';
      case ChallengeId.Clover2: return '🍀';
      case ChallengeId.SnakeOil: return '🧴';
      case ChallengeId.SnakeVenom: return '🐍';
      case ChallengeId.BloodPact: return '🩸';
      case ChallengeId.CarLoan: return '🚗';
      case ChallengeId.BloodDiamond: return '🔻';
      case ChallengeId.FindersFee: return '🫴';
      case ChallengeId.ATMFee: return '🏧';
      case ChallengeId.Coal: return '🪨';
      case ChallengeId.BoxingDay: return '🥊';
      default: return '🟠';
    }
  }
  private challengeLabel(id: string) {
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
      case String(ChallengeId.Coal): return '🪨 Coal';
      case String(ChallengeId.BoxingDay): return '🥊 Boxing Day';
      default: return id;
    }
  }

  private showEndScreen(win: boolean) {
    // Dim background and block clicks to underlying board
    const blocker = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.55)
      .setDepth(6000)
      .setInteractive();
    const title = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 14, win ? 'You Win!' : 'You Lose', {
      fontFamily: 'LTHoop',
      fontSize: '40px',
      color: '#e9e9ef'
    }).setOrigin(0.5).setDepth(6001);
    // Restart button
    const restartZone = this.add.zone(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 30, 180, 44).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(6001);
    const btnBg = this.add.graphics().setDepth(6001);
    btnBg.lineStyle(1, 0x3a3a46, 1);
    btnBg.fillStyle(0x2a2a34, 1);
    btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    const restartText = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 30, 'Restart', {
      fontFamily: 'LTHoop',
      fontSize: '20px',
      color: '#fca5a5'
    }).setOrigin(0.5).setDepth(6002);
    restartZone.on('pointerover', () => {
      btnBg.clear();
      btnBg.lineStyle(1, 0x3a3a46, 1);
      btnBg.fillStyle(0x353542, 1);
      btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
      btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    });
    restartZone.on('pointerout', () => {
      btnBg.clear();
      btnBg.lineStyle(1, 0x3a3a46, 1);
      btnBg.fillStyle(0x2a2a34, 1);
      btnBg.fillRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
      btnBg.strokeRoundedRect(VIEW_WIDTH / 2 - 90, VIEW_HEIGHT / 2 + 30 - 22, 180, 44, 10);
    });
    restartZone.on('pointerdown', () => this.scene.start('TitleScene'));
  }
}


