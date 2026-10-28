import { useEffect, useState } from 'react';
import { useKeyboardOpen, useReducedMotion } from './lib/env';
import { navigate, useRoute } from './lib/router';
import { store, useGame } from './store/store';
import { BottomNav, type Tab } from './ui/BottomNav';
import { Dialog, ToastHost } from './ui/parts';
import { CameraSearch, VoiceSearch } from './screens/Capture';
import { Onboarding } from './screens/Onboarding';
import { PlayScreen } from './screens/Play';
import { PocketScreen } from './screens/Pocket';
import { ProfileScreen } from './screens/Profile';
import { RewardScreen } from './screens/Reward';
import { RoomScreen } from './screens/Room';
import { RoundScreen } from './screens/Round';
import { SearchScreen } from './screens/Search';
import { WordScreen } from './screens/Word';

function useScreen() {
  const route = useRoute();
  const [a, b] = route.parts;
  let tab: Tab | null = null;
  let nav = true;
  let el: React.ReactNode;
  switch (a) {
    case 'search':
      tab = 'search';
      if (b === 'camera') {
        el = <CameraSearch />;
        nav = false;
      } else if (b === 'voice') {
        el = <VoiceSearch />;
        nav = false;
      } else el = <SearchScreen />;
      break;
    case 'word':
      tab = route.query.get('from') === 'pocket' ? 'pocket' : 'search';
      el = <WordScreen key={b} id={b ?? ''} />;
      break;
    case 'pocket':
      tab = 'pocket';
      el = <PocketScreen />;
      break;
    case 'play':
      tab = 'play';
      if (b === 'round') {
        el = <RoundScreen />;
        nav = false;
      } else if (b === 'reward') {
        el = <RewardScreen />;
        nav = false;
      } else el = <PlayScreen />;
      break;
    case 'room':
    default:
      tab = 'room';
      if (b === 'profile') {
        el = <ProfileScreen />;
        nav = false;
      } else {
        const mode = b === 'food' ? 'food' : b === 'decor' ? 'decor' : 'idle';
        el = <RoomScreen mode={mode} />;
        nav = mode === 'idle';
      }
  }
  return { el, tab, nav };
}

export function App() {
  const { el, tab, nav } = useScreen();
  const onboarded = useGame((s) => s.onboarded);
  const keyboard = useKeyboardOpen();
  useReducedMotion();
  const [notice, setNotice] = useState(store.notice);

  useEffect(() => {
    if (!location.hash) navigate('/room', { replace: true });
  }, []);

  return (
    <>
      <aside className="app-brand" aria-hidden="true">
        <div className="app-brand__name">漢食</div>
        <div className="app-brand__copy">調べてくれる相棒に遊んでごちそう</div>
      </aside>
      <div className={`app ${nav && !keyboard ? 'app--nav' : ''}`}>
        <main className="app__main">{el}</main>
        <BottomNav active={tab} hidden={!nav || keyboard} />
        <ToastHost />
        {!onboarded && <Onboarding />}
        {notice === 'corrupt' && (
          <Dialog
            title="保存データを読み込めませんでした"
            onClose={() => setNotice(null)}
            actions={
              <button type="button" className="btn btn--primary btn--block" onClick={() => setNotice(null)}>
                わかった
              </button>
            }
          >
            <p className="lead">{'データが壊れていたため新しくはじめました\n元のデータは端末内に別名で残してあります'}</p>
          </Dialog>
        )}
      </div>
    </>
  );
}
