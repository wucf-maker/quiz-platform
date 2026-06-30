import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
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
  const [result] = await db.insert(assessments).values(data);
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
  await db
    .update(assessments)
    .set(data)
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
    // picture_choice 的 options 裡可能也有 imageKey
    const opts = (q.options as Array<{ imageKey?: string }> | null) ?? [];
    for (const opt of opts) {
      if (opt?.imageKey) imageKeys.push(opt.imageKey);
    }
  }

  // 整個刪除鏈包在一個 transaction 裡，任一步失敗就 rollback，避免留垃圾
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
    await db.update(questions).set(rest).where(eq(questions.id, id));
    return id;
  } else {
    const [result] = await db.insert(questions).values(data);
    return (result as any).insertId as number;
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
      .set({ orderIndex: i })
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
  const [result] = await db.insert(studentSubmissions).values(data);
  const submissionId = (result as any).insertId as number;
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
 * 給學生端「我的歷史」按鈕使用。
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

  // Score distribution
  const maxScore = qs.reduce((s, q) => s + q.score, 0);
  const avgScore =
    subs.reduce((s, sub) => s + sub.totalScore, 0) / totalSubmissions;

  // Per-question stats
  const questionStats = await Promise.all(
    qs.map(async (q) => {
      const answers = await db
        .select()
        .from(studentAnswers)
        .where(eq(studentAnswers.questionId, q.id));

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
    })
  );

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
  const [result] = await db.insert(classes).values(data);
  return (result as any).insertId as number;
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
  // 先把所有 classId 指向這個班的測驗的 classId 設為 null
  await db
    .update(assessments)
    .set({ classId: null })
    .where(and(eq(assessments.classId, id), eq(assessments.teacherId, teacherId)));
  await db
    .delete(classes)
    .where(and(eq(classes.id, id), eq(classes.teacherId, teacherId)));
}
