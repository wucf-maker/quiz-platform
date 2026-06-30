/**
 * ClassResults — 班級作答統計頁
 *
 * 顯示單一班級的：
 * - 測驗清單（綁到這個班級的）
 * - 學生作答總數、唯一學生數、平均分
 * - 最近 20 筆作答（學生姓名、測驗、分數、時間）
 *
 * 路由：/teacher/class/:id
 */

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  BarChart2,
  ArrowLeft,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";

export default function ClassResults() {
  const params = useParams<{ id: string }>();
  const classId = Number(params.id);
  const { user } = useAuth();
  const statsQuery = trpc.classes.stats.useQuery(
    { id: classId },
    { enabled: !!classId && !Number.isNaN(classId) }
  );

  const s = statsQuery.data;

  return (
    <div className="min-h-screen memphis-bg relative">
      <MemphisBackground />

      <header
        className="relative z-10 border-b-4 border-[#1A1A1A]"
        style={{ background: "white" }}
      >
        <div className="container flex items-center justify-between py-4">
          <Link href="/teacher">
            <a className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:underline">
              <ArrowLeft size={16} aria-hidden="true" />
              返回我的測驗
            </a>
          </Link>
          <span className="font-bold text-[#1A1A1A] hidden sm:block">
            👋 {user?.name ?? "老師"}
          </span>
        </div>
      </header>

      <main className="relative z-10 container py-10">
        {statsQuery.isLoading ? (
          <div className="memphis-card p-12 text-center text-[#1A1A1A]/50 font-bold">
            載入班級資料中…
          </div>
        ) : !s ? (
          <div className="memphis-card p-12 text-center">
            <h2 className="memphis-heading text-2xl mb-2">找不到班級</h2>
            <p className="text-[#1A1A1A]/60 font-semibold">
              班級 ID {classId} 不存在或已被刪除
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="memphis-heading text-4xl mb-1">{s.class.name}</h1>
              {s.class.description && (
                <p className="text-[#1A1A1A]/60 font-semibold">
                  {s.class.description}
                </p>
              )}
            </div>

            {/* 統計卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<BookOpen size={18} />}
                color="#D4C5F9"
                value={s.assessmentCount}
                label="份測驗"
              />
              <StatCard
                icon={<Users size={18} />}
                color="#B8F0D8"
                value={s.uniqueStudentCount}
                label="位學生"
              />
              <StatCard
                icon={<BarChart2 size={18} />}
                color="#FFF3A3"
                value={s.submissionCount}
                label="次作答"
              />
              <StatCard
                icon={<GraduationCap size={18} />}
                color="#FFB3C6"
                value={`${s.avgScorePercent}%`}
                label="平均分"
              />
            </div>

            {/* 班級下的測驗 */}
            {s.assessments.length > 0 && (
              <section className="mb-8">
                <h2 className="memphis-heading text-2xl mb-3">班級測驗</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {s.assessments.map((a) => (
                    <Link
                      key={a.id}
                      href={`/teacher/assessment/${a.id}/results`}
                    >
                      <a className="memphis-card p-4 hover:shadow-[6px_6px_0_#1A1A1A] transition-shadow flex items-center justify-between gap-2 block">
                        <span className="font-bold text-sm truncate">{a.title}</span>
                        <BarChart2 size={16} className="shrink-0" aria-hidden="true" />
                      </a>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 最近作答 */}
            <section>
              <h2 className="memphis-heading text-2xl mb-3">最近作答（最新 20 筆）</h2>
              {s.recentSubmissions.length === 0 ? (
                <div className="memphis-card p-8 text-center text-[#1A1A1A]/50 font-bold">
                  這個班級還沒有任何作答紀錄
                </div>
              ) : (
                <div className="memphis-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead
                        style={{
                          background: "#FFF3A3",
                          borderBottom: "3px solid #1A1A1A",
                        }}
                      >
                        <tr className="text-left">
                          <th className="px-3 py-2 font-black">學生</th>
                          <th className="px-3 py-2 font-black">測驗 ID</th>
                          <th className="px-3 py-2 font-black text-right">分數</th>
                          <th className="px-3 py-2 font-black text-right">百分比</th>
                          <th className="px-3 py-2 font-black text-right">時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.recentSubmissions.map((sub, i) => {
                          const pct =
                            sub.maxScore > 0
                              ? Math.round((sub.totalScore / sub.maxScore) * 100)
                              : 0;
                          const color =
                            pct >= 80
                              ? "#B8F0D8"
                              : pct >= 60
                              ? "#FFF3A3"
                              : pct >= 40
                              ? "#FFB3C6"
                              : "#FF8C7A";
                          return (
                            <tr
                              key={sub.id}
                              style={{
                                borderTop:
                                  i === 0 ? "none" : "1px solid rgba(26,26,26,0.1)",
                              }}
                            >
                              <td className="px-3 py-2 font-bold">{sub.studentName}</td>
                              <td className="px-3 py-2 text-[#1A1A1A]/60">
                                #{sub.assessmentId}
                              </td>
                              <td className="px-3 py-2 text-right font-bold">
                                {sub.totalScore}/{sub.maxScore}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className="inline-block px-2 py-0.5 rounded font-bold text-xs border-2 border-[#1A1A1A]"
                                  style={{ background: color }}
                                >
                                  {pct}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-[#1A1A1A]/60 text-xs">
                                <Calendar
                                  size={11}
                                  className="inline mr-1"
                                  aria-hidden="true"
                                />
                                {new Date(sub.submittedAt).toLocaleString("zh-TW", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="memphis-card p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center"
        style={{ background: color }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-[#1A1A1A]/60">{label}</div>
      </div>
    </div>
  );
}