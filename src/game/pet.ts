import { GAME } from '../config/game.config';
import type { GameState } from '../store/types';

export type Hunger = 'content' | 'peckish' | 'hungry' | 'flop';

const H = 3_600_000;

/** 最後のごはんからの時間で、おなかのようすを決める。flop より先には進まない */
export function hungerOf(state: Pick<GameState, 'pet'>, now: number): Hunger {
  const last = state.pet.lastFedAt;
  if (last == null) return 'peckish';
  const since = (now - last) / H;
  if (since >= GAME.pet.flopAfterHours) return 'flop';
  if (since >= GAME.pet.hungryAfterHours) return 'hungry';
  if (since >= GAME.pet.peckishAfterHours) return 'peckish';
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
