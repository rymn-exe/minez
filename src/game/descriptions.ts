export const TILE_DESCRIPTIONS: Record<string, string> = {
  Diamond: 'Gain +7–10 gold on reveal. Disabled by 🧴 Snake Oil.',
  '1Up': 'Gain +1 life on reveal. Stackable.',
  Pickaxe: 'Reveals 2 random adjacent non-mine tiles.',
  Compass: 'Shows an arrow pointing orthogonally toward ❌. Fixed at generation.',
  GoodDeal: 'Lose 1 gold, gain 1 life (no effect at ≤0 gold).',
  RemoteControl: 'Flags a true mine (or 🍀 if no mine remains).',
  AdvancePayment: 'Reveals an Ore tile (if any) and grants its gold.',
  Zirconium: 'Gain +1 gold on reveal.',
  Scratchcard: '+1 gold for each future special tile revealed this level. Stackable.',
  Magnet: 'Reveals all adjacent Ore tiles.',
  Receipt: 'Immediately sets all shop prices to 0 until you buy one item.',
  '2Up': 'Gain +2 life on reveal. Stackable.',
  LuckyCat: 'Gain gold equal to your current lives.'
};

export const RELIC_DESCRIPTIONS: Record<string, string> = {
  Diffuser: '−5 mines per level. Applies before placement, clamps at ≥0. Stacks additively.',
  Entrepreneur: '+1 Ore per level. Stacks additively.',
  Pioneer: 'Start each level with 1 mine flagged (may flag 🍀 Clover).',
  Resurrector: 'End level with exactly 1 life → +1 life. Stacks additively.',
  TaxCollector: 'Gain +1 gold whenever you gain gold. Stacks additively.',
  Gambler: 'Mines have a 25% chance per stack not to explode.',
  Couponer: 'All future shop costs −1 gold (floor 0).',
  Vexillologist: 'Flag all mines correctly → +3 gold at level end.',
  Mathematician: 'Reveal the highest number tile at level start.',
  Accountant: '+1% spawn chance boost for special tiles.',
  Minimalist: 'Reveal no special tiles this level → +6 gold.',
  Lapidarist: 'Revealing a mine grants +3 gold.',
  PersonalShopper: 'Shop offers +1 relic.',
  Cheapskate: 'Start level with 10+ gold → +1 life.',
  Cartographer: 'Reveal all four corners → +5 gold.',
  NumberCruncher: 'Number tiles have X% chance to grant +1 gold.',
  Researcher: 'Flags a random challenge tile at level start.',
  DebtCollector: 'Enter level with <0 gold → +1 life.',
  Auditor: 'Each challenge tile revealed grants +1 gold.'
};

export const CHALLENGE_DESCRIPTIONS: Record<string, string> = {
  AutoGrat: 'Steals 1 gold on reveal.',
  Stopwatch: 'Must be revealed before ❌ or you lose 1 life when exiting.',
  MathTest: 'Numbers >1 display as ? for the rest of the level.',
  BadDeal: 'Gain +1 gold, lose 1 life.',
  Clover2: 'Counts as a mine for numbers but does not explode.',
  SnakeOil: 'Subsequent Ore and Diamond tiles grant no gold.',
  SnakeVenom: 'Revealing Ore/⚪ Zirconium/💎 Diamond costs 1 life (min 1).',
  BloodPact: 'If you have 3+ lives, lose 1 life.',
  CarLoan: 'Subsequent special tiles cost 1 gold to reveal.',
  MegaMine: 'Counts as a mine. If lives > 2: lose 2 lives; else lose 1.'
};

export const EXTRA_RELIC_DESCRIPTIONS: Record<string, string> = {
  Billionaire: 'If you would lose a life and have ≥5 gold and >1 life, lose 5g instead.',
  Investor: '25% chance that Ore/Zirconium becomes a Diamond on reveal.',
  Optimist: 'The first mine you reveal each level yields ⚪ Zirconium instead of damage.',
  SugarDaddy: 'On purchase: convert lives → gold, leaving 1 life (1:1).',
  FortuneTeller: 'At level start, auto-reveals an Ore tile if present.'
};


