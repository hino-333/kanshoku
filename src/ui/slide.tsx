import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';

/* ============================================================
   ボタンからボタンへ切り替わるときの動き（ボトムバーと同じ）
   ・選んだ印（青い面や青い枠）は 1枚が前の場所から新しい場所へすべって移る
   ・押した瞬間は おもちのように「もちっ」とつぶれ 離すと反動で戻る
   ============================================================ */

/** 動きを減らす設定か（アプリの設定 → 端末の設定 の順に見る） */
export function motionReduced(): boolean {
  const m = document.documentElement.dataset.motion;
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 反動で縦に伸びて ぷるんと元に戻る */
const MOCHI_BACK: Keyframe[] = [
  { transform: 'scale(1.08, 0.88)' },
  { transform: 'scale(0.96, 1.06)', offset: 0.35 },
  { transform: 'scale(1.02, 0.98)', offset: 0.65 },
  { transform: 'scale(1, 1)' },
];
/** すべっているあいだ 進む方向に少しだけ伸びる */
const JELLY: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(1.1)', offset: 0.4 }, { transform: 'scaleX(1)' }];

/** 選んでいるボタンを押したときは 後ろの印も一緒につぶす */
function mochiTargets(el: HTMLElement): HTMLElement[] {
  const on = el.matches('[aria-checked="true"], [aria-pressed="true"], [aria-selected="true"]');
  const body = on ? el.closest('[data-slide-group]')?.querySelector<HTMLElement>(':scope > .slide > .slide__body') : null;
  return body ? [el, body] : [el];
}

export function mochiDown(e: RPointerEvent<HTMLElement>) {
  if (e.button !== 0 || motionReduced()) return;
  for (const el of mochiTargets(e.currentTarget)) el.classList.add('is-mochi');
}
export function mochiUp(e: RPointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  if (!el.classList.contains('is-mochi')) return;
  for (const t of mochiTargets(el)) {
    t.classList.remove('is-mochi');
    t.animate(MOCHI_BACK, { duration: 420, easing: 'ease-out' });
  }
}
/** ボタンにそのまま渡せる「もちっ」の手ごたえ */
export const mochi = {
  onPointerDown: mochiDown,
  onPointerUp: mochiUp,
  onPointerLeave: mochiUp,
  onPointerCancel: mochiUp,
};

/**
 * 選んだ印をすべらせる
 * 並びの入れ物に ref と data-slide-group を付け 中の各ボタンに data-slide-key を付ける
 * kind：'fill'＝青い面（チップ・タブ・難しさ） 'ring'＝青い枠（ごはん・家具・遊び方）
 */
export function useSlide(selected: string | null | undefined, kind: 'fill' | 'ring', tone?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const prev = useRef<string | null | undefined>(undefined);

  const measure = () => {
    const root = ref.current;
    const el = selected != null ? root?.querySelector<HTMLElement>(`[data-slide-key="${CSS.escape(selected)}"]`) : null;
    setBox(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
  };

  useLayoutEffect(measure, [selected]);

  // 大きさが変わったら（フォントの読み込みや画面の回転） 印を合わせ直す
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    document.fonts?.ready.then(measure);
    // 最初の位置へは すべらせずに置く
    const t = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t);
    };
  }, [selected]);

  // 選ぶものが変わったら すべりながら少し伸びる
  useEffect(() => {
    const from = prev.current;
    prev.current = selected;
    if (from == null || selected == null || from === selected || motionReduced()) return;
    bodyRef.current?.animate(JELLY, { duration: 420, easing: 'ease-in-out' });
  }, [selected]);

  const indicator = (
    <span
      className={`slide slide--${kind} ${tone ? `slide--${tone}` : ''} ${ready ? 'is-ready' : ''}`}
      style={box ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h } : { opacity: 0 }}
      aria-hidden="true"
    >
      <span className="slide__body" ref={bodyRef} />
    </span>
  );
  return { ref, indicator, groupProps: { 'data-slide-group': '' } as const };
}
