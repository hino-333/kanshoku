import { ASSETS } from '../config/assets.config';
import { FOODS, FURNITURE } from '../data/catalog';
import { ArtBox } from '../art/AssetImage';
import { PetSprite } from '../art/PetSprite';
import { navigate } from '../lib/router';
import { toast } from '../lib/ui';
import { useGame } from '../store/store';
import { EmptyState, Header, Icon } from '../ui/parts';
import { feedPet } from './Room';

export function RewardScreen() {
  const r = useGame((s) => s.play.lastReward);
  const foods = useGame((s) => s.foods);
  const name = useGame((s) => s.pet.name);

  if (!r) {
    return (
      <div className="screen">
        <Header title="ごほうび" back="/play" />
        <EmptyState title="まだごほうびはありません" body="1ラウンド（3問）あそぶとごはんが手に入ります" action={<button className="btn btn--primary" onClick={() => navigate('/play', { replace: true })}>あそぶ</button>} />
      </div>
    );
  }

  const food = FOODS[r.foodId];
  const canFeed = !r.fed && foods[r.foodId] > 0;

  // 改善案2：クリームの背景に 大きな料理と相棒 見出しと料理名は青
  return (
    <div className="screen reward-screen">
      <div className="screen__body reward-body">
        <h1 className="reward-heading">できあがり！</h1>
        <div className="reward-hero">
          <ArtBox def={ASSETS.food[r.foodId]} className="reward-food" />
          <div className="reward-pet">
            <PetSprite state="happy" motion="cheer" motionKey={r.roundId} label={name} />
          </div>
        </div>
        <p className="reward-title">{food.name}</p>
        <p className="reward-sub">{r.fed ? 'ごちそうさま！' : 'さすがだね！ごはんかごに入ったよ！'}</p>

        <div className="stack stack--s reward-extras">
          {r.bonusFoodId && (
            <div className="reward-extra card rise-in">
              <ArtBox def={ASSETS.food[r.bonusFoodId]} className="reward-extra__art" />
              <span className="grow">
                <span className="caption">{FOODS[r.bonusFoodId].rarity === 'rare' ? 'めずらしいおまけ' : 'おまけ'}</span>
                <span className="h3 reward-extra__name">{FOODS[r.bonusFoodId].name}</span>
              </span>
              <Icon name="food" className="reward-extra__icon" />
            </div>
          )}
          {r.furnitureId && (
            <div className="reward-extra card rise-in" style={{ animationDelay: '120ms' }}>
              <ArtBox def={ASSETS.furniture[r.furnitureId]} className="reward-extra__art" />
              <span className="grow">
                <span className="caption">家具も見つけた</span>
                <span className="h3 reward-extra__name">{FURNITURE[r.furnitureId].name}</span>
              </span>
              <button type="button" className="btn btn--sm" onClick={() => navigate('/room/decor', { replace: true })}>
                置いてみる
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="screen__footer stack stack--s">
        {canFeed ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => {
                feedPet(r.foodId, `reward:${r.roundId}`);
                navigate('/room', { replace: true });
              }}
            >
              {name}に食べさせる
            </button>
            <button
              type="button"
              className="btn btn--block"
              onClick={() => {
                navigate('/room', { replace: true });
                toast('ごはんかごに入れておいたよ');
              }}
            >
              あとで
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => navigate('/room', { replace: true })}>
              おへやへ
            </button>
            <button type="button" className="btn btn--block" onClick={() => navigate('/play', { replace: true })}>
              もう一回あそぶ
            </button>
          </>
        )}
      </div>
    </div>
  );
}
