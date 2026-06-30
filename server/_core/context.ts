import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import {
  extractSessionToken,
  verifyTeacherSession,
} from "./teacherAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = extractSessionToken(opts.req);
    const session = await verifyTeacherSession(token);
    if (session) {
      // 老師登入：優先用 session 內的 userId，否則 fallback id=1
      // 這樣 DB 帳號登入可正常運作，每個老師看自己的測驗
      const userId = (session as any).userId ?? 1;
      user = {
        id: userId,
        openId: (session as any).openId ?? "teacher-local",
        username: null,
        passwordHash: null,
        displayName: (session as any).displayName ?? "Teacher",
        name: (session as any).displayName ?? "Teacher",
        email: null,
        loginMethod: "password",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
    }
  } catch (error) {
    // 認證失敗就當沒登入（public procedure 不需要 user）
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
