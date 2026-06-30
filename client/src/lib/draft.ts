/**
 * 學生作答草稿（Draft）— 自動保存 / 恢復
 *
 * 用 localStorage 為每個 (shareToken, studentName) 保存一份作答進度，
 * 防止網路斷線、切到別頁、瀏覽器當機導致白做。
 *
 * 設計：
 * - 每題變更 debounce 300ms 後寫入（減少寫入次數）
 * - 提交成功後清除草稿
 * - 重新進入時如檢測到草稿，顯示「繼續作答」提示
 */

import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "quiz-draft-v1:";
const DEBOUNCE_MS = 400;
// 草稿有效期：7 天。過期視為過期，自動清除。
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DraftPayload {
  shareToken: string;
  studentName: string;
  assessmentId: number;
  assessmentTitle: string;
  answers: Record<number, unknown>;
  savedAt: number; // ms
}

function keyFor(shareToken: string, studentName: string): string {
  return `${STORAGE_PREFIX}${shareToken}:${encodeURIComponent(studentName.trim())}`;
}

export function saveDraft(payload: DraftPayload): void {
  if (typeof window === "undefined") return;
  try {
    const k = keyFor(payload.shareToken, payload.studentName);
    localStorage.setItem(k, JSON.stringify(payload));
  } catch {
    /* localStorage full / disabled */
  }
}

export function loadDraft(
  shareToken: string,
  studentName: string
): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(shareToken, studentName));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(keyFor(shareToken, studentName));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(shareToken: string, studentName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor(shareToken, studentName));
  } catch {
    /* ignore */
  }
}

/**
 * React Hook — 自動 debounce 寫入草稿
 *
 * 用法：
 *   useDraftAutosave(shareToken, studentName, assessmentMeta, answers);
 */
export function useDraftAutosave(
  shareToken: string,
  studentName: string,
  meta: { assessmentId: number; assessmentTitle: string } | null,
  answers: Record<number, unknown>
): { lastSavedAt: number | null } {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (!meta) return;
    // 第一次跑（mount）時不寫入，避免一進來就把空 answers 寫進去
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (!studentName.trim()) return;
    // 沒答案也不寫
    if (Object.keys(answers).length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft({
        shareToken,
        studentName,
        assessmentId: meta.assessmentId,
        assessmentTitle: meta.assessmentTitle,
        answers,
        savedAt: Date.now(),
      });
      setLastSavedAt(Date.now());
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [shareToken, studentName, meta, answers]);

  return { lastSavedAt };
}