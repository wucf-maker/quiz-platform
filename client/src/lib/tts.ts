/**
 * TTS Engine — 文字轉語音朗讀引擎
 *
 * 包裝瀏覽器內建的 SpeechSynthesis API，針對 SEN 學生優化：
 * - 自動挑選中文語音（zh-HK > zh-TW > zh-CN > 預設）
 * - 支援朗讀題目、選項、回饋
 * - 可調節語速
 * - 可取消正在朗讀的內容
 *
 * 用法：
 *   import { speak, stopSpeaking, isTTSSupported } from "@/lib/tts";
 *   speak("第一題：蘋果的英文是甚麼？", { rate: 1.0 });
 */

export interface SpeakOptions {
  rate?: number; // 0.5 ~ 2.0，預設 1.0
  pitch?: number; // 0 ~ 2，預設 1.0
  volume?: number; // 0 ~ 1，預設 1.0
  lang?: string; // 預設自動挑中文
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

const CHINESE_LANG_PRIORITY = ["zh-HK", "zh-TW", "zh-CN", "zh"];

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * 從瀏覽器可用語音中挑選最佳中文語音。
 * 如果找不到任何中文語音，返回 null（呼叫端可決定 fallback）。
 */
function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  for (const lang of CHINESE_LANG_PRIORITY) {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (match) return match;
  }
  return null;
}

let _voicesLoaded = false;
let _voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * 等待瀏覽器語音列表載入完成。
 * Chromium / Safari 在頁面載入時 voices 可能尚未準備好。
 */
function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (!isTTSSupported()) return Promise.resolve([]);
  if (_voicesLoaded) return Promise.resolve(window.speechSynthesis.getVoices());

  if (!_voicesPromise) {
    _voicesPromise = new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        _voicesLoaded = true;
        resolve(voices);
        return;
      }
      const handler = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          _voicesLoaded = true;
          window.speechSynthesis.removeEventListener("voiceschanged", handler);
          resolve(v);
        }
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      // Safety timeout — 1.5s 後放棄
      setTimeout(() => {
        if (!_voicesLoaded) {
          _voicesLoaded = true;
          window.speechSynthesis.removeEventListener("voiceschanged", handler);
          resolve(window.speechSynthesis.getVoices());
        }
      }, 1500);
    });
  }
  return _voicesPromise;
}

/**
 * 朗讀一段文字。
 * 自動中斷前一段朗讀，避免疊在一起。
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isTTSSupported() || !text || !text.trim()) return;

  // 先取消前一段，避免疊加
  window.speechSynthesis.cancel();

  await ensureVoicesLoaded();

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);

    const voice = pickChineseVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = options.lang ?? "zh-HK";
    }

    utter.rate = options.rate ?? 1.0;
    utter.pitch = options.pitch ?? 1.0;
    utter.volume = options.volume ?? 1.0;

    utter.onend = () => {
      options.onEnd?.();
      resolve();
    };
    utter.onerror = (e) => {
      // 'canceled' / 'interrupted' 不是真錯誤
      if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
        const err = new Error(`TTS error: ${e.error}`);
        options.onError?.(err);
      }
      resolve();
    };

    window.speechSynthesis.speak(utter);
  });
}

/**
 * 中斷目前正在朗讀的內容。
 */
export function stopSpeaking(): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * 朗讀一段文字（不 await，常用於 fire-and-forget）。
 * 若有進行中的朗讀會先取消。
 */
export function speakNow(text: string, options: SpeakOptions = {}): void {
  speak(text, options).catch(() => {
    /* ignore */
  });
}

/**
 * 朗讀「題目 + 選項」組合。會在題目和選項之間加短停頓感（透過標點）。
 */
export function speakQuestion(
  questionText: string,
  options: { choices?: string[]; rate?: number }
): void {
  const parts: string[] = [];
  parts.push(`題目：${questionText}。`);
  if (options.choices && options.choices.length > 0) {
    options.choices.forEach((c, i) => {
      parts.push(`選項 ${toChineseNumber(i + 1)}：${c}。`);
    });
  }
  const combined = parts.join(" ");
  speakNow(combined, { rate: options.rate });
}

/**
 * 1, 2, 3 → 一, 二, 三 — 朗讀選項序號用。
 */
function toChineseNumber(n: number): string {
  const map = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (n <= 10) return map[n] ?? String(n);
  return String(n);
}