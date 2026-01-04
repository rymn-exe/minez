# Art Style Prompt for Minez

## Game Overview & Theme

**Minez** is a roguelike Minesweeper game that combines:
- **Core Mechanic**: Tile-based grid puzzle (16×16 grid) where players reveal hidden tiles
- **Theme**: Financial greed, risk management, underground mining, high-stakes decision making
- **Mood**: Tension, uncertainty, calculated risk-taking, the thrill of discovery vs. the fear of loss
- **Setting**: Mysterious underground mining operation where players dig for treasure while avoiding danger

## Core Gameplay Elements That Need Visual Representation

### Tile Types (Must Be Visually Distinct)
1. **Hidden/Unrevealed Tiles**: All look identical - no hints about what's underneath
2. **Number Tiles** (1-8): Show how many mines are adjacent - must be clearly readable
3. **Mine Tiles**: Dangerous, explosive - should feel threatening when revealed
4. **X Tile**: The exit/objective - should feel important and rewarding to find
5. **Ore Tiles**: Valuable resources that grant gold - should feel rewarding/valuable
6. **Shop Tiles**: Purchased items that spawn on future levels - should feel like opportunities/upgrades
7. **Challenge Tiles**: Hostile modifiers that make the game harder - should feel dangerous/warning-like

### Game States & Feedback
- **Hover states**: Players need to know which tile they're about to click
- **Revealed vs. Hidden**: Clear distinction between what's been explored and what's unknown
- **Flagging system**: Players can mark suspected mines with flags (3 color options)
- **Life counter**: Visual representation of remaining lives (starts at 3)
- **Gold/Currency**: Visual representation of wealth that can be spent in shops
- **Shop interface**: Grid of purchasable items with prices and descriptions

### Information Hierarchy
- **Board Manifest**: Always-visible stats showing mines remaining, ore remaining, X tiles, shop tiles, challenge tiles
- **Tooltips**: Hover descriptions explaining what each tile/item does
- **Active Effects Panel**: Shows ongoing challenge effects (like "Math Test hides numbers" or "Snake Oil blocks gold")
- **Shop Screen**: Separate screen between levels for purchasing upgrades

## Thematic Elements to Explore

### Core Themes
- **Greed vs. Survival**: The tension between collecting gold and preserving lives
- **Misinformation**: Numbers lie - the game is intentionally unsolvable through pure logic
- **Risk/Reward**: Every click could be treasure or death
- **Financial Manipulation**: Shop tiles, collectibles, economic systems
- **Underground Mining**: Digging deep, discovering what's hidden below
- **Roguelike Progression**: Building power across multiple levels, permadeath stakes

### Mood & Atmosphere
- **Tension**: Every decision matters, lives are limited
- **Mystery**: What's hidden beneath each tile?
- **Greed**: The allure of gold, the temptation to take risks
- **Uncertainty**: Can't trust the numbers, must rely on intuition
- **Progression**: Building a collection of powerful items and abilities
- **High Stakes**: One wrong move can end the run

## Functional Requirements

### Readability & Clarity
- Numbers on tiles must be readable at small sizes (tiles are ~36px)
- Text in UI panels must be clear and legible
- Visual distinction between tile types is critical for gameplay
- Color coding should support gameplay (but don't rely solely on color - consider accessibility)

### Grid-Based Layout
- 16×16 grid of square tiles
- Side panel for stats and information
- Shop screen with grid/card layout for items
- Responsive to different screen sizes

### Interactive Elements
- Clickable tiles with hover feedback
- Purchasable shop items with prices
- Buttons for actions (proceed, reroll, buy life)
- Tooltips that appear on hover

### Visual Feedback
- Tile reveal animations
- Gold gain/loss indicators
- Life loss animations
- Purchase confirmations
- Level completion transitions

## Art Style Exploration Prompt

```
Design a complete visual art style for "Minez" - a roguelike Minesweeper game with a financial greed theme set in an underground mining world.

Game Context:
- Players reveal tiles on a 16×16 grid, searching for treasure (gold/ore) while avoiding mines
- The game is intentionally unsolvable - numbers only count mines, creating misinformation
- Players manage lives (3 starting) and gold currency
- Between levels, players visit shops to purchase upgrades and collectibles
- Theme: Greed, risk-taking, financial manipulation, underground mining, high-stakes decisions
- Mood: Tense, mysterious, uncertain, thrilling, high-stakes

Visual Requirements:
1. Tile-based grid system: 16×16 squares that can be hidden or revealed
2. Clear visual distinction between: hidden tiles, number tiles (1-8), mines, exit tiles, ore/treasure, shop items, challenge tiles
3. Readable numbers and text at small sizes
4. Visual feedback for interactions (hover, click, reveal)
5. UI panels for stats, shop, tooltips, active effects
6. Currency/life indicators
7. Shop interface with purchasable items

Thematic Direction:
- Underground mining setting (but open to creative interpretation)
- Financial/greed theme (casino? trading floor? treasure hunting? corporate greed?)
- Risk vs. reward tension
- Mystery and hidden information
- Roguelike progression and power-building

Creative Freedom:
- Explore any art style that fits: pixel art, hand-drawn, 3D rendered, minimalist, detailed, stylized, realistic, abstract
- Experiment with color palettes that convey the themes (greed, danger, mystery, wealth)
- Consider unique visual metaphors for the mining/financial theme
- Think about how to make tile reveals feel satisfying and impactful
- Design a cohesive visual language that works across tiles, UI, shop, and effects

Avoid:
- Don't copy existing Minesweeper visual styles
- Don't use generic fantasy or sci-fi aesthetics unless they serve the theme
- Ensure the style supports gameplay clarity (readable, distinct elements)

Generate multiple art style concepts exploring different directions:
- Dark and moody vs. bright and colorful
- Realistic vs. stylized vs. abstract
- Detailed vs. minimalist
- Different cultural/artistic influences
- Various color psychology approaches
```

## Specific Visual Elements to Design

### Concept 1: Tile Designs
```
Design visual concepts for game tiles:
- How should hidden tiles look? (mysterious? textured? simple?)
- How should revealed tiles look? (dug up? opened? illuminated?)
- How to distinguish mine tiles from safe tiles visually?
- How to make number tiles readable and clear?
- How to make special tiles (ore, shop, challenge) feel distinct?
- What visual metaphor works for "revealing" or "digging"?
```

### Concept 2: UI & Interface
```
Design UI concepts:
- How should the game board be framed/presented?
- How to display lives and gold in an engaging way?
- How should the shop screen look and feel?
- How to present tooltips and information panels?
- What visual style for buttons and interactive elements?
- How to show active effects and status conditions?
```

### Concept 3: Icons & Symbols
```
Design iconography:
- What visual symbols represent mines? (explosions? skulls? warning signs?)
- How to represent gold/currency? (coins? gems? dollar signs?)
- What icons for shop items? (pickaxe, compass, diamond, etc.)
- How to represent challenge tiles? (warning symbols? danger indicators?)
- What visual language for collectibles/relics?
```

### Concept 4: Atmosphere & Background
```
Design environmental elements:
- What should the background/ambiance be? (underground cave? dark void? mining facility?)
- Should there be environmental storytelling?
- How to create depth and atmosphere without distracting from gameplay?
- What visual effects support the mood? (particles? lighting? textures?)
```

## Exploration Questions for AI

1. **Art Style**: What visual style best captures the tension and greed theme? (pixel art? hand-drawn? 3D? minimalist? detailed illustrations?)

2. **Color Psychology**: What color palette conveys greed, risk, mystery, and underground mining? (warm golds? cool blues? dark earth tones? neon accents?)

3. **Visual Metaphor**: What visual metaphor works for tile revealing? (digging? opening boxes? peeling back layers? illuminating darkness?)

4. **Aesthetic Direction**: What cultural or artistic influences fit? (noir? steampunk? cyberpunk? corporate? vintage? modern?)

5. **Mood & Tone**: How to balance the serious financial theme with playful game elements? (dark humor? satirical? serious? whimsical?)

6. **Distinctiveness**: How to make Minez visually unique from other Minesweeper games or roguelikes?

---

**Use this prompt with AI art generators to explore creative art style directions for Minez. The goal is to generate multiple distinct visual concepts that capture the game's themes and support its gameplay mechanics.**
