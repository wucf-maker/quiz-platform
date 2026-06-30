import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  assessments,
  questions,
  studentSubmissions,
  studentAnswers,
  classes,
  type InsertAssessment,
  type InsertQuestion,
  type InsertStudentSubmission,
  type InsertStudentAnswer,
  type InsertClass,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Neon 需要 SSL，postgres-js 會自動偵測 `?sslmode=require` 或 neon URL
      _client = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  // PostgreSQL ON CONFLICT 用 (column) 而不是 mysql 的 ON DUPLICATE KEY UPDATE
  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function createAssessment(data: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(assessments).values(data).returning();
  return result;
}

export async function getAssessmentsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(assessments)
    .where(eq(assessments.teacherId, teacherId))
    .orderBy(desc(assessments.createdAt));
}

export async function getAssessmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  return result[0];
}

export async function getAssessmentByToken(shareToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.shareToken, shareToken), eq(assessments.isActive, true)))
    .limit(1);
  return result[0];
}

export async function updateAssessment(
  id: number,
  teacherId: number,
  data: Partial<InsertAssessment>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // updatedAt 自動更新
  await db
    .update(assessments)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(assessments.id, id), eq(assessments.teacherId, teacherId)));
}

export async function deleteAssessment(id: number, teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // 先收集所有相關的 S3 image keys（transaction 成功後才實際刪 S3）
  const qs = await db.select().from(questions).where(eq(questions.assessmentId, id));
  const imageKeys: string[] = [];
  for (const q of qs) {
    if (q.questionImageKey) imageKeys.push(q.questionImageKey);
    const opts = (q.options as Array<{ imageKey?: string }> | null) ?? [];
    for (const opt of opts) {
      if (opt?.imageKey) imageKeys.push(opt.imageKey);
    }
  }

  // 整個刪除鏈包在一個 transaction 裡
  await db.transaction(async (tx) => {
    if (qs.length > 0) {
      for (const q of qs) {
        await tx.delete(studentAnswers).where(eq(studentAnswers.questionId, q.id));
      }
    }
    await tx.delete(studentSubmissions).where(eq(studentSubmissions.assessmentId, id));
    await tx.delete(questions).where(eq(questions.assessmentId, id));
    await tx
      .delete(assessments)
      .where(and(eq(assessments.id, id), eq(assessments.teacherId, teacherId)));
  });

  return { imageKeys };
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getQuestionsByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId))
    .orderBy(questions.orderIndex);
}

export async function upsertQuestion(data: InsertQuestion & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db
      .update(questions)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(questions.id, id));
    return id;
  } else {
    const [result] = await db.insert(questions).values(data).returning();
    return result.id;
  }
}

export async function deleteQuestion(id: number, assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(studentAnswers).where(eq(studentAnswers.questionId, id));
  await db
    .delete(questions)
    .where(and(eq(questions.id, id), eq(questions.assessmentId, assessmentId)));
}

export async function reorderQuestions(
  assessmentId: number,
  orderedIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(questions)
      .set({ orderIndex: i, updatedAt: new Date() })
      .where(
        and(eq(questions.id, orderedIds[i]), eq(questions.assessmentId, assessmentId))
      );
  }
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function createSubmission(
  data: InsertStudentSubmission,
  answers: InsertStudentAnswer[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [submission] = await db.insert(studentSubmissions).values(data).returning();
  const submissionId = submission.id;
  if (answers.length > 0) {
    await db
      .insert(studentAnswers)
      .values(answers.map((a) => ({ ...a, submissionId })));
  }
  return submissionId;
}

export async function getSubmissionsByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(studentSubmissions)
    .where(eq(studentSubmissions.assessmentId, assessmentId))
    .orderBy(desc(studentSubmissions.submittedAt));
}

export async function getSubmissionWithAnswers(submissionId: number) {
  const db = await getDb();
  if (!db) return null;
  const [submission] = await db
    .select()
    .from(studentSubmissions)
    .where(eq(studentSubmissions.id, submissionId))
    .limit(1);
  if (!submission) return null;
  const answers = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.submissionId, submissionId));
  return { submission, answers };
}

/**
 * 取得某學生在指定測驗的所有提交歷史。
 */
export async function getStudentHistory(
  assessmentId: number,
  studentName: string
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(studentSubmissions)
    .where(
      and(
        eq(studentSubmissions.assessmentId, assessmentId),
        eq(studentSubmissions.studentName, studentName.trim())
      )
    )
    .orderBy(desc(studentSubmissions.submittedAt));
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getAssessmentStats(assessmentId: number) {
  const db = await getDb();
  if (!db) return null;

  const qs = await getQuestionsByAssessment(assessmentId);
  const subs = await getSubmissionsByAssessment(assessmentId);
  const totalSubmissions = subs.length;

  if (totalSubmissions === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      maxScore: qs.reduce((s, q) => s + q.score, 0),
      questionStats: qs.map((q) => ({
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        correctCount: 0,
        totalCount: 0,
        correctRate: 0,
        wrongAnswers: [] as { answer: unknown; count: number }[],
      })),
      scoreDistribution: [] as { range: string; count: number }[],
    };
  }

  const maxScore = qs.reduce((s, q) => s + q.score, 0);
  const avgScore =
    subs.reduce((s, sub) => s + sub.totalScore, 0) / totalSubmissions;

  // 一次撈所有 answers，再 JS 分組（避免 N 次 query）
  const allAnswers = await db
    .select()
    .from(studentAnswers)
    .where(
      sql`${studentAnswers.questionId} IN ${sql.raw(
        `(${qs.map((q) => q.id).join(",")})`
      )}`
    );

  const answersByQuestion = new Map<number, typeof allAnswers>();
  for (const a of allAnswers) {
    if (!answersByQuestion.has(a.questionId)) {
      answersByQuestion.set(a.questionId, []);
    }
    answersByQuestion.get(a.questionId)!.push(a);
  }

  const questionStats = qs.map((q) => {
    const answers = answersByQuestion.get(q.id) ?? [];
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const wrongAnswerMap = new Map<string, number>();
    answers
      .filter((a) => !a.isCorrect)
      .forEach((a) => {
        const key = JSON.stringify(a.studentAnswer);
        wrongAnswerMap.set(key, (wrongAnswerMap.get(key) ?? 0) + 1);
      });

    const wrongAnswers = Array.from(wrongAnswerMap.entries())
      .map(([answer, count]) => ({ answer: JSON.parse(answer), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      correctCount,
      totalCount: answers.length,
      correctRate: answers.length > 0 ? (correctCount / answers.length) * 100 : 0,
      wrongAnswers,
    };
  });

  // Score distribution buckets
  const buckets = [
    { range: "0-20%", min: 0, max: 0.2 },
    { range: "21-40%", min: 0.21, max: 0.4 },
    { range: "41-60%", min: 0.41, max: 0.6 },
    { range: "61-80%", min: 0.61, max: 0.8 },
    { range: "81-100%", min: 0.81, max: 1.0 },
  ];
  const scoreDistribution = buckets.map((b) => ({
    range: b.range,
    count: subs.filter((s) => {
      const pct = maxScore > 0 ? s.totalScore / maxScore : 0;
      return pct >= b.min && pct <= b.max;
    }).length,
  }));

  return {
    totalSubmissions,
    averageScore: Math.round(avgScore * 10) / 10,
    maxScore,
    questionStats,
    scoreDistribution,
  };
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function createClass(data: InsertClass) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(classes).values(data).returning();
  return result.id;
}

export async function getClassesByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, teacherId))
    .orderBy(desc(classes.createdAt));
}

export async function deleteClass(id: number, teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(assessments)
    .set({ classId: null, updatedAt: new Date() })
    .where(and(eq(assessments.classId, id), eq(assessments.teacherId, teacherId)));
  await db
    .delete(classes)
    .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)));
}

export async function updateClass(
  id: number,
  teacherId: number,
  data: { name?: string; description?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const update: Record<string, unknown> = {};
  if (typeof data.name === "string") update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  await db
    .update(classes)
    .set(update)
    .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)));
}

/**
 * 班級統計：班級下的測驗數、學生數、平均分
 * 邏輯：透過 assessments.classId 找到該班的測驗，再 join submissions 算統計
 */
export async function getClassStats(id: number, teacherId: number) {
  const db = await getDb();
  if (!db) return null;

  // 先驗證班級屬於這個老師
  const clsRows = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)))
    .limit(1);
  if (clsRows.length === 0) return null;
  const cls = clsRows[0];

  // 班級下測驗數
  const assessmentRows = await db
    .select({ id: assessments.id, title: assessments.title })
    .from(assessments)
    .where(and(eq(assessments.classId, id), eq(assessments.teacherId, teacherId)));

  const assessmentIds = assessmentRows.map((a) => a.id);

  if (assessmentIds.length === 0) {
    return {
      class: cls,
      assessmentCount: 0,
      submissionCount: 0,
      uniqueStudentCount: 0,
      avgScorePercent: 0,
      recentSubmissions: [],
      assessments: [],
    };
  }

  // 提交數與分數
  const submissionRows = await db
    .select({
      id: studentSubmissions.id,
      studentName: studentSubmissions.studentName,
      totalScore: studentSubmissions.totalScore,
      maxScore: studentSubmissions.maxScore,
      assessmentId: studentSubmissions.assessmentId,
      submittedAt: studentSubmissions.submittedAt,
    })
    .from(studentSubmissions)
    .where(inArray(studentSubmissions.assessmentId, assessmentIds))
    .orderBy(desc(studentSubmissions.submittedAt))
    .limit(200);

  const uniqueStudents = new Set(submissionRows.map((s) => s.studentName));
  const totalPct = submissionRows.reduce((sum, s) => {
    return s.maxScore > 0 ? sum + (s.totalScore / s.maxScore) * 100 : sum;
  }, 0);
  const avgScorePercent =
    submissionRows.length > 0 ? Math.round(totalPct / submissionRows.length) : 0;

  return {
    class: cls,
    assessmentCount: assessmentRows.length,
    submissionCount: submissionRows.length,
    uniqueStudentCount: uniqueStudents.size,
    avgScorePercent,
    recentSubmissions: submissionRows.slice(0, 20),
    assessments: assessmentRows,
  };
}

// ──────────────────────────────────────────────────────────────────────
// 教師帳號 (scrypt 密碼雜湊，避免引入原生依賴)
// ──────────────────────────────────────────────────────────────────────
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString("hex");
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const hashHex = parts[5];
    if (!salt || !hashHex || !Number.isFinite(N)) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTeachers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      username: users.username,
      name: users.displayName,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(desc(users.lastSignedIn));
}

export async function createTeacherAccount(input: {
  username: string;
  displayName: string;
  password: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const passwordHash = hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({
      openId: `local:${input.username}`,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      role: "admin",
      loginMethod: "local",
    })
    .returning();
  return row;
}

export async function deleteTeacherAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(users).where(and(eq(users.id, id), eq(users.role, "admin")));
}