export const TILE_DESCRIPTIONS: Record<string, string> = {
  Diamond: 'Gain +7–10 gold on reveal. Disabled by 🧴 Snake Oil.',
  '1Up': 'Gain +1 life on reveal. Stackable.',
  Pickaxe: 'Reveals 2 random adjacent non-mine tiles.',
  Compass: 'Shows an arrow pointing orthogonally toward ❌. Fixed at generation.',
  GoodDeal: 'Lose 1 gold, gain 1 life (no effect at ≤0 gold).',
  RemoteControl: 'Flags a true mine (or 🍀 if no mine remains).',
  AdvancePayment: 'Reveals an Ore tile (if any) and grants its gold.',
  Quartz: 'Gain +1 gold on reveal.',
  Scratchcard: '+1 gold for each future special tile revealed this level. Stackable.',
  Magnet: 'Reveals all adjacent Ore tiles.',
  Receipt: 'Immediately sets all shop prices to 0 until you buy one item.',
  '2Up': 'Gain +2 life on reveal. Stackable.',
  LuckyCat: 'Gain gold equal to your current lives.',
  TarotCard: 'Revealing a ? tile has a 5% chance to turn it into Quartz, Diamond, or Ore.',
  MetalDetector: 'Flags all surrounding mines (may flag 🍀 Clover).',
  LaundryMoney: 'Rounds your gold up to the nearest 5.',
  CheatSheet: 'Decrease the chance of seeing ? tiles by 5%. Stackable.',
  PokerChip: 'Marks two tiles with blue flags: one is ❌, one is 💣. No indication which is which. Once per board.',
  LuckyPenny: 'Revealing a ? tile has a 5% chance to turn it into Quartz.',
  NineToFive: 'Whenever you lose a life, gain 2 gold.'
};

// UI-focused copy for shop tiles (used in tooltips/cards)
export const TILE_UI_TEXT: Record<string, string> = {
  Diamond: 'Gain 7–10 gold when revealed.',
  '1Up': 'Gain +1 life when revealed.',
  Pickaxe: 'When revealed, 2 random adjacent non-mine tiles are revealed.',
  Compass: 'Shows an arrow pointing toward the X. Direction is fixed for the level.',
  Scratchcard: 'For the rest of this level, each special tile revealed grants +1 gold.',
  GoodDeal: 'Lose 1 gold and gain +1 life. Does nothing if you have 0 gold or less.',
  RemoteControl: 'When revealed, automatically flags a mine.',
  AdvancePayment: 'Reveal an Ore tile and immediately gain its gold.',
  Quartz: 'Gain +1 gold when revealed.',
  '2Up': 'Gain +2 lives when revealed.',
  LuckyCat: 'Gain gold equal to your current number of lives.',
  TarotCard: 'Revealing a ? tile has a 5% chance to turn it into a Quartz, Diamond, or Ore tile.',
  MetalDetector: 'When revealed, all adjacent mines are flagged.',
  LaundryMoney: 'When revealed, your gold is rounded up to the nearest 5.',
  CheatSheet: 'Decrease the chances of seeing ? tiles by 5%.',
  PokerChip: 'Marks two tiles with blue flags: one is the X, one is a mine. No indication which is which. Can only appear once per board.',
  LuckyPenny: 'Revealing a ? tile has a 5% chance to turn into Quartz.',
  NineToFive: 'Whenever you lose a life, gain 2 coins.'
};

export const RELIC_DESCRIPTIONS: Record<string, string> = {
  Diffuser: '−5 mines per level. Applies before placement, clamps at ≥0. Stacks additively.',
  Entrepreneur: '+1 Ore per level. Stacks additively.',
  Pioneer: 'Start each level with 1 mine flagged (may flag 🍀 Clover).',
  Resurrector: 'End level with exactly 1 life → +1 life. Stacks additively.',
  TaxCollector: 'Gain +1 gold whenever you gain gold. Stacks additively.',
  Gambler: 'Mines have a 25% chance per stack not to explode.',
  Couponer: 'All future shop costs −1 gold (floor 0).',
  Vexillologist: 'Flag all mines correctly → +5 gold at level end.',
  Mathematician: 'Reveal the highest number tile at level start.',
  Accountant: '+1% spawn chance boost for special tiles.',
  Minimalist: 'Reveal no special tiles this level → +6 gold.',
  Lapidarist: 'Revealing a mine grants +3 gold.',
  PersonalShopper: 'Shop offers +1 collectible.',
  Cheapskate: 'Start level with 10+ gold → +1 life.',
  Cartographer: 'Reveal all four corners → +5 gold.',
  NumberCruncher: 'Number tiles have X% chance to grant +1 gold.',
  Researcher: 'Flags a random challenge tile at level start.',
  DebtCollector: 'Enter level with <0 gold → +1 life.',
  Auditor: 'Each challenge tile revealed grants +1 gold.',
  Philanthropist: 'Whenever you lose gold (not from spending), 25% chance to gain +1 life.',
  Barterer: 'All shop services cost 1 less gold.',
  Surgeon: 'You can buy unlimited lives in the shop.',
  SalesAssociate: 'Shop items restock after purchases.'
};

// UI-focused copy for collectibles (used in tooltips/cards)
export const RELIC_UI_TEXT: Record<string, string> = {
  Vexillologist: 'If you correctly flag every mine on the board, gain +5 gold at the end of the level.',
  Pioneer: 'At the start of each level, 1 mine is automatically flagged.',
  TaxCollector: 'Whenever you gain gold, gain +1 additional gold.',
  Diffuser: 'Each level spawns 5 fewer mines.',
  Mathematician: 'At the start of each level, the highest-number tile is revealed.',
  Accountant: 'All shop tiles have a +1% higher chance to spawn.',
  Minimalist: 'If you reveal no shop or challenge tiles this level, gain +6 gold at the end.',
  Lapidarist: 'Whenever you reveal a mine, gain +3 gold.',
  Gambler: 'Mines have a 25% chance to not explode when revealed.',
  PersonalShopper: 'All future shops offer +1 additional relic.',
  Cheapskate: 'If you start a level with 10 or more gold, gain +1 life.',
  Cartographer: 'If all four corner tiles are revealed, gain +5 gold.',
  Couponer: 'All future shop items cost 1 less gold.',
  Resurrector: 'If you end a level with exactly 1 life, gain +1 life.',
  NumberCruncher: 'Number tiles have a chance equal to their number to grant +1 gold when revealed.',
  Entrepreneur: 'Each level spawns 1 additional Ore tile.',
  Researcher: 'At the start of each level, 1 random challenge tile is flagged.',
  DebtCollector: 'If you enter a level with less than 0 gold, gain +1 life.',
  Billionaire: 'If you would lose a life, lose 5 gold instead (only if you have more than 1 life).',
  Investor: 'Ore and Quartz tiles have a 25% chance to become Diamond tiles.',
  Optimist: 'The first mine you trigger each level becomes Quartz instead (no life lost).',
  SugarDaddy: 'When purchased, convert gold into lives once. This relic may reappear in future shops.',
  FortuneTeller: 'At the start of each level, 1 Ore tile is automatically revealed.',
  Philanthropist: 'Whenever you lose gold (not from spending), 25% chance to gain +1 life.',
  Barterer: 'All shop services cost 1 less gold.',
  Gamer: 'You have unlimited rerolls in all future shops.',
  Surgeon: 'You can buy unlimited lives in the shop.',
  SalesAssociate: 'Shop items restock.'
};

export const CHALLENGE_DESCRIPTIONS: Record<string, string> = {
  AutoGrat: 'Steals 1 gold on reveal.',
  Stopwatch: 'If you leave without revealing it: lose 1 life.',
  MathTest: 'Numbers >1 display as ? for the rest of the level.',
  BadDeal: 'Gain +1 gold, lose 1 life.',
  Clover2: 'Counts as a mine for numbers but does not explode.',
  SnakeOil: 'For the rest of the level, Quartz/Ore/Diamond grant no gold.',
  SnakeVenom: 'While active: revealing a 3+ has a 25% chance to lose 1 life.',
  BloodPact: 'If you have 3+ lives, lose 1 life.',
  CarLoan: 'Subsequent special tiles cost 1 gold to reveal.',
  MegaMine: 'Counts as a mine. If lives > 2: lose 2 lives; else lose 1.',
  BloodDiamond: 'For the rest of the level, Quartz/Ore/Diamond also cost 1 life when revealed.',
  FindersFee: 'If revealed before ❌, you do not receive end-of-level gold.',
  ATMFee: 'Whenever you lose gold this level, lose +1 additional gold.',
  Coal: 'No effect. Replaces an Ore tile at generation.',
  BoxingDay: 'Lose half your gold (rounded down).',
  Thief: 'Steals a random collectible immediately.',
  Jackhammer: 'Reveals all surrounding tiles (including mines).',
  DonationBox: 'Each time you gain gold, a random tile is revealed.',
  Appraisal: 'For the rest of the level, revealing Quartz costs 1 life.',
  Key: 'You must reveal the key before you can exit.'
};

// UI-focused copy for challenge tiles
export const CHALLENGE_UI_TEXT: Record<string, string> = {
  AutoGrat: 'Lose 1 gold when this tile is revealed.',
  Stopwatch: 'You must reveal this before exiting, or it explodes for 1 life.',
  MathTest: 'Number tiles showing 2 or higher appear as ?.',
  BadDeal: 'Gain +1 gold and lose 1 life.',
  Clover2: 'This tile counts as a mine for numbers, but does not explode when revealed.',
  SnakeOil: 'For the rest of this level, Quartz, Ore, and Diamond grant no gold.',
  SnakeVenom: 'When revealing a 3 or higher, you have a 25% chance to lose 1 life.',
  BloodPact: 'If you have 3 or more lives, lose 1 life when this is revealed.',
  CarLoan: 'For the rest of this level, special tiles cost 1 gold to reveal.',
  MegaMine: 'This tile counts as a mine. If you have more than 2 lives, lose 2 lives instead of 1.',
  BloodDiamond: 'For the rest of this level, Quartz, Ore, and Diamond also cost 1 life when revealed.',
  FindersFee: 'If revealed before the X, you do not gain the 5 gold at the end of the level.',
  ATMFee: 'For the rest of this level, whenever you lose gold, lose 1 additional gold.',
  Coal: 'This tile has no effect. It replaces an Ore tile.',
  BoxingDay: 'Lose half your gold, rounded down.',
  Thief: 'Steals a random collectible.',
  Jackhammer: 'Reveals all surrounding tiles.',
  DonationBox: 'Each time you gain money, a random tile is revealed.',
  Appraisal: 'Revealing Quartz costs you one life.',
  Key: 'You must find the key tile before you\'re able to exit.'
};
export const EXTRA_RELIC_DESCRIPTIONS: Record<string, string> = {
  Billionaire: 'If you would lose a life and have ≥5 gold and >1 life, lose 5g instead.',
  Investor: '25% chance that Ore/Quartz becomes a Diamond on reveal.',
  Optimist: 'The first mine you reveal each level yields ⚪ Quartz instead of damage.',
  SugarDaddy: 'On purchase: convert lives → gold, leaving 1 life (1:1).',
  FortuneTeller: 'At level start, auto-reveals an Ore tile if present.',
  Gamer: 'Grants unlimited rerolls in all future shops. If bought in a shop and the reroll isn’t sold yet, unlimited rerolls apply immediately for that shop.'
};

// New shop tiles (v1.3+)
export const EXTRA_TILE_DESCRIPTIONS: Record<string, string> = {
  TarotCard: 'For this level, revealing a ? number (from Math Test) has a 5% chance to grant Quartz, Ore (2–5g) or Diamond (7–10g).',
  MetalDetector: 'On reveal, flags all adjacent mines (or 🍀 if no mine).',
  LaundryMoney: 'Rounds your current gold up to the nearest 5 immediately.'
};


