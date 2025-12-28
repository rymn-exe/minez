// GameScene:
//  - Owns the Phaser board rendering (rectangles + numeric labels)
//  - Delegates all game logic to the reveal engine and listens to GameEvents
//  - Handles UX flows: hover/press states, double‑click chording,
//    ❌ resolution sequence (auto‑reveal ⏱️ → life countdown → resolve)
//  - Applies immediate relic awards that depend on UI state (e.g. Cartographer on corners)
import Phaser from 'phaser';
import { GRID_SIZE, CELL, PADDING, PANEL_WIDTH, VIEW_WIDTH, VIEW_HEIGHT, ECONOMY } from '../game/consts';
import { Board, TileKind, indexAt, ChallengeId, neighbors } from '../game/types';
import { generateLevel } from '../game/generation';
import { bindBoardForShopEffects, revealTile } from '../game/reveal';
import { runState } from '../state';
import { ManifestPanel } from '../ui/manifest';
import { events, GameEvent } from '../game/events';
import { ActiveEffectsPanel } from '../ui/activeEffects';

const TILE_NORMAL = 0x2a2a34;
const TILE_HOVER = 0x353542;
const TILE_PRESSED = 0x4a4a56;

export default class GameScene extends Phaser.Scene {
  private board!: Board;
  private tiles: Phaser.GameObjects.Rectangle[][] = [];
  private numbers: Phaser.GameObjects.Text[][] = [];
  private manifest!: ManifestPanel;
  private effectsPanel!: ActiveEffectsPanel;
  private clickTimes: number[][] = [];
  private pressedLeft: boolean[][] = [];
  private resolvingEnd: boolean = false;
  private cartographerAwarded: boolean = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#121218');
    // Reset end-of-level guard on each level start
    this.resolvingEnd = false;
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

    // Researcher: flag a random challenge tile at level start
    const researcher = runState.ownedRelics['Researcher'] ?? 0;
    if (researcher > 0) {
      const idx = this.board.tiles.findIndex(t => t.kind === TileKind.Challenge && !t.flagged && !t.revealed);
      if (idx >= 0) this.board.tiles[idx].flagged = true;
    }

    // UI panels
    this.manifest = new ManifestPanel(this, GRID_SIZE * CELL + PADDING * 2, PADDING);
    this.effectsPanel = new ActiveEffectsPanel(this, GRID_SIZE * CELL + PADDING * 2, this.manifest.getBottomY() + 12);

    // Grid
    for (let y = 0; y < GRID_SIZE; y++) {
      this.tiles[y] = [];
      this.numbers[y] = [];
      this.clickTimes[y] = [];
      this.pressedLeft[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const rx = PADDING + x * CELL + CELL / 2;
        const ry = PADDING + y * CELL + CELL / 2;

        const rect = this.add.rectangle(rx, ry, CELL - 2, CELL - 2, TILE_NORMAL).setStrokeStyle(1, 0x3a3a46);
        rect.setInteractive({ useHandCursor: true });

        rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) {
            this.toggleFlag(x, y);
          } else {
            this.pressedLeft[y][x] = true;
            this.setTileHoverState(x, y, 'pressed');
          }
        });
        rect.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          const t = this.board.tiles[indexAt(this.board, x, y)];
          if (!pointer.rightButtonReleased() && this.pressedLeft[y][x]) {
            const now = this.time.now;
            const last = this.clickTimes[y][x] ?? 0;
            if (now - last < 250) {
              this.chordReveal(x, y);
              this.clickTimes[y][x] = 0;
            } else {
              this.handleReveal(x, y);
              this.clickTimes[y][x] = now;
            }
          }
          this.pressedLeft[y][x] = false;
          if (!t.revealed) this.setTileHoverState(x, y, 'hover');
        });
        rect.on('pointerupoutside', () => {
          this.pressedLeft[y][x] = false;
          this.setTileHoverState(x, y, 'normal');
        });
        rect.on('pointerover', () => {
          this.setTileHoverState(x, y, 'hover');
        });
        rect.on('pointerout', () => {
          this.setTileHoverState(x, y, 'normal');
        });

        this.tiles[y][x] = rect;
        const label = this.add.text(rx, ry, '', { fontFamily: 'monospace', fontSize: '16px', color: '#d6d6dc' }).setOrigin(0.5);
        this.numbers[y][x] = label;
      }
    }

    this.input.mouse?.disableContextMenu();

    // Event listeners
    events.on(GameEvent.LevelEndResolved, ({ survived }) => {
      if (this.resolvingEnd) return;
      this.resolvingEnd = true;
      this.resolveLevel(survived);
    });

    // Award Cartographer as soon as all four corners are revealed (any tile types)
    events.on(GameEvent.TileRevealed, ({ tile }: any) => {
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
    });

    // Tax Collector: +1 gold whenever you gain gold per stack
    events.on(GameEvent.GoldGained, ({ amount, source }) => {
      const stacks = runState.ownedRelics['TaxCollector'] ?? 0;
      if (stacks > 0 && amount > 0) {
        runState.gold += stacks;
        // eslint-disable-next-line no-console
        console.log('[Minez] Tax Collector +', stacks, 'from', source);
        this.manifest.refresh();
      }
    });

    this.renderAll();
    // Restart button (top-right)
    const restart = this.add.text(VIEW_WIDTH - 96, 8, 'Restart', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fca5a5'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });
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
      this.renderAll();
      return;
    }
    const res = revealTile(this.board, x, y, true);
    this.manifest.refresh();
    this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
    this.effectsPanel.refresh();
    this.renderAll();
    // If X is clicked when already revealed, proceed the level (stopwatches disabled).
    if (wasX) {
      let toLose = 0;
      const finalize = () => {
        const survived = runState.lives > 0;
        if (survived) {
          // Award base end-of-level gold and trigger Tax Collector (+1 per stack)
          runState.gold += ECONOMY.endOfLevelGold;
          events.emit(GameEvent.GoldGained, { amount: ECONOMY.endOfLevelGold, source: 'LevelClear' } as any);
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
    // Count flags + revealed mines toward satisfying the number
    const satisfied = neighs.reduce((acc, p) => {
      const nt = this.board.tiles[indexAt(this.board, p.x, p.y)];
      const revealedMine = (nt.kind === TileKind.Mine && nt.revealed) ||
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
    this.renderAll();
  }

  private renderAll() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.renderTile(x, y);
      }
    }
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

    if (!t.revealed) {
      // Original solid fill for unrevealed tiles
      rect.setFillStyle(TILE_NORMAL, 1);
      label.setText(t.flagged ? '⚑' : '');
      return;
    }

    // Revealed styling
    if (t.kind === TileKind.Mine) {
      rect.setFillStyle(0x7b1e22);
      label.setText('💣');
    } else if (t.kind === TileKind.X) {
      rect.setFillStyle(0x1e7b4a);
      label.setText('❌');
    } else if (t.kind === TileKind.Ore) {
      rect.setFillStyle(0x4a3a1e);
      // If Investor upgraded this ore, show 💎 instead of 🪙
      label.setText((t as any).subId === 'Diamond' ? '💎' : '🪙');
    } else if (t.kind === TileKind.Shop) {
      rect.setFillStyle(0x1f2430);
      label.setText(this.shopIcon(t.subId, t.compassDir));
    } else if (t.kind === TileKind.Challenge) {
      rect.setFillStyle(0x4a2a1e);
      label.setText(this.challengeIcon(t.subId));
    } else if (t.kind === TileKind.Safe) {
      rect.setFillStyle(0x1f2430);
      label.setText('');
    } else if (t.kind === TileKind.Number) {
      rect.setFillStyle(0x1f2430);
      if (runState.persistentEffects.mathTest && t.number > 1) {
        label.setText('?');
      } else {
        label.setText(String(t.number));
      }
    }
  }

  // Apply end-of-level relics and navigate to next scene or loss
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
      case 'Zirconium': return '⚪';
      case 'Magnet': return '🧲';
      case 'Receipt': return '🧾';
      case '2Up': return '💞';
      case 'LuckyCat': return '🐈‍⬛';
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
      default: return '🟠';
    }
  }

  private showEndScreen(win: boolean) {
    const t = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 10, win ? 'You Win!' : 'You Lose', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    const r = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 28, 'Restart', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#fca5a5'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    r.on('pointerdown', () => this.scene.start('TitleScene'));
  }
}


