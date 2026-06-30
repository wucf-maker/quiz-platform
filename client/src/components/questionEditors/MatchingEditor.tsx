/**
 * 連線題編輯器
 */

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import type { QuestionEditorProps, MatchingPair } from "./types";

export default function MatchingEditor({ initialData, onChange, onValidationChange }: QuestionEditorProps) {
  const [pairs, setPairs] = useState<MatchingPair[]>(
    initialData?.options ?? [
      { id: nanoid(6), left: "", right: "" },
      { id: nanoid(6), left: "", right: "" },
    ]
  );

  useEffect(() => {
    onChange({
      options: pairs,
      // 預設配對：左 i 對右 i（老師之後可視需要調整）
      correctAnswer: pairs.map((p) => ({ leftId: p.id, rightId: p.id })),
    });
    const valid =
      pairs.length >= 2 && pairs.every((p) => p.left.trim() && p.right.trim());
    onValidationChange?.(valid);
  }, [pairs, onChange, onValidationChange]);

  return (
    <div>
      <label className="block font-black text-sm mb-3">
        配對項目 <span className="text-[#FF8C7A]">*</span>
      </label>
      <div className="flex flex-col gap-3">
        {pairs.map((pair, idx) => (
          <div key={pair.id} className="flex items-center gap-2">
            <span className="font-black text-sm text-[#1A1A1A]/50 w-5 shrink-0">{idx + 1}</span>
            <input
              type="text"
              value={pair.left}
              onChange={(e) =>
                setPairs((prev) =>
                  prev.map((p) => (p.id === pair.id ? { ...p, left: e.target.value } : p))
                )
              }
              placeholder="左側項目"
              className="memphis-input flex-1 px-3 py-2 text-sm"
              style={{ background: "#D4C5F9" }}
            />
            <span className="font-black text-[#1A1A1A]/50">↔</span>
            <input
              type="text"
              value={pair.right}
              onChange={(e) =>
                setPairs((prev) =>
                  prev.map((p) => (p.id === pair.id ? { ...p, right: e.target.value } : p))
                )
              }
              placeholder="右側項目"
              className="memphis-input flex-1 px-3 py-2 text-sm"
              style={{ background: "#B8F0D8" }}
            />
            {pairs.length > 2 && (
              <button
                onClick={() => setPairs((prev) => prev.filter((p) => p.id !== pair.id))}
                className="w-8 h-8 border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
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
        提示：預設為「左 1 ↔ 右 1」，老師可視需要重新指定正確配對
      </p>
    </div>
  );
}