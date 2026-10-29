import { useEffect, useState } from 'react';
import { navigate } from '../lib/router';
import { useUi } from '../lib/ui';
import { Icon, type Glyph } from './parts';

export type Tab = 'room' | 'search' | 'play' | 'pocket';

const ITEMS: { tab: Tab; label: string; icon: Glyph; path: string }[] = [
  { tab: 'room', label: 'お部屋', icon: 'room', path: '/room' },
  { tab: 'search', label: '調べる', icon: 'search', path: '/search' },
  { tab: 'play', label: '遊ぶ', icon: 'play', path: '/play' },
  { tab: 'pocket', label: '保存済み', icon: 'pocket', path: '/pocket' },
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
          {/* 選んでいないときは丸いボタンだけ（名前は読み上げ用に残す） */}
          <span className={active === it.tab ? 'nav__label' : 'sr-only'}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
