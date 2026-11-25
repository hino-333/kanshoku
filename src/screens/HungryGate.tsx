import { useEffect, useRef, useState } from 'react';
import { GAME } from '../config/game.config';
import { WORD_BY_ID } from '../data/words';
import { buildQuestion, pickWords } from '../game/questions';
import { seeded } from '../game/rng';
import { searchAccess } from '../game/searchGate';
import { sfx, useNow } from '../lib/env';
import { navigate } from '../lib/router';
import { dispatch, store, useGame } from '../store/store';
import type { Answer, Question } from '../store/types';
import { Icon } from '../ui/parts';
import { MatchQuestion } from './Round';

/** おなかが0のときの いまの検索の状態（画面がひらいている間 時間でも変わる） */
export function useSearchAccess() {
  const now = useNow(5000);
  const pet = useGame((s) => s.pet);
  const plan = useGame((s) => s.plan);
  const searchTickets = useGame((s) => s.searchTickets);
  return searchAccess({ pet, plan, searchTickets }, now);
}

/** いま調べてよいか（調べられないときは しらべる画面にもどして カードを見せる） */
export function canSearchNow(query?: string): boolean {
  if (searchAccess(store.getState(), Date.now()) !== 'locked') return true;
  navigate(query ? `/search?hold=${encodeURIComponent(query)}` : '/search', { replace: false });
  return false;
}

type Quiz = { question: Extract<Question, { kind: 'reading' | 'meaning' }>; wordId: string };

function makeQuiz(): Quiz | null {
  const state = store.getState();
  const rng = seeded(Date.now());
  const word = pickWords(state, 'match', 'easy', rng)[0];
  if (!word) return null;
  const q = buildQuestion(state, word, 'match', 'easy', rng);
  if (q.kind === 'write') return null;
  return { question: q, wordId: word.id };
}

/**
 * おなかが0で しらべる回数もないときのカード
 * 1問こたえると1回しらべられる／ごはんをあげる／しらべ放題プラン（デモ）
 */
export function HungryGate({ hold, onStart, onEarned }: { hold: string; onStart: () => void; onEarned: () => void }) {
  const name = useGame((s) => s.pet.name);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const earned = useRef(onEarned);
  earned.current = onEarned;

  // 答えたら少し見せてから 待っていた検索をはじめる
  useEffect(() => {
    if (!answer) return;
    const id = window.setTimeout(() => earned.current(), hold ? 1400 : 1100);
    return () => clearTimeout(id);
  }, [answer, hold]);

  if (quiz) {
    const word = WORD_BY_ID[quiz.wordId];
    return (
      <section className="hungry-gate hungry-gate--quiz rise-in" aria-label="1問こたえる">
        <p className="hungry-gate__lead">{'1問こたえると\n1回しらべられるよ'}</p>
        <MatchQuestion
          question={quiz.question}
          word={word}
          answer={answer}
          onAnswer={(a) => {
            if (answer) return;
            setAnswer(a);
            dispatch({ type: 'earnTicket', at: Date.now() });
            sfx(a.kind === 'choice' && a.correct ? 'sparkle' : 'pop');
          }}
        />
        {answer && <p className="hungry-gate__done rise-in">{hold ? `ありがとう\n「${hold}」をしらべるね` : 'ありがとう\n1回しらべられるよ'}</p>}
      </section>
    );
  }

  return (
    <section className="hungry-gate rise-in" aria-labelledby="hungry-title">
      <h2 className="h3 hungry-gate__title" id="hungry-title">
        おなかがぺこぺこ
      </h2>
      <p className="hungry-gate__lead">{`${name}はおなかがすいて\nいまは調べられないみたい`}</p>
      {hold && <p className="caption hungry-gate__hold">{`しらべたいことば「${hold}」`}</p>}
      <div className="stack stack--s">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => {
            const q = makeQuiz();
            if (!q) return;
            setQuiz(q);
            onStart();
          }}
        >
          1問こたえて1回しらべる
        </button>
        <button type="button" className="btn btn--block" onClick={() => navigate('/room/food')}>
          <Icon name="food" className="btn__icon" />
          ごはんをあげる
        </button>
        <button type="button" className="link hungry-gate__plan" onClick={() => navigate('/search/plan')}>
          {`${GAME.plan.name}を見る`}
        </button>
      </div>
    </section>
  );
}
