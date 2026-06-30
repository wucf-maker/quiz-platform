import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  PlusCircle,
  Trash2,
  Edit3,
  BarChart2,
  QrCode,
  BookOpen,
  Users,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";
import CreateAssessmentModal from "@/components/CreateAssessmentModal";
import QRCodeModal from "@/components/QRCodeModal";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const { data: assessments, isLoading } = trpc.assessment.list.useQuery();
  const deleteMutation = trpc.assessment.delete.useMutation({
    onSuccess: () => {
      utils.assessment.list.invalidate();
      toast.success("測驗已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ id: number; title: string } | null>(null);

  const handleDelete = (id: number, title: string) => {
    if (confirm(`確定要刪除「${title}」嗎？此操作無法復原。`)) {
      deleteMutation.mutate({ id });
    }
  };

  const cardColors = [
    "bg-[#B8F0D8]",
    "bg-[#D4C5F9]",
    "bg-[#FFF3A3]",
    "bg-[#FFB3C6]",
    "bg-[#A8D8EA]",
    "bg-[#FF8C7A]",
  ];

  return (
    <div className="min-h-screen memphis-bg relative">
      <MemphisBackground />

      {/* Header */}
      <header
        className="relative z-10 border-b-4 border-[#1A1A1A]"
        style={{ background: "white" }}
      >
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "#D4C5F9",
                border: "3px solid #1A1A1A",
                boxShadow: "3px 3px 0 #1A1A1A",
              }}
            >
              <BookOpen size={20} className="text-[#1A1A1A]" />
            </div>
            <span className="memphis-heading text-2xl">QUIZ MASTER</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#1A1A1A] hidden sm:block">
              👋 {user?.name ?? "老師"}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 memphis-btn text-sm"
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container py-10">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="memphis-heading text-4xl mb-1">我的測驗</h1>
            <p className="text-[#1A1A1A]/60 font-semibold">
              建立測驗，讓學生掃碼即可作答！
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="memphis-btn flex items-center gap-2 px-6 py-3 text-base"
          >
            <PlusCircle size={20} />
            新增測驗
          </button>
        </div>

        {/* Stats Bar */}
        {assessments && assessments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="memphis-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4C5F9] border-2 border-[#1A1A1A] flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <div>
                <div className="text-2xl font-black">{assessments.length}</div>
                <div className="text-xs font-bold text-[#1A1A1A]/60">份測驗</div>
              </div>
            </div>
            <div className="memphis-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#B8F0D8] border-2 border-[#1A1A1A] flex items-center justify-center">
                <Users size={18} />
              </div>
              <div>
                <div className="text-2xl font-black">
                  {assessments.reduce((s, a) => s + (a.submissionCount ?? 0), 0)}
                </div>
                <div className="text-xs font-bold text-[#1A1A1A]/60">次作答</div>
              </div>
            </div>
            <div className="memphis-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-[#FFF3A3] border-2 border-[#1A1A1A] flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
              <div>
                <div className="text-2xl font-black">
                  {assessments.reduce((s, a) => s + (a.questionCount ?? 0), 0)}
                </div>
                <div className="text-xs font-bold text-[#1A1A1A]/60">道題目</div>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="memphis-card p-6 animate-pulse">
                <div className="h-6 bg-[#1A1A1A]/10 rounded mb-3 w-3/4" />
                <div className="h-4 bg-[#1A1A1A]/10 rounded mb-6 w-full" />
                <div className="h-8 bg-[#1A1A1A]/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((a, idx) => (
              <div
                key={a.id}
                className="memphis-card p-6 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Color accent top bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-2 ${
                    cardColors[idx % cardColors.length]
                  }`}
                  style={{ borderBottom: "3px solid #1A1A1A" }}
                />
                <div className="mt-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-black text-xl text-[#1A1A1A] leading-tight">
                      {a.title}
                    </h2>
                    <span
                      className={`memphis-badge text-xs shrink-0 ${
                        a.isActive
                          ? "bg-[#B8F0D8] text-[#1A1A1A]"
                          : "bg-[#FFB3C6] text-[#1A1A1A]"
                      }`}
                    >
                      {a.isActive ? "開放中" : "已關閉"}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-sm text-[#1A1A1A]/60 font-semibold mt-1 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm font-bold text-[#1A1A1A]/70">
                  <span>📝 {a.questionCount} 題</span>
                  <span>👥 {a.submissionCount} 人</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t-2 border-[#1A1A1A]/10">
                  <Link href={`/teacher/assessment/${a.id}/edit`}>
                    <button className="memphis-btn-mint flex items-center gap-1.5 px-3 py-2 text-sm">
                      <Edit3 size={14} />
                      編輯
                    </button>
                  </Link>
                  <button
                    onClick={() => setQrTarget({ id: a.id, title: a.title })}
                    className="memphis-btn-lavender flex items-center gap-1.5 px-3 py-2 text-sm"
                  >
                    <QrCode size={14} />
                    QR碼
                  </button>
                  <Link href={`/teacher/assessment/${a.id}/results`}>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-[#1A1A1A] rounded-xl bg-[#FFF3A3] hover:bg-[#FFE566] transition-colors">
                      <BarChart2 size={14} />
                      分析
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(a.id, a.title)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-[#1A1A1A] rounded-xl bg-white hover:bg-[#FF8C7A] transition-colors ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "#D4C5F9",
                border: "4px solid #1A1A1A",
                boxShadow: "6px 6px 0 #1A1A1A",
              }}
            >
              <BookOpen size={40} className="text-[#1A1A1A]" />
            </div>
            <h2 className="memphis-heading text-3xl mb-3">還沒有測驗</h2>
            <p className="text-[#1A1A1A]/60 font-semibold mb-8 max-w-sm">
              點擊「新增測驗」開始建立你的第一份測驗，讓學生掃碼即可作答！
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="memphis-btn flex items-center gap-2 px-8 py-4 text-lg"
            >
              <PlusCircle size={22} />
              新增第一份測驗
            </button>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateAssessmentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            utils.assessment.list.invalidate();
          }}
        />
      )}

      {qrTarget && (
        <QRCodeModal
          assessmentId={qrTarget.id}
          title={qrTarget.title}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  );
}
