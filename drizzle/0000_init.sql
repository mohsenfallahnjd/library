CREATE TYPE "public"."item_kind" AS ENUM('book', 'article', 'site');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('to-read', 'reading', 'done');--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "item_kind" NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"file_key" text,
	"author" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "item_status" DEFAULT 'to-read' NOT NULL,
	"last_page" integer,
	"total_pages" integer,
	"notes" text,
	"source" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "items_url_key" ON "items" USING btree ("url");--> statement-breakpoint
CREATE INDEX "items_added_at_idx" ON "items" USING btree ("added_at");--> statement-breakpoint
CREATE INDEX "items_tags_idx" ON "items" USING gin ("tags");