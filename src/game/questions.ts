import { GAME, type Difficulty } from '../config/game.config';
import { KANJI, WORDS, WORD_BY_ID, isKanji, type Word } from '../data/words';
import type { ActiveRound, GameKind, GameState, Question } from '../store/types';
import { shuffle, type Rng } from './rng';

/** 書く問題で空欄にする文字の位置 */
export function writeBlanks(word: Word, difficulty: Difficulty): number[] {
  const kanjiIdx = [...word.surface].map((c, i) => (isKanji(c) ? i : -1)).filter((i) => i >= 0);
  if (difficulty === 'hard') return kanjiIdx.slice(0, 3);
  let best = kanjiIdx[0];
  for (const i of kanjiIdx) {
    if ((KANJI[[...word.surface][i]]?.strokes ?? 0) > (KANJI[[...word.surface][best]]?.strokes ?? 0)) best = i;
  }
  return [best];
}

function levelFit(word: Word, d: Difficulty): number {
  if (d === 'easy') return word.level === 1 ? 2 : word.level === 2 ? 0.5 : -1.5;
  if (d === 'normal') return word.level === 2 ? 1.5 : 0.8;
  return word.level === 3 ? 2 : word.level === 2 ? 0.8 : -0.8;
}

/** 出題する言葉を選ぶ。ポケットの言葉 > 前につまずいた言葉 > 身近な語 の順で優先 */
export function pickWords(state: GameState, game: GameKind, difficulty: Difficulty, rng: Rng, focusWordId?: string): Word[] {
  const no = state.play.roundNo + 1;
  const scored = WORDS.map((w) => {
    let s = levelFit(w, difficulty);
    const p = state.pocket[w.id];
    if (p) {
      s += 4;
      if (game === 'write' && p.tags.includes('write')) s += 3;
      if (game === 'match' && (p.tags.includes('read') || p.tags.includes('meaning'))) s += 3;
    }
    const st = state.stats[w.id];
    if (st?.reviewFromRound != null && no >= st.reviewFromRound) s += 5;
    if (st && st.lastRound === no - 1) s -= 4;
    s += rng() * 1.5;
    return { w, s };
  }).sort((a, b) => b.s - a.s);

  const picked: Word[] = [];
  const focus = focusWordId ? WORD_BY_ID[focusWordId] : undefined;
  if (focus) picked.push(focus);
  for (const { w } of scored) {
    if (picked.length >= GAME.questionsPerRound) break;
    if (!picked.some((p) => p.id === w.id)) picked.push(w);
  }
  return picked;
}

function readingOptions(word: Word, d: Difficulty, rng: Rng): string[] {
  const n = GAME.choiceCount[d] - 1;
  const others = shuffle(
    rng,
    WORDS.filter((w) => w.id !== word.id && w.reading !== word.reading && w.reading[0] !== word.reading[0]).map((w) => w.reading),
  );
  const similar = shuffle(rng, word.misreadings ?? []);
  let distract: string[];
  if (d === 'easy') distract = others.slice(0, n);
  else if (d === 'normal') distract = [...similar.slice(0, Math.ceil(n / 2)), ...others].slice(0, n);
  else distract = [...similar, ...others].slice(0, n);
  return shuffle(rng, [word.reading, ...new Set(distract)].slice(0, n + 1));
}

function meaningOptions(word: Word, d: Difficulty, rng: Rng): string[] {
  const n = GAME.choiceCount[d] - 1;
  const homo = (word.homophones ?? []).map((id) => WORD_BY_ID[id]?.meaning).filter(Boolean) as string[];
  const sameScene = shuffle(rng, WORDS.filter((w) => w.id !== word.id && w.scene === word.scene).map((w) => w.meaning));
  const otherScene = shuffle(rng, WORDS.filter((w) => w.scene !== word.scene).map((w) => w.meaning));
  let distract: string[];
  if (d === 'easy') distract = otherScene.slice(0, n);
  else if (d === 'normal') distract = [...homo, ...shuffle(rng, [...sameScene.slice(0, 2), ...otherScene.slice(0, 2)])].slice(0, n);
  else distract = [...homo, ...sameScene].slice(0, n);
  return shuffle(rng, [word.meaning, ...new Set(distract)].slice(0, n + 1));
}

function matchKind(state: GameState, word: Word, rng: Rng): 'reading' | 'meaning' {
  const tags = state.pocket[word.id]?.tags ?? [];
  if (tags.includes('read') && !tags.includes('meaning')) return 'reading';
  if (tags.includes('meaning') && !tags.includes('read')) return 'meaning';
  if (word.homophones?.length) return 'meaning';
  if (!word.misreadings?.length) return 'meaning';
  return rng() < 0.6 ? 'reading' : 'meaning';
}

export function buildQuestion(state: GameState, word: Word, game: GameKind, d: Difficulty, rng: Rng): Question {
  if (game === 'write') return { kind: 'write', wordId: word.id, blanks: writeBlanks(word, d) };
  if (matchKind(state, word, rng) === 'reading') {
    return { kind: 'reading', wordId: word.id, options: readingOptions(word, d, rng), answer: word.reading };
  }
  return { kind: 'meaning', wordId: word.id, options: meaningOptions(word, d, rng), answer: word.meaning };
}

export function buildRound(
  state: GameState,
  opts: { game: GameKind; difficulty: Difficulty; at: number; rng: Rng; focusWordId?: string },
): ActiveRound {
  const no = state.play.roundNo + 1;
  const words = pickWords(state, opts.game, opts.difficulty, opts.rng, opts.focusWordId);
  const questions = words.map((w) => buildQuestion(state, w, opts.game, opts.difficulty, opts.rng));
  return {
    id: `r${no}-${opts.at.toString(36)}`,
    no,
    game: opts.game,
    difficulty: opts.difficulty,
    questions,
    answers: questions.map(() => null),
    startedAt: opts.at,
  };
}

/** おすすめの遊び（ポケットの「書き」が多ければ手書き） */
export function recommend(state: GameState): { game: GameKind; reason: string } {
  const entries = Object.values(state.pocket);
  const write = entries.filter((e) => e.tags.includes('write')).length;
  const match = entries.filter((e) => e.tags.includes('read') || e.tags.includes('meaning')).length;
  const due = Object.values(state.stats).filter((s) => s.reviewFromRound != null && state.play.roundNo + 1 >= s.reviewFromRound).length;
  if (write > 0 && write >= match) return { game: 'write', reason: `あつめた漢字が${Math.min(write, GAME.questionsPerRound)}問出るよ` };
  if (match > 0) return { game: 'match', reason: `あつめた漢字が${Math.min(match, GAME.questionsPerRound)}問出るよ` };
  if (due > 0) return { game: state.play.lastGame, reason: 'この前のことばにまた会えるかも' };
  return { game: 'match', reason: '身近なことばでさくっと3問' };
}
