// Phaser type extensions for custom methods and properties
import Phaser from 'phaser';

declare module 'phaser' {
  namespace GameObjects {
    interface GameObject {
      setVisible(visible: boolean): this;
      setText?(text: string): this;
      disableInteractive?(): this;
      setData(key: string, value: any): this;
      getData(key: string): any;
      setRadius?(radius: number): this;
      setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
      on(event: string, callback: Function): this;
    }

    interface Text {
      setWordWrapWidth(width: number, useAdvancedWrap?: boolean): this;
    }

    interface Circle {
      setRadius(radius: number): this;
    }

    interface Rectangle {
      setRadius(radius: number): this;
    }
  }

  namespace Input {
    interface InputManager {
      enabled?: boolean;
      topOnly?: boolean;
    }

    interface Pointer {
      event?: PointerEvent | MouseEvent;
      ctrlKey?: boolean;
    }
  }

  namespace Scenes {
    interface Scene {
      // Custom methods added to GameScene
      flashRow?(category: 'shop' | 'challenge', id: string): void;
      floatDelta?(type: 'coins' | 'lives', amount: number): void;
    }
  }
}

// Extension for manifest (UI component)
export interface ManifestWithExtensions {
  refresh(): void;
  getBottomY(): number;
  domRouteDown?(x: number, y: number): boolean;
  domRouteMove?(x: number, y: number): boolean;
  flashRow?(category: 'shop' | 'challenge', id: string): void;
  floatDelta?(type: 'coins' | 'lives', amount: number): void;
}

// Extension for ActiveEffectsPanel
export interface ActiveEffectsPanelWithExtensions {
  getBottomY?(): number;
}

