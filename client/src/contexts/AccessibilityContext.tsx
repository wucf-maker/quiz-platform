/**
 * AccessibilityContext — SEN (Special Educational Needs) 友好設定中心
 *
 * 為學生提供可調節的無障礙設定（每位學生獨立，存於 localStorage）：
 * - 字體大小（4 級）
 * - 行距（3 級 — 對讀寫障礙、ADHD 有明顯幫助）
 * - 字型（含 dyslexia 友善字型 — 用 Google Fonts 載入）
 * - 題目文字顏色（3 色 — 對色弱/色盲友善）
 * - 高對比度配色（黑底黃字 / 白底黑字）
 * - 簡化模式（關閉 Memphis 背景裝飾、減少動畫）
 * - TTS 朗讀開關與語速
 *
 * 狀態以 localStorage 持久化，跨 session 記住學生偏好。
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type FontScale = "standard" | "large" | "xlarge" | "xxlarge";
export type ContrastMode = "normal" | "yellow-black" | "black-white";
export type LineHeight = "normal" | "relaxed" | "loose";
export type FontFamily = "default" | "dyslexic" | "comic";
export type TextColor = "default" | "blue" | "green";

interface AccessibilitySettings {
  fontScale: FontScale;
  lineHeight: LineHeight;
  fontFamily: FontFamily;
  textColor: TextColor;
  contrastMode: ContrastMode;
  simplifiedMode: boolean;
  ttsEnabled: boolean;
  ttsRate: number; // 0.5 ~ 2.0
}

interface AccessibilityContextValue extends AccessibilitySettings {
  setFontScale: (s: FontScale) => void;
  setLineHeight: (v: LineHeight) => void;
  setFontFamily: (v: FontFamily) => void;
  setTextColor: (v: TextColor) => void;
  setContrastMode: (m: ContrastMode) => void;
  setSimplifiedMode: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  setTtsRate: (r: number) => void;
  resetAll: () => void;
}

const STORAGE_KEY = "quiz-a11y-settings-v2";

const DEFAULTS: AccessibilitySettings = {
  fontScale: "standard",
  lineHeight: "normal",
  fontFamily: "default",
  textColor: "default",
  contrastMode: "normal",
  simplifiedMode: false,
  ttsEnabled: false,
  ttsRate: 1.0,
};

function loadFromStorage(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      fontScale: parsed.fontScale ?? DEFAULTS.fontScale,
      lineHeight: parsed.lineHeight ?? DEFAULTS.lineHeight,
      fontFamily: parsed.fontFamily ?? DEFAULTS.fontFamily,
      textColor: parsed.textColor ?? DEFAULTS.textColor,
      contrastMode: parsed.contrastMode ?? DEFAULTS.contrastMode,
      simplifiedMode: parsed.simplifiedMode ?? DEFAULTS.simplifiedMode,
      ttsEnabled: parsed.ttsEnabled ?? DEFAULTS.ttsEnabled,
      ttsRate: typeof parsed.ttsRate === "number" ? parsed.ttsRate : DEFAULTS.ttsRate,
    };
  } catch {
    return DEFAULTS;
  }
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

// CSS 變量 map（套到 document.documentElement.style）
const FONT_SCALE_PX: Record<FontScale, number> = {
  standard: 16,
  large: 18,
  xlarge: 21,
  xxlarge: 24,
};
const LINE_HEIGHT: Record<LineHeight, string> = {
  normal: "1.5",
  relaxed: "1.8",
  loose: "2.1",
};
const FONT_FAMILY: Record<FontFamily, string> = {
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif',
  // OpenDyslexic 透過 CDN 載入
  dyslexic: '"OpenDyslexic", -apple-system, "Microsoft JhengHei", sans-serif',
  // Comic Neue — 對讀寫障礙/Dyslexia 友善的圓體字
  comic: '"Comic Neue", "Microsoft JhengHei", "DFKai-SB", "BiauKai", cursive',
};
const TEXT_COLOR: Record<TextColor, string> = {
  default: "#1A1A1A",
  blue: "#1E3A8A", // 深藍 — 對藍色盲、色弱較友善
  green: "#14532D", // 深綠 — 對紅綠色盲友善
};

let dyslexicInjected = false;
let comicInjected = false;

function ensureFontsLoaded() {
  if (typeof document === "undefined") return;
  // 動態注入 Google Fonts — 只在用戶選了對應字型才打開
  if (!dyslexicInjected) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=OpenDyslexic:wght@400;700&display=swap";
    link.dataset.font = "open-dyslexic";
    document.head.appendChild(link);
    dyslexicInjected = true;
  }
  if (!comicInjected) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap";
    link.dataset.font = "comic-neue";
    document.head.appendChild(link);
    comicInjected = true;
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadFromStorage);

  // Persist to localStorage on any change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage unavailable */
    }
  }, [settings]);

  // Apply CSS variables to <html> based on settings
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 字體大小（CSS 變量 --a11y-font-base）
    root.style.setProperty("--a11y-font-base", `${FONT_SCALE_PX[settings.fontScale]}px`);
    root.setAttribute("data-font-scale", settings.fontScale);

    // 行距
    root.style.setProperty("--a11y-line-height", LINE_HEIGHT[settings.lineHeight]);
    root.setAttribute("data-line-height", settings.lineHeight);

    // 字型
    if (settings.fontFamily !== "default") ensureFontsLoaded();
    root.style.setProperty("--a11y-font-family", FONT_FAMILY[settings.fontFamily]);
    root.setAttribute("data-font-family", settings.fontFamily);

    // 題目文字顏色（覆蓋 #1A1A1A）
    root.style.setProperty("--a11y-text-color", TEXT_COLOR[settings.textColor]);
    root.setAttribute("data-text-color", settings.textColor);

    // 高對比度
    if (settings.contrastMode === "normal") {
      root.removeAttribute("data-contrast");
    } else {
      root.setAttribute("data-contrast", settings.contrastMode);
    }

    // 簡化模式
    if (settings.simplifiedMode) {
      root.setAttribute("data-simplified", "true");
    } else {
      root.removeAttribute("data-simplified");
    }
  }, [settings]);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setSettings((s) => ({ ...s, fontScale }));
  }, []);
  const setLineHeight = useCallback((lineHeight: LineHeight) => {
    setSettings((s) => ({ ...s, lineHeight }));
  }, []);
  const setFontFamily = useCallback((fontFamily: FontFamily) => {
    setSettings((s) => ({ ...s, fontFamily }));
  }, []);
  const setTextColor = useCallback((textColor: TextColor) => {
    setSettings((s) => ({ ...s, textColor }));
  }, []);
  const setContrastMode = useCallback((contrastMode: ContrastMode) => {
    setSettings((s) => ({ ...s, contrastMode }));
  }, []);
  const setSimplifiedMode = useCallback((simplifiedMode: boolean) => {
    setSettings((s) => ({ ...s, simplifiedMode }));
  }, []);
  const setTtsEnabled = useCallback((ttsEnabled: boolean) => {
    setSettings((s) => ({ ...s, ttsEnabled }));
  }, []);
  const setTtsRate = useCallback((ttsRate: number) => {
    setSettings((s) => ({ ...s, ttsRate: Math.max(0.5, Math.min(2.0, ttsRate)) }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULTS);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const value: AccessibilityContextValue = {
    ...settings,
    setFontScale,
    setLineHeight,
    setFontFamily,
    setTextColor,
    setContrastMode,
    setSimplifiedMode,
    setTtsEnabled,
    setTtsRate,
    resetAll,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}