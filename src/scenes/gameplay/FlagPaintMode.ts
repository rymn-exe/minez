// FlagPaintMode: Manages flag color selection and paint mode
// Extracted from GameScene to reduce file size and improve maintainability
import Phaser from 'phaser';
import { runState } from '../../state';

export type FlagColor = 'white' | 'yellow' | 'blue';

export const FLAG_COLOR_HEX: Record<FlagColor, string> = {
  white: '#d6d6dc',
  yellow: '#facc15',
  blue: '#60a5fa'
};

export const FLAG_COLOR_NUM: Record<FlagColor, number> = {
  white: 0xd6d6dc,
  yellow: 0xfacc15,
  blue: 0x60a5fa
};

export class FlagPaintMode {
  private paintMode: boolean = false;
  private cursor?: Phaser.GameObjects.Text;
  private flagSwatches: Phaser.GameObjects.Arc[] = [];
  private flagSwatchHalos: Phaser.GameObjects.Arc[] = [];
  private flagSwatchKeys: FlagColor[] = [];
  private swatchHit: Array<{ key: FlagColor; x: number; y: number; r: number }> = [];
  private swatchLastClickTs: Record<string, number> = {};
  private swatchNodes: Phaser.GameObjects.GameObject[] = [];
  private disposers: Array<() => void> = [];

  constructor(
    private scene: Phaser.Scene,
    private onColorChange: (color: FlagColor) => void,
    private onPaintModeChange: (enabled: boolean) => void,
    private renderAll: () => void
  ) {}

  setupSwatches(x: number, y: number, width: number): void {
    // Rebuild-safe: clear any existing swatch UI before drawing new layout.
    for (const n of this.swatchNodes) n.destroy();
    this.swatchNodes = [];

    const topY = y + 8;
    const cardLeft = x - 2;
    const cardRight = x + width - 12;
    const cardWidth = Math.max(220, cardRight - cardLeft);
    const r = 9;
    const gap = 20;
    const baseY = topY + 18 + r;
    
    // Background card behind swatches
    const cardGfx = this.scene.add.graphics().setDepth(-18);
    cardGfx.lineStyle(1, 0x2b2d38, 1);
    cardGfx.fillStyle(0x171922, 1);
    const cardHeight = 18 + r * 2 + 18;
    cardGfx.fillRoundedRect(cardLeft, topY, cardWidth, cardHeight, 12);
    cardGfx.strokeRoundedRect(cardLeft, topY, cardWidth, cardHeight, 12);
    this.swatchNodes.push(cardGfx);

    // Swatches
    const colors: Array<[FlagColor, number]> = [
      ['white', FLAG_COLOR_NUM.white],
      ['yellow', FLAG_COLOR_NUM.yellow],
      ['blue', FLAG_COLOR_NUM.blue]
    ];
    
    // Center swatches horizontally within the card
    const count = colors.length;
    const totalW = count * (2 * r) + (count - 1) * gap;
    let cx = cardLeft + cardWidth / 2 - totalW / 2 + r;
    
    this.flagSwatches = [];
    this.flagSwatchHalos = [];
    this.flagSwatchKeys = [];
    this.swatchHit = [];
    
    colors.forEach(([key, fill]) => {
      const halo = this.scene.add.circle(cx, baseY, r + 5, 0x000000, 0)
        .setOrigin(0.5, 0.5)
        .setStrokeStyle(3, 0x9ae6b4)
        .setDepth(50);
      halo.setVisible(false);
      
      const node = this.scene.add.circle(cx, baseY, r, fill, 1)
        .setOrigin(0.5, 0.5)
        .setStrokeStyle(2, 0x3a3a46)
        .setDepth(51);
      
      // Explicit hit area makes this reliable across Phaser shape input edge cases.
      node.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains, { useHandCursor: true } as any)
        .on('pointerdown', () => {
          const now = this.scene.time.now;
          const last: number = (node as any).getData?.('lastClickTs') ?? 0;
          const isDouble = now - last < 250;
          (node as any).setData?.('lastClickTs', now);
          
          const prevColor = runState.flagColor;
          runState.flagColor = key;
          this.onColorChange(key);
          this.refresh();
          this.updateCursorAppearance();
          this.renderAll();
          
          if (isDouble) {
            if (this.paintMode && prevColor === key) {
              this.disable();
            } else {
              this.enable();
            }
          }
        });
      
      this.flagSwatchHalos.push(halo);
      this.flagSwatches.push(node);
      this.flagSwatchKeys.push(key);
      this.swatchHit.push({ key, x: cx, y: baseY, r });
      this.swatchNodes.push(halo, node);
      cx += r * 2 + gap;
    });
    
    this.refresh();
    
    // Follow pointer with a flag indicator while in paint mode
    const moveHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.paintMode && this.cursor) {
        this.cursor.setPosition(pointer.x + 8, pointer.y + 8);
      }
    };
    this.scene.input.on('pointermove', moveHandler);
    this.disposers.push(() => this.scene.input.off('pointermove', moveHandler as any));
    
    // Quick escape from flag paint mode using ESC
    const escHandler = () => this.disable();
    this.scene.input.keyboard?.on('keydown-ESC', escHandler);
    this.disposers.push(() => this.scene.input.keyboard?.off('keydown-ESC', escHandler));
  }

  enable(): void {
    if (this.paintMode) return;
    this.paintMode = true;
    this.onPaintModeChange(true);
    
    // Hide the system cursor and show our flag cursor indicator
    this.scene.input.setDefaultCursor('none');
    if (!this.cursor) {
      this.cursor = this.scene.add.text(0, 0, '⚑', {
        fontFamily: 'LTHoop, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: '20px',
        color: FLAG_COLOR_HEX[runState.flagColor] ?? '#d6d6dc'
      }).setOrigin(0, 0).setDepth(5000);
    }
    this.cursor.setVisible(true);
    this.updateCursorAppearance();
  }

  disable(): void {
    if (!this.paintMode) return;
    this.paintMode = false;
    this.onPaintModeChange(false);
    this.scene.input.setDefaultCursor('default');
    if (this.cursor) this.cursor.setVisible(false);
  }

  updateCursorPosition(x: number, y: number): void {
    if (this.paintMode && this.cursor) {
      this.cursor.setPosition(x + 8, y + 8);
    }
  }

  updateCursorAppearance(): void {
    if (!this.cursor) return;
    const css = FLAG_COLOR_HEX[runState.flagColor] ?? '#d6d6dc';
    this.cursor.setColor(css);
  }

  refresh(): void {
    const selected = runState.flagColor;
    this.flagSwatches.forEach((node: any, idx: number) => {
      // node.fillColor is a number; compare to detect which is selected
      const isSelected =
        (selected === 'white' && node.fillColor === FLAG_COLOR_NUM.white) ||
        (selected === 'yellow' && node.fillColor === FLAG_COLOR_NUM.yellow) ||
        (selected === 'blue' && node.fillColor === FLAG_COLOR_NUM.blue);
      node.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x9ae6b4 : 0x3a3a46);
      const halo = this.flagSwatchHalos[idx];
      if (halo) halo.setVisible(!!isSelected);
    });
  }

  isPaintMode(): boolean {
    return this.paintMode;
  }

  // DOM fallback route for clicks (covers cases where Phaser hit-testing is blocked by other interactives).
  domRouteDown(x: number, y: number): boolean {
    for (const s of this.swatchHit) {
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy <= (s.r + 6) * (s.r + 6)) {
        const now = this.scene.time.now;
        const last = this.swatchLastClickTs[s.key] ?? 0;
        const isDouble = now - last < 250;
        this.swatchLastClickTs[s.key] = now;
        const prevColor = runState.flagColor;
        runState.flagColor = s.key;
        this.onColorChange(s.key);
        this.refresh();
        this.updateCursorAppearance();
        this.renderAll();
        if (isDouble) {
          if (this.paintMode && prevColor === s.key) this.disable();
          else this.enable();
        }
        return true;
      }
    }
    return false;
  }

  cleanup(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
    for (const n of this.swatchNodes) n.destroy();
    this.swatchNodes = [];
    this.disable();
  }
}

