import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Assessments (quizzes created by teachers)
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  classId: int("classId"), // 可選：所屬班級
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Classes（班級）
export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  orderIndex: int("orderIndex").notNull().default(0),
  questionType: mysqlEnum("questionType", [
    "single_choice",
    "picture_choice",
    "matching",
    "fill_blank",
  ]).notNull(),
  questionText: text("questionText").notNull(),
  questionImageKey: varchar("questionImageKey", { length: 512 }),
  questionImageUrl: varchar("questionImageUrl", { length: 1024 }),
  options: json("options"), // array of option objects
  correctAnswer: json("correctAnswer").notNull(),
  score: int("score").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// Student submissions (one per student per assessment attempt)
export const studentSubmissions = mysqlTable("student_submissions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  studentName: varchar("studentName", { length: 128 }).notNull(),
  totalScore: int("totalScore").notNull().default(0),
  maxScore: int("maxScore").notNull().default(0),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type StudentSubmission = typeof studentSubmissions.$inferSelect;
export type InsertStudentSubmission = typeof studentSubmissions.$inferInsert;

// Individual answers per question per submission
export const studentAnswers = mysqlTable("student_answers", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  questionId: int("questionId").notNull(),
  studentAnswer: json("studentAnswer"), // matches correctAnswer format
  isCorrect: boolean("isCorrect").notNull().default(false),
  scoreEarned: int("scoreEarned").notNull().default(0),
});

export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type InsertStudentAnswer = typeof studentAnswers.$inferInsert;
