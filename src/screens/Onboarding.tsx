import { useState } from 'react';
import { ASSETS } from '../config/assets.config';
import { ArtBox } from '../art/AssetImage';
import { PetSprite } from '../art/PetSprite';
import { dispatch, useGame } from '../store/store';
import { Icon } from '../ui/parts';

/** 初回の短い案内（3枚・いつでもスキップ可） */
export function Onboarding() {
  const current = useGame((s) => s.pet.name);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(current);
  const finish = () => dispatch({ type: 'onboard', name, at: Date.now() });
  const last = step === 2;

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="onboard__top">
        <span className="onboard__dots" aria-label={`${step + 1} / 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === step ? 'is-on' : ''} />
          ))}
        </span>
        <button type="button" className="btn btn--sm btn--quiet" onClick={finish}>
          スキップ
        </button>
      </div>

      <div className="onboard__card card" key={step}>
        {step === 0 && (
          <>
            <p className="onboard__logo" aria-hidden="true">
              漢食
            </p>
            <div className="onboard__pet">
              <PetSprite state="idle" motion="cheer" label="相棒" />
            </div>
            <h1 className="h1" id="ob-title">
              はじめまして
            </h1>
            <p className="lead">{'漢字を調べてくれる小さくて食いしん坊の相棒です\nなまえをつけてね'}</p>
            <label className="field field--sm onboard__name">
              <span className="sr-only">相棒のなまえ</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} enterKeyHint="next" />
            </label>
            <p className="caption">あとからプロフィールで変えられます</p>
          </>
        )}
        {step === 1 && (
          <>
            <div className="onboard__mock" aria-hidden="true">
              <span className="search-pill search-pill--mock">
                <Icon name="search" className="search-pill__icon" />
                <span className="search-pill__text">あれ…どう書くんだっけ？</span>
              </span>
              <span className="row onboard__mock-row">
                <Icon name="camera" className="onboard__mock-icon" />
                <Icon name="voice" className="onboard__mock-icon" />
              </span>
            </div>
            <h1 className="h1" id="ob-title">
              困ったらすぐ調べる
            </h1>
            <p className="lead">{'文字・カメラ・声で探せます\nいつでも何度でも調べてだいじょうぶ'}</p>
          </>
        )}
        {step === 2 && (
          <>
            <div className="onboard__food">
              <ArtBox def={ASSETS.food.onigiri} />
            </div>
            <h1 className="h1" id="ob-title">
              あそんでごちそう
            </h1>
            <p className="lead">{'短いことば遊びでごはんが手に入ります\n最初のおにぎりを1つ用意しました\nさっそくあげてみよう'}</p>
          </>
        )}
      </div>

      <div className="onboard__actions">
        {step > 0 && (
          <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
            もどる
          </button>
        )}
        <button type="button" className="btn btn--primary btn--lg grow" onClick={() => (last ? finish() : setStep((s) => s + 1))}>
          {last ? 'はじめる' : '次へ'}
        </button>
      </div>
    </div>
  );
}
