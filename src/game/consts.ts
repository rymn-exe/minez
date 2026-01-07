// The *viewport* is intentionally kept at the old 16x16 layout so the board always
// occupies most of the screen. The board itself can be smaller/larger, and we
// scale the per-tile pixel size accordingly.
export const BASE_VIEW_GRID_SIZE = 16;

// Max board size in v2 scaling. Actual board size per level is:
// n = min(MAX_GRID_SIZE, 4 + level)
export const MAX_GRID_SIZE = 20;
export const CELL = 36; // px
export const PADDING = 16;
export const PANEL_WIDTH = 200;
// View size is sized for the baseline 16x16 board (like earlier versions).
export const VIEW_WIDTH = BASE_VIEW_GRID_SIZE * CELL + PANEL_WIDTH + PADDING * 3;
export const VIEW_HEIGHT = BASE_VIEW_GRID_SIZE * CELL + PADDING * 2;

// Target board pixel width/height inside the GameScene (matches prior 16x16 feel).
// GameScene scales its tile size so (n * boardCell) ~= BASE_BOARD_PX.
export const BASE_BOARD_PX = 16 * 32;

export const ECONOMY = {
  endOfLevelGold: 5,
  relicPrice: 15,
  shopPriceCommon: 5,
  shopPriceUncommon: 7,
  shopPriceRare: 10
};

// v2 run length: board size caps at 20x20, which occurs at level 16 (4 + 16 = 20).
export const FINAL_LEVEL = 16;

export const SHOP_SPAWN_CAP_PER_LEVEL = 2;
export const SHOP_BASE_SPAWN_CHANCE = 0.505; // per slot, before Accountant (↑ by 0.5%)

// Free collectible cadence:
// Level 1, then every 3 levels thereafter (4, 7, 10, 13, ...), plus always before the final level.
export function isFreeCollectibleLevel(level: number): boolean {
  if (level <= 0) return false;
  return level === 1 || (level - 1) % 3 === 0 || level === FINAL_LEVEL;
}

