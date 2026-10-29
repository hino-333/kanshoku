import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useReducedMotion } from '../lib/env';
import { navigate } from '../lib/router';
import { useUi } from '../lib/ui';
import { Icon, type Glyph } from './parts';

export type Tab = 'room' | 'search' | 'play' | 'pocket';

const ITEMS: { tab: Tab; label: string; icon: Glyph; path: string }[] = [
  { tab: 'room', label: 'お部屋', icon: 'room', path: '/room' },
  { tab: 'search', label: '調べる', icon: 'search', path: '/search' },
  { tab: 'play', label: '遊ぶ', icon: 'play', path: '/play' },
  { tab: 'pocket', label: '保存済み', icon: 'pocket', path: '/pocket' },
];

/* バーの寸法（Figma「ボトムバーv2」）：幅352は固定 どのタブを選んでも伸び縮みしない */
const PAD = 8;
const GAP = 8;
const DOT = 60; // 白い丸ボタン
const PILL = 132; // 選んでいる青いボタン
const ICON = 24;
const ICON_GAP = 8;

/** おもちを押したときの戻り（反動で縦に伸びて ぷるんと元に戻る） */
const MOCHI_BACK: Keyframe[] = [
  { transform: 'scale(1.08, 0.88)' },
  { transform: 'scale(0.96, 1.06)', offset: 0.35 },
  { transform: 'scale(1.02, 0.98)', offset: 0.65 },
  { transform: 'scale(1, 1)' },
];
/** すべっているあいだ 進む方向に少しだけ伸びる */
const JELLY: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(1.12)', offset: 0.4 }, { transform: 'scaleX(1)' }];
/** 着いたアイコンが小さく弾む */
const HOP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.18) translateY(-2px)', offset: 0.5 }, { transform: 'scale(1)' }];

/** 選んでいるタブの位置から 各ボタン・青い面・名前の x を決める */
function layout(active: number, labelW: number[]) {
  const slot = (i: number) => PAD + i * (DOT + GAP) + (active >= 0 && i > active ? PILL - DOT : 0);
  const pillX = slot(Math.max(active, 0));
  const content = ICON + ICON_GAP + (labelW[active] ?? 48);
  const start = pillX + (PILL - content) / 2;
  return {
    pillX,
    item: ITEMS.map((_, i) => (i === active ? start + ICON / 2 - DOT / 2 : slot(i))),
    label: ITEMS.map((_, i) => (i === active ? start + ICON + ICON_GAP : slot(i) + DOT / 2)),
  };
}

export function BottomNav({ active, hidden }: { active: Tab | null; hidden?: boolean }) {
  const reduce = useReducedMotion();
  const bumpEv = useUi((s) => s.bump);
  const [bumping, setBumping] = useState<Tab | null>(null);
  const [labelW, setLabelW] = useState<number[]>(() => ITEMS.map((it) => it.label.length * 16));
  const [pressed, setPressed] = useState<number | null>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const blobRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stretchRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevActive = useRef<number>(-1);

  const idx = ITEMS.findIndex((it) => it.tab === active);
  const pos = layout(idx, labelW);

  // 名前の実際の幅を測る（フォントの読み込みが終わってから）
  useLayoutEffect(() => {
    const measure = () => setLabelW(labelRefs.current.map((el, i) => el?.offsetWidth || ITEMS[i].label.length * 16));
    measure();
    document.fonts?.ready.then(measure);
  }, []);

  useEffect(() => {
    if (!bumpEv) return;
    const tab: Tab = bumpEv.target === 'pocket' ? 'pocket' : 'room';
    setBumping(tab);
    const t = window.setTimeout(() => setBumping(null), 600);
    return () => clearTimeout(t);
  }, [bumpEv]);

  // 選ぶタブが変わったら：青い面がすべりながら少し伸び 着いたアイコンが弾む
  useEffect(() => {
    const from = prevActive.current;
    prevActive.current = idx;
    if (reduce || from < 0 || idx < 0 || from === idx) return;
    stretchRef.current?.animate(JELLY, { duration: 420, easing: 'ease-in-out' });
    iconRefs.current[idx]?.animate(HOP, { duration: 320, delay: 300, easing: 'ease-out' });
  }, [idx, reduce]);

  // 押した瞬間に「もちっ」とつぶれ 離すと反動で戻る
  const press = (i: number) => {
    if (reduce) return;
    setPressed(i);
  };
  const release = (i: number) => {
    if (pressed !== i) return;
    setPressed(null);
    if (reduce) return;
    const targets = [blobRefs.current[i]];
    if (i === idx) targets.push(bodyRef.current);
    for (const el of targets) el?.animate(MOCHI_BACK, { duration: 420, easing: 'ease-out' });
  };
  const pressHandlers = (i: number) => ({
    onPointerDown: (e: RPointerEvent) => {
      if (e.button === 0) press(i);
    },
    onPointerUp: () => release(i),
    onPointerLeave: () => release(i),
    onPointerCancel: () => release(i),
  });

  const go = (it: (typeof ITEMS)[number]) => navigate(it.path, { replace: active !== null && active !== it.tab ? false : true });

  return (
    <nav className={`nav ${hidden ? 'nav--hidden' : ''} ${idx < 0 ? 'nav--none' : ''}`} aria-label="メイン">
      {/* 選んでいる青い面（1枚がタブの間をすべって移動する） */}
      <div className="nav__pill" style={{ transform: `translateX(${pos.pillX}px)` }} aria-hidden="true">
        <div className="nav__pill-stretch" ref={stretchRef}>
          <div className={`nav__pill-body ${pressed !== null && pressed === idx ? 'is-pressed' : ''}`} ref={bodyRef} />
        </div>
      </div>

      {ITEMS.map((it, i) => (
        <span
          key={`l-${it.tab}`}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className={`nav__label ${i === idx ? 'is-on' : ''}`}
          style={{ transform: `translateX(${pos.label[i] - (i === idx ? 0 : 8)}px)` }}
          aria-hidden="true"
        >
          {it.label}
        </span>
      ))}

      {ITEMS.map((it, i) => (
        <button
          key={it.tab}
          type="button"
          className={`nav__item ${bumping === it.tab ? 'is-bump' : ''}`}
          style={{ transform: `translateX(${pos.item[i]}px)` }}
          aria-current={i === idx ? 'page' : undefined}
          aria-label={it.label}
          onClick={() => go(it)}
          data-nav={it.tab}
          {...pressHandlers(i)}
        >
          <span
            className={`nav__blob ${pressed === i ? 'is-pressed' : ''}`}
            ref={(el) => {
              blobRefs.current[i] = el;
            }}
          >
            <span
              className="nav__icon-wrap"
              ref={(el) => {
                iconRefs.current[i] = el;
              }}
            >
              <Icon name={it.icon} className="nav__icon" />
            </span>
          </span>
        </button>
      ))}

      {/* 青い面の 名前のあたりを押しても 選んでいるタブを押したことにする */}
      {idx >= 0 && (
        <button
          type="button"
          className="nav__pill-hit"
          style={{ transform: `translateX(${pos.pillX}px)` }}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => go(ITEMS[idx])}
          {...pressHandlers(idx)}
        />
      )}
    </nav>
  );
}
