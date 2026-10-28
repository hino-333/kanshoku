import { useEffect, useRef, type ReactNode } from 'react';
import { ICONS, type IconName } from './icons';
import { PetSprite } from '../art/PetSprite';
import type { PetMotion } from '../art/PetSprite';
import { goBack } from '../lib/router';
import { useUi } from '../lib/ui';

/* ------------------------------------------------ アイコン（Flowbite の塗り・1色） */
/** 同じ意味の別名（新しいアイコンは増やさない） */
const ALIAS = { trash: 'erase', retry: 'undo', mic: 'voice' } as const;
export type Glyph = IconName | keyof typeof ALIAS;

export function Icon({ name, className, title }: { name: Glyph; className?: string; title?: string }) {
  const key: IconName = name in ALIAS ? ALIAS[name as keyof typeof ALIAS] : (name as IconName);
  return (
    <svg
      viewBox="0 0 24 24"
      className={`icon ${className ?? ''}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + ICONS[key] }}
    />
  );
}

/* ------------------------------------------------ ヘッダー */
export function Header({
  title,
  sub,
  back,
  right,
  pet,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: string | (() => void);
  right?: ReactNode;
  /** 相棒は置くだけ（しゃべらせない） */
  pet?: { motion: PetMotion; key?: string | number };
}) {
  const side = (right || pet) && (
    <div className="header__side">
      {right}
      {pet && (
        <div className="header__pet" aria-hidden="true">
          <PetSprite state={pet.motion === 'search' ? 'search' : pet.motion === 'sigh' ? 'sigh' : pet.motion === 'cheer' ? 'happy' : 'idle'} motion={pet.motion} motionKey={pet.key} />
        </div>
      )}
    </div>
  );
  // もどるボタンがある画面は タイトルを中央に置く
  return (
    <header className={`header ${back ? 'header--center' : ''}`}>
      {back && (
        <button type="button" className="icon-btn" onClick={typeof back === 'string' ? () => goBack(back) : back} aria-label="もどる">
          <Icon name="back" />
        </button>
      )}
      <div className="header__title">
        <h1 className="h2">{title}</h1>
        {sub && <p className="header__sub">{sub}</p>}
      </div>
      {side || (back && <span className="header__side" aria-hidden="true" />)}
    </header>
  );
}

/* ------------------------------------------------ シート */
export function Sheet({ title, onClose, children, labelledBy }: { title: ReactNode; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  const id = labelledBy ?? 'sheet-title';
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h2 className="h2 grow" id={id}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="とじる">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </>
  );
}

export function Dialog({ title, children, actions, onClose }: { title: ReactNode; children?: ReactNode; actions: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="dialog stack" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref}>
        <h2 className="h2" id="dlg-title">
          {title}
        </h2>
        {children}
        <div className="stack stack--s">{actions}</div>
      </div>
    </>
  );
}

/* ------------------------------------------------ トースト */
export function ToastHost() {
  const t = useUi((s) => s.toast);
  return (
    <div className="toast-wrap" aria-live="polite" role="status">
      {t && (
        <div key={t.id} className="toast">
          <Icon name="check" className="btn__icon" />
          {t.text}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ 状態表示 */
export function EmptyState({ art, title, body, action }: { art?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state rise-in">
      {art}
      <h2 className="h2">{title}</h2>
      {body && <p className="caption">{body}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone, children }: { tone?: 'warn'; children: ReactNode }) {
  return (
    <div className={`notice ${tone === 'warn' ? 'notice--warn' : ''}`} role={tone === 'warn' ? 'alert' : undefined}>
      <Icon name={tone === 'warn' ? 'warn' : 'info'} className="notice__icon" />
      <div>{children}</div>
    </div>
  );
}
