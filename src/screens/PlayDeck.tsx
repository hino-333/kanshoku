import { useEffect, useRef, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import type { Difficulty } from '../config/game.config';
import { mochi, motionReduced, useSlide } from '../ui/slide';
import { Icon, type Glyph } from '../ui/parts';

/* ============================================================
   難しさのカードの束（マッチングアプリで相手をめくる感じ）
   ・いちばん前に選んだ難しさのカード その後ろに次の難しさのカードが下から少しのぞく
   ・上にはらう／ホイールで下へ／「むずかしい」などを押す → 前のカードが持ち上がって 後ろのカードの裏へ回りこむ
   ・下にはらう → いちばん後ろのカードが裏から出てきて 前のカードの上に乗る
   ・後ろのカードは2枚とも下からのぞかせて 3色の階段で「束」だとわかるようにする
   ・まだ一度もめくったことがない人には 開いた直後に前のカードが1回だけ持ち上がって 後ろを見せる
   動きは位置と大きさだけ（傾けない 形をゆがめない）
   ============================================================ */

export const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** カードの置き場所：0＝前 1＝後ろ（下から24pxのぞく） 2＝いちばん後ろ（そのさらに下から16pxのぞく） */
const PEEK = 24;
const PEEK2 = PEEK + 16;
const POSE = [
  { y: 0, s: 1 },
  { y: PEEK, s: 0.87 },
  { y: PEEK2, s: 0.76 },
] as const;
/** 一度でも自分でめくったら はじめの見本の動きはもう出さない（この端末だけの覚え書き） */
const LEARNED_KEY = 'kanshoku:deckLearned';
const learned = () => {
  try {
    return localStorage.getItem(LEARNED_KEY) === '1';
  } catch {
    return false;
  }
};
const learn = () => {
  try {
    localStorage.setItem(LEARNED_KEY, '1');
  } catch {
    /* 保存できなくても動きに困ることはない */
  }
};
const tf = (y: number, s: number) => `translateY(${y}px) scale(${s})`;
const at = (slot: 0 | 1 | 2) => tf(POSE[slot].y, POSE[slot].s);
/** 上の欄や背景に重なっているあいだのカードの濃さ（下の文字が透けて読める） */
const SEE = 0.5;
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
  art,
  artKind,
  onStart,
}: {
  diff: Difficulty;
  onChange: (d: Difficulty) => void;
  descOf: (d: Difficulty) => string;
  labelOf: (d: Difficulty) => string;
  card: CardInfo;
  facts: string[];
  /** 難しさごとにカードに座るキャラの絵（遊びによって フクロウ／ハムスター） */
  art: Record<Difficulty, string>;
  /** 絵の大きさと置き場所をキャラごとに変える */
  artKind: 'owl' | 'hamster';
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
    const ops = els.map((el) => getComputedStyle(el).opacity);
    running.current?.();
    for (const el of els) {
      for (const x of el.getAnimations({ subtree: true })) x.cancel();
    }
    els.forEach((el, k) => {
      el.style.transform = pos[k];
      el.style.opacity = ops[k];
    });
  };

  /**
   * dir=1：次の難しさへ  前のカードが上へ持ち上がり 後ろのカードの「裏」へ回って下りていく
   * dir=-1：前の難しさへ いちばん後ろのカードが裏から上へ出てきて 前のカードの上へ乗る
   * 消したりうすくしたりせず 重なりの前後が入れかわるところをそのまま見せる
   */
  const go = (dir: 1 | -1, byHand = true) => {
    // タブではなく カードの束を自分で動かしてめくれたら もう見本はいらない
    if (byHand) learn();
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
    const oa = Number(a.style.opacity || 1);
    const oc = Number(c.style.opacity || 1);
    for (const el of [a, b, c]) {
      el.style.transform = '';
      el.style.opacity = '';
    }
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
      el.querySelector('.deck__art')?.animate([{ transform: 'translateY(48px)' }, { transform: 'translateY(0)' }], {
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
            // 持ち上がったら すぐ半透明にして 上の欄の文字が透けて見えるように
            { transform: fa, opacity: oa, zIndex: 6, easing: 'cubic-bezier(.2,.75,.3,1)' },
            { opacity: SEE, offset: 0.12 },
            { transform: tf(-lift, 0.94), zIndex: 6, offset: 0.4 },
            { transform: tf(-lift, 0.93), zIndex: 0, offset: 0.42, easing: 'cubic-bezier(.55,0,.35,1)' },
            // 裏に収まるころに 元の濃さへ
            { opacity: SEE, offset: 0.7 },
            { transform: tf(PEEK2 + 10, POSE[2].s), opacity: 1, zIndex: 0, offset: 0.84, easing: 'ease-out' },
            { transform: at(2), opacity: 1, zIndex: 0 },
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
            // 裏から上へ出てくるあいだは半透明 前に乗って着地すると元の濃さへ
            { transform: fc, opacity: oc, zIndex: 0, easing: 'cubic-bezier(.3,.7,.3,1)' },
            { opacity: SEE, offset: 0.14 },
            { transform: tf(-lift, 0.94), opacity: SEE, zIndex: 0, offset: 0.42 },
            { transform: tf(-lift, 0.94), opacity: SEE, zIndex: 6, offset: 0.44, easing: spring(0.55) },
            // 着地するころに 難しさの切りかえ（5）の下へもぐる
            { transform: at(0), opacity: 1, zIndex: 4 },
          ],
          { duration: 720, fill: 'both' },
        ),
      );
      // 前のカード：上から乗られて 後ろへ押し下げられる
      anims.push(
        a.animate([{ transform: fa, opacity: oa }, { transform: at(1), opacity: 1 }], { duration: 500, delay: 300, easing: spring(0.5), fill: 'both' }),
      );
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
    go(LEVELS[(i + 1) % 3] === d ? 1 : -1, false);
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
      // 動かした瞬間から半透明に（上の欄に重なっても下の文字が読める）
      a.style.opacity = String(1 - Math.min(1, -dy / 40) * (1 - SEE));
      const k = Math.min(1, -dy / 200) * 0.4;
      b.style.transform = tf(POSE[1].y * (1 - k), POSE[1].s + (1 - POSE[1].s) * k);
    } else {
      // 下へ：重くて半分しかついてこない
      const d = dy * 0.45;
      a.style.transform = tf(d, 1 - Math.min(1, d / 200) * 0.05);
      a.style.opacity = String(1 - Math.min(1, d / 24) * (1 - SEE));
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
      const op = getComputedStyle(el).opacity;
      el.style.transform = '';
      el.style.opacity = '';
      el.animate(
        [
          { transform: from, opacity: op },
          { transform: at(slot), opacity: 1 },
        ],
        { duration: 480, easing: spring(0.5) },
      );
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

  // ---------------------------------------------------------- はじめの見本：前のカードが1回だけ持ち上がって 後ろを見せる
  useEffect(() => {
    if (learned()) return;
    const timer = window.setTimeout(() => {
      if (running.current || drag.current || document.hidden || motionReduced()) return;
      const [a, b, c] = bySlot();
      if (!a || !b || !c) return;
      const lift = Math.round(Math.min(a.offsetHeight * 0.18, 88));
      const o = { duration: 1400, easing: 'cubic-bezier(.45,0,.35,1)' };
      // 指ではらったときと同じ向き・同じ透け方で 持ち上がって ストンと戻る
      a.animate(
        [
          { transform: at(0), opacity: 1 },
          { transform: tf(-lift, 0.98), opacity: SEE, offset: 0.32 },
          { transform: tf(-lift, 0.98), opacity: SEE, offset: 0.56 },
          { transform: tf(3, 1), opacity: 1, offset: 0.84 },
          { transform: at(0), opacity: 1 },
        ],
        o,
      );
      // 後ろの2枚は 前のカードについていくように少しだけせり上がる
      for (const [el, slot, k] of [
        [b, 1, 0.45],
        [c, 2, 0.25],
      ] as const) {
        const p = POSE[slot];
        const up = tf(p.y * (1 - k), p.s + (POSE[slot - 1].s - p.s) * k);
        el.animate(
          [
            { transform: at(slot) },
            { transform: up, offset: 0.32 },
            { transform: up, offset: 0.56 },
            { transform: at(slot), offset: 0.84 },
            { transform: at(slot) },
          ],
          o,
        );
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`deck deck--${diff} deck--${artKind}`}
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

      {/* 下にのぞいているカードを押しても 前へ出てくる（すぐ後ろ＝次 いちばん下＝前の難しさ） */}
      <button
        type="button"
        className="deck__peek"
        aria-label={`${labelOf(LEVELS[(LEVELS.indexOf(diff) + 1) % 3])}のカードを前へ`}
        onClick={() => go(1)}
      />
      <button
        type="button"
        className="deck__peek deck__peek--far"
        aria-label={`${labelOf(LEVELS[(LEVELS.indexOf(diff) + 2) % 3])}のカードを前へ`}
        onClick={() => go(-1)}
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
            <img className={`deck__art deck__art--${d}`} src={art[d]} alt="" draggable={false} />
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
