CREATE TYPE "public"."mark_state" AS ENUM('read', 'hidden');--> statement-breakpoint
CREATE TABLE "marks" (
	"key" text PRIMARY KEY NOT NULL,
	"state" "mark_state" NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "marks_created_at_idx" ON "marks" USING btree ("created_at");