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

export const SLOT_IDS = ['window', 'wall', 'shelf', 'rug', 'cushion', 'plant'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export const SLOT_LABEL: Record<SlotId, string> = {
  window: 'まど',
  wall: 'かべ',
  shelf: 'たな',
  rug: 'ラグ',
  cushion: 'クッション',
  plant: 'グリーン',
};

/** 何も置かない選択ができる場所 */
export const OPTIONAL_SLOTS: SlotId[] = ['wall', 'plant'];

export const FURNITURE_IDS = [
  'window_plain',
  'window_curtain',
  'wall_garland',
  'wall_clock',
  'shelf_wood',
  'shelf_books',
  'rug_round',
  'rug_square',
  'cushion_butter',
  'cushion_cloud',
  'plant_pothos',
  'plant_cactus',
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
  window_plain: { id: 'window_plain', slot: 'window', name: 'まどべ', starter: true },
  window_curtain: { id: 'window_curtain', slot: 'window', name: 'ミントのカーテン' },
  wall_garland: { id: 'wall_garland', slot: 'wall', name: 'ガーランド' },
  wall_clock: { id: 'wall_clock', slot: 'wall', name: 'まるい時計' },
  shelf_wood: { id: 'shelf_wood', slot: 'shelf', name: '木のたな', starter: true },
  shelf_books: { id: 'shelf_books', slot: 'shelf', name: '本だな' },
  rug_round: { id: 'rug_round', slot: 'rug', name: 'まるいラグ', starter: true },
  rug_square: { id: 'rug_square', slot: 'rug', name: 'チェックのラグ' },
  cushion_butter: { id: 'cushion_butter', slot: 'cushion', name: 'バタークッション', starter: true },
  cushion_cloud: { id: 'cushion_cloud', slot: 'cushion', name: 'くもクッション' },
  plant_pothos: { id: 'plant_pothos', slot: 'plant', name: 'ポトス' },
  plant_cactus: { id: 'plant_cactus', slot: 'plant', name: 'サボテン' },
};

export const STARTER_FURNITURE = FURNITURE_IDS.filter((id) => FURNITURE[id].starter);

export function isFoodId(v: unknown): v is FoodId {
  return typeof v === 'string' && (FOOD_IDS as readonly string[]).includes(v);
}
export function isFurnitureId(v: unknown): v is FurnitureId {
  return typeof v === 'string' && (FURNITURE_IDS as readonly string[]).includes(v);
}
