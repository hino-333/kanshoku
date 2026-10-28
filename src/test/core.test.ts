import { describe, expect, it } from 'vitest';
import { GAME } from '../config/game.config';
import { searchWords, normalizeQuery } from '../dictionary/provider';
import { KANJI, WORDS, isKanji } from '../data/words';
import { buildRound, writeBlanks } from '../game/questions';
import { seeded } from '../game/rng';
import { hungerOf, fatigueOf } from '../game/pet';
import { createInitialState, reducer } from '../store/reducer';
import { createStore, loadState, STORAGE_KEY, type KeyValueStorage } from '../store/store';
import type { Answer, GameState } from '../store/types';

const T0 = Date.UTC(2026, 9, 27, 3, 0, 0);

class MemStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

function playRound(state: GameState, game: 'write' | 'match', at: number, answer: (i: number) => Answer) {
  const round = buildRound(state, { game, difficulty: 'normal', at, rng: seeded(at) });
  let s = reducer(state, { type: 'startRound', round });
  round.questions.forEach((_, i) => {
    s = reducer(s, { type: 'answer', roundId: round.id, index: i, answer: answer(i) });
  });
  return { s, round };
}

const okChoice: Answer = { kind: 'choice', choice: 'x', correct: true };

describe('報酬', () => {
  it('同じラウンドの報酬は一度だけ付与される', () => {
    const { s, round } = playRound(createInitialState(T0), 'match', T0 + 1, () => okChoice);
    const once = reducer(s, { type: 'finishRound', roundId: round.id, at: T0 + 2 });
    const twice = reducer(once, { type: 'finishRound', roundId: round.id, at: T0 + 3 });
    const total = (st: GameState) => Object.values(st.foods).reduce((a, b) => a + b, 0);
    expect(total(once)).toBeGreaterThanOrEqual(total(s) + 1);
    expect(twice).toBe(once);
    // 終わったラウンドを再開しようとしても無視される（戻る操作・再読み込み対策）
    expect(reducer(once, { type: 'startRound', round })).toBe(once);
  });

  it('未回答の問題があると完了できない', () => {
    const state = createInitialState(T0);
    const round = buildRound(state, { game: 'match', difficulty: 'easy', at: T0, rng: seeded(1) });
    const s = reducer(state, { type: 'startRound', round });
    expect(reducer(s, { type: 'finishRound', roundId: round.id, at: T0 })).toBe(s);
  });

  it('報酬はラウンドIDから決まり、基本のごはんを必ず含む', () => {
    const { s, round } = playRound(createInitialState(T0), 'match', T0 + 5, () => okChoice);
    const a = reducer(s, { type: 'finishRound', roundId: round.id, at: T0 + 6 }).play.lastReward!;
    const b = reducer(s, { type: 'finishRound', roundId: round.id, at: T0 + 99 }).play.lastReward!;
    expect(a.foodId).toBe(b.foodId);
    expect(['onigiri', 'pudding', 'soup']).toContain(a.foodId);
  });

  it('家具が出ない回が続くと確実に1つ出る', () => {
    let s = createInitialState(T0);
    let got = 0;
    for (let i = 0; i < GAME.reward.furniturePity * 3; i++) {
      const r = playRound(s, 'match', T0 + i * 1000, () => okChoice);
      s = reducer(r.s, { type: 'finishRound', roundId: r.round.id, at: T0 + i * 1000 + 1 });
      if (s.play.lastReward?.furnitureId) got++;
      expect(s.play.sinceFurniture).toBeLessThan(GAME.reward.furniturePity);
    }
    expect(got).toBeGreaterThanOrEqual(3);
  });
});

describe('食事', () => {
  it('所持数を一度だけ消費する', () => {
    const s0 = createInitialState(T0);
    expect(s0.foods.onigiri).toBe(1);
    const s1 = reducer(s0, { type: 'feed', foodId: 'onigiri', mealId: 'm1', at: T0 + 10 });
    expect(s1.foods.onigiri).toBe(0);
    expect(s1.meals).toHaveLength(1);
    expect(s1.pet.lastFedAt).toBe(T0 + 10);
    // 連打（同じ食事ID）
    expect(reducer(s1, { type: 'feed', foodId: 'onigiri', mealId: 'm1', at: T0 + 11 })).toBe(s1);
    // 所持数0
    expect(reducer(s1, { type: 'feed', foodId: 'onigiri', mealId: 'm2', at: T0 + 12 })).toBe(s1);
  });

  it('報酬の「食べさせる」は二重に食べない', () => {
    const { s, round } = playRound(createInitialState(T0), 'match', T0 + 1, () => okChoice);
    const done = reducer(s, { type: 'finishRound', roundId: round.id, at: T0 + 2 });
    const r = done.play.lastReward!;
    const fed = reducer(done, { type: 'feed', foodId: r.foodId, mealId: `reward:${r.roundId}`, at: T0 + 3 });
    expect(fed.play.lastReward!.fed).toBe(true);
    expect(fed.foods[r.foodId]).toBe(done.foods[r.foodId] - 1);
    expect(reducer(fed, { type: 'feed', foodId: r.foodId, mealId: `reward:${r.roundId}`, at: T0 + 4 })).toBe(fed);
  });
});

describe('保存と復元', () => {
  it('再読み込みしても状態が戻る', () => {
    const storage = new MemStorage();
    const a = createStore(storage, T0);
    a.dispatch({ type: 'onboard', name: 'だいふく', at: T0 });
    a.dispatch({ type: 'searched', query: '目標', wordId: 'w_mokuhyou', at: T0 + 1 });
    a.dispatch({ type: 'saveWord', wordId: 'w_mokuhyou', tags: ['write'], at: T0 + 2 });
    a.dispatch({ type: 'feed', foodId: 'onigiri', mealId: 'm1', at: T0 + 3 });
    a.dispatch({ type: 'place', slot: 'rug', furnitureId: 'rug_round' });
    const b = createStore(storage, T0 + 1000);
    expect(b.getState()).toEqual(a.getState());
    expect(b.getState().pet.name).toBe('だいふく');
    expect(b.getState().pocket.w_mokuhyou.tags).toEqual(['write']);
    expect(b.getState().foods.onigiri).toBe(0);
  });

  it('壊れたデータでも起動でき、元データは退避される', () => {
    const storage = new MemStorage();
    storage.setItem(STORAGE_KEY, '{oops');
    const { state, notice } = loadState(storage, T0);
    expect(notice).toBe('corrupt');
    expect(state.foods.onigiri).toBe(1);
    expect([...storage.map.keys()].some((k) => k.startsWith(`${STORAGE_KEY}:broken-`))).toBe(true);
  });

  it('一部が壊れていても、ほかの記録は残る', () => {
    const storage = new MemStorage();
    const good = createInitialState(T0);
    const raw = { ...good, pet: { name: 'みかん', metAt: T0, lastFedAt: null }, foods: 'broken', pocket: { w_mokuhyou: { tags: ['read', 'bogus'], savedAt: T0 } } };
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));
    const { state } = loadState(storage, T0);
    expect(state.pet.name).toBe('みかん');
    expect(state.foods.onigiri).toBe(1);
    expect(state.pocket.w_mokuhyou.tags).toEqual(['read']);
  });

  it('句読点つきの古い途中ラウンドは捨て 今の途中ラウンドは残す', () => {
    const state = createInitialState(T0);
    const round = buildRound(state, { game: 'match', difficulty: 'normal', at: T0, rng: seeded(3) });
    const playing = reducer(state, { type: 'startRound', round });
    const storage = new MemStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(playing));
    expect(loadState(storage, T0).state.play.active?.id).toBe(round.id);
    const old = { ...playing, play: { ...playing.play, active: { ...round, questions: round.questions.map((q) => ({ ...q, note: '物事のだいたいの内容。' })) } } };
    storage.setItem(STORAGE_KEY, JSON.stringify(old));
    expect(loadState(storage, T0).state.play.active).toBeNull();
  });

  it('ストレージが使えなくても起動できる', () => {
    expect(loadState(null, T0).notice).toBe('unavailable');
  });
});

describe('出題', () => {
  it('同じラウンドで同じ言葉を繰り返さない', () => {
    for (let i = 0; i < 30; i++) {
      const r = buildRound(createInitialState(T0), { game: i % 2 ? 'write' : 'match', difficulty: 'hard', at: T0 + i, rng: seeded(i) });
      expect(new Set(r.questions.map((q) => q.wordId)).size).toBe(r.questions.length);
      expect(r.questions).toHaveLength(GAME.questionsPerRound);
    }
  });

  it('「書き」で保存した言葉が手書きの遊びに出る', () => {
    let s = createInitialState(T0);
    s = reducer(s, { type: 'saveWord', wordId: 'w_shouyu', tags: ['write'], at: T0 });
    const r = buildRound(s, { game: 'write', difficulty: 'easy', at: T0, rng: seeded(3) });
    expect(r.questions.map((q) => q.wordId)).toContain('w_shouyu');
  });

  it('つまずいた言葉は同じラウンドではなく、次のラウンドで再登場する', () => {
    let s = createInitialState(T0);
    const first = buildRound(s, { game: 'write', difficulty: 'normal', at: T0, rng: seeded(9) });
    s = reducer(s, { type: 'startRound', round: first });
    const missed = first.questions[0].wordId;
    first.questions.forEach((_, i) => {
      const ans: Answer = { kind: 'write', self: i === 0 ? 'ng' : 'ok', peeked: false, hints: 0, drawing: null };
      s = reducer(s, { type: 'answer', roundId: first.id, index: i, answer: ans });
    });
    expect(s.stats[missed].reviewFromRound).toBe(first.no + 1);
    s = reducer(s, { type: 'finishRound', roundId: first.id, at: T0 + 1 });
    const next = buildRound(s, { game: 'write', difficulty: 'normal', at: T0 + 2, rng: seeded(10) });
    expect(next.questions.map((q) => q.wordId)).toContain(missed);
  });

  it('選択問題の正解は、書ける証拠として数えない', () => {
    const { s, round } = playRound(createInitialState(T0), 'match', T0, () => okChoice);
    for (const q of round.questions) {
      expect(s.stats[q.wordId].writeOk).toBe(0);
      expect(s.stats[q.wordId].choiceOk).toBe(1);
    }
  });

  it('見本を見てから「書けた」は練習として記録する', () => {
    const { s, round } = playRound(createInitialState(T0), 'write', T0, () => ({ kind: 'write', self: 'ok', peeked: true, hints: 0, drawing: null }));
    for (const q of round.questions) {
      expect(s.stats[q.wordId].writeOk).toBe(0);
      expect(s.stats[q.wordId].writePractice).toBe(1);
    }
  });

  it('選択肢に正解が1つだけ含まれる', () => {
    for (let i = 0; i < 40; i++) {
      const r = buildRound(createInitialState(T0), { game: 'match', difficulty: (['easy', 'normal', 'hard'] as const)[i % 3], at: T0 + i, rng: seeded(100 + i) });
      for (const q of r.questions) {
        if (q.kind === 'write') continue;
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
    }
  });

  it('空欄は漢字の位置だけ', () => {
    for (const w of WORDS) {
      for (const d of ['easy', 'hard'] as const) {
        const blanks = writeBlanks(w, d);
        expect(blanks.length).toBeGreaterThan(0);
        for (const i of blanks) expect(isKanji([...w.surface][i])).toBe(true);
      }
    }
  });
});

describe('検索', () => {
  it('未収録の語には何も返さない', () => {
    expect(searchWords(WORDS, '燐').hits).toHaveLength(0);
    expect(searchWords(WORDS, 'ぱそこん').hits).toHaveLength(0);
    expect(searchWords(WORDS, '').hits).toHaveLength(0);
  });
  it('同じ読みの候補をすべて返す', () => {
    const ids = searchWords(WORDS, 'いどう').hits.map((h) => h.word.id);
    expect(ids).toEqual(expect.arrayContaining(['w_idou_move', 'w_idou_transfer']));
  });
  it('漢字・カタカナ・話し言葉でも見つかる', () => {
    expect(searchWords(WORDS, '目標').hits[0].word.id).toBe('w_mokuhyou');
    expect(searchWords(WORDS, 'モクヒョウ').hits[0].word.id).toBe('w_mokuhyou');
    expect(normalizeQuery('もくひょうってどう書くの？')).toBe('もくひょう');
    expect(searchWords(WORDS, '締切').hits[0].word.id).toBe('w_shimekiri');
  });
});

describe('データ', () => {
  it('30〜50語で、例文に見出し語が含まれる', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(30);
    expect(WORDS.length).toBeLessThanOrEqual(50);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w.example.includes(w.surface), w.surface).toBe(true);
      expect(/^[ぁ-ゖー]+$/.test(w.reading), w.reading).toBe(true);
      for (const m of w.misreadings ?? []) expect(m).not.toBe(w.reading);
    }
  });
  it('使う漢字すべてに画数がある', () => {
    for (const w of WORDS) for (const c of w.surface) if (isKanji(c)) expect(KANJI[c], c).toBeTruthy();
  });
});

describe('相棒のようす', () => {
  it('おなかは時間で変わるが、深刻な状態には進まない', () => {
    const s = { pet: { name: 'x', metAt: T0, lastFedAt: T0 } };
    expect(hungerOf(s, T0 + 1000)).toBe('content');
    expect(hungerOf(s, T0 + 5 * 3600_000)).toBe('peckish');
    expect(hungerOf(s, T0 + 12 * 3600_000)).toBe('hungry');
    expect(hungerOf(s, T0 + 365 * 24 * 3600_000)).toBe('flop');
  });
  it('疲れは休むと戻り、検索の回数で何かが減ることはない', () => {
    let s = createInitialState(T0);
    for (let i = 0; i < 6; i++) s = reducer(s, { type: 'searched', query: `q${i}`, wordId: null, at: T0 + i * 1000 });
    expect(fatigueOf(s, T0 + 6000).resting).toBe(true);
    expect(fatigueOf(s, T0 + GAME.pet.restMs + 6000).resting).toBe(false);
    expect(s.foods).toEqual(createInitialState(T0).foods);
  });
});
