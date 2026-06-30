/**
 * 共用 hook — 處理圖片上傳到 /api/upload/image
 *
 * 回傳 { upload, uploading } — 給 question image 和 picture choice 選項圖片複用。
 */

import { useState, useRef } from "react";
import { toast } from "sonner";
import { COOKIE_NAME } from "@shared/const";

export interface UploadResult {
  key: string;
  url: string;
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef(false);

  async function upload(file: File): Promise<UploadResult | null> {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("圖片大小不能超過 8MB");
      return null;
    }
    setUploading(true);
    abortRef.current = false;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      try {
        const raw = sessionStorage.getItem("manus-cookie");
        if (raw) {
          const prefix = `${COOKIE_NAME}=`;
          const pair = raw.split(";").find((s) => s.trim().startsWith(prefix));
          const token = pair?.trim().slice(prefix.length);
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
      } catch {
        // sessionStorage unavailable
      }

      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "上傳失敗" }));
        throw new Error(err.error ?? "上傳失敗");
      }

      const result = (await res.json()) as UploadResult;
      return result;
    } catch (e: any) {
      if (!abortRef.current) toast.error(e.message ?? "圖片上傳失敗");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}