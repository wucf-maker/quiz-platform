/**
 * PDF 匯出 — 用 HTML + window.print() 產生完整評估報告
 *
 * 為什麼不用 jsPDF？
 *   - 對 CJK 字體支援差（需要內嵌字型，動輒 1-3 MB）
 *   - 樣式表達受限（HTML/CSS 能做的 jsPDF 做不了）
 *
 * 改用「新視窗開 HTML → 列印為 PDF」的策略，瀏覽器原生處理字體。
 */

import type { ExportData } from "./types";
import { TYPE_LABELS, downloadFile } from "./helpers";

export function exportFullPDF(data: ExportData): void {
  const now = new Date().toLocaleString("zh-TW");

  const submissionsRows = data.submissions
    .map((sub, idx) => {
      const pct =
        sub.maxScore > 0
          ? Math.round((sub.totalScore / sub.maxScore) * 100)
          : 0;
      const color = pct >= 60 ? "#16a34a" : "#dc2626";
      return `
        <tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${sub.studentName}</td>
          <td style="text-align:center">${sub.totalScore}</td>
          <td style="text-align:center">${sub.maxScore}</td>
          <td style="text-align:center;color:${color};font-weight:800">${pct}%</td>
          <td>${new Date(sub.submittedAt).toLocaleString("zh-TW")}</td>
        </tr>`;
    })
    .join("");

  const distRows = data.scoreDistribution
    .map((d) => {
      const pct =
        data.totalSubmissions > 0
          ? Math.round((d.count / data.totalSubmissions) * 100)
          : 0;
      return `<tr><td>${d.range}</td><td style="text-align:center">${d.count}</td><td style="text-align:center">${pct}%</td></tr>`;
    })
    .join("");

  const questionRows = data.questionStats
    .map((q, idx) => {
      const pct = Math.round(q.correctRate);
      const color = pct >= 60 ? "#16a34a" : "#dc2626";
      const wrongStr = q.wrongAnswers
        .slice(0, 3)
        .map((w) => {
          const ans =
            typeof w.answer === "string"
              ? w.answer
              : JSON.stringify(w.answer).slice(0, 20);
          return `<span class="wrong-tag">${ans} ×${w.count}</span>`;
        })
        .join(" ");

      const barColor = pct >= 60 ? "#7EDDB0" : pct >= 40 ? "#FFE566" : "#FF8C7A";

      return `
        <tr>
          <td style="text-align:center;font-weight:800">Q${idx + 1}</td>
          <td>${q.questionText}</td>
          <td style="text-align:center">${TYPE_LABELS[q.questionType] ?? q.questionType}</td>
          <td style="text-align:center">${q.correctCount}/${q.totalCount}</td>
          <td style="text-align:center">
            <span style="color:${color};font-weight:800">${pct}%</span>
            <div style="width:100%;height:6px;background:#FFE5D9;border-radius:3px;margin-top:3px">
              <div style="width:${pct}%;height:6px;background:${barColor};border-radius:3px"></div>
            </div>
          </td>
          <td>${wrongStr || "—"}</td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${data.assessmentTitle} — 完整報告</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans TC', sans-serif; font-size: 12px; color: #1A1A1A; background: white; }
  .page { padding: 20mm 15mm; max-width: 210mm; margin: 0 auto; }

  /* Header */
  .header { background: #D4C5F9; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; position: relative; overflow: hidden; }
  .header::before { content: ''; position: absolute; right: 20px; top: 10px; width: 40px; height: 40px; background: #B8F0D8; border-radius: 50%; }
  .header::after { content: ''; position: absolute; right: 55px; top: 25px; width: 24px; height: 24px; background: #FFF3A3; border-radius: 50%; }
  .header h1 { font-size: 20px; font-weight: 900; }
  .header p { font-size: 10px; color: #555; margin-top: 4px; }

  /* Summary cards */
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .card { border: 2px solid #1A1A1A; border-radius: 10px; padding: 10px 12px; }
  .card .val { font-size: 18px; font-weight: 900; }
  .card .lbl { font-size: 9px; color: #666; margin-top: 2px; }
  .card:nth-child(1) { background: #D4C5F9; }
  .card:nth-child(2) { background: #B8F0D8; }
  .card:nth-child(3) { background: #FFF3A3; }
  .card:nth-child(4) { background: #FFB3C6; }

  /* Section title */
  .section-title { font-size: 14px; font-weight: 900; margin: 20px 0 10px; padding-left: 8px; border-left: 4px solid #1A1A1A; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1A1A1A; color: white; font-weight: 700; padding: 8px 10px; text-align: left; font-size: 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: middle; }
  tr:nth-child(even) td { background: #fdf8f5; }

  /* Wrong answer tags */
  .wrong-tag { display: inline-block; background: #FFB3C6; border: 1px solid #1A1A1A; border-radius: 6px; padding: 1px 6px; margin: 1px; font-size: 9px; }

  /* Footer */
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }

  /* Page break */
  .page-break { page-break-before: always; padding-top: 20mm; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <h1>📋 ${data.assessmentTitle}</h1>
    <p>完整評估報告 · 匯出時間：${now}</p>
  </div>

  <!-- Summary -->
  <div class="cards">
    <div class="card"><div class="val">${data.totalSubmissions}</div><div class="lbl">作答人數</div></div>
    <div class="card"><div class="val">${data.averageScore}/${data.maxScore}</div><div class="lbl">平均分數</div></div>
    <div class="card"><div class="val">${data.questionStats.length}</div><div class="lbl">題目數量</div></div>
    <div class="card"><div class="val">${data.maxScore}</div><div class="lbl">滿分</div></div>
  </div>

  <!-- Submissions -->
  <div class="section-title">學生答題紀錄</div>
  <table>
    <thead><tr><th>排名</th><th>姓名</th><th>得分</th><th>滿分</th><th>百分比</th><th>提交時間</th></tr></thead>
    <tbody>${submissionsRows || '<tr><td colspan="6" style="text-align:center;color:#999">尚無作答紀錄</td></tr>'}</tbody>
  </table>

  <!-- Page 2: Stats -->
  <div class="page-break">
    <div class="header">
      <h1>📊 ${data.assessmentTitle}</h1>
      <p>統計分析報告 · 匯出時間：${now}</p>
    </div>

    <div class="cards">
      <div class="card"><div class="val">${data.totalSubmissions}</div><div class="lbl">作答人數</div></div>
      <div class="card"><div class="val">${data.averageScore}/${data.maxScore}</div><div class="lbl">平均分數</div></div>
      <div class="card"><div class="val">${data.questionStats.length}</div><div class="lbl">題目數量</div></div>
      <div class="card"><div class="val">${data.maxScore}</div><div class="lbl">滿分</div></div>
    </div>

    <div class="section-title">分數分布</div>
    <table>
      <thead><tr><th>分數區間</th><th>人數</th><th>佔比</th></tr></thead>
      <tbody>${distRows || '<tr><td colspan="3" style="text-align:center;color:#999">尚無資料</td></tr>'}</tbody>
    </table>

    <div class="section-title">各題統計分析</div>
    <table>
      <thead><tr><th>題號</th><th>題目</th><th>題型</th><th>答對/作答</th><th>答對率</th><th>常見錯誤</th></tr></thead>
      <tbody>${questionRows || '<tr><td colspan="6" style="text-align:center;color:#999">尚無資料</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">Quiz Master 評估平台 · 本報告由系統自動生成</div>
</div>

<!-- Print trigger -->
<script>
  document.fonts.ready.then(() => {
    setTimeout(() => window.print(), 300);
  });
  window.onafterprint = () => window.close();
</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    // Fallback: download as HTML
    downloadFile(html, `${data.assessmentTitle}_完整報告.html`, "text/html;charset=utf-8;");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}