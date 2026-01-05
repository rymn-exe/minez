import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import ShopScene from './scenes/ShopScene';
import { VIEW_WIDTH, VIEW_HEIGHT } from './game/consts';
import TitleScene from './scenes/TitleScene';
import TeammateScene from './scenes/TeammateScene';
import ButtonPreviewScene from './scenes/ButtonPreviewScene';
import ChallengeScene from './scenes/ChallengeScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#121218',
  render: {
    // Enable antialiasing for smoother font rendering
    antialias: true,
    // Don't round pixels - allows sub-pixel rendering for crisp text
    roundPixels: false,
    // Use device pixel ratio for high-DPI displays (Phaser handles this automatically)
    pixelArt: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  },
  scene: [TitleScene, TeammateScene, GameScene, ShopScene, ChallengeScene, ButtonPreviewScene]
};

const start = async () => {
  try {
    // Ensure fonts are fully ready before starting Phaser to avoid first-frame fallback
    const fonts = (document as { fonts?: FontFaceSet }).fonts;
    if (fonts?.load) {
      await Promise.allSettled([
        fonts.load('16px "LTHoop"'),
        fonts.load('700 18px "LTHoop"'),
        fonts.load('48px "GrapeSoda"')
      ]);
      if (fonts.ready) await fonts.ready;
      // Two RAFs to ensure layout/metrics settle with the loaded faces
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  } catch {
    // ignore and start anyway
  }
  
  const game = new Phaser.Game(config);
  
  // Note: Phaser 3.90 doesn't have built-in high-DPI support
  // The render config (antialias: true, roundPixels: false) helps with font quality
  // but true high-DPI rendering requires manual canvas manipulation which breaks Phaser's systems
  // 
  // For now, we'll log the DPR for debugging and rely on render settings for quality
  game.events.once('ready', () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    console.log(`[Minez] Device Pixel Ratio: ${dpr}`);
    console.log(`[Minez] Render settings: antialias=${config.render?.antialias}, roundPixels=${config.render?.roundPixels}`);
    console.log(`[Minez] Canvas: ${game.canvas.width}x${game.canvas.height} (internal), ${game.canvas.clientWidth}x${game.canvas.clientHeight} (display)`);
    
    if (dpr > 1) {
      console.warn('[Minez] High-DPI display detected. Phaser 3.90 has limited high-DPI support.');
      console.warn('[Minez] Fonts may appear slightly blurry. Consider using bitmap fonts for crisp rendering.');
    }
  });
};

start();


