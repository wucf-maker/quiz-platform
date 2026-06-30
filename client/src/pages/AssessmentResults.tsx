import { useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Users,
  Trophy,
  BarChart2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MemphisBackground } from "@/components/MemphisDecorations";
import { toast } from "sonner";
import {
  exportSubmissionsCSV,
  exportStatsCSV,
  exportFullPDF,
  type ExportData,
} from "@/lib/exportUtils";

const COLORS = ["#D4C5F9", "#B8F0D8", "#FFF3A3", "#FFB3C6", "#A8D8EA"];

/**
 * 將作答/正確答案格式化為人類可讀文字。
 * 對 matching 題會把 [{leftId, rightId}] 解析成 "蘋果→紅色" 形式。
 */
function formatAnswerForDisplay(
  questionType: string,
  answer: unknown,
  options: unknown
): string {
  if (answer === null || answer === undefined) return "（未作答）";

  if (questionType === "matching" && Array.isArray(answer)) {
    const opts = options as { id: string; left: string; right: string }[] | null;
    const pairs = answer as { leftId: string; rightId: string }[];
    if (pairs.length === 0) return "（未作答）";
    return pairs
      .map((p) => {
        const o = opts?.find((x) => x.id === p.leftId);
        if (o) return `${o.left}→${o.right}`;
        const ro = opts?.find((x) => x.id === p.rightId);
        if (ro) return `${p.leftId}→${ro.right}`;
        return `${p.leftId}→${p.rightId}`;
      })
      .join("、");
  }

  if (questionType === "fill_blank") {
    if (Array.isArray(answer)) return answer.join(" / ");
    return String(answer);
  }

  if (questionType === "single_choice" || questionType === "picture_choice") {
    const opts = options as { id: string; text?: string; imageUrl?: string }[] | null;
    const opt = opts?.find((o) => o.id === String(answer));
    if (opt?.text) return opt.text;
    if (opt?.imageUrl) return "（圖片選項）";
    return String(answer);
  }

  if (typeof answer === "string") return answer;
  return JSON.stringify(answer).slice(0, 30);
}

export default function AssessmentResults() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<"submissions" | "stats">("submissions");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: assessment, error: assessmentError } = trpc.assessment.get.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId && !isNaN(assessmentId) }
  );
  const { data: submissions, isLoading: loadingSubs } = trpc.submissions.list.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );
  const { data: stats, isLoading: loadingStats } = trpc.submissions.stats.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const [expandedSub, setExpandedSub] = useState<number | null>(null);

  // ─── Build export data ────────────────────────────────────────────────────
  const buildExportData = (): ExportData | null => {
    if (!assessment || !submissions || !stats) return null;
    return {
      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,
      totalSubmissions: stats.totalSubmissions,
      averageScore: stats.averageScore,
      maxScore: stats.maxScore,
      submissions: submissions.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        totalScore: s.totalScore,
        maxScore: s.maxScore,
        submittedAt: s.submittedAt,
      })),
      questionStats: stats.questionStats,
      scoreDistribution: stats.scoreDistribution,
    };
  };

  const handleExport = async (type: "csv-submissions" | "csv-stats" | "pdf") => {
    const data = buildExportData();
    if (!data) {
      toast.error("資料尚未載入完成，請稍後再試");
      return;
    }
    if (data.totalSubmissions === 0) {
      toast.error("尚無作答紀錄，無法匯出");
      return;
    }
    setExportLoading(true);
    setShowExportMenu(false);
    try {
      if (type === "csv-submissions") {
        exportSubmissionsCSV(data);
        toast.success("CSV 答題紀錄已下載");
      } else if (type === "csv-stats") {
        exportStatsCSV(data);
        toast.success("CSV 統計分析已下載");
      } else {
        exportFullPDF(data);
        toast.success("PDF 完整報告已下載");
      }
    } catch (e: any) {
      toast.error(`匯出失敗：${e.message ?? "未知錯誤"}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ─── Error / Loading states ───────────────────────────────────────────────
  if (assessmentError) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center p-4">
        <MemphisBackground />
        <div className="relative z-10 memphis-card p-10 text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="memphis-heading text-2xl mb-2">找不到測驗</h2>
          <p className="font-semibold text-[#1A1A1A]/60 mb-6">
            {(assessmentError as any)?.message ?? "測驗不存在或無權限查看"}
          </p>
          <Link href="/teacher">
            <button className="memphis-btn px-6 py-3">返回儀表板</button>
          </Link>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        <MemphisBackground />
        <div className="relative z-10 memphis-card p-8 text-center">
          <div className="w-10 h-10 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen memphis-bg relative">
      <MemphisBackground />

      {/* Header */}
      <header className="relative z-10 border-b-4 border-[#1A1A1A] bg-white">
        <div className="container flex items-center gap-3 py-4">
          <Link href="/teacher">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#FFE5D9] transition-colors"
              style={{ border: "3px solid #1A1A1A" }}
            >
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="memphis-heading text-xl truncate">{assessment.title}</h1>
            <p className="text-xs font-semibold text-[#1A1A1A]/50">分析與紀錄</p>
          </div>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exportLoading}
              className="memphis-btn px-4 py-2.5 text-sm flex items-center gap-2"
            >
              {exportLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              匯出
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 z-20 min-w-[200px] rounded-2xl overflow-hidden"
                  style={{
                    background: "white",
                    border: "3px solid #1A1A1A",
                    boxShadow: "6px 6px 0 #1A1A1A",
                  }}
                >
                  <div className="p-2 border-b-2 border-[#1A1A1A]/10">
                    <p className="text-xs font-black text-[#1A1A1A]/50 px-2 py-1">
                      選擇匯出格式
                    </p>
                  </div>
                  {[
                    {
                      type: "csv-submissions" as const,
                      icon: <FileSpreadsheet size={16} />,
                      label: "CSV — 答題紀錄",
                      desc: "學生姓名、分數、時間",
                      color: "#B8F0D8",
                    },
                    {
                      type: "csv-stats" as const,
                      icon: <FileSpreadsheet size={16} />,
                      label: "CSV — 統計分析",
                      desc: "各題答對率、常見錯誤",
                      color: "#FFF3A3",
                    },
                    {
                      type: "pdf" as const,
                      icon: <FileText size={16} />,
                      label: "PDF — 完整報告",
                      desc: "含紀錄與統計的完整報告",
                      color: "#D4C5F9",
                    },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleExport(item.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#FFE5D9] transition-colors text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: item.color,
                          border: "2px solid #1A1A1A",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-black text-sm">{item.label}</p>
                        <p className="text-xs font-semibold text-[#1A1A1A]/50">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 container py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "作答人數",
              value: stats?.totalSubmissions ?? 0,
              icon: <Users size={18} />,
              color: "#D4C5F9",
            },
            {
              label: "平均分數",
              value: stats ? `${stats.averageScore}/${stats.maxScore}` : "—",
              icon: <Trophy size={18} />,
              color: "#B8F0D8",
            },
            {
              label: "題目數量",
              value: assessment.questions?.length ?? 0,
              icon: <BarChart2 size={18} />,
              color: "#FFF3A3",
            },
            {
              label: "滿分",
              value: stats?.maxScore ?? 0,
              icon: <Trophy size={18} />,
              color: "#FFB3C6",
            },
          ].map((card) => (
            <div key={card.label} className="memphis-card p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.color, border: "2px solid #1A1A1A" }}
              >
                {card.icon}
              </div>
              <div>
                <div className="font-black text-xl">{card.value}</div>
                <div className="text-xs font-bold text-[#1A1A1A]/60">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 mb-6 p-1 rounded-2xl w-fit"
          style={{ background: "white", border: "3px solid #1A1A1A" }}
        >
          {(["submissions", "stats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                activeTab === tab
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "text-[#1A1A1A]/60 hover:bg-[#FFE5D9]"
              }`}
            >
              {tab === "submissions" ? "📋 答題紀錄" : "📊 統計分析"}
            </button>
          ))}
        </div>

        {/* ─── Submissions Tab ─────────────────────────────────────────── */}
        {activeTab === "submissions" && (
          <div>
            {loadingSubs ? (
              <div className="memphis-card p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto" />
              </div>
            ) : !submissions || submissions.length === 0 ? (
              <div className="memphis-card p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="memphis-heading text-2xl mb-2">還沒有人作答</h3>
                <p className="font-semibold text-[#1A1A1A]/60">
                  分享 QR Code 讓學生開始作答吧！
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {submissions.map((sub, idx) => {
                  const pct =
                    sub.maxScore > 0
                      ? Math.round((sub.totalScore / sub.maxScore) * 100)
                      : 0;
                  const isExpanded = expandedSub === sub.id;
                  return (
                    <div key={sub.id} className="memphis-card overflow-hidden">
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#FFE5D9]/20 transition-colors"
                        onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                      >
                        {/* Rank */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                          style={{
                            background: idx < 3 ? ["#FFF3A3", "#D4C5F9", "#B8F0D8"][idx] : "#FFE5D9",
                            border: "2px solid #1A1A1A",
                          }}
                        >
                          {idx + 1}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-base truncate">{sub.studentName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock size={12} className="text-[#1A1A1A]/40" />
                            <span className="text-xs font-semibold text-[#1A1A1A]/50">
                              {new Date(sub.submittedAt).toLocaleString("zh-TW")}
                            </span>
                          </div>
                        </div>
                        {/* Score */}
                        <div className="text-right shrink-0">
                          <div className="font-black text-xl">
                            {sub.totalScore}
                            <span className="text-sm text-[#1A1A1A]/50">/{sub.maxScore}</span>
                          </div>
                          <div
                            className={`text-xs font-black ${
                              pct >= 60 ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {pct}%
                          </div>
                        </div>
                        {/* Score bar */}
                        <div
                          className="w-20 h-2 rounded-full overflow-hidden hidden sm:block"
                          style={{ background: "#FFE5D9", border: "1px solid #1A1A1A" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 60 ? "#7EDDB0" : "#FF8C7A",
                            }}
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-[#1A1A1A]/50 shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-[#1A1A1A]/50 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Stats Tab ───────────────────────────────────────────────── */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-6">
            {loadingStats ? (
              <div className="memphis-card p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto" />
              </div>
            ) : !stats || stats.totalSubmissions === 0 ? (
              <div className="memphis-card p-12 text-center">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="memphis-heading text-2xl mb-2">尚無統計資料</h3>
                <p className="font-semibold text-[#1A1A1A]/60">
                  需要至少一位學生作答後才能顯示統計
                </p>
              </div>
            ) : (
              <>
                {/* Score Distribution */}
                <div className="memphis-card p-6">
                  <h3 className="memphis-heading text-xl mb-4">分數分布</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A20" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          fontFamily: "Nunito",
                          fontWeight: 700,
                          border: "2px solid #1A1A1A",
                          borderRadius: 12,
                        }}
                        formatter={(v) => [`${v} 人`, "人數"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#D4C5F9"
                        stroke="#1A1A1A"
                        strokeWidth={2}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-question correct rate */}
                <div className="memphis-card p-6">
                  <h3 className="memphis-heading text-xl mb-4">各題答對率</h3>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(200, stats.questionStats.length * 50)}
                  >
                    <BarChart
                      data={stats.questionStats.map((q, idx) => ({
                        name: `Q${idx + 1}`,
                        fullName:
                          q.questionText.slice(0, 20) +
                          (q.questionText.length > 20 ? "..." : ""),
                        rate: Math.round(q.correctRate),
                        color:
                          q.correctRate >= 60
                            ? "#B8F0D8"
                            : q.correctRate >= 40
                            ? "#FFF3A3"
                            : "#FFB3C6",
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A20" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 12 }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          fontFamily: "Nunito",
                          fontWeight: 700,
                          border: "2px solid #1A1A1A",
                          borderRadius: 12,
                        }}
                        formatter={(v, _, props) => [
                          `${v}% (${props.payload?.fullName})`,
                          "答對率",
                        ]}
                      />
                      <Bar
                        dataKey="rate"
                        stroke="#1A1A1A"
                        strokeWidth={2}
                        radius={[0, 6, 6, 0]}
                      >
                        {stats.questionStats.map((q, idx) => (
                          <Cell
                            key={idx}
                            fill={
                              q.correctRate >= 60
                                ? "#B8F0D8"
                                : q.correctRate >= 40
                                ? "#FFF3A3"
                                : "#FFB3C6"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-question detail */}
                <div className="flex flex-col gap-4">
                  {stats.questionStats.map((q, idx) => (
                    <div key={q.questionId} className="memphis-card p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <span className="font-black text-sm text-[#1A1A1A]/50">
                            Q{idx + 1}
                          </span>
                          <p className="font-black text-base">{q.questionText}</p>
                          <span className="text-xs font-semibold text-[#1A1A1A]/50">
                            {q.questionType === "single_choice" && "單選題"}
                            {q.questionType === "picture_choice" && "圖片選擇題"}
                            {q.questionType === "matching" && "連線題"}
                            {q.questionType === "fill_blank" && "填充題"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`font-black text-2xl ${
                              q.correctRate >= 60 ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {Math.round(q.correctRate)}%
                          </div>
                          <div className="text-xs font-semibold text-[#1A1A1A]/50">
                            {q.correctCount}/{q.totalCount} 人答對
                          </div>
                        </div>
                      </div>

                      {/* Correct rate bar */}
                      <div
                        className="w-full h-3 rounded-full overflow-hidden mb-3"
                        style={{ background: "#FFE5D9", border: "2px solid #1A1A1A" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${q.correctRate}%`,
                            background:
                              q.correctRate >= 60
                                ? "#7EDDB0"
                                : q.correctRate >= 40
                                ? "#FFE566"
                                : "#FF8C7A",
                          }}
                        />
                      </div>

                      {/* Common wrong answers */}
                      {q.wrongAnswers.length > 0 && (
                        <div>
                          <p className="text-xs font-black text-[#1A1A1A]/60 mb-2">
                            常見錯誤答案：
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {q.wrongAnswers.slice(0, 3).map((wa, widx) => {
                              // 從 assessment.questions 找到對應題目以取得 options
                              const question = assessment?.questions?.find(
                                (qq) => qq.id === q.questionId
                              );
                              const displayText = formatAnswerForDisplay(
                                q.questionType,
                                wa.answer,
                                question?.options
                              );
                              return (
                                <div
                                  key={widx}
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                                  style={{
                                    background: "#FFB3C6",
                                    border: "2px solid #1A1A1A",
                                  }}
                                  title={displayText}
                                >
                                  <span className="max-w-[200px] truncate">
                                    {displayText}
                                  </span>
                                  <span className="text-[#1A1A1A]/60">×{wa.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
