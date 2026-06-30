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
      // 老師登入：給一個固定的虛擬 user（id=1），這樣 db 的 teacherId 邏輯可以繼續跑
      user = {
        id: 1,
        openId: "teacher-local",
        name: "Teacher",
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
