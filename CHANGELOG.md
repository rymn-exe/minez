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


