import { useEffect, useState } from 'react';
import { navigate } from '../lib/router';
import { useUi } from '../lib/ui';
import { Icon, type Glyph } from './parts';

export type Tab = 'room' | 'search' | 'play' | 'pocket';

const ITEMS: { tab: Tab; label: string; icon: Glyph; path: string }[] = [
  { tab: 'room', label: 'おへや', icon: 'room', path: '/room' },
  { tab: 'search', label: 'しらべる', icon: 'search', path: '/search' },
  { tab: 'play', label: 'あそぶ', icon: 'play', path: '/play' },
  { tab: 'pocket', label: 'あつめた漢字', icon: 'pocket', path: '/pocket' },
];

export function BottomNav({ active, hidden }: { active: Tab | null; hidden?: boolean }) {
  const bumpEv = useUi((s) => s.bump);
  const [bumping, setBumping] = useState<Tab | null>(null);
  useEffect(() => {
    if (!bumpEv) return;
    const tab: Tab = bumpEv.target === 'pocket' ? 'pocket' : 'room';
    setBumping(tab);
    const t = window.setTimeout(() => setBumping(null), 600);
    return () => clearTimeout(t);
  }, [bumpEv]);

  return (
    <nav className={`nav ${hidden ? 'nav--hidden' : ''}`} aria-label="メイン">
      {ITEMS.map((it) => (
        <button
          key={it.tab}
          type="button"
          className={`nav__item ${bumping === it.tab ? 'is-bump' : ''}`}
          aria-current={active === it.tab ? 'page' : undefined}
          onClick={() => navigate(it.path, { replace: active !== null && active !== it.tab ? false : true })}
          data-nav={it.tab}
        >
          <Icon name={it.icon} className="nav__icon" />
          <span className="nav__label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
