import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import ShopScene from './scenes/ShopScene';
import { VIEW_WIDTH, VIEW_HEIGHT } from './game/consts';
import TitleScene from './scenes/TitleScene';
import TeammateScene from './scenes/TeammateScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#121218',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  },
  scene: [TitleScene, TeammateScene, GameScene, ShopScene]
};

async function loadFontExplicit(name: string, urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-undef
      const face = new FontFace(name, `url("${url}")`);
      const loaded = await face.load();
      (document as any).fonts.add(loaded);
      // Once one source loads, stop trying others
      return;
    } catch {
      // try next source
    }
  }
}

const start = async () => {
  try {
    // Proactively load custom fonts so Phaser has them on first draw
    await Promise.all([
      loadFontExplicit('LTHoop', [
        '/assets/fonts/LTHoop-Regular.woff2',
        '/assets/fonts/LTHoop-Regular.otf',
        '/assets/fonts/LTHoop-Regular.ttf',
        '/assets/fonts/LTHoop.otf'
      ]),
      loadFontExplicit('GrapeSoda', [
        '/assets/fonts/GrapeSoda.woff2',
        '/assets/fonts/GrapeSoda.otf',
        '/assets/fonts/GrapeSoda.ttf'
      ])
    ]);
    // As an extra guard, wait for document font set to settle
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;
  } catch {
    // ignore and start anyway
  }
new Phaser.Game(config);
};

start();


