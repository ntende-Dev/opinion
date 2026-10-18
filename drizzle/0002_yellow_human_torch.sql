CREATE INDEX "idx_contact_handled_created_at" ON "contact_messages" USING btree ("handled","created_at");--> statement-breakpoint
CREATE INDEX "idx_stories_status_created_at" ON "stories" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_stories_author_created_at" ON "stories" USING btree ("authorId","created_at");