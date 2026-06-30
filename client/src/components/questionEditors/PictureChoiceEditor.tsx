/**
 * 圖片選擇題編輯器
 */

import { useState, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, X, Image as ImageIcon, Check } from "lucide-react";
import type { QuestionEditorProps, PictureChoiceOption } from "./types";
import { useImageUpload } from "./useImageUpload";

export default function PictureChoiceEditor({ initialData, onChange, onValidationChange }: QuestionEditorProps) {
  const [options, setOptions] = useState<PictureChoiceOption[]>(
    initialData?.options ?? [
      { id: nanoid(6), text: "" },
      { id: nanoid(6), text: "" },
    ]
  );
  const [correct, setCorrect] = useState<string>(
    typeof initialData?.correctAnswer === "string" ? initialData.correctAnswer : ""
  );
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { upload, uploading } = useImageUpload();

  useEffect(() => {
    onChange({ options, correctAnswer: correct });
    // 必填：至少有 1 個選項有圖片 + 標記正確答案 + 至少 2 個選項
    const hasImage = options.some((o) => !!o.imageUrl);
    onValidationChange?.(!!correct && options.length >= 2 && hasImage);
  }, [options, correct, onChange, onValidationChange]);

  const handleFileChange = async (idx: number, file: File) => {
    const result = await upload(file);
    if (result) {
      setOptions((prev) =>
        prev.map((o) => (o.id === options[idx]?.id ? { ...o, imageKey: result.key, imageUrl: result.url } : o))
      );
    }
    if (fileRefs.current[idx]) fileRefs.current[idx]!.value = "";
  };

  return (
    <div>
      <label className="block font-black text-sm mb-3">
        圖片選項（點選正確答案）<span className="text-[#FF8C7A]">*</span>
        {uploading && <span className="ml-2 text-xs text-[#1A1A1A]/60">上傳中...</span>}
      </label>
      {options.length >= 2 && !options.some((o) => !!o.imageUrl) && (
        <div
          className="mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
          style={{ background: "#FFB3C6", border: "2px solid #1A1A1A" }}
          role="alert"
        >
          ⚠️ 至少要上傳 1 張圖片
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, idx) => (
          <div
            key={opt.id}
            className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${
              correct === opt.id ? "shadow-[4px_4px_0_#1A1A1A] bg-[#B8F0D8]" : "hover:shadow-[2px_2px_0_#1A1A1A]"
            }`}
            style={{ border: correct === opt.id ? "3px solid #1A1A1A" : "2px solid #1A1A1A" }}
            onClick={() => setCorrect(opt.id)}
            role="button"
            tabIndex={0}
            aria-pressed={correct === opt.id}
            aria-label={`圖片選項 ${idx + 1}${opt.text ? `：${opt.text}` : ""}`}
          >
            {correct === opt.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-[#B8F0D8] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center z-10">
                <Check size={12} />
              </div>
            )}
            {opt.imageUrl ? (
              <div className="relative">
                <img src={opt.imageUrl} alt={`選項 ${idx + 1}`} className="w-full h-28 object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptions((prev) =>
                      prev.map((o) =>
                        o.id === opt.id ? { ...o, imageKey: undefined, imageUrl: undefined } : o
                      )
                    );
                  }}
                  className="absolute top-1 left-1 w-5 h-5 bg-[#FF8C7A] border border-[#1A1A1A] rounded-full flex items-center justify-center"
                  type="button"
                  aria-label="移除圖片"
                >
                  <X size={8} />
                </button>
              </div>
            ) : (
              <div
                className="h-28 flex flex-col items-center justify-center gap-1 text-[#1A1A1A]/40 cursor-pointer hover:bg-[#FFE5D9] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRefs.current[idx]?.click();
                }}
              >
                <ImageIcon size={24} aria-hidden="true" />
                <span className="text-xs font-bold">上傳圖片</span>
              </div>
            )}
            <input
              type="text"
              value={opt.text}
              onChange={(e) =>
                setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))
              }
              placeholder={`說明 ${idx + 1} (選填)`}
              className="w-full px-2 py-1.5 text-xs font-bold border-t-2 border-[#1A1A1A]/20 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            <input
              ref={(el) => { fileRefs.current[idx] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(idx, file);
              }}
            />
            {options.length > 2 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOptions((prev) => prev.filter((o) => o.id !== opt.id));
                  if (correct === opt.id) setCorrect("");
                }}
                className="absolute bottom-8 right-1 w-5 h-5 bg-white border border-[#1A1A1A] rounded-full flex items-center justify-center"
                type="button"
                aria-label="刪除選項"
              >
                <Trash2 size={8} />
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
          新增圖片選項
        </button>
      )}
    </div>
  );
}