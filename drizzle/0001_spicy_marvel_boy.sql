CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`shareToken` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessments_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`questionType` enum('single_choice','picture_choice','matching','fill_blank') NOT NULL,
	`questionText` text NOT NULL,
	`questionImageKey` varchar(512),
	`questionImageUrl` varchar(1024),
	`options` json,
	`correctAnswer` json NOT NULL,
	`score` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`questionId` int NOT NULL,
	`studentAnswer` json,
	`isCorrect` boolean NOT NULL DEFAULT false,
	`scoreEarned` int NOT NULL DEFAULT 0,
	CONSTRAINT `student_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`studentName` varchar(128) NOT NULL,
	`totalScore` int NOT NULL DEFAULT 0,
	`maxScore` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_submissions_id` PRIMARY KEY(`id`)
);
