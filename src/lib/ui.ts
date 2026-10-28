// 保存しない一時的なUIの状態（相棒の反応・トースト）
import { useSyncExternalStore } from 'react';
import type { FoodId } from '../data/catalog';

export type PetEvent =
  | { kind: 'tap'; seq: number; at: number }
  | { kind: 'lean'; food: FoodId; seq: number; at: number }
  | { kind: 'eat'; food: FoodId; seq: number; at: number }
  | { kind: 'searching'; seq: number; at: number }
  | { kind: 'found'; seq: number; at: number }
  | { kind: 'cheer'; seq: number; at: number };

export interface Toast {
  id: number;
  text: string;
}

interface UiState {
  petEvent: PetEvent | null;
  toast: Toast | null;
  bump: { target: 'pocket' | 'room'; seq: number } | null;
  /** 最後に食べたごはん（ほっぺのシール表示用） */
  lastAte: { food: FoodId; at: number } | null;
}

let state: UiState = { petEvent: null, toast: null, bump: null, lastAte: null };
let seq = 0;
const listeners = new Set<() => void>();
const set = (patch: Partial<UiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useUi<T>(sel: (s: UiState) => T): T {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => sel(state),
  );
}

type PetEventInput = PetEvent extends infer E ? (E extends PetEvent ? Omit<E, 'seq' | 'at'> : never) : never;

export function petEvent(e: PetEventInput) {
  const ev = { ...e, seq: ++seq, at: Date.now() } as PetEvent;
  set({ petEvent: ev, ...(ev.kind === 'eat' ? { lastAte: { food: ev.food, at: ev.at } } : {}) });
}

let toastTimer: number | undefined;
export function toast(text: string, ms = 2400) {
  window.clearTimeout(toastTimer);
  set({ toast: { id: ++seq, text } });
  toastTimer = window.setTimeout(() => set({ toast: null }), ms);
}

export function bump(target: 'pocket' | 'room') {
  set({ bump: { target, seq: ++seq } });
}
