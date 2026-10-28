import { useEffect, useRef, useState } from 'react';
import { dictionary, searchWords } from '../dictionary/provider';
import { OcrLoadError, recognizeJapanese } from '../lib/ocr';
import { navigate } from '../lib/router';
import { petEvent } from '../lib/ui';
import { EmptyState, Header, Icon, Notice } from '../ui/parts';
import { runSearch } from './Search';

/* ============================================================ 確認・修正してから検索 */
function ConfirmText({ initial, source, onRetry }: { initial: string; source: 'camera' | 'voice'; onRetry: () => void }) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState(false);
  const composing = useRef(false);
  const found = text ? searchWords(dictionary.all(), text).hits.slice(0, 4) : [];
  const go = async () => {
    if (!text.trim()) return;
    setError(false);
    try {
      await runSearch(text.trim(), { replace: false });
    } catch {
      setError(true);
    }
  };
  return (
    <div className="stack rise-in">
      <div>
        <p className="eyebrow">{source === 'camera' ? '読み取れた文字' : '聞き取れた文章'}</p>
        <p className="caption">まちがっていたら直してから調べてください</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <label className="field">
          <span className="sr-only">調べる文字</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={() => (composing.current = false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || composing.current || e.keyCode === 229)) e.preventDefault();
            }}
          />
        </label>
      </form>
      {found.length > 0 && (
        <div className="stack stack--s">
          <span className="caption">この中に収録語がありました</span>
          <div className="row row--wrap">
            {found.map((h) => (
              <button key={h.word.id} type="button" className="chip chip--word" onClick={() => navigate(`/word/${h.word.id}?from=search`)}>
                <span className="kanji">{h.word.surface}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <Notice tone="warn">{'辞書に接続できませんでした\nもう一度ためしてください'}</Notice>}
      <button type="button" className="btn btn--primary btn--lg btn--block" disabled={!text.trim()} onClick={() => void go()}>
        この内容で調べる
      </button>
      <button type="button" className="btn btn--block" onClick={onRetry}>
        {source === 'camera' ? 'ほかの画像にする' : 'もう一度話す'}
      </button>
    </div>
  );
}

function Alternatives({ hideImage, onImage }: { hideImage?: boolean; onImage?: () => void }) {
  return (
    <div className="stack stack--s">
      {!hideImage && onImage && (
        <button type="button" className="btn btn--block" onClick={onImage}>
          <Icon name="image" className="btn__icon" />
          写真をえらぶ
        </button>
      )}
      <button type="button" className="btn btn--block" onClick={() => navigate('/search?focus=1', { replace: true })}>
        文字で入力する
      </button>
    </div>
  );
}

/* ============================================================ カメラ */
type CamState = 'intro' | 'live' | 'reading' | 'result' | 'denied' | 'nocamera' | 'loadError' | 'empty';

export function CameraSearch() {
  const [state, setState] = useState<CamState>('intro');
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shootRef = useRef<HTMLInputElement>(null);
  const lastImage = useRef<HTMLCanvasElement | Blob | null>(null);
  const canLive = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stop, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setState('live');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nocamera');
    }
  };

  const read = async (image: HTMLCanvasElement | Blob) => {
    lastImage.current = image;
    setState('reading');
    setProgress(0);
    petEvent({ kind: 'searching' });
    try {
      const t = await recognizeJapanese(image, (p, status) => setProgress(status.includes('recogniz') ? 0.5 + p / 2 : p / 2));
      setText(t);
      setState(t ? 'result' : 'empty');
    } catch (e) {
      setState(e instanceof OcrLoadError ? 'loadError' : 'empty');
    }
  };

  const shutter = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    // 画面の枠（中央の正方形）にあたる部分だけを切り出す
    const side = Math.min(v.videoWidth, v.videoHeight) * 0.62;
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(side);
    c.getContext('2d')!.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, side, side);
    stop();
    void read(c);
  };

  const onFile = (f?: File | null) => {
    if (!f) return;
    stop();
    void read(f);
  };

  const reset = () => {
    stop();
    setText('');
    setState('intro');
  };

  return (
    <div className={`screen capture-screen capture-screen--${state}`}>
      <Header title="カメラで調べる" back={() => (stop(), navigate('/search', { replace: true }))} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={shootRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {state === 'live' ? (
        <div className="viewfinder">
          <video ref={videoRef} playsInline muted autoPlay className="viewfinder__video" />
          <div className="viewfinder__frame" aria-hidden="true" />
          <p className="viewfinder__hint">調べたい漢字を枠の中に写してください</p>
          <div className="viewfinder__bar">
            <button type="button" className="btn btn--sm" onClick={reset}>
              やめる
            </button>
            <button type="button" className="shutter" onClick={shutter} aria-label="撮影して読み取る" />
            <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
              写真
            </button>
          </div>
        </div>
      ) : (
        <div className="screen__body stack">
          {state === 'intro' && (
            <>
              <div className="capture-hero card card--pad">
                <div className="capture-hero__frame" aria-hidden="true">
                  <span className="kanji">字</span>
                </div>
                <p className="lead">紙や画面に書かれた漢字を写すと文字を読み取って調べます</p>
              </div>
              <div className="stack stack--s">
                {canLive && (
                  <button type="button" className="btn btn--primary btn--lg btn--block" onClick={startCamera}>
                    <Icon name="camera" className="btn__icon" />
                    カメラを起動する
                  </button>
                )}
                <button type="button" className={`btn btn--block ${canLive ? '' : 'btn--primary btn--lg'}`} onClick={() => shootRef.current?.click()}>
                  <Icon name="camera" className="btn__icon" />
                  {canLive ? '端末のカメラアプリで撮る' : '撮影する'}
                </button>
                <button type="button" className="btn btn--block" onClick={() => fileRef.current?.click()}>
                  <Icon name="image" className="btn__icon" />
                  写真をえらぶ
                </button>
              </div>
              {!canLive && <Notice>{'このブラウザでは画面の中でカメラを起動できません\n撮影または写真の選択で読み取れます'}</Notice>}
              <Notice>
                {'文字の読み取りはこの端末の中で行います\n画像を外部に送ることはありません\n初回だけ読み取り用のプログラムと日本語データ（合計約6MB）を cdn.jsdelivr.net から取得します\n手書きの文字や小さすぎる文字は読み取れないことがあります'}
              </Notice>
            </>
          )}

          {state === 'reading' && (
            <div className="state" aria-live="polite" aria-busy="true">
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <span style={{ width: `${Math.max(6, progress * 100)}%` }} />
              </div>
              <p className="h3">{progress < 0.5 ? '読み取りの準備をしています…' : '文字を読み取っています…'}</p>
              <p className="caption">初回は少し時間がかかります</p>
            </div>
          )}

          {state === 'result' && <ConfirmText initial={text} source="camera" onRetry={reset} />}

          {state === 'empty' && (
            <EmptyState
              title="文字を読み取れませんでした"
              body={'明るい場所で文字が大きく写るように撮ってみてください\n読み取れない文字は入力でも調べられます'}
              action={<Alternatives onImage={() => fileRef.current?.click()} />}
            />
          )}

          {state === 'denied' && (
            <EmptyState
              title="カメラが許可されていません"
              body={'ブラウザの設定でカメラを許可すると使えます\n許可しなくても写真の選択や文字の入力で調べられます'}
              action={<Alternatives onImage={() => fileRef.current?.click()} />}
            />
          )}

          {state === 'nocamera' && (
            <EmptyState title="カメラを使えませんでした" body="この端末にカメラがないかほかのアプリが使用中です" action={<Alternatives onImage={() => fileRef.current?.click()} />} />
          )}

          {state === 'loadError' && (
            <div className="stack">
              <Notice tone="warn">{'読み取り用のデータを取得できませんでした\n通信状態を確かめてください'}</Notice>
              <button type="button" className="btn btn--primary btn--block" onClick={() => lastImage.current && void read(lastImage.current)}>
                <Icon name="retry" className="btn__icon" />
                もう一度ためす
              </button>
              <Alternatives hideImage />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================ 音声 */
type VoiceState = 'intro' | 'listening' | 'result' | 'denied' | 'unsupported' | 'network' | 'nospeech' | 'nomic';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSR(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function VoiceSearch() {
  const SR = getSR();
  const [state, setState] = useState<VoiceState>(SR ? 'intro' : 'unsupported');
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const gotRef = useRef('');
  const erroredRef = useRef(false);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = () => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.continuous = false;
    gotRef.current = '';
    erroredRef.current = false;
    setInterim('');
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      gotRef.current = text;
      setInterim(text);
    };
    rec.onerror = (e) => {
      erroredRef.current = true;
      const map: Record<string, VoiceState> = {
        'not-allowed': 'denied',
        'service-not-allowed': 'denied',
        network: 'network',
        'no-speech': 'nospeech',
        'audio-capture': 'nomic',
      };
      setState(map[e.error] ?? 'nospeech');
    };
    rec.onend = () => {
      recRef.current = null;
      if (erroredRef.current) return;
      if (gotRef.current) {
        setFinal(gotRef.current);
        setState('result');
      } else setState('nospeech');
    };
    recRef.current = rec;
    setState('listening');
    petEvent({ kind: 'searching' });
    try {
      rec.start();
    } catch {
      setState('unsupported');
    }
  };

  return (
    <div className="screen capture-screen">
      <Header title="声で調べる" back={() => (recRef.current?.abort(), navigate('/search', { replace: true }))} />
      <div className="screen__body stack">
        {state === 'intro' && (
          <>
            <div className="voice-hero card card--pad">
              <p className="lead">調べたいことばを話してください</p>
              <p className="caption">例：「もくひょう」「りれきしょってどう書く？」</p>
            </div>
            <button type="button" className="mic-btn" onClick={start} aria-label="話しはじめる">
              <Icon name="mic" />
            </button>
            <p className="caption mic-caption">ボタンを押して話す</p>
            <Notice>
              {'ブラウザの音声認識を使います\nマイクはこのボタンを押したときに許可を求めます\nGoogle Chrome などでは音声がブラウザ提供元のサーバーに送られて文字になります\n聞き取った文章は調べる前に確認・修正できます'}
            </Notice>
          </>
        )}

        {state === 'listening' && (
          <div className="state" aria-live="polite">
            <div className="wave" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <p className="h3">聞いています…</p>
            <p className="voice-interim">{interim || '　'}</p>
            <button type="button" className="btn" onClick={() => recRef.current?.stop()}>
              話しおわった
            </button>
          </div>
        )}

        {state === 'result' && <ConfirmText initial={final} source="voice" onRetry={start} />}

        {state === 'nospeech' && (
          <EmptyState
            title="聞き取れませんでした"
            body="静かな場所でもう一度ゆっくり話してみてください"
            action={
              <div className="stack stack--s">
                <button type="button" className="btn btn--primary btn--block" onClick={start}>
                  もう一度話す
                </button>
                <Alternatives hideImage />
              </div>
            }
          />
        )}
        {state === 'denied' && (
          <EmptyState title="マイクが許可されていません" body={'ブラウザの設定でマイクを許可すると使えます\n文字の入力でも調べられます'} action={<Alternatives hideImage />} />
        )}
        {state === 'nomic' && <EmptyState title="マイクを使えませんでした" body="マイクが接続されているか確かめてください" action={<Alternatives hideImage />} />}
        {state === 'network' && (
          <div className="stack">
            <Notice tone="warn">{'音声認識のサービスに接続できませんでした\n通信状態を確かめてください'}</Notice>
            <button type="button" className="btn btn--primary btn--block" onClick={start}>
              <Icon name="retry" className="btn__icon" />
              もう一度ためす
            </button>
            <Alternatives hideImage />
          </div>
        )}
        {state === 'unsupported' && (
          <EmptyState
            title="このブラウザは音声入力に対応していません"
            body={'Google Chrome や Safari の最新版で使えます\n文字の入力や端末のキーボードの音声入力でも調べられます'}
            action={<Alternatives hideImage />}
          />
        )}
      </div>
    </div>
  );
}
