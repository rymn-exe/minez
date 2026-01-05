# Code Fixes To-Do List

## Overview
This document tracks the code quality improvements focusing on:
1. Reducing file sizes (target: <600 lines)
2. Fixing RNG issues (all RNG should be seeded)
3. Improving type safety (removing `as any` casts)

---

## File Size Reduction

### 🔴 Critical: GameScene.ts (1,224 lines → target: <600)

#### Task 1.1: Extract Input Handling
**Priority**: High  
**Estimated Lines Saved**: ~200 lines  
**Files to Create**:
- `src/scenes/input/InputHandler.ts` - DOM/Phaser input routing
- `src/scenes/input/FlagPaintMode.ts` - Flag paint mode logic

**What to Extract**:
- DOM pointer routing (`routeDomPointer`, `routeDomMove`)
- Phaser input handlers (pointerdown/up/over/out)
- Flag paint mode logic (`enableFlagPaintMode`, `disableFlagPaintMode`, `updateFlagCursorAppearance`)
- Flag swatch handling

**Dependencies**: None

---

#### Task 1.2: Extract Rendering Logic
**Priority**: High  
**Estimated Lines Saved**: ~150 lines  
**Files to Create**:
- `src/scenes/rendering/TileRenderer.ts` - Tile rendering logic
- `src/scenes/rendering/IconRenderer.ts` - Icon/sprite rendering

**What to Extract**:
- `renderTile()` method
- `renderAll()` method
- `animateFlipAt()` method
- Icon image management (`iconImages` Map)
- Shop/challenge icon methods (`shopIcon`, `challengeIcon`)

**Dependencies**: None

---

#### Task 1.3: Extract Hover System
**Priority**: Medium  
**Estimated Lines Saved**: ~100 lines  
**Files to Create**:
- `src/scenes/ui/HoverSystem.ts` - Hover text management

**What to Extract**:
- `setHover()` method
- `clearHover()` method
- `showTileHover()` method
- Hover text formatting logic

**Dependencies**: None

---

#### Task 1.4: Extract Level Resolution Logic
**Priority**: Medium  
**Estimated Lines Saved**: ~80 lines  
**Files to Create**:
- `src/scenes/gameplay/LevelResolver.ts` - Level end logic

**What to Extract**:
- `resolveLevel()` method
- `showEndScreen()` method
- Collectible end-of-level checks (Cartographer, Vexillologist, etc.)

**Dependencies**: None

---

#### Task 1.5: Extract Relic Activation Logic
**Priority**: Medium  
**Estimated Lines Saved**: ~100 lines  
**Files to Create**:
- `src/scenes/gameplay/RelicActivator.ts` - Start-of-level relic effects

**What to Extract**:
- Pioneer flagging logic
- Cheapskate check
- Debt Collector check
- Fortune Teller ore reveal
- Mathematician number reveal
- Researcher challenge flagging

**Dependencies**: None

---

#### Task 1.6: Extract Board Setup
**Priority**: Low  
**Estimated Lines Saved**: ~50 lines  
**Files to Create**:
- `src/scenes/ui/BoardSetup.ts` - Board initialization

**What to Extract**:
- Board grid creation loop
- Tile rectangle creation
- Number label creation
- Initial event listener setup

**Dependencies**: None

---

### 🟡 Medium: ShopScene.ts (611 lines → target: <600)

#### Task 2.1: Extract Service Rendering
**Priority**: Low  
**Estimated Lines Saved**: ~50 lines  
**Files to Create**:
- `src/scenes/shop/ServiceRenderer.ts` - Service card rendering

**What to Extract**:
- `drawServiceCard()` function
- Service purchase logic
- Service state management

**Dependencies**: None

---

#### Task 2.2: Extract Offer Rendering
**Priority**: Low  
**Estimated Lines Saved**: ~30 lines  
**Files to Create**:
- `src/scenes/shop/OfferRenderer.ts` - Offer card rendering

**What to Extract**:
- `renderOfferCard()` method
- `renderOffersGrid()` method
- Offer hover logic

**Dependencies**: None

---

## RNG Issues - Seeded Random Number Generation

### 🔴 Critical: Game Logic RNG

#### Task 3.1: Fix reveal.ts RNG
**Priority**: Critical  
**File**: `src/game/reveal.ts`  
**Issues Found**: 8 instances of `Math.random()`

**Changes Needed**:
1. **Line 90**: Gambler effect - Replace with seeded RNG
   ```typescript
   // Current: const roll = Math.random();
   // Fix: Use runState seed + tile position for deterministic roll
   ```

2. **Line 124**: Investor effect - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < 0.25
   // Fix: Use seeded RNG from runState
   ```

3. **Line 213**: Number Cruncher - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < chance
   // Fix: Use seeded RNG
   ```

4. **Line 221**: Snake Venom - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < 0.25
   // Fix: Use seeded RNG
   ```

5. **Line 242**: Random masking - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < 0.20
   // Fix: Use seeded RNG (or remove if not intended)
   ```

6. **Line 247-248**: Tarot Card - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < 0.05 and Math.floor(Math.random() * 3)
   // Fix: Use seeded RNG
   ```

7. **Line 442**: Pickaxe shuffle - Replace with seeded RNG
   ```typescript
   // Current: Math.floor(Math.random() * (i + 1))
   // Fix: Use seeded RNG
   ```

8. **Line 552**: Investor (Quartz) - Replace with seeded RNG
   ```typescript
   // Current: Math.random() < 0.25
   // Fix: Use seeded RNG
   ```

**Implementation Plan**:
- Pass RNG function to `revealTile()` or access via runState
- Create helper: `getSeededRngForTile(board: Board, x: number, y: number): () => number`
- Update all Math.random() calls to use seeded RNG

---

#### Task 3.2: Fix generation.ts RNG
**Priority**: High  
**File**: `src/game/generation.ts`  
**Issues Found**: Already uses seeded RNG correctly ✅

**Note**: This file is already correct - uses `createRng(runState.seed + runState.level)`

---

#### Task 3.3: Fix ShopScene.ts RNG
**Priority**: Medium  
**File**: `src/scenes/ShopScene.ts`  
**Issues Found**: 1 instance (line 196)

**Changes Needed**:
- **Line 196**: Shop offer selection - Replace with seeded RNG
  ```typescript
  // Current: Math.floor(Math.random() * copy.length)
  // Fix: Use seeded RNG based on level + shop session
  ```

**Note**: Background animation RNG (lines 133-147) can stay as Math.random() for visual effects

---

#### Task 3.4: Fix GameScene.ts RNG
**Priority**: Medium  
**File**: `src/scenes/GameScene.ts`  
**Issues Found**: 1 instance (line 178)

**Changes Needed**:
- **Line 178**: Mathematician tile selection - Replace with seeded RNG
  ```typescript
  // Current: Math.floor(Math.random() * candidates.length)
  // Fix: Use seeded RNG
  ```

**Note**: Background animation RNG (lines 86-100) can stay as Math.random() for visual effects

---

#### Task 3.5: Fix TeammateScene.ts RNG
**Priority**: Low  
**File**: `src/scenes/TeammateScene.ts`  
**Issues Found**: 1 instance (line 61)

**Changes Needed**:
- **Line 61**: Relic shuffle - Replace with seeded RNG
  ```typescript
  // Current: Math.floor(Math.random() * (i + 1))
  // Fix: Use seeded RNG for deterministic teammate selection
  ```

**Note**: Background animation RNG can stay as Math.random()

---

#### Task 3.6: Fix state.ts Initial Seed
**Priority**: Low  
**File**: `src/state.ts`  
**Issues Found**: 1 instance (line 41)

**Changes Needed**:
- **Line 41**: Initial seed generation - Keep Math.random() but document it
  ```typescript
  // Current: seed: Math.floor(Math.random() * 2 ** 31)
  // Note: This is OK - initial seed should be random for new runs
  // But consider: Allow user to input seed for replay/debugging
  ```

**Action**: Add comment explaining this is intentional, or add seed input option

---

#### Task 3.7: Create RNG Utility Module
**Priority**: High  
**File**: `src/game/rngUtils.ts` (new)

**Purpose**: Centralize RNG access patterns

**Functions to Create**:
```typescript
// Get RNG for a specific tile position (deterministic)
export function getTileRng(board: Board, x: number, y: number): () => number

// Get RNG for current level
export function getLevelRng(): () => number

// Get RNG for shop session
export function getShopRng(): () => number

// Get RNG for teammate selection
export function getTeammateRng(): () => number
```

---

## Type Safety Improvements

### 🔴 Critical: Remove `as any` Casts

#### Task 4.1: Type Persistent Effects Properly
**Priority**: Critical  
**Files**: `src/state.ts`, `src/game/reveal.ts`, `src/game/generation.ts`, `src/scenes/GameScene.ts`, `src/scenes/ShopScene.ts`, `src/ui/activeEffects.ts`

**Current Issue**: `(runState.persistentEffects as any).atmFee`, etc.

**Solution**:
1. Update `RunState.persistentEffects` interface:
   ```typescript
   persistentEffects: {
     carLoan: boolean;
     snakeVenom: { active: boolean; revealsUntilHit: number };
     mathTest: boolean;
     snakeOil: boolean;
     stopwatchCount: number;
     scratchcardStacks: number;
     optimistUsedThisLevel: boolean;
     pokerChipUsedThisLevel: boolean;
     tarotCard: boolean;
     // Add missing properties:
     rerolledThisShop: boolean;
     noEndGold: boolean;
     atmFee: boolean;
     bloodDiamond: boolean;
   }
   ```

2. Remove all `as any` casts accessing persistentEffects

**Files to Update**:
- `src/state.ts` - Update interface
- `src/game/reveal.ts` - ~15 instances
- `src/game/generation.ts` - ~3 instances
- `src/scenes/GameScene.ts` - ~3 instances
- `src/scenes/ShopScene.ts` - ~3 instances
- `src/ui/activeEffects.ts` - ~3 instances

---

#### Task 4.2: Type Tile Extensions Properly
**Priority**: High  
**Files**: `src/game/types.ts`, `src/game/reveal.ts`, `src/scenes/GameScene.ts`

**Current Issue**: `(tile as any).flagColor`, `(tile as any).subId`, `(tile as any).mathMasked`, etc.

**Solution**:
1. Extend `Tile` interface:
   ```typescript
   export interface Tile {
     // ... existing properties
     flagColor?: 'white' | 'yellow' | 'blue';
     subId?: string; // Already exists, but used inconsistently
     compassDir?: '↑' | '↓' | '←' | '→';
     // Add new properties:
     mathMasked?: boolean;
     randomMasked?: boolean;
   }
   ```

2. Remove all `as any` casts on tiles

**Files to Update**:
- `src/game/types.ts` - Update interface
- `src/game/reveal.ts` - ~5 instances
- `src/scenes/GameScene.ts` - ~10 instances

---

#### Task 4.3: Type Phaser Extensions Properly
**Priority**: Medium  
**Files**: `src/scenes/GameScene.ts`, `src/scenes/ShopScene.ts`, `src/ui/manifest.ts`

**Current Issue**: `(pointer as any).event`, `(node as any).getData`, etc.

**Solution**:
1. Create type definitions for Phaser extensions:
   ```typescript
   // src/types/phaser-extensions.ts
   interface PhaserPointerEvent extends Phaser.Input.Pointer {
     event?: PointerEvent;
     ctrlKey?: boolean;
   }
   
   interface PhaserGameObjectWithData extends Phaser.GameObjects.GameObject {
     getData?: (key: string) => any;
     setData?: (key: string, value: any) => void;
   }
   ```

2. Use proper type guards or type assertions with proper types

**Files to Update**:
- `src/scenes/GameScene.ts` - ~10 instances
- `src/scenes/ShopScene.ts` - ~5 instances
- `src/ui/manifest.ts` - ~5 instances

---

#### Task 4.4: Type Window Extensions
**Priority**: Low  
**Files**: `src/scenes/GameScene.ts`

**Current Issue**: `(window as any).__minezLastPhaserDown`

**Solution**:
1. Create proper type definition:
   ```typescript
   // src/types/window-extensions.ts
   declare global {
     interface Window {
       __minezLastPhaserDown?: number;
       __minezLastPhaserFlagged?: boolean;
     }
   }
   ```

2. Remove `as any` casts

**Files to Update**:
- `src/scenes/GameScene.ts` - ~6 instances

---

#### Task 4.5: Type Description Objects
**Priority**: Low  
**Files**: `src/game/descriptions.ts`, multiple scene files

**Current Issue**: `(TILE_UI_TEXT as any)[id]`, `(RELIC_UI_TEXT as any)[id]`, etc.

**Solution**:
1. Create proper type definitions:
   ```typescript
   export type TileId = string; // Or union type of all tile IDs
   export type RelicId = string; // Or union type of all relic IDs
   export type ChallengeId = string; // Already exists as enum
   
   export const TILE_UI_TEXT: Record<TileId, string> = { ... };
   export const RELIC_UI_TEXT: Record<RelicId, string> = { ... };
   ```

2. Use proper indexing instead of `as any`

**Files to Update**:
- `src/game/descriptions.ts` - Update type definitions
- `src/scenes/GameScene.ts` - ~5 instances
- `src/scenes/ShopScene.ts` - ~3 instances
- `src/ui/manifest.ts` - ~5 instances
- `src/scenes/TeammateScene.ts` - ~1 instance

---

#### Task 4.6: Type Event Payloads
**Priority**: Medium  
**Files**: `src/game/events.ts`, `src/game/reveal.ts`, `src/scenes/GameScene.ts`

**Current Issue**: `events.emit(GameEvent.GoldGained, { amount: X, source: 'Y' } as any)`

**Solution**:
1. Create proper event payload types:
   ```typescript
   export interface GoldGainedPayload {
     amount: number;
     source: string;
   }
   
   export interface LifeChangedPayload {
     delta: number;
   }
   
   export interface TileRevealedPayload {
     tile: Tile;
   }
   ```

2. Update EventBus to use generics properly
3. Remove `as any` casts

**Files to Update**:
- `src/game/events.ts` - Add payload types
- `src/game/reveal.ts` - ~5 instances
- `src/scenes/GameScene.ts` - ~2 instances

---

## Implementation Order

### Phase 1: Critical Fixes (Week 1)
1. ✅ Task 4.1: Type Persistent Effects (blocks other type fixes)
2. ✅ Task 3.1: Fix reveal.ts RNG (critical for game logic)
3. ✅ Task 3.7: Create RNG Utility Module (needed for RNG fixes)

### Phase 2: High Priority (Week 2)
4. ✅ Task 1.1: Extract Input Handling from GameScene
5. ✅ Task 1.2: Extract Rendering Logic from GameScene
6. ✅ Task 4.2: Type Tile Extensions
7. ✅ Task 3.3: Fix ShopScene RNG
8. ✅ Task 3.4: Fix GameScene RNG

### Phase 3: Medium Priority (Week 3)
9. ✅ Task 1.3: Extract Hover System
10. ✅ Task 1.4: Extract Level Resolution Logic
11. ✅ Task 1.5: Extract Relic Activation Logic
12. ✅ Task 4.3: Type Phaser Extensions
13. ✅ Task 4.6: Type Event Payloads

### Phase 4: Polish (Week 4)
14. ✅ Task 1.6: Extract Board Setup
15. ✅ Task 2.1: Extract Service Rendering
16. ✅ Task 2.2: Extract Offer Rendering
17. ✅ Task 3.5: Fix TeammateScene RNG
18. ✅ Task 4.4: Type Window Extensions
19. ✅ Task 4.5: Type Description Objects
20. ✅ Task 3.6: Document Initial Seed

---

## Success Criteria

### File Size Reduction
- ✅ GameScene.ts: <600 lines (currently 1,224)
- ✅ ShopScene.ts: <600 lines (currently 611)
- ✅ All new files: <400 lines each

### RNG Fixes
- ✅ Zero `Math.random()` calls in game logic (reveal.ts, generation.ts)
- ✅ All RNG uses seeded random number generator
- ✅ Deterministic replay possible with same seed

### Type Safety
- ✅ Zero `as any` casts in game logic files
- ✅ All `persistentEffects` properties properly typed
- ✅ All tile extensions properly typed
- ✅ TypeScript strict mode passes without errors

---

## Testing Checklist

After each phase, verify:
- [ ] Game compiles without TypeScript errors
- [ ] Game runs without runtime errors
- [ ] All game mechanics work correctly
- [ ] RNG is deterministic (same seed = same results)
- [ ] No performance regressions
- [ ] Code is more maintainable (smaller files, better types)

---

## Notes

- **Breaking Changes**: Some refactoring may require updating multiple files
- **Testing**: Consider adding unit tests for extracted modules
- **Documentation**: Update code comments as you refactor
- **Git**: Consider making separate commits for each task for easier review

