import { useState, type CSSProperties } from 'react';
import type { AssetDef } from '../config/assets.config';

export function assetUrl(src: string): string {
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src;
  return import.meta.env.BASE_URL + src;
}

/** 表示倍率・位置の微調整（動きの transform とは別の要素にかける） */
export function adjustStyle(def: AssetDef): CSSProperties {
  const sx = def.offsetX ?? 0;
  const sy = def.offsetY ?? 0;
  const sc = def.scale ?? 1;
  if (!sx && !sy && sc === 1) return {};
  return {
    transform: `translate(${sx}%, ${sy}%) scale(${sc})`,
    transformOrigin: `${(def.pivotX ?? 0.5) * 100}% ${(def.pivotY ?? 1) * 100}%`,
  };
}

interface Props {
  def: AssetDef;
  /** 読み込みに失敗したときに使う代わりの絵 */
  fallback?: AssetDef;
  /** 背景のように枠いっぱいに敷く */
  cover?: boolean;
  /** 装飾なので読み上げない */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * 設定ファイルの絵を表示する。
 * ・縦横比を保って枠に収める（切り抜き・引き伸ばしなし）。画像の実寸で枠が広がらない
 * ・読み込めないときは fallback、それもなければ簡単な代替表示
 */
export function AssetImage({ def, fallback, cover, decorative, className, style }: Props) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const candidates = [def, fallback].filter((d): d is AssetDef => !!d && !failed.has(d.src));
  const active = candidates[0];
  const alt = decorative ? '' : (def.alt ?? '');

  if (!active) {
    return (
      <span className={`asset-missing ${className ?? ''}`} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 4" />
          <path d="M15 15c0-3 2-5 5-5s5 2 5 5c0 4-5 4-5 8M20 28v1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return (
    <img
      key={active.src}
      className={`asset ${cover ? 'asset--cover' : ''} ${className ?? ''}`}
      src={assetUrl(active.src)}
      alt={alt}
      draggable={false}
      decoding="async"
      style={{ ...adjustStyle(active), ...style }}
      onError={() => setFailed((prev) => new Set(prev).add(active.src))}
    />
  );
}

/** 縦横比つきの箱。中の絵は箱に収まる */
export function ArtBox({ def, className, style, children }: { def: AssetDef; className?: string; style?: CSSProperties; children?: React.ReactNode }) {
  return (
    <div className={`art-box ${className ?? ''}`} style={{ aspectRatio: String(def.aspect ?? 1), ...style }}>
      <AssetImage def={def} decorative />
      {children}
    </div>
  );
}
