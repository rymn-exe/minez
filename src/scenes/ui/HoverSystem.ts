// HoverSystem: Manages hover text display and tile hover states
// Extracted from GameScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { Board, TileKind, indexAt, ChallengeId } from '../../game/types';
import { SHOP_TILES } from '../../game/items';
import { TILE_DESCRIPTIONS, CHALLENGE_DESCRIPTIONS, EXTRA_TILE_DESCRIPTIONS, TILE_UI_TEXT, CHALLENGE_UI_TEXT } from '../../game/descriptions';

const TILE_NORMAL = 0x2a2a34;
const TILE_HOVER = 0x3a3a46;
const TILE_PRESSED = 0x4a4a56;

export class HoverSystem {
  constructor(
    private scene: Phaser.Scene,
    private nameText: Phaser.GameObjects.Text,
    private descText: Phaser.GameObjects.Text,
    private board: Board,
    private tiles: Phaser.GameObjects.Rectangle[][],
    private challengeLabel: (id: string) => string
  ) {}

  clearHover(): void {
    if (this.nameText && this.descText) {
      this.nameText.setText('');
      this.descText.setText('');
    }
  }

  setHover(name: string, color: string, desc: string): void {
    if (!this.nameText || !this.descText) return;
    // Ensure a space between a leading emoji and the word without breaking surrogate pairs.
    name = this.formatEmojiText(name);
    
    if (!name || name.trim() === '') {
      this.nameText.setText('');
      this.descText.setText(desc);
      this.descText.setX(this.nameText.x);
      this.descText.setY(this.nameText.y);
    } else {
      this.nameText.setColor(color);
      this.nameText.setText(`${name}:`);
      this.descText.setText(' ' + desc);
      this.descText.setX(this.nameText.x + this.nameText.width + 6);
      this.descText.setY(this.nameText.y);
    }
  }

  showTileHover(x: number, y: number): void {
    const t = this.board.tiles[indexAt(this.board, x, y)];
    // For unrevealed tiles, don't show text; the tile itself lightens via hover state
    if (!t.revealed) {
      this.clearHover();
      return;
    }
    
    if (t.kind === TileKind.Shop) {
      const id = t.subId as string;
      const labelMap: Record<string, string> = {};
      for (const s of SHOP_TILES) labelMap[s.id] = s.label;
      const name = labelMap[id] ?? id;
      const desc = TILE_UI_TEXT[id] ?? TILE_DESCRIPTIONS[id] ?? EXTRA_TILE_DESCRIPTIONS[id] ?? '';
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
      const desc = CHALLENGE_UI_TEXT[id] ?? CHALLENGE_DESCRIPTIONS[id] ?? '';
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
      // Do not leak the true number when the tile is visually masked as '?'.
      // (Random masking, Math Test masking, Tarot/LuckyPenny pending transforms, etc.)
      if (t.mathMasked || t.randomMasked || !!t.pendingTransform) {
        this.setHover('?', '#e9e9ef', 'Adjacent mines count is unknown');
      } else {
        this.setHover(`Number ${t.number}`, '#e9e9ef', 'Adjacent mines count');
      }
      return;
    }
    
    if (t.kind === TileKind.Safe) {
      // Frontier-masked 0-tiles display '?' to preserve uncertainty; hover should not spoil that.
      if (t.subId === 'FrontierQuestion') {
        this.setHover('?', '#e9e9ef', 'Adjacent mines count is unknown');
      } else {
        this.setHover('Safe', '#e9e9ef', 'Empty tile');
      }
      return;
    }
    
    // Other tile types: no hover text
    this.clearHover();
  }

  setTileHoverState(x: number, y: number, state: 'normal' | 'hover' | 'pressed'): void {
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

  private formatEmojiText(name: string): string {
    if (!name || name.length === 0) return name;
    
    const cp = name.codePointAt(0);
    if (cp === undefined) return name;
    
    const firstLen = cp > 0xffff ? 2 : 1;
    const firstChar = String.fromCodePoint(cp);
    const looksEmoji = /\p{Emoji}/u.test(firstChar);
    const hasSpace = name[firstLen] === ' ';
    
    if (looksEmoji && !hasSpace) {
      return firstChar + ' ' + name.slice(firstLen);
    }
    
    return name;
  }
}

