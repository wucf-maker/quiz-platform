/**
 * CSV 匯出 — 答題紀錄與統計分析
 *
 * 兩種 CSV：
 * - exportSubmissionsCSV：學生作答排名列表
 * - exportStatsCSV：題目統計 + 錯誤答案 + 分數分布
 *
 * 都加 BOM (\uFEFF) 確保 Excel 開啟時正確顯示中文。
 */

import type { ExportData } from "./types";
import { TYPE_LABELS, buildCSVRows, downloadFile } from "./helpers";

export function exportSubmissionsCSV(data: ExportData): void {
  const headers = ["排名", "姓名", "得分", "滿分", "百分比", "提交時間"];
  const rows = data.submissions.map((sub, idx) => {
    const pct =
      sub.maxScore > 0
        ? `${Math.round((sub.totalScore / sub.maxScore) * 100)}%`
        : "0%";
    return [
      idx + 1,
      sub.studentName,
      sub.totalScore,
      sub.maxScore,
      pct,
      new Date(sub.submittedAt).toLocaleString("zh-TW"),
    ];
  });

  const allRows: (string | number)[][] = [
    [`測驗名稱：${data.assessmentTitle}`],
    [`作答人數：${data.totalSubmissions}`],
    [`平均分數：${data.averageScore} / ${data.maxScore}`],
    [],
    headers,
    ...rows,
  ];

  const csv = "\uFEFF" + buildCSVRows(allRows);
  downloadFile(csv, `${data.assessmentTitle}_答題紀錄.csv`, "text/csv;charset=utf-8;");
}

export function exportStatsCSV(data: ExportData): void {
  const headers = ["題號", "題目", "題型", "答對人數", "作答人數", "答對率", "常見錯誤答案"];

  const rows = data.questionStats.map((q, idx) => {
    const wrongStr = q.wrongAnswers
      .slice(0, 3)
      .map((w) => {
        const ans =
          typeof w.answer === "string" ? w.answer : JSON.stringify(w.answer);
        return `${ans}(×${w.count})`;
      })
      .join(" | ");

    return [
      `Q${idx + 1}`,
      q.questionText,
      TYPE_LABELS[q.questionType] ?? q.questionType,
      q.correctCount,
      q.totalCount,
      `${Math.round(q.correctRate)}%`,
      wrongStr,
    ];
  });

  const distHeaders = ["分數區間", "人數"];
  const distRows = data.scoreDistribution.map((d) => [d.range, d.count]);

  const allRows: (string | number)[][] = [
    [`測驗名稱：${data.assessmentTitle}`],
    [`作答人數：${data.totalSubmissions}`],
    [`平均分數：${data.averageScore} / ${data.maxScore}`],
    [],
    ["── 各題統計 ──"],
    headers,
    ...rows,
    [],
    ["── 分數分布 ──"],
    distHeaders,
    ...distRows,
  ];

  const csv = "\uFEFF" + buildCSVRows(allRows);
  downloadFile(csv, `${data.assessmentTitle}_統計分析.csv`, "text/csv;charset=utf-8;");
}