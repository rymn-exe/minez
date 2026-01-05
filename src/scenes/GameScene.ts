// GameScene:
//  - Owns the Phaser board rendering (rectangles + numeric labels)
//  - Delegates all game logic to the reveal engine and listens to GameEvents
//  - Handles UX flows: hover/press states, double‑click chording,
//    ❌ resolution sequence (auto‑reveal ⏱️ → life countdown → resolve)
//  - Applies immediate collectible awards that depend on UI state (e.g. Cartographer on corners)
import Phaser from 'phaser';
import { CELL, PADDING, PANEL_WIDTH, VIEW_WIDTH, VIEW_HEIGHT, ECONOMY, MAX_GRID_SIZE, BASE_BOARD_PX } from '../game/consts';
// Font policy: use only two fonts across the app:
//  - LTHoop for all UI/body text
//  - GrapeSoda for primary titles
import { Board, TileKind, indexAt, ChallengeId, neighbors } from '../game/types';
import { generateLevel } from '../game/generation';
import { bindBoardForShopEffects, revealTile } from '../game/reveal';
import { runState } from '../state';
import { ManifestPanel } from '../ui/manifest';
import { events, GameEvent, TileRevealedPayload, GoldGainedPayload, LifeChangedPayload, LevelEndResolvedPayload } from '../game/events';
import { ManifestWithExtensions } from '../types/phaser-extensions';
import { SHOP_TILES } from '../game/items';
import { TILE_DESCRIPTIONS, CHALLENGE_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, TILE_UI_TEXT, CHALLENGE_UI_TEXT } from '../game/descriptions';
import { HoverSystem } from './ui/HoverSystem';
import { FlagPaintMode, FLAG_COLOR_HEX } from './gameplay/FlagPaintMode';
import { RelicActivator } from './gameplay/RelicActivator';
import { LevelResolver } from './gameplay/LevelResolver';
import { TileRenderer } from './rendering/TileRenderer';
import { InputHandler } from './input/InputHandler';
import { BoardSetup } from './gameplay/BoardSetup';
import { getEffectRng } from '../game/rngUtils';

const TILE_NORMAL = 0x2a2a34;
const TILE_HOVER = 0x3a3a46;
const TILE_PRESSED = 0x4a4a56;

export default class GameScene extends Phaser.Scene {
  private board!: Board;
  private tiles: Phaser.GameObjects.Rectangle[][] = [];
  private numbers: Phaser.GameObjects.Text[][] = [];
  private boardCell: number = CELL;
  private tileRenderer!: TileRenderer;
  private manifest!: ManifestPanel;
  private hoverNameText!: Phaser.GameObjects.Text;
  private hoverDescText!: Phaser.GameObjects.Text;
  private hoverSystem!: HoverSystem;
  private resolvingEnd: boolean = false;
  private disposers: Array<() => void> = [];
  private levelResolver!: LevelResolver;
  private optimistShownThisLevel: boolean = false;
  private flagPaintMode!: FlagPaintMode;
  private inputHandler!: InputHandler;
  private flagTitleText?: Phaser.GameObjects.Text;
  private sideX: number = 0;
  private flagCardWidth: number = 0;

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
    this.input.enabled = true;
    this.input.topOnly = true;
    // Ensure browser routes events to the canvas
    try {
      (this.sys.game.canvas as HTMLCanvasElement).style.pointerEvents = 'auto';
    } catch {}
    this.optimistShownThisLevel = false;
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
    this.tileRenderer?.cleanup();
    // Sprites are preloaded; no-op here.
    // Seed display
    const seedEl = document.getElementById('seed');
    if (seedEl) seedEl.textContent = `Seed: ${runState.seed}`;
    // Telemetry: log seed
    // eslint-disable-next-line no-console
    console.log('[Minez] Seed:', runState.seed, 'Level:', runState.level);

    // Setup board (generate, bind, reset counters, activate relics)
    // Note: levelResolver will be created after manifest is initialized
    const tempResolver = { reset: () => {}, markCartographerAwarded: () => {} } as any;
    const n = Math.min(MAX_GRID_SIZE, 4 + runState.level);
    this.board = BoardSetup.setupBoard(n, n, tempResolver);

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
    if (this.hoverDescText.setWordWrapWidth) {
      this.hoverDescText.setWordWrapWidth(0, false);
    }

    // Grid: keep the board occupying the same on-screen footprint as the old 16x16 layout,
    // and scale the per-cell pixel size based on how many tiles there are.
    // (Example: 5x5 => big cells; 20x20 => smaller cells)
    this.boardCell = Math.max(18, Math.min(96, Math.floor(BASE_BOARD_PX / this.board.width)));
    const BOARD_LEFT = PADDING;
    const BOARD_TOP = PADDING;
    // Side panel aligned to actual board width (fix spacing)
    const sideX = BOARD_LEFT + this.board.width * this.boardCell + PADDING;
    this.sideX = sideX;
    // Align right panel top more closely with the board top while keeping header clearance
    this.manifest = new ManifestPanel(this, sideX, PADDING + 24, {
      hoverProxy: (name, color, desc) => this.hoverSystem.setHover(name, color, desc),
      clearHoverProxy: () => this.hoverSystem.clearHover()
    });
    // Flag color picker (right panel) styled as a card
    {
      // Align card to the side panel like other cards
      const mainX = Math.max(12, sideX - 12);
      const panelW = Math.min(360, this.scale.width - mainX - 12);
      const cardWidth = Math.max(220, (mainX + panelW - 12) - (sideX - 2));
      this.flagCardWidth = cardWidth;
      // Create title once; position is updated by layoutRightPanel()
      this.flagTitleText = this.add.text(
        sideX,
        this.manifest.getBottomY() + 12,
        'Flag Colour',
        { fontFamily: 'LTHoop', fontSize: '16px', color: '#e9e9ef' }
      ).setOrigin(0, 0);
      
      // Initialize flag paint mode system
      this.flagPaintMode = new FlagPaintMode(
        this,
        () => { /* Color changed - refresh handled by FlagPaintMode */ },
        (enabled) => { /* Paint mode changed */ },
        () => this.tileRenderer.renderAll()
      );
      // Initial layout below
    }

    const layoutRightPanel = () => {
      try {
        // Flag section should be below the manifest
        if (this.flagTitleText) {
          this.flagTitleText.setY(this.manifest.getBottomY() + 12);
          const topY = (this.flagTitleText.getBounds ? this.flagTitleText.getBounds().bottom : this.flagTitleText.y + 30) + 8;
          this.flagPaintMode.setupSwatches(this.sideX, topY, this.flagCardWidth);
          this.flagPaintMode.refresh();
        }
      } catch {}
    };

    // Initial right panel layout (and any time heights change)
    layoutRightPanel();
    // Nudge: some browsers settle webfonts one frame late even after fonts.ready.
    // Force a second-pass layout once shortly after create so texts pick up LTHoop.
    this.time.delayedCall(60, () => {
      try {
        this.manifest.refresh();
        layoutRightPanel();
      } catch {}
    });
    // Create tile rectangles and labels
    for (let y = 0; y < this.board.height; y++) {
      this.tiles[y] = [];
      this.numbers[y] = [];
      for (let x = 0; x < this.board.width; x++) {
        const rx = BOARD_LEFT + x * this.boardCell + this.boardCell / 2;
        const ry = BOARD_TOP + y * this.boardCell + this.boardCell / 2;

        const rect = this.add.rectangle(rx, ry, this.boardCell - 2, this.boardCell - 2, TILE_NORMAL).setStrokeStyle(1, 0x3a3a46).setDepth(1000);
        rect.setInteractive({ useHandCursor: true });
        this.tiles[y][x] = rect;
        const label = this.add.text(rx, ry, '', { fontFamily: 'LTHoop', fontSize: '16px', color: '#d6d6dc' }).setOrigin(0.5).setDepth(1001);
        this.numbers[y][x] = label;
      }
    }

    // Initialize hover system after tiles are created
    this.hoverSystem = new HoverSystem(
      this,
      this.hoverNameText,
      this.hoverDescText,
      this.board,
      this.tiles,
      (id: string) => this.challengeLabel(id)
    );

    // Initialize level resolver
    this.levelResolver = new LevelResolver(this, this.board, this.manifest);

    // Initialize tile renderer
    this.tileRenderer = new TileRenderer(this, this.board, this.tiles, this.numbers, this.boardCell);

    // Initialize input handler (after tiles are created)
    const resolvingEndRef = { current: this.resolvingEnd };
    this.inputHandler = new InputHandler(
      this,
      this.board,
      this.tiles,
      this.numbers,
      this.boardCell,
      this.flagPaintMode,
      this.hoverSystem,
      this.tileRenderer,
      this.levelResolver,
      this.manifest,
      resolvingEndRef
    );
    // Setup tile handlers
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        this.inputHandler.setupTileHandlers(x, y, this.tiles[y][x]);
      }
    }

    this.input.mouse?.disableContextMenu();

    // Event listeners
    this.disposers.push(events.on(GameEvent.LevelEndResolved, ({ survived }) => {
      if (this.resolvingEnd) return;
      this.resolvingEnd = true;
      resolvingEndRef.current = true;
      this.levelResolver.resolveLevel(survived);
    }));

    // BoardChanged: re-render after logic updates that don't reveal tiles (e.g., Poker Chip flags).
    this.disposers.push(events.on(GameEvent.BoardChanged, () => {
      this.tileRenderer.renderAll();
      this.manifest.refresh();
      layoutRightPanel();
    }));

    // Flip animation on any tile reveal
    this.disposers.push(events.on(GameEvent.TileRevealed, ({ tile }: TileRevealedPayload) => {
      const { x, y } = tile.pos;
      this.tileRenderer.animateFlip(x, y);
      // If Math Test was revealed, don't show its hover blurb; clear any lingering hover
      if (tile.kind === TileKind.Challenge && String(tile.subId) === String(ChallengeId.MathTest)) {
        this.hoverSystem.clearHover();
      }
      // Mine: flash twice then show explosion emoji
      if (tile.kind === TileKind.Mine) {
        this.time.delayedCall(190, () => {
          const label = this.numbers[y][x];
          if (!label) return;
          const useOptimist = ((runState.ownedRelics['Optimist'] ?? 0) > 0) &&
            !!runState.persistentEffects.optimistUsedThisLevel &&
            !this.optimistShownThisLevel;
          this.tweens.add({
            targets: label,
            alpha: { from: 1, to: 0.2 },
            yoyo: true,
            repeat: 1,
            duration: 120,
            onComplete: () => {
              label.setText(useOptimist ? '⚪' : '💥');
              if (useOptimist) this.optimistShownThisLevel = true;
            }
          });
        });
      }

      // Generic transform animation: flash twice, then swap the icon/state.
      // Used for Tarot/LuckyPenny masked numbers and Investor upgrades.
      if (tile.pendingTransform) {
        this.time.delayedCall(190, () => {
          const label = this.numbers[y][x];
          if (!label) return;
          this.tweens.add({
            targets: label,
            alpha: { from: 1, to: 0.2 },
            yoyo: true,
            repeat: 1,
            duration: 120,
            onComplete: () => {
              // Apply the transform to the tile model and re-render (ensures correct font sizing)
              const to = tile.pendingTransform!;
              tile.subId = to;
              tile.pendingTransform = undefined;
              // If we were masked, unmask now so the icon can display
              tile.mathMasked = false;
              tile.randomMasked = false;
              this.tileRenderer.renderTile(x, y);
            }
          });
        });
      }
      // Manifest row flash for shop/challenge tiles
      if (tile.kind === TileKind.Shop) {
        const id = String(tile.subId || '');
        if (this.manifest.flashRow) {
          this.manifest.flashRow('shop', id);
        }
      } else if (tile.kind === TileKind.Challenge) {
        const id = String(tile.subId || '');
        this.manifest.flashRow?.('challenge', id);
      }
    }));

    // Award Cartographer as soon as all four corners are revealed (any tile types)
    this.disposers.push(events.on(GameEvent.TileRevealed, ({ tile }: TileRevealedPayload) => {
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
        this.levelResolver.markCartographerAwarded();
        this.manifest.refresh();
        layoutRightPanel();
      }
    }));

    // Tax Collector: +1 gold whenever you gain gold per stack
    this.disposers.push(events.on(GameEvent.GoldGained, ({ amount, source }: GoldGainedPayload) => {
      const stacks = runState.ownedRelics['TaxCollector'] ?? 0;
      if (stacks > 0 && amount > 0) {
        runState.gold += stacks;
        // eslint-disable-next-line no-console
        console.log('[Minez] Tax Collector +', stacks, 'from', source);
        this.manifest.refresh();
        layoutRightPanel();
      }
      // Float coin delta in the right panel
      this.manifest.floatDelta?.('coins', amount);

      // Philanthropist: when you lose gold (not from spending), 25% chance per stack to gain +1 life.
      // Note: shop spending does not emit GoldGained events, so this naturally excludes spending.
      if (amount < 0) {
        const stacksPhil = runState.ownedRelics['Philanthropist'] ?? 0;
        if (stacksPhil > 0) {
          const rng = getEffectRng('Philanthropist', runState.stats.revealedCount);
          for (let i = 0; i < stacksPhil; i++) {
            if (rng() < 0.25) {
              runState.lives += 1;
              events.emit(GameEvent.LifeChanged, { delta: 1 });
            }
          }
          this.manifest.refresh();
          layoutRightPanel();
        }
      }

      // Donation Box: each time you gain money, reveal random tile(s).
      // Trigger only on positive gains; schedule asynchronously to avoid deep recursion chains.
      if (amount > 0 && runState.persistentEffects.donationBoxStacks > 0 && !this.resolvingEnd) {
        const stacksDB = runState.persistentEffects.donationBoxStacks;
        for (let i = 0; i < stacksDB; i++) {
          this.time.delayedCall(40 + i * 50, () => {
            if (this.resolvingEnd) return;
            // pick a random unrevealed, unflagged tile
            const candidates = this.board.tiles.filter(t => !t.revealed && !t.flagged);
            if (candidates.length === 0) return;
            // Deterministic: seeded per level, offset by revealedCount so it evolves over time
            const rng = getEffectRng('DonationBox', runState.stats.revealedCount + i);
            const idx = Math.floor(rng() * candidates.length);
            const p = candidates[idx].pos;
            revealTile(this.board, p.x, p.y, false);
            this.manifest.refresh();
            layoutRightPanel();
          });
        }
      }
    }));
    // Lives delta float
    this.disposers.push(events.on(GameEvent.LifeChanged, ({ delta }: LifeChangedPayload) => {
      this.manifest.floatDelta?.('lives', delta);
      this.manifest.refresh();
      layoutRightPanel();
    }));

    // Unsubscribe on scene shutdown to avoid listener leaks across levels
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.disposers) off();
      this.disposers = [];
      this.inputHandler.cleanup();
    });

    this.tileRenderer.renderAll();
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
      case String(ChallengeId.Thief): return '🦝 Thief';
      case String(ChallengeId.Jackhammer): return '🛠️ Jackhammer';
      case String(ChallengeId.DonationBox): return '🎁 Donation Box';
      case String(ChallengeId.Appraisal): return '📏 Appraisal';
      case String(ChallengeId.Key): return '🔑 Key';
      default: return id;
    }
  }

}


