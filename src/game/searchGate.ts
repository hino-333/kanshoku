import type { GameState } from '../store/types';
import { fullnessOf } from './pet';

/**
 * いま調べられるか
 *  free   おなかが残っている（いつもどおり調べられる）
 *  plan   おなかは0だけど しらべ放題プランに入っている
 *  ticket おなかは0で 1問こたえてもらった しらべる回数が残っている
 *  locked おなかが0で 回数もない（1問こたえるか ごはんをあげると調べられる）
 */
export type SearchAccess = 'free' | 'plan' | 'ticket' | 'locked';

export function searchAccess(state: Pick<GameState, 'pet' | 'plan' | 'searchTickets'>, now: number): SearchAccess {
  if (fullnessOf(state, now) > 0) return 'free';
  if (state.plan.unlimited) return 'plan';
  if (state.searchTickets > 0) return 'ticket';
  return 'locked';
}
