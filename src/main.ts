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

new Phaser.Game(config);


