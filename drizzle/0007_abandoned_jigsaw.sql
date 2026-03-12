CREATE INDEX `ai_guesses_session_round_idx` ON `ai_guesses` (`session_id`,`round_number`);--> statement-breakpoint
CREATE INDEX `ai_guesses_track_idx` ON `ai_guesses` (`track_id`);--> statement-breakpoint
CREATE INDEX `reports_track_status_idx` ON `reports` (`track_id`,`status`);--> statement-breakpoint
CREATE INDEX `tracks_commune_active_idx` ON `tracks` (`commune_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `tracks_electoral_list_active_idx` ON `tracks` (`electoral_list_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `vote_sessions_user_round_status_created_idx` ON `vote_sessions` (`user_id`,`election_round`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `votes_session_idx` ON `votes` (`session_id`);