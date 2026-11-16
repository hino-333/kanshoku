import { useEffect, useRef, useState } from 'react';
import { ASSETS } from '../config/assets.config';
import { GAME } from '../config/game.config';
import { KANJI, PARTS, WORD_BY_ID, type Word } from '../data/words';
import { ArtBox } from '../art/AssetImage';
import { sfx } from '../lib/env';
import { navigate } from '../lib/router';
import { petEvent } from '../lib/ui';
import { dispatch, store, useGame } from '../store/store';
import type { ActiveRound, Answer, Question, SelfCheck } from '../store/types';
import { Dialog, EmptyState, Header, Icon, Notice } from '../ui/parts';
import { mochi, useSlide } from '../ui/slide';
import { WritingPad, type WritingPadHandle } from '../ui/WritingPad';
import { GAME_INFO } from './Play';
import { wordSize } from './Word';

export function RoundScreen() {
  const round = useGame((s) => s.play.active);
  const lastReward = useGame((s) => s.play.lastReward);
  const [view, setView] = useState(() => firstOpen(round));
  const [quit, setQuit] = useState(false);
  const [done, setDone] = useState(false);
  const roundId = round?.id;

  useEffect(() => {
    // ラウンドが変わったときだけ 未回答の問題へ移動する
    setView(firstOpen(store.getState().play.active));
  }, [roundId]);

  if (!round) {
    if (done) {
      // しあげの演出中（報酬はすでに保存済み）
      return (
        <div className="screen round-screen">
          <div className="cook-done" aria-live="assertive">
            <ArtBox def={ASSETS.deco.pot} className="cook-done__pot" />
            <p className="h1">できあがり！</p>
          </div>
        </div>
      );
    }
    if (lastReward) {
      // 完了済み（戻る・再読み込み） 報酬は二重に付与しない
      return (
        <div className="screen">
          <Header title="あそぶ" back="/play" />
          <EmptyState
            title="このラウンドはおわっています"
            body="ごはんはもう受け取り済みです"
            action={
              <div className="row">
                <button className="btn" onClick={() => navigate('/play/reward', { replace: true })}>
                  ごほうびを見る
                </button>
                <button className="btn btn--primary" onClick={() => navigate('/play', { replace: true })}>
                  もう一回
                </button>
              </div>
            }
          />
        </div>
      );
    }
    return (
      <div className="screen">
        <Header title="あそぶ" back="/play" />
        <EmptyState title="遊びがはじまっていません" action={<button className="btn btn--primary" onClick={() => navigate('/play', { replace: true })}>あそぶ画面へ</button>} />
      </div>
    );
  }

  const q = round.questions[Math.min(view, round.questions.length - 1)];
  const word = WORD_BY_ID[q.wordId];
  const answer = round.answers[view] ?? null;
  const isLast = view >= round.questions.length - 1;
  const st = store.getState().stats[q.wordId];
  const seenBefore = !!store.getState().pocket[q.wordId] || (!!st && st.seen > 0 && st.lastRound < round.no);

  const submit = (a: Answer) => {
    dispatch({ type: 'answer', roundId: round.id, index: view, answer: a });
    const good = a.kind === 'choice' ? a.correct : a.self === 'ok';
    if (good) {
      petEvent({ kind: 'cheer' });
      sfx('sparkle');
    } else sfx('pop');
  };

  const next = () => {
    if (!isLast) {
      setView((v) => v + 1);
      return;
    }
    const all = store.getState().play.active;
    if (!all || all.answers.some((x) => !x)) {
      setView(firstOpen(all));
      return;
    }
    setDone(true);
    dispatch({ type: 'finishRound', roundId: round.id, at: Date.now() });
    sfx('sparkle');
    window.setTimeout(() => navigate('/play/reward', { replace: true }), 900);
  };

  const feedback = answer && (
    <div className={`feedback ${feedbackGood(answer) ? 'feedback--good' : ''} rise-in`} role="status">
      <FeedbackText answer={answer} word={word} question={q} />
      <button type="button" className="btn btn--lg btn--block" onClick={next} disabled={done} autoFocus>
        {isLast ? '料理をしあげる' : '次へ'}
      </button>
    </div>
  );
  const cookDone = done && (
    <div className="cook-done" aria-live="assertive">
      <ArtBox def={ASSETS.deco.pot} className="cook-done__pot" />
      <p className="h1">できあがり！</p>
    </div>
  );
  const quitDialog = quit && <QuitDialog roundId={round.id} onClose={() => setQuit(false)} />;

  // 漢字を書く遊びは 台所（壁のタイル・伝票・まな板）で書く
  if (q.kind === 'write') {
    return (
      <div className="screen kitchen">
        <div className="kitchen__top">
          <button type="button" className="icon-btn" onClick={() => setQuit(true)} aria-label="もどる" {...mochi}>
            <Icon name="back" />
          </button>
          <Steps count={round.questions.length} current={view} />
        </div>
        <WriteQuestion
          key={`${round.id}-${view}`}
          question={q}
          word={word}
          difficulty={round.difficulty}
          answer={answer}
          onAnswer={submit}
          cta={view + 1 < round.questions.length ? STEPS[view + 1] : 'しあげる'}
        />
        {feedback}
        {cookDone}
        {quitDialog}
      </div>
    );
  }

  return (
    <div className={`screen round-screen round-screen--${round.game}`}>
      <Header
        title={GAME_INFO[round.game].name}
        sub={`${Math.min(view + 1, round.questions.length)} / ${round.questions.length}問`}
        back={() => setQuit(true)}
        pet={{ motion: answer ? (answer.kind === 'choice' ? (answer.correct ? 'cheer' : 'idle') : answer.self === 'ok' ? 'cheer' : 'idle') : 'idle', key: `${view}-${!!answer}` }}
      />
      <Pot round={round} />

      <div className="screen__body round-body">
        {seenBefore && !answer && (
          <p className="seen-badge rise-in">
            <span aria-hidden="true">●</span> この前のことばだ
          </p>
        )}
        <MatchQuestion key={`${round.id}-${view}`} question={q} word={word} answer={answer} onAnswer={submit} />
      </div>

      {feedback}
      {cookDone}
      {quitDialog}
    </div>
  );
}

function QuitDialog({ roundId, onClose }: { roundId: string; onClose: () => void }) {
  return (
    <Dialog
      title="ひと休みしますか？"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            つづける
          </button>
          <button type="button" className="btn btn--block" onClick={() => navigate('/room', { replace: true })}>
            あとでつづきから
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--block"
            onClick={() => {
              dispatch({ type: 'abandonRound', roundId });
              navigate('/play', { replace: true });
            }}
          >
            このラウンドをやめる
          </button>
        </>
      }
    >
      <p className="lead">{'ここまでの回答は保存されています\n「あとでつづきから」を選ぶとあそぶ画面から再開できます'}</p>
    </Dialog>
  );
}

/* ============================================================ 料理の工程（1問ごとに1つ進む） */
const STEPS = ['下ごしらえ', '煮る', '盛る'];

function Steps({ count, current }: { count: number; current: number }) {
  const steps = STEPS.slice(0, Math.max(1, Math.min(count, STEPS.length)));
  const now = steps[Math.min(current, steps.length - 1)];
  const slide = useSlide(now, 'fill');
  return (
    <div className="steps" role="list" ref={slide.ref} {...slide.groupProps} aria-label={`料理の工程 ${current + 1} / ${count}`}>
      {slide.indicator}
      {steps.map((s) => (
        <span role="listitem" key={s} className={`steps__item ${s === now ? 'is-now' : ''}`} data-slide-key={s} aria-current={s === now ? 'step' : undefined}>
          <span>{s}</span>
        </span>
      ))}
    </div>
  );
}

function firstOpen(r: ActiveRound | null) {
  if (!r) return 0;
  const i = r.answers.findIndex((a) => !a);
  return i < 0 ? r.answers.length - 1 : i;
}

const feedbackGood = (a: Answer) => (a.kind === 'choice' ? a.correct : a.self === 'ok');

function FeedbackText({ answer, word, question }: { answer: Answer; word: Word; question: Question }) {
  if (answer.kind === 'choice') {
    return answer.correct ? (
      <div className="feedback__text">
        <p className="h2">ぴったり！材料がそろってきた</p>
        <p className="caption">
          <span className="kanji">{word.surface}</span>（{word.reading}）… {word.meaning}
        </p>
      </div>
    ) : (
      <div className="feedback__text">
        <p className="h2">おしい…正しくはこちら</p>
        <p className="caption">
          <span className="kanji">{word.surface}</span>は「{word.reading}」…{word.meaning}
          {question.kind === 'reading' && '\n次のラウンドでまた会えるかも'}
        </p>
      </div>
    );
  }
  const msg: Record<SelfCheck, string> = {
    ok: answer.peeked ? '見本を見て書けた！練習として記録したよ' : '書けた！材料がそろってきた',
    unsure: 'あやしいところはまた今度',
    ng: 'だいじょうぶ！次のラウンドでまた会えるかも',
  };
  return (
    <div className="feedback__text">
      <p className="h2">{msg[answer.self]}</p>
      <p className="caption">
        <span className="kanji">{word.surface}</span>（{word.reading}）
      </p>
    </div>
  );
}

/* ============================================================ 料理の進み具合 */
function Pot({ round }: { round: ActiveRound }) {
  const filled = round.answers.filter(Boolean).length;
  return (
    <div className="pot" aria-label={`料理の進み具合 ${filled} / ${round.questions.length}`}>
      <div className="pot__slots">
        {round.answers.map((a, i) => (
          <span key={i} className={`pot__slot ${a ? 'is-filled' : ''} ${a && feedbackGood(a) ? 'is-good' : ''}`}>
            {a ? (
              <ArtBox def={ASSETS.ingredients[i % ASSETS.ingredients.length]} className="pot__ingredient" />
            ) : (
              <span className="pot__q">{i + 1}</span>
            )}
          </span>
        ))}
      </div>
      <ArtBox def={ASSETS.deco.pot} className="pot__art" />
    </div>
  );
}

/* ============================================================ ことばあわせ */
function MatchQuestion({ question, word, answer, onAnswer }: { question: Extract<Question, { kind: 'reading' | 'meaning' }>; word: Word; answer: Answer | null; onAnswer: (a: Answer) => void }) {
  const chosen = answer?.kind === 'choice' ? answer.choice : null;
  return (
    <div className="stack question">
      {question.kind === 'reading' ? (
        <>
          <p className="eyebrow">読みをえらぶ</p>
          <div className="q-word">
            <p className="kanji q-word__surface" style={{ fontSize: wordSize(word.surface, 72) }}>
              {word.surface}
            </p>
          </div>
          <h2 className="h2 q-title">この読みは？</h2>
        </>
      ) : (
        <>
          <p className="eyebrow">文に合う意味をえらぶ</p>
          <div className="q-sentence card card--pad">
            <p className="q-sentence__text">
              {splitAround(word.example, word.surface).map((p, i) =>
                p.hit ? (
                  <mark key={i} className="hl kanji">
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>
          </div>
          <h2 className="h2 q-title">
            この文の<span className="kanji">「{word.surface}」</span>の意味は？
          </h2>
        </>
      )}
      <div className={`options options--${question.kind}`}>
        {question.options.map((o) => {
          const isAnswer = o === question.answer;
          const state = chosen == null ? '' : isAnswer ? 'is-correct' : o === chosen ? 'is-wrong' : 'is-dim';
          return (
            <button
              key={o}
              type="button"
              className={`option ${state}`}
              disabled={chosen != null}
              onClick={() => onAnswer({ kind: 'choice', choice: o, correct: isAnswer })}
            >
              <span className="option__mark" aria-hidden="true">
                {state === 'is-correct' && <Icon name="check" />}
                {state === 'is-wrong' && <Icon name="close" />}
              </span>
              <span className="option__text">{o}</span>
              {state === 'is-correct' && <span className="sr-only">（正解）</span>}
              {state === 'is-wrong' && <span className="sr-only">（えらんだ答え）</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function splitAround(text: string, target: string) {
  const i = text.indexOf(target);
  if (i < 0) return [{ text, hit: false }];
  return [
    { text: text.slice(0, i), hit: false },
    { text: target, hit: true },
    { text: text.slice(i + target.length), hit: false },
  ];
}

/* ============================================================ 漢字を書く（台所） */
/** ヒントの部品：2つに分けられる字は部品 ないときは部首と画数 */
function hintChips(t: string): string[] {
  const p = PARTS[t];
  if (p) return p;
  const k = KANJI[t];
  if (!k) return [];
  return k.radical ? [k.radical, `${k.strokes}画`] : [`${k.strokes}画`];
}

function WriteQuestion({
  question,
  word,
  difficulty,
  answer,
  onAnswer,
  cta,
}: {
  question: Extract<Question, { kind: 'write' }>;
  word: Word;
  difficulty: ActiveRound['difficulty'];
  answer: Answer | null;
  onAnswer: (a: Answer) => void;
  /** 次の工程の名前（煮る・盛る） */
  cta: string;
}) {
  const pad = useRef<WritingPadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [hints, setHints] = useState(difficulty === 'easy' ? 1 : 0);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [phase, setPhase] = useState<'write' | 'compare'>(answer ? 'compare' : 'write');
  const [ton, setTon] = useState<{ x: number; y: number; n: number } | null>(null);
  const chars = [...word.surface];
  const targets = question.blanks.map((i) => chars[i]);
  const maxHints = GAME.writeHints[difficulty];
  const peeked = false;

  const masked = chars.map((c, i) => (question.blanks.includes(i) ? '□' : c)).join('');

  const ticket = (
    <div className="ticket">
      <span className="ticket__magnet" aria-hidden="true" />
      <p className="ticket__reading">{word.reading}</p>
      <p className="kanji ticket__word" aria-label={`${word.reading} 空いているところを書く`}>
        {chars.map((c, i) =>
          question.blanks.includes(i) ? (
            <span key={i} className="ticket__blank" aria-hidden="true" />
          ) : (
            <span key={i}>{c}</span>
          ),
        )}
      </p>
      <p className="ticket__sentence">{word.example.replace(word.surface, `［${masked}］`)}</p>
    </div>
  );

  if (phase === 'compare') {
    const a = answer?.kind === 'write' ? answer : null;
    return (
      <>
        {ticket}
        <div className="counter">
          <div className="counter__sheet stack question">
            <div className="compare">
              <figure className="compare__panel">
                <figcaption>あなたの字</figcaption>
                <div className="compare__box" style={{ aspectRatio: String(targets.length) }}>
                  {(a?.drawing ?? drawing) ? <img src={a?.drawing ?? drawing!} alt="自分で書いた字" /> : <span className="caption">（画像なし）</span>}
                </div>
              </figure>
              <figure className="compare__panel">
                <figcaption>見本</figcaption>
                <div className="compare__box" style={{ aspectRatio: String(targets.length) }}>
                  <div className="compare__glyphs kanji" style={{ '--n': targets.length } as React.CSSProperties}>
                    {targets.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </div>
                </div>
              </figure>
            </div>
            <Notice>{'自動で正解・不正解は判定していません\n形をよく見くらべて自分で選んでください'}</Notice>
            {!a && (
              <div className="self-check" role="group" aria-label="自分の字はどうだった？">
                <button type="button" className="btn btn--mint self-check__btn" onClick={() => onAnswer({ kind: 'write', self: 'ok', peeked, hints, drawing })}>
                  <span className="self-check__mark">◯</span>
                  書けた
                </button>
                <button type="button" className="btn btn--butter self-check__btn" onClick={() => onAnswer({ kind: 'write', self: 'unsure', peeked, hints, drawing })}>
                  <span className="self-check__mark">△</span>
                  あやしい
                </button>
                <button type="button" className="btn self-check__btn" onClick={() => onAnswer({ kind: 'write', self: 'ng', peeked, hints, drawing })}>
                  <span className="self-check__mark">✕</span>
                  まだ書けない
                </button>
              </div>
            )}
            {!a && (
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => {
                  setHasInk(false);
                  setStrokeCount(0);
                  setDrawing(null);
                  setPhase('write');
                }}
              >
                書き直す
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {ticket}
      <div className="counter">
        <div className="board" style={{ '--grain': `url(${ASSETS.deco.boardGrain.src})` } as React.CSSProperties}>
          {hints > 0 && (
            <div className="recipe rise-in" aria-live="polite" aria-label="ヒント">
              {targets.map((t, ti) => (
                <span key={ti} className="recipe__group">
                  {hintChips(t)
                    .slice(0, hints)
                    .map((c, ci) => (
                      <span key={ci} className="recipe__item">
                        {ci > 0 && <span className="recipe__plus">＋</span>}
                        <span className={`recipe__part recipe__part--${ci} ${c.length > 1 ? 'is-text' : 'kanji'}`}>{c}</span>
                      </span>
                    ))}
                </span>
              ))}
            </div>
          )}
          <WritingPad
            ref={pad}
            boxes={targets.length}
            ratio={1.08}
            label={`${targets.length}文字を書く手書き欄`}
            onInkChange={(ink, n) => {
              setHasInk(ink);
              setStrokeCount(n);
              if (n === 0) setTon(null);
            }}
            onStrokeEnd={(x, y) => setTon((v) => ({ x, y, n: (v?.n ?? 0) + 1 }))}
            corner={
              ton && (
                <span key={ton.n} className="board__ton" style={{ left: ton.x, top: ton.y }} aria-hidden="true">
                  トン
                </span>
              )
            }
          />
        </div>

        <div className="kitchen-tools">
          <button type="button" className="kitchen-tool" onClick={() => pad.current?.undo()} disabled={strokeCount === 0} {...mochi}>
            <Icon name="undo" />
            1画戻す
          </button>
          <button type="button" className="kitchen-tool" onClick={() => pad.current?.clear()} disabled={strokeCount === 0} {...mochi}>
            <Icon name="erase" />
            消す
          </button>
          <button type="button" className="kitchen-tool" onClick={() => setHints((h) => Math.min(maxHints, h + 1))} disabled={hints >= maxHints} {...mochi}>
            <Icon name="hint" />
            ヒント {hints}/{maxHints}
          </button>
        </div>

        <button
          type="button"
          className="kitchen-cta"
          disabled={!hasInk}
          {...mochi}
          onClick={() => {
            setDrawing(pad.current?.snapshot(120) ?? null);
            setPhase('compare');
          }}
        >
          {cta}
        </button>
      </div>
    </>
  );
}
