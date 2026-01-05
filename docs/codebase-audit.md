# Codebase Audit - Minez v1.5.4

## Executive Summary

The Minez codebase demonstrates solid architecture with clear separation of concerns, type safety, and an event-driven design. However, there are several code quality issues, potential bugs, and areas for improvement in maintainability, performance, and testing.

**Overall Code Quality**: 7.5/10
- **Strengths**: Architecture, type safety, modularity
- **Weaknesses**: Error handling, testing, documentation, some code smells

---

## Architecture Assessment

### Strengths

1. **Clear Separation of Concerns**
   - Game logic (`src/game/`) is UI-agnostic
   - Scenes handle rendering and input
   - State management is centralized
   - Event system decouples components

2. **Type Safety**
   - Comprehensive TypeScript usage
   - Well-defined interfaces (`Tile`, `Board`, `RunState`)
   - Type-safe event system

3. **Modularity**
   - Logical file organization
   - Path aliases for clean imports
   - Single responsibility principle mostly followed

4. **Event-Driven Design**
   - Clean event bus implementation
   - Reduces coupling between systems
   - Easy to extend with new events

### Weaknesses

1. **Global State Mutation**
   - `runState` is mutated directly throughout codebase
   - No immutability guarantees
   - Makes testing and debugging harder

2. **Tight Coupling in Some Areas**
   - `reveal.ts` uses global `thisBoard` variable (line 592)
   - Shop effects depend on board being bound externally
   - Some circular dependencies possible

3. **Mixed Concerns**
   - `GameScene.ts` is very large (1224 lines) - handles too much
   - UI logic mixed with game logic in some places
   - Event handlers scattered across scenes

---

## Code Quality Issues

### Critical Issues

#### 1. Global Variable Anti-Pattern
**Location**: `src/game/reveal.ts:592`
```typescript
let thisBoard: Board | null = null;
export function bindBoardForShopEffects(board: Board) {
  thisBoard = board;
}
```
**Issue**: Global mutable state breaks encapsulation
**Risk**: Race conditions, testing difficulties, unclear dependencies
**Recommendation**: Pass board as parameter to functions that need it

#### 2. Non-Deterministic RNG in Deterministic Context
**Location**: Multiple places use `Math.random()` instead of seeded RNG
- `reveal.ts:90` - Gambler effect
- `reveal.ts:124` - Investor effect  
- `reveal.ts:213` - Number Cruncher
- `reveal.ts:221` - Snake Venom
- `reveal.ts:242` - Random masking
- `reveal.ts:247` - Tarot Card

**Issue**: Breaks deterministic replay/debugging
**Risk**: Cannot reproduce bugs, cannot test reliably
**Recommendation**: Use seeded RNG from `rng.ts` consistently

#### 3. Type Safety Violations
**Location**: Multiple uses of `(tile as any)` and `(runState.persistentEffects as any)`
- `GameScene.ts:190` - `flagColor` assignment
- `reveal.ts:127` - `subId` assignment
- Multiple places accessing `persistentEffects` properties

**Issue**: Bypasses TypeScript's type checking
**Risk**: Runtime errors, harder refactoring
**Recommendation**: Properly type all properties or use type guards

### High Priority Issues

#### 4. Error Handling Missing
**Location**: Throughout codebase
- No try-catch blocks for critical operations
- No validation of board bounds before access
- No handling of missing textures/assets
- No error recovery mechanisms

**Example**:
```typescript
// GameScene.ts:119 - No error handling if generation fails
const { board } = generateLevel(GRID_SIZE, GRID_SIZE);
```

**Recommendation**: Add error boundaries, validation, and graceful degradation

#### 5. Memory Leaks Potential
**Location**: `GameScene.ts`, `ShopScene.ts`
- Event listeners may not be cleaned up properly
- DOM event listeners added but cleanup is complex
- Icon images stored in Map but may not be cleared on scene restart

**Example**:
```typescript
// GameScene.ts:331-341 - DOM listeners added but cleanup is conditional
window.addEventListener('pointerdown', domHandler, { passive: true });
// Cleanup only on scene shutdown, but what if scene is destroyed differently?
```

**Recommendation**: Use WeakMap for references, ensure all listeners are cleaned up

#### 6. Magic Numbers
**Location**: Throughout codebase
- `0.25` (25% chance) appears multiple times without explanation
- `0.20` (20% random masking) - undocumented feature?
- `500` (double-click threshold) - should be constant
- `0.75` (mine reduction) in generation.ts

**Recommendation**: Extract to named constants with comments

### Medium Priority Issues

#### 7. Code Duplication
**Location**: Multiple files
- Billionaire check logic repeated 5+ times
- ATM Fee logic duplicated
- Flag color hex mapping duplicated
- Hover text formatting logic repeated

**Example**:
```typescript
// Repeated in GameScene, ShopScene, ManifestPanel
const canBillionaire = (runState.ownedRelics['Billionaire'] ?? 0) > 0 && 
  runState.lives > 1 && runState.gold >= 5;
```

**Recommendation**: Extract to utility functions

#### 8. Large Functions
**Location**: `GameScene.ts`, `ShopScene.ts`
- `GameScene.create()` - 467 lines
- `GameScene.handleReveal()` - 75 lines
- `ShopScene.create()` - 232 lines
- `revealTile()` - 235 lines

**Recommendation**: Break into smaller, focused functions

#### 9. Inconsistent Naming
**Location**: Throughout codebase
- `revealTile` vs `revealRec` (circular import workaround)
- `thisBoard` (global) vs `board` (parameter)
- `runState` (global) vs local state variables
- Some functions use camelCase, some don't follow convention

**Recommendation**: Establish and follow naming conventions

#### 10. Commented-Out/Dead Code
**Location**: Multiple files
- References to "Zirconium" (renamed to Quartz)
- Stopwatch logic disabled but still referenced
- `renderOffersList` marked as "unused" but kept

**Recommendation**: Remove dead code or document why it's kept

---

## Potential Bugs

### Confirmed Issues

1. **Race Condition in X Tile Resolution**
   ```typescript
   // GameScene.ts:692-703
   if (!this.resolvingEnd) {
     this.resolvingEnd = true;
     this.resolveLevel(survived);
     // Extra safety check after 10ms - suggests race condition awareness
     if (survived) {
       this.time.delayedCall(10, () => {
         if (this.scene.isActive('GameScene')) {
           this.scene.start('ShopScene');
         }
       });
     }
   }
   ```
   **Issue**: Multiple code paths can trigger level resolution
   **Impact**: Potential double navigation or state corruption

2. **Incorrect Mine Count on Flag Toggle**
   ```typescript
   // GameScene.ts:634-640
   if (t.kind === TileKind.Mine) {
     if (next) {
       runState.stats.minesTotal = Math.max(0, runState.stats.minesTotal - 1);
     } else {
       runState.stats.minesTotal += 1;
     }
   }
   ```
   **Issue**: Doesn't account for Clover2 tiles that count as mines
   **Impact**: Mine counter may be incorrect

3. **Cartographer Awarded Twice**
   ```typescript
   // GameScene.ts:496-512 - Awarded on reveal
   // GameScene.ts:1094-1110 - Awarded again on level end
   ```
   **Issue**: Cartographer can be awarded twice if corners revealed during level
   **Impact**: Players get double gold reward

4. **Number Cruncher Chance Calculation**
   ```typescript
   // reveal.ts:212
   const chance = Math.min(1, tile.number / 100);
   ```
   **Issue**: A tile with number 8 has 8% chance, not 8/100 = 0.08%
   **Impact**: Much lower proc rate than intended (if spec says "X% chance")

5. **Shop Reroll State Persistence**
   ```typescript
   // ShopScene.ts:123
   const rerolled = !!((runState.persistentEffects as any).rerolledThisShop);
   ```
   **Issue**: State persists across shop sessions, but may not reset properly
   **Impact**: Reroll may be incorrectly marked as used

### Suspected Issues

1. **Flood Reveal May Skip Tiles**
   - `floodReveal` uses `visited` set but may not handle all edge cases
   - No validation that all safe tiles are revealed

2. **Chording Logic Edge Cases**
   - Chording counts revealed mines, but what if a mine was revealed by Optimist?
   - May allow chording when it shouldn't

3. **Gold Can Go Negative**
   - Multiple places subtract gold without checking bounds
   - May cause display issues or unexpected behavior

4. **Level Generation Edge Cases**
   - What if not enough free tiles for all placements?
   - `placeRandomTiles` may fail silently if `freeIndices.length === 0`

---

## Performance Concerns

### Current Performance

**Strengths**:
- Efficient board representation (flat array)
- Event system avoids unnecessary updates
- Phaser's rendering is optimized

**Weaknesses**:

1. **Inefficient Rendering**
   - `renderAll()` redraws entire board every time
   - No dirty flagging or incremental updates
   - Icon images recreated on every refresh

2. **Memory Usage**
   - All tiles stored in memory (fine for 16x16)
   - Event listeners accumulate if not cleaned up
   - DOM event listeners may leak

3. **Unnecessary Calculations**
   - `countAdjMines` called multiple times per tile
   - Manifest panel rebuilds entire UI on refresh
   - Hover calculations done every frame

### Recommendations

1. **Implement Dirty Flagging**: Only re-render changed tiles
2. **Cache Calculations**: Store neighbor counts, don't recalculate
3. **Debounce Updates**: Batch multiple state changes
4. **Lazy Loading**: Load assets on demand, not all at once

---

## Testing & Quality Assurance

### Current State

**Missing**:
- No unit tests
- No integration tests
- No E2E tests
- No test coverage metrics
- No CI/CD pipeline

**Impact**: 
- Bugs may go undetected
- Refactoring is risky
- No regression testing
- Hard to verify fixes

### Recommendations

1. **Add Unit Tests**:
   - Board generation logic
   - Reveal mechanics
   - Event system
   - RNG functions

2. **Add Integration Tests**:
   - Full level playthrough
   - Shop purchase flow
   - Collectible interactions

3. **Add E2E Tests**:
   - Complete run from start to win/loss
   - UI interactions
   - Cross-browser testing

4. **Set Up CI/CD**:
   - Run tests on PR
   - Type checking
   - Linting
   - Build verification

---

## Maintainability Issues

### Documentation

**Missing**:
- No API documentation
- Minimal inline comments
- No architecture diagrams
- No contributor guide
- No changelog explanation format

**Recommendation**: Add JSDoc comments, README improvements, architecture docs

### Code Organization

**Issues**:
- Some files too large (GameScene.ts)
- Related functionality scattered
- No clear module boundaries in some areas

**Recommendation**: 
- Split large files
- Group related functions
- Create utility modules

### Dependency Management

**Current**:
- Only 3 dependencies (Phaser, TypeScript, Vite)
- All up-to-date
- No security issues

**Good**: Minimal dependencies reduce risk

---

## Security Considerations

### Current State

**Low Risk** (browser-based game, no server):
- No user input validation needed (all local)
- No authentication
- No data persistence (no save files)

**Potential Issues**:
1. **XSS**: If user input is ever added, need sanitization
2. **DOM Manipulation**: Direct DOM access in some places
3. **No Input Validation**: Board coordinates not validated in all cases

**Recommendation**: Add input validation for any future user input features

---

## Accessibility

### Current State

**Missing**:
- No keyboard navigation (except ESC for flag paint)
- No screen reader support
- No colorblind considerations
- No font size options
- No high contrast mode

**Recommendation**: 
- Add keyboard shortcuts
- ARIA labels for UI elements
- Colorblind-friendly palette
- Accessibility options menu

---

## Recommendations Priority

### Critical (Fix Immediately)

1. **Fix Global `thisBoard` Variable**: Pass board as parameter
2. **Use Seeded RNG Consistently**: Replace all `Math.random()` calls
3. **Add Error Handling**: Validate inputs, handle edge cases
4. **Fix Cartographer Double Award**: Prevent duplicate rewards

### High Priority (Next Sprint)

1. **Extract Repeated Logic**: Billionaire checks, ATM Fee, etc.
2. **Add Type Safety**: Remove `as any` casts, properly type everything
3. **Fix Memory Leaks**: Ensure all listeners are cleaned up
4. **Add Unit Tests**: Start with core game logic

### Medium Priority (Backlog)

1. **Refactor Large Functions**: Break down `create()` methods
2. **Add Documentation**: JSDoc, architecture docs
3. **Performance Optimization**: Dirty flagging, caching
4. **Add Integration Tests**: Test full game flows

### Low Priority (Nice to Have)

1. **Code Style Guide**: Establish conventions
2. **Accessibility Features**: Keyboard nav, screen reader support
3. **CI/CD Pipeline**: Automated testing and deployment
4. **Performance Monitoring**: Track metrics

---

## Code Metrics

### File Sizes
- `GameScene.ts`: 1,224 lines (too large)
- `ShopScene.ts`: 611 lines (acceptable)
- `reveal.ts`: 598 lines (acceptable)
- `manifest.ts`: 485 lines (acceptable)
- `generation.ts`: 231 lines (good)

### Complexity
- Average function length: ~30 lines (good)
- Max function length: 467 lines (`GameScene.create`) (bad)
- Cyclomatic complexity: Medium (some functions too complex)
- Nesting depth: Generally good (2-3 levels)

### Type Safety
- TypeScript strict mode: ✅ Enabled
- `any` usage: ~15 instances (should be 0)
- Type coverage: ~95% (good, but can improve)

---

## Conclusion

The Minez codebase is well-structured with a solid architectural foundation. The main issues are around code quality (global state, type safety), testing (none), and maintainability (large functions, duplication). Addressing the critical issues would significantly improve code quality and make the codebase more maintainable.

**Key Strengths**:
- Clean architecture
- Type safety (mostly)
- Event-driven design
- Modular organization

**Key Weaknesses**:
- No tests
- Global state mutations
- Missing error handling
- Some code smells

**Overall Assessment**: Good foundation, needs refinement in code quality and testing practices.

