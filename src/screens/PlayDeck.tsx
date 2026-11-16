import { useEffect, useRef, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { ASSETS } from '../config/assets.config';
import type { Difficulty } from '../config/game.config';
import { mochi, motionReduced, useSlide } from '../ui/slide';
import { Icon, type Glyph } from '../ui/parts';

/* ============================================================
   難しさのカードの束（マッチングアプリで相手をめくる感じ）
   ・いちばん前に選んだ難しさのカード その後ろに次の難しさのカードが下から少しのぞく
   ・上にはらう／ホイールで下へ／「むずかしい」などを押す → 前のカードが持ち上がって 後ろのカードの裏へ回りこむ
   ・下にはらう → いちばん後ろのカードが裏から出てきて 前のカードの上に乗る
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
  /** 動いている入れかわりの後片づけ（途中で次の操作が来たら すぐ呼んで乗りかえる） */
  const running = useRef<(() => void) | null>(null);
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

  /**
   * いま動いている途中の位置で3枚を止める
   * 入れかわりの途中・コトコト・ばねで戻る途中でも 次の操作をすぐ受けて そこから続けて動かすため
   */
  const freeze = () => {
    const els = bySlot().filter(Boolean);
    const pos = els.map((el) => getComputedStyle(el).transform);
    running.current?.();
    for (const el of els) {
      for (const x of el.getAnimations({ subtree: true })) x.cancel();
    }
    els.forEach((el, k) => (el.style.transform = pos[k]));
  };

  /**
   * dir=1：次の難しさへ  前のカードが上へ持ち上がり 後ろのカードの「裏」へ回って下りていく
   * dir=-1：前の難しさへ いちばん後ろのカードが裏から上へ出てきて 前のカードの上へ乗る
   * 消したりうすくしたりせず 重なりの前後が入れかわるところをそのまま見せる
   */
  const go = (dir: 1 | -1) => {
    const i = LEVELS.indexOf(diffRef.current);
    const next = LEVELS[(i + dir + 3) % 3];
    const [a, b, c] = bySlot();
    if (motionReduced() || !a || !b || !c) {
      for (const el of [a, b, c]) if (el) el.style.transform = '';
      onChange(next);
      return;
    }
    // 指で動かしていた位置や 前の入れかわりの途中から そのまま続けて動かす
    freeze();
    const fa = a.style.transform || at(0);
    const fb = b.style.transform || at(1);
    const fc = c.style.transform || at(2);
    for (const el of [a, b, c]) el.style.transform = '';
    // 持ち上げる高さ：カードの4割（上の欄にかぶっても 画面の外に切れないようにする）
    const lift = Math.round(Math.min(a.offsetHeight * 0.42, 220));
    const body = deckRef.current?.closest<HTMLElement>('.screen__body');
    const free = body && body.scrollTop === 0;
    if (free) body.classList.add('is-deck-swapping');
    // 動いているあいだは 入れかわる2枚の中身を見せたままにする
    const shown = dir === 1 ? [a, b] : [c, a];
    for (const el of shown) el.classList.add('is-shown');
    const anims: Animation[] = [];
    const owl = (el: HTMLElement, delay: number) =>
      el.querySelector('.deck__owl')?.animate([{ transform: 'translateY(48px)' }, { transform: 'translateY(0)' }], {
        duration: 600,
        delay,
        easing: spring(0.42),
        fill: 'backwards',
      });

    if (dir === 1) {
      // 前のカード：上へ持ち上がる → 後ろのカードの裏へまわる → 下りて束のいちばん後ろへ
      anims.push(
        a.animate(
          [
            { transform: fa, zIndex: 6, easing: 'cubic-bezier(.2,.75,.3,1)' },
            { transform: tf(-lift, 0.94), zIndex: 6, offset: 0.4 },
            { transform: tf(-lift, 0.93), zIndex: 0, offset: 0.42, easing: 'cubic-bezier(.55,0,.35,1)' },
            { transform: tf(PEEK + 16, POSE[2].s), zIndex: 0, offset: 0.84, easing: 'ease-out' },
            { transform: at(2), zIndex: 0 },
          ],
          { duration: 600, fill: 'both' },
        ),
      );
      // 後ろのカード：持ち上がったすきに ばねで前へ出てくる
      anims.push(b.animate([{ transform: fb }, { transform: at(0) }], { duration: 560, delay: 60, easing: spring(0.5), fill: 'both' }));
      // かくれていたカード：前のカードが裏へ回りこんだあと 下からのぞく位置へ
      anims.push(c.animate([{ transform: fc }, { transform: at(1) }], { duration: 460, delay: 260, easing: spring(0.45), fill: 'both' }));
      const o = owl(b, 120);
      if (o) anims.push(o);
    } else {
      // いちばん後ろのカード：前のカードの裏から上へ出てくる → 前へまわって上から乗る
      anims.push(
        c.animate(
          [
            { transform: fc, zIndex: 0, easing: 'cubic-bezier(.3,.7,.3,1)' },
            { transform: tf(-lift, 0.94), zIndex: 0, offset: 0.42 },
            { transform: tf(-lift, 0.94), zIndex: 6, offset: 0.44, easing: spring(0.55) },
            // 着地するころに 難しさの切りかえ（5）の下へもぐる
            { transform: at(0), zIndex: 4 },
          ],
          { duration: 720, fill: 'both' },
        ),
      );
      // 前のカード：上から乗られて 後ろへ押し下げられる
      anims.push(a.animate([{ transform: fa }, { transform: at(1) }], { duration: 500, delay: 300, easing: spring(0.5), fill: 'both' }));
      anims.push(b.animate([{ transform: fb }, { transform: at(2) }], { duration: 300, delay: 280, easing: 'ease-out', fill: 'both' }));
      const o = owl(c, 320);
      if (o) anims.push(o);
    }
    // 動きを先に置いてから入れかえるので ちらつかない
    diffRef.current = next;
    onChange(next);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      if (running.current === end) running.current = null;
      for (const x of anims) x.cancel();
      for (const el of shown) el.classList.remove('is-shown');
      body?.classList.remove('is-deck-swapping');
    };
    running.current = end;
    Promise.all(anims.map((x) => x.finished.catch(() => undefined))).then(end);
  };
  const goRef = useRef(go);
  goRef.current = go;

  const pick = (d: Difficulty) => {
    // 入れかわりの途中で押されても いま前に来ようとしているカードから数える
    const cur = diffRef.current;
    if (d === cur) return;
    const i = LEVELS.indexOf(cur);
    go(LEVELS[(i + 1) % 3] === d ? 1 : -1);
  };

  // ---------------------------------------------------------- 指ではらう
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { id: e.pointerId, y0: e.clientY, x0: e.clientX, t0: performance.now(), dy: 0, on: false };
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
      // 動いている途中でも つかんだ瞬間に指の下へ（コトコトの動きに負けないように止める）
      freeze();
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
    const [a, b, c] = bySlot();
    for (const [el, slot] of [
      [a, 0],
      [b, 1],
      [c, 2],
    ] as const) {
      const from = getComputedStyle(el).transform;
      el.style.transform = '';
      el.animate([{ transform: from }, { transform: at(slot) }], { duration: 480, easing: spring(0.5) });
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
      if (t < lock) {
        // 1回のスクロール（慣性でつづく分も）で 1枚だけめくる 手をとめたら次をすぐ受ける
        lock = Math.max(lock, t + 120);
        return;
      }
      clearTimeout(quiet);
      quiet = window.setTimeout(() => (acc = 0), 260);
      acc += e.deltaY;
      // 小さなスクロールでも 1回目からめくれるように 少しの量で反応する
      if (Math.abs(acc) >= 16) {
        goRef.current(acc > 0 ? 1 : -1);
        acc = 0;
        lock = t + 220;
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
      if (running.current || drag.current || document.hidden || motionReduced()) return;
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

      {/* 下にのぞいている次のカードを押しても 前へ出てくる */}
      <button
        type="button"
        className="deck__peek"
        aria-label={`${labelOf(LEVELS[(LEVELS.indexOf(diff) + 1) % 3])}のカードを前へ`}
        onClick={() => go(1)}
      />
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
