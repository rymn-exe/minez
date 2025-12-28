import { ChallengeId } from './types';

export interface LevelSpec {
  level: number;
  mines: number;
  ore: number;
  xTiles: number;
  challenges: { id: ChallengeId; count: number }[];
}

export const LEVEL_SPECS: LevelSpec[] = [
  // Level 1
  { level: 1, mines: 37, ore: 3, xTiles: 1, challenges: [] },
  // Level 2
  { level: 2, mines: 37, ore: 3, xTiles: 1, challenges: [
    { id: ChallengeId.AutoGrat, count: 5 }
  ]},
  // Level 3
  { level: 3, mines: 45, ore: 3, xTiles: 1, challenges: [
    { id: ChallengeId.BadDeal, count: 3 },
    { id: ChallengeId.AutoGrat, count: 2 }
  ]},
  // Level 4
  { level: 4, mines: 45, ore: 3, xTiles: 1, challenges: [
    { id: ChallengeId.CarLoan, count: 1 },
    { id: ChallengeId.SnakeOil, count: 1 },
    { id: ChallengeId.AutoGrat, count: 2 }
  ]},
  // Level 5
  { level: 5, mines: 45, ore: 3, xTiles: 1, challenges: [
    { id: ChallengeId.SnakeVenom, count: 3 },
    { id: ChallengeId.Clover2, count: 2 }
  ]},
  // Level 6
  { level: 6, mines: 40, ore: 10, xTiles: 1, challenges: [
    { id: ChallengeId.SnakeOil, count: 10 }
  ]},
  // Level 7
  { level: 7, mines: 50, ore: 4, xTiles: 1, challenges: [
    { id: ChallengeId.BloodPact, count: 2 },
    { id: ChallengeId.BadDeal, count: 3 },
    { id: ChallengeId.MegaMine, count: 1 }
  ]},
  // Level 8
  { level: 8, mines: 50, ore: 4, xTiles: 1, challenges: [
    { id: ChallengeId.MathTest, count: 3 },
    { id: ChallengeId.Clover2, count: 3 }
  ]},
  // Level 9
  { level: 9, mines: 50, ore: 4, xTiles: 5, challenges: []},
  // Level 10
  { level: 10, mines: 40, ore: 4, xTiles: 1, challenges: [
    { id: ChallengeId.MegaMine, count: 10 },
    { id: ChallengeId.MathTest, count: 3 },
    { id: ChallengeId.BadDeal, count: 3 },
    { id: ChallengeId.Clover2, count: 3 }
  ]}
];


