# Refactoring Guide: GameScene.ts & ShopScene.ts

## Overview

This guide provides specific, actionable suggestions for breaking down the large scene files into smaller, maintainable modules.

---

## GameScene.ts Refactoring Strategy

**Current**: 1,224 lines  
**Target**: <600 lines  
**Strategy**: Extract 6 major subsystems into separate modules

---

### 1. Input Handling System (~250 lines)

**Extract to**: `src/scenes/gameplay/InputHandler.ts`

#### What to Extract:
- DOM pointer routing (`routeDomPointer`, `routeDomMove`) - lines 944-1063
- Phaser input handlers (pointerdown/up/over/out) - lines 376-439
- Click timing logic (`clickTimes`, `pressedLeft` arrays)
- Double-click detection for chording

#### New Module Structure:
```typescript
// src/scenes/gameplay/InputHandler.ts
export class InputHandler {
  constructor(
    private scene: Phaser.Scene,
    private board: Board,
    private onReveal: (x: number, y: number) => void,
    private onFlag: (x: number, y: number) => void,
    private onChord: (x: number, y: number) => void
  ) {}
  
  setup(): void { /* DOM + Phaser listeners */ }
  cleanup(): void { /* Remove listeners */ }
  private routeDomPointer(ev: PointerEvent): void { /* ... */ }
  private routeDomMove(ev: PointerEvent): void { /* ... */ }
}
```

#### Benefits:
- Removes ~250 lines from GameScene
- Makes input handling testable
- Can be reused in other scenes if needed

---

### 2. Flag Paint Mode System (~100 lines)

**Extract to**: `src/scenes/gameplay/FlagPaintMode.ts`

#### What to Extract:
- Flag paint mode state and cursor - lines 914-941
- Flag swatch UI and interaction - lines 219-291
- Flag color management (`FLAG_COLOR_HEX`, `flagColor` state)

#### New Module Structure:
```typescript
// src/scenes/gameplay/FlagPaintMode.ts
export class FlagPaintMode {
  private paintMode: boolean = false;
  private cursor?: Phaser.GameObjects.Text;
  
  constructor(
    private scene: Phaser.Scene,
    private onColorChange: (color: 'white' | 'yellow' | 'blue') => void
  ) {}
  
  setupSwatches(x: number, y: number): void { /* ... */ }
  enable(): void { /* ... */ }
  disable(): void { /* ... */ }
  updateCursor(x: number, y: number): void { /* ... */ }
}
```

#### Benefits:
- Removes ~100 lines
- Isolates flag color logic
- Easier to add new flag colors later

---

### 3. Tile Rendering System (~200 lines)

**Extract to**: `src/scenes/rendering/TileRenderer.ts`

#### What to Extract:
- `renderTile()` method - lines 811-893
- `renderAll()` method - lines 755-761
- `animateFlipAt()` method - lines 764-793
- Icon rendering (`shopIcon`, `challengeIcon`, `challengeLabel`) - lines 1127-1184
- Icon image management (`iconImages` Map)

#### New Module Structure:
```typescript
// src/scenes/rendering/TileRenderer.ts
export class TileRenderer {
  private iconImages: Map<number, Phaser.GameObjects.Image> = new Map();
  
  constructor(
    private scene: Phaser.Scene,
    private board: Board,
    private tiles: Phaser.GameObjects.Rectangle[][],
    private numbers: Phaser.GameObjects.Text[][],
    private boardCell: number
  ) {}
  
  renderTile(x: number, y: number): void { /* ... */ }
  renderAll(): void { /* ... */ }
  animateFlip(x: number, y: number): void { /* ... */ }
  private getIconForTile(tile: Tile): string { /* ... */ }
  cleanup(): void { /* Clear iconImages */ }
}
```

#### Benefits:
- Removes ~200 lines
- Separates rendering from game logic
- Easier to optimize rendering later

---

### 4. Hover System (~150 lines)

**Extract to**: `src/scenes/ui/HoverSystem.ts`

#### What to Extract:
- `setHover()` method - lines 548-575
- `clearHover()` method - lines 541-546
- `showTileHover()` method - lines 577-626
- Hover text formatting (emoji spacing logic)
- Tile hover state management (`setTileHoverState`) - lines 795-809

#### New Module Structure:
```typescript
// src/scenes/ui/HoverSystem.ts
export class HoverSystem {
  constructor(
    private scene: Phaser.Scene,
    private nameText: Phaser.GameObjects.Text,
    private descText: Phaser.GameObjects.Text,
    private board: Board,
    private tiles: Phaser.GameObjects.Rectangle[][]
  ) {}
  
  showTileHover(x: number, y: number): void { /* ... */ }
  setHover(name: string, color: string, desc: string): void { /* ... */ }
  clearHover(): void { /* ... */ }
  setTileHoverState(x: number, y: number, state: 'normal' | 'hover' | 'pressed'): void { /* ... */ }
  private formatEmojiText(text: string): string { /* ... */ }
}
```

#### Benefits:
- Removes ~150 lines
- Centralizes hover logic
- Can be reused in ShopScene

---

### 5. Level Resolution System (~150 lines)

**Extract to**: `src/scenes/gameplay/LevelResolver.ts`

#### What to Extract:
- `resolveLevel()` method - lines 1066-1126
- `showEndScreen()` method - lines 1186-1223
- Collectible end-of-level checks:
  - Resurrector (lines 1068-1074)
  - Minimalist (lines 1076-1081)
  - Vexillologist (lines 1083-1093)
  - Cartographer (lines 1095-1110)

#### New Module Structure:
```typescript
// src/scenes/gameplay/LevelResolver.ts
export class LevelResolver {
  private cartographerAwarded: boolean = false;
  
  constructor(
    private scene: Phaser.Scene,
    private board: Board,
    private manifest: ManifestPanel
  ) {}
  
  resolveLevel(survived: boolean): void {
    if (survived) {
      this.checkResurrector();
      this.checkMinimalist();
      this.checkVexillologist();
      this.checkCartographer();
      this.navigateToShop();
    } else {
      this.showLossScreen();
    }
  }
  
  private checkResurrector(): void { /* ... */ }
  private checkMinimalist(): void { /* ... */ }
  private checkVexillologist(): void { /* ... */ }
  private checkCartographer(): void { /* ... */ }
  private showEndScreen(win: boolean): void { /* ... */ }
  reset(): void { this.cartographerAwarded = false; }
}
```

#### Benefits:
- Removes ~150 lines
- Makes end-of-level logic testable
- Clearer separation of concerns

---

### 6. Relic Activation System (~120 lines)

**Extract to**: `src/scenes/gameplay/RelicActivator.ts`

#### What to Extract:
- Start-of-level relic checks - lines 128-192:
  - Pioneer (lines 129-142)
  - Cheapskate (lines 144-148)
  - Debt Collector (lines 150-154)
  - Fortune Teller (lines 156-164)
  - Mathematician (lines 166-182)
  - Researcher (lines 184-192)

#### New Module Structure:
```typescript
// src/scenes/gameplay/RelicActivator.ts
export class RelicActivator {
  constructor(
    private board: Board,
    private revealTile: (x: number, y: number) => void
  ) {}
  
  activateStartOfLevel(): void {
    this.activatePioneer();
    this.activateCheapskate();
    this.activateDebtCollector();
    this.activateFortuneTeller();
    this.activateMathematician();
    this.activateResearcher();
  }
  
  private activatePioneer(): void { /* ... */ }
  private activateCheapskate(): void { /* ... */ }
  private activateDebtCollector(): void { /* ... */ }
  private activateFortuneTeller(): void { /* ... */ }
  private activateMathematician(): void { /* ... */ }
  private activateResearcher(): void { /* ... */ }
}
```

#### Benefits:
- Removes ~120 lines
- Makes relic logic testable
- Easier to add new start-of-level relics

---

### 7. Board Setup Utility (~80 lines)

**Extract to**: `src/scenes/gameplay/BoardSetup.ts`

#### What to Extract:
- Board grid creation loop - lines 365-445
- Tile rectangle creation
- Number label creation
- Initial event listener setup for tiles

#### New Module Structure:
```typescript
// src/scenes/gameplay/BoardSetup.ts
export interface BoardSetupResult {
  tiles: Phaser.GameObjects.Rectangle[][];
  numbers: Phaser.GameObjects.Text[][];
  clickTimes: number[][];
  pressedLeft: boolean[][];
}

export class BoardSetup {
  static createBoard(
    scene: Phaser.Scene,
    board: Board,
    boardCell: number,
    onPointerDown: (x: number, y: number, pointer: Phaser.Input.Pointer) => void,
    onPointerUp: (x: number, y: number, pointer: Phaser.Input.Pointer) => void,
    onPointerOver: (x: number, y: number) => void,
    onPointerOut: (x: number, y: number) => void
  ): BoardSetupResult {
    // Create tiles, numbers, arrays
    // Set up event listeners
    return { tiles, numbers, clickTimes, pressedLeft };
  }
}
```

#### Benefits:
- Removes ~80 lines
- Makes board setup reusable
- Easier to test board initialization

---

### Refactored GameScene.ts Structure

After extraction, GameScene.ts would look like:

```typescript
export default class GameScene extends Phaser.Scene {
  private board!: Board;
  private manifest!: ManifestPanel;
  private effectsPanel!: ActiveEffectsPanel;
  
  // Extracted systems
  private inputHandler!: InputHandler;
  private flagPaintMode!: FlagPaintMode;
  private tileRenderer!: TileRenderer;
  private hoverSystem!: HoverSystem;
  private levelResolver!: LevelResolver;
  private relicActivator!: RelicActivator;
  private boardSetup!: BoardSetupResult;
  
  create() {
    // Setup (50 lines)
    this.setupScene();
    this.setupBoard();
    this.setupUI();
    this.setupEventListeners();
    this.setupInput();
    this.setupRelics();
  }
  
  private setupScene(): void { /* Background, camera */ }
  private setupBoard(): void { /* Generate board, use BoardSetup */ }
  private setupUI(): void { /* Manifest, effects panel */ }
  private setupEventListeners(): void { /* GameEvent listeners */ }
  private setupInput(): void { /* InputHandler, FlagPaintMode */ }
  private setupRelics(): void { /* RelicActivator */ }
  
  // Remaining methods (~200 lines):
  // - handleReveal()
  // - chordReveal()
  // - toggleFlag()
  // - Event handlers
}
```

**Estimated final size**: ~400-500 lines ✅

---

## ShopScene.ts Refactoring Strategy

**Current**: 611 lines  
**Target**: <600 lines  
**Strategy**: Extract 3 subsystems

---

### 1. Service Rendering (~80 lines)

**Extract to**: `src/scenes/shop/ServiceRenderer.ts`

#### What to Extract:
- `drawServiceCard()` function - lines 257-304
- Service purchase logic
- Service state management (`servicePurchased` Set, `svcRefs`)

#### New Module Structure:
```typescript
// src/scenes/shop/ServiceRenderer.ts
export class ServiceRenderer {
  private servicePurchased: Set<string> = new Set();
  private svcRefs: Record<string, ServiceRef> = {};
  
  constructor(
    private scene: Phaser.Scene,
    private onPurchase: (id: string, price: number) => void,
    private onHover: (name: string, desc: string) => void,
    private onHoverClear: () => void
  ) {}
  
  renderServices(x: number, y: number, width: number): void {
    this.renderService('Reroll', 2, x, 'Reroll the shop');
    this.renderService('BuyLife', 3, x + gap, 'Buy a life');
  }
  
  private renderService(id: string, price: number, x: number, hover: string): void { /* ... */ }
  markSold(id: string): void { /* ... */ }
  reset(): void { this.servicePurchased.clear(); }
}
```

#### Benefits:
- Removes ~80 lines
- Isolates service logic
- Easier to add new services

---

### 2. Offer Rendering (~120 lines)

**Extract to**: `src/scenes/shop/OfferRenderer.ts`

#### What to Extract:
- `renderOfferCard()` method - lines 371-432
- `renderOffersGrid()` method - lines 350-368
- Offer hover logic
- Price display logic

#### New Module Structure:
```typescript
// src/scenes/shop/OfferRenderer.ts
export class OfferRenderer {
  private offerEntries: OfferEntry[] = [];
  
  constructor(
    private scene: Phaser.Scene,
    private onPurchase: (offer: Offer) => void,
    private onHover: (name: string, type: string, desc: string) => void,
    private onHoverClear: () => void,
    private getEffectivePrice: (offer: Offer) => number
  ) {}
  
  renderGrid(
    offers: Offer[],
    startX: number,
    startY: number,
    boxWidth: number,
    cols: number
  ): number { /* ... */ }
  
  private renderCard(offer: Offer, x: number, y: number, w: number, h: number): void { /* ... */ }
  markSold(offerId: string): void { /* ... */ }
  refreshPrices(): void { /* ... */ }
}
```

#### Benefits:
- Removes ~120 lines
- Separates rendering from purchase logic
- Easier to change offer display

---

### 3. Purchase Logic (~100 lines)

**Extract to**: `src/scenes/shop/PurchaseHandler.ts`

#### What to Extract:
- `purchase()` method - lines 535-579
- `purchaseAndRefresh()` method - lines 454-497
- `effectivePrice()` method - lines 434-437
- Purchase validation and state updates

#### New Module Structure:
```typescript
// src/scenes/shop/PurchaseHandler.ts
export class PurchaseHandler {
  private purchasedIds: Set<string> = new Set();
  
  constructor(
    private onPurchaseComplete: (offer: Offer) => void,
    private getEffectivePrice: (offer: Offer) => number
  ) {}
  
  canPurchase(offer: Offer): boolean {
    return !this.purchasedIds.has(offer.id) && 
           runState.gold >= this.getEffectivePrice(offer);
  }
  
  purchase(offer: Offer): PurchaseResult {
    if (!this.canPurchase(offer)) {
      return { success: false, reason: 'cannot_afford' };
    }
    
    // Apply purchase effects
    this.applyPurchase(offer);
    this.purchasedIds.add(offer.id);
    
    return { success: true };
  }
  
  private applyPurchase(offer: Offer): void { /* ... */ }
  reset(): void { this.purchasedIds.clear(); }
}
```

#### Benefits:
- Removes ~100 lines
- Makes purchase logic testable
- Clearer separation of concerns

---

### Refactored ShopScene.ts Structure

After extraction, ShopScene.ts would look like:

```typescript
export default class ShopScene extends Phaser.Scene {
  private offers: Offer[] = [];
  private serviceRenderer!: ServiceRenderer;
  private offerRenderer!: OfferRenderer;
  private purchaseHandler!: PurchaseHandler;
  private hoverSystem!: HoverSystem; // Reuse from GameScene
  
  create() {
    // Setup (100 lines)
    this.setupScene();
    this.setupOffers();
    this.setupUI();
    this.setupServices();
    this.setupProceedButton();
  }
  
  private setupScene(): void { /* Background, title */ }
  private setupOffers(): void { /* Generate offers, use OfferRenderer */ }
  private setupUI(): void { /* Stats pills, hover area */ }
  private setupServices(): void { /* Use ServiceRenderer */ }
  private setupProceedButton(): void { /* Proceed button */ }
  
  // Remaining methods (~150 lines):
  // - Helper methods (iconFor, displayName, drawHeader, etc.)
  // - Event handlers
}
```

**Estimated final size**: ~400-450 lines ✅

---

## Implementation Strategy

### Phase 1: Extract Independent Systems (Low Risk)
1. ✅ HoverSystem (no dependencies)
2. ✅ FlagPaintMode (minimal dependencies)
3. ✅ ServiceRenderer (isolated)

### Phase 2: Extract Rendering (Medium Risk)
4. ✅ TileRenderer (needs board access)
5. ✅ OfferRenderer (needs purchase callbacks)

### Phase 3: Extract Game Logic (Higher Risk)
6. ✅ InputHandler (complex, many callbacks)
7. ✅ LevelResolver (needs board + manifest)
8. ✅ RelicActivator (needs reveal function)
9. ✅ PurchaseHandler (needs state access)

### Phase 4: Extract Setup Utilities (Low Risk)
10. ✅ BoardSetup (pure utility)

---

## Migration Checklist

For each extraction:

- [ ] Create new file with extracted class/module
- [ ] Move code to new file
- [ ] Update imports in GameScene/ShopScene
- [ ] Create instance in `create()` method
- [ ] Pass required dependencies via constructor
- [ ] Update method calls to use new instance
- [ ] Remove old code from original file
- [ ] Test that game still works
- [ ] Verify no TypeScript errors
- [ ] Check that file size reduced as expected

---

## Benefits Summary

### Code Quality
- ✅ Smaller, focused files (<600 lines)
- ✅ Single Responsibility Principle
- ✅ Easier to test individual systems
- ✅ Easier to understand and maintain

### Developer Experience
- ✅ Faster to find specific functionality
- ✅ Easier to make changes (smaller scope)
- ✅ Less merge conflicts (smaller files)
- ✅ Better code organization

### Performance
- ✅ No performance impact (same code, better organized)
- ✅ Potential for future optimizations (isolated systems)

---

## Potential Challenges

1. **Circular Dependencies**: Some systems may need each other
   - **Solution**: Use dependency injection, pass callbacks

2. **State Access**: Extracted classes need access to `runState`
   - **Solution**: Pass state as parameter, or create state accessor

3. **Phaser Scene Access**: Many systems need `scene.add`, `scene.tweens`, etc.
   - **Solution**: Pass scene instance to constructors

4. **Testing**: Need to mock Phaser objects
   - **Solution**: Create interfaces for Phaser types, use dependency injection

---

## Next Steps

1. Start with **HoverSystem** (easiest, no dependencies)
2. Then **FlagPaintMode** (minimal dependencies)
3. Then **ServiceRenderer** (isolated)
4. Continue with remaining extractions in order of complexity

Each extraction should be a separate commit for easier review and rollback if needed.

