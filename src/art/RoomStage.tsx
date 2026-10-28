import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ASSETS, type DecoKey, type Placement } from '../config/assets.config';
import { FOODS, SLOT_IDS, type FoodId, type FurnitureId, type SlotId } from '../data/catalog';
import { AssetImage } from './AssetImage';
import { PetSprite } from './PetSprite';
import type { Effect, PetDisplay } from './usePetDisplay';

const L = ASSETS.layout;
/** ひとことが出ている時間と 消えていく時間（ミリ秒） */
const POP_MS = 2600;
const POP_LEAVE_MS = 420;

function place(p: Placement): CSSProperties {
  return { left: `${p.x}%`, bottom: `${p.bottom}%`, width: `${p.width}%`, zIndex: p.z };
}

/** 相棒の箱の高さ（ステージ高さに対する %） */
function petHeightPct(p: Placement) {
  return (p.width / (ASSETS.pet.base.aspect ?? 1)) * L.stageAspect;
}

const EFFECT_ART: Record<Effect, DecoKey> = {
  puff: 'puff',
  zzz: 'zzz',
  magnifier: 'magnifier',
  steam: 'steam',
  hearts: 'heart',
  sparkles: 'sparkle',
  crumbs: 'sparkle',
};

interface Props {
  room: Record<SlotId, FurnitureId | null>;
  pet: PetDisplay;
  onPetTap?: () => void;
  petLabel: string;
  /** 直前に置いた家具（ぽすっと着地させる） */
  landed?: { slot: SlotId; seq: number } | null;
  /** 渡そうとしているごはん（ドラッグで相棒に重ねる判定用） */
  petRef?: React.Ref<HTMLButtonElement>;
  children?: ReactNode;
  compact?: boolean;
}

/**
 * 部屋の表示 層の順番（奥→手前）：背景 → 壁・窓・棚 → ラグ → クッション → 相棒 → ごはん・小物 → 演出 → UI
 * 位置と重なり順は assets.config.ts の layout で調整できる
 */
export function RoomStage({ room, pet, onPetTap, petLabel, landed, petRef, children, compact }: Props) {
  const spot = L.pet[pet.spot];
  const petH = petHeightPct(spot);
  // ひとことは 出てきて 少しして消える（同じことばのあいだは出し直さない）
  const [pop, setPop] = useState<{ text: string; key: number; leaving: boolean } | null>(null);
  useEffect(() => {
    if (!pet.bubble) {
      setPop(null);
      return;
    }
    const key = Date.now();
    setPop({ text: pet.bubble, key, leaving: false });
    const leave = window.setTimeout(() => setPop((p) => (p?.key === key ? { ...p, leaving: true } : p)), POP_MS - POP_LEAVE_MS);
    const gone = window.setTimeout(() => setPop((p) => (p?.key === key ? null : p)), POP_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, [pet.bubble]);

  return (
    <div className={`stage-wrap ${compact ? 'stage-wrap--compact' : ''}`} style={{ '--stage-aspect': L.stageAspect, '--stage-fill': L.stageFill, '--floor-fill': L.floorFill } as CSSProperties}>
      <div className="stage-frame">
      <div className="stage" style={{ aspectRatio: String(L.stageAspect) }}>
        <div className="stage__layer stage__bg">
          <AssetImage def={ASSETS.room.background} cover decorative />
        </div>

        {SLOT_IDS.map((slot) => {
          const id = room[slot];
          if (!id) return null;
          const def = ASSETS.furniture[id];
          const isLanding = landed?.slot === slot;
          return (
            <div key={`${slot}-${id}-${isLanding ? landed!.seq : 0}`} className={`stage__item ${isLanding ? 'is-landing' : ''}`} style={place(L.slots[slot])} data-slot={slot}>
              <div className="art-box" style={{ aspectRatio: String(def.aspect ?? 1) }}>
                <AssetImage def={def} decorative />
              </div>
            </div>
          );
        })}

        {pet.prop === 'fridge' && (
          <div className="stage__item stage__prop" style={place(L.fridge)}>
            <div className="art-box" style={{ aspectRatio: String(ASSETS.room.fridge.aspect ?? 1) }}>
              <AssetImage def={ASSETS.room.fridge} decorative />
            </div>
          </div>
        )}

        <div className="stage__pet" style={{ ...place(spot), height: `${petH}%` }}>
          <button ref={petRef} type="button" className="pet-hit" onClick={onPetTap} aria-label={`${petLabel}をなでる`}>
            <PetSprite state={pet.visual} motion={pet.motion} motionKey={pet.motionKey} food={pet.eatingFood} cheek={pet.cheek} label={petLabel} />
          </button>

          {pet.prop === 'plate' && (
            <div className="stage__plate" style={{ left: `${50 + L.plate.dx}%`, bottom: `${L.plate.dbottom}%`, width: `${(L.plate.width / spot.width) * 100}%` }}>
              <div className="art-box" style={{ aspectRatio: String(ASSETS.room.plate.aspect ?? 1) }}>
                <AssetImage def={ASSETS.room.plate} decorative />
              </div>
            </div>
          )}

          {pet.eatingFood && <EatingFood food={pet.eatingFood} spotWidth={spot.width} motionKey={pet.motionKey} />}

          <div className="stage__fx" aria-hidden="true">
            {pet.effects.map((e) => (
              <span key={`${e}-${pet.motionKey}`} className={`fx fx--${e}`}>
                {(e === 'hearts' || e === 'sparkles' || e === 'crumbs' ? [0, 1, 2] : [0]).map((i) => (
                  <span key={i} className="fx__piece" style={{ '--i': i } as CSSProperties}>
                    <AssetImage def={ASSETS.deco[EFFECT_ART[e]]} decorative />
                  </span>
                ))}
              </span>
            ))}
          </div>

        </div>

        {/* 吹き出しは使わず 文字だけが相棒からポンと出て消える */}
        {pop && (
          <div
            key={pop.key}
            className={`pop-text ${pop.leaving ? 'is-leaving' : ''}`}
            style={{ left: `${Math.min(68, Math.max(32, spot.x))}%`, bottom: `${spot.bottom + petH + 2}%` }}
            aria-live="polite"
          >
            {pop.text}
          </div>
        )}

      </div>
      {children}
      </div>
    </div>
  );
}

function EatingFood({ food, spotWidth, motionKey }: { food: FoodId; spotWidth: number; motionKey: string }) {
  const def = ASSETS.food[food];
  const e = L.eatingFood;
  return (
    <div
      key={motionKey}
      className={`eating-food eating-food--${FOODS[food].reaction}`}
      style={{ left: `${50 + (e.dx / spotWidth) * 100}%`, bottom: `${e.dbottom}%`, width: `${(e.width / spotWidth) * 100}%` }}
    >
      <div className="art-box" style={{ aspectRatio: String(def.aspect ?? 1) }}>
        <AssetImage def={def} decorative />
      </div>
    </div>
  );
}
