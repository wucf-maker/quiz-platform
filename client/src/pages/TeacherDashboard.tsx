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
  UserCog,
  UserPlus,
  School,
  Pencil,
  BarChart3,
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

  // 教師管理狀態
  const [showTeacherMgmt, setShowTeacherMgmt] = useState(false);

  // 班級管理狀態
  const [showClassMgmt, setShowClassMgmt] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassDesc, setEditClassDesc] = useState("");

  const classesQuery = trpc.classes.list.useQuery(undefined, {
    enabled: showClassMgmt,
  });
  const createClassMutation = trpc.classes.create.useMutation({
    onSuccess: () => {
      toast.success("已建立新班級");
      setNewClassName("");
      setNewClassDesc("");
      classesQuery.refetch();
    },
    onError: (e) => toast.error(e.message || "建立失敗"),
  });
  const deleteClassMutation = trpc.classes.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除班級（綁到的測驗改為不綁任何班級）");
      classesQuery.refetch();
    },
    onError: (e) => toast.error(e.message || "刪除失敗"),
  });
  const updateClassMutation = trpc.classes.update.useMutation({
    onSuccess: () => {
      toast.success("已更新");
      setEditingClassId(null);
      classesQuery.refetch();
    },
    onError: (e) => toast.error(e.message || "更新失敗"),
  });

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error("請輸入班級名稱");
      return;
    }
    createClassMutation.mutate({
      name: newClassName.trim(),
      description: newClassDesc.trim() || undefined,
    });
  };

  const handleDeleteClass = (id: number, name: string) => {
    if (confirm(`確定要刪除班級「${name}」嗎？綁到這個班級的測驗會自動改為不綁任何班級。`)) {
      deleteClassMutation.mutate({ id });
    }
  };

  const handleSaveEditClass = (id: number) => {
    updateClassMutation.mutate({
      id,
      name: editClassName.trim() || undefined,
      description: editClassDesc.trim() || null,
    });
  };

  const startEditClass = (c: { id: number; name: string; description: string | null }) => {
    setEditingClassId(c.id);
    setEditClassName(c.name);
    setEditClassDesc(c.description ?? "");
  };
  const [newTeacherUsername, setNewTeacherUsername] = useState("");
  const [newTeacherDisplay, setNewTeacherDisplay] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");

  const teachersQuery = trpc.auth.listTeachers.useQuery(undefined, {
    enabled: showTeacherMgmt,
  });
  const createTeacherMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("已建立新教師帳號");
      setNewTeacherUsername("");
      setNewTeacherDisplay("");
      setNewTeacherPassword("");
      teachersQuery.refetch();
    },
    onError: (e) => toast.error(e.message || "建立失敗"),
  });
  const deleteTeacherMutation = trpc.auth.deleteTeacher.useMutation({
    onSuccess: () => {
      toast.success("已刪除教師帳號");
      teachersQuery.refetch();
    },
    onError: (e) => toast.error(e.message || "刪除失敗"),
  });

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherUsername.trim() || !newTeacherDisplay.trim() || !newTeacherPassword.trim()) {
      toast.error("請填寫所有欄位");
      return;
    }
    createTeacherMutation.mutate({
      username: newTeacherUsername.trim(),
      displayName: newTeacherDisplay.trim(),
      password: newTeacherPassword.trim(),
    });
  };

  const handleDeleteTeacher = (id: number, name: string) => {
    if (confirm(`確定要刪除教師「${name}」嗎？該教師的測驗資料仍會保留。`)) {
      deleteTeacherMutation.mutate({ id });
    }
  };

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

      {/* 班級管理（建立班級 → 可在測驗編輯指定 → ClassResults 看作答統計） */}
      <section
        className="relative z-10 container pb-8"
        aria-label="班級管理"
      >
        <button
          onClick={() => setShowClassMgmt(!showClassMgmt)}
          className="memphis-card p-4 w-full flex items-center justify-between hover:shadow-[6px_6px_0_#1A1A1A] transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg bg-[#B8F0D8] border-2 border-[#1A1A1A] flex items-center justify-center"
              aria-hidden="true"
            >
              <School size={18} />
            </div>
            <span className="font-black text-lg">班級管理</span>
          </div>
          <ChevronRight
            size={20}
            className={`transition-transform ${showClassMgmt ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>

        {showClassMgmt && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 新增班級表單 */}
            <div className="memphis-card p-6">
              <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <PlusCircle size={18} aria-hidden="true" />
                建立新班級
              </h3>
              <form onSubmit={handleCreateClass} className="space-y-3">
                <div>
                  <label
                    htmlFor="new-c-name"
                    className="block text-xs font-bold mb-1"
                  >
                    班級名稱 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="new-c-name"
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="例如：3A 班 / SEN 小組 / 早會"
                    className="memphis-input w-full px-3 py-2 text-sm"
                    maxLength={128}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-c-desc"
                    className="block text-xs font-bold mb-1"
                  >
                    備註（選填）
                  </label>
                  <input
                    id="new-c-desc"
                    type="text"
                    value={newClassDesc}
                    onChange={(e) => setNewClassDesc(e.target.value)}
                    placeholder="例如：每週三早上用"
                    className="memphis-input w-full px-3 py-2 text-sm"
                    maxLength={256}
                  />
                </div>
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="memphis-btn-mint w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle size={16} />
                  建立
                </button>
              </form>
            </div>

            {/* 班級列表 */}
            <div className="memphis-card p-6">
              <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <Users size={18} aria-hidden="true" />
                現有班級
              </h3>
              {classesQuery.isLoading ? (
                <p className="text-sm font-semibold text-[#1A1A1A]/50">載入中…</p>
              ) : classesQuery.data && classesQuery.data.length > 0 ? (
                <ul className="space-y-2">
                  {classesQuery.data.map((c) => {
                    const isEditing = editingClassId === c.id;
                    return (
                      <li
                        key={c.id}
                        className="p-3 rounded-lg border-2 border-[#1A1A1A]/10"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editClassName}
                              onChange={(e) => setEditClassName(e.target.value)}
                              className="memphis-input w-full px-2 py-1 text-sm"
                              maxLength={128}
                            />
                            <input
                              type="text"
                              value={editClassDesc}
                              onChange={(e) => setEditClassDesc(e.target.value)}
                              placeholder="備註"
                              className="memphis-input w-full px-2 py-1 text-xs"
                              maxLength={256}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveEditClass(c.id)}
                                disabled={updateClassMutation.isPending}
                                className="flex-1 memphis-btn-mint py-1 text-xs"
                              >
                                儲存
                              </button>
                              <button
                                onClick={() => setEditingClassId(null)}
                                className="flex-1 py-1 text-xs border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#FFE5D9]"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">
                                {c.name}
                              </div>
                              {c.description && (
                                <div className="text-xs text-[#1A1A1A]/50 font-semibold truncate">
                                  {c.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Link href={`/teacher/class/${c.id}`}>
                                <button
                                  className="w-8 h-8 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-[#FFF3A3] hover:bg-[#FFE566]"
                                  aria-label={`查看 ${c.name} 的作答統計`}
                                  title="查看作答統計"
                                >
                                  <BarChart3 size={14} />
                                </button>
                              </Link>
                              <button
                                onClick={() => startEditClass(c)}
                                className="w-8 h-8 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#D4C5F9]"
                                aria-label={`編輯 ${c.name}`}
                                title="編輯"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(c.id, c.name)}
                                disabled={deleteClassMutation.isPending}
                                className="w-8 h-8 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#FF8C7A] disabled:opacity-50"
                                aria-label={`刪除 ${c.name}`}
                                title="刪除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm font-semibold text-[#1A1A1A]/50">
                  還沒有任何班級。建立後可在測驗編輯頁把測驗綁到班級。
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 教師管理（超管可建/刪除其他教師） */}
      <section
        className="relative z-10 container pb-12"
        aria-label="教師管理"
      >
        <button
          onClick={() => setShowTeacherMgmt(!showTeacherMgmt)}
          className="memphis-card p-4 w-full flex items-center justify-between hover:shadow-[6px_6px_0_#1A1A1A] transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg bg-[#A8D8EA] border-2 border-[#1A1A1A] flex items-center justify-center"
              aria-hidden="true"
            >
              <UserCog size={18} />
            </div>
            <span className="font-black text-lg">教師管理（超管後台）</span>
          </div>
          <ChevronRight
            size={20}
            className={`transition-transform ${showTeacherMgmt ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>

        {showTeacherMgmt && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 新增教師表單 */}
            <div className="memphis-card p-6">
              <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <UserPlus size={18} aria-hidden="true" />
                建立新教師帳號
              </h3>
              <form onSubmit={handleCreateTeacher} className="space-y-3">
                <div>
                  <label
                    htmlFor="new-t-username"
                    className="block text-xs font-bold mb-1"
                  >
                    帳號
                  </label>
                  <input
                    id="new-t-username"
                    type="text"
                    value={newTeacherUsername}
                    onChange={(e) => setNewTeacherUsername(e.target.value)}
                    placeholder="例如：alice"
                    className="memphis-input w-full px-3 py-2 text-sm"
                    pattern="[a-zA-Z0-9_-]+"
                    minLength={3}
                    maxLength={64}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-t-display"
                    className="block text-xs font-bold mb-1"
                  >
                    顯示名稱
                  </label>
                  <input
                    id="new-t-display"
                    type="text"
                    value={newTeacherDisplay}
                    onChange={(e) => setNewTeacherDisplay(e.target.value)}
                    placeholder="例如：王老師"
                    className="memphis-input w-full px-3 py-2 text-sm"
                    maxLength={64}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-t-password"
                    className="block text-xs font-bold mb-1"
                  >
                    密碼（至少 6 字）
                  </label>
                  <input
                    id="new-t-password"
                    type="text"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    placeholder="可暫時明文，貼給新教師後請他立刻改"
                    className="memphis-input w-full px-3 py-2 text-sm"
                    minLength={6}
                    maxLength={256}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={createTeacherMutation.isPending}
                  className="memphis-btn-mint w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  建立
                </button>
              </form>
            </div>

            {/* 教師列表 */}
            <div className="memphis-card p-6">
              <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <Users size={18} aria-hidden="true" />
                現有教師帳號
              </h3>
              {teachersQuery.isLoading ? (
                <p className="text-sm font-semibold text-[#1A1A1A]/50">載入中…</p>
              ) : teachersQuery.data && teachersQuery.data.length > 0 ? (
                <ul className="space-y-2">
                  {teachersQuery.data.map((t) => {
                    const isSelf = t.id === user?.id;
                    return (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border-2 border-[#1A1A1A]/10"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">
                            {t.name ?? t.username}{" "}
                            {isSelf && (
                              <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-[#B8F0D8] border border-[#1A1A1A]">
                                自己
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#1A1A1A]/50 font-semibold truncate">
                            @{t.username} · 最後登入：
                            {t.lastSignedIn
                              ? new Date(t.lastSignedIn).toLocaleDateString("zh-TW")
                              : "從未登入"}
                          </div>
                        </div>
                        {!isSelf && (
                          <button
                            onClick={() =>
                              handleDeleteTeacher(t.id, t.name ?? t.username ?? "")
                            }
                            disabled={deleteTeacherMutation.isPending}
                            className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#FF8C7A] transition-colors disabled:opacity-50"
                            aria-label={`刪除 ${t.name ?? t.username}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm font-semibold text-[#1A1A1A]/50">
                  還沒有任何教師帳號
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
