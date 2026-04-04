// TileRenderer: Handles tile rendering, animations, and icon management
// Extracted from GameScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { Board, TileKind, indexAt, neighbors, ChallengeId } from '../../game/types';
import { FLAG_COLOR_HEX } from '../gameplay/FlagPaintMode';

const TILE_NORMAL = 0x2a2a34;

export class TileRenderer {
  private iconImages: Map<number, Phaser.GameObjects.Image> = new Map();
  private numberFontPx: number;
  private emojiFontPx: number;
  private cornerFontPx: number;

  constructor(
    private scene: Phaser.Scene,
    private board: Board,
    private tiles: Phaser.GameObjects.Rectangle[][],
    private numbers: Phaser.GameObjects.Text[][],
    private cornerNums: Phaser.GameObjects.Text[][],
    private boardCell: number
  ) {
    // Scale label fonts with tile size.
    // - numbers/? should be readable but not touch borders
    // - emojis/icons can be a bit larger
    this.numberFontPx = Math.max(12, Math.min(40, Math.floor(this.boardCell * 0.55)));
    this.emojiFontPx = Math.max(14, Math.min(56, Math.floor(this.boardCell * 0.65)));
    this.cornerFontPx = Math.max(9, Math.min(18, Math.floor(this.boardCell * 0.30)));
  }

  renderTile(x: number, y: number): void {
    const idx = indexAt(this.board, x, y);
    const t = this.board.tiles[idx];
    const rect = this.tiles[y][x];
    const label = this.numbers[y][x];
    const corner = this.cornerNums[y][x];
    const setFontPx = (px: number) => {
      // Phaser Text supports setFontSize in recent versions; fall back to setStyle.
      (label as any).setFontSize?.(px);
      label.setStyle?.({ fontSize: `${px}px` } as any);
    };
    const setCornerFontPx = (px: number) => {
      (corner as any).setFontSize?.(px);
      corner.setStyle?.({ fontSize: `${px}px` } as any);
    };
    
    // Helper to clear any icon image at this tile
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
      setFontPx(this.numberFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      if (t.flagged) {
        label.setText('⚑');
        const stored = t.flagColor;
        const css = FLAG_COLOR_HEX[stored ?? 'white'] ?? FLAG_COLOR_HEX.white;
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
      setFontPx(this.emojiFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      // Persist explosion visuals across re-renders (e.g., after BoardChanged).
      label.setText(t.subId === 'Exploded' ? '💥' : '💣');
      clearIcon();
    } else if (t.kind === TileKind.X) {
      rect.setFillStyle(0x1e7b4a, revealedAlpha);
      setFontPx(this.emojiFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      label.setText('❌');
      clearIcon();
    } else if (t.kind === TileKind.Ore) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for ore and upgrades
      setFontPx(this.emojiFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
        label.setText(t.subId === 'Diamond' ? '💎' : '🪙');
      clearIcon();
    } else if (t.kind === TileKind.Shop) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for shop tiles
      setFontPx(this.emojiFontPx);
      setCornerFontPx(this.cornerFontPx);
      label.setText(this.shopIcon(t.subId, t.compassDir));
      // Preserve clue value: show the underlying mines-adjacent number in the corner.
      // (0 is intentionally blank so it doesn't visually compete with the icon.)
      corner.setText(t.number > 0 ? String(t.number) : '');
      clearIcon();
    } else if (t.kind === TileKind.Challenge) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      // Emoji-only rendering for challenges
      setFontPx(this.emojiFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      label.setText(this.challengeIcon(t.subId));
      clearIcon();
    } else if (t.kind === TileKind.Safe) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      setFontPx(this.numberFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      // Persistent frontier masking:
      // If a revealed 0-tile ever borders an unrevealed neighbor, mark it to always display '?'
      if (t.number === 0) {
        const hasUnrevealedNeighbor = neighbors(this.board, x, y).some(p => {
          const nt = this.board.tiles[indexAt(this.board, p.x, p.y)];
          return !nt.revealed;
        });
        if (hasUnrevealedNeighbor && t.subId !== 'FrontierQuestion') {
          t.subId = 'FrontierQuestion';
        }
        label.setText(t.subId === 'FrontierQuestion' ? '?' : '');
      } else {
        label.setText('');
      }
      clearIcon();
    } else if (t.kind === TileKind.Number) {
      rect.setFillStyle(0x1f2430, revealedAlpha);
      setFontPx(this.numberFontPx);
      setCornerFontPx(this.cornerFontPx);
      corner.setText('');
      const masked = t.mathMasked || t.randomMasked;
      // If a transform is pending, keep showing the original (usually '?') until the animation completes.
      if (t.pendingTransform) {
        label.setText(masked ? '?' : String(t.number));
      } else if (masked) {
        label.setText('?');
      } else {
        label.setText(String(t.number));
      }
      clearIcon();
    }
  }

  renderAll(): void {
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        this.renderTile(x, y);
      }
    }
  }

  animateFlip(x: number, y: number): void {
    const rect = this.tiles[y][x];
    const label = this.numbers[y][x];
    const corner = this.cornerNums[y][x];
    // Guard against missing objects (shouldn't happen)
    if (!rect || !label || !corner) return;
    
    // First half: scaleX to 0
    this.scene.tweens.add({
      targets: [rect, label, corner],
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
        const targets: any[] = [rect, label, corner];
        if (img) targets.push(img);
        this.scene.tweens.add({
          targets,
          scaleX: 1,
          duration: 90,
          ease: 'Sine.easeOut'
        });
      }
    });
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
      case 'PokerChip': return '🃏';
      case 'LuckyPenny': return '🧧';
      case 'NineToFive': return '🏢';
      default: return '🟣';
    }
  }

  private challengeIcon(subId?: string): string {
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
      case ChallengeId.MegaMine: return '💥';
      case ChallengeId.BloodDiamond: return '🔻';
      case ChallengeId.FindersFee: return '🫴';
      case ChallengeId.ATMFee: return '🏧';
      case ChallengeId.Coal: return '🪨';
      case ChallengeId.BoxingDay: return '🥊';
      case ChallengeId.Jackhammer: return '🛠️';
      case ChallengeId.DonationBox: return '🎁';
      case ChallengeId.Appraisal: return '📏';
      case ChallengeId.Key: return '🔑';
      default: return '🟠';
    }
  }

  cleanup(): void {
    this.iconImages.forEach(img => img.destroy());
    this.iconImages.clear();
  }
}

