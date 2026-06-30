/**
 * 連線題編輯器
 *
 * 支援：左/右項目可以是「純文字」或「圖片」或「文字 + 圖片」
 */

import { useState, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, Image as ImageIcon, X, Upload } from "lucide-react";
import type { QuestionEditorProps, MatchingPair } from "./types";
import { useImageUpload } from "./useImageUpload";

export default function MatchingEditor({ initialData, onChange, onValidationChange }: QuestionEditorProps) {
  const [pairs, setPairs] = useState<MatchingPair[]>(
    initialData?.options ?? [
      { id: nanoid(6), left: "", right: "" },
      { id: nanoid(6), left: "", right: "" },
    ]
  );

  const { upload, uploading } = useImageUpload();
  const fileRefs = useRef<{ [key: string]: { left?: HTMLInputElement | null; right?: HTMLInputElement | null } }>({});

  useEffect(() => {
    onChange({
      options: pairs,
      // 預設配對：左 i 對右 i
      correctAnswer: pairs.map((p) => ({ leftId: p.id, rightId: p.id })),
    });
    // 驗證：每對「文字 或 圖片」至少要有一個
    const valid =
      pairs.length >= 2 &&
      pairs.every(
        (p) =>
          (p.left.trim() || p.leftImageUrl) &&
          (p.right.trim() || p.rightImageUrl)
      );
    onValidationChange?.(valid);
  }, [pairs, onChange, onValidationChange]);

  const hasEmpty = pairs.some(
    (p) => !(p.left.trim() || p.leftImageUrl) || !(p.right.trim() || p.rightImageUrl)
  );

  const handleSideImage = async (pairId: string, side: "left" | "right", file: File) => {
    const result = await upload(file);
    if (result) {
      setPairs((prev) =>
        prev.map((p) =>
          p.id === pairId
            ? {
                ...p,
                [side === "left" ? "leftImageKey" : "rightImageKey"]: result.key,
                [side === "left" ? "leftImageUrl" : "rightImageUrl"]: result.url,
              }
            : p
        )
      );
    }
    const inputEl = fileRefs.current[pairId]?.[side];
    if (inputEl) inputEl.value = "";
  };

  const removeSideImage = (pairId: string, side: "left" | "right") => {
    setPairs((prev) =>
      prev.map((p) =>
        p.id === pairId
          ? {
              ...p,
              [side === "left" ? "leftImageKey" : "rightImageKey"]: undefined,
              [side === "left" ? "leftImageUrl" : "rightImageUrl"]: undefined,
            }
          : p
      )
    );
  };

  return (
    <div>
      <label className="block font-black text-sm mb-3">
        配對項目 <span className="text-[#FF8C7A]">*</span>
        {uploading && <span className="ml-2 text-xs text-[#1A1A1A]/60">上傳中...</span>}
      </label>
      {hasEmpty && (
        <div
          className="mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
          style={{ background: "#FFB3C6", border: "2px solid #1A1A1A" }}
          role="alert"
        >
          ⚠️ 每對的左/右項目都要有「文字」或「圖片」
        </div>
      )}
      <div className="flex flex-col gap-3">
        {pairs.map((pair, idx) => (
          <div
            key={pair.id}
            className="flex items-center gap-2 p-2 rounded-xl"
            style={{ background: "#FFF8F0", border: "2px solid #1A1A1A" }}
          >
            <span className="font-black text-sm text-[#1A1A1A]/50 w-5 shrink-0 text-center">
              {idx + 1}
            </span>

            {/* 左側 */}
            <div className="flex-1 flex flex-col gap-1">
              {pair.leftImageUrl ? (
                <div className="relative">
                  <img
                    src={pair.leftImageUrl}
                    alt={`配對 ${idx + 1} 左側`}
                    className="w-full h-16 object-cover rounded-lg border-2 border-[#1A1A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSideImage(pair.id, "left")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF8C7A] border border-[#1A1A1A] rounded-full flex items-center justify-center"
                    aria-label="移除左側圖片"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[pair.id]?.left?.click()}
                  className="w-full h-16 border-2 border-dashed border-[#1A1A1A]/40 rounded-lg flex items-center justify-center gap-1 text-xs text-[#1A1A1A]/50 hover:bg-[#FFE5D9] transition-colors"
                  aria-label={`配對 ${idx + 1} 上傳左側圖片`}
                >
                  <ImageIcon size={14} />
                  左圖
                </button>
              )}
              <input
                type="text"
                value={pair.left}
                onChange={(e) =>
                  setPairs((prev) =>
                    prev.map((p) => (p.id === pair.id ? { ...p, left: e.target.value } : p))
                  )
                }
                placeholder={pair.leftImageUrl ? "（可選）描述" : "左側文字"}
                className="memphis-input px-2 py-1.5 text-xs"
                style={{ background: "#D4C5F9" }}
              />
              <input
                ref={(el) => {
                  if (!fileRefs.current[pair.id]) fileRefs.current[pair.id] = {};
                  fileRefs.current[pair.id]!.left = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSideImage(pair.id, "left", file);
                }}
              />
            </div>

            <span className="font-black text-[#1A1A1A]/50 text-lg shrink-0">↔</span>

            {/* 右側 */}
            <div className="flex-1 flex flex-col gap-1">
              {pair.rightImageUrl ? (
                <div className="relative">
                  <img
                    src={pair.rightImageUrl}
                    alt={`配對 ${idx + 1} 右側`}
                    className="w-full h-16 object-cover rounded-lg border-2 border-[#1A1A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSideImage(pair.id, "right")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF8C7A] border border-[#1A1A1A] rounded-full flex items-center justify-center"
                    aria-label="移除右側圖片"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[pair.id]?.right?.click()}
                  className="w-full h-16 border-2 border-dashed border-[#1A1A1A]/40 rounded-lg flex items-center justify-center gap-1 text-xs text-[#1A1A1A]/50 hover:bg-[#FFE5D9] transition-colors"
                  aria-label={`配對 ${idx + 1} 上傳右側圖片`}
                >
                  <ImageIcon size={14} />
                  右圖
                </button>
              )}
              <input
                type="text"
                value={pair.right}
                onChange={(e) =>
                  setPairs((prev) =>
                    prev.map((p) => (p.id === pair.id ? { ...p, right: e.target.value } : p))
                  )
                }
                placeholder={pair.rightImageUrl ? "（可選）描述" : "右側文字"}
                className="memphis-input px-2 py-1.5 text-xs"
                style={{ background: "#B8F0D8" }}
              />
              <input
                ref={(el) => {
                  if (!fileRefs.current[pair.id]) fileRefs.current[pair.id] = {};
                  fileRefs.current[pair.id]!.right = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSideImage(pair.id, "right", file);
                }}
              />
            </div>

            {pairs.length > 2 && (
              <button
                onClick={() => setPairs((prev) => prev.filter((p) => p.id !== pair.id))}
                className="w-8 h-8 border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center hover:bg-[#FF8C7A] transition-colors shrink-0"
                type="button"
                aria-label={`刪除配對 ${idx + 1}`}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {pairs.length < 8 && (
        <button
          onClick={() =>
            setPairs((prev) => [...prev, { id: nanoid(6), left: "", right: "" }])
          }
          className="mt-3 flex items-center gap-2 text-sm font-bold px-3 py-2 border-2 border-dashed border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
          type="button"
        >
          <Plus size={14} />
          新增配對
        </button>
      )}
      <p className="text-xs font-semibold text-[#1A1A1A]/50 mt-2">
        提示：左/右項目可純文字、純圖片、或文字 + 圖片。預設配對為「左 1 ↔ 右 1」
      </p>
    </div>
  );
}