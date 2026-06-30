import { useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  QrCode,
  Settings,
} from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";
import QuestionEditor from "@/components/QuestionEditor";
import QRCodeModal from "@/components/QRCodeModal";
import CreateAssessmentModal from "@/components/CreateAssessmentModal";

const QUESTION_TYPES = [
  { value: "single_choice", label: "單選題", emoji: "🔘", color: "bg-[#D4C5F9]" },
  { value: "picture_choice", label: "圖片選擇題", emoji: "🖼️", color: "bg-[#B8F0D8]" },
  { value: "matching", label: "連線題", emoji: "🔗", color: "bg-[#FFF3A3]" },
  { value: "fill_blank", label: "填充題", emoji: "✏️", color: "bg-[#FFB3C6]" },
] as const;

export default function AssessmentEditor() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id ?? "0");
  const utils = trpc.useUtils();

  const { data: assessment, isLoading } = trpc.assessment.get.useQuery({ id: assessmentId });
  const deleteMutation = trpc.question.delete.useMutation({
    onSuccess: () => {
      utils.assessment.get.invalidate({ id: assessmentId });
      toast.success("題目已刪除");
    },
  });

  const [showAddType, setShowAddType] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    type: string;
    id?: number;
    data?: any;
  } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        <div className="memphis-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold">載入中...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        <div className="memphis-card p-8 text-center">
          <p className="font-bold text-xl mb-4">找不到測驗</p>
          <Link href="/teacher">
            <button className="memphis-btn px-6 py-3">返回</button>
          </Link>
        </div>
      </div>
    );
  }

  const questions = assessment.questions ?? [];

  const handleDeleteQuestion = (qId: number) => {
    if (confirm("確定要刪除這道題目嗎？")) {
      deleteMutation.mutate({ id: qId, assessmentId });
    }
  };

  const getTypeInfo = (type: string) =>
    QUESTION_TYPES.find((t) => t.value === type) ?? QUESTION_TYPES[0];

  return (
    <div className="min-h-screen memphis-bg relative">
      <MemphisBackground />

      {/* Header */}
      <header className="relative z-10 border-b-4 border-[#1A1A1A] bg-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link href="/teacher">
              <button className="w-10 h-10 rounded-xl border-3 border-[#1A1A1A] flex items-center justify-center hover:bg-[#FFE5D9] transition-colors" style={{ border: "3px solid #1A1A1A" }}>
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div>
              <h1 className="memphis-heading text-xl leading-tight">{assessment.title}</h1>
              <p className="text-xs font-semibold text-[#1A1A1A]/50">
                {questions.length} 道題目
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditInfo(true)}
              className="w-10 h-10 rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#FFF3A3] transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="memphis-btn-lavender flex items-center gap-2 px-4 py-2 text-sm"
            >
              <QrCode size={16} />
              QR碼
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Questions List */}
          {questions.length > 0 && (
            <div className="flex flex-col gap-4 mb-6">
              {questions.map((q, idx) => {
                const typeInfo = getTypeInfo(q.questionType);
                const isExpanded = expandedQ === q.id;
                return (
                  <div key={q.id} className="memphis-card overflow-hidden">
                    {/* Question Header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#FFE5D9]/30 transition-colors"
                      onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                    >
                      <div className="text-[#1A1A1A]/30 cursor-grab">
                        <GripVertical size={18} />
                      </div>
                      <div
                        className={`w-8 h-8 rounded-lg ${typeInfo.color} border-2 border-[#1A1A1A] flex items-center justify-center text-sm shrink-0`}
                      >
                        {typeInfo.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#1A1A1A]/50">
                            Q{idx + 1}
                          </span>
                          <span className="font-bold text-[#1A1A1A] truncate">
                            {q.questionText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-[#1A1A1A]/50">
                            {typeInfo.label}
                          </span>
                          <span className="text-xs font-bold text-[#1A1A1A]/70">
                            · {q.score} 分
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingQuestion({
                              type: q.questionType,
                              id: q.id,
                              data: q,
                            });
                          }}
                          className="text-xs font-bold px-3 py-1.5 border-2 border-[#1A1A1A] rounded-lg hover:bg-[#D4C5F9] transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(q.id);
                          }}
                          className="w-8 h-8 border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-[#1A1A1A]/50" />
                        ) : (
                          <ChevronDown size={16} className="text-[#1A1A1A]/50" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <div className="border-t-2 border-[#1A1A1A]/10 p-4 bg-[#FFE5D9]/20">
                        <QuestionPreview question={q} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Question Button */}
          <div className="relative">
            <button
              onClick={() => setShowAddType(!showAddType)}
              className="w-full memphis-btn flex items-center justify-center gap-3 py-4 text-base"
            >
              <Plus size={20} />
              新增題目
            </button>

            {showAddType && (
              <div
                className="absolute top-full left-0 right-0 mt-2 z-20 memphis-card p-4"
                style={{ zIndex: 30 }}
              >
                <p className="font-black text-sm text-[#1A1A1A]/60 mb-3">選擇題型</p>
                <div className="grid grid-cols-2 gap-3">
                  {QUESTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setEditingQuestion({ type: t.value });
                        setShowAddType(false);
                      }}
                      className={`${t.color} border-2 border-[#1A1A1A] rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform font-bold`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-sm">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {questions.length === 0 && !showAddType && (
            <div className="text-center py-12 text-[#1A1A1A]/40 font-bold mt-4">
              <p className="text-lg">還沒有題目</p>
              <p className="text-sm mt-1">點擊上方按鈕新增第一道題目</p>
            </div>
          )}
        </div>
      </main>

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditor
          assessmentId={assessmentId}
          questionType={editingQuestion.type as any}
          initialData={editingQuestion.data}
          questionId={editingQuestion.id}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            setEditingQuestion(null);
            utils.assessment.get.invalidate({ id: assessmentId });
            toast.success(editingQuestion.id ? "題目已更新" : "題目已新增");
          }}
          orderIndex={questions.length}
        />
      )}

      {showQR && (
        <QRCodeModal
          assessmentId={assessmentId}
          title={assessment.title}
          onClose={() => setShowQR(false)}
        />
      )}

      {showEditInfo && (
        <CreateAssessmentModal
          initial={{ id: assessmentId, title: assessment.title, description: assessment.description ?? "" }}
          onClose={() => setShowEditInfo(false)}
          onCreated={() => {
            setShowEditInfo(false);
            utils.assessment.get.invalidate({ id: assessmentId });
          }}
        />
      )}
    </div>
  );
}

// Simple preview of question options
function QuestionPreview({ question }: { question: any }) {
  const opts = question.options as any[];
  if (question.questionType === "single_choice" || question.questionType === "picture_choice") {
    return (
      <div className="flex flex-col gap-2">
        {opts?.map((o: any) => (
          <div
            key={o.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-semibold ${
              String(question.correctAnswer) === String(o.id)
                ? "bg-[#B8F0D8] border-[#1A1A1A]"
                : "bg-white border-[#1A1A1A]/30"
            }`}
          >
            {String(question.correctAnswer) === String(o.id) && (
              <span className="text-green-600">✓</span>
            )}
            {o.imageUrl && (
              <img src={o.imageUrl} alt="" className="w-12 h-12 object-cover rounded" />
            )}
            <span>{o.text || "(圖片選項)"}</span>
          </div>
        ))}
      </div>
    );
  }
  if (question.questionType === "matching") {
    return (
      <div className="flex flex-col gap-2">
        {opts?.map((o: any) => (
          <div key={o.id} className="flex items-center gap-3 text-sm font-semibold">
            <span className="px-3 py-1 bg-[#D4C5F9] border-2 border-[#1A1A1A] rounded-lg">
              {o.left}
            </span>
            <span className="text-[#1A1A1A]/40">↔</span>
            <span className="px-3 py-1 bg-[#B8F0D8] border-2 border-[#1A1A1A] rounded-lg">
              {o.right}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (question.questionType === "fill_blank") {
    const ans = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join(" / ")
      : String(question.correctAnswer);
    return (
      <div className="text-sm font-semibold">
        <span className="text-[#1A1A1A]/60">正確答案：</span>
        <span className="px-3 py-1 bg-[#FFF3A3] border-2 border-[#1A1A1A] rounded-lg ml-2">
          {ans}
        </span>
      </div>
    );
  }
  return null;
}
