/**
 * 單選題編輯器
 */

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, Check } from "lucide-react";
import type { QuestionEditorProps, SingleChoiceOption } from "./types";

export default function SingleChoiceEditor({ initialData, onChange, onValidationChange }: QuestionEditorProps) {
  const [options, setOptions] = useState<SingleChoiceOption[]>(
    initialData?.options ?? [
      { id: nanoid(6), text: "" },
      { id: nanoid(6), text: "" },
    ]
  );
  const [correct, setCorrect] = useState<string>(
    typeof initialData?.correctAnswer === "string" ? initialData.correctAnswer : ""
  );

  useEffect(() => {
    onChange({ options, correctAnswer: correct });
    const valid =
      options.length >= 2 &&
      options.every((o) => o.text.trim().length > 0) &&
      !!correct;
    onValidationChange?.(valid);
  }, [options, correct, onChange, onValidationChange]);

  return (
    <div>
      <label className="block font-black text-sm mb-3">
        選項（點選正確答案）<span className="text-[#FF8C7A]">*</span>
      </label>
      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              onClick={() => setCorrect(opt.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                correct === opt.id ? "bg-[#B8F0D8]" : "bg-white hover:bg-[#FFF3A3]"
              }`}
              style={{ border: "3px solid #1A1A1A" }}
              type="button"
              aria-label={`標記選項 ${idx + 1} 為正確答案`}
              aria-pressed={correct === opt.id}
            >
              {correct === opt.id && <Check size={14} />}
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={(e) =>
                setOptions((prev) =>
                  prev.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o))
                )
              }
              placeholder={`選項 ${idx + 1}`}
              className="memphis-input flex-1 px-3 py-2 text-sm"
            />
            {options.length > 2 && (
              <button
                onClick={() => {
                  setOptions((prev) => prev.filter((o) => o.id !== opt.id));
                  if (correct === opt.id) setCorrect("");
                }}
                className="w-8 h-8 border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
                type="button"
                aria-label={`刪除選項 ${idx + 1}`}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button
          onClick={() => setOptions((prev) => [...prev, { id: nanoid(6), text: "" }])}
          className="mt-3 flex items-center gap-2 text-sm font-bold px-3 py-2 border-2 border-dashed border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
          type="button"
        >
          <Plus size={14} />
          新增選項
        </button>
      )}
    </div>
  );
}