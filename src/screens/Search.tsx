import { useEffect, useMemo, useRef, useState } from 'react';
import { dictionary, type SearchResult } from '../dictionary/provider';
import type { Scene, Word } from '../data/words';
import { navigate, useRoute } from '../lib/router';
import { petEvent } from '../lib/ui';
import { dispatch, useGame } from '../store/store';
import { EmptyState, Header, Icon, Notice } from '../ui/parts';
import { ASSETS } from '../config/assets.config';
import { ArtBox } from '../art/AssetImage';

type Status = 'idle' | 'loading' | 'done' | 'error';

/** 検索して 候補が1つなら結果へ 複数なら候補一覧を出す */
export async function runSearch(q: string, opts: { replace?: boolean } = {}): Promise<SearchResult | null> {
  petEvent({ kind: 'searching' });
  const res = await dictionary.search(q);
  const single = res.hits.length === 1 || (res.hits.filter((h) => h.kind === 'exact').length === 1 && res.hits[0].kind === 'exact');
  dispatch({ type: 'searched', query: q, wordId: single ? res.hits[0].word.id : null, at: Date.now() });
  navigate(`/search?q=${encodeURIComponent(q)}`, { replace: opts.replace ?? true });
  if (single) {
    navigate(`/word/${res.hits[0].word.id}?from=search`);
    return null;
  }
  return res;
}

export function SearchScreen() {
  const route = useRoute();
  const q = route.query.get('q') ?? '';
  const focus = route.query.get('focus') === '1';
  const history = useGame((s) => s.history);
  const [value, setValue] = useState(q);
  const [status, setStatus] = useState<Status>(q ? 'loading' : 'idle');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [typing, setTyping] = useState(false);
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // 戻る・再読み込みで来たときは 候補一覧を表示するだけ（自動で結果へは飛ばない）
  useEffect(() => {
    setValue(q);
    if (!q) {
      setStatus('idle');
      setResult(null);
      return;
    }
    const id = ++reqId.current;
    setStatus('loading');
    dictionary.search(q).then(
      (r) => {
        if (id !== reqId.current) return;
        setResult(r);
        setStatus('done');
      },
      () => id === reqId.current && setStatus('error'),
    );
  }, [q]);

  useEffect(() => {
    if (focus) inputRef.current?.focus();
  }, [focus]);

  const submit = async (raw = value) => {
    const query = raw.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    inputRef.current?.blur();
    const id = ++reqId.current;
    setStatus('loading');
    try {
      const r = await runSearch(query, { replace: true });
      if (id !== reqId.current) return;
      if (r) {
        setResult(r);
        setStatus('done');
      }
    } catch {
      if (id === reqId.current) setStatus('error');
    }
  };

  const openWord = (w: Word) => {
    dispatch({ type: 'searched', query: q || w.surface, wordId: w.id, at: Date.now() });
    navigate(`/word/${w.id}?from=search`);
  };

  const hits = result?.hits ?? [];
  const sameReading = hits.length > 1 && hits.every((h) => h.word.reading === hits[0].word.reading);
  const petMotion = status === 'loading' || typing ? 'search' : status === 'done' && hits.length > 1 ? 'cheer' : 'idle';

  return (
    <div className="screen search-screen">
      <Header title="しらべる" pet={{ motion: petMotion, key: `${status}-${q}` }} />
      <div className="screen__body stack">
        <form
          className="search-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="field search-field">
            <Icon name="searchLine" className="field__icon" />
            <span className="sr-only">しらべることば</span>
            <input
              ref={inputRef}
              type="search"
              value={value}
              placeholder="例：もくひょう"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              onCompositionStart={() => (composing.current = true)}
              onCompositionEnd={() => (composing.current = false)}
              onKeyDown={(e) => {
                // 日本語の変換確定の Enter では検索しない
                if (e.key === 'Enter' && (e.nativeEvent.isComposing || composing.current || e.keyCode === 229)) e.preventDefault();
              }}
            />
            {value && (
              <button type="button" className="field__clear" aria-label="入力を消す" onClick={() => (setValue(''), inputRef.current?.focus())}>
                <Icon name="close" />
              </button>
            )}
          </label>
        </form>

        <div className="search-alt">
          <button type="button" className="alt-tile" onClick={() => navigate('/search/camera')}>
            <Icon name="camera" className="alt-tile__icon" />
            <span className="alt-tile__label">カメラで</span>
            <span className="alt-tile__desc">撮影・画像から</span>
          </button>
          <button type="button" className="alt-tile" onClick={() => navigate('/search/voice')}>
            <Icon name="voice" className="alt-tile__icon" />
            <span className="alt-tile__label">声で</span>
            <span className="alt-tile__desc">話して入力</span>
          </button>
        </div>

        {status === 'loading' && (
          <div className="stack stack--s" aria-busy="true" aria-label="さがしています">
            <div className="skeleton" style={{ height: 88 }} />
            <div className="skeleton" style={{ height: 88 }} />
          </div>
        )}

        {status === 'error' && (
          <div className="stack stack--s">
            <Notice tone="warn">
              {'辞書に接続できませんでした\n通信状態を確かめてもう一度ためしてください'}
            </Notice>
            <button type="button" className="btn btn--block" onClick={() => submit(q || value)}>
              <Icon name="retry" className="btn__icon" />
              もう一度しらべる
            </button>
          </div>
        )}

        {status === 'done' && hits.length > 0 && (
          <section className="stack stack--s" aria-labelledby="hits-title">
            <div className="section-title">
              <h2 className="h3" id="hits-title">
                {sameReading ? `「${hits[0].word.reading}」と読むことば` : `「${result?.normalized}」の候補`}
              </h2>
              <span className="caption">{hits.length}件</span>
            </div>
            {sameReading && <p className="caption">同じ読みでも意味がちがうよ</p>}
            {hits.map((h, i) => (
              <button key={h.word.id} type="button" className="go-card hit-card rise-in" style={{ animationDelay: `${i * 40}ms` }} onClick={() => openWord(h.word)}>
                <span className="kanji hit-card__word">{h.word.surface}</span>
                <span className="hit-card__body">
                  <span className="hit-card__reading">{h.word.reading}</span>
                  <span className="hit-card__meaning">{h.word.meaning}</span>
                </span>
                <span className="go-card__strip" aria-hidden="true">
                  <Icon name="arrow" />
                </span>
              </button>
            ))}
          </section>
        )}

        {status === 'done' && hits.length === 0 && (
          <EmptyState
            art={<ArtBox def={ASSETS.deco.magnifier} className="state__art state__art--small" />}
            title={`「${result?.normalized || q}」は見つからなかった`}
            body={'このデモにはまだ入っていないことばです\n関係のない結果は出さないようにしています\n下の収録語から探すこともできます'}
            action={
              <button type="button" className="btn btn--sm" onClick={() => setShowAll(true)}>
                収録語を見る
              </button>
            }
          />
        )}

        {status !== 'loading' && !q && history.length > 0 && (
          <section className="stack stack--s" aria-labelledby="hist-title">
            <div className="section-title">
              <h2 className="h3" id="hist-title">
                最近しらべた
              </h2>
              <button type="button" className="link" onClick={() => dispatch({ type: 'clearHistory' })}>
                履歴を消す
              </button>
            </div>
            <div className="row row--wrap">
              {history.slice(0, 10).map((h) => (
                <button
                  key={`${h.query}-${h.at}`}
                  type="button"
                  className="chip chip--history"
                  onClick={() => (h.wordId && dictionary.get(h.wordId) ? navigate(`/word/${h.wordId}?from=search`) : submit(h.query))}
                >
                  {h.wordId ? dictionary.get(h.wordId)?.surface ?? h.query : h.query}
                </button>
              ))}
            </div>
          </section>
        )}

        <DemoNote open={showAll} onToggle={() => setShowAll((v) => !v)} onPick={(w) => openWord(w)} />
      </div>
    </div>
  );
}

const SCENES: Scene[] = ['大学', 'バイト', '仕事', 'くらし'];

function DemoNote({ open, onToggle, onPick }: { open: boolean; onToggle: () => void; onPick: (w: Word) => void }) {
  const groups = useMemo(() => SCENES.map((s) => ({ scene: s, words: dictionary.all().filter((w) => w.scene === s) })), []);
  return (
    <section className="demo-note">
      <Notice>
        <strong>デモ版：</strong>大学・バイト・仕事・くらしでよく使う{dictionary.size}語に対応しています{'\nほかのことばは辞書の接続後に調べられるようになります'}
        <div>
          <button type="button" className="link" aria-expanded={open} onClick={onToggle}>
            {open ? '収録語をとじる' : '収録語を見る'}
          </button>
        </div>
      </Notice>
      {open && (
        <div className="stack stack--s demo-note__list rise-in">
          {groups.map((g) => (
            <div key={g.scene}>
              <h3 className="eyebrow">{g.scene}</h3>
              <div className="row row--wrap">
                {g.words.map((w) => (
                  <button key={w.id} type="button" className="chip chip--word kanji" onClick={() => onPick(w)}>
                    {w.surface}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
