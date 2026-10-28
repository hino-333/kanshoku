// ============================================================
//  漢食  イラスト素材の設定ファイル（差し替えはここだけ）
// ============================================================
//  ・画像は public/assets/ に置きます。
//  ・同じ名前のファイルで上書きするか、下の src を書き換えると、新しい絵が反映されます。
//  ・画面のプログラムや、ごはん・家具の所持数の処理を直す必要はありません。
//  ・くわしい手順は docs/ASSETS_GUIDE.md を見てください。
//
//  各項目で使える値
//    src      画像の場所（public/ から見たパス）。png / webp / svg が使えます
//    aspect   画像の「横 ÷ 縦」。表示枠の形を決めます（例: 横480・縦420 なら 480/420）
//    scale    枠の中での表示倍率（1 = 枠いっぱい）
//    offsetX  横位置の微調整（枠の幅に対する %。プラスで右へ）
//    offsetY  縦位置の微調整（枠の高さに対する %。プラスで下へ）
//    pivotX   動きの支点（0 = 左端、0.5 = 中央、1 = 右端）
//    pivotY   動きの支点（0 = 上端、1 = 下端 = 足元）
//    alt      画面読み上げ用の短い説明
// ============================================================

import type { FoodId, FurnitureId } from '../data/catalog';

export interface AssetDef {
  src: string;
  aspect?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  pivotX?: number;
  pivotY?: number;
  alt?: string;
}

/** 相棒の状態（ゲームの状態名。画像ファイル名とは独立） */
export type PetVisualState =
  | 'idle' // 通常
  | 'blink' // まばたき
  | 'tap' // タップへの反応
  | 'lean' // ごはんを選んだときの反応
  | 'search' // 検索のお手伝い
  | 'sigh' // ひと息
  | 'peckish' // 小腹が空いた（お皿を抱える）
  | 'hungry' // 冷蔵庫をのぞく
  | 'flop' // クッションでへにゃっと
  | 'rest' // 休憩
  | 'eating' // 食事中
  | 'happy'; // ごきげん

/** 部屋の中での配置（ステージの幅・高さに対する %） */
export interface Placement {
  /** 中心の横位置（%） */
  x: number;
  /** 下端の位置（ステージの下からの %） */
  bottom: number;
  /** 幅（ステージの幅に対する %） */
  width: number;
  /** 重なり順（大きいほど手前） */
  z: number;
}

const A = 'assets/';

export const ASSETS = {
  // ---------------------------------------------------------- 相棒
  pet: {
    /** 必須：通常の絵。ほかの状態の絵がないときは、これを使います */
    base: { src: A + 'character/normal.svg', aspect: 240 / 210, pivotX: 0.5, pivotY: 1, alt: '相棒のねこ' },
    /** 任意：状態ごとの差分。書いていない状態は base で表示し、動きだけで表現します */
    states: {
      blink: { src: A + 'character/blink.svg', aspect: 240 / 210 },
      // tap:     { src: A + 'character/tap.png',     aspect: 240 / 210 },
      // search:  { src: A + 'character/search.png',  aspect: 240 / 210 },
      // sigh:    { src: A + 'character/sigh.png',    aspect: 240 / 210 },
      // peckish: { src: A + 'character/peckish.png', aspect: 240 / 210 },
      // hungry:  { src: A + 'character/hungry.png',  aspect: 240 / 210 },
      // flop:    { src: A + 'character/flop.png',    aspect: 240 / 210 },
      // rest:    { src: A + 'character/rest.png',    aspect: 240 / 210 },
      // eating:  { src: A + 'character/eating.png',  aspect: 240 / 210 },
      // happy:   { src: A + 'character/happy.png',   aspect: 240 / 210 },
    } as Partial<Record<PetVisualState, AssetDef>>,
    /** 任意：ごはんごとの専用の食事画像（例: おにぎりを両手で抱える絵） */
    eatingByFood: {
      // onigiri: { src: A + 'character/eat-onigiri.png', aspect: 240 / 210 },
    } as Partial<Record<FoodId, AssetDef>>,
  },

  // ---------------------------------------------------------- ごはん
  food: {
    onigiri: { src: A + 'food/onigiri.svg', aspect: 1, alt: 'おにぎり' },
    pudding: { src: A + 'food/pudding.svg', aspect: 1, alt: 'プリン' },
    soup: { src: A + 'food/soup.svg', aspect: 1, alt: 'スープ' },
    dango: { src: A + 'food/dango.svg', aspect: 1, alt: 'おだんご' },
    taiyaki: { src: A + 'food/taiyaki.svg', aspect: 1, alt: 'たいやき' },
    omurice: { src: A + 'food/omurice.svg', aspect: 1, alt: 'オムライス' },
  } satisfies Record<FoodId, AssetDef>,

  /** 食べたあとに相棒のほっぺに付くシールなど（任意） */
  foodCheek: {
    onigiri: { src: A + 'deco/nori.svg', aspect: 1, alt: 'ほっぺの海苔' },
  } as Partial<Record<FoodId, AssetDef>>,

  // ---------------------------------------------------------- 家具
  furniture: {
    window_plain: { src: A + 'furniture/window-plain.svg', aspect: 1, alt: 'まど' },
    window_curtain: { src: A + 'furniture/window-curtain.svg', aspect: 1, alt: 'カーテンのまど' },
    wall_garland: { src: A + 'furniture/wall-garland.svg', aspect: 2, alt: 'ガーランド' },
    wall_clock: { src: A + 'furniture/wall-clock.svg', aspect: 1, alt: '時計' },
    shelf_wood: { src: A + 'furniture/shelf-wood.svg', aspect: 0.8, alt: '木のたな' },
    shelf_books: { src: A + 'furniture/shelf-books.svg', aspect: 0.8, alt: '本だな' },
    rug_round: { src: A + 'furniture/rug-round.svg', aspect: 3, alt: 'まるいラグ' },
    rug_square: { src: A + 'furniture/rug-square.svg', aspect: 3, alt: 'チェックのラグ' },
    cushion_butter: { src: A + 'furniture/cushion-butter.svg', aspect: 1.6, alt: 'クッション' },
    cushion_cloud: { src: A + 'furniture/cushion-cloud.svg', aspect: 1.6, alt: 'くもクッション' },
    plant_pothos: { src: A + 'furniture/plant-pothos.svg', aspect: 0.7, alt: 'ポトス' },
    plant_cactus: { src: A + 'furniture/plant-cactus.svg', aspect: 0.7, alt: 'サボテン' },
  } satisfies Record<FurnitureId, AssetDef>,

  // ---------------------------------------------------------- 部屋・小物
  room: {
    /** 壁と床の背景（透過なしでOK・縦長 3:4） */
    background: { src: A + 'room/background.svg', aspect: 3 / 4, alt: '' },
    /** 小腹がすいたときに抱えるお皿 */
    plate: { src: A + 'room/prop-plate.svg', aspect: 1.6, alt: 'からっぽのお皿' },
    /** おなかがすいたときにのぞく冷蔵庫 */
    fridge: { src: A + 'room/prop-fridge.svg', aspect: 0.6, alt: '冷蔵庫' },
  },

  // ---------------------------------------------------------- 装飾・演出
  deco: {
    sparkle: { src: A + 'deco/sparkle.svg', aspect: 1, alt: '' },
    heart: { src: A + 'deco/heart.svg', aspect: 1, alt: '' },
    steam: { src: A + 'deco/steam.svg', aspect: 0.6, alt: '' },
    zzz: { src: A + 'deco/zzz.svg', aspect: 1, alt: '' },
    puff: { src: A + 'deco/puff.svg', aspect: 1.4, alt: '' },
    magnifier: { src: A + 'deco/magnifier.svg', aspect: 1, alt: '' },
    pot: { src: A + 'deco/pot.svg', aspect: 1.5, alt: 'おなべ' },
    pocket: { src: A + 'deco/pocket.svg', aspect: 1.1, alt: 'あつめた漢字' },
    /** ごはんかごで「ドラッグしてね」と見せる手 */
    hand: { src: A + 'deco/hand.svg', aspect: 1, alt: '' },
  },

  // ---------------------------------------------------------- 料理の材料（遊びの進み具合に1問ずつ並ぶ）
  // 背景に溶けないよう 色のはっきりした食べ物にする（白い食べ物は避ける）
  ingredients: [
    { src: A + 'deco/carrot.svg', aspect: 1, alt: 'にんじん' },
    { src: A + 'deco/tomato.svg', aspect: 1, alt: 'トマト' },
    { src: A + 'deco/broccoli.svg', aspect: 1, alt: 'ブロッコリー' },
  ] as AssetDef[],

  // ---------------------------------------------------------- 部屋の配置
  // 部屋（ステージ）は 横3:縦4。数値はステージに対する % です。
  layout: {
    stageAspect: 3 / 4,
    /** 画面が縦長で部屋の上にすき間ができたときの壁の色（背景画像の上端の色に合わせる） */
    stageFill: '#DDF2F9',
    /** 部屋の下の床の色（ナビの下まで床をのばす） */
    floorFill: '#F3E7CF',
    slots: {
      window: { x: 30, bottom: 55, width: 38, z: 1 },
      wall: { x: 75, bottom: 74, width: 26, z: 1 },
      shelf: { x: 80, bottom: 33, width: 30, z: 2 },
      rug: { x: 50, bottom: 6, width: 84, z: 2 },
      cushion: { x: 21, bottom: 13, width: 30, z: 3 },
      plant: { x: 88, bottom: 9, width: 18, z: 8 },
    } as Record<string, Placement>,
    /** 相棒の立ち位置（状態によって移動します） */
    pet: {
      default: { x: 54, bottom: 14, width: 40, z: 5 },
      fridge: { x: 36, bottom: 22, width: 36, z: 5 },
      cushion: { x: 24, bottom: 15, width: 38, z: 5 },
    } as Record<'default' | 'fridge' | 'cushion', Placement>,
    /** 食べているごはんの位置（相棒の立ち位置からのずれ） */
    eatingFood: { dx: 13, dbottom: 4, width: 15 },
    /** お皿・冷蔵庫 */
    plate: { dx: 2, dbottom: 1, width: 17 },
    fridge: { x: 12, bottom: 30, width: 20, z: 3 } as Placement,
    /** ほっぺのシール（相棒の枠に対する %） */
    cheek: { x: 70, y: 69, width: 12 },
  },
};

export type DecoKey = keyof typeof ASSETS.deco;
