// 辞書の窓口。いまは端末内のデモデータを検索します。
// 将来、外部の辞書APIに接続するときは、この DictionaryProvider を差し替えます。

import { WORDS, WORD_BY_ID, type Word } from '../data/words';

export type MatchKind = 'exact' | 'reading' | 'contains' | 'prefix';

export interface SearchHit {
  word: Word;
  kind: MatchKind;
}

export interface SearchResult {
  query: string;
  normalized: string;
  hits: SearchHit[];
}

export interface DictionaryProvider {
  /** 何語収録しているか（デモ表示用） */
  readonly size: number;
  readonly isDemo: boolean;
  search(query: string): Promise<SearchResult>;
  get(id: string): Word | undefined;
  all(): Word[];
}

/** カタカナをひらがなに */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 表記ゆれを整える（全角英数・空白・話し言葉の「ってどう書く」など） */
export function normalizeQuery(raw: string): string {
  let s = raw.normalize('NFKC').replace(/\s+/g, '');
  s = s.replace(/[。、．，,.!！?？「」『』"']/g, '');
  s = s.replace(/(って|は|を|の)?(漢字)?(って|は)?(どう|どうやって)(書く|かく|書きます|かきます|書けば|かけば)(の|んだっけ|んだろう|いい)?$/, '');
  s = s.replace(/(の漢字|という字|って字)$/, '');
  return s;
}

const ALIASES: Record<string, string[]> = {
  w_shimekiri: ['締切', '締切り', '〆切'],
};

export function searchWords(words: Word[], raw: string): SearchResult {
  const normalized = normalizeQuery(raw);
  const hira = toHiragana(normalized);
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const push = (word: Word, kind: MatchKind) => {
    if (seen.has(word.id)) return;
    seen.add(word.id);
    hits.push({ word, kind });
  };
  if (!normalized) return { query: raw, normalized, hits };

  for (const w of words) {
    if (w.surface === normalized || ALIASES[w.id]?.includes(normalized)) push(w, 'exact');
  }
  for (const w of words) if (w.reading === hira) push(w, 'reading');
  // 話した文章の中に収録語が含まれている（例:「目標ってどう書く」）
  for (const w of words) if (w.surface.length >= 2 && normalized.includes(w.surface)) push(w, 'contains');
  // 漢字1字などで探したとき、その字を含む語
  if (/[㐀-鿿]/.test(normalized)) {
    for (const w of words) if (w.surface.includes(normalized)) push(w, 'contains');
  }
  // 読みの途中まで（2文字以上）
  if (hira.length >= 2 && /^[ぁ-ゖー]+$/.test(hira)) {
    for (const w of words) if (w.reading.startsWith(hira)) push(w, 'prefix');
  }
  return { query: raw, normalized, hits };
}

class LocalDemoProvider implements DictionaryProvider {
  readonly isDemo = true;
  get size() {
    return WORDS.length;
  }
  async search(query: string) {
    if (typeof location !== 'undefined' && location.search.includes('debug=dict-error')) {
      throw new Error('simulated network error');
    }
    return searchWords(WORDS, query);
  }
  get(id: string) {
    return WORD_BY_ID[id];
  }
  all() {
    return WORDS;
  }
}

export const dictionary: DictionaryProvider = new LocalDemoProvider();
