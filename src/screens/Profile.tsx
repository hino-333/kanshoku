import { useState } from 'react';
import { ASSETS } from '../config/assets.config';
import { FOODS, FOOD_IDS, isFoodId } from '../data/catalog';
import { ArtBox } from '../art/AssetImage';
import { PetSprite } from '../art/PetSprite';
import { favoriteFood } from '../game/pet';
import { dispatch, store, useGame } from '../store/store';
import { Dialog, Header, Icon } from '../ui/parts';
import { toast } from '../lib/ui';

const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export function ProfileScreen() {
  const pet = useGame((s) => s.pet);
  const meals = useGame((s) => s.meals);
  const settings = useGame((s) => s.settings);
  const pocketCount = useGame((s) => Object.keys(s.pocket).length);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pet.name);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fav = favoriteFood({ meals });
  const counts = FOOD_IDS.map((id) => ({ id, n: meals.filter((m) => m.foodId === id).length })).filter((c) => c.n > 0);

  const saveName = () => {
    const name = draft.trim();
    if (!name) return;
    dispatch({ type: 'rename', name });
    setEditing(false);
    toast(`「${name.slice(0, 12)}」になった`);
  };

  return (
    <div className="screen profile-screen">
      <Header title="相棒のプロフィール" back="/room" />
      <div className="screen__body">
        <div className="profile-card card">
            <div className="profile-card__top">
              <div className="profile-photo">
                <PetSprite state="idle" motion="idle" label={pet.name} />
              </div>
              <span className="profile-met">出会った日 {fmtDate(pet.metAt)}</span>
            </div>

            <dl className="profile-fields">
              <div className="profile-field">
                <dt>なまえ</dt>
                <dd>
                  {editing ? (
                    <form
                      className="row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveName();
                      }}
                    >
                      <label className="field field--sm grow">
                        <span className="sr-only">新しいなまえ</span>
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={12} autoFocus enterKeyHint="done" />
                      </label>
                      <button type="submit" className="btn btn--sm btn--primary" disabled={!draft.trim()}>
                        決定
                      </button>
                    </form>
                  ) : (
                    <div className="row">
                      <span className="profile-field__value grow">{pet.name}</span>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => {
                          setDraft(pet.name);
                          setEditing(true);
                        }}
                      >
                        <Icon name="edit" className="btn__icon" />
                        変える
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              <div className="profile-field">
                <dt>好きなごはん</dt>
                <dd className="profile-field__value">{fav && isFoodId(fav) ? FOODS[fav].name : 'まだひみつ'}</dd>
              </div>
              <div className="profile-field">
                <dt>あつめた漢字</dt>
                <dd className="profile-field__value">{pocketCount}こ</dd>
              </div>
            </dl>

            <div className="profile-meals">
              <h2 className="h3 profile-meals__title">
                <Icon name="food" className="profile-meals__icon" />
                食べたごはん
              </h2>
              {counts.length === 0 ? (
                <p className="caption">{'まだ記録がありません\nごはんをあげるとここに残ります'}</p>
              ) : (
                <ul className="meal-list">
                  {counts.map(({ id, n }) => (
                    <li key={id} className="meal-chip">
                      <ArtBox def={ASSETS.food[id]} className="meal-chip__art" />
                      <span>{FOODS[id].name}</span>
                      <span className="meal-chip__n">×{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>

        <section className="settings stack stack--s" aria-labelledby="settings-title">
          <h2 className="h3" id="settings-title">
            設定
          </h2>
          <label className="setting">
            <span className="grow">
              効果音
              <span className="caption setting__desc">ボタンや食事の小さな音</span>
            </span>
            <input type="checkbox" className="switch" checked={settings.sound} onChange={(e) => dispatch({ type: 'setSetting', key: 'sound', value: e.target.checked })} />
          </label>
          <label className="setting">
            <span className="grow">
              動きを減らす
              <span className="caption setting__desc">オフのときは端末の設定に合わせます</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.reduceMotion === 'on'}
              onChange={(e) => dispatch({ type: 'setSetting', key: 'reduceMotion', value: e.target.checked ? 'on' : 'system' })}
            />
          </label>
          <button type="button" className="go-card setting-go" onClick={() => dispatch({ type: 'resetOnboarding' })}>
            <span className="go-card__title grow">はじめの案内をもう一度見る</span>
            <span className="go-card__strip go-card__strip--meaning" aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </button>
          <div className="notice">
            <Icon name="info" className="notice__icon" />
            <div>
              {'記録はこの端末のブラウザの中だけに保存されます\n会員登録は不要で外部には送りません'}
              {!store.persistent && <strong>{'\nいまはブラウザの保存が使えないため閉じると記録が消えます'}</strong>}
            </div>
          </div>
          <button type="button" className="btn btn--sm btn--quiet setting__wipe" onClick={() => setConfirmWipe(true)}>
            <Icon name="trash" className="btn__icon" />
            この端末の記録を消してはじめからにする
          </button>
        </section>
      </div>

      {confirmWipe && (
        <Dialog
          title="記録を消しますか？"
          onClose={() => setConfirmWipe(false)}
          actions={
            <>
              <button type="button" className="btn btn--block" onClick={() => setConfirmWipe(false)}>
                やめる
              </button>
              <button
                type="button"
                className="btn btn--block btn--pink"
                onClick={() => {
                  dispatch({ type: 'wipe', at: Date.now() });
                  setConfirmWipe(false);
                  toast('はじめからにしました');
                }}
              >
                消してはじめから
              </button>
            </>
          }
        >
          <p className="lead">{'あつめた漢字・ごはん・家具・相棒の記録がすべて消えます\n元には戻せません'}</p>
        </Dialog>
      )}
    </div>
  );
}
