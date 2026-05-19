CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"icon" text,
	"color_gradient" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"cover_image" text,
	"difficulty" text,
	"estimated_minutes" integer,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_date" date NOT NULL,
	"tasks" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_summaries" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"events_count" integer DEFAULT 0 NOT NULL,
	"minutes_studied" integer DEFAULT 0 NOT NULL,
	"lessons_completed" integer DEFAULT 0 NOT NULL,
	"sr_reviews" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_summaries_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "download_manifests" (
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"language" text NOT NULL,
	"version" integer NOT NULL,
	"downloaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "download_manifests_user_id_device_id_lesson_id_language_pk" PRIMARY KEY("user_id","device_id","lesson_id","language")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollments" (
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "enrollments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"language" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body_html" text,
	"body_text" text,
	"audio_url" text,
	"slides_url" text,
	"checksum" text,
	"size_bytes" integer,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"percent_complete" integer DEFAULT 0 NOT NULL,
	"last_accessed" timestamp with time zone,
	"time_spent_sec" integer DEFAULT 0 NOT NULL,
	"study_technique" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_minutes" integer,
	"content_type" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"storage_key" text NOT NULL,
	"compressed_key" text,
	"width" integer,
	"height" integer,
	"duration_sec" double precision,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_id_pk" PRIMARY KEY("provider","provider_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"lesson_id" uuid,
	"answers" jsonb NOT NULL,
	"score" double precision NOT NULL,
	"duration_sec" integer,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"language" text NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"subjects" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sr_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"term" jsonb NOT NULL,
	"ease_factor" double precision DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"next_review" date NOT NULL,
	"last_reviewed" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_study_date" date,
	"streak_frozen_until" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"payload" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"languages" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"subjects" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"bundle_url" text NOT NULL,
	"size_bytes" integer,
	"downloads" integer DEFAULT 0 NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"primary_language" text DEFAULT 'en' NOT NULL,
	"lesson_languages" text[] DEFAULT ARRAY['en']::text[] NOT NULL,
	"has_reliable_internet" boolean DEFAULT false NOT NULL,
	"device_type" text,
	"low_bandwidth_default" boolean DEFAULT false NOT NULL,
	"auto_download_wifi" boolean DEFAULT true NOT NULL,
	"daily_study_minutes" integer DEFAULT 30 NOT NULL,
	"preferred_techniques" text[] DEFAULT ARRAY['spaced_repetition']::text[] NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text,
	"password_hash" text,
	"display_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_idx" ON "courses" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_category_id_idx" ON "courses" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_published_idx" ON "courses" ("published");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_plans_user_date_idx" ON "daily_plans" ("user_id","plan_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_summaries_date_idx" ON "daily_summaries" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_user_id_idx" ON "enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_content_lesson_lang_idx" ON "lesson_content" ("lesson_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_content_latest_idx" ON "lesson_content" ("lesson_id","language","version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_user_lesson_idx" ON "lesson_progress" ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_status_idx" ON "lesson_progress" ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lessons_course_slug_idx" ON "lessons" ("course_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_course_id_idx" ON "lessons" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_sort_order_idx" ON "lessons" ("course_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_lesson_id_idx" ON "media_assets" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "quiz_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_lesson_id_idx" ON "quiz_attempts" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quizzes_lesson_lang_idx" ON "quizzes" ("lesson_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_type_idx" ON "resources" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_verified_idx" ON "resources" ("verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sr_cards_user_due_idx" ON "sr_cards" ("user_id","next_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sr_cards_lesson_id_idx" ON "sr_cards" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_events_user_id_idx" ON "study_events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_events_type_idx" ON "study_events" ("user_id","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_events_recent_idx" ON "study_events" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_records_user_device_idx" ON "sync_records" ("user_id","device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_records_synced_at_idx" ON "sync_records" ("synced_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_packs_approved_idx" ON "teacher_packs" ("approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_manifests" ADD CONSTRAINT "download_manifests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_manifests" ADD CONSTRAINT "download_manifests_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_content" ADD CONSTRAINT "lesson_content_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sr_cards" ADD CONSTRAINT "sr_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sr_cards" ADD CONSTRAINT "sr_cards_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_events" ADD CONSTRAINT "study_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_streaks" ADD CONSTRAINT "study_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_records" ADD CONSTRAINT "sync_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teacher_packs" ADD CONSTRAINT "teacher_packs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
