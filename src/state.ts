export type OwnedShopTileId = string;
export type OwnedRelicId = string;

export interface RunState {
  seed: number;
  rngState: number;
  level: number;
  lives: number;
  gold: number;
  flagColor: 'white' | 'yellow' | 'blue';
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
    tarotCard: boolean;
    rerolledThisShop: boolean;
    noEndGold: boolean;
    atmFee: boolean;
    bloodDiamond: boolean;
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
  // Initial seed generation: random for new runs, but can be set for replay/debugging
  // Note: This Math.random() is intentional - initial seed should be random for new runs
  // For deterministic replay, set runState.seed manually before starting
  seed: Math.floor(Math.random() * 2 ** 31),
  rngState: 0,
  level: 1,
  lives: 3,
  gold: 0,
  flagColor: 'white',
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
    pokerChipUsedThisLevel: false,
    tarotCard: false,
    rerolledThisShop: false,
    noEndGold: false,
    atmFee: false,
    bloodDiamond: false
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


