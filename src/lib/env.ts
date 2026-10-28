// 端末の状態（動きを減らす設定・ソフトウェアキーボード）と効果音
import { useEffect, useState } from 'react';
import { store, useGame } from '../store/store';

export function useReducedMotion(): boolean {
  const pref = useGame((s) => s.settings.reduceMotion);
  const [system, setSystem] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const reduce = pref === 'on' || (pref === 'system' && system);
  useEffect(() => {
    document.documentElement.dataset.motion = pref === 'on' ? 'reduce' : pref === 'off' ? 'full' : 'system';
  }, [pref]);
  return reduce;
}

/** ソフトウェアキーボードが開いているか（固定ナビを隠すため） */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setOpen(window.innerHeight - vv.height > 140);
    vv.addEventListener('resize', check);
    return () => vv.removeEventListener('resize', check);
  }, []);
  return open;
}

// ------------------------------------------------------------ 効果音（初期状態はオフ）
let ctx: AudioContext | null = null;
type Sfx = 'tap' | 'pop' | 'chew' | 'sparkle' | 'slurp';

export function sfx(kind: Sfx) {
  if (!store.getState().settings.sound) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const notes: Record<Sfx, [number, number, number][]> = {
      tap: [[660, 0, 0.06]],
      pop: [[520, 0, 0.07], [780, 0.07, 0.09]],
      chew: [[240, 0, 0.05], [260, 0.12, 0.05], [230, 0.24, 0.05]],
      sparkle: [[880, 0, 0.08], [1175, 0.08, 0.08], [1568, 0.16, 0.12]],
      slurp: [[330, 0, 0.18]],
    };
    for (const [freq, start, dur] of notes[kind]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + start);
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(0.12, t + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t + start);
      o.stop(t + start + dur + 0.02);
    }
  } catch {
    /* 音が出せなくても操作は続ける */
  }
}

/** 1秒ごとに今の時刻を返す（相棒のようすの更新用） */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
