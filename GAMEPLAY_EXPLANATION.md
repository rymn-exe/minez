# Minez - Gameplay Explanation

## Core Concept

**Minez** is a roguelike Minesweeper variant that combines classic tile-revealing mechanics with risk management, resource economy, and intentionally unsolvable puzzles. The game emphasizes tension, greed, and strategic decision-making over perfect logic.

## Game Flow

### The Run Loop
1. **Start**: Player begins with 3 lives and 0 gold
2. **Level**: Reveal tiles on a 16×16 grid to find the ❌ X tile
3. **Shop**: After completing a level, visit the shop to purchase upgrades
4. **Repeat**: Continue through 10 levels until victory or death
5. **Win/Loss**: Win by completing Level 10, lose if lives reach 0

## Core Mechanics

### Tile Types

**Standard Tiles:**
- **Hidden Tiles**: Unrevealed tiles (all look identical)
- **Safe Tiles** (0): No adjacent mines, flood-fills when revealed
- **Number Tiles** (1-8): Show count of adjacent **mines only** (critical rule!)
- **Mine Tiles** (💣): Explode on reveal, cost -1 life
- **X Tile** (❌): Ends the level immediately when revealed

**Special Tiles:**
- **Ore Tiles** (🪙): Grant 1-3 gold when revealed
- **Shop Tiles** (🟣 Purple): Purchased items that spawn on future levels
- **Challenge Tiles** (🟠 Orange): Hostile modifiers that make the game harder

### Key Rule: Misinformation
**Number tiles only count mines** - they ignore Shop tiles, Challenge tiles, and Ore tiles. This creates intentional misinformation, making the game unsolvable through pure logic. Players must take calculated risks.

## Shop System

Between levels, players visit a shop offering:

**Shop Tiles** (3 random):
- **Common** (5g): Pickaxe, Good Deal, Remote Control, Advance Payment, Quartz
- **Uncommon** (7g): 1 Up, Compass, Lucky Cat, Tarot Card, Metal Detector
- **Very Rare** (10g): Diamond, Scratchcard, 2 Up

**Collectibles** (2+ random, 15g):
- Passive effects that stack: Tax Collector, Gambler, Cartographer, etc.
- Examples: Tax Collector (+1 gold whenever you gain gold), Gambler (25% chance mines don't explode), Cartographer (+5g for revealing all corners)

**Services**:
- **Reroll** (2g): Regenerate shop offers
- **Buy Life** (3g): Purchase an extra life

## Challenge Tiles (Hostile Modifiers)

Orange tiles that make the game harder:
- **Math Test**: Numbers >1 display as "?" for the rest of the level
- **Snake Oil**: Ore/Diamond tiles grant no gold
- **Bad Deal**: Gain +1 gold, lose 1 life
- **Snake Venom**: 25% chance to lose 1 life when revealing numbers ≥3
- **Car Loan**: Special tiles cost 1 gold to reveal
- **Blood Diamond**: Ore/Diamond tiles also cost 1 life
- **MegaMine**: Counts as mine, costs 2 lives if you have >2 lives
- **2-Leaf Clover**: Counts as mine for numbers but doesn't explode
- And more...

## Economy & Resources

**Gold Sources:**
- Ore tiles (1-3g)
- Shop tiles (Diamond: 7-10g, Quartz: 1g, etc.)
- End-of-level bonus: +5 gold
- Collectible effects (Tax Collector, Cartographer, etc.)

**Gold Sinks:**
- Shop purchases (5-15g)
- Challenge penalties (Auto Grat steals gold, Car Loan costs gold per special tile)

**Lives:**
- Start with 3 lives
- Lose lives from mines, challenges (Bad Deal, Blood Diamond, etc.)
- Gain lives from shop tiles (1 Up, 2 Up) or services (Buy Life)
- Game over at 0 lives

## Strategic Depth

**Risk Management:**
- When to take risks vs. play safe
- Whether to spend gold now or save for better items
- How to handle challenge tiles (avoid or power through)

**Synergies:**
- Collectibles stack and combine (e.g., Tax Collector + Cartographer = more gold)
- Shop tiles can help counter challenges (Compass helps find X, Pickaxe reveals safe tiles)

**Information Warfare:**
- Math Test hides numbers, making logic impossible
- Clover tiles create false mine signals
- Players must rely on intuition and risk assessment

## Visual Design

- **Dark theme**: Deep purple/blue background (#121218, #14141c)
- **Color coding**: Purple for shop tiles, orange for challenges
- **Board manifest**: Always visible stats (mines remaining, ore, X, shop tiles, challenges)
- **Hover tooltips**: Detailed descriptions for all tiles and collectibles
- **Animated background**: Subtle floating colored dots

## Win Condition

Complete all 10 levels by finding the X tile in each level without running out of lives.

## Loss Condition

Lives reach 0 (from mines, challenges, or other life-draining effects).

---

*Minez creates tension through intentional misinformation, forcing players to balance greed (collecting gold) with survival (preserving lives) in an unsolvable puzzle environment.*

