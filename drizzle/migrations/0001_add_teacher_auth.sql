ALTER TABLE "users" ADD COLUMN "username" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordHash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "displayName" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");