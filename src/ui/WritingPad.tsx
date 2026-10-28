import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';

type Pt = { x: number; y: number };

export interface WritingPadHandle {
  undo(): void;
  clear(): void;
  /** 書いた線を小さな画像にする（見本との見くらべ・お品書き用） */
  snapshot(height?: number): string | null;
}

/**
 * 手書きの入力領域 N マスを横に並べ 十字のガイドを表示する
 * ・この領域だけ touch-action: none にして ページ全体のスクロールや拡大は止めない
 * ・指・マウス・ペンに対応（Pointer Events）
 */
export const WritingPad = forwardRef<WritingPadHandle, { boxes: number; onInkChange: (hasInk: boolean, strokes: number) => void; label: string; corner?: ReactNode }>(
  function WritingPad({ boxes, onInkChange, label, corner }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Pt[][]>([]);
    const current = useRef<Pt[] | null>(null);
    const size = useRef({ w: 0, h: 0, dpr: 1 });

    const lineWidth = () => Math.max(5, (size.current.h || 200) * 0.055);

    const redraw = useCallback(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      const { w, h, dpr } = size.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#382e27';
      ctx.lineWidth = lineWidth();
      for (const s of strokes.current) drawStroke(ctx, s, w, h);
    }, []);

    const inkLength = () => {
      let len = 0;
      for (const s of strokes.current) for (let i = 1; i < s.length; i++) len += Math.hypot((s[i].x - s[i - 1].x) * size.current.w, (s[i].y - s[i - 1].y) * size.current.h);
      return len;
    };
    const report = () => onInkChange(inkLength() > 14, strokes.current.length);

    useEffect(() => {
      const c = canvasRef.current!;
      const ro = new ResizeObserver(() => {
        const r = c.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        size.current = { w: r.width, h: r.height, dpr };
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
        redraw();
      });
      ro.observe(c);
      return () => ro.disconnect();
    }, [redraw]);

    useImperativeHandle(ref, () => ({
      undo() {
        strokes.current.pop();
        redraw();
        report();
      },
      clear() {
        strokes.current = [];
        redraw();
        report();
      },
      snapshot(height = 96) {
        if (!strokes.current.length) return null;
        const { w, h } = size.current;
        const out = document.createElement('canvas');
        out.height = height;
        out.width = Math.round((height * w) / h);
        const ctx = out.getContext('2d')!;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#382e27';
        ctx.lineWidth = Math.max(2.5, height * 0.06);
        for (const s of strokes.current) drawStroke(ctx, s, out.width, out.height);
        return out.toDataURL('image/png');
      },
    }));

    const toPt = (e: { clientX: number; clientY: number }): Pt => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };

    return (
      <div className="pad" style={{ aspectRatio: String(boxes), width: `min(100%, calc(var(--pad-h) * ${boxes}))` }}>
        <div className="pad__guides" aria-hidden="true">
          {Array.from({ length: boxes }, (_, i) => (
            <span key={i} className="pad__box" />
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className="pad__canvas"
          role="img"
          aria-label={label}
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            e.currentTarget.setPointerCapture(e.pointerId);
            current.current = [toPt(e)];
            strokes.current.push(current.current);
            redraw();
          }}
          onPointerMove={(e) => {
            if (!current.current) return;
            const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
            for (const ev of events) current.current.push(toPt(ev));
            redraw();
          }}
          onPointerUp={() => {
            current.current = null;
            report();
          }}
          onPointerCancel={() => {
            current.current = null;
            report();
          }}
        />
        {/* 枠の右上に置くボタン（見本を見る） */}
        {corner && <div className="pad__corner">{corner}</div>}
      </div>
    );
  },
);

function drawStroke(ctx: CanvasRenderingContext2D, s: Pt[], w: number, h: number) {
  if (!s.length) return;
  ctx.beginPath();
  ctx.moveTo(s[0].x * w, s[0].y * h);
  if (s.length === 1) ctx.lineTo(s[0].x * w + 0.1, s[0].y * h + 0.1);
  for (let i = 1; i < s.length - 1; i++) {
    const mx = ((s[i].x + s[i + 1].x) / 2) * w;
    const my = ((s[i].y + s[i + 1].y) / 2) * h;
    ctx.quadraticCurveTo(s[i].x * w, s[i].y * h, mx, my);
  }
  if (s.length > 1) ctx.lineTo(s[s.length - 1].x * w, s[s.length - 1].y * h);
  ctx.stroke();
}
