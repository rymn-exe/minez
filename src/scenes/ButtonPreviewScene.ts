// ButtonPreviewScene: Shows multiple start button style candidates
import Phaser from 'phaser';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../game/consts';

export default class ButtonPreviewScene extends Phaser.Scene {
  constructor() {
    super('ButtonPreviewScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f13');
    
    // Title
    this.add.text(VIEW_WIDTH / 2, 20, 'Start Button Candidates', {
      fontFamily: 'GrapeSoda',
      fontSize: '40px',
      color: '#e9e9ef'
    }).setOrigin(0.5, 0);
    
    this.add.text(VIEW_WIDTH / 2, 65, 'Hover/click buttons to see interactions', {
      fontFamily: 'LTHoop',
      fontSize: '14px',
      color: '#9aa0a6'
    }).setOrigin(0.5, 0);

    // Grid layout: 2 columns, 4 rows (last row has 1 button)
    const cols = 2;
    const startX = VIEW_WIDTH / 4;
    const rightX = (VIEW_WIDTH / 4) * 3;
    const startY = 110;
    const rowSpacing = 100;
    const labelOffset = 35;

    // Row 1
    this.createButton1(startX, startY, '1. Minimal (Current)');
    this.createButton2(rightX, startY, '2. Glow Effect');

    // Row 2
    this.createButton3(startX, startY + rowSpacing, '3. Gradient');
    this.createButton4(rightX, startY + rowSpacing, '4. Icon + Text');

    // Row 3
    this.createButton5(startX, startY + rowSpacing * 2, '5. Outlined');
    this.createButton6(rightX, startY + rowSpacing * 2, '6. Neon Glow');

    // Row 4 (centered)
    this.createButton7(VIEW_WIDTH / 2, startY + rowSpacing * 3, '7. 3D Effect');

    // Back button
    const backBtn = this.add.text(VIEW_WIDTH / 2, VIEW_HEIGHT - 30, 'Press ESC to go back', {
      fontFamily: 'LTHoop',
      fontSize: '14px',
      color: '#9aa0a6'
    }).setOrigin(0.5, 1);

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });
  }

  // Button 1: Minimal (current style)
  private createButton1(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const gfx = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      gfx.clear();
      gfx.lineStyle(1, 0x3a3a46, 1);
      gfx.fillStyle(hover ? 0x353542 : 0x2a2a34, 1);
      gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBtn(true));
    zone.on('pointerout', () => drawBtn(false));
  }

  // Button 2: Glow effect
  private createButton2(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const glow = this.add.graphics();
    const gfx = this.add.graphics();
    glow.setPosition(x, y); // Position glow at button location
    glow.setDepth(999);
    
    const drawBtn = (hover: boolean) => {
      glow.clear();
      gfx.clear();
      
      if (hover) {
        const alpha = 0.4 + Math.sin(this.time.now / 300) * 0.2;
        glow.fillStyle(0x9ae6b4, alpha);
        // Draw glow relative to glow's position (which is at x, y)
        glow.fillRoundedRect(-134, -32, 268, 64, 12);
      }
      
      gfx.lineStyle(2, hover ? 0x9ae6b4 : 0x3a3a46, hover ? 0.8 : 1);
      gfx.fillStyle(hover ? 0x2f3542 : 0x2a2a34, 1);
      gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let isHovering = false;
    
    zone.on('pointerover', () => { 
      isHovering = true;
      drawBtn(true);
    });
    zone.on('pointerout', () => { 
      isHovering = false;
      drawBtn(false);
    });
    
    // Update glow animation
    this.time.addEvent({
      delay: 16,
      callback: () => {
        if (isHovering) {
          drawBtn(true);
        }
      },
      loop: true
    });
  }

  // Button 3: Gradient background (simulated)
  private createButton3(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const gfx = this.add.graphics();
    
    const drawBtn = (hover: boolean) => {
      gfx.clear();
      
      // Simulate gradient with multiple fills
      const baseColor = hover ? 0x353542 : 0x2a2a34;
      const topColor = hover ? 0x3f4552 : 0x32323c;
      
      // Top half (lighter)
      gfx.fillStyle(topColor, 1);
      gfx.fillRoundedRect(-130, -28, 260, 28, { tl: 10, tr: 10, bl: 0, br: 0 });
      
      // Bottom half (darker)
      gfx.fillStyle(baseColor, 1);
      gfx.fillRoundedRect(-130, 0, 260, 28, { tl: 0, tr: 0, bl: 10, br: 10 });
      
      gfx.lineStyle(1.5, hover ? 0x7dd3fc : 0x3a3a46, 1);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBtn(true));
    zone.on('pointerout', () => drawBtn(false));
  }

  // Button 4: Icon + Text
  private createButton4(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const gfx = this.add.graphics();
    
    const drawBtn = (hover: boolean) => {
      gfx.clear();
      gfx.lineStyle(1.5, hover ? 0x7dd3fc : 0x3a3a46, 1);
      gfx.fillStyle(hover ? 0x353542 : 0x2a2a34, 1);
      gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    
    const icon = this.add.text(-50, 0, '▶', {
      fontFamily: 'LTHoop',
      fontSize: '20px',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    
    const text = this.add.text(20, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      color: '#9ae6b4'
    }).setOrigin(0, 0.5);
    
    cont.add([gfx, icon, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      drawBtn(true);
      this.tweens.add({
        targets: [icon, text],
        scale: 1.1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    });
    zone.on('pointerout', () => {
      drawBtn(false);
      this.tweens.add({
        targets: [icon, text],
        scale: 1.0,
        duration: 150
      });
    });
  }

  // Button 5: Outlined style
  private createButton5(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const gfx = this.add.graphics();
    
    const drawBtn = (hover: boolean) => {
      gfx.clear();
      
      if (hover) {
        // Filled on hover
        gfx.fillStyle(0x2f3542, 1);
        gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      }
      
      gfx.lineStyle(2, hover ? 0x9ae6b4 : 0x7dd3fc, 1);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      color: '#7dd3fc'
    }).setOrigin(0.5);
    
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      drawBtn(true);
      text.setColor('#9ae6b4');
    });
    zone.on('pointerout', () => {
      drawBtn(false);
      text.setColor('#7dd3fc');
    });
  }

  // Button 6: Neon glow
  private createButton6(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const glow = this.add.graphics();
    const gfx = this.add.graphics();
    glow.setPosition(x, y); // Position glow at button location
    glow.setDepth(998);
    
    const drawBtn = (hover: boolean) => {
      glow.clear();
      gfx.clear();
      
      if (hover) {
        // Outer glow - draw relative to glow's position (which is at x, y)
        glow.fillStyle(0xa78bfa, 0.3);
        glow.fillRoundedRect(-135, -33, 270, 66, 12);
        glow.fillStyle(0x7dd3fc, 0.2);
        glow.fillRoundedRect(-133, -31, 266, 62, 11);
      }
      
      gfx.fillStyle(0x1a1b23, 1);
      gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      gfx.lineStyle(2, hover ? 0xa78bfa : 0x3a3a46, hover ? 1 : 0.5);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
    };
    drawBtn(false);
    
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      drawBtn(true);
      text.setColor('#a78bfa');
    });
    zone.on('pointerout', () => {
      drawBtn(false);
      text.setColor('#9ae6b4');
    });
  }

  // Button 7: 3D effect
  private createButton7(x: number, y: number, label: string) {
    this.add.text(x, y - 40, label, {
      fontFamily: 'LTHoop',
      fontSize: '13px',
      color: '#9aa0a6'
    }).setOrigin(0.5);

    const cont = this.add.container(x, y).setDepth(1000);
    const shadow = this.add.graphics();
    const gfx = this.add.graphics();
    shadow.setDepth(997);
    
    const drawBtn = (hover: boolean, pressed: boolean = false) => {
      shadow.clear();
      gfx.clear();
      
      const offset = pressed ? 2 : hover ? 3 : 4;
      const bgColor = hover ? 0x353542 : 0x2a2a34;
      
      // Shadow
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(-130 + offset, -28 + offset, 260, 56, 10);
      
      // Main button
      gfx.fillStyle(bgColor, 1);
      gfx.fillRoundedRect(-130, -28, 260, 56, 10);
      
      // Top highlight
      gfx.lineStyle(1, 0x4a4a56, 0.5);
      gfx.beginPath();
      gfx.moveTo(-130 + 10, -28);
      gfx.lineTo(130 - 10, -28);
      gfx.strokePath();
      
      // Border
      gfx.lineStyle(1, 0x3a3a46, 1);
      gfx.strokeRoundedRect(-130, -28, 260, 56, 10);
      
      cont.setY(y - (pressed ? 2 : hover ? 1 : 0));
    };
    drawBtn(false);
    
    const text = this.add.text(0, 0, 'Start', {
      fontFamily: 'LTHoop',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#9ae6b4'
    }).setOrigin(0.5);
    
    cont.add([gfx, text]);
    
    const zone = this.add.zone(x, y, 340, 100).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let isPressed = false;
    
    zone.on('pointerover', () => {
      if (!isPressed) {
        drawBtn(true);
      }
    });
    zone.on('pointerout', () => {
      if (!isPressed) {
        drawBtn(false);
      }
    });
    zone.on('pointerdown', () => {
      isPressed = true;
      drawBtn(true, true);
    });
    zone.on('pointerup', () => {
      isPressed = false;
      drawBtn(true);
    });
  }
}

