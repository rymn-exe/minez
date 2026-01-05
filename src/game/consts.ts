export const GRID_SIZE = 16;
export const CELL = 36; // px
export const PADDING = 16;
export const PANEL_WIDTH = 200;
export const VIEW_WIDTH = GRID_SIZE * CELL + PANEL_WIDTH + PADDING * 3;
export const VIEW_HEIGHT = GRID_SIZE * CELL + PADDING * 2;

export const ECONOMY = {
  endOfLevelGold: 5,
  relicPrice: 15,
  shopPriceCommon: 5,
  shopPriceUncommon: 7,
  shopPriceRare: 10
};

export const SHOP_SPAWN_CAP_PER_LEVEL = 2;
export const SHOP_BASE_SPAWN_CHANCE = 0.505; // per slot, before Accountant (↑ by 0.5%)

