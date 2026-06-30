CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."questionType" AS ENUM('single_choice', 'picture_choice', 'matching', 'fill_blank');--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"classId" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"shareToken" varchar(64) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_shareToken_unique" UNIQUE("shareToken")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessmentId" integer NOT NULL,
	"orderIndex" integer DEFAULT 0 NOT NULL,
	"questionType" "questionType" NOT NULL,
	"questionText" text NOT NULL,
	"questionImageKey" varchar(512),
	"questionImageUrl" varchar(1024),
	"options" jsonb,
	"correctAnswer" jsonb NOT NULL,
	"score" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"submissionId" integer NOT NULL,
	"questionId" integer NOT NULL,
	"studentAnswer" jsonb,
	"isCorrect" boolean DEFAULT false NOT NULL,
	"scoreEarned" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessmentId" integer NOT NULL,
	"studentName" varchar(128) NOT NULL,
	"totalScore" integer DEFAULT 0 NOT NULL,
	"maxScore" integer DEFAULT 0 NOT NULL,
	"submittedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);