/**
 * AccessibilityContext — SEN (Special Educational Needs) 友好設定中心
 *
 * 為學生提供可調節的無障礙設定：
 * - 字體大小（4 級，覆蓋 root font-size）
 * - 高對比度配色（黑底黃字 / 白底黑字）
 * - 簡化模式（關閉 Memphis 背景裝飾、減少動畫）
 * - TTS 朗讀開關與語速
 *
 * 狀態以 localStorage 持久化，跨 session 記住學生偏好。
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type FontScale = "standard" | "large" | "xlarge" | "xxlarge";
export type ContrastMode = "normal" | "yellow-black" | "black-white";

interface AccessibilitySettings {
  fontScale: FontScale;
  contrastMode: ContrastMode;
  simplifiedMode: boolean;
  ttsEnabled: boolean;
  ttsRate: number; // 0.5 ~ 2.0
}

interface AccessibilityContextValue extends AccessibilitySettings {
  setFontScale: (s: FontScale) => void;
  setContrastMode: (m: ContrastMode) => void;
  setSimplifiedMode: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  setTtsRate: (r: number) => void;
  resetAll: () => void;
}

const STORAGE_KEY = "quiz-a11y-settings-v1";

const DEFAULTS: AccessibilitySettings = {
  fontScale: "standard",
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

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadFromStorage);

  // Persist to localStorage on any change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage unavailable (private mode), silently skip */
    }
  }, [settings]);

  // Apply CSS classes / variables to <html> based on settings
  useEffect(() => {
    const root = document.documentElement;

    // Font scale → CSS variable consumed by utility classes
    root.setAttribute("data-font-scale", settings.fontScale);

    // Contrast mode
    if (settings.contrastMode === "normal") {
      root.removeAttribute("data-contrast");
    } else {
      root.setAttribute("data-contrast", settings.contrastMode);
    }

    // Simplified mode
    if (settings.simplifiedMode) {
      root.setAttribute("data-simplified", "true");
    } else {
      root.removeAttribute("data-simplified");
    }
  }, [settings]);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setSettings((s) => ({ ...s, fontScale }));
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
    // Stop any ongoing speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const value: AccessibilityContextValue = {
    ...settings,
    setFontScale,
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