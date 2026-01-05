import Phaser from 'phaser';
import { runState } from '../state';

export class ActiveEffectsPanel {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add.text(x, y, '', {
      fontFamily: 'LTHoop',
      fontSize: '14px',
      color: '#e9e9ef',
      wordWrap: { width: 190, useAdvancedWrap: true }
    }).setOrigin(0, 0);
    this.refresh();
  }

  refresh() {
    const lines: string[] = [];
    // Death-related
    if (runState.persistentEffects.snakeVenom.active) lines.push('🐍 Snake Venom: Revealing a 3+ has 25% chance to lose 1 life');
    if (runState.persistentEffects.bloodDiamond) lines.push('🔻 Blood Diamond: ⚪/🪙/💎 also cost 1 life');
    // Economy
    if (runState.persistentEffects.carLoan) lines.push('🚗 Car Loan: Special tiles cost 1g');
    if (runState.persistentEffects.snakeOil) lines.push('🧴 Snake Oil: ⚪/🪙/💎 give 0g');
    if (runState.persistentEffects.atmFee) lines.push('🏧 ATM Fee: Every gold loss costs +1 more');
    if (runState.persistentEffects.noEndGold) lines.push('🫴 Finder\'s Fee: No end-of-level gold');
    // Informational
    if (runState.persistentEffects.mathTest) lines.push('☠️ Math Test: Numbers >1 show ?');
    this.text.setText(lines.join('\n'));
  }

  setTop(y: number) {
    this.text.setY(y);
  }
}


