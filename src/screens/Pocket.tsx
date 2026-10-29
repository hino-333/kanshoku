import { useMemo, useState } from 'react';
import { ASSETS } from '../config/assets.config';
import { WORD_BY_ID } from '../data/words';
import { ArtBox } from '../art/AssetImage';
import { normalizeQuery, toHiragana } from '../dictionary/provider';
import { navigate } from '../lib/router';
import { useGame } from '../store/store';
import { TAGS, TAG_LABEL, type Tag } from '../store/types';
import { EmptyState, Icon } from '../ui/parts';

type Filter = 'all' | Tag;

export function PocketScreen() {
  const pocket = useGame((s) => s.pocket);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const entries = useMemo(
    () =>
      Object.entries(pocket)
        .map(([id, e]) => ({ id, e, w: WORD_BY_ID[id] }))
        .filter((x) => x.w)
        .sort((a, b) => b.e.updatedAt - a.e.updatedAt),
    [pocket],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: entries.length, read: 0, write: 0, meaning: 0 };
    for (const x of entries) for (const t of x.e.tags) c[t]++;
    return c;
  }, [entries]);
  const nq = toHiragana(normalizeQuery(q));
  const shown = entries.filter(
    (x) => (filter === 'all' || x.e.tags.includes(filter)) && (!nq || x.w.surface.includes(nq) || x.w.reading.includes(nq) || x.w.meaning.includes(nq)),
  );

  return (
    <div className="screen pocket-screen">
      {/* 見出しの帯（青）：文字はクリーム 検索欄は帯の中 */}
      <header className="pocket-band">
        <h1 className="h2 pocket-band__title">あつめた漢字</h1>
        {entries.length > 0 && (
          <div className="pocket-band__search">
            <ArtBox def={ASSETS.people.salaryman} className="pocket-band__peek" />
            <label className="field field--sm">
              <Icon name="searchLine" className="field__icon" />
              <span className="sr-only">あつめた漢字をさがす</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="あつめた漢字をさがす" enterKeyHint="search" />
            </label>
            <ArtBox def={ASSETS.people.salarymanHand} className="pocket-band__hand" />
          </div>
        )}
      </header>
      <div className="screen__body stack">
        {entries.length === 0 ? (
          <EmptyState
            art={<ArtBox def={ASSETS.deco.pocket} className="state__art" />}
            title="まだ何もあつめていないよ"
            body={'調べたことばを「あつめた漢字に入れる」とここにカードで残ります\nあとで遊びにも出てきます'}
            action={
              <button type="button" className="btn btn--primary" onClick={() => navigate('/search?focus=1')}>
                <Icon name="search" className="btn__icon" />
                ことばを調べる
              </button>
            }
          />
        ) : (
          <>
            <div className="filter-row" role="radiogroup" aria-label="タグでしぼる">
              {(['all', ...TAGS] as Filter[]).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={filter === f} className="chip" onClick={() => setFilter(f)}>
                  {f === 'all' ? 'すべて' : TAG_LABEL[f]}
                  <span className="chip__count">{counts[f]}</span>
                </button>
              ))}
            </div>

            <button type="button" className="go-card go-card--invite pocket-invite" onClick={() => navigate('/play')}>
              <ArtBox def={ASSETS.people.snackBoy} className="pocket-invite__art" />
              <span className="grow">
                <span className="go-card__sub">いい字そろってるね！</span>
                <span className="go-card__title">あつめた漢字であそんでみる？</span>
              </span>
              <Icon name="arrow" className="pocket-invite__arrow" />
            </button>

            {shown.length === 0 ? (
              <EmptyState title={q ? `「${q}」は見つからなかった` : `「${TAG_LABEL[filter as Tag]}」のことばはまだないよ`} body="タグはことばの画面からいつでも変えられます" />
            ) : (
              <ul className="pocket-list">
                {shown.map(({ id, e, w }, i) => (
                  <li key={id} className="rise-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                    <button type="button" className="go-card pocket-card" onClick={() => navigate(`/word/${id}?from=pocket`)}>
                      <span className="kanji pocket-card__word">{w.surface}</span>
                      <span className="pocket-card__body">
                        <span className="pocket-card__reading">{w.reading}</span>
                        <span className="pocket-card__meaning">{w.meaning}</span>
                      </span>
                      {/* タグは左上の角からはみ出させる 帯の色は最初のタグ */}
                      <span className="corner-tags">
                        {e.tags.map((t) => (
                          <span key={t} className={`tag tag--${t}`}>
                            {TAG_LABEL[t]}
                          </span>
                        ))}
                      </span>
                      <span className={`go-card__strip go-card__strip--${e.tags[0] ?? 'write'}`} aria-hidden="true">
                        <Icon name="arrow" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
