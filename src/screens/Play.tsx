import { useState } from 'react';
import { GAME, type Difficulty } from '../config/game.config';
import { WORD_BY_ID } from '../data/words';
import { buildRound, recommend } from '../game/questions';
import { navigate, useRoute } from '../lib/router';
import { dispatch, store, useGame } from '../store/store';
import type { GameKind } from '../store/types';
import { mochi, useSlide } from '../ui/slide';
import { Dialog, Header, Icon } from '../ui/parts';
import { DiffDeck } from './PlayDeck';

export const GAME_INFO: Record<GameKind, { name: string; verb: string; desc: string; icon: 'gameWrite' | 'gameMatch' }> = {
  // 名前だけで何をする遊びかわかるように（キャッチーさより一瞬でわかること）
  write: { name: '漢字を書く', verb: '手書きで答える', desc: '読みと文を見て漢字を書く', icon: 'gameWrite' },
  match: { name: '答えをえらぶ', verb: 'えらんで答える', desc: '読みや意味をえらんで料理の材料をそろえる', icon: 'gameMatch' },
};

export const DIFF_INFO: Record<Difficulty, { label: string; desc: string }> = {
  easy: { label: 'やさしい', desc: 'ヒント多め・似た選択肢は出ない' },
  normal: { label: 'ふつう', desc: 'ほどよいヒント・似た選択肢が少し出る' },
  hard: { label: 'むずかしい', desc: 'ヒント少なめ・似た選択肢多め・珍しいごはんが出る' },
};

export function PlayScreen() {
  const route = useRoute();
  const focusId = route.query.get('word');
  const focusWord = focusId ? WORD_BY_ID[focusId] : undefined;
  const state = useGame((s) => s);
  const active = state.play.active;
  const rec = recommend(state);
  const focusTags = focusWord ? state.pocket[focusWord.id]?.tags : undefined;
  const initialGame: GameKind = focusTags ? (focusTags.includes('write') ? 'write' : 'match') : rec.game;
  const [game, setGame] = useState<GameKind>(initialGame);
  const [diff, setDiff] = useState<Difficulty>(state.play.lastDifficulty);
  const gameSlide = useSlide(game, 'ring');
  const [confirm, setConfirm] = useState(false);
  const info = GAME_INFO[game];
  // 保存済み（あつめた漢字）から何問出るか
  const saved = Math.min(
    GAME.questionsPerRound,
    Object.values(state.pocket).filter((e) => (game === 'write' ? e.tags.includes('write') : e.tags.includes('read') || e.tags.includes('meaning'))).length,
  );

  const start = () => {
    const s = store.getState();
    if (s.play.active) dispatch({ type: 'abandonRound', roundId: s.play.active.id });
    const round = buildRound(store.getState(), { game, difficulty: diff, at: Date.now(), rng: Math.random, focusWordId: focusWord?.id });
    dispatch({ type: 'startRound', round });
    navigate('/play/round', { replace: true });
  };

  return (
    <div className="screen play-screen">
      <Header title="あそぶ" />
      <div className="screen__body stack">
        {active && (
          <section className="resume-card card rise-in" aria-labelledby="resume-title">
            <div className="grow resume-card__text">
              <p className="eyebrow">つづきから</p>
              <h2 className="h3" id="resume-title">
                {GAME_INFO[active.game].name}・{active.answers.filter(Boolean).length + 1}/{active.questions.length}問目
              </h2>
            </div>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/play/round')} {...mochi}>
              つづける
            </button>
            <button type="button" className="icon-btn resume-card__close" aria-label="途中のラウンドをやめる" onClick={() => dispatch({ type: 'abandonRound', roundId: active.id })} {...mochi}>
              <Icon name="close" />
            </button>
          </section>
        )}

        <details className="card more-card play-options">
          <summary className="more-card__summary">
            <span className="h3">遊び方を変える</span>
            <span className="caption more-card__value">{info.name}</span>
            <Icon name="down" className="more-card__chev" />
          </summary>
          <div className="stack play-options__body">
            <div className="game-pick" role="radiogroup" aria-label="遊び" ref={gameSlide.ref} {...gameSlide.groupProps}>
              {gameSlide.indicator}
              {(['write', 'match'] as GameKind[]).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={game === g} className="game-option" data-slide-key={g} onClick={() => setGame(g)} {...mochi}>
                  <Icon name={GAME_INFO[g].icon} className="game-option__icon" />
                  <span className="game-option__name">{GAME_INFO[g].name}</span>
                  <span className="caption">{GAME_INFO[g].verb}</span>
                </button>
              ))}
            </div>
          </div>
        </details>

        {focusWord && (
          <div className="focus-banner card card--soft">
            <span className="kanji focus-banner__word">{focusWord.surface}</span>
            <span className="grow caption">このことばから出題します</span>
            <button type="button" className="icon-btn" aria-label="指定をはずす" onClick={() => navigate('/play', { replace: true })}>
              <Icon name="close" />
            </button>
          </div>
        )}

        <DiffDeck
          diff={diff}
          onChange={setDiff}
          labelOf={(d) => DIFF_INFO[d].label}
          descOf={(d) => DIFF_INFO[d].desc}
          card={info}
          facts={['3問', '時間制限なし', saved > 0 ? `保存済みから${saved}問出題` : 'おわるとごはん']}
          onStart={() => (active ? setConfirm(true) : start())}
        />


      </div>

      {confirm && (
        <Dialog
          title="新しくはじめますか？"
          onClose={() => setConfirm(false)}
          actions={
            <>
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/play/round')}>
                さっきのつづきをあそぶ
              </button>
              <button type="button" className="btn btn--block" onClick={start}>
                つづきはやめて新しくはじめる
              </button>
            </>
          }
        >
          <p className="lead">途中のラウンドがあります</p>
        </Dialog>
      )}
    </div>
  );
}
