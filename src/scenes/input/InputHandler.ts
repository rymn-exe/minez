// InputHandler: Handles all input (Phaser and DOM) for GameScene
// Extracted from GameScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { Board, TileKind, indexAt, neighbors, ChallengeId } from '../../game/types';
import { GRID_SIZE, PADDING, ECONOMY } from '../../game/consts';
import { runState } from '../../state';
import { revealTile } from '../../game/reveal';
import { events, GameEvent } from '../../game/events';
import { FlagPaintMode } from '../gameplay/FlagPaintMode';
import { HoverSystem } from '../ui/HoverSystem';
import { TileRenderer } from '../rendering/TileRenderer';
import { LevelResolver } from '../gameplay/LevelResolver';
import { ManifestWithExtensions } from '../../types/phaser-extensions';

const TILE_NORMAL = 0x2a2a34;

export class InputHandler {
  private clickTimes: number[][] = [];
  private pressedLeft: boolean[][] = [];
  private domHoverGX: number = -1;
  private domHoverGY: number = -1;
  private disposers: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    private board: Board,
    private tiles: Phaser.GameObjects.Rectangle[][],
    private numbers: Phaser.GameObjects.Text[][],
    private boardCell: number,
    private flagPaintMode: FlagPaintMode,
    private hoverSystem: HoverSystem,
    private tileRenderer: TileRenderer,
    private levelResolver: LevelResolver,
    private manifest: ManifestWithExtensions,
    private effectsPanel: { setTop: (y: number) => void; refresh?: () => void },
    private resolvingEnd: { current: boolean }
  ) {
    this.setupClickTracking();
    this.setupDomHandlers();
    this.setupPhaserHandlers();
  }

  private setupClickTracking(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      this.clickTimes[y] = [];
      this.pressedLeft[y] = [];
    }
  }

  private setupDomHandlers(): void {
    // DOM-level fallback for input routing
    const domHandler = (ev: PointerEvent) => {
      const last = window.__minezLastPhaserDown;
      const lastFlagged = !!window.__minezLastPhaserFlagged;
      const recentlyHandled = !!(last && performance.now() - last < 350);
      // If Phaser just handled this and performed a flag action, skip routing.
      // If Phaser handled it but did NOT flag and this is a ctrl/meta click, route it as a flag.
      if (recentlyHandled && lastFlagged) return;
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
    this.disposers.push(() => {
      window.removeEventListener('pointerdown', domHandler as any);
      window.removeEventListener('pointermove', domMove as any);
      window.removeEventListener('contextmenu', cm as any);
    });
  }

  private setupPhaserHandlers(): void {
    // Phaser-level global fallback: always allow Ctrl/Cmd/right-click to flag the tile under the cursor
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const evt = pointer.event || ({} as MouseEvent | PointerEvent);
      const button = 'button' in evt ? evt.button : undefined;
      const wantsFlag = this.flagPaintMode.isPaintMode() || pointer.rightButtonDown() || button === 2 || pointer.ctrlKey || (evt && 'ctrlKey' in evt && evt.ctrlKey) || (evt && 'metaKey' in evt && evt.metaKey);
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
      window.__minezLastPhaserDown = performance.now();
      window.__minezLastPhaserFlagged = true;
    });
  }

  setupTileHandlers(x: number, y: number, rect: Phaser.GameObjects.Rectangle): void {
    rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Robust right/ctrl/command detection (covers macOS ctrl-click as right-click)
      const evt = pointer.event || ({} as MouseEvent | PointerEvent);
      const button = 'button' in evt ? evt.button : undefined;
      const withModifier = !!(pointer.ctrlKey || (evt && 'ctrlKey' in evt && evt.ctrlKey) || (evt && 'metaKey' in evt && evt.metaKey));
      const isRight = !!(pointer.rightButtonDown() || button === 2 || pointer.buttons === 2);
      const shouldFlag = this.flagPaintMode.isPaintMode() || isRight || withModifier;
      // Mark that Phaser handled this pointer so DOM fallback can cooperate
      window.__minezLastPhaserDown = performance.now();
      window.__minezLastPhaserFlagged = shouldFlag;
      if (shouldFlag) {
        // Ensure no reveal occurs on pointerup after a flag action
        this.pressedLeft[y][x] = false;
        this.toggleFlag(x, y);
      } else {
        // Detect double-click early for reliable chording
        const now = this.scene.time.now;
        const last = this.clickTimes[y][x] ?? 0;
        if (now - last < 500) {
          this.pressedLeft[y][x] = false;
          this.chordReveal(x, y);
          this.clickTimes[y][x] = 0;
          return;
        }
        this.pressedLeft[y][x] = true;
        this.hoverSystem.setTileHoverState(x, y, 'pressed');
        this.clickTimes[y][x] = now;
      }
    });
    rect.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const tBefore = this.board.tiles[indexAt(this.board, x, y)];
      let didAction = false;
      if (!pointer.rightButtonReleased() && this.pressedLeft[y][x]) {
        const now = this.scene.time.now;
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
        this.tileRenderer.renderTile(x, y);
      }
      if (!tAfter.revealed) this.hoverSystem.setTileHoverState(x, y, 'hover');
    });
    rect.on('pointerupoutside', () => {
      this.pressedLeft[y][x] = false;
      this.hoverSystem.setTileHoverState(x, y, 'normal');
    });
    rect.on('pointerover', () => {
      this.hoverSystem.setTileHoverState(x, y, 'hover');
      this.hoverSystem.showTileHover(x, y);
    });
    rect.on('pointerout', () => {
      this.hoverSystem.setTileHoverState(x, y, 'normal');
      this.hoverSystem.clearHover();
    });
  }

  private toggleFlag(x: number, y: number): void {
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
      t.flagColor = runState.flagColor;
    } else {
      // Clear stored color when unflagging
      delete t.flagColor;
    }
    this.tileRenderer.renderTile(x, y);
    this.manifest.refresh();
  }

  private handleReveal(x: number, y: number): void {
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
        this.tileRenderer.renderTile(x, y);
        this.manifest.refresh();
        return;
      }
      revealTile(this.board, x, y, false); // reveal only
      this.manifest.refresh();
      this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
      this.effectsPanel.refresh?.();
      return;
    }
    const res = revealTile(this.board, x, y, true);
    this.manifest.refresh();
    this.effectsPanel.setTop(this.manifest.getBottomY() + 12);
    this.effectsPanel.refresh?.();
    // If X is clicked when already revealed, proceed the level (stopwatches disabled).
    if (wasX) {
      let toLose = 0;
      const finalize = () => {
        const survived = runState.lives > 0;
        if (survived) {
          // Finder's Fee: no end-of-level gold if revealed before X
          if (!runState.persistentEffects.noEndGold) {
            runState.gold += ECONOMY.endOfLevelGold;
            events.emit(GameEvent.GoldGained, { amount: ECONOMY.endOfLevelGold, source: 'LevelClear' });
          }
          this.manifest.refresh();
        }
        // Navigate immediately; also guard against double-resolve
        if (!this.resolvingEnd.current) {
          this.resolvingEnd.current = true;
          this.levelResolver.resolveLevel(survived);
          // extra safety: force navigation again shortly after
          if (survived) {
            this.scene.time.delayedCall(10, () => {
              if (this.scene.scene.isActive('GameScene')) {
                this.scene.scene.start('ShopScene');
              }
            });
          }
        }
      };
      const stepDown = (remaining: number) => {
        if (remaining <= 0) {
          // slight delay to let UI settle
          this.scene.time.delayedCall(150, finalize);
          return;
        }
        if (runState.lives > 0) {
          runState.lives = Math.max(0, runState.lives - 1);
          this.manifest.refresh();
        }
        this.scene.time.delayedCall(250, () => stepDown(remaining - 1));
      };
      if (toLose > 0) {
        this.scene.time.delayedCall(200, () => stepDown(toLose));
      } else {
        finalize();
      }
    }
    // Non‑X deaths (mine, megamine, bad deal, etc.): ensure we resolve as a loss.
    else if (res.endedLevel && !this.resolvingEnd.current) {
      this.resolvingEnd.current = true;
      this.levelResolver.resolveLevel(false);
    }
  }

  // Minesweeper chording: double-click a revealed number to open all unflagged neighbors
  private chordReveal(x: number, y: number): void {
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
    this.effectsPanel.refresh?.();
  }

  // Fallback route: translate DOM pointer to board action when Phaser input fails
  private routeDomPointer(ev: PointerEvent): void {
    const canvas = (this.scene.sys.game.canvas as HTMLCanvasElement);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = ev.clientX - rect.left;
    const rawY = ev.clientY - rect.top;
    // Convert from CSS pixels to game coordinates (handles FIT scaling, DPR)
    const scaleX = this.scene.scale.width / rect.width;
    const scaleY = this.scene.scale.height / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;
    // Give right-side panel first chance (so board doesn't steal clicks)
    if (this.manifest.domRouteDown?.(x, y)) {
      return;
    }
    // Flag swatches are now handled by FlagPaintMode internally via Phaser input
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
    const wantsFlag = this.flagPaintMode.isPaintMode() || ev.ctrlKey || ev.metaKey || isRight;
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
  }

  // Fallback hover routing: update hover text when moving over revealed tiles
  private routeDomMove(ev: PointerEvent): void {
    const canvas = (this.scene.sys.game.canvas as HTMLCanvasElement);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = ev.clientX - rect.left;
    const rawY = ev.clientY - rect.top;
    const scaleX = this.scene.scale.width / rect.width;
    const scaleY = this.scene.scale.height / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;
    this.flagPaintMode.updateCursorPosition(x, y);
    // Route to right panel hovers first
    if (this.manifest.domRouteMove?.(x, y)) {
      return;
    }
    const BOARD_LEFT = PADDING;
    const BOARD_TOP = PADDING;
    const boardW = GRID_SIZE * this.boardCell;
    const boardH = GRID_SIZE * this.boardCell;
    if (x < BOARD_LEFT || y < BOARD_TOP || x >= BOARD_LEFT + boardW || y >= BOARD_TOP + boardH) {
      if (this.domHoverGX !== -1 && this.domHoverGY !== -1) {
        this.hoverSystem.setTileHoverState(this.domHoverGX, this.domHoverGY, 'normal');
      }
      this.domHoverGX = -1; this.domHoverGY = -1;
      this.hoverSystem.clearHover();
      return;
    }
    const gx = Math.floor((x - BOARD_LEFT) / this.boardCell);
    const gy = Math.floor((y - BOARD_TOP) / this.boardCell);
    if (gx === this.domHoverGX && gy === this.domHoverGY) return;
    // Reset previous tile hover
    if (this.domHoverGX !== -1 && this.domHoverGY !== -1) {
      this.hoverSystem.setTileHoverState(this.domHoverGX, this.domHoverGY, 'normal');
    }
    this.domHoverGX = gx; this.domHoverGY = gy;
    const t = this.board.tiles[indexAt(this.board, gx, gy)];
    if (!t.revealed) {
      this.hoverSystem.setTileHoverState(gx, gy, 'hover');
    }
    this.hoverSystem.showTileHover(gx, gy);
  }

  cleanup(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }
}

