// 画像から文字を読み取る（tesseract.js / 日本語）。
// 画像は端末の中で処理し、外部へは送らない。
// ただし初回は、読み取りに使うプログラムと日本語データを CDN（cdn.jsdelivr.net）から取得する。

type Worker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

let workerPromise: Promise<Worker> | null = null;
let progressListener: ((p: number, status: string) => void) | null = null;

export class OcrLoadError extends Error {}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('jpn', 1, {
        logger: (m) => progressListener?.(m.progress ?? 0, m.status ?? ''),
      });
    })().catch((e) => {
      workerPromise = null;
      throw new OcrLoadError(String(e));
    });
  }
  return workerPromise;
}

export async function recognizeJapanese(image: HTMLCanvasElement | Blob, onProgress?: (p: number, status: string) => void): Promise<string> {
  progressListener = onProgress ?? null;
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  progressListener = null;
  return cleanOcrText(data.text);
}

/** 読み取った文字から、漢字・かな以外の記号や空白を取りのぞく */
export function cleanOcrText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[^ぁ-ゖァ-ヺー㐀-鿿々〆]/g, '')
    .slice(0, 40);
}
