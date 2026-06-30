/**
 * AccessibilityToolbar — SEN 友好工具列
 *
 * 浮動在右下角的工具列。預設為單一主按鈕（無障礙 icon），
 * 點開展開設定面板：字體大小 / 對比度 / 簡化模式 / TTS 開關 / 重置。
 *
 * 全部按鈕支援鍵盤導航與 aria-pressed。
 */

import { useState, useRef, useEffect } from "react";
import {
  useAccessibility,
  FontScale,
  ContrastMode,
  LineHeight,
  FontFamily,
  TextColor,
} from "@/contexts/AccessibilityContext";
import {
  Type,
  Contrast,
  Eye,
  Volume2,
  RotateCcw,
  X,
  AlignJustify,
  Palette,
} from "lucide-react";

export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const {
    fontScale,
    setFontScale,
    contrastMode,
    setContrastMode,
    simplifiedMode,
    setSimplifiedMode,
    ttsEnabled,
    setTtsEnabled,
    ttsRate,
    setTtsRate,
    lineHeight,
    setLineHeight,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    resetAll,
  } = useAccessibility();

  // 點外面自動關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // 也要檢查是否點到主按鈕本身（主按鈕不在 popoverRef 內）
        const target = e.target as HTMLElement;
        if (!target.closest("[data-a11y-toggle]")) {
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const fontScaleOptions: { value: FontScale; label: string }[] = [
    { value: "standard", label: "標準" },
    { value: "large", label: "大" },
    { value: "xlarge", label: "特大" },
    { value: "xxlarge", label: "超特大" },
  ];

  const contrastOptions: { value: ContrastMode; label: string }[] = [
    { value: "normal", label: "普通" },
    { value: "yellow-black", label: "黑底黃字" },
    { value: "black-white", label: "白底黑字" },
  ];

  const lineHeightOptions: { value: LineHeight; label: string }[] = [
    { value: "normal", label: "正常" },
    { value: "relaxed", label: "寬鬆" },
    { value: "loose", label: "很寬" },
  ];

  const fontFamilyOptions: { value: FontFamily; label: string }[] = [
    { value: "default", label: "預設" },
    { value: "dyslexic", label: "閱讀友善" },
    { value: "comic", label: "圓體" },
  ];

  const textColorOptions: { value: TextColor; label: string; color: string }[] = [
    { value: "default", label: "黑", color: "#1A1A1A" },
    { value: "blue", label: "藍", color: "#1E3A8A" },
    { value: "green", label: "綠", color: "#14532D" },
  ];

  return (
    <div
      className="a11y-toolbar"
      role="region"
      aria-label="無障礙設定"
    >
      {open && (
        <div ref={popoverRef} className="a11y-toolbar-popover" role="dialog" aria-label="無障礙設定面板">
          <div className="flex items-center justify-between mb-3">
            <h4>無障礙設定</h4>
            <button
              onClick={() => setOpen(false)}
              className="a11y-toolbar-btn"
              aria-label="關閉設定面板"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* 字體大小 */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Type size={14} /> 字體大小
            </h4>
            <div className="row">
              {fontScaleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFontScale(opt.value)}
                  aria-pressed={fontScale === opt.value}
                  className="a11y-toolbar-btn"
                  style={{
                    fontSize: opt.value === "standard" ? 12 : opt.value === "large" ? 14 : opt.value === "xlarge" ? 16 : 18,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 對比度 */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Contrast size={14} /> 對比度
            </h4>
            <div className="row">
              {contrastOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setContrastMode(opt.value)}
                  aria-pressed={contrastMode === opt.value}
                  className="a11y-toolbar-btn"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 簡化模式 */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={14} /> 簡化模式
            </h4>
            <button
              onClick={() => setSimplifiedMode(!simplifiedMode)}
              aria-pressed={simplifiedMode}
              className="a11y-toolbar-btn"
              style={{ width: "100%" }}
            >
              {simplifiedMode ? "已開啟（關閉背景裝飾）" : "關閉"}
            </button>
          </div>

          {/* 行距 */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlignJustify size={14} /> 行距
            </h4>
            <div className="row">
              {lineHeightOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLineHeight(opt.value)}
                  aria-pressed={lineHeight === opt.value}
                  className="a11y-toolbar-btn"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 字型（含 Dyslexia 友善） */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Type size={14} /> 字型
            </h4>
            <div className="row">
              {fontFamilyOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFontFamily(opt.value)}
                  aria-pressed={fontFamily === opt.value}
                  className="a11y-toolbar-btn"
                  style={{
                    fontFamily:
                      opt.value === "dyslexic"
                        ? '"OpenDyslexic", sans-serif'
                        : opt.value === "comic"
                        ? '"Comic Neue", cursive'
                        : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 題目字色（色弱、色盲友善） */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Palette size={14} /> 題目字色
            </h4>
            <div className="row">
              {textColorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTextColor(opt.value)}
                  aria-pressed={textColor === opt.value}
                  className="a11y-toolbar-btn"
                  style={{
                    borderColor: opt.color,
                    borderWidth: 3,
                    color: opt.color,
                    fontWeight: 700,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* TTS 開關 + 語速 */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Volume2 size={14} /> 語音朗讀
            </h4>
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              aria-pressed={ttsEnabled}
              className="a11y-toolbar-btn"
              style={{ width: "100%" }}
            >
              {ttsEnabled ? "朗讀功能已開啟" : "朗讀功能關閉"}
            </button>
            {ttsEnabled && (
              <div style={{ marginTop: 6 }}>
                <label
                  htmlFor="tts-rate"
                  style={{ fontSize: 11, color: "#666", display: "block" }}
                >
                  語速：{ttsRate.toFixed(1)}×
                </label>
                <input
                  id="tts-rate"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsRate}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>

          {/* 重置 */}
          <button
            onClick={() => {
              if (confirm("確定重設所有無障礙設定？")) resetAll();
            }}
            className="a11y-toolbar-btn"
            style={{
              width: "100%",
              background: "#FFB3C6",
              marginTop: 4,
            }}
          >
            <RotateCcw size={14} style={{ marginRight: 4 }} /> 重設全部
          </button>
        </div>
      )}

      <button
        data-a11y-toggle
        onClick={() => setOpen(!open)}
        className="a11y-toolbar-btn"
        aria-label={open ? "關閉無障礙設定" : "開啟無障礙設定"}
        aria-expanded={open}
        aria-controls="a11y-popover"
        style={{
          minWidth: 48,
          minHeight: 48,
          fontSize: 22,
          background: open ? "#D4C5F9" : "#FFF3A3",
        }}
      >
        <span aria-hidden="true">♿</span>
      </button>
    </div>
  );
}

/**
 * TTSButton — 題目旁邊的朗讀按鈕
 *
 * 點擊朗傳該段文字。如果 TTS 正在朗讀同一段，再次點擊會停止。
 *
 * 用法：
 *   <TTSButton text={questionText} label="朗讀題目" />
 */
import { speak, stopSpeaking, isTTSSupported } from "@/lib/tts";

export function TTSButton({
  text,
  label = "朗讀",
  rate,
}: {
  text: string;
  label?: string;
  rate?: number;
}) {
  const { ttsEnabled, ttsRate } = useAccessibility();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 如果 TTS 全域未啟用，不顯示按鈕
  if (!ttsEnabled) return null;
  if (!isTTSSupported()) return null;

  const handleClick = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speak(text, {
      rate: rate ?? ttsRate,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    }).catch(() => setIsSpeaking(false));
  };

  return (
    <button
      onClick={handleClick}
      className="tts-btn"
      aria-label={isSpeaking ? `停止${label}` : label}
      aria-pressed={isSpeaking}
      title={isSpeaking ? "停止朗讀" : label}
      type="button"
    >
      {isSpeaking ? "⏹" : "🔊"}
    </button>
  );
}