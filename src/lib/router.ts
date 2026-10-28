// ハッシュ方式の小さなルーター。ブラウザの戻る・再読み込みに対応。
import { useSyncExternalStore } from 'react';

export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/room';
  const [path, q = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

let current = typeof location !== 'undefined' ? parse() : { path: '/room', parts: ['room'], query: new URLSearchParams() };
const listeners = new Set<() => void>();

function update() {
  current = parse();
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', update);
  window.addEventListener('popstate', update);
  if (!history.state || typeof history.state.idx !== 'number') {
    history.replaceState({ idx: 0 }, '', location.href);
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const href = `#${to}`;
  if (`#${current.path}${current.query.size ? `?${current.query}` : ''}` === href) return;
  const idx = (history.state?.idx ?? 0) + (opts.replace ? 0 : 1);
  if (opts.replace) history.replaceState({ idx }, '', href);
  else history.pushState({ idx }, '', href);
  update();
}

/** アプリ内の履歴があれば戻る。なければ親の画面へ */
export function goBack(fallback: string) {
  if ((history.state?.idx ?? 0) > 0) history.back();
  else navigate(fallback, { replace: true });
}
