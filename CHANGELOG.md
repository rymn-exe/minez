## v2.1.2 (locked)

- Core
  - New progression: every 3 levels you get a free collectible pick (Level 1, 4, 7, 10, 13, and Final Level).
  - Shop rebalance: the shop no longer sells collectibles (tiles + services only).
  - Challenge draft unchanged: still occurs after every shop.
- Cleanup
  - Removed 🛒 Personal Shopper (shop-collectible modifier) since shop collectibles are gone.
  - Collectible screen subheader removed (header only).

## v2.1.1 (locked)

- Fixes
  - Mine explosions now persist across board re-renders (e.g., triggering 🔎 Metal Detector no longer “un-explodes” mines).
  - Optimist / Tarot / Lucky Penny / Investor transforms now persist by updating the underlying tile model (not just the text label).
  - Thief now clearly procs at level start: stolen collectible is removed properly and a toast + manifest flash is shown.
  - Hover on ? tiles no longer leaks the true number (“Adjacent mines count is unknown”).
  - Cartographer no longer multi-awards during flood reveals.
  - Removed 📄 Cheat Sheet entirely.

## v2.1.0 (locked)

- Core
  - Ore generation updated: 1 guaranteed 🪙 Ore per board (+Entrepreneur bonus).
  - Shop spawning updated: for each owned shop tile, 80% chance to spawn at least one copy (still capped on small boards).
  - Exit + Stopwatch UX: unrevealed ⏱️ Stopwatches now reveal when you click ❌, flash twice, then show 💥 before applying the life penalty.
- Fixes
  - Board Manifest: ⏱️ Stopwatch now shows its icon.
  - Poker Chip (and other auto-flag effects): flags now render immediately and mine counter updates correctly.

## v2.0.0 (locked)

- Core
  - New run flow: Start → Collectible → Level → Shop → Challenge Draft → Level… → Win.
  - Challenge drafting: pick 1 of 2 challenge tiles after each shop; drafted challenges spawn on future boards.
  - Fixed per-level challenge tables removed; challenges are now player-built via drafting.
  - Added new challenge tiles: 🦝 Thief, 🛠️ Jackhammer, 🎁 Donation Box, 📏 Appraisal, 🔑 Key.

## v1.2.0 (locked)

- Core
  - Minesweeper chording (double-click a number to open adjacent unflagged tiles when flags match the number).
  - Mines counter now updates on reveals and on correct/auto flags (including Pioneer, Remote Control).
  - Stopwatch shows as a counted challenge; counter decrements on reveal and clears at 0.
  - Special tile spawn: owned shop tiles spawn probabilistically (2 slots, 50% base chance each; +1%/Accountant stack, capped).
  - 16×16 board; updated level table for levels 1–10.

- Shop
  - New Services: “❤️ Buy Life — 3g”.
  - Receipt: immediately makes the next purchase free (all prices show 0 until one item is bought).
  - Compass renders as arrow toward ❌; shop tiles use per-item icons (no purple fill).
  - Tooltips for shop items; ownership suffix shows “(owned xN)”.

- Tiles & Challenges
  - Snake Venom reworked: revealing 🪙/⚪/💎 costs 1 life (min 1); compatible with Billionaire.
  - Stopwatch, Auto Grat, Bad Deal, Car Loan, Snake Oil, Blood Pact, 2-Leaf Clover, MegaMine all implemented per spec.

- Relics
  - Diffuser (−5 mines/level), Pioneer (can flag clover), Mathematician, Minimalist, Lapidarist, Number Cruncher, Cartographer,
    Cheapskate, Debt Collector, Resurrector, Gambler, Entrepreneur, Personal Shopper, Tax Collector.
  - Fortune Teller (reveal an Ore at start), Researcher (flag a random challenge).
  - Billionaire (pay 5g instead of losing a life when affordable), Investor (25% upgrade Ore/⚪ to 💎), Optimist (first mine becomes ⚪),
    Sugar Daddy (convert gold→life on purchase).

- UI/UX
  - Manifest: detailed counts for shop/challenge tile types; shows owned shop tiles with 0 when absent.
  - Relics section with hover descriptions; Active Effects panel with concise text.
  - Hover descriptions anchored at bottom of side panel and in shop.
  - Title updated to “Minez v1.2”.

## v1.3.0 (locked)

- Core
  - ❌ is now two-step: first click reveals; second click proceeds. Clicking already revealed ❌ no longer re-awards gold.
  - Stopwatch removed temporarily (spawn, UI, resolution logic).
  - Car Loan is active from level start if present and listed in Challenges immediately.
  - Reduced special-tile “indent” tells: specials bias to spawn adjacent to ≥2 mines.
  - End-of-level resolution hardened; Level 2 proceed issues fixed and guarded.
  - Win screen shown after clearing Level 10.

- Economy/Items
  - Investor upgrades show 💎 icon on Ore/Zirconium when proc occurs.
  - End-of-level gold still emits GoldGained for Tax Collector stacks.

- Shop
  - Clicking either the row background or the label purchases (fixes “two clicks” issue).
  - Hover text shows for all relics, including v2 (via EXTRA_RELIC_DESCRIPTIONS).

- UI
  - Title updated to “Minez v1.3”.

## v1.4.0 (locked)

- Core and UI
  - Frontier masking: revealed 0-tiles that border unopened tiles permanently show “?” (no blank edges).
  - Chording counts revealed mines as “satisfied” around a number.
  - Restart button only on win/loss screens; teammate pick works after restart.
  - Proceed flow hardened (Level 2): clicking revealed ❌ immediately resolves and navigates.

- Challenges
  - New/updated: 🔻 Blood Diamond, 🫴 Finder’s Fee, 🏧 ATM Fee, 🪨 Coal, 🥊 Boxing Day.
  - 🐍 Snake Venom reworked: 25% chance to lose 1 life on revealing a 3+ number.
  - 🧴 Snake Oil blocks ⚪/🪙/💎 gold. Finder’s Fee removes end-of-level gold. ATM Fee adds −1 to every gold loss.
  - Coal replaces Ore at generation (no effect on reveal).

- Shop
  - New tiles: 🪬 Tarot Card, 🔎 Metal Detector, 🧼 Laundry Money.
  - Cannot overspend: affordability check includes ATM Fee surcharge.
  - Owned tile spawn cap removed. For each owned copy, spawn rolls independently with chance p = min(0.95, 0.505 + 0.01×Accountant). ❤️ 1 Up still guaranteed at least once.
  - Base spawn chance per roll increased to 0.505 (+0.5pp).

- Levels
  - Levels 1–10 updated to the new composition (Auto Grat/Math Test/Bad Deal/Clover/ATM Fee/Finder’s Fee/Snake Oil/Snake Venom/Car Loan/Blood Pact/Blood Diamond/MegaMine).

## v1.5.1 (locked)

- Shop
  - Single purchase per shop session; purchased card shows “SOLD” and becomes non-interactive.
  - Reroll is also marked “SOLD” after any purchase; services cannot be repurchased in the same shop.
  - Service price labels display numeric value only; coin icon used for currency.
- UI/UX
  - Hover text alignment consistent across scenes; small polish to shop cards.

## v1.5.2

- Core
  - Classic Minesweeper chording restored and hardened. Double‑click a revealed number to open all adjacent unflagged tiles when flags + already‑revealed mines match the number.
  - Ctrl/Cmd/right‑click flagging works reliably and always targets the hovered tile; paint mode cursor fixed and follows the mouse.
  - Unrevealed tile hover highlight restored; revealed tiles immediately render semi‑transparent after reveal.
- Shop
  - Buying an item no longer auto‑marks Reroll as SOLD. Only the purchased card changes to SOLD.
  - Hover text spacing corrected (emoji spacing, no odd justification).
- UI
  - Right‑panel “Board Manifest”/Collectibles rows get reliable hover (DOM fallback).
  - Loss screen converted to a proper modal overlay with a clear Restart button.
  - Version updated to v1.5.2.

## v1.5.3 (locked)

- Core
  - Auditor collectible now grants +1 gold per stack when any challenge tile is revealed (e.g., Auto Grat).
  - Researcher flags a random challenge tile with a yellow flag at level start.
  - Removed debug tile flash so user-opened tiles are the same semi‑transparent color as auto‑opened tiles.
- Shop
  - Per‑shop state resets properly; multiple items can be purchased per shop; only the bought card shows SOLD.
  - Affordability feedback: unaffordable prices briefly shake/red; successful buys update gold immediately.
  - Service hovers simplified (“Reroll the shop”, “Buy a life”).
- UI/UX
  - Board Manifest shows all owned shop tiles even if they didn’t spawn (count 0).
  - Right panel headings spacing increased; fonts normalized to LTHoop; added one-time font-settle refresh to avoid “changes on first click.”
  - Suppressed transient Math Test hover text in right panel after reveal.
  - Flag color picker centered vertically; headings use consistent styling.
  - Version updated to v1.5.3.

## v1.5.4

- Shop
  - Even vertical spacing engine for Tiles / Collectibles / Services; Services clamped safely above the hover area on all viewports.
  - Services row redesigned without borders; icons/prices centered, clearer price sizing, and spacing polish.
  - One reroll per shop unless the “Gamer” collectible is owned; after reroll, the Reroll service shows SOLD for that shop.
  - Emoji-only icons for all offers (no sprites).
- UI/UX
  - Transparent hover text bars in Shop and Game scenes so text appears to float.
  - Larger item icons, stronger price typography, subtle icon hover scale.
  - Consistent headers (size 16) with subtle dividers and better spacing.
  - Proceed button nudged for better alignment.
  - Emoji-only rendering across the board (Ore, Diamond, Quartz, Clover, etc.).
- Fixes
  - Removed stray text artifacts on Math Test and a few challenges; hover text now only appears in the hover area.
  - Minor type safety cleanups and layout stability fixes.
  - Version updated to v1.5.4.


