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
const R = A + 'room2/';

export const ASSETS = {
  // ---------------------------------------------------------- 相棒
  pet: {
    /** 必須：通常の絵。ほかの状態の絵がないときは、これを使います */
    // 相棒の犬（ユーザーの絵 余白を切り取って3枚とも同じキャンバス 257×252・足元を下にそろえてある）
    base: { src: A + 'character/dog-normal.webp', aspect: 257 / 252, pivotX: 0.5, pivotY: 1, alt: 'パートナーのいぬ' },
    /** 任意：状態ごとの差分。書いていない状態は base で表示し、動きだけで表現します */
    states: {
      // ぐったり寝転ぶ絵は おなかがすいたとき（flop）と 休憩（rest）に使う
      flop: { src: A + 'character/dog-flop.webp', aspect: 257 / 252 },
      rest: { src: A + 'character/dog-flop.webp', aspect: 257 / 252 },
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
      onigiri: { src: A + 'character/dog-eat-onigiri.webp', aspect: 257 / 252 },
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
    // onigiri: { src: A + 'deco/nori.svg', aspect: 1, alt: 'ほっぺの海苔' },
  } as Partial<Record<FoodId, AssetDef>>,

  // ---------------------------------------------------------- 家具
  // 部屋の絵（1080×1920 の見本の部屋から切り出し 余白なし）
  furniture: {
    window_white: { src: R + 'window.webp', aspect: 310 / 307, alt: 'しろいまど' },
    poster_kanshoku: { src: R + 'poster.webp', aspect: 252 / 238, alt: '漢食のポスター' },
    clock_flower: { src: R + 'clock.webp', aspect: 161 / 152, alt: 'お花の時計' },
    shelf_books: { src: R + 'shelf.webp', aspect: 463 / 224, alt: '本だな' },
    chest_wood: { src: R + 'chest.webp', aspect: 262 / 352, alt: '引き出し' },
    plant_pot: { src: R + 'plant.webp', aspect: 76 / 172, alt: 'はちうえ' },
    rug_round: { src: R + 'rug.webp', aspect: 883 / 346, alt: 'まるいラグ' },
    cushion_bean: { src: R + 'cushion.webp', aspect: 351 / 210, alt: 'ビーズクッション' },
    table_dots: { src: R + 'table.webp', aspect: 405 / 241, alt: '水玉のテーブル' },
    toy_bone: { src: R + 'bone.webp', aspect: 108 / 59, alt: 'ほねのおもちゃ' },
    bowl_rice: { src: R + 'bowl.webp', aspect: 124 / 120, alt: 'ごはん茶わん' },
    onigiri_floor: { src: R + 'onigiri.webp', aspect: 92 / 82, alt: 'おにぎり' },
    carrot_floor: { src: R + 'carrot.webp', aspect: 146 / 65, alt: 'にんじん' },
  } satisfies Record<FurnitureId, AssetDef>,

  // ---------------------------------------------------------- 部屋・小物
  room: {
    /** 壁と床の背景（透過なし・縦長 9:16 の 1080×1920） */
    background: { src: R + 'background.webp', aspect: 9 / 16, alt: '' },
    /** 小腹がすいたときに抱えるお皿 */
    plate: { src: A + 'room/prop-plate.svg', aspect: 1.6, alt: 'からっぽのお皿' },
    /** おなかがすいたときにのぞく冷蔵庫 */
    fridge: { src: A + 'room/prop-fridge.svg', aspect: 0.6, alt: '冷蔵庫' },
  },

  // ---------------------------------------------------------- 装飾・演出
  deco: {
    /** 漢字を書く画面のまな板の木目（真ん中の板とつなぎ目もふくむ） */
    boardGrain: { src: A + 'kitchen/board-grain.svg', aspect: 354 / 338, alt: '' },
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

  // ---------------------------------------------------------- 画面に顔を出す人たち（あつめた漢字 Figma 06 改善案）
  /** アプリのロゴ（はじめての画面と 大きい画面の左に出す） */
  logo: { src: A + 'logo.svg', aspect: 650 / 560, alt: '漢食' },

  people: {
    /** 見出しの帯の右で 検索欄のふちにちょこんと座るおじさん */
    ojisan: { src: A + 'people/ojisan.webp', aspect: 213 / 247, alt: '' },
    /** おさそいカードでおにぎりを食べるハムスター */
    hamster: { src: A + 'people/hamster-onigiri.webp', aspect: 215 / 216, alt: '' },
    /** あそぶ画面の難しさのカードに座るフクロウ（やさしい ふつう むずかしい の順） */
    owlEasy: { src: A + 'people/owl.webp', aspect: 237 / 239, alt: '' },
    owlNormal: { src: A + 'people/owl-onigiri.webp', aspect: 234 / 251, alt: '' },
    owlHard: { src: A + 'people/owl-sleepy.webp', aspect: 276 / 220, alt: '' },
    /** 「答えをえらぶ」のカードに座るハムスター（ふつうは上の hamster を使う） */
    hamsterEasy: { src: A + 'people/hamster.webp', aspect: 200 / 209, alt: '' },
    hamsterHard: { src: A + 'people/hamster-dizzy.webp', aspect: 249 / 215, alt: '' },
    /** （前の絵）見出しの帯から顔を出すおじさん */
    salaryman: { src: A + 'people/salaryman.png', aspect: 240 / 248, alt: '' },
    salarymanHand: { src: A + 'people/salaryman-hand.png', aspect: 1, alt: '' },
    /** おさそいカードでおやつを食べている子 */
    snackBoy: { src: A + 'people/snack-boy.png', aspect: 200 / 250, alt: '' },
  },

  // ---------------------------------------------------------- 料理の材料（遊びの進み具合に1問ずつ並ぶ）
  // 背景に溶けないよう 色のはっきりした食べ物にする（白い食べ物は避ける）
  ingredients: [
    { src: A + 'deco/carrot.svg', aspect: 1, alt: 'にんじん' },
    { src: A + 'deco/tomato.svg', aspect: 1, alt: 'トマト' },
    { src: A + 'deco/broccoli.svg', aspect: 1, alt: 'ブロッコリー' },
  ] as AssetDef[],

  // ---------------------------------------------------------- 部屋の配置
  // 部屋（ステージ）は 横9:縦16。数値はステージに対する % です。
  layout: {
    stageAspect: 9 / 16,
    /** 画面が縦長で部屋の上にすき間ができたときの壁の色（背景画像の上端の色に合わせる） */
    stageFill: '#D6F0FA',
    /** 部屋の下の床の色（ナビの下まで床をのばす） */
    floorFill: '#EBE0D6',
    // 見本の部屋（1080×1920）と同じ位置
    slots: {
      window: { x: 30, bottom: 64.9, width: 28.7, z: 1 },
      poster: { x: 81.6, bottom: 73.6, width: 23.3, z: 1 },
      clock: { x: 52.8, bottom: 86.6, width: 14.9, z: 1 },
      shelf: { x: 24.6, bottom: 40.2, width: 42.9, z: 2 },
      chest: { x: 76.9, bottom: 39.9, width: 24.3, z: 2 },
      plant: { x: 83, bottom: 58, width: 7, z: 3 },
      rug: { x: 49.6, bottom: 16, width: 81.8, z: 2 },
      cushion: { x: 24.1, bottom: 27.8, width: 32.5, z: 3 },
      table: { x: 80.4, bottom: 10.5, width: 37.5, z: 6 },
      bone: { x: 76.8, bottom: 33, width: 10, z: 3 },
      bowl: { x: 87.4, bottom: 24.6, width: 11.5, z: 3 },
      onigiri: { x: 19.5, bottom: 12.2, width: 8.5, z: 6 },
      carrot: { x: 77.5, bottom: 3.1, width: 13.5, z: 6 },
    } as Record<string, Placement>,
    /** 相棒の立ち位置（状態によって移動します） */
    pet: {
      default: { x: 50, bottom: 24, width: 22, z: 5 },
      fridge: { x: 36, bottom: 26, width: 22, z: 5 },
      cushion: { x: 25, bottom: 28, width: 24, z: 5 },
    } as Record<'default' | 'fridge' | 'cushion', Placement>,
    /** 食べているごはんの位置（相棒の立ち位置からのずれ） */
    eatingFood: { dx: 7, dbottom: 2, width: 8 },
    /** お皿・冷蔵庫 */
    plate: { dx: 1, dbottom: 0.5, width: 9 },
    fridge: { x: 12, bottom: 36, width: 18, z: 3 } as Placement,
    /** ほっぺのシール（相棒の枠に対する %） */
    cheek: { x: 70, y: 69, width: 12 },
  },
};

export type DecoKey = keyof typeof ASSETS.deco;
