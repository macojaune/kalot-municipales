CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`track_id` integer NOT NULL,
	`user_id` integer,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vote_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_champion_track_id` integer NOT NULL,
	`current_challenger_track_id` integer NOT NULL,
	`seen_track_ids` text DEFAULT '[]' NOT NULL,
	`rounds_played` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_champion_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_challenger_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tracks` ADD `stream_url` text;--> statement-breakpoint
ALTER TABLE `tracks` ADD `rating` real DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `appearances` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `is_seed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `votes` ADD `session_id` text NOT NULL REFERENCES vote_sessions(id);--> statement-breakpoint
ALTER TABLE `votes` ADD `round_number` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `votes` ADD `left_track_id` integer NOT NULL REFERENCES tracks(id);--> statement-breakpoint
ALTER TABLE `votes` ADD `right_track_id` integer NOT NULL REFERENCES tracks(id);