// RNG Utility Module: Centralizes RNG access patterns for deterministic gameplay
// All game logic should use seeded RNG from this module instead of Math.random()
import { createRng, rngInt, pickRandom } from './rng';
import { runState } from '../state';
import { Board, indexAt } from './types';

/**
 * Get RNG for a specific tile position (deterministic based on seed + level + position)
 * Use this for tile-specific random effects (e.g., Gambler, Investor, Snake Venom)
 */
export function getTileRng(board: Board, x: number, y: number): () => number {
  const idx = indexAt(board, x, y);
  // Combine seed, level, and tile index for deterministic per-tile randomness
  const tileSeed = runState.seed + runState.level * 10000 + idx;
  return createRng(tileSeed);
}

/**
 * Get RNG for current level (deterministic based on seed + level)
 * Use this for level-wide random effects
 */
export function getLevelRng(): () => number {
  return createRng(runState.seed + runState.level);
}

/**
 * Get RNG for shop session (deterministic based on seed + level + shop session counter)
 * Use this for shop offer selection and shop-specific randomness
 */
export function getShopRng(): () => number {
  // Use level as shop session identifier (each level has one shop)
  return createRng(runState.seed + runState.level + 50000);
}

/**
 * Get RNG for teammate selection (deterministic based on seed)
 * Use this for initial teammate/relic selection
 */
export function getTeammateRng(): () => number {
  return createRng(runState.seed + 100000);
}

/**
 * Get RNG for challenge selection (deterministic based on seed + upcoming level)
 * Used by ChallengeScene to offer 2 drafted challenges each level.
 */
export function getChallengeRng(): () => number {
  // runState.level at ChallengeScene time is already the upcoming level
  return createRng(runState.seed + runState.level + 75000);
}

/**
 * Get RNG for a specific effect/action (deterministic based on seed + level + effectId)
 * Use this for effect-specific randomness that needs to be consistent
 */
export function getEffectRng(effectId: string, offset: number = 0): () => number {
  // Hash effectId to a number for consistent seeding
  let hash = 0;
  for (let i = 0; i < effectId.length; i++) {
    hash = ((hash << 5) - hash) + effectId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return createRng(runState.seed + runState.level * 1000 + Math.abs(hash) + offset);
}

