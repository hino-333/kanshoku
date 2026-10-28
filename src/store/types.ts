import type { Difficulty } from '../config/game.config';
import type { FoodId, FurnitureId, SlotId } from '../data/catalog';

export type Tag = 'read' | 'write' | 'meaning';
export const TAGS: Tag[] = ['read', 'write', 'meaning'];
export const TAG_LABEL: Record<Tag, string> = { read: '読み', write: '書き', meaning: '意味' };

export interface PocketEntry {
  tags: Tag[];
  savedAt: number;
  updatedAt: number;
}

export interface WordStat {
  seen: number;
  choiceOk: number;
  choiceMiss: number;
  writeOk: number;
  /** 見本を見てから書けた（書ける証拠としては数えない） */
  writePractice: number;
  writeMiss: number;
  lastRound: number;
  /** つまずいた言葉を、このラウンド番号以降に再登場させる */
  reviewFromRound: number | null;
}

export type GameKind = 'write' | 'match';

export type Question =
  | { kind: 'write'; wordId: string; blanks: number[] }
  | { kind: 'reading'; wordId: string; options: string[]; answer: string }
  | { kind: 'meaning'; wordId: string; options: string[]; answer: string };

export type SelfCheck = 'ok' | 'unsure' | 'ng';

export type Answer =
  | { kind: 'choice'; choice: string; correct: boolean }
  | { kind: 'write'; self: SelfCheck; peeked: boolean; hints: number; drawing: string | null };

export interface ActiveRound {
  id: string;
  no: number;
  game: GameKind;
  difficulty: Difficulty;
  questions: Question[];
  answers: (Answer | null)[];
  startedAt: number;
}

export interface RewardRecord {
  roundId: string;
  game: GameKind;
  difficulty: Difficulty;
  foodId: FoodId;
  bonusFoodId: FoodId | null;
  furnitureId: FurnitureId | null;
  wordIds: string[];
  drawings: (string | null)[];
  at: number;
  fed: boolean;
}

export interface Meal {
  id: string;
  foodId: FoodId;
  at: number;
}

export interface HistoryItem {
  query: string;
  wordId: string | null;
  at: number;
}

export interface GameState {
  version: 1;
  createdAt: number;
  onboarded: boolean;
  pet: { name: string; metAt: number; lastFedAt: number | null };
  recentSearches: number[];
  meals: Meal[];
  foods: Record<FoodId, number>;
  furniture: FurnitureId[];
  room: Record<SlotId, FurnitureId | null>;
  history: HistoryItem[];
  pocket: Record<string, PocketEntry>;
  stats: Record<string, WordStat>;
  play: {
    roundNo: number;
    active: ActiveRound | null;
    sinceFurniture: number;
    completed: number;
    claimed: string[];
    lastReward: RewardRecord | null;
    lastGame: GameKind;
    lastDifficulty: Difficulty;
  };
  settings: { sound: boolean; reduceMotion: 'system' | 'on' | 'off' };
}

export type Action =
  | { type: 'onboard'; name?: string; at: number }
  | { type: 'resetOnboarding' }
  | { type: 'rename'; name: string }
  | { type: 'searched'; query: string; wordId: string | null; at: number }
  | { type: 'clearHistory' }
  | { type: 'saveWord'; wordId: string; tags: Tag[]; at: number }
  | { type: 'removeWord'; wordId: string }
  | { type: 'feed'; foodId: FoodId; mealId: string; at: number }
  | { type: 'place'; slot: SlotId; furnitureId: FurnitureId | null }
  | { type: 'startRound'; round: ActiveRound }
  | { type: 'answer'; roundId: string; index: number; answer: Answer }
  | { type: 'abandonRound'; roundId: string }
  | { type: 'finishRound'; roundId: string; at: number }
  | { type: 'setSetting'; key: 'sound'; value: boolean }
  | { type: 'setSetting'; key: 'reduceMotion'; value: 'system' | 'on' | 'off' }
  | { type: 'wipe'; at: number };
