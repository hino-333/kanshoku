import type { CSSProperties } from 'react';
import { ASSETS, type AssetDef, type PetVisualState } from '../config/assets.config';
import type { FoodId } from '../data/catalog';
import { AssetImage } from './AssetImage';

export type PetMotion =
  | 'idle'
  | 'tap'
  | 'lean'
  | 'search'
  | 'sigh'
  | 'peckish'
  | 'hungry'
  | 'flop'
  | 'rest'
  | 'eat-chomp'
  | 'eat-wobble'
  | 'eat-sip'
  | 'eat-hop'
  | 'eat-savor'
  | 'happy'
  | 'cheer'
  | 'none';

/** 状態に合う絵を選ぶ。差分がなければ通常の絵 */
export function resolvePetArt(state: PetVisualState, food?: FoodId | null): AssetDef {
  if (state === 'eating' && food && ASSETS.pet.eatingByFood[food]) return ASSETS.pet.eatingByFood[food]!;
  return ASSETS.pet.states[state] ?? ASSETS.pet.base;
}

interface Props {
  state: PetVisualState;
  motion?: PetMotion;
  /** 同じ動きをもう一度最初から再生したいときに変える */
  motionKey?: string | number;
  food?: FoodId | null;
  /** ほっぺのシール（例：おにぎりの海苔） */
  cheek?: FoodId | null;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/**
 * 相棒の表示。3つの層に分けて、transform が競合しないようにしている。
 *   .pet-sprite   … 配置（大きさ・縦横比。画面側が決める）
 *   .pet-motion   … 動き（CSSアニメーション。支点は設定ファイルの pivot）
 *   img           … 絵ごとの表示倍率・位置の微調整（設定ファイルの scale / offset）
 */
export function PetSprite({ state, motion = 'idle', motionKey, food, cheek, className, style, label }: Props) {
  const base = ASSETS.pet.base;
  const art = resolvePetArt(state, food);
  const cheekDef = cheek ? ASSETS.foodCheek[cheek] : undefined;
  const c = ASSETS.layout.cheek;
  return (
    <div
      className={`pet-sprite ${className ?? ''}`}
      style={{ aspectRatio: String(base.aspect ?? 1), ...style }}
      role="img"
      aria-label={label ?? base.alt}
      data-state={state}
    >
      <div
        key={motionKey}
        className={`pet-motion m-${motion}`}
        style={{ transformOrigin: `${(base.pivotX ?? 0.5) * 100}% ${(base.pivotY ?? 1) * 100}%` }}
      >
        <AssetImage def={art} fallback={base} decorative className="pet-art" />
        {cheekDef && (
          <span className="pet-cheek" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.width}%` }}>
            <AssetImage def={cheekDef} decorative />
          </span>
        )}
      </div>
    </div>
  );
}
