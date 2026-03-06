CREATE TABLE `round1_commune_winners` (
	`commune_id` integer PRIMARY KEY NOT NULL,
	`winning_track_id` integer NOT NULL,
	`winning_rating` real NOT NULL,
	`finalized_at` text NOT NULL,
	FOREIGN KEY (`commune_id`) REFERENCES `communes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winning_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tracks` ADD `round2_rating` real DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `round2_wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `round2_losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `round2_appearances` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vote_sessions` ADD `election_round` text DEFAULT 'round1' NOT NULL;--> statement-breakpoint
ALTER TABLE `vote_sessions` ADD `commune_id` integer REFERENCES communes(id);--> statement-breakpoint
ALTER TABLE `votes` ADD `election_round` text DEFAULT 'round1' NOT NULL;--> statement-breakpoint
ALTER TABLE `votes` ADD `commune_id` integer REFERENCES communes(id);