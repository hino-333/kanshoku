import { useEffect, useRef, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { ASSETS } from '../config/assets.config';
import type { Difficulty } from '../config/game.config';
import { mochi, motionReduced, useSlide } from '../ui/slide';
import { Icon, type Glyph } from '../ui/parts';

/* ============================================================
   難しさのカードの束（マッチングアプリで相手をめくる感じ）
   ・いちばん前に選んだ難しさのカード その後ろに次の難しさのカードが下から少しのぞく
   ・上にはらう／ホイールで下へ／「むずかしい」などを押す → 前のカードが上へ飛んで 後ろのカードがばねで前へ出る
   ・下にはらう → 前の難しさのカードが上から落ちてきて いまのカードは後ろへ下がる
   ・何もしていないと ときどき後ろのカードがコトコトと顔を出して 後ろにあることを知らせる
   動きは位置と大きさだけ（傾けない 形をゆがめない）
   ============================================================ */

export const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** カードの置き場所：0＝前 1＝後ろ（下から少しのぞく） 2＝そのさらに後ろ（かくれている） */
const PEEK = 24;
const POSE = [
  { y: 0, s: 1 },
  { y: PEEK, s: 0.87 },
  { y: PEEK, s: 0.76 },
] as const;
const tf = (y: number, s: number) => `translateY(${y}px) scale(${s})`;
const at = (slot: 0 | 1 | 2) => tf(POSE[slot].y, POSE[slot].s);
/** 前のカードが飛んでいく高さ */
const FLY = 132;
/** これだけはらえば入れ替わる */
const SWIPE = 72;

/** ばねの動きを CSS の linear() で表す（使えない端末では はずむ cubic-bezier） */
function spring(damping: number, stiffness = 1): string {
  if (!CSS.supports('animation-timing-function', 'linear(0, 1)')) return 'cubic-bezier(.34,1.4,.64,1)';
  const w = 11 * stiffness;
  const wd = w * Math.sqrt(1 - damping * damping);
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const v = 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
    pts.push(v.toFixed(4));
  }
  pts[48] = '1';
  return `linear(${pts.join(', ')})`;
}

type CardInfo = { name: string; desc: string; icon: Glyph };

export function DiffDeck({
  diff,
  onChange,
  descOf,
  labelOf,
  card,
  facts,
  onStart,
}: {
  diff: Difficulty;
  onChange: (d: Difficulty) => void;
  descOf: (d: Difficulty) => string;
  labelOf: (d: Difficulty) => string;
  card: CardInfo;
  facts: string[];
  onStart: () => void;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const cards = useRef<Partial<Record<Difficulty, HTMLElement | null>>>({});
  const busy = useRef(false);
  const drag = useRef<{ id: number; y0: number; x0: number; t0: number; dy: number; on: boolean } | null>(null);
  const dragged = useRef(false);
  const diffRef = useRef(diff);
  diffRef.current = diff;
  const slide = useSlide(diff, 'fill', diff);

  const slotOf = (d: Difficulty) => ((LEVELS.indexOf(d) - LEVELS.indexOf(diff) + 3) % 3) as 0 | 1 | 2;
  const bySlot = () => {
    const i = LEVELS.indexOf(diffRef.current);
    return [0, 1, 2].map((k) => cards.current[LEVELS[(i + k) % 3]]!) as [HTMLElement, HTMLElement, HTMLElement];
  };

  /** dir=1：次の難しさへ（前のカードは上へ飛ぶ） dir=-1：前の難しさへ（上から落ちてくる） */
  const go = (dir: 1 | -1) => {
    if (busy.current) return;
    const i = LEVELS.indexOf(diffRef.current);
    const next = LEVELS[(i + dir + 3) % 3];
    const [a, b, c] = bySlot();
    if (motionReduced() || !a || !b || !c) {
      for (const el of [a, b, c]) if (el) el.style.transform = '';
      onChange(next);
      return;
    }
    busy.current = true;
    // 指で動かしていた位置から そのまま続けて動かす
    const now = (el: HTMLElement) => getComputedStyle(el).transform;
    const fa = now(a);
    const fb = now(b);
    for (const el of [a, b, c]) el.style.transform = '';
    const anims: Animation[] = [];
    const owl = (el: HTMLElement, delay: number) =>
      el.querySelector('.deck__owl')?.animate(
        [
          { transform: 'translateY(40px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 720, delay, easing: spring(0.42), fill: 'backwards' },
      );

    if (dir === 1) {
      // 前のカード：上へ飛んで消え そのまま束のいちばん後ろへ
      anims.push(
        a.animate(
          [
            { transform: fa, opacity: 1, zIndex: 6 },
            { transform: tf(-FLY, 0.92), opacity: 0, zIndex: 6 },
          ],
          { duration: 300, easing: 'cubic-bezier(.4,0,.9,.6)', fill: 'forwards' },
        ),
      );
      // 後ろのカード：ばねで前へ出てくる
      anims.push(b.animate([{ transform: fb }, { transform: at(0) }], { duration: 760, easing: spring(0.5), fill: 'backwards' }));
      // かくれていたカード：後ろから すとんと下りてきて のぞく
      anims.push(
        c.animate([{ transform: tf(PEEK - 28, POSE[1].s) }, { transform: at(1) }], { duration: 820, delay: 140, easing: spring(0.36), fill: 'backwards' }),
      );
      const o = owl(b, 90);
      if (o) anims.push(o);
    } else {
      // かくれていたカード：上から落ちてきて前に乗る
      anims.push(
        c.animate(
          [
            { transform: tf(-FLY, 0.94), opacity: 0, zIndex: 6 },
            { opacity: 1, offset: 0.25 },
            { transform: at(0), opacity: 1, zIndex: 6 },
          ],
          { duration: 760, easing: spring(0.55), fill: 'backwards' },
        ),
      );
      // 前のカード：押されて後ろへ下がる
      anims.push(a.animate([{ transform: fa }, { transform: at(1) }], { duration: 760, delay: 60, easing: spring(0.48), fill: 'backwards' }));
      anims.push(b.animate([{ transform: fb }, { transform: at(2) }], { duration: 360, easing: 'ease-out', fill: 'backwards' }));
      const o = owl(c, 120);
      if (o) anims.push(o);
    }
    // 動きを先に置いてから入れかえるので ちらつかない
    onChange(next);
    Promise.all(anims.map((x) => x.finished.catch(() => undefined))).then(() => {
      for (const x of anims) x.cancel();
      busy.current = false;
    });
  };
  const goRef = useRef(go);
  goRef.current = go;

  const pick = (d: Difficulty) => {
    if (d === diff) return;
    const i = LEVELS.indexOf(diff);
    go(LEVELS[(i + 1) % 3] === d ? 1 : -1);
  };

  // ---------------------------------------------------------- 指ではらう
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (busy.current || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { id: e.pointerId, y0: e.clientY, x0: e.clientX, t0: performance.now(), dy: 0, on: false };
    dragged.current = false;
  };
  const follow = (dy: number) => {
    const [a, b] = bySlot();
    if (dy < 0) {
      // 上へ：前のカードは指についてくる 後ろのカードは少しずつ前へ
      const p = Math.min(1, -dy / 240);
      a.style.transform = tf(dy, 1 - p * 0.04);
      const k = Math.min(1, -dy / 200) * 0.4;
      b.style.transform = tf(POSE[1].y * (1 - k), POSE[1].s + (1 - POSE[1].s) * k);
    } else {
      // 下へ：重くて半分しかついてこない
      const d = dy * 0.45;
      a.style.transform = tf(d, 1 - Math.min(1, d / 200) * 0.05);
      b.style.transform = tf(POSE[1].y + d * 0.6, POSE[1].s);
    }
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.y0;
    const dx = e.clientX - g.x0;
    if (!g.on) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
      g.on = true;
      dragged.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 指がもう離れていたら つかまえなくてよい */
      }
      deckRef.current?.classList.add('is-dragging');
    }
    g.dy = dy;
    follow(dy);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    drag.current = null;
    if (!g || g.id !== e.pointerId || !g.on) return;
    deckRef.current?.classList.remove('is-dragging');
    const v = g.dy / Math.max(1, performance.now() - g.t0); // px/ms
    if (g.dy < -SWIPE || (g.dy < -24 && v < -0.5)) return go(1);
    if (g.dy > SWIPE * 0.8 || (g.dy > 24 && v > 0.5)) return go(-1);
    // 届かなかったら ばねで元の場所へ
    const [a, b] = bySlot();
    for (const [el, slot] of [
      [a, 0],
      [b, 1],
    ] as const) {
      const from = getComputedStyle(el).transform;
      el.style.transform = '';
      el.animate([{ transform: from }, { transform: at(slot) }], { duration: 640, easing: spring(0.45) });
    }
  };
  // はらったあとの指の離しで ボタンが押されないようにする
  const onClickCapture = (e: RMouseEvent) => {
    if (dragged.current) {
      e.stopPropagation();
      e.preventDefault();
      dragged.current = false;
    }
  };

  // ---------------------------------------------------------- ホイール（パソコン）
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    let acc = 0;
    let lock = 0;
    let quiet = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      const t = performance.now();
      if (t < lock || busy.current) {
        // 慣性でつづくホイールは ひと区切りつくまで受け流す
        lock = Math.max(lock, t + 160);
        return;
      }
      clearTimeout(quiet);
      quiet = window.setTimeout(() => (acc = 0), 180);
      acc += e.deltaY;
      if (Math.abs(acc) > 40) {
        goRef.current(acc > 0 ? 1 : -1);
        acc = 0;
        lock = t + 520;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      clearTimeout(quiet);
    };
  }, []);

  // ---------------------------------------------------------- 後ろにカードがあることを ときどき知らせる
  useEffect(() => {
    let timer = 0;
    const nudge = () => {
      timer = window.setTimeout(nudge, 4200 + Math.random() * 2600);
      if (busy.current || drag.current || document.hidden || motionReduced()) return;
      const [a, b] = bySlot();
      if (!a || !b) return;
      const y = POSE[1].y;
      const s = POSE[1].s;
      // 後ろのカードが コトッ コトッと2回 下から顔を出す
      b.animate(
        [
          { transform: tf(y, s) },
          { transform: tf(y + 14, s), offset: 0.18 },
          { transform: tf(y + 2, s), offset: 0.36 },
          { transform: tf(y + 9, s), offset: 0.52 },
          { transform: tf(y, s), offset: 0.7 },
          { transform: tf(y, s) },
        ],
        { duration: 1100, easing: 'cubic-bezier(.45,0,.4,1)' },
      );
      // 前のカードは 押し上げられて ほんの少しだけ浮く
      a.animate(
        [
          { transform: tf(0, 1) },
          { transform: tf(-4, 1), offset: 0.18 },
          { transform: tf(0, 1), offset: 0.36 },
          { transform: tf(-2, 1), offset: 0.52 },
          { transform: tf(0, 1), offset: 0.7 },
          { transform: tf(0, 1) },
        ],
        { duration: 1100, easing: 'cubic-bezier(.45,0,.4,1)' },
      );
    };
    // 開いてすぐに1回 そのあとは数秒おき
    timer = window.setTimeout(nudge, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owlOf: Record<Difficulty, { src: string }> = {
    easy: ASSETS.people.owlEasy,
    normal: ASSETS.people.owlNormal,
    hard: ASSETS.people.owlHard,
  };

  return (
    <div
      className={`deck deck--${diff}`}
      ref={deckRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={onClickCapture}
    >
      {/* 難しさはカードの上で選ぶ（カードと一緒には動かない） */}
      <div className="deck__level">
        <div className="seg seg--level" role="radiogroup" aria-label="難しさ" ref={slide.ref} {...slide.groupProps}>
          {slide.indicator}
          {LEVELS.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={diff === d} className={`seg__item seg__item--${d}`} data-slide-key={d} onClick={() => pick(d)} {...mochi}>
              {labelOf(d)}
            </button>
          ))}
        </div>
        <p className="deck__desc">{descOf(diff)}</p>
      </div>

      {LEVELS.map((d) => {
        const slot = slotOf(d);
        return (
          <section
            key={d}
            ref={(el) => {
              cards.current[d] = el;
            }}
            className={`deck__card deck__card--${d}`}
            data-slot={slot}
            aria-hidden={slot !== 0}
            inert={slot !== 0}
            aria-labelledby={slot === 0 ? 'deck-title' : undefined}
          >
            <img className={`deck__owl deck__owl--${d}`} src={owlOf[d].src} alt="" draggable={false} />
            <div className="deck__content">
              <ul className="deck__facts">
                {facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="deck__main">
                <Icon name={card.icon} className="deck__icon" />
                <div>
                  <h2 className="deck__title" id={slot === 0 ? 'deck-title' : undefined}>
                    {card.name}
                  </h2>
                  <p className="deck__sub">{card.desc}</p>
                </div>
              </div>
            </div>
            <button type="button" className="deck__start" onClick={onStart} {...mochi}>
              はじめる
            </button>
          </section>
        );
      })}
    </div>
  );
}
