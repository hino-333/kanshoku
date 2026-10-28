import { useSyncExternalStore } from 'react';
import { createInitialState, reducer, sanitize } from './reducer';
import type { Action, GameState } from './types';

export const STORAGE_KEY = 'kanshoku:v1';

export type LoadNotice = 'corrupt' | 'unavailable' | null;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 保存データを読む。読めなければ新しく始める（壊れたデータは別名で残す） */
export function loadState(storage: KeyValueStorage | null, now: number): { state: GameState; notice: LoadNotice } {
  if (!storage) return { state: createInitialState(now), notice: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: createInitialState(now), notice: 'unavailable' };
  }
  if (raw == null) return { state: createInitialState(now), notice: null };
  try {
    return { state: sanitize(JSON.parse(raw), now), notice: null };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}:broken-${now}`, raw);
    } catch {
      /* 退避できなくても起動は続ける */
    }
    return { state: createInitialState(now), notice: 'corrupt' };
  }
}

export function saveState(storage: KeyValueStorage | null, state: GameState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export interface Store {
  getState(): GameState;
  dispatch(action: Action): GameState;
  subscribe(fn: () => void): () => void;
  readonly notice: LoadNotice;
  readonly persistent: boolean;
}

/** 状態を持つストア。変更のたびに、その場で端末へ保存する */
export function createStore(storage: KeyValueStorage | null, now = Date.now()): Store {
  const loaded = loadState(storage, now);
  let state = loaded.state;
  let persistent = loaded.notice !== 'unavailable';
  const listeners = new Set<() => void>();
  return {
    notice: loaded.notice,
    get persistent() {
      return persistent;
    },
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next !== state) {
        state = next;
        persistent = saveState(storage, state) && persistent;
        listeners.forEach((l) => l());
      }
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function browserStorage(): KeyValueStorage | null {
  try {
    const s = window.localStorage;
    const probe = '__kanshoku_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const store = createStore(typeof window !== 'undefined' ? browserStorage() : null);

export function useGame<T>(selector: (s: GameState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export const dispatch = (action: Action) => store.dispatch(action);
