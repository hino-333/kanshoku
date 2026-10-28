import { GAME, type Difficulty } from '../config/game.config';
import {
  FOOD_IDS,
  FURNITURE,
  SLOT_IDS,
  STARTER_FURNITURE,
  isFoodId,
  isFurnitureId,
  type FoodId,
  type SlotId,
} from '../data/catalog';
import { WORD_BY_ID } from '../data/words';
import { computeReward } from '../game/rewards';
import type { Action, ActiveRound, Answer, GameState, Tag, WordStat } from './types';
import { TAGS } from './types';

export const DEFAULT_PET_NAME = 'もち';

export function createInitialState(now: number): GameState {
  const foods = Object.fromEntries(FOOD_IDS.map((id) => [id, 0])) as Record<FoodId, number>;
  foods.onigiri = 1; // 最初のごはん
  return {
    version: 1,
    createdAt: now,
    onboarded: false,
    pet: { name: DEFAULT_PET_NAME, metAt: now, lastFedAt: null },
    recentSearches: [],
    meals: [],
    foods,
    furniture: [...STARTER_FURNITURE],
    room: {
      window: 'window_plain',
      wall: null,
      shelf: 'shelf_wood',
      rug: 'rug_round',
      cushion: 'cushion_butter',
      plant: null,
    },
    history: [],
    pocket: {},
    stats: {},
    play: {
      roundNo: 0,
      active: null,
      sinceFurniture: 0,
      completed: 0,
      claimed: [],
      lastReward: null,
      lastGame: 'match',
      lastDifficulty: 'normal',
    },
    settings: { sound: false, reduceMotion: 'system' },
  };
}

const emptyStat = (): WordStat => ({
  seen: 0,
  choiceOk: 0,
  choiceMiss: 0,
  writeOk: 0,
  writePractice: 0,
  writeMiss: 0,
  lastRound: 0,
  reviewFromRound: null,
});

function applyAnswerToStat(stat: WordStat, roundNo: number, answer: Answer): WordStat {
  const s = { ...stat, seen: stat.seen + 1, lastRound: roundNo };
  const due = s.reviewFromRound != null && roundNo >= s.reviewFromRound;
  if (answer.kind === 'choice') {
    if (answer.correct) {
      s.choiceOk++;
      if (due) s.reviewFromRound = null;
    } else {
      s.choiceMiss++;
      s.reviewFromRound = roundNo + 1;
    }
  } else if (answer.self === 'ok' && !answer.peeked) {
    s.writeOk++;
    if (due) s.reviewFromRound = null;
  } else if (answer.self === 'ok') {
    // 見本を見て書けたときは練習として記録し、書ける証拠には数えない
    s.writePractice++;
    if (s.reviewFromRound == null) s.reviewFromRound = roundNo + 1;
  } else {
    s.writeMiss++;
    s.reviewFromRound = roundNo + 1;
  }
  return s;
}

const cleanTags = (tags: Tag[]) => TAGS.filter((t) => tags.includes(t));

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'onboard': {
      const name = action.name?.trim();
      return { ...state, onboarded: true, pet: { ...state.pet, name: name ? name.slice(0, 12) : state.pet.name } };
    }
    case 'resetOnboarding':
      return { ...state, onboarded: false };
    case 'rename': {
      const name = action.name.trim().slice(0, 12);
      if (!name) return state;
      return { ...state, pet: { ...state.pet, name } };
    }
    case 'searched': {
      const history = [
        { query: action.query, wordId: action.wordId, at: action.at },
        ...state.history.filter((h) => h.query !== action.query && (!action.wordId || h.wordId !== action.wordId)),
      ].slice(0, GAME.limits.history);
      const recentSearches = [...state.recentSearches, action.at].slice(-GAME.limits.recentSearches);
      return { ...state, history, recentSearches };
    }
    case 'clearHistory':
      return { ...state, history: [] };
    case 'saveWord': {
      if (!WORD_BY_ID[action.wordId]) return state;
      const tags = cleanTags(action.tags);
      if (tags.length === 0) return state;
      const prev = state.pocket[action.wordId];
      return {
        ...state,
        pocket: {
          ...state.pocket,
          [action.wordId]: { tags, savedAt: prev?.savedAt ?? action.at, updatedAt: action.at },
        },
      };
    }
    case 'removeWord': {
      if (!state.pocket[action.wordId]) return state;
      const pocket = { ...state.pocket };
      delete pocket[action.wordId];
      return { ...state, pocket };
    }
    case 'feed': {
      // 同じ食事IDは一度だけ。所持数が0なら何もしない
      if (state.meals.some((m) => m.id === action.mealId)) return state;
      if ((state.foods[action.foodId] ?? 0) <= 0) return state;
      const meals = [...state.meals, { id: action.mealId, foodId: action.foodId, at: action.at }].slice(-GAME.limits.meals);
      const lastReward =
        state.play.lastReward && action.mealId === `reward:${state.play.lastReward.roundId}`
          ? { ...state.play.lastReward, fed: true }
          : state.play.lastReward;
      return {
        ...state,
        foods: { ...state.foods, [action.foodId]: state.foods[action.foodId] - 1 },
        meals,
        pet: { ...state.pet, lastFedAt: action.at },
        play: { ...state.play, lastReward },
      };
    }
    case 'place': {
      if (action.furnitureId !== null) {
        if (!state.furniture.includes(action.furnitureId)) return state;
        if (FURNITURE[action.furnitureId].slot !== action.slot) return state;
      }
      return { ...state, room: { ...state.room, [action.slot]: action.furnitureId } };
    }
    case 'startRound': {
      if (state.play.claimed.includes(action.round.id)) return state;
      return {
        ...state,
        play: {
          ...state.play,
          active: action.round,
          lastGame: action.round.game,
          lastDifficulty: action.round.difficulty,
        },
      };
    }
    case 'answer': {
      const r = state.play.active;
      if (!r || r.id !== action.roundId) return state;
      if (action.index < 0 || action.index >= r.questions.length || r.answers[action.index]) return state;
      const answers = r.answers.slice();
      answers[action.index] = action.answer;
      const wordId = r.questions[action.index].wordId;
      const stats = { ...state.stats, [wordId]: applyAnswerToStat(state.stats[wordId] ?? emptyStat(), r.no, action.answer) };
      return { ...state, stats, play: { ...state.play, active: { ...r, answers } } };
    }
    case 'abandonRound': {
      const r = state.play.active;
      if (!r || r.id !== action.roundId) return state;
      return { ...state, play: { ...state.play, active: null } };
    }
    case 'finishRound': {
      // 報酬はラウンドごとに一度だけ
      const r = state.play.active;
      if (state.play.claimed.includes(action.roundId)) return state;
      if (!r || r.id !== action.roundId || r.answers.some((a) => a === null)) return state;
      const reward = computeReward(state, r, action.at);
      const foods = { ...state.foods };
      foods[reward.foodId] = (foods[reward.foodId] ?? 0) + 1;
      if (reward.bonusFoodId) foods[reward.bonusFoodId] = (foods[reward.bonusFoodId] ?? 0) + 1;
      const furniture = reward.furnitureId ? [...state.furniture, reward.furnitureId] : state.furniture;
      return {
        ...state,
        foods,
        furniture,
        play: {
          ...state.play,
          roundNo: Math.max(state.play.roundNo, r.no),
          active: null,
          completed: state.play.completed + 1,
          sinceFurniture: reward.furnitureId ? 0 : state.play.sinceFurniture + 1,
          claimed: [...state.play.claimed, r.id].slice(-GAME.limits.claimedRounds),
          lastReward: reward,
        },
      };
    }
    case 'setSetting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case 'wipe':
      return { ...createInitialState(action.at), onboarded: true };
    default:
      return state;
  }
}

// ------------------------------------------------------------ 読み込み時の検証

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const isDiff = (v: unknown): v is Difficulty => v === 'easy' || v === 'normal' || v === 'hard';

/**
 * 保存データを検証して、足りない項目は初期値で補う。
 * 形が壊れている項目だけを初期値に戻し、ほかの記録は残す。
 */
export function sanitize(raw: unknown, now: number): GameState {
  const base = createInitialState(now);
  if (!isObj(raw)) throw new Error('save data is not an object');
  const s: GameState = { ...base, onboarded: raw.onboarded === true, createdAt: num(raw.createdAt, now) };

  if (isObj(raw.pet)) {
    s.pet = {
      name: typeof raw.pet.name === 'string' && raw.pet.name.trim() ? raw.pet.name.slice(0, 12) : base.pet.name,
      metAt: num(raw.pet.metAt, s.createdAt),
      lastFedAt: typeof raw.pet.lastFedAt === 'number' ? raw.pet.lastFedAt : null,
    };
  }
  if (Array.isArray(raw.recentSearches)) s.recentSearches = raw.recentSearches.filter((t): t is number => typeof t === 'number');
  if (Array.isArray(raw.meals)) {
    s.meals = raw.meals.filter(
      (m): m is GameState['meals'][number] => isObj(m) && typeof m.id === 'string' && isFoodId(m.foodId) && typeof m.at === 'number',
    );
  }
  if (isObj(raw.foods)) {
    const foods = { ...base.foods };
    for (const id of FOOD_IDS) foods[id] = Math.max(0, Math.floor(num(raw.foods[id], 0)));
    s.foods = foods;
  }
  if (Array.isArray(raw.furniture)) {
    const owned = new Set([...STARTER_FURNITURE, ...raw.furniture.filter(isFurnitureId)]);
    s.furniture = [...owned];
  }
  if (isObj(raw.room)) {
    const room = { ...base.room };
    for (const slot of SLOT_IDS) {
      const v = raw.room[slot];
      if (v === null) room[slot] = null;
      else if (isFurnitureId(v) && s.furniture.includes(v) && FURNITURE[v].slot === slot) room[slot as SlotId] = v;
    }
    s.room = room;
  }
  if (Array.isArray(raw.history)) {
    s.history = raw.history
      .filter((h): h is GameState['history'][number] => isObj(h) && typeof h.query === 'string' && typeof h.at === 'number')
      .map((h) => ({ query: h.query, at: h.at, wordId: typeof h.wordId === 'string' ? h.wordId : null }))
      .slice(0, GAME.limits.history);
  }
  if (isObj(raw.pocket)) {
    for (const [id, e] of Object.entries(raw.pocket)) {
      if (!WORD_BY_ID[id] || !isObj(e) || !Array.isArray(e.tags)) continue;
      const tags = cleanTags(e.tags as Tag[]);
      if (tags.length) s.pocket[id] = { tags, savedAt: num(e.savedAt, now), updatedAt: num(e.updatedAt, now) };
    }
  }
  if (isObj(raw.stats)) {
    for (const [id, st] of Object.entries(raw.stats)) {
      if (!WORD_BY_ID[id] || !isObj(st)) continue;
      const e = emptyStat();
      s.stats[id] = {
        seen: num(st.seen, 0),
        choiceOk: num(st.choiceOk, 0),
        choiceMiss: num(st.choiceMiss, 0),
        writeOk: num(st.writeOk, 0),
        writePractice: num(st.writePractice, 0),
        writeMiss: num(st.writeMiss, 0),
        lastRound: num(st.lastRound, e.lastRound),
        reviewFromRound: typeof st.reviewFromRound === 'number' ? st.reviewFromRound : null,
      };
    }
  }
  if (isObj(raw.play)) {
    const p = raw.play;
    s.play = {
      ...base.play,
      roundNo: num(p.roundNo, 0),
      sinceFurniture: num(p.sinceFurniture, 0),
      completed: num(p.completed, 0),
      claimed: Array.isArray(p.claimed) ? p.claimed.filter((c): c is string => typeof c === 'string') : [],
      lastGame: p.lastGame === 'write' ? 'write' : 'match',
      lastDifficulty: isDiff(p.lastDifficulty) ? p.lastDifficulty : 'normal',
      active: sanitizeRound(p.active),
      lastReward: sanitizeReward(p.lastReward),
    };
  }
  if (isObj(raw.settings)) {
    s.settings = {
      sound: raw.settings.sound === true,
      reduceMotion: raw.settings.reduceMotion === 'on' || raw.settings.reduceMotion === 'off' ? raw.settings.reduceMotion : 'system',
    };
  }
  return s;
}

function sanitizeRound(v: unknown): ActiveRound | null {
  if (!isObj(v) || typeof v.id !== 'string' || !Array.isArray(v.questions) || !Array.isArray(v.answers)) return null;
  if (v.questions.length === 0 || v.questions.length !== v.answers.length) return null;
  const okQ = v.questions.every((q) => isObj(q) && typeof q.wordId === 'string' && WORD_BY_ID[q.wordId as string]);
  if (!okQ || (v.game !== 'write' && v.game !== 'match') || !isDiff(v.difficulty)) return null;
  return v as unknown as ActiveRound;
}

function sanitizeReward(v: unknown): GameState['play']['lastReward'] {
  if (!isObj(v) || typeof v.roundId !== 'string' || !isFoodId(v.foodId)) return null;
  return {
    roundId: v.roundId,
    game: v.game === 'write' ? 'write' : 'match',
    difficulty: isDiff(v.difficulty) ? v.difficulty : 'normal',
    foodId: v.foodId,
    bonusFoodId: isFoodId(v.bonusFoodId) ? v.bonusFoodId : null,
    furnitureId: isFurnitureId(v.furnitureId) ? v.furnitureId : null,
    wordIds: Array.isArray(v.wordIds) ? v.wordIds.filter((w): w is string => typeof w === 'string') : [],
    drawings: Array.isArray(v.drawings) ? v.drawings.map((d) => (typeof d === 'string' ? d : null)) : [],
    at: num(v.at, 0),
    fed: v.fed === true,
  };
}
