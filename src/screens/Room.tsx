import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { ASSETS } from '../config/assets.config';
import { FOODS, FOOD_IDS, FURNITURE, FURNITURE_IDS, OPTIONAL_SLOTS, SLOT_IDS, SLOT_LABEL, type FoodId, type SlotId } from '../data/catalog';
import { ArtBox } from '../art/AssetImage';
import { RoomStage } from '../art/RoomStage';
import { usePetDisplay } from '../art/usePetDisplay';
import { sfx, useReducedMotion } from '../lib/env';
import { goBack, navigate } from '../lib/router';
import { petEvent } from '../lib/ui';
import { dispatch, store, useGame } from '../store/store';
import { EmptyState, Icon } from '../ui/parts';

type Mode = 'idle' | 'food' | 'decor';

export function RoomScreen({ mode }: { mode: Mode }) {
  const room = useGame((s) => s.room);
  const name = useGame((s) => s.pet.name);
  const foods = useGame((s) => s.foods);
  const hasActive = useGame((s) => s.play.active !== null);
  const pet = usePetDisplay({ hasActiveRound: hasActive });
  const [landed, setLanded] = useState<{ slot: SlotId; seq: number } | null>(null);
  const petRef = useRef<HTMLButtonElement>(null);
  const foodCount = FOOD_IDS.reduce((n, id) => n + foods[id], 0);

  const onPetTap = useCallback(() => {
    if (pet.visual === 'eating') return;
    petEvent({ kind: 'tap' });
    sfx('tap');
  }, [pet.visual]);

  return (
    <div className={`screen room-screen room-screen--${mode}`}>
      <div className="room-top">
        <button type="button" className="search-pill" onClick={() => navigate('/search?focus=1')}>
          <Icon name="searchLine" className="search-pill__icon" />
          <span className="search-pill__text">どう書くんだっけ？</span>
        </button>
      </div>

      <RoomStage room={room} pet={pet} onPetTap={onPetTap} petLabel={name} landed={landed} petRef={petRef} compact={mode !== 'idle'}>
        {mode === 'idle' && (
          <>
            <button type="button" className="name-tag" onClick={() => navigate('/room/profile')} aria-label={`${name}のプロフィール`}>
              <span className="name-tag__icon">
                <Icon name="profile" />
              </span>
              <span className="name-tag__name">{name}</span>
              <Icon name="chevron" className="name-tag__chev" />
            </button>
            <div className="room-tools">
              <button type="button" className="round-btn" onClick={() => navigate('/room/decor')} aria-label="模様替え">
                <Icon name="decor" />
              </button>
              <button type="button" className="round-btn round-btn--food" onClick={() => navigate('/room/food')} aria-label={`ごはん ${foodCount}こ`}>
                <Icon name="food" />
                {foodCount > 0 && <span className="round-btn__badge">{foodCount}</span>}
              </button>
            </div>
          </>
        )}
      </RoomStage>

      {mode === 'food' && <FoodDrawer petRef={petRef} eating={pet.visual === 'eating'} />}
      {mode === 'decor' && <DecorPanel onPlaced={(slot) => setLanded({ slot, seq: Date.now() })} />}
    </div>
  );
}

/* ============================================================ 引き出しを閉じる */
/** 開くときと同じく 閉じるときも下へすべって消えてから部屋に戻る */
function useDrawerClose() {
  const [closing, setClosing] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => goBack('/room'), reduce ? 0 : 220);
  }, [closing, reduce]);
  // 引き出しの高さを部屋に伝えて 部屋の床を引き出しのすぐ上にそろえる
  useLayoutEffect(() => {
    const el = ref.current;
    const screen = el?.closest<HTMLElement>('.room-screen');
    if (!el || !screen) return;
    const sync = () => screen.style.setProperty('--drawer-h', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      screen.style.removeProperty('--drawer-h');
    };
  }, []);
  return { closing, close, ref };
}

/* ============================================================ ごはんかご */

export function feedPet(food: FoodId, mealId?: string): boolean {
  const id = mealId ?? `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const before = store.getState();
  const after = dispatch({ type: 'feed', foodId: food, mealId: id, at: Date.now() });
  if (after === before) return false;
  petEvent({ kind: 'eat', food });
  sfx('chew');
  return true;
}

function FoodDrawer({ petRef, eating }: { petRef: React.RefObject<HTMLButtonElement | null>; eating: boolean }) {
  const foods = useGame((s) => s.foods);
  const owned = FOOD_IDS.filter((id) => foods[id] > 0);
  const [selected, setSelected] = useState<FoodId | null>(null);
  const [drag, setDrag] = useState<{ food: FoodId; x: number; y: number; over: boolean } | null>(null);
  const [hint, setHint] = useState<{ food: FoodId; from: DOMRect; to: DOMRect; key: number } | null>(null);
  const start = useRef<{ food: FoodId; x: number; y: number; moved: boolean } | null>(null);
  const sel = selected && foods[selected] > 0 ? selected : null;
  const { closing, close, ref: drawerRef } = useDrawerClose();

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);

  const choose = (food: FoodId, card?: HTMLElement) => {
    setSelected(food);
    petEvent({ kind: 'lean', food });
    // 選んだごはんから相棒まで 手がドラッグして見せる（何度も出るとうるさいので数回だけ）
    const pet = petRef.current?.getBoundingClientRect();
    if (card && pet && hintCount < HINT_TIMES) {
      hintCount++;
      setHint({ food, from: card.getBoundingClientRect(), to: pet, key: Date.now() });
    }
  };
  const give = (food: FoodId) => {
    if (eating) return;
    if (feedPet(food)) close();
  };

  const overPet = (x: number, y: number) => {
    const r = petRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  const onDown = (food: FoodId) => (e: RPointerEvent) => {
    start.current = { food, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: RPointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12) {
      s.moved = true;
      setHint(null);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      choose(s.food);
    }
    if (s.moved) setDrag({ food: s.food, x: e.clientX, y: e.clientY, over: overPet(e.clientX, e.clientY) });
  };
  const onUp = (e: RPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (s?.moved) {
      setDrag(null);
      if (overPet(e.clientX, e.clientY)) give(s.food);
    }
  };

  return (
    <section ref={drawerRef} className={`drawer ${closing ? 'is-closing' : ''}`} aria-labelledby="drawer-title">
      <div className="drawer__head">
        <h2 className="h2 grow" id="drawer-title">
          ごはんかご
        </h2>
        <button type="button" className="icon-btn" onClick={close} aria-label="ごはんかごをとじる">
          <Icon name="close" />
        </button>
      </div>

      {owned.length === 0 ? (
        <EmptyState
          art={<ArtBox def={ASSETS.room.plate} className="state__art state__art--plate" />}
          title="ごはんがないよ"
          body="短いことば遊びでごはんが手に入ります"
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/play', { replace: true })}>
              ひとくち分あそぶ？
            </button>
          }
        />
      ) : (
        <>
          <div className="food-grid" role="radiogroup" aria-label="あげるごはん">
            {owned.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={sel === id}
                className="food-card"
                onClick={(e) => {
                  if (!start.current?.moved) choose(id, e.currentTarget);
                }}
                onPointerDown={onDown(id)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag(null);
                }}
              >
                <ArtBox def={ASSETS.food[id]} className="food-card__art" />
                <span className="food-card__name">{FOODS[id].name}</span>
                <span className="food-card__count">×{foods[id]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary btn--lg btn--block" disabled={!sel || eating} onClick={() => sel && give(sel)}>
            {sel ? `${FOODS[sel].name}を食べさせる` : 'ごはんをえらんでね'}
          </button>
        </>
      )}

      {drag && (
        <div className={`drag-ghost ${drag.over ? 'is-over' : ''}`} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <ArtBox def={ASSETS.food[drag.food]} />
        </div>
      )}
      {hint && !drag && <DragHint key={hint.key} food={hint.food} from={hint.from} to={hint.to} />}
    </section>
  );
}

const HINT_MS = 3400;
const HINT_TIMES = 3;
/** このページを開いているあいだに 手の案内を出した回数 */
let hintCount = 0;

/** 手がごはんを相棒まで運んで「ドラッグしてね！」と見せる */
function DragHint({ food, from, to }: { food: FoodId; from: DOMRect; to: DOMRect }) {
  const x = from.left + from.width / 2;
  const y = from.top + from.height * 0.42;
  const dx = to.left + to.width / 2 - x;
  const dy = to.top + to.height * 0.62 - y;
  return (
    <div className="drag-hint" style={{ left: x, top: y, '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties} aria-hidden="true">
      <div className="drag-hint__mover">
        <div className="drag-hint__food">
          <ArtBox def={ASSETS.food[food]} />
        </div>
        <div className="drag-hint__hand">
          <ArtBox def={ASSETS.deco.hand} />
        </div>
      </div>
      <span className="drag-hint__label">ドラッグしてね！</span>
    </div>
  );
}

/* ============================================================ 模様替え */

function DecorPanel({ onPlaced }: { onPlaced: (slot: SlotId) => void }) {
  const [slot, setSlot] = useState<SlotId>('rug');
  const owned = useGame((s) => s.furniture);
  const room = useGame((s) => s.room);
  const items = useMemo(() => FURNITURE_IDS.filter((id) => FURNITURE[id].slot === slot), [slot]);
  const initial = useRef(room).current;
  const { closing, close, ref: drawerRef } = useDrawerClose();

  // もどる：開いたときの部屋に戻してから閉じる（できた は今の部屋のまま閉じる）
  const cancel = () => {
    for (const s of SLOT_IDS) if (store.getState().room[s] !== initial[s]) dispatch({ type: 'place', slot: s, furnitureId: initial[s] });
    close();
  };

  const place = (id: (typeof FURNITURE_IDS)[number] | null) => {
    if (room[slot] === id) return;
    dispatch({ type: 'place', slot, furnitureId: id });
    if (id) onPlaced(slot);
    sfx('pop');
  };

  return (
    <section ref={drawerRef} className={`drawer drawer--decor ${closing ? 'is-closing' : ''}`} aria-labelledby="decor-title">
      <div className="drawer__head">
        <button type="button" className="icon-btn drawer__back" onClick={cancel} aria-label="もどる（変えたところを元に戻す）">
          <Icon name="back" />
        </button>
        <h2 className="h2 grow" id="decor-title">
          模様替え
        </h2>
        <button type="button" className="btn btn--sm btn--primary" onClick={close}>
          できた
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="置く場所">
        {SLOT_IDS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} className="tabs__tab" onClick={() => setSlot(s)}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="decor-grid" role="tabpanel" aria-label={SLOT_LABEL[slot]}>
        {OPTIONAL_SLOTS.includes(slot) && (
          <button type="button" className="decor-item" aria-pressed={room[slot] === null} onClick={() => place(null)}>
            <span className="decor-item__none">なし</span>
            <span className="decor-item__name">置かない</span>
          </button>
        )}
        {items.map((id) =>
          owned.includes(id) ? (
            <button key={id} type="button" className="decor-item" aria-pressed={room[slot] === id} onClick={() => place(id)}>
              <ArtBox def={ASSETS.furniture[id]} className="decor-item__art" />
              <span className="decor-item__name">{FURNITURE[id].name}</span>
              {room[slot] === id && (
                <span className="decor-item__check" aria-hidden="true">
                  <Icon name="check" />
                </span>
              )}
            </button>
          ) : (
            <div key={id} className="decor-item decor-item--locked" aria-label="まだ見つけていない家具">
              <ArtBox def={ASSETS.furniture[id]} className="decor-item__art decor-item__art--locked" />
              <span className="decor-item__name">あそぶと見つかるかも</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
