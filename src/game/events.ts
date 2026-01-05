// Minimal typed event bus so the logic layer can stay UI‑agnostic.
// Scenes subscribe to these events to update visuals or navigate between scenes.
type Listener<T> = (payload: T) => void;

export enum GameEvent {
  LevelStart = 'onLevelStart',
  TileRevealed = 'onTileRevealed',
  GoldGained = 'onGoldGained',
  LifeChanged = 'onLifeChanged',
  LevelEndTriggered = 'onLevelEndTriggered',
  LevelEndResolved = 'onLevelEndResolved'
}

// Event payload interfaces
export interface TileRevealedPayload {
  tile: import('./types').Tile;
}

export interface GoldGainedPayload {
  amount: number;
  source: string;
}

export interface LifeChangedPayload {
  delta: number;
}

export interface LevelEndResolvedPayload {
  survived: boolean;
}

export class EventBus {
  private listeners: Map<GameEvent, Set<Listener<any>>> = new Map();

  // Simpler signature avoids strict generic friction at call sites
  on(evt: GameEvent, cb: Listener<any>): () => void {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    const set = this.listeners.get(evt)!;
    set.add(cb as Listener<any>);
    return () => set.delete(cb as Listener<any>);
  }

  emit<T>(evt: GameEvent, payload: T): void {
    const set = this.listeners.get(evt);
    if (!set) return;
    for (const cb of set) cb(payload);
  }
}

export const events = new EventBus();


