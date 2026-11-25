import { useState } from 'react';
import { GAME } from '../config/game.config';
import { toast } from '../lib/ui';
import { dispatch, useGame } from '../store/store';
import { Dialog, Header, Icon } from '../ui/parts';

const P = GAME.plan;

const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * しらべ放題プラン（デモ）
 * おなかが0でも何回でも調べられる。実際のお金のやりとりはしない
 */
export function PlanScreen() {
  const plan = useGame((s) => s.plan);
  const name = useGame((s) => s.pet.name);
  const [confirm, setConfirm] = useState<'join' | 'quit' | null>(null);

  return (
    <div className="screen plan-screen">
      <Header title={P.name} back="/search" />
      <div className="screen__body stack">
        <section className="plan-card card card--pad stack stack--s" aria-labelledby="plan-title">
          <p className="eyebrow">{plan.unlimited ? '利用中' : 'おなかがすいていても'}</p>
          <h2 className="h2 plan-card__title" id="plan-title">
            {P.name}
          </h2>
          <p className="plan-card__price">
            <span className="plan-card__yen">{`${P.priceYen}円`}</span>
            <span className="caption">{`／${P.per}`}</span>
          </p>
          <ul className="plan-card__list">
            <li>
              <Icon name="check" className="plan-card__mark" />
              {`${name}のおなかが0でも\n何回でも調べられる`}
            </li>
            <li>
              <Icon name="check" className="plan-card__mark" />
              {'ごはんやあそびは\nこれまでどおり'}
            </li>
          </ul>
          {plan.unlimited && plan.since && <p className="caption">{`${fmtDate(plan.since)}から利用中`}</p>}
        </section>

        <div className="notice">
          <Icon name="info" className="notice__icon" />
          <div>{'これは授業用のデモです\n申し込んでもお金はかかりません'}</div>
        </div>

        {plan.unlimited ? (
          <button type="button" className="btn btn--block" onClick={() => setConfirm('quit')}>
            解約する
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => setConfirm('join')}>
            申し込む
          </button>
        )}
      </div>

      {confirm && (
        <Dialog
          title={confirm === 'join' ? `${P.name}に申し込みますか？` : '解約しますか？'}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <button type="button" className="btn btn--block" onClick={() => setConfirm(null)}>
                やめる
              </button>
              <button
                type="button"
                className={`btn btn--block ${confirm === 'join' ? 'btn--primary' : 'btn--pink'}`}
                onClick={() => {
                  const join = confirm === 'join';
                  dispatch({ type: 'setPlan', unlimited: join, at: Date.now() });
                  setConfirm(null);
                  toast(join ? `${P.name}になった` : '解約しました');
                }}
              >
                {confirm === 'join' ? '申し込む' : '解約する'}
              </button>
            </>
          }
        >
          <p className="lead">
            {confirm === 'join'
              ? `デモなのでお金はかかりません\n本当のアプリでは${P.per}${P.priceYen}円です`
              : 'おなかが0のときは\n1問こたえると調べられるようになります'}
          </p>
        </Dialog>
      )}
    </div>
  );
}
