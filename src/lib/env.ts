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

// ------------------------------------------------------------ 効果音（初期状態はオン）
let ctx: AudioContext | null = null;
type Sfx = 'tap' | 'pop' | 'chew' | 'sparkle' | 'slurp' | 'chop';

export function sfx(kind: Sfx) {
  if (!store.getState().settings.sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (kind === 'chop') return chop(ctx);
    const t = ctx.currentTime;
    const notes: Record<Exclude<Sfx, 'chop'>, [number, number, number][]> = {
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

/**
 * 包丁でまな板を「トンッ」とたたく音（控えめ）
 * ・刃が当たる短いカチッ（高めの雑音を一瞬）＋ 板が鳴るコトッ（低い音がすっと下がる）
 * ・毎回ほんの少し高さを変えて 同じ音のくり返しに聞こえないようにする
 */
function chop(ac: AudioContext) {
  const t = ac.currentTime;
  const vary = 0.92 + Math.random() * 0.16;
  const out = ac.createGain();
  out.gain.value = 0.5;
  out.connect(ac.destination);

  // 板が鳴る音
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(190 * vary, t);
  o.frequency.exponentialRampToValueAtTime(90 * vary, t + 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.13);

  // 刃が当たる音
  const len = Math.floor(ac.sampleRate * 0.03);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const n = ac.createBufferSource();
  n.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400 * vary;
  bp.Q.value = 1.2;
  const ng = ac.createGain();
  ng.gain.value = 0.22;
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
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
