/**
 * 填充題編輯器
 */

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { QuestionEditorProps } from "./types";

export default function FillBlankEditor({ initialData, onChange, onValidationChange }: QuestionEditorProps) {
  const [answer, setAnswer] = useState<string>(
    Array.isArray(initialData?.correctAnswer)
      ? initialData.correctAnswer[0] ?? ""
      : typeof initialData?.correctAnswer === "string"
      ? initialData.correctAnswer
      : ""
  );
  const [altAnswers, setAltAnswers] = useState<string[]>(
    Array.isArray(initialData?.correctAnswer) ? initialData.correctAnswer.slice(1) : []
  );

  useEffect(() => {
    const all = [answer.trim(), ...altAnswers.filter((a) => a.trim())];
    const correctAnswer = all.length === 1 ? all[0] : all;
    onChange({ options: null, correctAnswer });
    onValidationChange?.(!!answer.trim());
  }, [answer, altAnswers, onChange, onValidationChange]);

  return (
    <div>
      <label className="block font-black text-sm mb-2">
        正確答案 <span className="text-[#FF8C7A]">*</span>
      </label>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="輸入正確答案"
        className="memphis-input w-full px-4 py-3 text-base"
        style={{ background: "#FFF3A3" }}
      />
      <p className="text-xs font-semibold text-[#1A1A1A]/50 mt-1">
        學生輸入時不區分大小寫
      </p>

      <div className="mt-3">
        <label className="block font-bold text-sm mb-2 text-[#1A1A1A]/70">
          其他可接受答案（選填）
        </label>
        {altAnswers.map((alt, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={alt}
              onChange={(e) =>
                setAltAnswers((prev) => prev.map((a, i) => (i === idx ? e.target.value : a)))
              }
              placeholder={`替代答案 ${idx + 1}`}
              className="memphis-input flex-1 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setAltAnswers((prev) => prev.filter((_, i) => i !== idx))}
              className="w-8 h-8 border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
              type="button"
              aria-label="刪除替代答案"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setAltAnswers((prev) => [...prev, ""])}
          className="flex items-center gap-2 text-sm font-bold px-3 py-2 border-2 border-dashed border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
          type="button"
        >
          <Plus size={14} />
          新增替代答案
        </button>
      </div>
    </div>
  );
}