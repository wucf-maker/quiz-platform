import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { storagePut, storageDelete } from "./storage";
import {
  signTeacherSession,
  checkTeacherPassword,
} from "./_core/teacherAuth";
import {
  createAssessment,
  getAssessmentsByTeacher,
  getAssessmentById,
  getAssessmentByToken,
  updateAssessment,
  deleteAssessment,
  getQuestionsByAssessment,
  upsertQuestion,
  deleteQuestion,
  reorderQuestions,
  createSubmission,
  getSubmissionsByAssessment,
  getSubmissionWithAnswers,
  getAssessmentStats,
  getStudentHistory,
  createClass,
  getClassesByTeacher,
  deleteClass,
} from "./db";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const questionTypeEnum = z.enum(["single_choice", "picture_choice", "matching", "fill_blank"]);

const singleChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const pictureChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  imageKey: z.string().optional(),
  imageUrl: z.string().optional(),
});

const matchingOptionSchema = z.object({
  id: z.string(),
  left: z.string(),
  right: z.string(),
});

const questionInputSchema = z.object({
  id: z.number().optional(),
  assessmentId: z.number(),
  orderIndex: z.number().default(0),
  questionType: questionTypeEnum,
  questionText: z.string().min(1),
  questionImageKey: z.string().optional().nullable(),
  questionImageUrl: z.string().optional().nullable(),
  options: z.union([
    z.array(singleChoiceOptionSchema),
    z.array(pictureChoiceOptionSchema),
    z.array(matchingOptionSchema),
    z.null(),
  ]).optional(),
  correctAnswer: z.unknown(),
  score: z.number().min(1).default(1),
});

// ─── Helper: grade an answer ──────────────────────────────────────────────────

function gradeAnswer(
  questionType: string,
  correctAnswer: unknown,
  studentAnswer: unknown
): boolean {
  if (studentAnswer === null || studentAnswer === undefined) return false;

  if (questionType === "single_choice" || questionType === "picture_choice") {
    return String(correctAnswer) === String(studentAnswer);
  }

  if (questionType === "fill_blank") {
    const correct = Array.isArray(correctAnswer)
      ? correctAnswer.map((s: unknown) => String(s).trim().toLowerCase())
      : [String(correctAnswer).trim().toLowerCase()];
    const student = String(studentAnswer).trim().toLowerCase();
    return correct.includes(student);
  }

  if (questionType === "matching") {
    // correctAnswer: [{leftId, rightId}], studentAnswer: [{leftId, rightId}]
    if (!Array.isArray(correctAnswer) || !Array.isArray(studentAnswer)) return false;
    const correct = correctAnswer as { leftId: string; rightId: string }[];
    const student = studentAnswer as { leftId: string; rightId: string }[];
    if (correct.length !== student.length) return false;
    return correct.every((c) =>
      student.some((s) => s.leftId === c.leftId && s.rightId === c.rightId)
    );
  }

  return false;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * 教師密碼登入 — 取代 Manus OAuth
     * 接受明文密碼，比對 TEACHER_PASSWORD 環境變數
     * 成功後設定 HttpOnly cookie
     */
    login: publicProcedure
      .input(z.object({ password: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => {
        if (!checkTeacherPassword(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "密碼錯誤" });
        }
        const token = await signTeacherSession();
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        return {
          success: true,
          user: { id: 1, name: "Teacher", role: "admin" as const },
        };
      }),

    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Assessments (teacher) ────────────────────────────────────────────────
  assessment: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const assessmentList = await getAssessmentsByTeacher(ctx.user.id);
      // Attach question count
      const result = await Promise.all(
        assessmentList.map(async (a) => {
          const qs = await getQuestionsByAssessment(a.id);
          const subs = await getSubmissionsByAssessment(a.id);
          return { ...a, questionCount: qs.length, submissionCount: subs.length };
        })
      );
      return result;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.id);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const qs = await getQuestionsByAssessment(a.id);
        return { ...a, questions: qs };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          classId: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const shareToken = nanoid(12);
        await createAssessment({
          teacherId: ctx.user.id,
          classId: input.classId ?? null,
          title: input.title,
          description: input.description ?? null,
          shareToken,
          isActive: true,
        });
        const list = await getAssessmentsByTeacher(ctx.user.id);
        return list[0]; // most recent
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional().nullable(),
          isActive: z.boolean().optional(),
          classId: z.number().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAssessment(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { imageKeys } = await deleteAssessment(input.id, ctx.user.id);
        // transaction 成功後再清理 S3（失敗只會留垃圾，DB 已乾淨）
        for (const key of imageKeys) {
          await storageDelete(key).catch((e) =>
            console.warn(`[assessment.delete] failed to delete S3 ${key}:`, e)
          );
        }
        return { success: true };
      }),

    getQrCode: protectedProcedure
      .input(z.object({ id: z.number(), origin: z.string() }))
      .query(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.id);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const url = `${input.origin}/quiz/${a.shareToken}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });
        return { qrDataUrl, shareUrl: url, shareToken: a.shareToken };
      }),
  }),

  // ─── Questions (teacher) ──────────────────────────────────────────────────
  question: router({
    upsert: protectedProcedure
      .input(questionInputSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const id = await upsertQuestion({
          ...input,
          options: input.options as any,
          correctAnswer: input.correctAnswer as any,
          questionImageKey: input.questionImageKey ?? null,
          questionImageUrl: input.questionImageUrl ?? null,
        });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), assessmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteQuestion(input.id, input.assessmentId);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ assessmentId: z.number(), orderedIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await reorderQuestions(input.assessmentId, input.orderedIds);
        return { success: true };
      }),
  }),

  // ─── Image Upload ─────────────────────────────────────────────────────────
  upload: router({
    image: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          mimeType: z.string(),
          base64Data: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `quiz-images/${ctx.user.id}/${nanoid(16)}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { key, url };
      }),
  }),

  // ─── Public Quiz (student) ────────────────────────────────────────────────
  quiz: router({
    getByToken: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const a = await getAssessmentByToken(input.shareToken);
        if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "測驗不存在或已關閉" });
        const qs = await getQuestionsByAssessment(a.id);
        // Strip correct answers from public response
        const safeQuestions = qs.map(({ correctAnswer, ...rest }) => rest);
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          shareToken: a.shareToken,
          questions: safeQuestions,
        };
      }),

    submit: publicProcedure
      .input(
        z.object({
          assessmentId: z.number(),
          studentName: z.string().min(1).max(128),
          answers: z.array(
            z.object({
              questionId: z.number(),
              studentAnswer: z.unknown(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || !a.isActive) {
          throw new TRPCError({ code: "NOT_FOUND", message: "測驗不存在或已關閉" });
        }
        const qs = await getQuestionsByAssessment(input.assessmentId);
        const maxScore = qs.reduce((s, q) => s + q.score, 0);

        let totalScore = 0;
        const gradedAnswers = input.answers.map((ans) => {
          const q = qs.find((q) => q.id === ans.questionId);
          if (!q) return { questionId: ans.questionId, studentAnswer: ans.studentAnswer, isCorrect: false, scoreEarned: 0 };
          const isCorrect = gradeAnswer(q.questionType, q.correctAnswer, ans.studentAnswer);
          const scoreEarned = isCorrect ? q.score : 0;
          totalScore += scoreEarned;
          return {
            questionId: ans.questionId,
            studentAnswer: ans.studentAnswer as any,
            isCorrect,
            scoreEarned,
          };
        });

        const submissionId = await createSubmission(
          {
            assessmentId: input.assessmentId,
            studentName: input.studentName,
            totalScore,
            maxScore,
          },
          gradedAnswers.map((a) => ({
            submissionId: 0, // will be replaced
            questionId: a.questionId,
            studentAnswer: a.studentAnswer,
            isCorrect: a.isCorrect,
            scoreEarned: a.scoreEarned,
          }))
        );

        // Return results with correct answers for feedback
        const feedback = qs.map((q) => {
          const ans = gradedAnswers.find((a) => a.questionId === q.id);
          return {
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
            studentAnswer: ans?.studentAnswer ?? null,
            isCorrect: ans?.isCorrect ?? false,
            scoreEarned: ans?.scoreEarned ?? 0,
            maxScore: q.score,
          };
        });

        return {
          submissionId,
          studentName: input.studentName,
          totalScore,
          maxScore,
          feedback,
        };
      }),

    /**
     * 學生歷史提交查詢
     * 同個 shareToken + 學生姓名，可以查看自己過去所有提交（按時間倒序）
     */
    history: publicProcedure
      .input(
        z.object({
          assessmentId: z.number(),
          studentName: z.string().min(1).max(128),
        })
      )
      .query(async ({ input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || !a.isActive) {
          throw new TRPCError({ code: "NOT_FOUND", message: "測驗不存在或已關閉" });
        }
        const submissions = await getStudentHistory(input.assessmentId, input.studentName);
        return submissions.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          totalScore: s.totalScore,
          maxScore: s.maxScore,
          submittedAt: s.submittedAt,
        }));
      }),
  }),

  // ─── Submissions & Stats (teacher) ───────────────────────────────────────
  submissions: router({
    list: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSubmissionsByAssessment(input.assessmentId);
      }),

    getWithAnswers: protectedProcedure
      .input(z.object({ submissionId: z.number(), assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSubmissionWithAnswers(input.submissionId);
      }),

    stats: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const a = await getAssessmentById(input.assessmentId);
        if (!a || a.teacherId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAssessmentStats(input.assessmentId);
      }),
  }),

  // ─── Classes（班級）──────────────────────────────────────────
  classes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getClassesByTeacher(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          description: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createClass({
          teacherId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
        });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteClass(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
