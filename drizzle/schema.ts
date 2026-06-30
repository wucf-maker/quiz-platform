/**
 * Drizzle ORM schema — PostgreSQL（Neon）
 *
 * 從原本的 MySQL 改寫過來，差異：
 * - mysqlTable → pgTable
 * - int().autoincrement() → serial()
 * - mysqlEnum → pgEnum
 * - json → jsonb（PostgreSQL 更推薦 jsonb）
 * - timestamp().onUpdateNow() → 不支援，改在應用層處理
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  // 教師帳號欄位：username 唯一、passwordHash 用 scrypt 雜湊
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: text("passwordHash"),
  displayName: text("displayName"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["user", "admin"])("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Assessments (quizzes created by teachers)
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  classId: integer("classId"), // 可選：所屬班級
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

// Classes（班級）
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

// Questions within an assessment
// questionType: single_choice | picture_choice | matching | fill_blank
// options: JSON array
//   - single_choice: [{ id, text }]
//   - picture_choice: [{ id, text, imageKey, imageUrl }]
//   - matching: [{ id, left, right }]  (pairs)
//   - fill_blank: null (correctAnswer is the string)
// correctAnswer: JSON
//   - single_choice: "option_id"
//   - picture_choice: "option_id"
//   - matching: [{ leftId, rightId }]
//   - fill_blank: "answer string" or ["ans1","ans2"] for multiple accepted
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessmentId").notNull(),
  orderIndex: integer("orderIndex").notNull().default(0),
  questionType: pgEnum("questionType", [
    "single_choice",
    "picture_choice",
    "matching",
    "fill_blank",
  ])("questionType").notNull(),
  questionText: text("questionText").notNull(),
  questionImageKey: varchar("questionImageKey", { length: 512 }),
  questionImageUrl: varchar("questionImageUrl", { length: 1024 }),
  options: jsonb("options"), // array of option objects
  correctAnswer: jsonb("correctAnswer").notNull(),
  score: integer("score").notNull().default(1),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// Student submissions (one per student per assessment attempt)
export const studentSubmissions = pgTable("student_submissions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessmentId").notNull(),
  studentName: varchar("studentName", { length: 128 }).notNull(),
  totalScore: integer("totalScore").notNull().default(0),
  maxScore: integer("maxScore").notNull().default(0),
  submittedAt: timestamp("submittedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type StudentSubmission = typeof studentSubmissions.$inferSelect;
export type InsertStudentSubmission = typeof studentSubmissions.$inferInsert;

// Individual answers per question per submission
export const studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submissionId").notNull(),
  questionId: integer("questionId").notNull(),
  studentAnswer: jsonb("studentAnswer"), // matches correctAnswer format
  isCorrect: boolean("isCorrect").notNull().default(false),
  scoreEarned: integer("scoreEarned").notNull().default(0),
});

export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type InsertStudentAnswer = typeof studentAnswers.$inferInsert;