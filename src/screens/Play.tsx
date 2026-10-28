import { useState } from 'react';
import type { Difficulty } from '../config/game.config';
import { WORD_BY_ID } from '../data/words';
import { buildRound, recommend } from '../game/questions';
import { navigate, useRoute } from '../lib/router';
import { dispatch, store, useGame } from '../store/store';
import type { GameKind } from '../store/types';
import { Dialog, Header, Icon } from '../ui/parts';

export const GAME_INFO: Record<GameKind, { name: string; verb: string; desc: string; icon: 'gameWrite' | 'gameMatch' }> = {
  // 名前だけで何をする遊びかわかるように（キャッチーさより一瞬でわかること）
  write: { name: '漢字を書く', verb: '手書きで答える', desc: '読みと文を見て漢字を書く', icon: 'gameWrite' },
  match: { name: '答えをえらぶ', verb: 'えらんで答える', desc: '読みや意味をえらんで料理の材料をそろえる', icon: 'gameMatch' },
};

export const DIFF_INFO: Record<Difficulty, { label: string; desc: string }> = {
  easy: { label: 'やさしい', desc: 'ヒント多め・似た選択肢は出ない' },
  normal: { label: 'ふつう', desc: 'ほどよいヒント・似た選択肢が少し出る' },
  hard: { label: 'むずかしい', desc: 'ヒント少なめ・似た選択肢が多め・珍しいごはんが出やすい' },
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
  const [confirm, setConfirm] = useState(false);
  const info = GAME_INFO[game];

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
          <section className="resume-card card card--pad stack stack--s rise-in" aria-labelledby="resume-title">
            <p className="eyebrow">つづきから</p>
            <h2 className="h2" id="resume-title">
              {GAME_INFO[active.game].name}・{active.answers.filter(Boolean).length + 1}/{active.questions.length}問目
            </h2>
            <p className="caption">途中までの回答は保存されています</p>
            <div className="row">
              <button type="button" className="btn btn--primary grow" onClick={() => navigate('/play/round')}>
                つづける
              </button>
              <button type="button" className="btn btn--sm" onClick={() => dispatch({ type: 'abandonRound', roundId: active.id })}>
                やめる
              </button>
            </div>
          </section>
        )}

        <details className="card more-card play-options">
          <summary className="more-card__summary">
            <span className="h3">遊び方を変える</span>
            <span className="caption more-card__value">{info.name}</span>
            <Icon name="down" className="more-card__chev" />
          </summary>
          <div className="stack play-options__body">
            <div className="game-pick" role="radiogroup" aria-label="遊び">
              {(['write', 'match'] as GameKind[]).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={game === g} className="game-option" onClick={() => setGame(g)}>
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

        <section className={`recipe-hero card recipe-hero--${diff}`} aria-labelledby="hero-title">
          {/* 難しさはカードのいちばん上で選ぶ（選ぶとカードの色も同じ濃さに変わる） */}
          <div className="recipe-hero__level">
            <div className="seg seg--level" role="radiogroup" aria-label="難しさ">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={diff === d} className={`seg__item seg__item--${d}`} onClick={() => setDiff(d)}>
                  {DIFF_INFO[d].label}
                </button>
              ))}
            </div>
            <p className="caption seg__desc">{DIFF_INFO[diff].desc}</p>
          </div>
          <p className="eyebrow">{focusWord ? 'このことばで' : game === rec.game ? 'おすすめ' : 'えらんだ遊び'}</p>
          <div className="recipe-hero__main">
            <Icon name={info.icon} className="recipe-hero__icon" />
            <div className="grow">
              <h2 className="h1" id="hero-title">
                {info.name}
              </h2>
              <p className="caption">{info.desc}</p>
            </div>
          </div>
          <ul className="recipe-hero__facts">
            <li>3問</li>
            <li>時間制限なし</li>
            <li>おわるとごはん</li>
          </ul>
          {!focusWord && game === rec.game && (
            <p className="recipe-hero__reason">
              <Icon name="pocket" className="recipe-hero__reason-icon" />
              {rec.reason}
            </p>
          )}
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => (active ? setConfirm(true) : start())}>
            はじめる
          </button>
        </section>


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
