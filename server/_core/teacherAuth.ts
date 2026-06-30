/**
 * 教師密碼認證 — 取代 Manus OAuth
 *
 * 環境變數：
 *   - TEACHER_PASSWORD：教師登入密碼（明文比對，部署到 Render 等平台時設定）
 *   - JWT_SECRET：JWT 簽名密鑰（已有，用作 cookie 簽名）
 *
 * 工作流程：
 *   1. 教師在前端輸入密碼 → POST /api/auth/login
 *   2. 後端比對環境變數 TEACHER_PASSWORD
 *   3. 正確 → 簽 JWT、設 cookie、回 200
 *   4. 後續每次 request 用 cookie 認證
 */

import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const ALG = "HS256";

export interface TeacherSession {
  role: "teacher";
  iat: number;
  exp: number;
}

function getSecretKey(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is required for teacher auth");
  }
  return new TextEncoder().encode(secret);
}

export async function signTeacherSession(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(ONE_YEAR_MS / 1000);
  return new SignJWT({ role: "teacher" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSecretKey());
}

export async function verifyTeacherSession(
  token: string | undefined | null
): Promise<TeacherSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [ALG],
    });
    if (payload.role !== "teacher") return null;
    return payload as unknown as TeacherSession;
  } catch {
    return null;
  }
}

/**
 * 從 request 提取 session token（cookie 或 Authorization header）
 */
export function extractSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith(`${COOKIE_NAME}=`)) {
        return c.slice(COOKIE_NAME.length + 1);
      }
    }
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * 比對輸入密碼是否正確
 *
 * 如果 TEACHER_PASSWORD 沒設定，視為「未啟用教師登入」→ 拒絕所有登入
 * 這樣可以避免不小心把沒有密碼保護的部署開放到公開網路
 */
export function checkTeacherPassword(input: string): boolean {
  const expected = process.env.TEACHER_PASSWORD;
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  // 時間常數比對避免 timing attack
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}