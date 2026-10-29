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
/** 下にスワイプして閉じる：これより長く引くか 速くはらうと閉じる */
const SHEET_CLOSE_DY = 96;
const SHEET_CLOSE_SPEED = 0.6; // px/ms
const SHEET_OUT_MS = 220;

export function Sheet({ title, onClose, children, labelledBy }: { title: ReactNode; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const drag = useRef<{ y0: number; t0: number; dy: number; lastY: number; lastT: number } | null>(null);

  /** 指の位置にシートを合わせる（指を離すまでは動きをつけずに追いかける） */
  const follow = (dy: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${Math.max(0, dy)}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(1 - Math.min(1, Math.max(0, dy) / el.offsetHeight));
  };
  /** 下へすべって消えてから閉じる */
  const dismiss = () => {
    const el = ref.current;
    if (leaving.current) return;
    leaving.current = true;
    if (!el) return onClose();
    el.style.transition = `transform ${SHEET_OUT_MS}ms cubic-bezier(0.4, 0, 1, 1)`;
    el.style.transform = 'translateY(100%)';
    if (backdropRef.current) {
      backdropRef.current.style.transition = `opacity ${SHEET_OUT_MS}ms`;
      backdropRef.current.style.opacity = '0';
    }
    window.setTimeout(onClose, SHEET_OUT_MS);
  };
  const settle = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const speed = (d.lastY - d.y0) / Math.max(1, d.lastT - d.t0);
    if (d.dy > SHEET_CLOSE_DY || (d.dy > 16 && speed > SHEET_CLOSE_SPEED)) return dismiss();
    // 足りなければ元の位置へ戻す
    const el = ref.current;
    if (el) {
      el.style.transition = 'transform 240ms var(--ease-out)';
      el.style.transform = '';
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'opacity 240ms';
      backdropRef.current.style.opacity = '';
    }
  };
  const startY = useRef(0);
  const start = (y: number) => {
    const t = performance.now();
    startY.current = y;
    drag.current = { y0: y, t0: t, dy: 0, lastY: y, lastT: t };
  };
  const move = (y: number) => {
    const d = drag.current;
    if (!d) return;
    // 速さは直近の動きで測る（ゆっくり引いてから最後にはらっても閉じる）
    const t = performance.now();
    if (t - d.t0 > 80) {
      d.y0 = d.lastY;
      d.t0 = d.lastT;
    }
    d.lastY = y;
    d.lastT = t;
    d.dy = y - startY.current;
    follow(d.dy);
  };

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  // 中身がいちばん上までスクロールされているときは 中身を下に引いてもシートごと下がる
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let pulling = false;
    let y0 = 0;
    const onStart = (e: TouchEvent) => {
      pulling = false;
      y0 = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (!pulling) {
        if (body.scrollTop > 0 || y - y0 <= 4) return;
        pulling = true;
        start(y0);
      }
      e.preventDefault();
      move(y);
    };
    const onEnd = () => {
      if (pulling) settle();
      pulling = false;
    };
    body.addEventListener('touchstart', onStart, { passive: true });
    body.addEventListener('touchmove', onMove, { passive: false });
    body.addEventListener('touchend', onEnd);
    body.addEventListener('touchcancel', onEnd);
    return () => {
      body.removeEventListener('touchstart', onStart);
      body.removeEventListener('touchmove', onMove);
      body.removeEventListener('touchend', onEnd);
      body.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // つまみと見出しのあたりは どこからでもつかんで下に引ける
  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      start(e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => drag.current && move(e.clientY),
    onPointerUp: settle,
    onPointerCancel: settle,
  };

  const id = labelledBy ?? 'sheet-title';
  return (
    <>
      <div className="backdrop" ref={backdropRef} onClick={dismiss} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <div className="sheet__grab" {...grab}>
          <div className="sheet__grip" />
          <div className="sheet__head">
            <h2 className="h2 grow" id={id}>
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={dismiss} aria-label="とじる">
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="sheet__body" ref={bodyRef}>
          {children}
        </div>
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
