/**
 * StudentOnboardingModal — 學生首次進入作答頁的「設定你的偏好」卡片
 *
 * 設計理念：
 * - 不強迫學生設定，可「用預設值開始」
 * - 重點展示這 5 個最有感的偏好（字大小/行距/字型/字色/TTS）
 * - 設定會同步到 localStorage（與工具列共用）
 * - 用「我已設定過」勾選跳過後續不再彈（v2 之後不再彈窗）
 */

import { useState } from "react";
import {
  useAccessibility,
  FontScale,
  LineHeight,
  FontFamily,
  TextColor,
} from "@/contexts/AccessibilityContext";
import { X, Type, AlignJustify, Palette, Volume2, Sparkles, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "quiz-student-onboarded-v1";

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

interface Props {
  onClose: () => void;
}

export default function StudentOnboardingModal({ onClose }: Props) {
  const {
    fontScale,
    setFontScale,
    lineHeight,
    setLineHeight,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    ttsEnabled,
    setTtsEnabled,
  } = useAccessibility();

  const [hoveredFont, setHoveredFont] = useState<FontFamily | null>(null);

  const finish = () => {
    markOnboarded();
    onClose();
  };

  const skipWithDefault = () => {
    markOnboarded();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="memphis-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        style={{ background: "white" }}
      >
        <button
          onClick={skipWithDefault}
          aria-label="關閉"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "#FFF3A3",
              border: "3px solid #1A1A1A",
              boxShadow: "3px 3px 0 #1A1A1A",
            }}
            aria-hidden="true"
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 id="onboarding-title" className="memphis-heading text-2xl">
              設定你的偏好
            </h2>
            <p className="text-xs text-[#1A1A1A]/60 font-bold">
              第一次作答？花 10 秒設定，之後會自動記住
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold mb-4 text-[#1A1A1A]/70 leading-relaxed">
          調整下面任何一項，畫面會立刻變化讓你預覽。
          如果你只想用預設值，點下面的「用預設值開始」。
        </p>

        {/* 字體大小 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Type size={14} aria-hidden="true" />
            <span className="text-xs font-black">字體大小</span>
          </div>
          <div className="flex gap-1.5">
            {(["standard", "large", "xlarge", "xxlarge"] as FontScale[]).map((v) => (
              <button
                key={v}
                onClick={() => setFontScale(v)}
                aria-pressed={fontScale === v}
                className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg border-2 border-[#1A1A1A] ${
                  fontScale === v ? "bg-[#B8F0D8]" : "bg-white hover:bg-[#B8F0D8]/30"
                }`}
              >
                {v === "standard" ? "標準" : v === "large" ? "大" : v === "xlarge" ? "特大" : "超特大"}
              </button>
            ))}
          </div>
        </div>

        {/* 行距 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlignJustify size={14} aria-hidden="true" />
            <span className="text-xs font-black">行距</span>
          </div>
          <div className="flex gap-1.5">
            {(["normal", "relaxed", "loose"] as LineHeight[]).map((v) => (
              <button
                key={v}
                onClick={() => setLineHeight(v)}
                aria-pressed={lineHeight === v}
                className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg border-2 border-[#1A1A1A] ${
                  lineHeight === v ? "bg-[#D4C5F9]" : "bg-white hover:bg-[#D4C5F9]/30"
                }`}
              >
                {v === "normal" ? "正常" : v === "relaxed" ? "寬鬆" : "很寬"}
              </button>
            ))}
          </div>
        </div>

        {/* 字型 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Type size={14} aria-hidden="true" />
            <span className="text-xs font-black">字型（閱讀友善）</span>
          </div>
          <div className="flex gap-1.5">
            {(["default", "dyslexic", "comic"] as FontFamily[]).map((v) => (
              <button
                key={v}
                onClick={() => setFontFamily(v)}
                onMouseEnter={() => setHoveredFont(v)}
                onMouseLeave={() => setHoveredFont(null)}
                aria-pressed={fontFamily === v}
                className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg border-2 border-[#1A1A1A] ${
                  fontFamily === v ? "bg-[#FFF3A3]" : "bg-white hover:bg-[#FFF3A3]/30"
                }`}
                style={{
                  fontFamily:
                    v === "dyslexic"
                      ? '"OpenDyslexic", sans-serif'
                      : v === "comic"
                      ? '"Comic Neue", cursive'
                      : undefined,
                }}
              >
                {v === "default" ? "預設" : v === "dyslexic" ? "閱讀友善" : "圓體"}
                {hoveredFont === v && v === "dyslexic" && (
                  <div className="text-[10px] text-[#1A1A1A]/60 font-normal mt-0.5">
                    適合讀寫障礙
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 字色 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Palette size={14} aria-hidden="true" />
            <span className="text-xs font-black">題目字色</span>
          </div>
          <div className="flex gap-1.5">
            {(["default", "blue", "green"] as TextColor[]).map((v) => {
              const c = v === "default" ? "#1A1A1A" : v === "blue" ? "#1E3A8A" : "#14532D";
              return (
                <button
                  key={v}
                  onClick={() => setTextColor(v)}
                  aria-pressed={textColor === v}
                  className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg border-2 border-[#1A1A1A] ${
                    textColor === v ? "bg-[#A8D8EA]" : "bg-white hover:bg-[#A8D8EA]/30"
                  }`}
                  style={{ color: c }}
                >
                  {v === "default" ? "黑色" : v === "blue" ? "藍色" : "綠色"}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#1A1A1A]/50 mt-1">
            色弱、色盲學生可選藍色或綠色
          </p>
        </div>

        {/* TTS */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Volume2 size={14} aria-hidden="true" />
            <span className="text-xs font-black">語音朗讀</span>
          </div>
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            aria-pressed={ttsEnabled}
            className={`w-full px-3 py-2 text-sm font-bold rounded-lg border-2 border-[#1A1A1A] ${
              ttsEnabled ? "bg-[#B8F0D8]" : "bg-white hover:bg-[#B8F0D8]/30"
            }`}
          >
            {ttsEnabled ? "🔊 開啟（題目會有喇叭按鈕）" : "🔇 關閉"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={finish}
            className="memphis-btn py-3 text-base flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            完成設定，開始作答
          </button>
          <button
            onClick={skipWithDefault}
            className="text-sm font-bold text-[#1A1A1A]/60 hover:text-[#1A1A1A] py-2"
          >
            用預設值開始（之後還能從 ♿ 按鈕改）
          </button>
        </div>

        <p className="text-[10px] text-[#1A1A1A]/40 mt-4 text-center leading-relaxed">
          設定只存你的裝置，不會傳給老師或其他人
        </p>
      </div>
    </div>
  );
}