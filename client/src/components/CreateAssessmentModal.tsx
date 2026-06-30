import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, BookOpen } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  initial?: { id?: number; title?: string; description?: string };
}

export default function CreateAssessmentModal({ onClose, onCreated, initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const isEdit = !!initial?.id;

  const createMutation = trpc.assessment.create.useMutation({
    onSuccess: () => {
      toast.success("測驗已建立！");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.assessment.update.useMutation({
    onSuccess: () => {
      toast.success("測驗已更新！");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEdit && initial?.id) {
      updateMutation.mutate({ id: initial.id, title: title.trim(), description: description.trim() || null });
    } else {
      createMutation.mutate({ title: title.trim(), description: description.trim() || undefined });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,26,26,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="memphis-card w-full max-w-md p-8 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "#D4C5F9",
              border: "3px solid #1A1A1A",
              boxShadow: "4px 4px 0 #1A1A1A",
            }}
          >
            <BookOpen size={22} />
          </div>
          <h2 className="memphis-heading text-2xl">
            {isEdit ? "編輯測驗" : "新增測驗"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block font-black text-sm mb-2 text-[#1A1A1A]">
              測驗名稱 <span className="text-[#FF8C7A]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：第三章複習測驗"
              className="memphis-input w-full px-4 py-3 text-base"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="block font-black text-sm mb-2 text-[#1A1A1A]">
              測驗說明
              <span className="font-semibold text-[#1A1A1A]/50 ml-1">(選填)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="簡短說明這份測驗的內容或注意事項..."
              className="memphis-input w-full px-4 py-3 text-base resize-none"
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-black border-3 border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
              style={{ border: "3px solid #1A1A1A" }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 py-3 memphis-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "處理中..." : isEdit ? "儲存" : "建立測驗"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
