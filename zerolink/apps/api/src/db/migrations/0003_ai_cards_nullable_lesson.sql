-- Allow sr_cards to exist without a lesson (AI-generated cards)
ALTER TABLE sr_cards DROP CONSTRAINT IF EXISTS sr_cards_lesson_id_fkey;
--> statement-breakpoint
ALTER TABLE sr_cards ALTER COLUMN lesson_id DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE sr_cards ADD CONSTRAINT sr_cards_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
