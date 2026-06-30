import type { Express, Request, Response } from "express";
import multer from "multer";
import { storagePut, detectImageMime, ALLOWED_IMAGE_MIMES } from "./storage";
import { extractSessionToken, verifyTeacherSession } from "./_core/teacherAuth";
import { nanoid } from "nanoid";

// Store file in memory (no disk writes needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("只允許上傳圖片檔案"));
    }
  },
});

// 副檔名 → MIME 對照（保留用於 storage key）
const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function registerUploadRoute(app: Express) {
  app.post(
    "/api/upload/image",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        // Authenticate（教師密碼）
        const token = extractSessionToken(req);
        const session = await verifyTeacherSession(token);
        if (!session) {
          res.status(401).json({ error: "請先登入" });
          return;
        }
        const user = { id: 1 };

        if (!req.file) {
          res.status(400).json({ error: "未收到圖片檔案" });
          return;
        }

        // 用 magic bytes 驗證實際內容，不只信任 content-type
        const detected = detectImageMime(req.file.buffer);
        if (!detected || !(ALLOWED_IMAGE_MIMES as readonly string[]).includes(detected)) {
          res.status(400).json({
            error: "檔案內容不是有效的圖片（PNG / JPEG / GIF / WebP）",
          });
          return;
        }

        // 偵測到的 MIME 必須與上傳聲稱的 MIME 同類型（避免 png 檔但 mime 寫成 jpeg 的混淆）
        if (
          req.file.mimetype !== detected &&
          !(req.file.mimetype === "image/jpeg" && detected === "image/jpeg")
        ) {
          res.status(400).json({
            error: `檔案內容 (${detected}) 與副檔名 (${req.file.mimetype}) 不一致`,
          });
          return;
        }

        const ext = EXT_MAP[detected] ?? "png";
        const key = `quiz-images/${user.id}/${nanoid(16)}.${ext}`;
        const { url } = await storagePut(key, req.file.buffer, detected);

        res.json({ key, url });
      } catch (err: any) {
        console.error("[Upload] Error:", err);
        res.status(500).json({ error: err.message ?? "上傳失敗" });
      }
    }
  );
}
