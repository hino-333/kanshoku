import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME } from '../config/game.config';
import type { PetVisualState } from '../config/assets.config';
import { FOODS, type EatReaction, type FoodId } from '../data/catalog';
import { fatigueOf, hungerOf, type Hunger } from '../game/pet';
import { useNow } from '../lib/env';
import { useUi } from '../lib/ui';
import { useGame } from '../store/store';
import type { PetMotion } from './PetSprite';

export type Spot = 'default' | 'fridge' | 'cushion';
export type Effect = 'puff' | 'zzz' | 'magnifier' | 'steam' | 'hearts' | 'sparkles' | 'crumbs';

export interface PetDisplay {
  visual: PetVisualState;
  motion: PetMotion;
  motionKey: string;
  spot: Spot;
  bubble: string | null;
  effects: Effect[];
  prop: 'plate' | 'fridge' | null;
  eatingFood: FoodId | null;
  cheek: FoodId | null;
  hunger: Hunger;
}

/** 食べ方ごとの長さ（ミリ秒） */
export const EAT_MS: Record<EatReaction, number> = { chomp: 2600, wobble: 2600, sip: 3600, hop: 2400, savor: 3200 };
const EAT_EFFECT: Record<EatReaction, Effect[]> = {
  chomp: ['crumbs'],
  wobble: ['sparkles'],
  sip: ['steam'],
  hop: ['sparkles'],
  savor: ['hearts'],
};
const TAP_LINES = ['ん？', 'なになに', 'くすぐったい', 'ふふ', 'よんだ？'];
const IDLE_LINES = ['るんっ', '今日はなに調べる？', 'ひとくち分あそぶ？'];

type Phase =
  | { kind: 'tap'; seq: number }
  | { kind: 'lean'; food: FoodId; seq: number }
  | { kind: 'eat'; food: FoodId; seq: number }
  | { kind: 'happy'; food: FoodId; seq: number }
  | { kind: 'cheer'; seq: number }
  | null;

/**
 * 相棒の「状態」を決める 表示する絵の選択（PetSprite）とは分離している
 * 優先順：食事 > ごきげん > タップ・ごはん選び > ひと息 > 休憩 > おなか > 通常
 */
export function usePetDisplay(opts: { hasActiveRound?: boolean } = {}): PetDisplay {
  const now = useNow(1000);
  const pet = useGame((s) => s.pet);
  const recent = useGame((s) => s.recentSearches);
  const ev = useUi((s) => s.petEvent);
  const lastAte = useUi((s) => s.lastAte);
  const [phase, setPhase] = useState<Phase>(null);
  const [blink, setBlink] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!ev || Date.now() - ev.at > 12_000) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (ev.kind === 'eat') {
      const ms = EAT_MS[FOODS[ev.food].reaction];
      setPhase({ kind: 'eat', food: ev.food, seq: ev.seq });
      later(ms, () => setPhase({ kind: 'happy', food: ev.food, seq: ev.seq }));
      later(ms + GAME.pet.happyMs, () => setPhase(null));
    } else if (ev.kind === 'tap') {
      setPhase({ kind: 'tap', seq: ev.seq });
      setLineIdx((i) => i + 1);
      later(900, () => setPhase(null));
    } else if (ev.kind === 'lean') {
      setPhase({ kind: 'lean', food: ev.food, seq: ev.seq });
      later(6000, () => setPhase(null));
    } else if (ev.kind === 'cheer') {
      setPhase({ kind: 'cheer', seq: ev.seq });
      later(1600, () => setPhase(null));
    }
  }, [ev]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // まばたき（通常時のみ・ときどき）
  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 170);
        loop();
      }, 2600 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  const hunger = hungerOf({ pet }, now);
  const { sighing, resting } = fatigueOf({ recentSearches: recent }, now);
  const cheek = lastAte && FOODS[lastAte.food] && now - lastAte.at < 60_000 ? lastAte.food : null;

  return useMemo<PetDisplay>(() => {
    const base = { eatingFood: null, cheek, hunger, prop: null, effects: [] as Effect[] };
    if (phase?.kind === 'eat') {
      const r = FOODS[phase.food].reaction;
      return { ...base, visual: 'eating', motion: `eat-${r}` as PetMotion, motionKey: `eat${phase.seq}`, spot: 'default', bubble: FOODS[phase.food].eatLine, effects: EAT_EFFECT[r], eatingFood: phase.food, cheek: null };
    }
    if (phase?.kind === 'happy') {
      return { ...base, visual: 'happy', motion: 'happy', motionKey: `happy${phase.seq}`, spot: 'default', bubble: FOODS[phase.food].doneLine, effects: ['hearts'] };
    }
    if (phase?.kind === 'cheer') {
      return { ...base, visual: 'happy', motion: 'cheer', motionKey: `cheer${phase.seq}`, spot: 'default', bubble: 'やったね', effects: ['sparkles'] };
    }
    if (phase?.kind === 'lean') {
      return { ...base, visual: 'lean', motion: 'lean', motionKey: `lean${phase.seq}`, spot: 'default', bubble: FOODS[phase.food].pickLine };
    }
    const spot: Spot = resting || hunger === 'flop' ? 'cushion' : hunger === 'hungry' ? 'fridge' : 'default';
    if (phase?.kind === 'tap') {
      return { ...base, visual: 'tap', motion: 'tap', motionKey: `tap${phase.seq}`, spot, bubble: TAP_LINES[lineIdx % TAP_LINES.length], prop: hunger === 'hungry' && spot === 'fridge' ? 'fridge' : null };
    }
    if (sighing) {
      return { ...base, visual: 'sigh', motion: 'sigh', motionKey: 'sigh', spot: 'default', bubble: 'ふう…よかった', effects: ['puff'] };
    }
    if (resting) {
      return { ...base, visual: 'rest', motion: 'rest', motionKey: 'rest', spot, bubble: 'ちょっと休憩中…すぐ戻るね', effects: ['zzz'] };
    }
    const idleVisual: PetVisualState = blink ? 'blink' : 'idle';
    if (hunger === 'peckish') {
      return { ...base, visual: blink ? 'blink' : 'peckish', motion: 'peckish', motionKey: 'peckish', spot, bubble: 'ちょっと小腹がすいたかも', prop: 'plate' };
    }
    if (hunger === 'hungry') {
      return { ...base, visual: blink ? 'blink' : 'hungry', motion: 'hungry', motionKey: 'hungry', spot, bubble: '冷蔵庫になにかあったかな', prop: 'fridge' };
    }
    if (hunger === 'flop') {
      return { ...base, visual: 'flop', motion: 'flop', motionKey: 'flop', spot, bubble: 'おなかすいた…へにゃ…' };
    }
    const bubble = opts.hasActiveRound ? 'さっきのつづきあそぶ？' : IDLE_LINES[lineIdx % IDLE_LINES.length];
    return { ...base, visual: idleVisual, motion: 'idle', motionKey: 'idle', spot, bubble };
  }, [phase, sighing, resting, hunger, blink, lineIdx, cheek, opts.hasActiveRound]);
}
