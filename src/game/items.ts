// Legacy note: if any code or comments still mention "Zirconium", it now means "Quartz".
// Terminology update (v1.4): UI shows "Collectible(s)" instead of "Relic(s)".
// Code keeps RELIC_* identifiers for compatibility with saved runs.
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'VeryRare';

export interface ShopTileDef {
  id: string;
  label: string;
  rarity: Rarity;
}
export interface RelicDef {
  id: string;
  label: string;
  rarity: Rarity;
}

export const SHOP_TILES: ShopTileDef[] = [
  { id: 'Diamond', label: '💎 Diamond', rarity: 'Rare' },
  { id: '1Up', label: '❤️ 1 Up', rarity: 'Uncommon' },
  { id: 'Pickaxe', label: '🪓 Pickaxe', rarity: 'Common' },
  { id: 'Compass', label: '🧭 Compass', rarity: 'Uncommon' },
  { id: 'Scratchcard', label: '🎟️ Scratchcard', rarity: 'Rare' },
  { id: 'GoodDeal', label: '👍 Good Deal', rarity: 'Common' },
  { id: 'RemoteControl', label: '📺 Remote Control', rarity: 'Common' },
  { id: 'AdvancePayment', label: '💳 Advance Payment', rarity: 'Common' },
  { id: 'Quartz', label: '⚪ Quartz', rarity: 'Common' },
  { id: '2Up', label: '💞 2 Up', rarity: 'Rare' },
  { id: 'LuckyCat', label: '🐈‍⬛ Lucky Cat', rarity: 'Uncommon' },
  { id: 'TarotCard', label: '🪬 Tarot Card', rarity: 'Uncommon' },
  { id: 'MetalDetector', label: '🔎 Metal Detector', rarity: 'Uncommon' },
  { id: 'LaundryMoney', label: '🧼 Laundry Money', rarity: 'Uncommon' },
  { id: 'PokerChip', label: '🃏 Poker Chip', rarity: 'Rare' },
  { id: 'LuckyPenny', label: '🧧 Lucky Penny', rarity: 'Uncommon' },
  { id: 'NineToFive', label: '🏢 9-5', rarity: 'Common' }
];

export const RELICS: RelicDef[] = [
  { id: 'Vexillologist', label: '🏁 Vexillologist', rarity: 'Rare' },
  { id: 'Pioneer', label: '🥾 Pioneer', rarity: 'Uncommon' },
  { id: 'TaxCollector', label: '🧮 Tax Collector', rarity: 'Uncommon' },
  { id: 'Diffuser', label: '🧯 Diffuser', rarity: 'Uncommon' },
  { id: 'Mathematician', label: '📐 Mathematician', rarity: 'Uncommon' },
  { id: 'Accountant', label: '📈 Accountant', rarity: 'Rare' },
  { id: 'Minimalist', label: '♻️ Minimalist', rarity: 'Rare' },
  { id: 'Lapidarist', label: '💠 Lapidarist', rarity: 'Uncommon' },
  { id: 'Gambler', label: '🎰 Gambler', rarity: 'Uncommon' },
  { id: 'PersonalShopper', label: '🛒 Personal Shopper', rarity: 'Uncommon' },
  { id: 'Cheapskate', label: '🪙 Cheapskate', rarity: 'Uncommon' },
  { id: 'Cartographer', label: '🗺️ Cartographer', rarity: 'Uncommon' },
  { id: 'Couponer', label: '🏷️ Couponer', rarity: 'Uncommon' },
  { id: 'Resurrector', label: '🧬 Resurrector', rarity: 'Uncommon' },
  { id: 'NumberCruncher', label: '🎯 Number Cruncher', rarity: 'Rare' },
  { id: 'Entrepreneur', label: '🏭 Entrepreneur', rarity: 'Uncommon' },
  { id: 'Researcher', label: '🧪 Researcher', rarity: 'Uncommon' },
  { id: 'DebtCollector', label: '⚖️ Debt Collector', rarity: 'Uncommon' },
  { id: 'Billionaire', label: '👑 Billionaire', rarity: 'Rare' },
  { id: 'Investor', label: '💼 Investor', rarity: 'Rare' },
  { id: 'Optimist', label: '🌞 Optimist', rarity: 'Rare' },
  { id: 'SugarDaddy', label: '🎁 Sugar Daddy', rarity: 'Rare' },
  { id: 'FortuneTeller', label: '🔮 Fortune Teller', rarity: 'Uncommon' },
  { id: 'Philanthropist', label: '🤲 Philanthropist', rarity: 'Rare' },
  { id: 'Barterer', label: '🔄 Barterer', rarity: 'Uncommon' },
  { id: 'Gamer', label: '🎮 Gamer', rarity: 'Rare' },
  { id: 'Surgeon', label: '🩺 Surgeon', rarity: 'Rare' },
  { id: 'SalesAssociate', label: '👗 Sales Associate', rarity: 'Rare' }
];

export function priceForRarity(r: Rarity): number {
  switch (r) {
    case 'Common': return 5;
    case 'Uncommon': return 7;
    case 'Rare': return 10;
    case 'VeryRare': return 10;
  }
}


