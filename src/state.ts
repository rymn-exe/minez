export type OwnedShopTileId = string;
export type OwnedRelicId = string;

export interface RunState {
  seed: number;
  rngState: number;
  level: number;
  lives: number;
  gold: number;
  shopFreePurchases: number;
  ownedShopTiles: Record<OwnedShopTileId, number>;
  ownedRelics: Record<OwnedRelicId, number>;
  spawnPoolWeights: Record<OwnedShopTileId, number>;
  persistentEffects: {
    carLoan: boolean;
    snakeVenom: { active: boolean; revealsUntilHit: number };
    mathTest: boolean;
    snakeOil: boolean;
    stopwatchCount: number;
    scratchcardStacks: number;
    optimistUsedThisLevel: boolean;
    pokerChipUsedThisLevel: boolean;
  };
  stats: {
    revealedCount: number;
    minesFlagged: number;
    minesTotal: number;
    oreTotal: number;
    xRemaining: number;
    shopTilesRemaining: number;
    challengeTilesRemaining: number;
    shopCounts: Record<string, number>;
    challengeCounts: Record<string, number>;
    specialRevealedThisLevel: number;
  };
}

export const runState: RunState = {
  seed: Math.floor(Math.random() * 2 ** 31),
  rngState: 0,
  level: 1,
  lives: 3,
  gold: 0,
  shopFreePurchases: 0,
  ownedShopTiles: {},
  ownedRelics: {},
  spawnPoolWeights: {},
  persistentEffects: {
    carLoan: false,
    snakeVenom: { active: false, revealsUntilHit: 8 },
    mathTest: false,
    snakeOil: false,
    stopwatchCount: 0,
    scratchcardStacks: 0,
    optimistUsedThisLevel: false,
    pokerChipUsedThisLevel: false
  },
  stats: {
    revealedCount: 0,
    minesFlagged: 0,
    minesTotal: 0,
    oreTotal: 0,
    xRemaining: 1,
    shopTilesRemaining: 0,
    challengeTilesRemaining: 0,
    shopCounts: {},
    challengeCounts: {},
    specialRevealedThisLevel: 0
  }
};


