// ゲーム内のアイテム定義 ID は画像ファイル名と独立しているので 
// 絵を差し替えても所持数や記録は変わりません

export type Rarity = 'common' | 'special' | 'rare';

/** 食べ方の演出の種類（見た目の差分画像がなくても 外側の動きで表現する） */
export type EatReaction = 'chomp' | 'wobble' | 'sip' | 'hop' | 'savor';

export const FOOD_IDS = ['onigiri', 'pudding', 'soup', 'dango', 'taiyaki', 'omurice'] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export interface FoodDef {
  id: FoodId;
  name: string;
  rarity: Rarity;
  reaction: EatReaction;
  /** ごはんかごで選んだときのひとこと */
  pickLine: string;
  /** 食べている途中のひとこと */
  eatLine: string;
  /** 食べ終わりのひとこと */
  doneLine: string;
}

export const FOODS: Record<FoodId, FoodDef> = {
  onigiri: {
    id: 'onigiri',
    name: 'おにぎり',
    rarity: 'common',
    reaction: 'chomp',
    pickLine: 'おにぎり…！',
    eatLine: 'もぐもぐ',
    doneLine: 'ごちそうさま！のりついてる？',
  },
  pudding: {
    id: 'pudding',
    name: 'プリン',
    rarity: 'common',
    reaction: 'wobble',
    pickLine: 'ぷるぷるのやつだ',
    eatLine: 'ぷるん…',
    doneLine: 'ごちそうさま！からだまでぷるぷる',
  },
  soup: {
    id: 'soup',
    name: 'スープ',
    rarity: 'common',
    reaction: 'sip',
    pickLine: 'あったかいのいいね',
    eatLine: 'ふう…ふう…',
    doneLine: 'ごちそうさま！ほっとした',
  },
  dango: {
    id: 'dango',
    name: 'おだんご',
    rarity: 'special',
    reaction: 'hop',
    pickLine: '三つもある！',
    eatLine: 'ひとつ…ふたつ…',
    doneLine: 'ごちそうさま！みっつ食べた',
  },
  taiyaki: {
    id: 'taiyaki',
    name: 'たいやき',
    rarity: 'rare',
    reaction: 'hop',
    pickLine: 'しっぽまであんこかな',
    eatLine: 'はむっ',
    doneLine: 'ごちそうさま！しっぽまであった',
  },
  omurice: {
    id: 'omurice',
    name: 'オムライス',
    rarity: 'rare',
    reaction: 'savor',
    pickLine: 'とっておきだ…',
    eatLine: 'じっくり味わう…',
    doneLine: 'ごちそうさま！しあわせ',
  },
};

// 家具はひとつずつ決まった場所に置く（置き場所＝家具ひとつ）
// 絵は 1080×1920 の見本の部屋から切り出したもので 位置は assets.config.ts の layout.slots
export const SLOT_IDS = ['window', 'poster', 'clock', 'shelf', 'chest', 'plant', 'rug', 'cushion', 'table', 'bone', 'bowl', 'onigiri', 'carrot'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const SLOT_LABEL: Record<SlotId, string> = {
  window: 'まど',
  poster: 'ポスター',
  clock: '時計',
  shelf: '本だな',
  chest: '引き出し',
  plant: 'はちうえ',
  rug: 'ラグ',
  cushion: 'クッション',
  table: 'テーブル',
  bone: 'ほね',
  bowl: 'ごはん',
  onigiri: 'おにぎり',
  carrot: 'にんじん',
};

/** 模様替えのタブ（場所のまとまり） */
export const DECOR_GROUPS = [
  { id: 'wall', label: 'かべ', slots: ['window', 'poster', 'clock'] },
  { id: 'furniture', label: '家具', slots: ['shelf', 'chest', 'plant', 'cushion', 'table'] },
  { id: 'floor', label: 'ゆか', slots: ['rug', 'bone', 'bowl', 'onigiri', 'carrot'] },
] as const satisfies readonly { id: string; label: string; slots: readonly SlotId[] }[];

export const FURNITURE_IDS = [
  'window_white',
  'poster_kanshoku',
  'clock_flower',
  'shelf_books',
  'chest_wood',
  'plant_pot',
  'rug_round',
  'cushion_bean',
  'table_dots',
  'toy_bone',
  'bowl_rice',
  'onigiri_floor',
  'carrot_floor',
] as const;
export type FurnitureId = (typeof FURNITURE_IDS)[number];

export interface FurnitureDef {
  id: FurnitureId;
  slot: SlotId;
  name: string;
  /** 最初から持っているか */
  starter?: boolean;
}

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  window_white: { id: 'window_white', slot: 'window', name: 'しろいまど' },
  poster_kanshoku: { id: 'poster_kanshoku', slot: 'poster', name: '漢食のポスター' },
  clock_flower: { id: 'clock_flower', slot: 'clock', name: 'お花の時計' },
  shelf_books: { id: 'shelf_books', slot: 'shelf', name: '本だな' },
  chest_wood: { id: 'chest_wood', slot: 'chest', name: '引き出し' },
  plant_pot: { id: 'plant_pot', slot: 'plant', name: 'はちうえ' },
  rug_round: { id: 'rug_round', slot: 'rug', name: 'まるいラグ', starter: true },
  cushion_bean: { id: 'cushion_bean', slot: 'cushion', name: 'ビーズクッション', starter: true },
  table_dots: { id: 'table_dots', slot: 'table', name: '水玉のテーブル' },
  toy_bone: { id: 'toy_bone', slot: 'bone', name: 'ほねのおもちゃ' },
  bowl_rice: { id: 'bowl_rice', slot: 'bowl', name: 'ごはん茶わん' },
  onigiri_floor: { id: 'onigiri_floor', slot: 'onigiri', name: 'おにぎり' },
  carrot_floor: { id: 'carrot_floor', slot: 'carrot', name: 'にんじん' },
};

export const STARTER_FURNITURE = FURNITURE_IDS.filter((id) => FURNITURE[id].starter);

export function isFoodId(v: unknown): v is FoodId {
  return typeof v === 'string' && (FOOD_IDS as readonly string[]).includes(v);
}
export function isFurnitureId(v: unknown): v is FurnitureId {
  return typeof v === 'string' && (FURNITURE_IDS as readonly string[]).includes(v);
}
