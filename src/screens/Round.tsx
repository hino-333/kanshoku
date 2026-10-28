import { useEffect, useRef, useState } from 'react';
import { ASSETS } from '../config/assets.config';
import { GAME } from '../config/game.config';
import { KANJI, WORD_BY_ID, type Word } from '../data/words';
import { ArtBox } from '../art/AssetImage';
import { sfx } from '../lib/env';
import { navigate } from '../lib/router';
import { petEvent } from '../lib/ui';
import { dispatch, store, useGame } from '../store/store';
import type { ActiveRound, Answer, Question, SelfCheck } from '../store/types';
import { Dialog, EmptyState, Header, Icon, Notice } from '../ui/parts';
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
        {q.kind === 'write' ? (
          <WriteQuestion key={`${round.id}-${view}`} question={q} word={word} difficulty={round.difficulty} answer={answer} onAnswer={submit} />
        ) : (
          <MatchQuestion key={`${round.id}-${view}`} question={q} word={word} answer={answer} onAnswer={submit} />
        )}
      </div>

      {answer && (
        <div className={`feedback ${feedbackGood(answer) ? 'feedback--good' : ''} rise-in`} role="status">
          <FeedbackText answer={answer} word={word} question={q} />
          <button type="button" className="btn btn--lg btn--block" onClick={next} disabled={done} autoFocus>
            {isLast ? '料理をしあげる' : '次へ'}
          </button>
        </div>
      )}

      {done && (
        <div className="cook-done" aria-live="assertive">
          <ArtBox def={ASSETS.deco.pot} className="cook-done__pot" />
          <p className="h1">できあがり！</p>
        </div>
      )}

      {quit && (
        <Dialog
          title="ひと休みしますか？"
          onClose={() => setQuit(false)}
          actions={
            <>
              <button type="button" className="btn btn--primary btn--block" onClick={() => setQuit(false)}>
                つづける
              </button>
              <button type="button" className="btn btn--block" onClick={() => navigate('/room', { replace: true })}>
                あとでつづきから
              </button>
              <button
                type="button"
                className="btn btn--quiet btn--block"
                onClick={() => {
                  dispatch({ type: 'abandonRound', roundId: round.id });
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
      )}
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

/* ============================================================ 仕上げのひと筆 */
function WriteQuestion({
  question,
  word,
  difficulty,
  answer,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'write' }>;
  word: Word;
  difficulty: ActiveRound['difficulty'];
  answer: Answer | null;
  onAnswer: (a: Answer) => void;
}) {
  const pad = useRef<WritingPadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [hints, setHints] = useState(difficulty === 'easy' ? 1 : 0);
  const [peeked, setPeeked] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [phase, setPhase] = useState<'write' | 'compare'>(answer ? 'compare' : 'write');
  const chars = [...word.surface];
  const targets = question.blanks.map((i) => chars[i]);
  const maxHints = GAME.writeHints[difficulty];
  const target0 = KANJI[targets[0]];

  const hintLines = [
    `意味：${word.meaning}`,
    targets.length === 1 && target0?.radical ? `部首は「${target0.radical}」（${target0.radicalName}）・${target0.strokes}画` : `画数：${targets.map((t) => `${KANJI[t]?.strokes ?? '?'}画`).join('・')}`,
  ].slice(0, maxHints);

  const masked = chars.map((c, i) => (question.blanks.includes(i) ? '□' : c)).join('');

  if (phase === 'compare') {
    const a = answer?.kind === 'write' ? answer : null;
    return (
      <div className="stack question">
        <p className="eyebrow">見くらべる</p>
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
        <p className="compare__word">
          <span className="kanji">
            {chars.map((c, i) => (
              <span key={i} className={question.blanks.includes(i) ? 'compare__target' : ''}>
                {c}
              </span>
            ))}
          </span>
          <span className="caption">（{word.reading}）</span>
        </p>
        <Notice>
          {'自動で正解・不正解は判定していません\n形をよく見くらべて自分で選んでください'}
          {(a?.peeked ?? peeked) && <strong>{'\n書く前に見本を見たので今回は「練習」として記録します'}</strong>}
        </Notice>
        {!a && (
          <div className="self-check" role="group" aria-label="自分の字はどうだった？">
            <button type="button" className="btn btn--mint self-check__btn" onClick={() => onAnswer({ kind: 'write', self: 'ok', peeked, hints, drawing })}>
              <span className="self-check__mark">◯</span>
              {peeked ? '見本を見て書けた' : '書けた'}
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
    );
  }

  return (
    <div className="stack question">
      <div className="q-write card card--pad">
        <p className="eyebrow q-write__lead">読みと文を見て漢字を書こう</p>
        <p className="q-write__reading">{word.reading}</p>
        <p className="kanji q-write__masked" aria-label={`${word.reading} 空いているところを書く`}>
          {chars.map((c, i) =>
            question.blanks.includes(i) ? (
              <span key={i} className="q-write__blank" aria-hidden="true" />
            ) : (
              <span key={i}>{c}</span>
            ),
          )}
        </p>
        <p className="q-write__sentence">{word.example.replace(word.surface, `［${masked}］`)}</p>
      </div>

      {hints > 0 && (
        <ul className="hints" aria-live="polite">
          {hintLines.slice(0, hints).map((h) => (
            <li key={h} className="hint rise-in">
              <Icon name="hint" className="hint__icon" />
              {h}
            </li>
          ))}
        </ul>
      )}

      <WritingPad
        ref={pad}
        boxes={targets.length}
        label={`${targets.length}文字を書く手書き欄`}
        onInkChange={(ink, n) => {
          setHasInk(ink);
          setStrokeCount(n);
        }}
        corner={
          <button
            type="button"
            className="pad__peek"
            onClick={() => {
              setPeeked(true);
              setPeekOpen((v) => !v);
            }}
            aria-expanded={peekOpen}
            aria-label="見本を見る"
          >
            <Icon name="eye" />
          </button>
        }
      />

      <div className="pad-tools">
        <button type="button" className="tool" onClick={() => pad.current?.undo()} disabled={strokeCount === 0}>
          <Icon name="undo" />
          1画戻す
        </button>
        <button type="button" className="tool" onClick={() => pad.current?.clear()} disabled={strokeCount === 0}>
          <Icon name="erase" />
          消す
        </button>
        <button type="button" className="tool" onClick={() => setHints((h) => Math.min(maxHints, h + 1))} disabled={hints >= maxHints}>
          <Icon name="hint" />
          ヒント {hints}/{maxHints}
        </button>
      </div>

      {peekOpen && (
        <div className="peek card card--pad rise-in">
          <span className="kanji peek__chars">{targets.join('')}</span>
          <span className="caption">見本を見たあとは「練習」として記録します</span>
        </div>
      )}

      <button
        type="button"
        className="btn btn--primary btn--lg btn--block"
        disabled={!hasInk}
        onClick={() => {
          setDrawing(pad.current?.snapshot(120) ?? null);
          setPeekOpen(false);
          setPhase('compare');
        }}
      >
        {hasInk ? '書けた！見本と見くらべる' : 'まずは書いてみよう'}
      </button>
    </div>
  );
}
