# Gameplay Audit - Minez v1.5.4

## Executive Summary

Minez is a roguelike Minesweeper variant that successfully creates tension through misinformation and risk management. The core concept is solid, but there are several gameplay balance issues, edge cases, and UX concerns that impact the player experience.

---

## Core Gameplay Analysis

### Strengths

1. **Innovative Concept**: The idea of making Minesweeper intentionally unsolvable and adding roguelike elements is compelling
2. **Risk/Reward Tension**: The gold/life economy creates meaningful decisions
3. **Progression Feel**: Shop between levels provides satisfying progression
4. **Visual Clarity**: Board manifest and UI panels clearly communicate game state
5. **Event-Driven Design**: Clean separation allows for easy expansion

### Weaknesses

1. **Difficulty Curve**: Levels 1-3 may be too easy; later levels may spike too hard
2. **Gold Economy**: End-of-level gold (5g) may be insufficient for meaningful shop purchases
3. **Information Overload**: Too many collectibles/challenges can overwhelm new players
4. **RNG Dependency**: Some runs may be unwinnable due to bad luck with shop offers

---

## Balance Issues

### Economy Balance

**Issue**: End-of-level gold is fixed at 5g, but shop prices range from 5-15g
- **Impact**: Players may struggle to afford meaningful upgrades early game
- **Recommendation**: Consider scaling end-of-level gold by level number (e.g., 5 + level)

**Issue**: Shop tile spawn rates (50.5% base) may be too low
- **Impact**: Players who invest in shop tiles may not see returns
- **Recommendation**: Increase base spawn chance or reduce shop tile prices

**Issue**: Relic prices (15g) are very expensive relative to income
- **Impact**: Players may only afford 1-2 relics per run
- **Recommendation**: Reduce relic prices to 10-12g or increase gold income

### Challenge Balance

**Issue**: Math Test makes the game significantly harder with little warning
- **Impact**: Can cause unexpected losses, especially on levels with multiple Math Tests
- **Recommendation**: Add visual indicator when Math Test is active, or reduce frequency

**Issue**: Snake Venom (25% chance on 3+ numbers) may be too punishing
- **Impact**: Can drain lives quickly without clear counterplay
- **Recommendation**: Reduce chance to 15-20% or add clearer visual feedback

**Issue**: Blood Diamond + Snake Oil combination can be extremely punishing
- **Impact**: Players lose both gold and life from special tiles with no benefit
- **Recommendation**: Consider making these effects mutually exclusive or adding a warning

### Collectible Balance

**Issue**: Some collectibles are significantly stronger than others
- **Examples**: 
  - Tax Collector (passive gold multiplier) vs. Minimalist (conditional +6g)
  - Billionaire (life protection) vs. Gambler (25% chance)
- **Recommendation**: Rebalance weaker collectibles or add more decision-making context

**Issue**: Stacking mechanics unclear
- **Impact**: Players may not understand that some effects stack multiplicatively
- **Recommendation**: Add UI indicators showing stack counts and effects

---

## Edge Cases & Bugs

### Critical Issues

1. **X Tile Two-Step Confusion**
   - **Issue**: First click reveals X, second click proceeds - not intuitive
   - **Impact**: Players may click X multiple times expecting immediate progression
   - **Status**: Implemented per spec, but UX could be improved

2. **Gold Can Go Negative**
   - **Issue**: Car Loan, Auto Grat, ATM Fee can push gold below 0
   - **Impact**: May cause confusion or unexpected behavior
   - **Status**: Intentional per code comments, but needs better feedback

3. **Billionaire Edge Case**
   - **Issue**: Billionaire only works if lives > 1 AND gold >= 5
   - **Impact**: If player has exactly 1 life, Billionaire doesn't activate
   - **Status**: May be intentional, but unclear to players

### Moderate Issues

1. **Chording Logic**
   - **Issue**: Chording counts revealed mines, which may not match player expectations
   - **Impact**: Players may chord incorrectly and hit mines
   - **Status**: Works as implemented, but could use tutorial/explanation

2. **Flag Color Persistence**
   - **Issue**: Flag colors are stored per-tile, but changing flag color doesn't update existing flags
   - **Impact**: Visual inconsistency
   - **Status**: Minor UX issue

3. **Shop Reroll State**
   - **Issue**: Reroll state persists across shop sessions if Gamer isn't owned
   - **Impact**: May confuse players who expect fresh shops
   - **Status**: Works as designed, but could be clearer

4. **Optimist + Lapidarist Interaction**
   - **Issue**: When Optimist converts first mine to Quartz, Lapidarist still grants +3g
   - **Impact**: May be intentional synergy, but unclear
   - **Status**: Needs clarification

### Minor Issues

1. **Frontier Masking**: Revealed 0-tiles show "?" if bordering unrevealed tiles - may confuse players
2. **Compass Direction**: Fixed at generation, but players may expect dynamic updates
3. **Stopwatch Disabled**: Removed from game but still referenced in some code/comments

---

## Player Experience Issues

### Onboarding

**Issue**: No tutorial or explanation of core mechanics
- **Impact**: New players may not understand:
  - How chording works
  - What shop tiles do
  - How collectibles stack
  - Why numbers don't always match reality
- **Recommendation**: Add interactive tutorial or comprehensive help screen

### Feedback

**Issue**: Some effects happen silently or with minimal feedback
- **Examples**:
  - Tax Collector gold gains
  - Number Cruncher procs
  - Random number masking (20% chance)
- **Recommendation**: Add visual/audio feedback for all effects

**Issue**: Loss screen doesn't explain why player died
- **Impact**: Players may not learn from mistakes
- **Recommendation**: Show death cause (mine, challenge, etc.)

### Information Architecture

**Issue**: Too much information in side panel
- **Impact**: Can be overwhelming, especially with many owned collectibles
- **Recommendation**: Consider collapsible sections or tabs

**Issue**: Hover descriptions are helpful but may be missed
- **Impact**: Players may not discover tooltips
- **Recommendation**: Add visual indicator (e.g., "?" icon) or make hover more discoverable

---

## Progression & Pacing

### Level Progression

**Strengths**:
- Clear 10-level structure
- Increasing difficulty (more mines, more challenges)
- Win condition at Level 10 feels achievable

**Issues**:
- Levels 1-3 may be too easy (only 37 mines, few challenges)
- Level 10 has 10 MegaMines which may be overwhelming
- No difficulty scaling based on player performance

### Shop Progression

**Strengths**:
- Shop between levels provides natural break
- Random offers create variety
- Services (Reroll, Buy Life) provide flexibility

**Issues**:
- Limited gold may prevent meaningful progression
- Shop offers may not synergize well
- No way to save gold for future shops (except by not buying)

---

## Design Philosophy Assessment

### Core Tenets (from spec)

✅ **"Number tiles only count mines"** - Well implemented
✅ **"Intentionally not always solvable"** - Achieved through challenge tiles
✅ **"Manage risk, gold, and lives"** - Core loop works well
✅ **"Misinformation and tension"** - Math Test, Clover, etc. create this
✅ **"All effects visible and non-silent"** - Mostly achieved, some gaps

### Potential Improvements

1. **More Strategic Depth**: Add more ways to interact with the board (e.g., scan abilities, mine detection)
2. **Better Risk/Reward**: Make high-risk plays more rewarding
3. **Synergy System**: Encourage collectible combinations
4. **Meta Progression**: Consider run-to-run progression (unlocks, achievements)

---

## Recommendations Priority

### High Priority

1. **Fix Economy Balance**: Increase gold income or reduce prices
2. **Add Tutorial**: Explain core mechanics, especially chording
3. **Improve Feedback**: Visual/audio cues for all effects
4. **Balance Challenge Tiles**: Reduce Math Test frequency or add warning

### Medium Priority

1. **Rebalance Collectibles**: Make weaker ones more competitive
2. **Improve Loss Screen**: Show death cause and tips
3. **Add Difficulty Scaling**: Adjust based on player performance
4. **Clarify Stacking**: UI indicators for stack effects

### Low Priority

1. **Polish Animations**: More satisfying reveal animations
2. **Add Achievements**: Track player accomplishments
3. **Sound Design**: Audio feedback for actions
4. **Accessibility**: Colorblind support, font size options

---

## Conclusion

Minez has a solid foundation with an innovative concept and mostly well-executed mechanics. The main issues are around balance (economy, difficulty curve) and player communication (tutorial, feedback). Addressing these would significantly improve the player experience while maintaining the game's unique identity.

**Overall Assessment**: 7/10 - Good game with clear potential for improvement

