import type { Express } from "express";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

/**
 * 註冊兩種 storage URL 端點：
 * - /manus-storage/* — Manus Forge 模式（透過 presigned URL 重定向）
 * - /storage-local/* — 本地模式（直接從 LOCAL_STORAGE_DIR 讀檔）
 *
 * 兩個端點都會根據 ENV 自動決定啟用哪個，避免設定不一致時 404。
 */

const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR ?? "./uploads";

// 簡單的副檔名 → MIME 對照表（涵蓋圖片）
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};

function detectMimeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function registerStorageProxy(app: Express) {
  // Manus Forge 模式
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      // 沒設定 Forge → 改用本地（fallback）
      serveLocal(key, res);
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  // 本地模式
  app.get("/storage-local/*", (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    serveLocal(key, res);
  });
}

function serveLocal(key: string, res: import("express").Response) {
  // 防止路徑穿越攻擊
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const localRoot = path.resolve(LOCAL_DIR);
  const fullPath = path.resolve(localRoot, safeKey);
  if (!fullPath.startsWith(localRoot)) {
    res.status(403).send("Forbidden");
    return;
  }
  if (!fs.existsSync(fullPath)) {
    res.status(404).send("Not found");
    return;
  }
  const contentType = detectMimeFromExt(fullPath);
  res.set("Content-Type", contentType);
  res.set("Cache-Control", "public, max-age=3600");
  fs.createReadStream(fullPath).pipe(res);
}