import { useEffect, useRef, useState } from 'react';
import { KANJI, WORD_BY_ID, isKanji, type Word } from '../data/words';
import { assetUrl } from '../art/AssetImage';
import { sfx, useReducedMotion } from '../lib/env';
import { navigate, useRoute } from '../lib/router';
import { bump, toast } from '../lib/ui';
import { dispatch, useGame } from '../store/store';
import { TAGS, TAG_LABEL, type Tag } from '../store/types';
import { EmptyState, Header, Icon, Sheet } from '../ui/parts';

/** 語の長さに合わせて文字サイズを決める（長い語でも枠からはみ出さない） */
export function wordSize(surface: string, max = 84) {
  const n = [...surface].length;
  // 文字の大きさは 4px 刻みにそろえる
  return `round(down, min(${max}px, ${Math.floor(78 / Math.max(n, 1))}cqw), 4px)`;
}

export function WordScreen({ id }: { id: string }) {
  const route = useRoute();
  const from = route.query.get('from') === 'pocket' ? 'pocket' : 'search';
  const word = WORD_BY_ID[id];
  const entry = useGame((s) => s.pocket[id]);
  const [sheet, setSheet] = useState(false);
  const [big, setBig] = useState(false);
  const [strokes, setStrokes] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  if (!word) {
    return (
      <div className="screen">
        <Header title="ことば" back={from === 'pocket' ? '/pocket' : '/search'} />
        <EmptyState title="このことばは見つかりませんでした" body="データが更新された可能性があります" action={<button className="btn" onClick={() => navigate('/search', { replace: true })}>しらべる画面へ</button>} />
      </div>
    );
  }

  const onSaved = (tags: Tag[], wasSaved: boolean) => {
    dispatch({ type: 'saveWord', wordId: word.id, tags, at: Date.now() });
    setSheet(false);
    sfx('pop');
    if (!wasSaved && !reduce && cardRef.current) flyToPocket(cardRef.current, word.surface);
    window.setTimeout(() => bump('pocket'), reduce ? 0 : 560);
    toast(wasSaved ? 'タグを変えました' : 'あつめた漢字に入れたよ');
  };

  return (
    <div className="screen word-screen">
      <Header
        title={from === 'pocket' ? 'あつめた漢字' : 'しらべる'}
        back={from === 'pocket' ? '/pocket' : '/search'}
        pet={from === 'search' ? { motion: 'cheer', key: id } : undefined}
      />
      <div className="screen__body stack">
        <article className="word-card card" ref={cardRef} aria-labelledby="word-surface">
          <p className="word-card__reading">{word.reading}</p>
          <p className="kanji word-card__surface" id="word-surface" style={{ fontSize: wordSize(word.surface) }}>
            {word.surface}
          </p>
          <p className="word-card__meaning">{word.meaning}</p>
          <div className="word-card__tools">
            <button type="button" className="btn btn--sm" onClick={() => setBig(true)}>
              <Icon name="expand" className="btn__icon" />
              大きく見る
            </button>
            {word.strokeOrder && (
              <button type="button" className="btn btn--sm" onClick={() => setStrokes(true)}>
                書き順を見る
              </button>
            )}
          </div>
        </article>

        <section className="card card--pad example-card" aria-labelledby="ex-title">
          <div className="row row--between">
            <h2 className="h3" id="ex-title">
              つかいかた
            </h2>
            <span className="tag tag--scene">{word.scene}</span>
          </div>
          <p className="example-card__text">
            <Highlight text={word.example} target={word.surface} />
          </p>
        </section>

        {word.homophones?.map((hid) => {
          const h = WORD_BY_ID[hid];
          if (!h) return null;
          return (
            <button key={hid} type="button" className="go-card homophone" onClick={() => navigate(`/word/${hid}?from=${from}`, { replace: true })}>
              <span className="kanji homophone__word">{h.surface}</span>
              <span className="grow">
                <span className="go-card__sub">同じ読みのことば</span>
                <span className="homophone__meaning">{h.meaning}</span>
              </span>
              <span className="go-card__strip go-card__strip--meaning" aria-hidden="true">
                <Icon name="arrow" />
              </span>
            </button>
          );
        })}

        <details className="card more-card">
          <summary className="more-card__summary">
            <span className="h3">くわしく</span>
            <span className="caption">画数・部首</span>
            <Icon name="down" className="more-card__chev" />
          </summary>
          <KanjiDetails word={word} />
        </details>

        <p className="caption source-note">{'意味と例文はこのアプリ用に書いた短い説明です\n正式な文書では辞書でも確かめてください'}</p>
      </div>

      <div className="screen__footer">
        {entry ? (
          <div className="stack stack--s">
            <button type="button" className="saved-bar" onClick={() => setSheet(true)}>
              <Icon name="check" className="saved-bar__check" />
              <span className="grow">あつめた漢字に入っています</span>
              <span className="row">
                {entry.tags.map((t) => (
                  <span key={t} className={`tag tag--${t}`}>
                    {TAG_LABEL[t]}
                  </span>
                ))}
              </span>
              <Icon name="edit" className="btn__icon" />
            </button>
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate(`/play?word=${word.id}`)}>
              このことばであそぶ
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => setSheet(true)}>
            あつめた漢字に入れる
          </button>
        )}
      </div>

      {sheet && <SaveSheet word={word} initial={entry?.tags ?? []} saved={!!entry} onClose={() => setSheet(false)} onSave={onSaved} />}
      {big && <BigView word={word} onClose={() => setBig(false)} />}
      {strokes && word.strokeOrder && (
        <Sheet title="書き順" onClose={() => setStrokes(false)}>
          <img src={assetUrl(word.strokeOrder)} alt={`${word.surface}の書き順`} className="stroke-img" />
        </Sheet>
      )}
    </div>
  );
}

function Highlight({ text, target }: { text: string; target: string }) {
  const i = text.indexOf(target);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl kanji">{target}</mark>
      {text.slice(i + target.length)}
    </>
  );
}

function KanjiDetails({ word }: { word: Word }) {
  const chars = [...word.surface].filter(isKanji);
  return (
    <ul className="kanji-list">
      {chars.map((c, i) => {
        const k = KANJI[c];
        return (
          <li key={`${c}${i}`} className="kanji-row">
            <span className="kanji kanji-row__char">{c}</span>
            <dl className="kanji-row__meta">
              <div>
                <dt>画数</dt>
                <dd>{k ? `${k.strokes}画` : '—'}</dd>
              </div>
              <div>
                <dt>部首</dt>
                <dd>{k?.radical ? `${k.radical}（${k.radicalName}）` : '辞書により分類が異なります'}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export function SaveSheet({ word, initial, saved, onClose, onSave }: { word: Word; initial: Tag[]; saved: boolean; onClose: () => void; onSave: (tags: Tag[], wasSaved: boolean) => void }) {
  const [tags, setTags] = useState<Tag[]>(initial.length ? initial : []);
  const toggle = (t: Tag) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const DESC: Record<Tag, string> = { read: '読み方を確かめたい', write: '手で書けるようになりたい', meaning: '意味や使い方を覚えたい' };
  return (
    <Sheet title={saved ? 'タグを変える' : 'あつめた漢字に入れる'} onClose={onClose}>
      <div className="stack">
        <p className="caption">
          <span className="kanji">「{word.surface}」</span>{'をどう覚えておきたい？\nいくつでも選べてあそぶときの出題に使います'}
        </p>
        <div className="tag-pick" role="group" aria-label="タグ">
          {TAGS.map((t) => (
            <button key={t} type="button" className={`tag-option tag-option--${t}`} aria-pressed={tags.includes(t)} onClick={() => toggle(t)}>
              <span className="tag-option__check" aria-hidden="true">
                {tags.includes(t) && <Icon name="check" />}
              </span>
              <span className="tag-option__label">{TAG_LABEL[t]}</span>
              <span className="tag-option__desc">{DESC[t]}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary btn--lg btn--block" disabled={tags.length === 0} onClick={() => onSave(tags, saved)}>
          {tags.length === 0 ? 'タグを1つ以上えらんでね' : saved ? 'この内容にする' : '入れる'}
        </button>
        {saved && (
          <button
            type="button"
            className="btn btn--quiet btn--block"
            onClick={() => {
              dispatch({ type: 'removeWord', wordId: word.id });
              onClose();
              toast('あつめた漢字から出しました');
            }}
          >
            <Icon name="trash" className="btn__icon" />
            あつめた漢字から出す
          </button>
        )}
      </div>
    </Sheet>
  );
}

function BigView({ word, onClose }: { word: Word; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const n = [...word.surface].length;
  return (
    <div className="bigview" role="dialog" aria-modal="true" aria-label={`${word.surface}を大きく表示`} ref={ref} tabIndex={-1}>
      <button type="button" className="icon-btn bigview__close" onClick={onClose} aria-label="とじる">
        <Icon name="close" />
      </button>
      <p className="bigview__reading">{word.reading}</p>
      <p className="kanji bigview__word" style={{ fontSize: `round(down, min(${Math.floor(86 / n)}cqw, ${Math.floor(60 / n)}cqh), 4px)` }}>
        {word.surface}
      </p>
      <p className="caption">お手本にして紙に書くときにどうぞ</p>
    </div>
  );
}

/** 保存したカードがポケット（下部ナビ）へ飛んでいく演出 */
function flyToPocket(from: HTMLElement, text: string) {
  const target = document.querySelector('[data-nav="pocket"]');
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly-card kanji';
  el.textContent = text;
  el.style.left = `${a.left + a.width / 2}px`;
  el.style.top = `${a.top + a.height / 2}px`;
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.3 - 60}px)) scale(0.8)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0.2 },
    ],
    { duration: 620, easing: 'cubic-bezier(.5,0,.6,1)' },
  ).onfinish = () => el.remove();
}
