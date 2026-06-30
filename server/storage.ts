// Preconfigured storage helpers for Manus WebDev templates
// 兩種模式：
//   1. Manus Forge（預設） — 透過 presigned URL 上傳到 S3
//   2. 本地檔案系統 — 透過 LOCAL_STORAGE_DIR 環境變數切換
//
// 如果 BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY 都有設定 → 用 Forge
// 否則 fallback 到本地（適合自架 / Render / Fly.io）

import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

/** 是否使用本地儲存 */
function useLocalStorage(): boolean {
  return !ENV.forgeApiUrl || !ENV.forgeApiKey;
}

function getLocalDir(): string {
  return process.env.LOCAL_STORAGE_DIR ?? "./uploads";
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * 儲存一個檔案。
 * - Forge 模式：上傳到 S3，回 /manus-storage/{key} URL
 * - 本地模式：寫到 LOCAL_STORAGE_DIR/key，回 /storage-local/{key} URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (useLocalStorage()) {
    const dir = getLocalDir();
    const fullPath = path.join(dir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data as any);
    return { key, url: `/storage-local/${key}` };
  }

  // Forge 模式
  const { forgeUrl, forgeKey } = getForgeConfig();

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (useLocalStorage()) {
    return { key, url: `/storage-local/${key}` };
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  if (useLocalStorage()) {
    return `/storage-local/${normalizeKey(relKey)}`;
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

/**
 * 刪除一個檔案。靜默處理錯誤（刪不到通常代表已經被刪過）。
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);

  if (useLocalStorage()) {
    try {
      await fs.unlink(path.join(getLocalDir(), key));
    } catch {
      // 檔案不存在也視為成功
    }
    return;
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  const deleteUrl = new URL("v1/storage/delete", forgeUrl + "/");
  deleteUrl.searchParams.set("path", key);

  try {
    const resp = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${forgeKey}` },
    });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => resp.statusText);
      console.warn(`[storageDelete] ${key} failed (${resp.status}): ${msg}`);
    }
  } catch (err) {
    console.warn(`[storageDelete] ${key} error:`, err);
  }
}

/**
 * Magic bytes 驗證 — 確認 buffer 真的是圖片，不是偽造 content-type 的惡意檔。
 *
 * 支援：PNG / JPEG / GIF / WebP。回傳偵測到的 MIME type；非圖片回傳 null。
 */
export function detectImageMime(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: 47 49 46 38 (37|39) 61
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];
