/**
 * QuestionEditor — 題目編輯器 dispatcher
 *
 * 本身是薄殼，根據 questionType 渲染對應的子編輯器：
 * - single_choice → SingleChoiceEditor
 * - picture_choice → PictureChoiceEditor
 * - matching → MatchingEditor
 * - fill_blank → FillBlankEditor
 *
 * 共用部分（題目文字、題目圖片、分數、儲存按鈕）由本檔處理。
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";
import {
  TYPE_LABELS,
  TYPE_COLORS,
  type QuestionType,
  type QuestionEditorProps,
} from "./questionEditors/types";
import SingleChoiceEditor from "./questionEditors/SingleChoiceEditor";
import PictureChoiceEditor from "./questionEditors/PictureChoiceEditor";
import MatchingEditor from "./questionEditors/MatchingEditor";
import FillBlankEditor from "./questionEditors/FillBlankEditor";
import { useImageUpload } from "./questionEditors/useImageUpload";

interface Props {
  assessmentId: number;
  questionType: QuestionType;
  questionId?: number;
  initialData?: any;
  orderIndex: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuestionEditor({
  assessmentId,
  questionType,
  questionId,
  initialData,
  orderIndex,
  onClose,
  onSaved,
}: Props) {
  const [questionText, setQuestionText] = useState(initialData?.questionText ?? "");
  const [score, setScore] = useState(initialData?.score ?? 1);
  const [questionImageUrl, setQuestionImageUrl] = useState(initialData?.questionImageUrl ?? "");
  const [questionImageKey, setQuestionImageKey] = useState(initialData?.questionImageKey ?? "");
  const { upload, uploading: uploadingQuestionImg } = useImageUpload();

  // 由子編輯器回填 options/correctAnswer 與驗證狀態
  const [payload, setPayload] = useState<{ options: any; correctAnswer: any }>({
    options: initialData?.options ?? null,
    correctAnswer: initialData?.correctAnswer ?? null,
  });
  const [childValid, setChildValid] = useState(!!initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upsertMutation = trpc.question.upsert.useMutation({
    onSuccess: () => {
      onSaved();
      toast.success(questionId ? "題目已更新" : "題目已新增");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleQuestionImageUpload = async (file: File) => {
    const result = await upload(file);
    if (result) {
      setQuestionImageKey(result.key);
      setQuestionImageUrl(result.url);
    }
  };

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      toast.error("請輸入題目內容");
      return;
    }
    if (!childValid) {
      toast.error("請完成題目內容與正確答案");
      return;
    }

    upsertMutation.mutate({
      id: questionId,
      assessmentId,
      orderIndex,
      questionType,
      questionText: questionText.trim(),
      questionImageKey: questionImageKey || null,
      questionImageUrl: questionImageUrl || null,
      options: payload.options,
      correctAnswer: payload.correctAnswer,
      score,
    });
  };

  const accentColor = TYPE_COLORS[questionType];

  // 根據題型選擇子編輯器
  const renderChildEditor = () => {
    const childProps: QuestionEditorProps = {
      initialData,
      onChange: (data) => setPayload(data),
      onValidationChange: setChildValid,
    };
    switch (questionType) {
      case "single_choice":
        return <SingleChoiceEditor {...childProps} />;
      case "picture_choice":
        return <PictureChoiceEditor {...childProps} />;
      case "matching":
        return <MatchingEditor {...childProps} />;
      case "fill_blank":
        return <FillBlankEditor {...childProps} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(26,26,26,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-label="題目編輯器"
    >
      <div
        className="memphis-card w-full max-w-lg my-4 relative"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between p-5 z-10"
          style={{ background: accentColor, borderBottom: "3px solid #1A1A1A" }}
        >
          <h2 className="memphis-heading text-xl">{TYPE_LABELS[questionType]}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-white/50 transition-colors"
            type="button"
            aria-label="關閉編輯器"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Question Text */}
          <div>
            <label className="block font-black text-sm mb-2" htmlFor="qe-text">
              題目內容 <span className="text-[#FF8C7A]">*</span>
            </label>
            <textarea
              id="qe-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="輸入題目..."
              className="memphis-input w-full px-4 py-3 resize-none"
              rows={2}
            />
          </div>

          {/* Question Image (optional) */}
          <div>
            <label className="block font-black text-sm mb-2">
              題目圖片 <span className="font-semibold text-[#1A1A1A]/50">(選填)</span>
            </label>
            {questionImageUrl ? (
              <div className="relative inline-block">
                <img
                  src={questionImageUrl}
                  alt="題目圖片"
                  className="max-h-32 rounded-xl border-2 border-[#1A1A1A] object-cover"
                />
                <button
                  onClick={() => { setQuestionImageUrl(""); setQuestionImageKey(""); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF8C7A] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center"
                  type="button"
                  aria-label="移除題目圖片"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingQuestionImg}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#FFE5D9] transition-colors disabled:opacity-50"
                type="button"
              >
                <Upload size={16} aria-hidden="true" />
                {uploadingQuestionImg ? "上傳中..." : "上傳圖片"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleQuestionImageUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* 子編輯器（題型專屬 UI） */}
          {renderChildEditor()}

          {/* Score */}
          <div>
            <label className="block font-black text-sm mb-2">分數</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScore((s: number) => Math.max(1, s - 1))}
                className="w-10 h-10 border-2 border-[#1A1A1A] rounded-xl font-black text-lg hover:bg-[#FFE5D9] transition-colors"
                type="button"
                aria-label="減少分數"
              >
                −
              </button>
              <span className="font-black text-2xl w-12 text-center" aria-live="polite">
                {score}
              </span>
              <button
                onClick={() => setScore((s: number) => Math.min(100, s + 1))}
                className="w-10 h-10 border-2 border-[#1A1A1A] rounded-xl font-black text-lg hover:bg-[#FFE5D9] transition-colors"
                type="button"
                aria-label="增加分數"
              >
                +
              </button>
              <span className="font-bold text-[#1A1A1A]/60">分</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 font-black border-2 border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
              type="button"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={upsertMutation.isPending}
              className="flex-1 py-3 memphis-btn disabled:opacity-50"
              type="button"
            >
              {upsertMutation.isPending ? "儲存中..." : questionId ? "更新題目" : "新增題目"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}