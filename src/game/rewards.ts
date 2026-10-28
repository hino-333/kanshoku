import { GAME } from '../config/game.config';
import { FOOD_IDS, FOODS, FURNITURE_IDS, type FoodId, type FurnitureId } from '../data/catalog';
import type { ActiveRound, GameState, RewardRecord } from '../store/types';
import { pick, seeded } from './rng';

/**
 * ラウンドの報酬を決める。ラウンドIDを種にするので、同じラウンドなら何度計算しても同じ結果。
 * ・基本のごはん（common）を必ず1つ
 * ・難しさに応じて、おまけ（special / rare）が出ることがある
 * ・家具はときどき。出ない回が続くと確実に1つ
 */
export function computeReward(state: GameState, round: ActiveRound, at: number): RewardRecord {
  const rng = seeded(round.id);
  const d = round.difficulty;
  const commons = FOOD_IDS.filter((id) => FOODS[id].rarity === 'common');
  const foodId: FoodId = pick(rng, commons);

  let bonusFoodId: FoodId | null = null;
  if (rng() < GAME.reward.bonusChance[d]) {
    const rarity = rng() < GAME.reward.rareShareOfBonus[d] ? 'rare' : 'special';
    bonusFoodId = pick(
      rng,
      FOOD_IDS.filter((id) => FOODS[id].rarity === rarity),
    );
  }

  let furnitureId: FurnitureId | null = null;
  const unowned = FURNITURE_IDS.filter((id) => !state.furniture.includes(id));
  const roll = rng();
  if (unowned.length > 0) {
    const guaranteed = state.play.sinceFurniture + 1 >= GAME.reward.furniturePity;
    if (guaranteed || roll < GAME.reward.furnitureChance[d]) furnitureId = pick(rng, unowned);
  }

  return {
    roundId: round.id,
    game: round.game,
    difficulty: d,
    foodId,
    bonusFoodId,
    furnitureId,
    wordIds: round.questions.map((q) => q.wordId),
    drawings: round.answers.map((a) => (a && a.kind === 'write' ? a.drawing : null)),
    at,
    fed: false,
  };
}
