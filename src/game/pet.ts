import { GAME } from '../config/game.config';
import type { GameState } from '../store/types';

export type Hunger = 'content' | 'peckish' | 'hungry' | 'flop';

const H = 3_600_000;

/** 今のおなかの量（0〜100）。最後に食べたとき（まだなら出会ったとき）から時間で減る */
export function fullnessOf(state: Pick<GameState, 'pet'>, now: number): number {
  const from = state.pet.lastFedAt ?? state.pet.metAt;
  const hours = Math.max(0, now - from) / H;
  return Math.max(0, Math.min(100, state.pet.fullness - hours * GAME.pet.fullnessDecayPerHour));
}

/** おなかの量で ようすを決める。flop より先には進まない */
export function hungerOf(state: Pick<GameState, 'pet'>, now: number): Hunger {
  const f = fullnessOf(state, now);
  if (f < GAME.pet.flopBelow) return 'flop';
  if (f < GAME.pet.hungryBelow) return 'hungry';
  if (f < GAME.pet.peckishBelow) return 'peckish';
  return 'content';
}

/** 検索のあとのひと息と、続けて調べたときの休憩。時間がたてば必ず元に戻る */
export function fatigueOf(state: Pick<GameState, 'recentSearches'>, now: number): { sighing: boolean; resting: boolean } {
  const list = state.recentSearches;
  const last = list.length ? list[list.length - 1] : 0;
  const sighing = last > 0 && now - last < GAME.pet.sighMs;
  const inWindow = list.filter((t) => now - t < GAME.pet.fatigueWindowMs).length;
  const resting = inWindow >= GAME.pet.restThreshold && now - last < GAME.pet.restMs;
  return { sighing, resting };
}

/** いちばんよく食べたごはん */
export function favoriteFood(state: Pick<GameState, 'meals'>) {
  const count = new Map<string, number>();
  for (const m of state.meals) count.set(m.foodId, (count.get(m.foodId) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of count) if (v > n) [best, n] = [k, v];
  return best;
}
