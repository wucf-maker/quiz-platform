/**
 * 題目 JSON 匯入 / 匯出
 *
 * 格式（assessment-export-v1.json）：
 * {
 *   "version": 1,
 *   "exportedAt": "2026-06-29T08:00:00Z",
 *   "assessment": {
 *     "title": "...",
 *     "description": "..."
 *   },
 *   "questions": [
 *     {
 *       "questionType": "single_choice" | "picture_choice" | "matching" | "fill_blank",
 *       "questionText": "...",
 *       "questionImageKey": "...",
 *       "questionImageUrl": "...",
 *       "options": [...],
 *       "correctAnswer": ...,
 *       "score": 1
 *     }
 *   ]
 * }
 */

import { downloadFile } from "@/lib/exportUtils/helpers";

export interface ExportedQuestion {
  questionType: "single_choice" | "picture_choice" | "matching" | "fill_blank";
  questionText: string;
  questionImageKey?: string | null;
  questionImageUrl?: string | null;
  options: any;
  correctAnswer: any;
  score: number;
}

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  assessment: {
    title: string;
    description?: string | null;
  };
  questions: ExportedQuestion[];
}

/**
 * 匯出目前 assessment 的題目為 JSON 檔下載
 */
export function exportQuestionsToJSON(
  title: string,
  description: string | null | undefined,
  questions: ExportedQuestion[]
): void {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    assessment: { title, description: description ?? null },
    questions,
  };
  const json = JSON.stringify(payload, null, 2);
  const filename = `${title.replace(/[^\w\u4e00-\u9fff-]/g, "_")}_題目.json`;
  downloadFile(json, filename, "application/json;charset=utf-8;");
}

/**
 * 解析使用者上傳的 JSON 檔，回傳題目陣列。
 * 任何錯誤（格式錯誤、版本不符、題型未知）都會 throw。
 */
export function parseQuestionsJSON(jsonText: string): {
  title: string;
  description: string | null;
  questions: ExportedQuestion[];
} {
  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch (e: any) {
    throw new Error("JSON 格式錯誤：無法解析");
  }

  if (data?.version !== 1) {
    throw new Error("不支援的檔案版本（僅支援 version 1）");
  }
  if (!data.assessment || typeof data.assessment.title !== "string") {
    throw new Error("缺少 assessment.title");
  }
  if (!Array.isArray(data.questions)) {
    throw new Error("questions 必須是陣列");
  }

  const validTypes = ["single_choice", "picture_choice", "matching", "fill_blank"];
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    if (!validTypes.includes(q.questionType)) {
      throw new Error(`第 ${i + 1} 題的題型不合法：${q.questionType}`);
    }
    if (typeof q.questionText !== "string" || !q.questionText.trim()) {
      throw new Error(`第 ${i + 1} 題缺少題目內容`);
    }
    if (typeof q.score !== "number" || q.score < 1) {
      throw new Error(`第 ${i + 1} 題的分數不合法`);
    }
    if (q.correctAnswer === undefined || q.correctAnswer === null) {
      throw new Error(`第 ${i + 1} 題缺少正確答案`);
    }
  }

  return {
    title: data.assessment.title,
    description: data.assessment.description ?? null,
    questions: data.questions as ExportedQuestion[],
  };
}